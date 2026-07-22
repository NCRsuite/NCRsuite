import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import {
  formatSecurityDate,
  formatSecurityDuration,
  formatSecurityMoney,
  monthRange,
  securityPersonName,
  securityShiftMinutes,
  type SecurityClientRecord,
  type SecurityDocumentEmailLogRecord,
  type SecurityInvoiceLineRecord,
  type SecurityInvoiceRecord,
  type SecurityInvoiceShiftItemRecord,
  type SecurityShiftRecord,
  type SecuritySiteRecord
} from '../features/security/types';
import { generateSecurityInvoicePdf } from '../features/security/invoicePdf';
import { sendSecurityDocumentEmail } from '../features/security/documentEmail';
import { prepareFileWindow, showBlobDownload, closeFileWindow } from '../lib/browserFiles';
import { supabase } from '../lib/supabase';
import { readJsonStorage } from '../lib/safeStorage';

type BillingMode = 'proforma' | 'invoice';
type PreviewLine = { siteId: string; siteName: string; minutes: number; hourlyRateCents: number; lineTotalCents: number; shiftCount?: number };
type PreviewProformaRpcRow = { site_id: string; site_name: string; scheduled_minutes: number; hourly_rate_cents: number; line_total_cents: number };
type PreviewFinalRpcRow = { site_id: string; site_name: string; completed_shift_count: number; actual_minutes: number; hourly_rate_cents: number; line_total_cents: number };
type CompletedShift = SecurityShiftRecord & { security_sites?: { id?: string; client_id?: string; name: string; hourly_rate_cents: number; color_hex?: string | null; city: string | null; security_clients?: { company_name: string } | null } | null };

const invoiceSelect = 'id,organization_id,client_id,invoice_number,period_start,period_end,document_kind,source_mode,status,subtotal_cents,tax_rate_basis_points,tax_cents,total_cents,notes,issued_at,sent_at,paid_at,canceled_at,due_date,issuer_snapshot,client_snapshot,created_at,security_clients!security_invoices_client_fk(id,organization_id,company_name,contact_name,email,phone,billing_address,postal_code,city,siret,vat_number,payment_terms_days,notes,status,created_at),security_invoice_lines(id,organization_id,invoice_id,site_id,description,scheduled_minutes,billed_minutes,shift_count,hourly_rate_cents,line_total_cents,security_sites!security_invoice_lines_site_fk(name)),security_invoice_shift_items(id,organization_id,invoice_id,shift_id,site_id,agent_id,service_date,starts_at,ends_at,actual_minutes,hourly_rate_cents,line_total_cents,description,security_sites!security_invoice_shift_items_site_fk(name),security_agents!security_invoice_shift_items_agent_fk(first_name,last_name))';

function statusLabel(status: SecurityInvoiceRecord['status']) {
  const labels: Record<SecurityInvoiceRecord['status'], string> = { draft: 'Brouillon', issued: 'Émise', sent: 'Envoyée', paid: 'Payée', overdue: 'En retard', canceled: 'Annulée' };
  return labels[status];
}

function billingErrorMessage(caught: unknown) {
  const message = caught instanceof Error ? caught.message : typeof caught === 'object' && caught !== null && 'message' in caught ? String((caught as { message?: unknown }).message || '') : typeof caught === 'string' ? caught : '';
  const details = typeof caught === 'object' && caught !== null && 'details' in caught ? String((caught as { details?: unknown }).details || '') : '';
  return [message, details].filter(Boolean).join(' — ') || 'erreur inconnue';
}

export function SecurityBillingPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const defaultRange = useMemo(() => monthRange(), []);
  const [mode, setMode] = useState<BillingMode>('proforma');
  const [clients, setClients] = useState<SecurityClientRecord[]>([]);
  const [demoSites, setDemoSites] = useState<SecuritySiteRecord[]>([]);
  const [demoShifts, setDemoShifts] = useState<SecurityShiftRecord[]>([]);
  const [invoices, setInvoices] = useState<SecurityInvoiceRecord[]>([]);
  const [preview, setPreview] = useState<PreviewLine[]>([]);
  const [completedShifts, setCompletedShifts] = useState<CompletedShift[]>([]);
  const [actualMinutes, setActualMinutes] = useState<Record<string, string>>({});
  const [billingReasons, setBillingReasons] = useState<Record<string, string>>({});
  const [clientId, setClientId] = useState('');
  const [periodStart, setPeriodStart] = useState(defaultRange.start);
  const [periodEnd, setPeriodEnd] = useState(defaultRange.end);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingShiftId, setSavingShiftId] = useState('');
  const [exportingId, setExportingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewNonce, setPreviewNonce] = useState(0);
  const [emailLogs, setEmailLogs] = useState<SecurityDocumentEmailLogRecord[]>([]);
  const [emailInvoice, setEmailInvoice] = useState<SecurityInvoiceRecord | null>(null);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [copySender, setCopySender] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  async function readInvoices(organizationId: string) {
    if (!supabase) return [];
    const { data, error: readError } = await supabase.from('security_invoices').select(invoiceSelect).eq('organization_id', organizationId).order('created_at', { ascending: false });
    if (readError) throw readError;
    return (data ?? []) as unknown as SecurityInvoiceRecord[];
  }

  async function readEmailLogs(organizationId: string) {
    if (!supabase) return [];
    const { data, error: readError } = await supabase.from('security_document_email_logs').select('id,organization_id,document_kind,document_id,recipient_email,recipient_name,subject,message,status,provider_message_id,last_error,sent_at,created_at').eq('organization_id', organizationId).eq('document_kind', 'invoice').order('created_at', { ascending: false });
    if (readError) throw readError;
    return (data ?? []) as SecurityDocumentEmailLogRecord[];
  }

  useEffect(() => {
    if (!organization) return;
    const organizationId = organization.id;
    let active = true;
    async function load() {
      setLoading(true); setError('');
      try {
        if (demoMode || !supabase) {
          const clientRows = readJsonStorage<SecurityClientRecord[]>(`ncr-suite-security-clients-${organizationId}`, []);
          const siteRows = readJsonStorage<SecuritySiteRecord[]>(`ncr-suite-security-sites-${organizationId}`, []);
          const shiftRows = readJsonStorage<SecurityShiftRecord[]>(`ncr-suite-security-shifts-${organizationId}`, []);
          const invoiceRows = readJsonStorage<SecurityInvoiceRecord[]>(`ncr-suite-security-invoices-${organizationId}`, []);
          if (active) {
            const activeClients = clientRows.filter((row) => row.status === 'active');
            setClients(activeClients); setDemoSites(siteRows.filter((row) => row.status === 'active')); setDemoShifts(shiftRows); setInvoices(invoiceRows);
            setClientId((current) => current || activeClients[0]?.id || '');
          }
          return;
        }
        const [clientResult, invoiceRows, emailRows] = await Promise.all([
          supabase.from('security_clients').select('id,organization_id,company_name,contact_name,email,phone,billing_address,postal_code,city,siret,vat_number,payment_terms_days,notes,status,created_at').eq('organization_id', organizationId).eq('status', 'active').order('company_name'),
          readInvoices(organizationId),
          readEmailLogs(organizationId)
        ]);
        if (clientResult.error) throw clientResult.error;
        if (!active) return;
        const clientRows = (clientResult.data ?? []) as SecurityClientRecord[];
        setClients(clientRows); setInvoices(invoiceRows); setEmailLogs(emailRows); setClientId((current) => current || clientRows[0]?.id || '');
      } catch (caught) { if (active) setError(`Chargement impossible : ${billingErrorMessage(caught)}`); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [organization?.id, demoMode]);

  useEffect(() => {
    if (!organization || !clientId || !periodStart || !periodEnd) { setPreview([]); setCompletedShifts([]); return; }
    let active = true;
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true); setError('');
      try {
        if (demoMode || !supabase) {
          const start = new Date(`${periodStart}T00:00:00`); const end = new Date(`${periodEnd}T23:59:59.999`);
          const relevantSites = demoSites.filter((site) => site.client_id === clientId);
          const shifts = demoShifts.filter((shift) => relevantSites.some((site) => site.id === shift.site_id) && new Date(shift.starts_at) >= start && new Date(shift.starts_at) <= end && shift.status !== 'canceled');
          const completed = shifts.filter((shift) => shift.status === 'completed' && !shift.final_invoice_id) as CompletedShift[];
          const lines = relevantSites.map((site) => {
            const rows = shifts.filter((shift) => shift.site_id === site.id && (mode === 'proforma' || shift.status === 'completed'));
            const minutes = rows.reduce((sum, shift) => sum + (mode === 'invoice' ? (shift.billing_minutes_override ?? securityShiftMinutes(shift)) : securityShiftMinutes(shift)), 0);
            return { siteId: site.id, siteName: site.name, minutes, hourlyRateCents: site.hourly_rate_cents, lineTotalCents: Math.round((minutes / 60) * site.hourly_rate_cents), shiftCount: rows.length };
          });
          if (active) { setPreview(lines); setCompletedShifts(completed); }
          return;
        }

        const rpcName = mode === 'invoice' ? 'preview_security_final_invoice' : 'preview_security_invoice';
        const [previewResult, shiftResult] = await Promise.all([
          supabase.rpc(rpcName, { p_organization_id: organization.id, p_client_id: clientId, p_period_start: periodStart, p_period_end: periodEnd }),
          mode === 'invoice'
            ? supabase.from('security_shifts').select('id,organization_id,site_id,agent_id,title,starts_at,ends_at,break_minutes,status,notes,actual_minutes,actual_validation_note,billing_minutes_override,billing_override_reason,billing_override_at,completed_at,completed_by,final_invoice_id,clocked_in_at,clocked_out_at,logbook_status,created_at,security_sites!security_shifts_site_fk(id,client_id,name,hourly_rate_cents,color_hex,city,security_clients(company_name)),security_agents!security_shifts_agent_fk(first_name,last_name)').eq('organization_id', organization.id).eq('status', 'completed').is('final_invoice_id', null).lte('ends_at', new Date().toISOString()).gte('starts_at', `${periodStart}T00:00:00`).lt('starts_at', `${periodEnd}T23:59:59.999`).order('starts_at')
            : Promise.resolve({ data: [], error: null })
        ]);
        if (previewResult.error) throw previewResult.error;
        if (shiftResult.error) throw shiftResult.error;
        const lines = mode === 'invoice'
          ? ((previewResult.data ?? []) as PreviewFinalRpcRow[]).map((row) => ({ siteId: row.site_id, siteName: row.site_name, minutes: Number(row.actual_minutes) || 0, hourlyRateCents: Number(row.hourly_rate_cents) || 0, lineTotalCents: Number(row.line_total_cents) || 0, shiftCount: Number(row.completed_shift_count) || 0 }))
          : ((previewResult.data ?? []) as PreviewProformaRpcRow[]).map((row) => ({ siteId: row.site_id, siteName: row.site_name, minutes: Number(row.scheduled_minutes) || 0, hourlyRateCents: Number(row.hourly_rate_cents) || 0, lineTotalCents: Number(row.line_total_cents) || 0 }));
        const shifts = ((shiftResult.data ?? []) as unknown as CompletedShift[]).filter((shift) => shift.security_sites?.client_id === clientId);
        if (active) {
          setPreview(lines); setCompletedShifts(shifts);
          setActualMinutes(Object.fromEntries(shifts.map((shift) => [shift.id, String(shift.billing_minutes_override ?? securityShiftMinutes(shift))])));
          setBillingReasons(Object.fromEntries(shifts.map((shift) => [shift.id, shift.billing_override_reason ?? ''])));
        }
      } catch (caught) { if (active) { setPreview([]); setCompletedShifts([]); setError(`Calcul impossible : ${billingErrorMessage(caught)}`); } }
      finally { if (active) setPreviewLoading(false); }
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [organization?.id, clientId, periodStart, periodEnd, mode, demoMode, demoSites, demoShifts, previewNonce]);

  const billablePreview = preview.filter((line) => line.minutes > 0);
  const previewTotal = billablePreview.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const previewMinutes = billablePreview.reduce((sum, line) => sum + line.minutes, 0);
  const proformas = invoices.filter((invoice) => (invoice.document_kind ?? 'proforma') === 'proforma');
  const finalInvoices = invoices.filter((invoice) => invoice.document_kind === 'invoice');
  const existingProforma = proformas.find((invoice) => invoice.client_id === clientId && invoice.period_start === periodStart && invoice.period_end === periodEnd && invoice.status !== 'canceled');
  const billingProfileReady = Boolean(organization?.security_billing_address && organization?.security_billing_siret);

  async function refreshInvoices() {
    if (!organization || demoMode || !supabase) return;
    const [invoiceRows, emailRows] = await Promise.all([readInvoices(organization.id), readEmailLogs(organization.id)]);
    setInvoices(invoiceRows);
    setEmailLogs(emailRows);
  }

  async function saveActual(shift: CompletedShift) {
    if (!organization) return;
    const minutes = Number(actualMinutes[shift.id]);
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 2880) { setError('La durée facturée doit être exprimée en minutes valides.'); return; }
    const planned = securityShiftMinutes(shift);
    const reason = (billingReasons[shift.id] ?? '').trim();
    if (minutes !== planned && !reason) { setError('Indique le motif de la modification des heures planifiées.'); return; }
    setSavingShiftId(shift.id); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const all = demoShifts.map((row) => row.id === shift.id ? { ...row, billing_minutes_override: minutes === planned ? null : minutes, billing_override_reason: minutes === planned ? null : reason } : row);
        localStorage.setItem(`ncr-suite-security-shifts-${organization.id}`, JSON.stringify(all)); setDemoShifts(all);
      } else {
        const { error: rpcError } = await supabase.rpc('set_security_shift_billing_override', { p_organization_id: organization.id, p_shift_id: shift.id, p_minutes: minutes, p_reason: reason || null });
        if (rpcError) throw rpcError;
      }
      setSuccess(minutes === planned ? 'La facturation reprend les heures planifiées.' : 'La correction des heures facturées a été enregistrée.'); setPreviewNonce((value) => value + 1);
    } catch (caught) { setError(`Validation impossible : ${billingErrorMessage(caught)}`); }
    finally { setSavingShiftId(''); }
  }

  async function generateDocument(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !clientId) return;
    if (!billablePreview.length) { setError(mode === 'invoice' ? 'Aucune vacation réalisée et non facturée sur cette période.' : 'Aucune heure programmée facturable sur cette période.'); return; }
    if (mode === 'invoice' && !billingProfileReady) { setError('Complète d’abord l’adresse et le SIRET dans Personnalisation.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) throw new Error('La facture définitive nécessite Supabase dans ce mode de démonstration.');
      const rpcName = mode === 'invoice' ? 'generate_security_final_invoice' : 'generate_security_invoice';
      const { data: invoiceId, error: rpcError } = await supabase.rpc(rpcName, { p_organization_id: organization.id, p_client_id: clientId, p_period_start: periodStart, p_period_end: periodEnd, p_notes: notes.trim() || null });
      if (rpcError) throw rpcError;
      await refreshInvoices();
      setNotes(''); setPreviewNonce((value) => value + 1);
      setSuccess(mode === 'invoice' ? `La facture définitive a été émise (${String(invoiceId).slice(0, 8)}…).` : `${existingProforma?.status === 'draft' ? 'Le brouillon a été recalculé' : 'La préfacture a été générée'}.`);
    } catch (caught) { setError(`Génération impossible : ${billingErrorMessage(caught)}`); }
    finally { setSaving(false); }
  }

  async function updateStatus(invoice: SecurityInvoiceRecord, status: SecurityInvoiceRecord['status']) {
    if (!organization) return;
    setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) throw new Error('Cette action nécessite Supabase.');
      const { error: updateError } = await supabase.rpc('set_security_invoice_status', { p_organization_id: organization.id, p_invoice_id: invoice.id, p_status: status });
      if (updateError) throw updateError;
      await refreshInvoices();
      setSuccess(`Statut mis à jour : ${statusLabel(status)}.`);
    } catch (caught) { setError(`Mise à jour impossible : ${billingErrorMessage(caught)}`); }
  }

  async function deleteProforma(invoice: SecurityInvoiceRecord) {
    if (!organization || !supabase || invoice.status !== 'draft' || invoice.document_kind === 'invoice') return;
    if (!window.confirm(`Supprimer définitivement la préfacture ${invoice.invoice_number} ?`)) return;
    setDeletingId(invoice.id); setError(''); setSuccess('');
    try {
      const { error: rpcError } = await supabase.rpc('delete_security_proforma', { p_organization_id: organization.id, p_invoice_id: invoice.id });
      if (rpcError) throw rpcError;
      await refreshInvoices();
      setSuccess(`La préfacture ${invoice.invoice_number} a été supprimée.`);
    } catch (caught) { setError(`Suppression impossible : ${billingErrorMessage(caught)}`); }
    finally { setDeletingId(''); }
  }

  function openInvoiceEmail(invoice: SecurityInvoiceRecord) {
    if (invoice.document_kind !== 'invoice') return;
    const client = invoice.security_clients;
    const company = client?.company_name || invoice.client_snapshot?.company_name || 'Client';
    setEmailInvoice(invoice);
    setEmailRecipient(client?.email || invoice.client_snapshot?.email || '');
    setEmailSubject(`Facture ${invoice.invoice_number} — ${organization?.public_name || organization?.name || 'NCR Suite'}`);
    setEmailBody(`Bonjour${client?.contact_name ? ` ${client.contact_name}` : ''},

Veuillez trouver en pièce jointe la facture ${invoice.invoice_number}, d’un montant de ${formatSecurityMoney(invoice.total_cents)} TTC.

Échéance : ${invoice.due_date ? formatSecurityDate(invoice.due_date) : 'selon les conditions indiquées sur la facture'}.

Cordialement,
${organization?.public_name || organization?.name || ''}`);
    setCopySender(true); setError('');
  }

  async function sendInvoiceEmail(event: FormEvent) {
    event.preventDefault();
    if (!organization || !emailInvoice) return;
    setSendingEmail(true); setError(''); setSuccess('');
    try {
      const result = await generateSecurityInvoicePdf(organization, emailInvoice);
      await sendSecurityDocumentEmail({
        organizationId: organization.id,
        documentKind: 'invoice',
        documentId: emailInvoice.id,
        recipientEmail: emailRecipient,
        recipientName: emailInvoice.security_clients?.contact_name || emailInvoice.client_snapshot?.contact_name || null,
        subject: emailSubject,
        message: emailBody,
        filename: result.filename,
        blob: result.blob,
        copySender
      });
      const sentNumber = emailInvoice.invoice_number;
      setEmailInvoice(null);
      await refreshInvoices();
      setSuccess(`La facture ${sentNumber} a été envoyée au client.`);
    } catch (caught) { setError(`Envoi impossible : ${billingErrorMessage(caught)}`); }
    finally { setSendingEmail(false); }
  }

  async function download(invoice: SecurityInvoiceRecord) {
    if (!organization) return;
    const final = invoice.document_kind === 'invoice';
    const target = prepareFileWindow('Préparation du PDF', final ? 'La facture est en cours de génération.' : 'La préfacture est en cours de génération.');
    setExportingId(invoice.id); setError('');
    try {
      const result = await generateSecurityInvoicePdf(organization, invoice);
      const url = URL.createObjectURL(result.blob);
      showBlobDownload(target, url, result.filename, final ? 'Facture prête' : 'Préfacture prête');
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } catch (caught) { closeFileWindow(target); setError(`PDF impossible : ${billingErrorMessage(caught)}`); }
    finally { setExportingId(''); }
  }

  if (!organization) return null;
  const history = mode === 'invoice' ? finalInvoices : proformas;
  return <div className="page security-page security-billing-page">
    <header className="page-header"><div><p className="eyebrow">SÉCURITÉ PRIVÉE</p><h1>Facturation clients</h1><p>Prépare les montants depuis le planning puis émets une facture définitive depuis les vacations réalisées.</p></div></header>
    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}

    <div className="security-billing-tabs"><button className={mode === 'proforma' ? 'active' : ''} onClick={() => setMode('proforma')}>Préfactures</button><button className={mode === 'invoice' ? 'active' : ''} onClick={() => setMode('invoice')}>Factures définitives</button></div>

    {mode === 'invoice' && !billingProfileReady && <div className="security-callout"><Icon name="alert" size={20}/><div><strong>Profil de facturation à compléter</strong><span>Renseigne au minimum l’adresse et le SIRET dans Personnalisation avant la première facture.</span></div><Link className="secondary-button compact-button" to="/personnalisation">Configurer</Link></div>}

    {emailInvoice && <section className="panel security-email-panel"><div className="panel-header"><div><p className="eyebrow">ENVOI PAR E-MAIL</p><h2>{emailInvoice.invoice_number}</h2></div><button className="secondary-button compact-button" type="button" onClick={() => setEmailInvoice(null)}>Fermer</button></div><form className="security-form-grid" onSubmit={sendInvoiceEmail}><label className="full-field">Destinataire *<input required type="email" value={emailRecipient} onChange={(e) => setEmailRecipient(e.target.value)}/></label><label className="full-field">Objet *<input required value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)}/></label><label className="full-field">Message *<textarea required rows={7} value={emailBody} onChange={(e) => setEmailBody(e.target.value)}/></label><label className="full-field checkbox-label"><input type="checkbox" checked={copySender} onChange={(e) => setCopySender(e.target.checked)}/><span>Recevoir une copie sur l’e-mail de l’entreprise</span></label><div className="form-actions full-field"><button className="primary-button" disabled={sendingEmail}>{sendingEmail ? 'Envoi…' : 'Envoyer la facture PDF'}</button></div></form></section>}

    <section className="security-billing-grid"><article className="panel security-billing-builder"><div className="panel-header"><div><p className="eyebrow">{mode === 'invoice' ? 'NOUVELLE FACTURE' : 'NOUVELLE PRÉFACTURE'}</p><h2>{mode === 'invoice' ? 'Vacations terminées' : 'Heures programmées'}</h2><p>{mode === 'invoice' ? 'Les heures planifiées sont facturées par défaut. Une correction motivée reste possible avant émission.' : 'Le calcul reprend les heures programmées et le tarif de chaque site.'}</p></div></div>
      <form className="security-form-grid" onSubmit={generateDocument}><label>Client *<select required value={clientId} onChange={(e) => setClientId(e.target.value)}><option value="">Sélectionner</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.company_name}</option>)}</select></label><span/>
        <label>Du<input type="date" required value={periodStart} onChange={(e) => setPeriodStart(e.target.value)}/></label><label>Au<input type="date" required value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)}/></label><label className="full-field">Note{mode === 'proforma' ? ' interne' : ''}<textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}/></label>
        <div className="full-field security-preview"><div><span>{mode === 'invoice' ? 'Heures facturées' : 'Heures programmées'}</span><strong>{previewLoading ? 'Calcul…' : formatSecurityDuration(previewMinutes)}</strong></div><div><span>Sites</span><strong>{previewLoading ? '—' : billablePreview.length}</strong></div><div><span>{mode === 'invoice' ? 'Total HT' : 'Total prévisionnel HT'}</span><strong>{previewLoading ? 'Calcul…' : formatSecurityMoney(previewTotal)}</strong></div></div>
        {preview.length > 0 && <div className="full-field security-preview-lines">{preview.map((line) => <div key={line.siteId} className={line.minutes > 0 ? '' : 'not-billable'}><span><strong>{line.siteName}</strong><small>{line.minutes > 0 ? `${line.shiftCount ? `${line.shiftCount} vacation(s) · ` : ''}${formatSecurityDuration(line.minutes)} × ${formatSecurityMoney(line.hourlyRateCents)}/h` : `Aucune mission ${mode === 'invoice' ? 'terminée' : 'programmée'} sur la période`}</small></span><b>{line.minutes > 0 ? formatSecurityMoney(line.lineTotalCents) : 'Non facturé'}</b></div>)}</div>}
        {mode === 'invoice' && completedShifts.length > 0 && <div className="full-field security-completed-shifts"><div className="security-completed-heading"><strong>Heures facturées par vacation</strong><span>La durée planifiée est appliquée automatiquement. Ne la modifie qu’en cas d’écart validé.</span></div>{completedShifts.map((shift) => { const planned = securityShiftMinutes(shift); const entered = Number(actualMinutes[shift.id] ?? planned); const changed = entered !== planned; return <div key={shift.id} className={changed ? 'billing-overridden' : ''}><span><strong>{shift.security_sites?.name || 'Site'} · {formatSecurityDate(shift.starts_at)}</strong><small>{shift.security_agents ? securityPersonName(shift.security_agents.first_name, shift.security_agents.last_name) : 'Agent'} · planning {formatSecurityDuration(planned)}{changed ? ` · correction ${formatSecurityDuration(entered)}` : ' · facturation automatique'}</small></span><label><input aria-label="Minutes facturées" type="number" min="0" max="2880" value={actualMinutes[shift.id] ?? ''} onChange={(e) => setActualMinutes((current) => ({ ...current, [shift.id]: e.target.value }))}/><small>min</small></label>{changed && <label className="security-billing-reason"><input required placeholder="Motif obligatoire" value={billingReasons[shift.id] ?? ''} onChange={(e) => setBillingReasons((current) => ({ ...current, [shift.id]: e.target.value }))}/></label>}<button type="button" className="secondary-button compact-button" disabled={savingShiftId === shift.id} onClick={() => void saveActual(shift)}>{savingShiftId === shift.id ? 'Enregistrement…' : changed ? 'Appliquer la correction' : 'Confirmer le planning'}</button></div>; })}</div>}
        {mode === 'proforma' && existingProforma && <div className={`full-field security-billing-existing ${existingProforma.status}`}><Icon name="file" size={18}/><div><strong>{existingProforma.invoice_number} existe déjà</strong><span>{existingProforma.status === 'draft' ? 'Le bouton recalculera ce brouillon avec le planning actuel.' : `Cette préfacture est ${statusLabel(existingProforma.status).toLowerCase()} et ne peut plus être remplacée.`}</span></div></div>}
        <div className="form-actions full-field"><button className="secondary-button" type="button" disabled={previewLoading} onClick={() => setPreviewNonce((value) => value + 1)}>Actualiser</button><button className="primary-button" disabled={saving || previewLoading || !billablePreview.length || (mode === 'invoice' && !billingProfileReady) || Boolean(mode === 'proforma' && existingProforma && existingProforma.status !== 'draft')}>{saving ? 'Génération…' : mode === 'invoice' ? 'Émettre la facture' : existingProforma?.status === 'draft' ? 'Recalculer le brouillon' : 'Générer la préfacture'}</button></div>
      </form></article>
      <aside className="panel security-billing-rule"><span><Icon name={mode === 'invoice' ? 'check' : 'shield'} size={24}/></span><p className="eyebrow">{mode === 'invoice' ? 'FACTURE DÉFINITIVE' : 'RÈGLE DÉCOUVERTE'}</p><h2>{mode === 'invoice' ? 'Planning facturé' : 'Calcul prévisionnel'}</h2><p>{mode === 'invoice' ? 'Une facture numérotée reprend les heures planifiées des vacations terminées. Seule une correction explicite et motivée peut modifier ce volume.' : 'Pour chaque site : heures programmées × tarif horaire du site.'}</p>{mode === 'invoice' && <p><strong>TVA configurée : {organization.security_default_vat_rate ?? 20} %</strong><br/>Échéance : {organization.security_payment_terms_days ?? 30} jours.</p>}</aside>
    </section>

    <section className="panel security-list-panel"><div className="panel-header"><div><p className="eyebrow">HISTORIQUE</p><h2>{history.length} {mode === 'invoice' ? 'facture' : 'préfacture'}{history.length > 1 ? 's' : ''}</h2></div></div>
      {loading ? <div className="security-empty">Chargement…</div> : history.length === 0 ? <div className="security-empty"><Icon name="creditCard" size={30}/><strong>Aucun document</strong><span>{mode === 'invoice' ? 'Marque les vacations comme réalisées pour émettre la première facture.' : 'Sélectionne un client et une période.'}</span></div> : <div className="security-invoice-list">{history.map((invoice) => <article key={invoice.id} className={`security-invoice-card ${invoice.document_kind || 'proforma'}`}><div className="security-invoice-number"><span><Icon name="file" size={19}/></span><div><strong>{invoice.invoice_number}</strong><small>{invoice.security_clients?.company_name || invoice.client_snapshot?.company_name || 'Client'} · du {formatSecurityDate(invoice.period_start)} au {formatSecurityDate(invoice.period_end)}</small>{invoice.document_kind === 'invoice' && (() => { const log = emailLogs.find((row) => row.document_id === invoice.id); return log ? <em className={`security-email-state ${log.status}`}>{log.status === 'sent' ? `E-mail envoyé le ${formatSecurityDate(log.sent_at || log.created_at, { dateStyle: 'short', timeStyle: 'short' })}` : log.status === 'failed' ? 'Dernier envoi en échec' : 'Envoi en cours'}</em> : null; })()}</div></div><div className="security-invoice-total"><strong>{formatSecurityMoney(invoice.total_cents)}</strong><small>{invoice.document_kind === 'invoice' ? 'TTC' : 'HT'}</small></div><span className={`security-status-pill ${invoice.status}`}>{statusLabel(invoice.status)}</span><div className="security-record-actions"><button className="secondary-button compact-button" disabled={exportingId === invoice.id} onClick={() => void download(invoice)}>{exportingId === invoice.id ? 'PDF…' : 'Télécharger'}</button>{invoice.document_kind === 'invoice' ? <><button className="primary-button compact-button" onClick={() => openInvoiceEmail(invoice)}>{emailLogs.some((log) => log.document_id === invoice.id && log.status === 'sent') ? 'Renvoyer par e-mail' : 'Envoyer par e-mail'}</button>{['issued','sent','overdue'].includes(invoice.status) && <button className="secondary-button compact-button" onClick={() => void updateStatus(invoice, 'paid')}>Marquer payée</button>}</> : <>{invoice.status === 'draft' && <button className="secondary-button compact-button" onClick={() => void updateStatus(invoice, 'issued')}>Marquer émise</button>}{invoice.status === 'issued' && <button className="primary-button compact-button" onClick={() => void updateStatus(invoice, 'paid')}>Marquer payée</button>}{invoice.status === 'draft' && <button className="danger-text-button" disabled={deletingId === invoice.id} onClick={() => void deleteProforma(invoice)}>{deletingId === invoice.id ? 'Suppression…' : 'Supprimer'}</button>}</>}</div></article>)}</div>}
    </section>
  </div>;
}
