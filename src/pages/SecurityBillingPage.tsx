import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import {
  formatSecurityDate,
  formatSecurityDuration,
  formatSecurityMoney,
  monthRange,
  type SecurityClientRecord,
  type SecurityInvoiceLineRecord,
  type SecurityInvoiceRecord,
  type SecurityShiftRecord,
  type SecuritySiteRecord
} from '../features/security/types';
import { generateSecurityInvoicePdf } from '../features/security/invoicePdf';
import { prepareFileWindow, showBlobDownload, closeFileWindow } from '../lib/browserFiles';
import { supabase } from '../lib/supabase';

type PreviewLine = { siteId: string; siteName: string; scheduledMinutes: number; hourlyRateCents: number; lineTotalCents: number };
type PreviewRpcRow = { site_id: string; site_name: string; scheduled_minutes: number; hourly_rate_cents: number; line_total_cents: number };

const invoiceSelect = 'id,organization_id,client_id,invoice_number,period_start,period_end,status,subtotal_cents,total_cents,notes,issued_at,paid_at,created_at,security_clients!security_invoices_client_fk(id,organization_id,company_name,contact_name,email,phone,billing_address,postal_code,city,siret,vat_number,payment_terms_days,notes,status,created_at),security_invoice_lines(id,organization_id,invoice_id,site_id,description,scheduled_minutes,hourly_rate_cents,line_total_cents,security_sites!security_invoice_lines_site_fk(name))';

function invoiceStatusLabel(status: SecurityInvoiceRecord['status']) {
  return status === 'draft' ? 'Brouillon' : status === 'issued' ? 'Émise' : status === 'paid' ? 'Payée' : 'Annulée';
}

function billingErrorMessage(caught: unknown) {
  const message = caught instanceof Error
    ? caught.message
    : typeof caught === 'object' && caught !== null && 'message' in caught
      ? String((caught as { message?: unknown }).message || '')
      : typeof caught === 'string'
        ? caught
        : '';
  const details = typeof caught === 'object' && caught !== null && 'details' in caught
    ? String((caught as { details?: unknown }).details || '')
    : '';
  const readable = [message, details].filter(Boolean).join(' — ') || 'erreur inconnue';
  if (readable.includes('security_scheduled_billing')) return 'La facturation Sécurité n’est pas activée pour cette offre.';
  if (readable.includes('Aucune heure programmée')) return 'Aucune mission facturable n’a été trouvée pour ce client et cette période.';
  if (readable.includes('déjà') && readable.includes('préfacture')) return readable;
  return readable;
}

export function SecurityBillingPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const defaultRange = useMemo(() => monthRange(), []);
  const [clients, setClients] = useState<SecurityClientRecord[]>([]);
  const [demoSites, setDemoSites] = useState<SecuritySiteRecord[]>([]);
  const [demoShifts, setDemoShifts] = useState<SecurityShiftRecord[]>([]);
  const [invoices, setInvoices] = useState<SecurityInvoiceRecord[]>([]);
  const [preview, setPreview] = useState<PreviewLine[]>([]);
  const [clientId, setClientId] = useState('');
  const [periodStart, setPeriodStart] = useState(defaultRange.start);
  const [periodEnd, setPeriodEnd] = useState(defaultRange.end);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingId, setExportingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewNonce, setPreviewNonce] = useState(0);

  async function readInvoices(organizationId: string) {
    if (!supabase) return [];
    const { data, error: readError } = await supabase.from('security_invoices').select(invoiceSelect).eq('organization_id', organizationId).order('created_at', { ascending: false });
    if (readError) throw readError;
    return (data ?? []) as unknown as SecurityInvoiceRecord[];
  }

  useEffect(() => {
    if (!organization) return;
    const organizationId = organization.id;
    let active = true;
    async function load() {
      setLoading(true); setError('');
      try {
        if (demoMode || !supabase) {
          const clientRows = JSON.parse(localStorage.getItem(`ncr-suite-security-clients-${organizationId}`) || '[]') as SecurityClientRecord[];
          const siteRows = JSON.parse(localStorage.getItem(`ncr-suite-security-sites-${organizationId}`) || '[]') as SecuritySiteRecord[];
          const shiftRows = JSON.parse(localStorage.getItem(`ncr-suite-security-shifts-${organizationId}`) || '[]') as SecurityShiftRecord[];
          const invoiceRows = JSON.parse(localStorage.getItem(`ncr-suite-security-invoices-${organizationId}`) || '[]') as SecurityInvoiceRecord[];
          if (active) {
            const activeClients = clientRows.filter((row) => row.status === 'active');
            setClients(activeClients); setDemoSites(siteRows.filter((row) => row.status === 'active')); setDemoShifts(shiftRows); setInvoices(invoiceRows);
            setClientId((current) => current || activeClients[0]?.id || '');
          }
          return;
        }

        const [clientResult, invoiceRows] = await Promise.all([
          supabase.from('security_clients').select('id,organization_id,company_name,contact_name,email,phone,billing_address,postal_code,city,siret,vat_number,payment_terms_days,notes,status,created_at').eq('organization_id', organizationId).eq('status', 'active').order('company_name'),
          readInvoices(organizationId)
        ]);
        if (clientResult.error) throw clientResult.error;
        if (!active) return;
        const clientRows = (clientResult.data ?? []) as SecurityClientRecord[];
        setClients(clientRows); setInvoices(invoiceRows); setClientId((current) => current || clientRows[0]?.id || '');
      } catch (caught) {
        if (active) setError(`Chargement impossible : ${billingErrorMessage(caught)}`);
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [organization?.id, demoMode]);

  useEffect(() => {
    if (!organization || !clientId || !periodStart || !periodEnd) { setPreview([]); return; }
    let active = true;
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true); setError('');
      try {
        if (demoMode || !supabase) {
          const start = new Date(`${periodStart}T00:00:00`);
          const end = new Date(`${periodEnd}T23:59:59.999`);
          const lines = demoSites.filter((site) => site.client_id === clientId).map((site) => {
            const siteShifts = demoShifts.filter((shift) => shift.site_id === site.id && shift.status !== 'canceled' && new Date(shift.starts_at) >= start && new Date(shift.starts_at) <= end);
            const scheduledMinutes = siteShifts.reduce((sum, shift) => sum + Math.max(0, Math.round((new Date(shift.ends_at).getTime() - new Date(shift.starts_at).getTime()) / 60000) - shift.break_minutes), 0);
            return { siteId: site.id, siteName: site.name, scheduledMinutes, hourlyRateCents: site.hourly_rate_cents, lineTotalCents: Math.round((scheduledMinutes / 60) * site.hourly_rate_cents) };
          });
          if (active) setPreview(lines);
          return;
        }

        const { data, error: previewError } = await supabase.rpc('preview_security_invoice', {
          p_organization_id: organization.id,
          p_client_id: clientId,
          p_period_start: periodStart,
          p_period_end: periodEnd
        });
        if (previewError) throw previewError;
        const lines = ((data ?? []) as PreviewRpcRow[]).map((row) => ({
          siteId: row.site_id,
          siteName: row.site_name,
          scheduledMinutes: Number(row.scheduled_minutes) || 0,
          hourlyRateCents: Number(row.hourly_rate_cents) || 0,
          lineTotalCents: Number(row.line_total_cents) || 0
        }));
        if (active) setPreview(lines);
      } catch (caught) {
        if (active) { setPreview([]); setError(`Calcul impossible : ${billingErrorMessage(caught)}`); }
      } finally { if (active) setPreviewLoading(false); }
    }, 220);
    return () => { active = false; window.clearTimeout(timer); };
  }, [organization?.id, clientId, periodStart, periodEnd, demoMode, demoSites, demoShifts, previewNonce]);

  const billablePreview = preview.filter((line) => line.scheduledMinutes > 0);
  const previewTotal = billablePreview.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const previewMinutes = billablePreview.reduce((sum, line) => sum + line.scheduledMinutes, 0);
  const existingForPeriod = invoices.find((invoice) => invoice.client_id === clientId && invoice.period_start === periodStart && invoice.period_end === periodEnd && invoice.status !== 'canceled');

  async function generateInvoice(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !clientId) return;
    if (!billablePreview.length) { setError('Aucune heure programmée facturable sur cette période.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      let created: SecurityInvoiceRecord;
      const client = clients.find((item) => item.id === clientId) ?? null;
      if (demoMode || !supabase) {
        const previousDraft = invoices.find((invoice) => invoice.client_id === clientId && invoice.period_start === periodStart && invoice.period_end === periodEnd && invoice.status === 'draft');
        const id = previousDraft?.id || crypto.randomUUID();
        const lines: SecurityInvoiceLineRecord[] = billablePreview.map((line) => ({ id: crypto.randomUUID(), organization_id: organization.id, invoice_id: id, site_id: line.siteId, description: `Heures de sécurité programmées — ${line.siteName}`, scheduled_minutes: line.scheduledMinutes, hourly_rate_cents: line.hourlyRateCents, line_total_cents: line.lineTotalCents, security_sites: { name: line.siteName } }));
        created = { id, organization_id: organization.id, client_id: clientId, invoice_number: previousDraft?.invoice_number || `SEC-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(6, '0')}`, period_start: periodStart, period_end: periodEnd, status: 'draft', subtotal_cents: previewTotal, total_cents: previewTotal, notes: notes.trim() || null, issued_at: null, paid_at: null, created_at: previousDraft?.created_at || new Date().toISOString(), security_clients: client, security_invoice_lines: lines };
        const next = [created, ...invoices.filter((invoice) => invoice.id !== id)];
        localStorage.setItem(`ncr-suite-security-invoices-${organization.id}`, JSON.stringify(next));
        setInvoices(next);
      } else {
        const { data: invoiceId, error: rpcError } = await supabase.rpc('generate_security_invoice', { p_organization_id: organization.id, p_client_id: clientId, p_period_start: periodStart, p_period_end: periodEnd, p_notes: notes.trim() || null });
        if (rpcError) throw rpcError;
        const { data, error: readError } = await supabase.from('security_invoices').select(invoiceSelect).eq('organization_id', organization.id).eq('id', invoiceId).single();
        if (readError) throw readError;
        created = data as unknown as SecurityInvoiceRecord;
        setInvoices((current) => [created, ...current.filter((invoice) => invoice.id !== created.id)]);
      }
      setNotes('');
      setSuccess(`${existingForPeriod?.status === 'draft' ? 'Le brouillon' : 'La préfacture'} ${created.invoice_number} a été ${existingForPeriod?.status === 'draft' ? 'recalculé' : 'généré'}.`);
    } catch (caught) { setError(`Génération impossible : ${billingErrorMessage(caught)}`); }
    finally { setSaving(false); }
  }

  async function updateStatus(invoice: SecurityInvoiceRecord, status: SecurityInvoiceRecord['status']) {
    if (!organization) return;
    setError(''); setSuccess('');
    try {
      let updated = { ...invoice, status, issued_at: status === 'issued' || status === 'paid' ? invoice.issued_at || new Date().toISOString() : invoice.issued_at, paid_at: status === 'paid' ? invoice.paid_at || new Date().toISOString() : invoice.paid_at };
      if (demoMode || !supabase) {
        const next = invoices.map((item) => item.id === invoice.id ? updated : item);
        localStorage.setItem(`ncr-suite-security-invoices-${organization.id}`, JSON.stringify(next));
      } else {
        const { data, error: updateError } = await supabase.rpc('set_security_invoice_status', { p_organization_id: organization.id, p_invoice_id: invoice.id, p_status: status });
        if (updateError) throw updateError;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) throw new Error('La mise à jour du statut n’a retourné aucune donnée.');
        updated = { ...updated, ...(row as Pick<SecurityInvoiceRecord, 'status' | 'issued_at' | 'paid_at'>) };
      }
      setInvoices((current) => current.map((item) => item.id === invoice.id ? updated : item));
      setSuccess(`Statut mis à jour : ${invoiceStatusLabel(status)}.`);
    } catch (caught) { setError(`Mise à jour impossible : ${billingErrorMessage(caught)}`); }
  }

  async function download(invoice: SecurityInvoiceRecord) {
    if (!organization) return;
    const target = prepareFileWindow('Préparation du PDF', 'La facture prévisionnelle est en cours de génération.');
    setExportingId(invoice.id); setError('');
    try {
      const result = await generateSecurityInvoicePdf(organization, invoice);
      const url = URL.createObjectURL(result.blob);
      showBlobDownload(target, url, result.filename, 'Facture prévisionnelle prête');
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } catch (caught) { closeFileWindow(target); setError(`PDF impossible : ${billingErrorMessage(caught)}`); }
    finally { setExportingId(''); }
  }

  if (!organization) return null;
  return <div className="page security-page security-billing-page">
    <header className="page-header"><div><p className="eyebrow">SÉCURITÉ PRIVÉE</p><h1>Facturation clients</h1><p>Transforme les heures programmées en préfactures selon le tarif de chaque site.</p></div></header>
    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}

    <section className="security-billing-grid"><article className="panel security-billing-builder"><div className="panel-header"><div><p className="eyebrow">NOUVELLE PRÉFACTURE</p><h2>Choisir la période</h2><p>Le calcul affiché vient désormais directement de Supabase : l’aperçu et la préfacture utilisent exactement les mêmes missions.</p></div></div>
      <form className="security-form-grid" onSubmit={generateInvoice}><label>Client *<select required value={clientId} onChange={(event) => setClientId(event.target.value)}><option value="">Sélectionner</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.company_name}</option>)}</select></label><span/>
        <label>Du<input type="date" required value={periodStart} onChange={(event) => setPeriodStart(event.target.value)}/></label><label>Au<input type="date" required value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)}/></label><label className="full-field">Note interne<textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)}/></label>
        <div className="full-field security-preview"><div><span>Heures programmées</span><strong>{previewLoading ? 'Calcul…' : formatSecurityDuration(previewMinutes)}</strong></div><div><span>Sites facturés</span><strong>{previewLoading ? '—' : billablePreview.length}</strong><small>{previewLoading ? '' : `${preview.length} site(s) rattaché(s)`}</small></div><div><span>Total prévisionnel HT</span><strong>{previewLoading ? 'Calcul…' : formatSecurityMoney(previewTotal)}</strong></div></div>
        {preview.length > 0 && <div className="full-field security-preview-lines">{preview.map((line) => <div key={line.siteId} className={line.scheduledMinutes > 0 ? '' : 'not-billable'}><span><strong>{line.siteName}</strong><small>{line.scheduledMinutes > 0 ? `${formatSecurityDuration(line.scheduledMinutes)} × ${formatSecurityMoney(line.hourlyRateCents)}/h` : `Aucune mission programmée sur la période · ${formatSecurityMoney(line.hourlyRateCents)}/h`}</small></span><b>{line.scheduledMinutes > 0 ? formatSecurityMoney(line.lineTotalCents) : 'Non facturé'}</b></div>)}</div>}
        {existingForPeriod && <div className={`full-field security-billing-existing ${existingForPeriod.status}`}><Icon name="file" size={18}/><div><strong>{existingForPeriod.invoice_number} existe déjà</strong><span>{existingForPeriod.status === 'draft' ? 'Le bouton ci-dessous recalculera ce brouillon avec le planning actuel.' : `Cette préfacture est ${invoiceStatusLabel(existingForPeriod.status).toLowerCase()} et ne peut plus être remplacée.`}</span></div></div>}
        <div className="form-actions full-field"><button className="secondary-button" type="button" disabled={previewLoading} onClick={() => setPreviewNonce((value) => value + 1)}>Actualiser le calcul</button><button className="primary-button" disabled={saving || previewLoading || !billablePreview.length || Boolean(existingForPeriod && existingForPeriod.status !== 'draft')}>{saving ? 'Génération…' : existingForPeriod?.status === 'draft' ? 'Recalculer le brouillon' : 'Générer la préfacture'}</button></div>
      </form></article>
      <aside className="panel security-billing-rule"><span><Icon name="shield" size={24}/></span><p className="eyebrow">RÈGLE DÉCOUVERTE</p><h2>Calcul simple et transparent</h2><p>Pour chaque site : <strong>heures programmées × tarif horaire du site</strong>. Les absences, remplacements ou heures supplémentaires restent visibles dans le planning, mais ne changent pas automatiquement la facture.</p></aside>
    </section>

    <section className="panel security-list-panel"><div className="panel-header"><div><p className="eyebrow">HISTORIQUE</p><h2>{invoices.length} préfacture{invoices.length > 1 ? 's' : ''}</h2></div></div>
      {loading ? <div className="security-empty">Chargement…</div> : invoices.length === 0 ? <div className="security-empty"><Icon name="creditCard" size={30}/><strong>Aucune préfacture</strong><span>Sélectionne un client et une période pour générer la première.</span></div> : <div className="security-invoice-list">{invoices.map((invoice) => <article key={invoice.id} className="security-invoice-card"><div className="security-invoice-number"><span><Icon name="file" size={19}/></span><div><strong>{invoice.invoice_number}</strong><small>{invoice.security_clients?.company_name || 'Client'} · du {formatSecurityDate(invoice.period_start)} au {formatSecurityDate(invoice.period_end)}</small></div></div><div className="security-invoice-total"><strong>{formatSecurityMoney(invoice.total_cents)}</strong><small>HT</small></div><span className={`security-status-pill ${invoice.status}`}>{invoiceStatusLabel(invoice.status)}</span><div className="security-record-actions"><button className="secondary-button compact-button" disabled={exportingId === invoice.id} onClick={() => void download(invoice)}>{exportingId === invoice.id ? 'PDF…' : 'Télécharger'}</button>{invoice.status === 'draft' && <button className="secondary-button compact-button" onClick={() => void updateStatus(invoice, 'issued')}>Marquer émise</button>}{invoice.status === 'issued' && <button className="primary-button compact-button" onClick={() => void updateStatus(invoice, 'paid')}>Marquer payée</button>}</div></article>)}</div>}
    </section>
  </div>;
}
