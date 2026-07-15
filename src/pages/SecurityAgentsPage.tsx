import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { nullableSecurityText, securityPersonName, type SecurityAgentRecord } from '../features/security/types';
import { supabase } from '../lib/supabase';

type FormState = { firstName: string; lastName: string; employeeNumber: string; email: string; phone: string; contractType: SecurityAgentRecord['contract_type']; weeklyHours: string; notes: string };
const emptyForm: FormState = { firstName: '', lastName: '', employeeNumber: '', email: '', phone: '', contractType: 'cdi', weeklyHours: '35', notes: '' };
const contractLabels: Record<SecurityAgentRecord['contract_type'], string> = { cdi: 'CDI', cdd: 'CDD', interim: 'Intérim', sous_traitant: 'Sous-traitant', autre: 'Autre' };

export function SecurityAgentsPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<SecurityAgentRecord[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
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
      setLoading(true); setError('');
      if (demoMode || !supabase) {
        const stored = localStorage.getItem(`ncr-suite-security-agents-${organizationId}`);
        if (active) { setRows(stored ? JSON.parse(stored) : []); setLoading(false); }
        return;
      }
      const { data, error: loadError } = await supabase.from('security_agents')
        .select('id,organization_id,first_name,last_name,employee_number,email,phone,contract_type,weekly_hours,notes,status,created_at')
        .eq('organization_id', organizationId).neq('status', 'archived').order('last_name').order('first_name');
      if (!active) return;
      if (loadError) setError(`Chargement impossible : ${loadError.message}`); else setRows((data ?? []) as SecurityAgentRecord[]);
      setLoading(false);
    }
    void load(); return () => { active = false; };
  }, [organization, demoMode]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    if (!needle) return rows;
    return rows.filter((row) => [row.first_name, row.last_name, row.employee_number, row.email, row.phone].filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(needle));
  }, [rows, query]);

  async function createAgent(event: FormEvent) {
    event.preventDefault(); if (!organization || !user) return;
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('Le prénom et le nom sont obligatoires.'); return; }
    setSaving(true); setError(''); setSuccess('');
    const payload = {
      organization_id: organization.id, first_name: form.firstName.trim(), last_name: form.lastName.trim(),
      employee_number: nullableSecurityText(form.employeeNumber), email: nullableSecurityText(form.email)?.toLowerCase() ?? null,
      phone: nullableSecurityText(form.phone), contract_type: form.contractType,
      weekly_hours: Math.max(0, Math.min(80, Number(form.weeklyHours) || 35)), notes: nullableSecurityText(form.notes), created_by: user.id
    };
    try {
      let created: SecurityAgentRecord;
      if (demoMode || !supabase) {
        created = { id: crypto.randomUUID(), ...payload, status: 'active', created_at: new Date().toISOString() };
        localStorage.setItem(`ncr-suite-security-agents-${organization.id}`, JSON.stringify([...rows, created]));
      } else {
        const { data, error: insertError } = await supabase.from('security_agents').insert(payload)
          .select('id,organization_id,first_name,last_name,employee_number,email,phone,contract_type,weekly_hours,notes,status,created_at').single();
        if (insertError) throw insertError; created = data as SecurityAgentRecord;
      }
      setRows((current) => [...current, created].sort((a, b) => securityPersonName(a.first_name, a.last_name).localeCompare(securityPersonName(b.first_name, b.last_name), 'fr')));
      setForm(emptyForm); setSearchParams({}); setSuccess('L’agent a bien été ajouté.');
    } catch (caught) { setError(`Création impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setSaving(false); }
  }

  async function archive(row: SecurityAgentRecord) {
    if (!organization || !window.confirm(`Archiver ${securityPersonName(row.first_name, row.last_name)} ?`)) return;
    try {
      if (demoMode || !supabase) {
        const next = rows.filter((item) => item.id !== row.id); localStorage.setItem(`ncr-suite-security-agents-${organization.id}`, JSON.stringify(next));
      } else {
        const { error: updateError } = await supabase.from('security_agents').update({ status: 'archived' }).eq('organization_id', organization.id).eq('id', row.id); if (updateError) throw updateError;
      }
      setRows((current) => current.filter((item) => item.id !== row.id)); setSuccess('L’agent a été archivé.');
    } catch (caught) { setError(`Archivage impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
  }

  if (!organization) return null;
  return <div className="page security-page">
    <header className="page-header"><div><p className="eyebrow">SÉCURITÉ PRIVÉE</p><h1>Agents</h1><p>Gère le fichier des agents avant de construire le planning.</p></div><button className="primary-button" type="button" onClick={() => setSearchParams({ new: '1' })}><Icon name="plus" size={18}/>Ajouter un agent</button></header>
    {formOpen && <section className="panel security-form-panel"><div className="panel-header"><div><p className="eyebrow">NOUVEL AGENT</p><h2>Créer une fiche agent</h2></div><button className="secondary-button compact-button" type="button" onClick={() => { setSearchParams({}); setForm(emptyForm); }}>Fermer</button></div>
      <form className="security-form-grid" onSubmit={createAgent}>
        <label>Prénom *<input autoFocus required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}/></label>
        <label>Nom *<input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}/></label>
        <label>Matricule<input value={form.employeeNumber} onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })}/></label>
        <label>Contrat<select value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value as SecurityAgentRecord['contract_type'] })}>{Object.entries(contractLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>E-mail<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/></label>
        <label>Téléphone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}/></label>
        <label>Durée hebdomadaire<input type="number" min="0" max="80" step="0.5" value={form.weeklyHours} onChange={(e) => setForm({ ...form, weeklyHours: e.target.value })}/></label>
        <label className="full-field">Notes<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></label>
        <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={() => setSearchParams({})}>Annuler</button><button className="primary-button" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
      </form></section>}
    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}
    <section className="panel security-list-panel"><div className="security-toolbar"><div><p className="eyebrow">EFFECTIF</p><h2>{rows.length} agent{rows.length > 1 ? 's' : ''}</h2></div><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, matricule, e-mail…"/></div>
      {loading ? <div className="security-empty">Chargement…</div> : filtered.length === 0 ? <div className="security-empty"><Icon name="users" size={30}/><strong>Aucun agent</strong><span>Ajoute un agent pour commencer le planning.</span></div> : <div className="security-card-list">{filtered.map((row) => <article className="security-record-card" key={row.id}><span className="security-record-icon"><Icon name="shield" size={20}/></span><div className="security-record-main"><strong>{securityPersonName(row.first_name, row.last_name)}</strong><span>{[row.employee_number && `Matricule ${row.employee_number}`, contractLabels[row.contract_type], `${Number(row.weekly_hours)} h/sem.`].filter(Boolean).join(' · ')}</span><small>{[row.email, row.phone].filter(Boolean).join(' · ') || 'Coordonnées à compléter'}</small></div><span className="security-status-pill active">Actif</span><button className="secondary-button compact-button" type="button" onClick={() => void archive(row)}>Archiver</button></article>)}</div>}
    </section>
  </div>;
}
