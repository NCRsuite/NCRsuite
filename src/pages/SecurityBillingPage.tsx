import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import {
  formatSecurityDate, formatSecurityDuration, formatSecurityMoney, monthRange,
  type SecurityClientRecord, type SecurityInvoiceLineRecord, type SecurityInvoiceRecord,
  type SecurityShiftRecord, type SecuritySiteRecord
} from '../features/security/types';
import { prepareFileWindow, showBlobDownload, closeFileWindow } from '../lib/browserFiles';
import { supabase } from '../lib/supabase';

type PreviewLine = { siteId: string; siteName: string; scheduledMinutes: number; hourlyRateCents: number; lineTotalCents: number };

function invoiceStatusLabel(status: SecurityInvoiceRecord['status']) {
  return status === 'draft' ? 'Brouillon' : status === 'issued' ? 'Émise' : status === 'paid' ? 'Payée' : 'Annulée';
}

export function SecurityBillingPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const defaultRange = useMemo(() => monthRange(), []);
  const [clients, setClients] = useState<SecurityClientRecord[]>([]);
  const [sites, setSites] = useState<SecuritySiteRecord[]>([]);
  const [shifts, setShifts] = useState<SecurityShiftRecord[]>([]);
  const [invoices, setInvoices] = useState<SecurityInvoiceRecord[]>([]);
  const [clientId, setClientId] = useState('');
  const [periodStart, setPeriodStart] = useState(defaultRange.start);
  const [periodEnd, setPeriodEnd] = useState(defaultRange.end);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingId, setExportingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!organization) return;
    const organizationId = organization.id;
    let active = true;
    async function load() {
      setLoading(true); setError('');
      if (demoMode || !supabase) {
        const clientRows = JSON.parse(localStorage.getItem(`ncr-suite-security-clients-${organizationId}`) || '[]') as SecurityClientRecord[];
        const siteRows = JSON.parse(localStorage.getItem(`ncr-suite-security-sites-${organizationId}`) || '[]') as SecuritySiteRecord[];
        const shiftRows = JSON.parse(localStorage.getItem(`ncr-suite-security-shifts-${organizationId}`) || '[]') as SecurityShiftRecord[];
        const invoiceRows = JSON.parse(localStorage.getItem(`ncr-suite-security-invoices-${organizationId}`) || '[]') as SecurityInvoiceRecord[];
        if (active) { setClients(clientRows.filter((row) => row.status === 'active')); setSites(siteRows.filter((row) => row.status === 'active')); setShifts(shiftRows); setInvoices(invoiceRows); setClientId((current) => current || clientRows.find((row) => row.status === 'active')?.id || ''); setLoading(false); }
        return;
      }
      const [clientResult, siteResult, shiftResult, invoiceResult] = await Promise.all([
        supabase.from('security_clients').select('id,organization_id,company_name,contact_name,email,phone,billing_address,postal_code,city,siret,vat_number,payment_terms_days,notes,status,created_at').eq('organization_id', organizationId).eq('status', 'active').order('company_name'),
        supabase.from('security_sites').select('id,organization_id,client_id,name,code,address,postal_code,city,contact_name,contact_phone,hourly_rate_cents,timezone,notes,status,created_at,security_clients(company_name)').eq('organization_id', organizationId).eq('status', 'active').order('name'),
        supabase.from('security_shifts').select('id,organization_id,site_id,agent_id,title,starts_at,ends_at,break_minutes,status,notes,created_at,security_sites(name,hourly_rate_cents,city,security_clients(company_name)),security_agents(first_name,last_name)').eq('organization_id', organizationId).neq('status', 'canceled').order('starts_at'),
        supabase.from('security_invoices').select('id,organization_id,client_id,invoice_number,period_start,period_end,status,subtotal_cents,total_cents,notes,issued_at,paid_at,created_at,security_clients(id,organization_id,company_name,contact_name,email,phone,billing_address,postal_code,city,siret,vat_number,payment_terms_days,notes,status,created_at),security_invoice_lines(id,organization_id,invoice_id,site_id,description,scheduled_minutes,hourly_rate_cents,line_total_cents,security_sites(name))').eq('organization_id', organizationId).order('created_at', { ascending: false })
      ]);
      if (!active) return;
      const firstError = clientResult.error || siteResult.error || shiftResult.error || invoiceResult.error;
      if (firstError) setError(`Chargement impossible : ${firstError.message}`);
      else {
        const clientRows = (clientResult.data ?? []) as SecurityClientRecord[];
        setClients(clientRows); setSites((siteResult.data ?? []) as unknown as SecuritySiteRecord[]); setShifts((shiftResult.data ?? []) as unknown as SecurityShiftRecord[]); setInvoices((invoiceResult.data ?? []) as unknown as SecurityInvoiceRecord[]);
        setClientId((current) => current || clientRows[0]?.id || '');
      }
      setLoading(false);
    }
    void load(); return () => { active = false; };
  }, [organization, demoMode]);

  const preview = useMemo<PreviewLine[]>(() => {
    if (!clientId || !periodStart || !periodEnd) return [];
    const start = new Date(`${periodStart}T00:00:00`); const end = new Date(`${periodEnd}T23:59:59.999`);
    return sites.filter((site) => site.client_id === clientId).map((site) => {
      const siteShifts = shifts.filter((shift) => shift.site_id === site.id && shift.status !== 'canceled' && new Date(shift.starts_at) >= start && new Date(shift.starts_at) <= end);
      const scheduledMinutes = siteShifts.reduce((sum, shift) => sum + Math.max(0, Math.round((new Date(shift.ends_at).getTime() - new Date(shift.starts_at).getTime()) / 60000) - shift.break_minutes), 0);
      return { siteId: site.id, siteName: site.name, scheduledMinutes, hourlyRateCents: site.hourly_rate_cents, lineTotalCents: Math.round((scheduledMinutes / 60) * site.hourly_rate_cents) };
    }).filter((line) => line.scheduledMinutes > 0);
  }, [clientId, periodStart, periodEnd, sites, shifts]);
  const previewTotal = preview.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const previewMinutes = preview.reduce((sum, line) => sum + line.scheduledMinutes, 0);

  async function generateInvoice(event: FormEvent) {
    event.preventDefault(); if (!organization || !user || !clientId) return;
    if (!preview.length) { setError('Aucune heure programmée facturable sur cette période.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      let created: SecurityInvoiceRecord;
      const client = clients.find((item) => item.id === clientId) ?? null;
      if (demoMode || !supabase) {
        const lines: SecurityInvoiceLineRecord[] = preview.map((line) => ({ id: crypto.randomUUID(), organization_id: organization.id, invoice_id: '', site_id: line.siteId, description: `Heures de sécurité programmées — ${line.siteName}`, scheduled_minutes: line.scheduledMinutes, hourly_rate_cents: line.hourlyRateCents, line_total_cents: line.lineTotalCents, security_sites: { name: line.siteName } }));
        const id = crypto.randomUUID(); lines.forEach((line) => { line.invoice_id = id; });
        created = { id, organization_id: organization.id, client_id: clientId, invoice_number: `SEC-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(6, '0')}`, period_start: periodStart, period_end: periodEnd, status: 'draft', subtotal_cents: previewTotal, total_cents: previewTotal, notes: notes.trim() || null, issued_at: null, paid_at: null, created_at: new Date().toISOString(), security_clients: client, security_invoice_lines: lines };
        const next = [created, ...invoices]; localStorage.setItem(`ncr-suite-security-invoices-${organization.id}`, JSON.stringify(next));
      } else {
        const { data: invoiceId, error: rpcError } = await supabase.rpc('generate_security_invoice', { p_organization_id: organization.id, p_client_id: clientId, p_period_start: periodStart, p_period_end: periodEnd, p_notes: notes.trim() || null });
        if (rpcError) throw rpcError;
        const { data, error: readError } = await supabase.from('security_invoices').select('id,organization_id,client_id,invoice_number,period_start,period_end,status,subtotal_cents,total_cents,notes,issued_at,paid_at,created_at,security_clients(id,organization_id,company_name,contact_name,email,phone,billing_address,postal_code,city,siret,vat_number,payment_terms_days,notes,status,created_at),security_invoice_lines(id,organization_id,invoice_id,site_id,description,scheduled_minutes,hourly_rate_cents,line_total_cents,security_sites(name))').eq('organization_id', organization.id).eq('id', invoiceId).single();
        if (readError) throw readError; created = data as unknown as SecurityInvoiceRecord;
      }
      setInvoices((current) => [created, ...current]); setNotes(''); setSuccess(`La préfacture ${created.invoice_number} a été générée.`);
    } catch (caught) { setError(`Génération impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setSaving(false); }
  }

  async function updateStatus(invoice: SecurityInvoiceRecord, status: SecurityInvoiceRecord['status']) {
    if (!organization) return;
    try {
      let updated = { ...invoice, status, issued_at: status === 'issued' || status === 'paid' ? invoice.issued_at || new Date().toISOString() : invoice.issued_at, paid_at: status === 'paid' ? invoice.paid_at || new Date().toISOString() : invoice.paid_at };
      if (demoMode || !supabase) {
        const next = invoices.map((item) => item.id === invoice.id ? updated : item); localStorage.setItem(`ncr-suite-security-invoices-${organization.id}`, JSON.stringify(next));
      } else {
        const { data, error: updateError } = await supabase.rpc('set_security_invoice_status', {
          p_organization_id: organization.id,
          p_invoice_id: invoice.id,
          p_status: status
        });
        if (updateError) throw updateError;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) throw new Error('La mise à jour du statut n’a retourné aucune donnée.');
        updated = { ...updated, ...(row as Pick<SecurityInvoiceRecord, 'status' | 'issued_at' | 'paid_at'>) };
      }
      setInvoices((current) => current.map((item) => item.id === invoice.id ? updated : item)); setSuccess(`Statut mis à jour : ${invoiceStatusLabel(status)}.`);
    } catch (caught) { setError(`Mise à jour impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
  }

  async function download(invoice: SecurityInvoiceRecord) {
    if (!organization) return;
    const target = prepareFileWindow('Préparation du PDF', 'La facture prévisionnelle est en cours de génération.');
    setExportingId(invoice.id); setError('');
    try {
      const { generateSecurityInvoicePdf } = await import('../features/security/invoicePdf');
      const result = await generateSecurityInvoicePdf(organization, invoice); const url = URL.createObjectURL(result.blob);
      showBlobDownload(target, url, result.filename, 'Facture prévisionnelle prête'); window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } catch (caught) { closeFileWindow(target); setError(`PDF impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setExportingId(''); }
  }

  if (!organization) return null;
  return <div className="page security-page security-billing-page">
    <header className="page-header"><div><p className="eyebrow">SÉCURITÉ PRIVÉE</p><h1>Facturation clients</h1><p>Transforme les heures programmées en préfactures selon le tarif de chaque site.</p></div></header>
    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}
    <section className="security-billing-grid"><article className="panel security-billing-builder"><div className="panel-header"><div><p className="eyebrow">NOUVELLE PRÉFACTURE</p><h2>Choisir la période</h2><p>Les heures réalisées ne remplacent jamais les heures programmées dans ce calcul.</p></div></div>
      <form className="security-form-grid" onSubmit={generateInvoice}><label>Client *<select required value={clientId} onChange={(e) => setClientId(e.target.value)}><option value="">Sélectionner</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.company_name}</option>)}</select></label><span/>
        <label>Du<input type="date" required value={periodStart} onChange={(e) => setPeriodStart(e.target.value)}/></label><label>Au<input type="date" required value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)}/></label><label className="full-field">Note interne<textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}/></label>
        <div className="full-field security-preview"><div><span>Heures programmées</span><strong>{formatSecurityDuration(previewMinutes)}</strong></div><div><span>Sites facturés</span><strong>{preview.length}</strong></div><div><span>Total prévisionnel HT</span><strong>{formatSecurityMoney(previewTotal)}</strong></div></div>
        {preview.length > 0 && <div className="full-field security-preview-lines">{preview.map((line) => <div key={line.siteId}><span><strong>{line.siteName}</strong><small>{formatSecurityDuration(line.scheduledMinutes)} × {formatSecurityMoney(line.hourlyRateCents)}/h</small></span><b>{formatSecurityMoney(line.lineTotalCents)}</b></div>)}</div>}
        <div className="form-actions full-field"><button className="primary-button" disabled={saving || !preview.length}>{saving ? 'Génération…' : 'Générer la préfacture'}</button></div>
      </form></article>
      <aside className="panel security-billing-rule"><span><Icon name="shield" size={24}/></span><p className="eyebrow">RÈGLE DÉCOUVERTE</p><h2>Calcul simple et transparent</h2><p>Pour chaque site : <strong>heures programmées × tarif horaire du site</strong>. Les absences, remplacements ou heures supplémentaires restent visibles dans le planning, mais ne changent pas automatiquement la facture.</p></aside>
    </section>
    <section className="panel security-list-panel"><div className="panel-header"><div><p className="eyebrow">HISTORIQUE</p><h2>{invoices.length} préfacture{invoices.length > 1 ? 's' : ''}</h2></div></div>
      {loading ? <div className="security-empty">Chargement…</div> : invoices.length === 0 ? <div className="security-empty"><Icon name="creditCard" size={30}/><strong>Aucune préfacture</strong><span>Sélectionne un client et une période pour générer la première.</span></div> : <div className="security-invoice-list">{invoices.map((invoice) => <article key={invoice.id} className="security-invoice-card"><div className="security-invoice-number"><span><Icon name="file" size={19}/></span><div><strong>{invoice.invoice_number}</strong><small>{invoice.security_clients?.company_name || 'Client'} · du {formatSecurityDate(invoice.period_start)} au {formatSecurityDate(invoice.period_end)}</small></div></div><div className="security-invoice-total"><strong>{formatSecurityMoney(invoice.total_cents)}</strong><small>HT</small></div><span className={`security-status-pill ${invoice.status}`}>{invoiceStatusLabel(invoice.status)}</span><div className="security-record-actions"><button className="secondary-button compact-button" disabled={exportingId === invoice.id} onClick={() => void download(invoice)}>{exportingId === invoice.id ? 'PDF…' : 'Télécharger'}</button>{invoice.status === 'draft' && <button className="secondary-button compact-button" onClick={() => void updateStatus(invoice, 'issued')}>Marquer émise</button>}{invoice.status === 'issued' && <button className="primary-button compact-button" onClick={() => void updateStatus(invoice, 'paid')}>Marquer payée</button>}</div></article>)}</div>}
    </section>
  </div>;
}
