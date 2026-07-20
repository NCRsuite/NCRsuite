import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { formatCleaningMoney, nullableCleaningText, type CleaningClientRecord, type CleaningSiteRecord } from '../features/cleaning/types';
import { supabase } from '../lib/supabase';

const emptyForm = { clientId: '', name: '', code: '', address: '', postalCode: '', city: '', contactName: '', contactPhone: '', billingMode: 'hourly', rate: '25', instructions: '', accessDetails: '', expectedFrequency: '' };

export function CleaningSitesPage() {
  const { organization } = useOrganization(); const { user, demoMode } = useAuth(); const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<CleaningSiteRecord[]>([]); const [clients, setClients] = useState<CleaningClientRecord[]>([]); const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const formOpen = searchParams.get('new') === '1';

  useEffect(() => {
    if (!organization) return; const organizationId = organization.id; let active = true;
    async function load() {
      setLoading(true);
      if (demoMode || !supabase) {
        const storedSites = localStorage.getItem(`ncr-cleaning-sites-${organizationId}`); const storedClients = localStorage.getItem(`ncr-cleaning-clients-${organizationId}`);
        if (active) { setRows(storedSites ? JSON.parse(storedSites) as CleaningSiteRecord[] : []); setClients(storedClients ? JSON.parse(storedClients) as CleaningClientRecord[] : []); }
      } else {
        const [siteResult, clientResult] = await Promise.all([
          supabase.from('cleaning_sites').select('*,cleaning_clients(company_name)').eq('organization_id', organizationId).neq('status', 'archived').order('name'),
          supabase.from('cleaning_clients').select('*').eq('organization_id', organizationId).eq('status', 'active').order('company_name')
        ]);
        if (!active) return; const firstError = siteResult.error || clientResult.error; if (firstError) setError(firstError.message); else { setRows((siteResult.data ?? []) as CleaningSiteRecord[]); setClients((clientResult.data ?? []) as CleaningClientRecord[]); }
      }
      if (active) setLoading(false);
    }
    void load(); return () => { active = false; };
  }, [organization, demoMode]);

  const filtered = useMemo(() => { const needle = query.trim().toLocaleLowerCase('fr'); return needle ? rows.filter((row) => [row.name, row.code, row.city, row.cleaning_clients?.company_name].filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(needle)) : rows; }, [rows, query]);

  async function createSite(event: FormEvent) {
    event.preventDefault(); if (!organization || !user || !form.clientId || !form.name.trim()) return; setSaving(true); setError(''); setSuccess('');
    const payload = { organization_id: organization.id, client_id: form.clientId, name: form.name.trim(), code: nullableCleaningText(form.code), address: nullableCleaningText(form.address), postal_code: nullableCleaningText(form.postalCode), city: nullableCleaningText(form.city), contact_name: nullableCleaningText(form.contactName), contact_phone: nullableCleaningText(form.contactPhone), billing_mode: form.billingMode, service_rate_cents: Math.max(0, Math.round((Number(form.rate) || 0) * 100)), instructions: nullableCleaningText(form.instructions), access_details: nullableCleaningText(form.accessDetails), expected_frequency: nullableCleaningText(form.expectedFrequency), created_by: user.id };
    try {
      let created: CleaningSiteRecord;
      if (demoMode || !supabase) { const client = clients.find((item) => item.id === form.clientId); created = { id: crypto.randomUUID(), ...payload, status: 'active', created_at: new Date().toISOString(), cleaning_clients: client ? { company_name: client.company_name } : null } as CleaningSiteRecord; localStorage.setItem(`ncr-cleaning-sites-${organization.id}`, JSON.stringify([...rows, created])); }
      else { const { data, error: insertError } = await supabase.from('cleaning_sites').insert(payload).select('*,cleaning_clients(company_name)').single(); if (insertError) throw insertError; created = data as CleaningSiteRecord; }
      setRows((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name, 'fr'))); setForm(emptyForm); setSearchParams({}); setSuccess('Le site client a été ajouté.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Création impossible.'); } finally { setSaving(false); }
  }

  async function archive(row: CleaningSiteRecord) {
    if (!organization || !window.confirm(`Archiver le site « ${row.name} » ?`)) return;
    try { if (demoMode || !supabase) localStorage.setItem(`ncr-cleaning-sites-${organization.id}`, JSON.stringify(rows.filter((item) => item.id !== row.id))); else { const { error: updateError } = await supabase.from('cleaning_sites').update({ status: 'archived' }).eq('organization_id', organization.id).eq('id', row.id); if (updateError) throw updateError; } setRows((current) => current.filter((item) => item.id !== row.id)); setSuccess('Le site a été archivé.'); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Archivage impossible.'); }
  }

  if (!organization) return null;
  return <div className="page cleaning-page"><header className="page-header"><div><p className="eyebrow">NETTOYAGE</p><h1>Sites clients</h1><p>Contrats, tarifs, consignes d’accès et organisation de chaque site.</p></div><button className="primary-button" disabled={clients.length === 0} onClick={() => setSearchParams({ new: '1' })}><Icon name="plus" size={18}/>Ajouter un site</button></header>
    {clients.length === 0 && <div className="info-message page-message">Crée d’abord un client avant d’ajouter un site.</div>}
    {formOpen && <section className="panel cleaning-form-panel"><div className="panel-header"><div><p className="eyebrow">NOUVEAU SITE</p><h2>Configurer la prestation</h2></div><button className="secondary-button compact-button" onClick={() => setSearchParams({})}>Fermer</button></div><form className="cleaning-form-grid" onSubmit={createSite}>
      <label>Client *<select required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}><option value="">Sélectionner</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.company_name}</option>)}</select></label><label>Nom du site *<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label>
      <label>Code site<input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}/></label><label>Fréquence prévue<input value={form.expectedFrequency} onChange={(e) => setForm({ ...form, expectedFrequency: e.target.value })} placeholder="5 passages/semaine"/></label>
      <label className="full-field">Adresse<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}/></label><label>Code postal<input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })}/></label><label>Ville<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}/></label>
      <label>Contact sur site<input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })}/></label><label>Téléphone sur site<input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}/></label>
      <label>Facturation<select value={form.billingMode} onChange={(e) => setForm({ ...form, billingMode: e.target.value })}><option value="hourly">À l’heure</option><option value="flat">Forfait par intervention</option></select></label><label>{form.billingMode === 'hourly' ? 'Tarif horaire HT' : 'Forfait HT'}<input type="number" min="0" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })}/></label>
      <label className="full-field">Consignes de nettoyage<textarea rows={4} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Zones, tâches, produits autorisés, points sensibles…"/></label><label className="full-field">Accès et sécurité<textarea rows={3} value={form.accessDetails} onChange={(e) => setForm({ ...form, accessDetails: e.target.value })} placeholder="Clés, codes, alarmes, horaires autorisés…"/></label>
      <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={() => setSearchParams({})}>Annuler</button><button className="primary-button" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
    </form></section>}
    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}
    <section className="panel cleaning-list-panel"><div className="cleaning-toolbar"><div><p className="eyebrow">SITES SOUS CONTRAT</p><h2>{rows.length} site{rows.length > 1 ? 's' : ''}</h2></div><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Site, client, ville…"/></div>
      {loading ? <div className="cleaning-empty">Chargement…</div> : filtered.length === 0 ? <div className="cleaning-empty"><Icon name="map" size={30}/><strong>Aucun site</strong><span>Ajoute les lieux à entretenir.</span></div> : <div className="cleaning-card-list">{filtered.map((row) => <article className="cleaning-record-card cleaning-site-card" key={row.id}><span className="cleaning-record-icon"><Icon name="map" size={20}/></span><div className="cleaning-record-main"><strong>{row.name}</strong><span>{row.cleaning_clients?.company_name || 'Client'} · {[row.address, row.postal_code, row.city].filter(Boolean).join(' ') || 'Adresse à compléter'}</span><small>{row.billing_mode === 'hourly' ? `${formatCleaningMoney(row.service_rate_cents)}/h` : `${formatCleaningMoney(row.service_rate_cents)}/intervention`}{row.expected_frequency ? ` · ${row.expected_frequency}` : ''}</small>{row.instructions && <p className="cleaning-inline-note">{row.instructions}</p>}</div><button className="secondary-button compact-button" onClick={() => void archive(row)}>Archiver</button></article>)}</div>}
    </section>
  </div>;
}
