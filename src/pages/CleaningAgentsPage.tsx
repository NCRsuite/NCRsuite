import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { nullableCleaningText, type CleaningAgentRecord } from '../features/cleaning/types';
import { supabase } from '../lib/supabase';

const emptyForm = { firstName: '', lastName: '', employeeNumber: '', email: '', phone: '', contractType: 'cdi', weeklyHours: '35', skills: '' };

export function CleaningAgentsPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<CleaningAgentRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const formOpen = searchParams.get('new') === '1';

  useEffect(() => {
    if (!organization) return;
    const organizationId = organization.id;
    let active = true;
    async function load() {
      setLoading(true);
      if (demoMode || !supabase) {
        const stored = localStorage.getItem(`ncr-cleaning-agents-${organizationId}`);
        if (active) setRows(stored ? JSON.parse(stored) as CleaningAgentRecord[] : []);
      } else {
        const { data, error: loadError } = await supabase.from('cleaning_agents').select('*').eq('organization_id', organizationId).neq('status', 'archived').order('last_name');
        if (!active) return;
        if (loadError) setError(loadError.message); else setRows((data ?? []) as CleaningAgentRecord[]);
      }
      if (active) setLoading(false);
    }
    void load(); return () => { active = false; };
  }, [organization, demoMode]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    return needle ? rows.filter((row) => [row.first_name, row.last_name, row.email, row.employee_number, ...(row.skills ?? [])].filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(needle)) : rows;
  }, [rows, query]);

  async function createAgent(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !form.firstName.trim() || !form.lastName.trim()) return;
    setSaving(true); setError(''); setSuccess('');
    const payload = {
      organization_id: organization.id,
      first_name: form.firstName.trim(), last_name: form.lastName.trim(),
      employee_number: nullableCleaningText(form.employeeNumber), email: nullableCleaningText(form.email)?.toLowerCase() ?? null,
      phone: nullableCleaningText(form.phone), contract_type: form.contractType,
      weekly_hours: Math.max(0, Math.min(80, Number(form.weeklyHours) || 35)),
      skills: form.skills.split(',').map((item) => item.trim()).filter(Boolean), created_by: user.id
    };
    try {
      let created: CleaningAgentRecord;
      if (demoMode || !supabase) {
        created = { id: crypto.randomUUID(), ...payload, linked_user_id: null, status: 'active', created_at: new Date().toISOString() } as CleaningAgentRecord;
        localStorage.setItem(`ncr-cleaning-agents-${organization.id}`, JSON.stringify([...rows, created]));
      } else {
        const { data, error: insertError } = await supabase.from('cleaning_agents').insert(payload).select('*').single();
        if (insertError) throw insertError; created = data as CleaningAgentRecord;
      }
      setRows((current) => [...current, created].sort((a, b) => a.last_name.localeCompare(b.last_name, 'fr'))); setForm(emptyForm); setSearchParams({}); setSuccess('L’agent a été ajouté.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Création impossible.'); }
    finally { setSaving(false); }
  }

  async function archive(row: CleaningAgentRecord) {
    if (!organization || !window.confirm(`Archiver ${row.first_name} ${row.last_name} ?`)) return;
    try {
      if (demoMode || !supabase) localStorage.setItem(`ncr-cleaning-agents-${organization.id}`, JSON.stringify(rows.filter((item) => item.id !== row.id)));
      else {
        const { error: updateError } = await supabase.from('cleaning_agents').update({ status: 'archived' }).eq('organization_id', organization.id).eq('id', row.id);
        if (updateError) throw updateError;
      }
      setRows((current) => current.filter((item) => item.id !== row.id)); setSuccess('L’agent a été archivé.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Archivage impossible.'); }
  }

  if (!organization) return null;
  return <div className="page cleaning-page"><header className="page-header"><div><p className="eyebrow">NETTOYAGE</p><h1>Agents</h1><p>Gère les équipes, contrats, compétences et accès terrain.</p></div><button className="primary-button" onClick={() => setSearchParams({ new: '1' })}><Icon name="plus" size={18}/>Ajouter un agent</button></header>
    {formOpen && <section className="panel cleaning-form-panel"><div className="panel-header"><div><p className="eyebrow">NOUVEL AGENT</p><h2>Créer une fiche agent</h2></div><button className="secondary-button compact-button" onClick={() => setSearchParams({})}>Fermer</button></div><form className="cleaning-form-grid" onSubmit={createAgent}>
      <label>Prénom *<input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}/></label><label>Nom *<input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}/></label>
      <label>Matricule<input value={form.employeeNumber} onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })}/></label><label>E-mail<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/></label>
      <label>Téléphone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}/></label><label>Contrat<select value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value })}><option value="cdi">CDI</option><option value="cdd">CDD</option><option value="interim">Intérim</option><option value="sous_traitant">Sous-traitant</option><option value="autre">Autre</option></select></label>
      <label>Heures hebdomadaires<input type="number" min="0" max="80" step="0.5" value={form.weeklyHours} onChange={(e) => setForm({ ...form, weeklyHours: e.target.value })}/></label><label>Compétences<input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Vitrerie, monobrosse, HACCP…"/></label>
      <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={() => setSearchParams({})}>Annuler</button><button className="primary-button" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
    </form></section>}
    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}
    <section className="panel cleaning-list-panel"><div className="cleaning-toolbar"><div><p className="eyebrow">ÉQUIPE</p><h2>{rows.length} agent{rows.length > 1 ? 's' : ''}</h2></div><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, matricule, compétence…"/></div>
      {loading ? <div className="cleaning-empty">Chargement…</div> : filtered.length === 0 ? <div className="cleaning-empty"><Icon name="users" size={30}/><strong>Aucun agent</strong><span>Ajoute les personnes à planifier.</span></div> : <div className="cleaning-card-list">{filtered.map((row) => <article className="cleaning-record-card" key={row.id}><span className="cleaning-record-icon"><Icon name="users" size={20}/></span><div className="cleaning-record-main"><strong>{row.first_name} {row.last_name}</strong><span>{[row.employee_number, row.email, row.phone].filter(Boolean).join(' · ') || 'Coordonnées à compléter'}</span><small>{row.contract_type.toUpperCase()} · {row.weekly_hours} h/semaine{row.skills?.length ? ` · ${row.skills.join(', ')}` : ''}</small></div><span className={`cleaning-status-pill ${row.linked_user_id ? 'active' : 'pending'}`}>{row.linked_user_id ? 'Connecté' : 'Sans accès'}</span><button className="secondary-button compact-button" onClick={() => void archive(row)}>Archiver</button></article>)}</div>}
    </section>
  </div>;
}
