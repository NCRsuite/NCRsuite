import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import { generateSecurityQuotePdf } from '../features/security/quotePdf';
import { sendSecurityDocumentEmail } from '../features/security/documentEmail';
import {
  formatSecurityDate,
  formatSecurityMoney,
  type SecurityDocumentEmailLogRecord,
  type SecurityQuoteLineRecord,
  type SecurityQuoteRecord,
  type SecurityQuoteStatus
} from '../features/security/types';
import { closeFileWindow, prepareFileWindow, showBlobDownload } from '../lib/browserFiles';
import { supabase } from '../lib/supabase';

type EditableLine = { id: string; label: string; description: string; quantity: string; unit: SecurityQuoteLineRecord['unit']; unitPriceEuros: string };
type QuoteForm = {
  id: string | null;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  billingAddress: string;
  postalCode: string;
  city: string;
  siret: string;
  vatNumber: string;
  siteName: string;
  siteAddress: string;
  hourlyRateEuros: string;
  validUntil: string;
  notes: string;
  lines: EditableLine[];
};

function dateInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function newLine(): EditableLine {
  return { id: crypto.randomUUID(), label: 'Prestation de sécurité', description: '', quantity: '1', unit: 'forfait', unitPriceEuros: '0' };
}

function emptyForm(validityDays: number): QuoteForm {
  const until = new Date();
  until.setDate(until.getDate() + validityDays);
  return {
    id: null, companyName: '', contactName: '', email: '', phone: '', billingAddress: '', postalCode: '', city: '', siret: '', vatNumber: '',
    siteName: '', siteAddress: '', hourlyRateEuros: '', validUntil: dateInput(until), notes: '', lines: [newLine()]
  };
}

function statusLabel(status: SecurityQuoteStatus) {
  const labels: Record<SecurityQuoteStatus, string> = { draft: 'Brouillon', sent: 'Envoyé', accepted: 'Accepté', refused: 'Refusé', expired: 'Expiré', canceled: 'Annulé' };
  return labels[status];
}

function errorMessage(caught: unknown) {
  if (caught instanceof Error && caught.message) return caught.message;
  if (caught && typeof caught === 'object' && 'message' in caught) return String((caught as { message?: unknown }).message || 'erreur inconnue');
  return String(caught || 'erreur inconnue');
}

const quoteSelect = 'id,organization_id,quote_number,status,prospect_company_name,prospect_contact_name,prospect_email,prospect_phone,prospect_billing_address,prospect_postal_code,prospect_city,prospect_siret,prospect_vat_number,proposed_site_name,proposed_site_address,proposed_hourly_rate_cents,valid_until,notes,subtotal_cents,tax_rate_basis_points,tax_cents,total_cents,issuer_snapshot,prospect_snapshot,sent_at,accepted_at,refused_at,canceled_at,converted_client_id,converted_site_id,created_at,updated_at,security_quote_lines(id,organization_id,quote_id,position,label,description,quantity,unit,unit_price_cents,line_total_cents,created_at)';

export function SecurityQuotesPage() {
  const { organization } = useOrganization();
  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const canConvert = ['owner', 'admin'].includes(organization?.role ?? 'viewer');
  const [quotes, setQuotes] = useState<SecurityQuoteRecord[]>([]);
  const [emailLogs, setEmailLogs] = useState<SecurityDocumentEmailLogRecord[]>([]);
  const [form, setForm] = useState<QuoteForm>(() => emptyForm(30));
  const [formOpen, setFormOpen] = useState(false);
  const [emailQuote, setEmailQuote] = useState<SecurityQuoteRecord | null>(null);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [copySender, setCopySender] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [exportingId, setExportingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    if (!organization || !supabase) return;
    setLoading(true); setError('');
    try {
      const [quoteResult, logResult] = await Promise.all([
        supabase.from('security_quotes').select(quoteSelect).eq('organization_id', organization.id).order('created_at', { ascending: false }),
        supabase.from('security_document_email_logs').select('id,organization_id,document_kind,document_id,recipient_email,recipient_name,subject,message,status,provider_message_id,last_error,sent_at,created_at').eq('organization_id', organization.id).eq('document_kind', 'quote').order('created_at', { ascending: false })
      ]);
      if (quoteResult.error) throw quoteResult.error;
      if (logResult.error) throw logResult.error;
      const rows = (quoteResult.data ?? []) as unknown as SecurityQuoteRecord[];
      rows.forEach((quote) => quote.security_quote_lines?.sort((a, b) => a.position - b.position));
      setQuotes(rows);
      setEmailLogs((logResult.data ?? []) as SecurityDocumentEmailLogRecord[]);
    } catch (caught) { setError(`Chargement impossible : ${errorMessage(caught)}`); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [organization?.id]);

  const formSubtotal = useMemo(() => form.lines.reduce((sum, line) => {
    const quantity = Number(line.quantity) || 0;
    const cents = Math.round((Number(line.unitPriceEuros.replace(',', '.')) || 0) * 100);
    return sum + Math.round(quantity * cents);
  }, 0), [form.lines]);
  const formTax = Math.round(formSubtotal * (organization?.security_default_vat_rate ?? 20) / 100);

  function openNew() {
    setForm(emptyForm(organization?.security_quote_validity_days ?? 30));
    setFormOpen(true); setError(''); setSuccess('');
  }

  function openEdit(quote: SecurityQuoteRecord) {
    setForm({
      id: quote.id,
      companyName: quote.prospect_company_name,
      contactName: quote.prospect_contact_name || '',
      email: quote.prospect_email || '',
      phone: quote.prospect_phone || '',
      billingAddress: quote.prospect_billing_address || '',
      postalCode: quote.prospect_postal_code || '',
      city: quote.prospect_city || '',
      siret: quote.prospect_siret || '',
      vatNumber: quote.prospect_vat_number || '',
      siteName: quote.proposed_site_name || '',
      siteAddress: quote.proposed_site_address || '',
      hourlyRateEuros: quote.proposed_hourly_rate_cents == null ? '' : String(quote.proposed_hourly_rate_cents / 100).replace('.', ','),
      validUntil: quote.valid_until,
      notes: quote.notes || '',
      lines: (quote.security_quote_lines ?? []).map((line) => ({ id: line.id, label: line.label, description: line.description || '', quantity: String(line.quantity), unit: line.unit, unitPriceEuros: String(line.unit_price_cents / 100).replace('.', ',') }))
    });
    setFormOpen(true); setError(''); setSuccess('');
  }

  function updateLine(id: string, updates: Partial<EditableLine>) {
    setForm((current) => ({ ...current, lines: current.lines.map((line) => line.id === id ? { ...line, ...updates } : line) }));
  }

  async function saveQuote(event: FormEvent) {
    event.preventDefault();
    if (!organization || !supabase || !canManage) return;
    if (!form.lines.length) { setError('Ajoute au moins une ligne au devis.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const lines = form.lines.map((line) => ({
        label: line.label.trim(),
        description: line.description.trim() || null,
        quantity: Number(line.quantity.replace(',', '.')) || 0,
        unit: line.unit,
        unit_price_cents: Math.round((Number(line.unitPriceEuros.replace(',', '.')) || 0) * 100)
      }));
      const { error: rpcError } = await supabase.rpc('save_security_quote', {
        p_organization_id: organization.id,
        p_quote_id: form.id,
        p_company_name: form.companyName,
        p_contact_name: form.contactName,
        p_email: form.email,
        p_phone: form.phone,
        p_billing_address: form.billingAddress,
        p_postal_code: form.postalCode,
        p_city: form.city,
        p_siret: form.siret,
        p_vat_number: form.vatNumber,
        p_site_name: form.siteName,
        p_site_address: form.siteAddress,
        p_hourly_rate_cents: form.hourlyRateEuros ? Math.round((Number(form.hourlyRateEuros.replace(',', '.')) || 0) * 100) : null,
        p_valid_until: form.validUntil,
        p_notes: form.notes,
        p_lines: lines
      });
      if (rpcError) throw rpcError;
      setFormOpen(false); setSuccess(form.id ? 'Le devis a été mis à jour.' : 'Le devis a été créé.');
      await load();
    } catch (caught) { setError(`Enregistrement impossible : ${errorMessage(caught)}`); }
    finally { setSaving(false); }
  }

  async function changeStatus(quote: SecurityQuoteRecord, status: SecurityQuoteStatus) {
    if (!organization || !supabase) return;
    setError(''); setSuccess('');
    try {
      const { error: rpcError } = await supabase.rpc('set_security_quote_status', { p_organization_id: organization.id, p_quote_id: quote.id, p_status: status });
      if (rpcError) throw rpcError;
      setSuccess(`Devis ${statusLabel(status).toLowerCase()}.`); await load();
    } catch (caught) { setError(`Mise à jour impossible : ${errorMessage(caught)}`); }
  }

  async function convertQuote(quote: SecurityQuoteRecord) {
    if (!organization || !supabase || !canConvert) return;
    if (!window.confirm(`Créer le client ${quote.prospect_company_name}${quote.proposed_site_name ? ` et le site ${quote.proposed_site_name}` : ''} ?`)) return;
    setError(''); setSuccess('');
    try {
      const { error: rpcError } = await supabase.rpc('convert_security_quote_to_client', { p_organization_id: organization.id, p_quote_id: quote.id });
      if (rpcError) throw rpcError;
      setSuccess('Le devis a été converti en client et en site.'); await load();
    } catch (caught) { setError(`Conversion impossible : ${errorMessage(caught)}`); }
  }

  async function download(quote: SecurityQuoteRecord) {
    if (!organization) return;
    const target = prepareFileWindow('Préparation du devis', 'Le PDF est en cours de génération.');
    setExportingId(quote.id); setError('');
    try {
      const result = await generateSecurityQuotePdf(organization, quote);
      const url = URL.createObjectURL(result.blob);
      showBlobDownload(target, url, result.filename, 'Devis prêt');
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } catch (caught) { closeFileWindow(target); setError(`PDF impossible : ${errorMessage(caught)}`); }
    finally { setExportingId(''); }
  }

  function openEmail(quote: SecurityQuoteRecord) {
    setEmailQuote(quote);
    setEmailRecipient(quote.prospect_email || '');
    setEmailSubject(`Devis ${quote.quote_number} — ${organization?.public_name || organization?.name || 'NCR Suite'}`);
    setEmailBody(`Bonjour${quote.prospect_contact_name ? ` ${quote.prospect_contact_name}` : ''},\n\nVeuillez trouver en pièce jointe notre devis ${quote.quote_number}, valable jusqu’au ${formatSecurityDate(quote.valid_until)}.\n\nNous restons disponibles pour toute question.\n\nCordialement,\n${organization?.public_name || organization?.name || ''}`);
    setCopySender(true); setError('');
  }

  async function sendEmail(event: FormEvent) {
    event.preventDefault();
    if (!organization || !emailQuote) return;
    setSending(true); setError(''); setSuccess('');
    try {
      const result = await generateSecurityQuotePdf(organization, emailQuote);
      await sendSecurityDocumentEmail({
        organizationId: organization.id,
        documentKind: 'quote',
        documentId: emailQuote.id,
        recipientEmail: emailRecipient,
        recipientName: emailQuote.prospect_contact_name,
        subject: emailSubject,
        message: emailBody,
        filename: result.filename,
        blob: result.blob,
        copySender
      });
      setEmailQuote(null); setSuccess(`Le devis ${emailQuote.quote_number} a été envoyé.`); await load();
    } catch (caught) { setError(`Envoi impossible : ${errorMessage(caught)}`); }
    finally { setSending(false); }
  }

  if (!organization) return null;
  return <div className="page security-page security-quotes-page">
    <header className="page-header"><div><p className="eyebrow">SÉCURITÉ PRIVÉE</p><h1>Devis prospects</h1><p>Crée un devis professionnel, envoie son PDF et transforme l’entreprise en client après acceptation.</p></div>{canManage && <button className="primary-button" onClick={openNew}><Icon name="plus" size={18}/>Nouveau devis</button>}</header>
    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}

    {formOpen && <section className="panel security-form-panel security-quote-form-panel"><div className="panel-header"><div><p className="eyebrow">{form.id ? 'MODIFIER LE DEVIS' : 'NOUVEAU DEVIS'}</p><h2>{form.companyName || 'Nouvelle entreprise'}</h2></div><button className="secondary-button compact-button" type="button" onClick={() => setFormOpen(false)}>Fermer</button></div>
      <form className="security-form-grid" onSubmit={saveQuote}>
        <label>Entreprise *<input required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })}/></label><label>Contact<input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })}/></label>
        <label>E-mail<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/></label><label>Téléphone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}/></label>
        <label className="full-field">Adresse de facturation<textarea rows={2} value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}/></label><label>Code postal<input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })}/></label><label>Ville<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}/></label>
        <label>SIRET<input value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })}/></label><label>N° TVA<input value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })}/></label>
        <label>Nom du futur site<input value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })}/></label><label>Tarif horaire proposé (€)<input type="number" min="0" step="0.01" value={form.hourlyRateEuros} onChange={(e) => setForm({ ...form, hourlyRateEuros: e.target.value })}/></label>
        <label className="full-field">Adresse du futur site<input value={form.siteAddress} onChange={(e) => setForm({ ...form, siteAddress: e.target.value })}/></label><label>Valable jusqu’au *<input required type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })}/></label><span/>
        <div className="full-field security-quote-lines"><div className="security-quote-lines-heading"><div><strong>Prestations proposées</strong><span>Ajoute des heures, vacations, journées ou forfaits.</span></div><button className="secondary-button compact-button" type="button" onClick={() => setForm((current) => ({ ...current, lines: [...current.lines, newLine()] }))}>+ Ajouter une ligne</button></div>
          {form.lines.map((line, index) => <div className="security-quote-line-editor" key={line.id}><span className="security-quote-line-position">{index + 1}</span><label>Intitulé<input required value={line.label} onChange={(e) => updateLine(line.id, { label: e.target.value })}/></label><label>Quantité<input required type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => updateLine(line.id, { quantity: e.target.value })}/></label><label>Unité<select value={line.unit} onChange={(e) => updateLine(line.id, { unit: e.target.value as EditableLine['unit'] })}><option value="heure">Heure</option><option value="vacation">Vacation</option><option value="jour">Jour</option><option value="forfait">Forfait</option><option value="unite">Unité</option></select></label><label>Prix unitaire HT (€)<input required type="number" min="0" step="0.01" value={line.unitPriceEuros} onChange={(e) => updateLine(line.id, { unitPriceEuros: e.target.value })}/></label><label className="security-quote-description">Description<input value={line.description} onChange={(e) => updateLine(line.id, { description: e.target.value })}/></label><strong>{formatSecurityMoney(Math.round((Number(line.quantity) || 0) * (Number(line.unitPriceEuros.replace(',', '.')) || 0) * 100))}</strong>{form.lines.length > 1 && <button className="danger-text-button" type="button" onClick={() => setForm((current) => ({ ...current, lines: current.lines.filter((row) => row.id !== line.id) }))}>Supprimer</button>}</div>)}
        </div>
        <label className="full-field">Conditions / notes<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></label>
        <div className="full-field security-quote-form-total"><span>Total HT <strong>{formatSecurityMoney(formSubtotal)}</strong></span><span>TVA <strong>{formatSecurityMoney(formTax)}</strong></span><span>Total TTC <strong>{formatSecurityMoney(formSubtotal + formTax)}</strong></span></div>
        <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={() => setFormOpen(false)}>Annuler</button><button className="primary-button" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le devis'}</button></div>
      </form>
    </section>}

    {emailQuote && <section className="panel security-email-panel"><div className="panel-header"><div><p className="eyebrow">ENVOI PAR E-MAIL</p><h2>{emailQuote.quote_number}</h2></div><button className="secondary-button compact-button" onClick={() => setEmailQuote(null)}>Fermer</button></div><form className="security-form-grid" onSubmit={sendEmail}><label className="full-field">Destinataire *<input required type="email" value={emailRecipient} onChange={(e) => setEmailRecipient(e.target.value)}/></label><label className="full-field">Objet *<input required value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)}/></label><label className="full-field">Message *<textarea required rows={7} value={emailBody} onChange={(e) => setEmailBody(e.target.value)}/></label><label className="full-field checkbox-label"><input type="checkbox" checked={copySender} onChange={(e) => setCopySender(e.target.checked)}/><span>Recevoir une copie sur l’e-mail de l’entreprise</span></label><div className="form-actions full-field"><button className="primary-button" disabled={sending}>{sending ? 'Envoi…' : 'Envoyer le devis PDF'}</button></div></form></section>}

    <section className="panel security-list-panel"><div className="panel-header"><div><p className="eyebrow">HISTORIQUE</p><h2>{quotes.length} devis</h2></div></div>{loading ? <div className="security-empty">Chargement…</div> : quotes.length === 0 ? <div className="security-empty"><Icon name="file" size={30}/><strong>Aucun devis</strong><span>Crée le premier devis pour une nouvelle entreprise.</span></div> : <div className="security-quote-list">{quotes.map((quote) => {
      const logs = emailLogs.filter((log) => log.document_id === quote.id);
      const lastLog = logs[0];
      return <article className="security-quote-card" key={quote.id}><div className="security-invoice-number"><span><Icon name="file" size={19}/></span><div><strong>{quote.quote_number}</strong><small>{quote.prospect_company_name} · valable jusqu’au {formatSecurityDate(quote.valid_until)}</small>{lastLog && <em className={`security-email-state ${lastLog.status}`}>{lastLog.status === 'sent' ? `E-mail envoyé le ${formatSecurityDate(lastLog.sent_at || lastLog.created_at, { dateStyle: 'short', timeStyle: 'short' })}` : lastLog.status === 'failed' ? 'Dernier envoi en échec' : 'Envoi en cours'}</em>}</div></div><div className="security-invoice-total"><strong>{formatSecurityMoney(quote.total_cents)}</strong><small>TTC</small></div><span className={`security-status-pill ${quote.status}`}>{statusLabel(quote.status)}</span><div className="security-record-actions"><button className="secondary-button compact-button" disabled={exportingId === quote.id} onClick={() => void download(quote)}>{exportingId === quote.id ? 'PDF…' : 'Télécharger'}</button>{quote.status === 'draft' && <button className="secondary-button compact-button" onClick={() => openEdit(quote)}>Modifier</button>}{quote.prospect_email && ['draft','sent'].includes(quote.status) && <button className="primary-button compact-button" onClick={() => openEmail(quote)}>{logs.some((log) => log.status === 'sent') ? 'Renvoyer' : 'Envoyer'}</button>}{['draft','sent'].includes(quote.status) && <button className="secondary-button compact-button" onClick={() => void changeStatus(quote, 'accepted')}>Accepter</button>}{['draft','sent'].includes(quote.status) && <button className="danger-text-button" onClick={() => void changeStatus(quote, 'refused')}>Refuser</button>}{quote.status === 'accepted' && !quote.converted_client_id && canConvert && <button className="primary-button compact-button" onClick={() => void convertQuote(quote)}>Créer client & site</button>}{quote.converted_client_id && <span className="security-converted-label"><Icon name="check" size={14}/>Converti</span>}</div></article>;
    })}</div>}</section>
  </div>;
}
