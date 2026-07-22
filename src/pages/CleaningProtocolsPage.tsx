import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  nullableCleaningText,
  type CleaningAgentRecord,
  type CleaningProtocolRecord,
  type CleaningProtocolTaskRecord,
  type CleaningRecurringScheduleRecord,
  type CleaningSiteRecord
} from '../features/cleaning/types';
import { supabase } from '../lib/supabase';
import { readJsonStorage } from '../lib/safeStorage';

const weekdays = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const today = () => new Date().toISOString().slice(0, 10);

type TaskDraft = { id: string; label: string; estimatedMinutes: string; required: boolean; requiresPhoto: boolean };
const newTask = (): TaskDraft => ({ id: crypto.randomUUID(), label: '', estimatedMinutes: '10', required: true, requiresPhoto: false });

export function CleaningProtocolsPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const [protocols, setProtocols] = useState<CleaningProtocolRecord[]>([]);
  const [schedules, setSchedules] = useState<CleaningRecurringScheduleRecord[]>([]);
  const [sites, setSites] = useState<CleaningSiteRecord[]>([]);
  const [agents, setAgents] = useState<CleaningAgentRecord[]>([]);
  const [protocolOpen, setProtocolOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [protocolForm, setProtocolForm] = useState({ siteId: '', name: '', description: '' });
  const [tasks, setTasks] = useState<TaskDraft[]>([newTask()]);
  const [scheduleForm, setScheduleForm] = useState({ siteId: '', agentId: '', protocolId: '', title: 'Entretien régulier', weekday: '1', startTime: '08:00', durationMinutes: '120', breakMinutes: '0', intervalWeeks: '1', startsOn: today(), endsOn: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    if (!organization) return;
    setLoading(true); setError('');
    if (demoMode || !supabase) {
      setSites(readJsonStorage<CleaningSiteRecord[]>(`ncr-cleaning-sites-${organization.id}`, []));
      setAgents(readJsonStorage<CleaningAgentRecord[]>(`ncr-cleaning-agents-${organization.id}`, []));
      setProtocols(readJsonStorage<CleaningProtocolRecord[]>(`ncr-cleaning-protocols-${organization.id}`, []));
      setSchedules(readJsonStorage<CleaningRecurringScheduleRecord[]>(`ncr-cleaning-recurring-${organization.id}`, []));
      setLoading(false); return;
    }
    const [protocolResult, scheduleResult, siteResult, agentResult] = await Promise.all([
      supabase.from('cleaning_protocols').select('*,cleaning_sites(name,cleaning_clients(company_name)),cleaning_protocol_tasks(*)').eq('organization_id', organization.id).neq('status', 'archived').order('created_at', { ascending: false }),
      supabase.from('cleaning_recurring_schedules').select('*,cleaning_sites(name),cleaning_agents(first_name,last_name),cleaning_protocols(name)').eq('organization_id', organization.id).neq('status', 'archived').order('created_at', { ascending: false }),
      supabase.from('cleaning_sites').select('*,cleaning_clients(company_name)').eq('organization_id', organization.id).eq('status', 'active').order('name'),
      supabase.from('cleaning_agents').select('*').eq('organization_id', organization.id).eq('status', 'active').order('last_name')
    ]);
    const firstError = protocolResult.error || scheduleResult.error || siteResult.error || agentResult.error;
    if (firstError) setError(firstError.message);
    else {
      setProtocols(((protocolResult.data ?? []) as CleaningProtocolRecord[]).map((item) => ({ ...item, cleaning_protocol_tasks: [...(item.cleaning_protocol_tasks ?? [])].sort((a, b) => a.position - b.position) })));
      setSchedules((scheduleResult.data ?? []) as CleaningRecurringScheduleRecord[]);
      setSites((siteResult.data ?? []) as CleaningSiteRecord[]);
      setAgents((agentResult.data ?? []) as CleaningAgentRecord[]);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [organization?.id, demoMode]);

  const protocolBySite = useMemo(() => protocols.reduce<Record<string, CleaningProtocolRecord[]>>((acc, protocol) => {
    (acc[protocol.site_id] ??= []).push(protocol); return acc;
  }, {}), [protocols]);

  function updateTask(id: string, patch: Partial<TaskDraft>) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, ...patch } : task));
  }

  async function createProtocol(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !protocolForm.siteId || !protocolForm.name.trim()) return;
    const validTasks = tasks.filter((task) => task.label.trim());
    if (!validTasks.length) { setError('Ajoute au moins une tâche au protocole.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const site = sites.find((item) => item.id === protocolForm.siteId);
        const protocolId = crypto.randomUUID();
        const createdTasks: CleaningProtocolTaskRecord[] = validTasks.map((task, position) => ({ id: crypto.randomUUID(), organization_id: organization.id, protocol_id: protocolId, label: task.label.trim(), position, required: task.required, requires_photo: task.requiresPhoto, estimated_minutes: Math.max(0, Number(task.estimatedMinutes) || 0), created_at: new Date().toISOString() }));
        const created: CleaningProtocolRecord = { id: protocolId, organization_id: organization.id, site_id: protocolForm.siteId, name: protocolForm.name.trim(), description: nullableCleaningText(protocolForm.description), status: 'active', created_at: new Date().toISOString(), cleaning_sites: site ? { name: site.name, cleaning_clients: site.cleaning_clients } : null, cleaning_protocol_tasks: createdTasks };
        const next = [created, ...protocols]; localStorage.setItem(`ncr-cleaning-protocols-${organization.id}`, JSON.stringify(next)); setProtocols(next);
      } else {
        const { data: protocol, error: protocolError } = await supabase.from('cleaning_protocols').insert({ organization_id: organization.id, site_id: protocolForm.siteId, name: protocolForm.name.trim(), description: nullableCleaningText(protocolForm.description), created_by: user.id }).select('id').single();
        if (protocolError) throw protocolError;
        const { error: taskError } = await supabase.from('cleaning_protocol_tasks').insert(validTasks.map((task, position) => ({ organization_id: organization.id, protocol_id: protocol.id, label: task.label.trim(), position, required: task.required, requires_photo: task.requiresPhoto, estimated_minutes: Math.max(0, Number(task.estimatedMinutes) || 0) })));
        if (taskError) { await supabase.from('cleaning_protocols').delete().eq('organization_id', organization.id).eq('id', protocol.id); throw taskError; }
        await load();
      }
      setProtocolForm({ siteId: '', name: '', description: '' }); setTasks([newTask()]); setProtocolOpen(false); setSuccess('Le protocole est prêt à être utilisé dans le planning.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Création impossible.'); } finally { setSaving(false); }
  }

  async function archiveProtocol(protocol: CleaningProtocolRecord) {
    if (!organization || !window.confirm(`Archiver le protocole « ${protocol.name} » ?`)) return;
    try {
      if (demoMode || !supabase) {
        const next = protocols.filter((item) => item.id !== protocol.id); localStorage.setItem(`ncr-cleaning-protocols-${organization.id}`, JSON.stringify(next)); setProtocols(next);
      } else {
        const { error: updateError } = await supabase.from('cleaning_protocols').update({ status: 'archived' }).eq('organization_id', organization.id).eq('id', protocol.id); if (updateError) throw updateError; setProtocols((current) => current.filter((item) => item.id !== protocol.id));
      }
      setSuccess('Le protocole a été archivé.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Archivage impossible.'); }
  }

  async function createSchedule(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !scheduleForm.siteId || !scheduleForm.agentId) return;
    setSaving(true); setError(''); setSuccess('');
    const payload = { organization_id: organization.id, site_id: scheduleForm.siteId, agent_id: scheduleForm.agentId, protocol_id: scheduleForm.protocolId || null, title: scheduleForm.title.trim() || 'Entretien régulier', weekday: Number(scheduleForm.weekday), start_time: scheduleForm.startTime, duration_minutes: Math.max(15, Number(scheduleForm.durationMinutes) || 15), break_minutes: Math.max(0, Number(scheduleForm.breakMinutes) || 0), interval_weeks: Math.max(1, Number(scheduleForm.intervalWeeks) || 1), starts_on: scheduleForm.startsOn, ends_on: scheduleForm.endsOn || null, created_by: user.id };
    try {
      if (demoMode || !supabase) {
        const site = sites.find((item) => item.id === scheduleForm.siteId); const agent = agents.find((item) => item.id === scheduleForm.agentId); const protocol = protocols.find((item) => item.id === scheduleForm.protocolId);
        const created = { id: crypto.randomUUID(), ...payload, status: 'active', created_at: new Date().toISOString(), cleaning_sites: site ? { name: site.name } : null, cleaning_agents: agent ? { first_name: agent.first_name, last_name: agent.last_name } : null, cleaning_protocols: protocol ? { name: protocol.name } : null } as CleaningRecurringScheduleRecord;
        const next = [created, ...schedules]; localStorage.setItem(`ncr-cleaning-recurring-${organization.id}`, JSON.stringify(next)); setSchedules(next);
      } else {
        const { data, error: insertError } = await supabase.from('cleaning_recurring_schedules').insert(payload).select('id').single(); if (insertError) throw insertError;
        const until = new Date(); until.setDate(until.getDate() + 56);
        const { data: generated, error: generateError } = await supabase.rpc('generate_cleaning_recurring_interventions', { p_organization_id: organization.id, p_schedule_id: data.id, p_until: until.toISOString().slice(0, 10) }); if (generateError) throw generateError;
        setSuccess(`${generated ?? 0} intervention(s) générée(s) sur les 8 prochaines semaines.`); await load();
      }
      setScheduleForm({ siteId: '', agentId: '', protocolId: '', title: 'Entretien régulier', weekday: '1', startTime: '08:00', durationMinutes: '120', breakMinutes: '0', intervalWeeks: '1', startsOn: today(), endsOn: '' }); setScheduleOpen(false);
      if (demoMode || !supabase) setSuccess('La récurrence a été enregistrée.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Création impossible.'); } finally { setSaving(false); }
  }

  async function generate(schedule: CleaningRecurringScheduleRecord) {
    if (!organization || !supabase) return;
    setGeneratingId(schedule.id); setError(''); setSuccess('');
    try {
      const until = new Date(); until.setDate(until.getDate() + 56);
      const { data, error: rpcError } = await supabase.rpc('generate_cleaning_recurring_interventions', { p_organization_id: organization.id, p_schedule_id: schedule.id, p_until: until.toISOString().slice(0, 10) }); if (rpcError) throw rpcError;
      setSuccess(`${data ?? 0} nouvelle(s) intervention(s) ajoutée(s). Les doublons ont été ignorés.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Génération impossible.'); } finally { setGeneratingId(''); }
  }

  async function archiveSchedule(schedule: CleaningRecurringScheduleRecord) {
    if (!organization || !window.confirm('Archiver cette récurrence ? Les interventions déjà générées restent dans le planning.')) return;
    try {
      if (demoMode || !supabase) {
        const next = schedules.filter((item) => item.id !== schedule.id); localStorage.setItem(`ncr-cleaning-recurring-${organization.id}`, JSON.stringify(next)); setSchedules(next);
      } else {
        const { error: updateError } = await supabase.from('cleaning_recurring_schedules').update({ status: 'archived' }).eq('organization_id', organization.id).eq('id', schedule.id); if (updateError) throw updateError; setSchedules((current) => current.filter((item) => item.id !== schedule.id));
      }
      setSuccess('La récurrence a été archivée.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Archivage impossible.'); }
  }

  if (!organization) return null;
  return <div className="page cleaning-page cleaning-protocols-page">
    <header className="page-header"><div><p className="eyebrow">ORGANISATION DES CHANTIERS</p><h1>Protocoles & récurrences</h1><p>Définis ce qui doit être fait sur chaque site, puis génère automatiquement les passages réguliers.</p></div><div className="header-actions"><button className="secondary-button" onClick={() => setProtocolOpen(true)}><Icon name="clipboard" size={18}/>Nouveau protocole</button><button className="primary-button" disabled={!sites.length || !agents.length} onClick={() => setScheduleOpen(true)}><Icon name="calendar" size={18}/>Nouvelle récurrence</button></div></header>
    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}

    {protocolOpen && <section className="panel cleaning-form-panel"><div className="panel-header"><div><p className="eyebrow">CAHIER DES CHARGES</p><h2>Créer un protocole</h2></div><button className="secondary-button compact-button" onClick={() => setProtocolOpen(false)}>Fermer</button></div><form onSubmit={createProtocol} className="cleaning-form-grid"><label>Site *<select required value={protocolForm.siteId} onChange={(event) => setProtocolForm({ ...protocolForm, siteId: event.target.value })}><option value="">Sélectionner</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name} · {site.cleaning_clients?.company_name}</option>)}</select></label><label>Nom du protocole *<input required value={protocolForm.name} onChange={(event) => setProtocolForm({ ...protocolForm, name: event.target.value })} placeholder="Ex. Entretien quotidien des bureaux"/></label><label className="full-field">Description<textarea rows={3} value={protocolForm.description} onChange={(event) => setProtocolForm({ ...protocolForm, description: event.target.value })} placeholder="Zones concernées, produits autorisés, précautions…"/></label><div className="full-field cleaning-task-editor"><div className="cleaning-task-editor-header"><div><strong>Tâches du protocole</strong><small>Elles seront copiées dans chaque intervention Essentielle ou supérieure.</small></div><button type="button" className="secondary-button compact-button" onClick={() => setTasks((current) => [...current, newTask()])}><Icon name="plus" size={16}/>Ajouter</button></div>{tasks.map((task, index) => <div className="cleaning-task-draft" key={task.id}><span>{index + 1}</span><input aria-label={`Tâche ${index + 1}`} value={task.label} onChange={(event) => updateTask(task.id, { label: event.target.value })} placeholder="Ex. Désinfecter les sanitaires"/><label>Minutes<input type="number" min="0" max="1440" value={task.estimatedMinutes} onChange={(event) => updateTask(task.id, { estimatedMinutes: event.target.value })}/></label><label className="cleaning-check-option"><input type="checkbox" checked={task.required} onChange={(event) => updateTask(task.id, { required: event.target.checked })}/>Obligatoire</label><label className="cleaning-check-option"><input type="checkbox" checked={task.requiresPhoto} onChange={(event) => updateTask(task.id, { requiresPhoto: event.target.checked })}/>Photo après</label><button type="button" className="icon-button" aria-label="Supprimer la tâche" onClick={() => setTasks((current) => current.length === 1 ? [newTask()] : current.filter((item) => item.id !== task.id))}><Icon name="close" size={17}/></button></div>)}</div><div className="form-actions full-field"><button type="button" className="secondary-button" onClick={() => setProtocolOpen(false)}>Annuler</button><button className="primary-button" disabled={saving}>{saving ? 'Création…' : 'Créer le protocole'}</button></div></form></section>}

    {scheduleOpen && <section className="panel cleaning-form-panel"><div className="panel-header"><div><p className="eyebrow">PLANIFICATION AUTOMATIQUE</p><h2>Créer une récurrence</h2></div><button className="secondary-button compact-button" onClick={() => setScheduleOpen(false)}>Fermer</button></div><form onSubmit={createSchedule} className="cleaning-form-grid"><label>Site *<select required value={scheduleForm.siteId} onChange={(event) => setScheduleForm({ ...scheduleForm, siteId: event.target.value, protocolId: '' })}><option value="">Sélectionner</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name} · {site.cleaning_clients?.company_name}</option>)}</select></label><label>Agent *<select required value={scheduleForm.agentId} onChange={(event) => setScheduleForm({ ...scheduleForm, agentId: event.target.value })}><option value="">Sélectionner</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.first_name} {agent.last_name}</option>)}</select></label><label>Protocole<select value={scheduleForm.protocolId} onChange={(event) => setScheduleForm({ ...scheduleForm, protocolId: event.target.value })}><option value="">Sans protocole</option>{(protocolBySite[scheduleForm.siteId] ?? []).map((protocol) => <option key={protocol.id} value={protocol.id}>{protocol.name}</option>)}</select></label><label>Intitulé<input value={scheduleForm.title} onChange={(event) => setScheduleForm({ ...scheduleForm, title: event.target.value })}/></label><label>Jour<select value={scheduleForm.weekday} onChange={(event) => setScheduleForm({ ...scheduleForm, weekday: event.target.value })}>{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label><label>Heure de début<input type="time" required value={scheduleForm.startTime} onChange={(event) => setScheduleForm({ ...scheduleForm, startTime: event.target.value })}/></label><label>Durée totale (minutes)<input type="number" min="15" max="1440" required value={scheduleForm.durationMinutes} onChange={(event) => setScheduleForm({ ...scheduleForm, durationMinutes: event.target.value })}/></label><label>Pause (minutes)<input type="number" min="0" max="720" value={scheduleForm.breakMinutes} onChange={(event) => setScheduleForm({ ...scheduleForm, breakMinutes: event.target.value })}/></label><label>Fréquence<select value={scheduleForm.intervalWeeks} onChange={(event) => setScheduleForm({ ...scheduleForm, intervalWeeks: event.target.value })}><option value="1">Chaque semaine</option><option value="2">Toutes les 2 semaines</option><option value="3">Toutes les 3 semaines</option><option value="4">Toutes les 4 semaines</option></select></label><label>Date de début<input type="date" required value={scheduleForm.startsOn} onChange={(event) => setScheduleForm({ ...scheduleForm, startsOn: event.target.value })}/></label><label>Date de fin facultative<input type="date" value={scheduleForm.endsOn} onChange={(event) => setScheduleForm({ ...scheduleForm, endsOn: event.target.value })}/></label><div className="form-actions full-field"><button type="button" className="secondary-button" onClick={() => setScheduleOpen(false)}>Annuler</button><button className="primary-button" disabled={saving}>{saving ? 'Génération…' : 'Créer et générer 8 semaines'}</button></div></form></section>}

    <section className="cleaning-protocol-layout"><article className="panel"><div className="panel-header"><div><p className="eyebrow">PROTOCOLES ACTIFS</p><h2>{protocols.length} cahier{protocols.length > 1 ? 's' : ''} des charges</h2></div></div>{loading ? <div className="cleaning-empty">Chargement…</div> : protocols.length === 0 ? <div className="cleaning-empty"><Icon name="clipboard" size={32}/><strong>Aucun protocole</strong><span>Crée les tâches attendues pour chaque site.</span></div> : <div className="cleaning-protocol-list">{protocols.map((protocol) => { const duration = (protocol.cleaning_protocol_tasks ?? []).reduce((total, task) => total + task.estimated_minutes, 0); return <article key={protocol.id} className="cleaning-protocol-card"><div className="cleaning-protocol-card-header"><span className="cleaning-record-icon"><Icon name="clipboard" size={20}/></span><div><strong>{protocol.name}</strong><span>{protocol.cleaning_sites?.name} · {protocol.cleaning_sites?.cleaning_clients?.company_name}</span><small>{protocol.cleaning_protocol_tasks?.length ?? 0} tâche(s) · {duration} min estimées</small></div><button className="secondary-button compact-button" onClick={() => void archiveProtocol(protocol)}>Archiver</button></div>{protocol.description && <p>{protocol.description}</p>}<ol>{(protocol.cleaning_protocol_tasks ?? []).map((task) => <li key={task.id}><span className={task.required ? 'required' : ''}>{task.label}</span><small>{task.estimated_minutes} min{task.requires_photo ? ' · photo après' : ''}{task.required ? ' · obligatoire' : ''}</small></li>)}</ol></article>; })}</div>}</article>
      <article className="panel"><div className="panel-header"><div><p className="eyebrow">RÉCURRENCES</p><h2>{schedules.length} programmation{schedules.length > 1 ? 's' : ''}</h2></div></div>{loading ? <div className="cleaning-empty">Chargement…</div> : schedules.length === 0 ? <div className="cleaning-empty"><Icon name="calendar" size={32}/><strong>Aucune récurrence</strong><span>Automatise les passages hebdomadaires.</span></div> : <div className="cleaning-recurring-list">{schedules.map((schedule) => <article key={schedule.id} className="cleaning-recurring-card"><div><strong>{schedule.title}</strong><span>{schedule.cleaning_sites?.name} · {schedule.cleaning_agents?.first_name} {schedule.cleaning_agents?.last_name}</span><small>{weekdays[schedule.weekday]} à {String(schedule.start_time).slice(0, 5)} · {schedule.duration_minutes} min · {schedule.interval_weeks === 1 ? 'chaque semaine' : `toutes les ${schedule.interval_weeks} semaines`}</small>{schedule.cleaning_protocols?.name && <em><Icon name="clipboard" size={14}/>{schedule.cleaning_protocols.name}</em>}</div><div className="cleaning-inline-actions"><button className="secondary-button compact-button" disabled={generatingId === schedule.id} onClick={() => void generate(schedule)}>{generatingId === schedule.id ? 'Génération…' : 'Générer 8 semaines'}</button><button className="icon-button" aria-label="Archiver" onClick={() => void archiveSchedule(schedule)}><Icon name="close" size={17}/></button></div></article>)}</div>}</article>
    </section>
  </div>;
}
