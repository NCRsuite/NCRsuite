import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { formatSecurityMoney, nullableSecurityText, type SecurityClientRecord, type SecuritySiteRecord } from '../features/security/types';
import { supabase } from '../lib/supabase';

type FormState = { clientId: string; name: string; code: string; address: string; postalCode: string; city: string; contactName: string; contactPhone: string; hourlyRate: string; notes: string };
const emptyForm: FormState = { clientId: '', name: '', code: '', address: '', postalCode: '', city: '', contactName: '', contactPhone: '', hourlyRate: '', notes: '' };

export function SecuritySitesPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<SecuritySiteRecord[]>([]);
  const [clients, setClients] = useState<SecurityClientRecord[]>([]);
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
        const storedSites = localStorage.getItem(`ncr-suite-security-sites-${organizationId}`);
        const storedClients = localStorage.getItem(`ncr-suite-security-clients-${organizationId}`);
        if (active) { setRows(storedSites ? JSON.parse(storedSites) : []); setClients(storedClients ? JSON.parse(storedClients) : []); setLoading(false); }
        return;
      }
      const [{ data: siteData, error: siteError }, { data: clientData, error: clientError }] = await Promise.all([
        supabase.from('security_sites').select('id,organization_id,client_id,name,code,address,postal_code,city,contact_name,contact_phone,hourly_rate_cents,timezone,notes,status,created_at,security_clients(company_name)').eq('organization_id', organizationId).neq('status', 'archived').order('name'),
        supabase.from('security_clients').select('id,organization_id,company_name,contact_name,email,phone,billing_address,postal_code,city,siret,vat_number,payment_terms_days,notes,status,created_at').eq('organization_id', organizationId).eq('status', 'active').order('company_name')
      ]);
      if (!active) return;
      if (siteError || clientError) setError(`Chargement impossible : ${siteError?.message || clientError?.message}`);
      else { setRows((siteData ?? []) as unknown as SecuritySiteRecord[]); setClients((clientData ?? []) as SecurityClientRecord[]); }
      setLoading(false);
    }
    void load(); return () => { active = false; };
  }, [organization, demoMode]);

  useEffect(() => {
    if (formOpen && !form.clientId && clients[0]) setForm((current) => ({ ...current, clientId: clients[0].id }));
  }, [formOpen, form.clientId, clients]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    if (!needle) return rows;
    return rows.filter((row) => [row.name, row.code, row.city, row.security_clients?.company_name].filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(needle));
  }, [rows, query]);

  async function createSite(event: FormEvent) {
    event.preventDefault(); if (!organization || !user) return;
    if (!form.clientId || !form.name.trim()) { setError('Le client et le nom du site sont obligatoires.'); return; }
    const rate = Number(form.hourlyRate.replace(',', '.'));
    if (!Number.isFinite(rate) || rate < 0) { setError('Le tarif horaire est invalide.'); return; }
    setSaving(true); setError(''); setSuccess('');
    const payload = {
      organization_id: organization.id, client_id: form.clientId, name: form.name.trim(), code: nullableSecurityText(form.code),
      address: nullableSecurityText(form.address), postal_code: nullableSecurityText(form.postalCode), city: nullableSecurityText(form.city),
      contact_name: nullableSecurityText(form.contactName), contact_phone: nullableSecurityText(form.contactPhone), hourly_rate_cents: Math.round(rate * 100),
      timezone: 'Europe/Paris', notes: nullableSecurityText(form.notes), created_by: user.id
    };
    try {
      let created: SecuritySiteRecord;
      const client = clients.find((item) => item.id === form.clientId);
      if (demoMode || !supabase) {
        created = { id: crypto.randomUUID(), ...payload, status: 'active', created_at: new Date().toISOString(), security_clients: client ? { company_name: client.company_name } : null };
        localStorage.setItem(`ncr-suite-security-sites-${organization.id}`, JSON.stringify([...rows, created]));
      } else {
        const { data, error: insertError } = await supabase.from('security_sites').insert(payload)
          .select('id,organization_id,client_id,name,code,address,postal_code,city,contact_name,contact_phone,hourly_rate_cents,timezone,notes,status,created_at,security_clients(company_name)').single();
        if (insertError) throw insertError; created = data as unknown as SecuritySiteRecord;
      }
      setRows((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name, 'fr')));
      setForm({ ...emptyForm, clientId: clients[0]?.id ?? '' }); setSearchParams({}); setSuccess('Le site a bien été ajouté.');
    } catch (caught) { setError(`Création impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setSaving(false); }
  }

  async function archive(row: SecuritySiteRecord) {
    if (!organization || !window.confirm(`Archiver le site « ${row.name} » ?`)) return;
    try {
      if (demoMode || !supabase) {
        const next = rows.filter((item) => item.id !== row.id); localStorage.setItem(`ncr-suite-security-sites-${organization.id}`, JSON.stringify(next));
      } else {
        const { error: updateError } = await supabase.from('security_sites').update({ status: 'archived' }).eq('organization_id', organization.id).eq('id', row.id); if (updateError) throw updateError;
      }
      setRows((current) => current.filter((item) => item.id !== row.id)); setSuccess('Le site a été archivé.');
    } catch (caught) { setError(`Archivage impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
  }

  if (!organization) return null;
  return <div className="page security-page">
    <header className="page-header"><div><p className="eyebrow">SÉCURITÉ PRIVÉE</p><h1>Sites clients</h1><p>Associe chaque site à son client et définis son tarif horaire de facturation.</p></div><button className="primary-button" type="button" disabled={clients.length === 0} onClick={() => setSearchParams({ new: '1' })}><Icon name="plus" size={18}/>Ajouter un site</button></header>
    {clients.length === 0 && !loading && <div className="security-callout"><Icon name="alert" size={20}/><div><strong>Crée d’abord un client</strong><span>Un site doit obligatoirement être rattaché à un donneur d’ordre.</span></div></div>}
    {formOpen && <section className="panel security-form-panel"><div className="panel-header"><div><p className="eyebrow">NOUVEAU SITE</p><h2>Créer un site surveillé</h2></div><button className="secondary-button compact-button" type="button" onClick={() => { setSearchParams({}); setForm(emptyForm); }}>Fermer</button></div>
      <form className="security-form-grid" onSubmit={createSite}>
        <label>Client *<select required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}><option value="">Sélectionner</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.company_name}</option>)}</select></label>
        <label>Nom du site *<input autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label>
        <label>Code interne<input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}/></label>
        <label>Tarif horaire HT *<div className="security-money-input"><input required inputMode="decimal" placeholder="24,50" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}/><span>€/h</span></div></label>
        <label className="full-field">Adresse<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}/></label>
        <label>Code postal<input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })}/></label>
        <label>Ville<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}/></label>
        <label>Contact sur site<input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })}/></label>
        <label>Téléphone du site<input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}/></label>
        <label className="full-field">Notes<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></label>
        <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={() => setSearchParams({})}>Annuler</button><button className="primary-button" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
      </form></section>}
    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}
    <section className="panel security-list-panel"><div className="security-toolbar"><div><p className="eyebrow">SITES SURVEILLÉS</p><h2>{rows.length} site{rows.length > 1 ? 's' : ''}</h2></div><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Site, client, ville…"/></div>
      {loading ? <div className="security-empty">Chargement…</div> : filtered.length === 0 ? <div className="security-empty"><Icon name="map" size={30}/><strong>Aucun site</strong><span>Ajoute un site et son tarif pour calculer la facturation.</span></div> : <div className="security-card-list">{filtered.map((row) => <article className="security-record-card" key={row.id}><span className="security-record-icon"><Icon name="map" size={20}/></span><div className="security-record-main"><strong>{row.name}</strong><span>{row.security_clients?.company_name || 'Client inconnu'}{row.code ? ` · ${row.code}` : ''}</span><small>{[row.address, row.postal_code, row.city].filter(Boolean).join(' · ') || 'Adresse à compléter'}</small></div><div className="security-rate"><strong>{formatSecurityMoney(row.hourly_rate_cents)}</strong><small>par heure</small></div><button className="secondary-button compact-button" type="button" onClick={() => void archive(row)}>Archiver</button></article>)}</div>}
    </section>
  </div>;
}
