import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { nullableSecurityText, type SecurityClientRecord } from '../features/security/types';
import { supabase } from '../lib/supabase';

type FormState = {
  companyName: string; contactName: string; email: string; phone: string;
  billingAddress: string; postalCode: string; city: string; siret: string; vatNumber: string;
  paymentTermsDays: string; notes: string;
};

const emptyForm: FormState = { companyName: '', contactName: '', email: '', phone: '', billingAddress: '', postalCode: '', city: '', siret: '', vatNumber: '', paymentTermsDays: '30', notes: '' };

export function SecurityClientsPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<SecurityClientRecord[]>([]);
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
    const key = `ncr-suite-security-clients-${organizationId}`;
    async function load() {
      setLoading(true); setError('');
      if (demoMode || !supabase) {
        const stored = localStorage.getItem(key);
        if (active) { setRows(stored ? JSON.parse(stored) : []); setLoading(false); }
        return;
      }
      const { data, error: loadError } = await supabase.from('security_clients')
        .select('id,organization_id,company_name,contact_name,email,phone,billing_address,postal_code,city,siret,vat_number,payment_terms_days,notes,status,created_at')
        .eq('organization_id', organizationId).neq('status', 'archived').order('company_name');
      if (!active) return;
      if (loadError) setError(`Chargement impossible : ${loadError.message}`);
      else setRows((data ?? []) as SecurityClientRecord[]);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [organization, demoMode]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    if (!needle) return rows;
    return rows.filter((row) => [row.company_name, row.contact_name, row.email, row.city, row.siret].filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(needle));
  }, [rows, query]);

  async function createClient(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !form.companyName.trim()) return;
    setSaving(true); setError(''); setSuccess('');
    const payload = {
      organization_id: organization.id,
      company_name: form.companyName.trim(),
      contact_name: nullableSecurityText(form.contactName),
      email: nullableSecurityText(form.email)?.toLowerCase() ?? null,
      phone: nullableSecurityText(form.phone),
      billing_address: nullableSecurityText(form.billingAddress),
      postal_code: nullableSecurityText(form.postalCode),
      city: nullableSecurityText(form.city),
      siret: nullableSecurityText(form.siret),
      vat_number: nullableSecurityText(form.vatNumber),
      payment_terms_days: Math.max(0, Math.min(180, Number(form.paymentTermsDays) || 30)),
      notes: nullableSecurityText(form.notes),
      created_by: user.id
    };
    try {
      let created: SecurityClientRecord;
      if (demoMode || !supabase) {
        created = { id: crypto.randomUUID(), ...payload, status: 'active', created_at: new Date().toISOString() };
        localStorage.setItem(`ncr-suite-security-clients-${organization.id}`, JSON.stringify([...rows, created]));
      } else {
        const { data, error: insertError } = await supabase.from('security_clients').insert(payload)
          .select('id,organization_id,company_name,contact_name,email,phone,billing_address,postal_code,city,siret,vat_number,payment_terms_days,notes,status,created_at').single();
        if (insertError) throw insertError;
        created = data as SecurityClientRecord;
      }
      setRows((current) => [...current, created].sort((a, b) => a.company_name.localeCompare(b.company_name, 'fr')));
      setForm(emptyForm); setSearchParams({}); setSuccess('Le client a bien été ajouté.');
    } catch (caught) { setError(`Création impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setSaving(false); }
  }

  async function archive(row: SecurityClientRecord) {
    if (!organization || !window.confirm(`Archiver le client « ${row.company_name} » ? Les sites existants resteront conservés.`)) return;
    try {
      if (demoMode || !supabase) {
        const next = rows.filter((item) => item.id !== row.id);
        localStorage.setItem(`ncr-suite-security-clients-${organization.id}`, JSON.stringify(next));
      } else {
        const { error: updateError } = await supabase.from('security_clients').update({ status: 'archived' }).eq('organization_id', organization.id).eq('id', row.id);
        if (updateError) throw updateError;
      }
      setRows((current) => current.filter((item) => item.id !== row.id));
      setSuccess('Le client a été archivé.');
    } catch (caught) { setError(`Archivage impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
  }

  if (!organization) return null;
  return <div className="page security-page">
    <header className="page-header"><div><p className="eyebrow">SÉCURITÉ PRIVÉE</p><h1>Clients</h1><p>Centralise les donneurs d’ordre et leurs informations de facturation.</p></div><button className="primary-button" type="button" onClick={() => setSearchParams({ new: '1' })}><Icon name="plus" size={18}/>Ajouter un client</button></header>
    {formOpen && <section className="panel security-form-panel"><div className="panel-header"><div><p className="eyebrow">NOUVEAU CLIENT</p><h2>Créer une fiche client</h2></div><button className="secondary-button compact-button" type="button" onClick={() => { setSearchParams({}); setForm(emptyForm); }}>Fermer</button></div>
      <form className="security-form-grid" onSubmit={createClient}>
        <label>Entreprise *<input autoFocus required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })}/></label>
        <label>Contact principal<input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })}/></label>
        <label>E-mail<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/></label>
        <label>Téléphone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}/></label>
        <label className="full-field">Adresse de facturation<input value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}/></label>
        <label>Code postal<input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })}/></label>
        <label>Ville<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}/></label>
        <label>SIRET<input value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })}/></label>
        <label>N° TVA<input value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })}/></label>
        <label>Délai de règlement (jours)<input type="number" min="0" max="180" value={form.paymentTermsDays} onChange={(e) => setForm({ ...form, paymentTermsDays: e.target.value })}/></label>
        <label className="full-field">Notes<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></label>
        <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={() => setSearchParams({})}>Annuler</button><button className="primary-button" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
      </form></section>}
    {error && <div className="error-message page-message" role="alert">{error}</div>}{success && <div className="success-message page-message" role="status">{success}</div>}
    <section className="panel security-list-panel"><div className="security-toolbar"><div><p className="eyebrow">PORTEFEUILLE CLIENTS</p><h2>{rows.length} client{rows.length > 1 ? 's' : ''}</h2></div><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Entreprise, contact, ville, SIRET…"/></div>
      {loading ? <div className="security-empty">Chargement…</div> : filtered.length === 0 ? <div className="security-empty"><Icon name="users" size={30}/><strong>Aucun client</strong><span>Crée un client avant d’ajouter ses sites.</span></div> : <div className="security-card-list">{filtered.map((row) => <article className="security-record-card" key={row.id}><span className="security-record-icon"><Icon name="building" size={20}/></span><div className="security-record-main"><strong>{row.company_name}</strong><span>{[row.contact_name, row.email, row.phone].filter(Boolean).join(' · ') || 'Coordonnées à compléter'}</span><small>{[row.billing_address, row.postal_code, row.city].filter(Boolean).join(' · ') || 'Adresse de facturation à compléter'} · règlement {row.payment_terms_days} j</small></div><span className="security-status-pill active">Actif</span><button className="secondary-button compact-button" type="button" onClick={() => void archive(row)}>Archiver</button></article>)}</div>}
    </section>
  </div>;
}
