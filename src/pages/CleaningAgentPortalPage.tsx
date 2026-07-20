import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { formatCleaningDateTime, type CleaningInterventionRecord } from '../features/cleaning/types';
import { supabase } from '../lib/supabase';

async function uploadCleaningPhoto(organizationId: string, interventionId: string, kind: 'before' | 'after', file: File) {
  if (!supabase) return null;
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${organizationId}/${interventionId}/${kind}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from('cleaning-photos').upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('cleaning-photos').getPublicUrl(path);
  return data.publicUrl;
}

export function CleaningAgentPortalPage() {
  const { organization } = useOrganization(); const { demoMode } = useAuth(); const [rows, setRows] = useState<CleaningInterventionRecord[]>([]); const [selectedId, setSelectedId] = useState(''); const [report, setReport] = useState(''); const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [loading, setLoading] = useState(true);

  async function load() {
    if (!organization) return; setLoading(true); setError('');
    if (demoMode || !supabase) { setRows(JSON.parse(localStorage.getItem(`ncr-cleaning-interventions-${organization.id}`) || '[]') as CleaningInterventionRecord[]); setLoading(false); return; }
    const from = new Date(); from.setDate(from.getDate() - 2); const to = new Date(); to.setDate(to.getDate() + 8);
    const { data, error: loadError } = await supabase.from('cleaning_interventions').select('*,cleaning_sites(name,address,city,instructions,cleaning_clients(company_name)),cleaning_agents(first_name,last_name),cleaning_intervention_tasks(*)').eq('organization_id', organization.id).gte('starts_at', from.toISOString()).lte('starts_at', to.toISOString()).order('starts_at');
    if (loadError) setError(loadError.message); else setRows((data ?? []) as CleaningInterventionRecord[]); setLoading(false);
  }
  useEffect(() => { void load(); }, [organization?.id, demoMode]);

  const activeRows = useMemo(() => rows.filter((row) => row.status !== 'canceled'), [rows]); const selected = activeRows.find((row) => row.id === selectedId) ?? activeRows[0] ?? null;
  const selectedTasks = useMemo(() => [...(selected?.cleaning_intervention_tasks ?? [])].sort((a, b) => a.position - b.position), [selected]);
  const completedTasks = selectedTasks.filter((task) => task.completed).length;
  useEffect(() => { if (selected && selected.id !== selectedId) setSelectedId(selected.id); }, [selected?.id]);

  async function updateIntervention(row: CleaningInterventionRecord, action: 'start' | 'finish') {
    if (!organization) return; setBusy(action); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const next = rows.map((item) => item.id === row.id ? action === 'start' ? { ...item, status: 'in_progress' as const, actual_started_at: new Date().toISOString() } : { ...item, status: 'completed' as const, actual_ended_at: new Date().toISOString(), report_text: report.trim() || item.report_text } : item); localStorage.setItem(`ncr-cleaning-interventions-${organization.id}`, JSON.stringify(next)); setRows(next);
      } else {
        const rpc = action === 'start' ? 'start_cleaning_intervention' : 'finish_cleaning_intervention'; const payload = action === 'start' ? { p_organization_id: organization.id, p_intervention_id: row.id } : { p_organization_id: organization.id, p_intervention_id: row.id, p_report_text: report.trim() || null };
        const { error: rpcError } = await supabase.rpc(rpc, payload); if (rpcError) throw rpcError; await load();
      }
      setSuccess(action === 'start' ? 'Arrivée pointée. Bonne intervention.' : 'Départ pointé et fiche de passage enregistrée.'); if (action === 'finish') setReport('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Action impossible.'); } finally { setBusy(''); }
  }

  async function toggleTask(taskId: string, completed: boolean) {
    if (!organization || !selected) return; setBusy(`task-${taskId}`); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const next = rows.map((item) => item.id === selected.id ? { ...item, cleaning_intervention_tasks: (item.cleaning_intervention_tasks ?? []).map((task) => task.id === taskId ? { ...task, completed, completed_at: completed ? new Date().toISOString() : null } : task) } : item); setRows(next);
      } else {
        const { error: rpcError } = await supabase.rpc('set_cleaning_intervention_task', { p_organization_id: organization.id, p_task_id: taskId, p_completed: completed, p_observation: null }); if (rpcError) throw rpcError; await load();
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Mise à jour impossible.'); } finally { setBusy(''); }
  }

  async function addPhoto(event: ChangeEvent<HTMLInputElement>, row: CleaningInterventionRecord, kind: 'before' | 'after') {
    const file = event.target.files?.[0]; if (!file || !organization) return; setBusy(`photo-${kind}`); setError('');
    try {
      if (demoMode || !supabase) { const url = URL.createObjectURL(file); const next = rows.map((item) => item.id === row.id ? { ...item, [kind === 'before' ? 'before_photo_url' : 'after_photo_url']: url } : item); setRows(next); }
      else { const url = await uploadCleaningPhoto(organization.id, row.id, kind, file); const column = kind === 'before' ? 'before_photo_url' : 'after_photo_url'; const { error: updateError } = await supabase.from('cleaning_interventions').update({ [column]: url }).eq('organization_id', organization.id).eq('id', row.id); if (updateError) throw updateError; await load(); }
      setSuccess(`Photo ${kind === 'before' ? 'avant' : 'après'} enregistrée.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Envoi impossible.'); } finally { setBusy(''); event.target.value = ''; }
  }

  if (!organization) return null;
  return <div className="page cleaning-page cleaning-agent-portal"><header className="page-header"><div><p className="eyebrow">ESPACE TERRAIN</p><h1>Mes interventions</h1><p>Planning, consignes, pointage, photos et fiche de passage.</p></div></header>
    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}
    {loading ? <section className="panel cleaning-empty">Chargement…</section> : activeRows.length === 0 ? <section className="panel cleaning-empty"><Icon name="sparkles" size={36}/><strong>Aucune intervention attribuée</strong><span>Le planning à venir apparaîtra ici.</span></section> : <div className="cleaning-agent-layout"><aside className="panel cleaning-agent-list">{activeRows.map((row) => <button key={row.id} className={row.id === selected?.id ? 'active' : ''} onClick={() => setSelectedId(row.id)}><strong>{row.cleaning_sites?.name}</strong><span>{formatCleaningDateTime(row.starts_at)}</span><small>{row.status === 'planned' ? 'À venir' : row.status === 'in_progress' ? 'En cours' : 'Terminée'}</small></button>)}</aside>
      {selected && <section className="panel cleaning-agent-mission"><div className="cleaning-agent-mission-header"><div><p className="eyebrow">{selected.status === 'in_progress' ? 'INTERVENTION EN COURS' : selected.status === 'completed' ? 'INTERVENTION TERMINÉE' : 'PROCHAINE INTERVENTION'}</p><h2>{selected.title}</h2><p>{selected.cleaning_sites?.name} · {selected.cleaning_sites?.cleaning_clients?.company_name}</p></div><span className={`cleaning-status-pill ${selected.status}`}>{selected.status === 'planned' ? 'Planifiée' : selected.status === 'in_progress' ? 'En cours' : 'Terminée'}</span></div>
        <div className="cleaning-mission-info"><div><Icon name="clock" size={18}/><span><strong>Horaire</strong>{formatCleaningDateTime(selected.starts_at)} → {new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' }).format(new Date(selected.ends_at))}</span></div><div><Icon name="map" size={18}/><span><strong>Adresse</strong>{[selected.cleaning_sites?.address, selected.cleaning_sites?.city].filter(Boolean).join(' · ') || 'Non renseignée'}</span></div></div>
        {selected.cleaning_sites?.instructions && <div className="cleaning-instruction-box"><p className="eyebrow">CONSIGNES DU SITE</p><p>{selected.cleaning_sites.instructions}</p></div>}
        {selectedTasks.length > 0 && <section className="cleaning-agent-checklist"><div className="cleaning-agent-checklist-header"><div><p className="eyebrow">PROTOCOLE À RÉALISER</p><h3>{completedTasks} / {selectedTasks.length} tâche(s) validée(s)</h3></div><span>{Math.round((completedTasks / selectedTasks.length) * 100)} %</span></div><div className="cleaning-checklist-progress"><i style={{ width: `${(completedTasks / selectedTasks.length) * 100}%` }}/></div><div className="cleaning-agent-task-list">{selectedTasks.map((task) => <label key={task.id} className={`${task.completed ? 'completed' : ''}${task.required ? ' required' : ''}`}><input type="checkbox" checked={task.completed} disabled={selected.status !== 'in_progress' || busy === `task-${task.id}`} onChange={(event) => void toggleTask(task.id, event.target.checked)}/><span><strong>{task.label}</strong><small>{task.estimated_minutes ? `${task.estimated_minutes} min` : 'Durée libre'}{task.required ? ' · obligatoire' : ' · facultative'}{task.requires_photo ? ' · photo après requise' : ''}</small></span>{task.completed && <Icon name="check" size={18}/>}</label>)}</div>{selected.status === 'planned' && <p className="cleaning-checklist-hint">Pointe ton arrivée pour commencer à valider les tâches.</p>}</section>}
        <div className="cleaning-photo-grid"><label className="cleaning-photo-input"><Icon name="file" size={24}/><strong>Photo avant</strong><span>{selected.before_photo_url ? 'Remplacer la photo' : 'Ajouter une preuve'}</span><input type="file" accept="image/*" capture="environment" onChange={(event) => void addPhoto(event, selected, 'before')}/>{selected.before_photo_url && <img src={selected.before_photo_url} alt="Avant intervention"/>}</label><label className="cleaning-photo-input"><Icon name="file" size={24}/><strong>Photo après</strong><span>{selected.after_photo_url ? 'Remplacer la photo' : 'Ajouter une preuve'}</span><input type="file" accept="image/*" capture="environment" onChange={(event) => void addPhoto(event, selected, 'after')}/>{selected.after_photo_url && <img src={selected.after_photo_url} alt="Après intervention"/>}</label></div>
        {selected.status === 'planned' && <button className="primary-button cleaning-large-action" disabled={Boolean(busy)} onClick={() => void updateIntervention(selected, 'start')}><Icon name="clock" size={20}/>{busy === 'start' ? 'Pointage…' : 'Pointer mon arrivée'}</button>}
        {selected.status === 'in_progress' && <><label className="cleaning-report-field">Fiche de passage<textarea rows={5} value={report} onChange={(e) => setReport(e.target.value)} placeholder="Travaux réalisés, observations, matériel utilisé…"/></label><button className="primary-button cleaning-large-action" disabled={Boolean(busy)} onClick={() => void updateIntervention(selected, 'finish')}><Icon name="check" size={20}/>{busy === 'finish' ? 'Validation…' : 'Terminer et pointer mon départ'}</button></>}
        {selected.status === 'completed' && <div className="cleaning-completed-summary"><Icon name="check" size={24}/><div><strong>Intervention terminée</strong><p>{selected.report_text || 'Aucun commentaire ajouté.'}</p></div></div>}
      </section>}
    </div>}
  </div>;
}
