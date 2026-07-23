import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { generateTrainingInvoicePdf } from '../features/training/invoicePdf';
import {
  formatTrainingMoney,
  type TrainingBpfRevenueCategory,
  type TrainingCommercialDocumentRecord,
  type TrainingCustomerRecord,
  type TrainingFunderRecord,
  type TrainingInvoiceLineRecord,
  type TrainingInvoicePaymentMethod,
  type TrainingInvoicePaymentRecord,
  type TrainingInvoiceRecord,
  type TrainingInvoiceStatus
} from '../features/training/types';
import { closeFileWindow, prepareFileWindow, showBlobDownload } from '../lib/browserFiles';
import { readJsonStorage, writeJsonStorage } from '../lib/safeStorage';
import { supabase } from '../lib/supabase';

type BillingTab = 'invoices' | 'payments' | 'settings';
type InvoiceFilter = 'all' | 'open' | 'overdue' | 'paid' | 'credits';

type InvoiceForm = {
  commercialDocumentId: string;
  payerKind: 'customer' | 'funder';
  amountExclTax: string;
  vatRate: string;
  issueDate: string;
  serviceDate: string;
  dueDate: string;
  bpfRevenueCategory: TrainingBpfRevenueCategory | '';
  purchaseOrderNumber: string;
  notes: string;
};

type PaymentForm = {
  amount: string;
  paymentDate: string;
  paymentMethod: TrainingInvoicePaymentMethod;
  reference: string;
  notes: string;
};

type BillingSettingsForm = {
  invoicePrefix: string;
  paymentTermsDays: string;
  latePenaltyText: string;
  taxExemptionText: string;
  bankAccountHolder: string;
  bankName: string;
  bankIban: string;
  bankBic: string;
  reminderEnabled: boolean;
  reminderFirstDelayDays: string;
  reminderIntervalDays: string;
  reminderMaxCount: string;
};

const invoiceStatusLabels: Record<TrainingInvoiceStatus, string> = {
  draft: 'Brouillon',
  issued: 'Émise',
  sent: 'Envoyée',
  partial: 'Partiellement réglée',
  paid: 'Réglée',
  overdue: 'En retard',
  canceled: 'Annulée'
};

const paymentMethodLabels: Record<TrainingInvoicePaymentMethod, string> = {
  bank_transfer: 'Virement',
  card: 'Carte',
  cash: 'Espèces',
  check: 'Chèque',
  direct_debit: 'Prélèvement',
  other: 'Autre'
};

const bpfRevenueLabels: Record<TrainingBpfRevenueCategory, string> = {
  companies: 'Entreprises',
  apprenticeship: 'Apprentissage',
  professionalization: 'Professionnalisation',
  pro_a: 'Reconversion ou promotion par alternance',
  transition: 'Projet de transition professionnelle',
  cpf: 'Compte personnel de formation',
  jobseekers_funds: 'Fonds pour demandeurs d’emploi',
  self_employed_funds: 'Fonds des non-salariés',
  skills_plan: 'Plan de développement des compétences',
  public_agents: 'Agents publics',
  eu: 'Union européenne',
  state: 'État',
  regions: 'Régions',
  france_travail: 'France Travail',
  other_public: 'Autres concours publics',
  individuals: 'Particuliers',
  training_organizations: 'Autres organismes de formation',
  other_training: 'Autres produits de formation'
};

const today = () => new Date().toISOString().slice(0, 10);

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function moneyToCents(value: string) {
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : Number.NaN;
}

function dateLabel(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`));
}

function statusClass(status: TrainingInvoiceStatus) {
  if (status === 'paid') return 'active';
  if (status === 'overdue' || status === 'canceled') return 'inactive';
  return 'pending';
}

function readRows<T>(key: string) {
  return readJsonStorage<T[]>(key, []);
}

export function TrainingBillingPage() {
  const { organization } = useOrganization();
  const { demoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<BillingTab>('invoices');
  const [filter, setFilter] = useState<InvoiceFilter>('all');
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<TrainingCustomerRecord[]>([]);
  const [funders, setFunders] = useState<TrainingFunderRecord[]>([]);
  const [commercialDocuments, setCommercialDocuments] = useState<TrainingCommercialDocumentRecord[]>([]);
  const [invoices, setInvoices] = useState<TrainingInvoiceRecord[]>([]);
  const [lines, setLines] = useState<TrainingInvoiceLineRecord[]>([]);
  const [payments, setPayments] = useState<TrainingInvoicePaymentRecord[]>([]);
  const [editorOpen, setEditorOpen] = useState(searchParams.get('new') === '1');
  const [paymentInvoiceId, setPaymentInvoiceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const termsDays = organization?.training_payment_terms_days ?? 30;
  const initialDate = today();
  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>({
    commercialDocumentId: '',
    payerKind: 'customer',
    amountExclTax: '',
    vatRate: String((organization?.training_default_vat_basis_points ?? 2000) / 100).replace('.', ','),
    issueDate: initialDate,
    serviceDate: initialDate,
    dueDate: addDays(initialDate, termsDays),
    bpfRevenueCategory: '',
    purchaseOrderNumber: '',
    notes: ''
  });
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    amount: '',
    paymentDate: initialDate,
    paymentMethod: 'bank_transfer',
    reference: '',
    notes: ''
  });
  const [settingsForm, setSettingsForm] = useState<BillingSettingsForm>({
    invoicePrefix: organization?.training_invoice_prefix ?? 'FAC',
    paymentTermsDays: String(termsDays),
    latePenaltyText: organization?.training_late_penalty_text ?? 'Taux de refinancement de la BCE majoré de 10 points',
    taxExemptionText: organization?.training_tax_exemption_text ?? '',
    bankAccountHolder: organization?.training_bank_account_holder ?? '',
    bankName: organization?.training_bank_name ?? '',
    bankIban: organization?.training_bank_iban ?? '',
    bankBic: organization?.training_bank_bic ?? '',
    reminderEnabled: organization?.training_invoice_reminder_enabled ?? true,
    reminderFirstDelayDays: String(organization?.training_invoice_reminder_first_delay_days ?? 3),
    reminderIntervalDays: String(organization?.training_invoice_reminder_interval_days ?? 7),
    reminderMaxCount: String(organization?.training_invoice_reminder_max_count ?? 3)
  });
  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const canConfigure = ['owner', 'admin'].includes(organization?.role ?? 'viewer');

  const load = useCallback(async () => {
    if (!organization) return;
    const organizationId = organization.id;
    setLoading(true);
    setError('');
    if (demoMode || !supabase) {
      setCustomers(readRows(`ncr-suite-training-customers-${organizationId}`));
      setFunders(readRows(`ncr-suite-training-funders-${organizationId}`));
      setCommercialDocuments(readRows(`ncr-suite-training-commercial-${organizationId}`));
      setInvoices(readRows(`ncr-suite-training-invoices-${organizationId}`));
      setLines(readRows(`ncr-suite-training-invoice-lines-${organizationId}`));
      setPayments(readRows(`ncr-suite-training-invoice-payments-${organizationId}`));
      setLoading(false);
      return;
    }
    const [customerResult, funderResult, commercialResult, invoiceResult, lineResult, paymentResult] = await Promise.all([
      supabase.from('training_customers').select('id,organization_id,site_id,customer_type,legal_name,contact_name,email,phone,billing_address,postal_code,city,siret,vat_number,notes,status,created_at,updated_at').eq('organization_id', organizationId).neq('status', 'archived').order('legal_name'),
      supabase.from('training_funders').select('id,organization_id,funder_type,name,contact_name,email,phone,billing_address,postal_code,city,siret,vat_number,reference_code,notes,status,created_at,updated_at').eq('organization_id', organizationId).neq('status', 'archived').order('name'),
      supabase.from('training_commercial_documents').select('id,organization_id,site_id,opportunity_id,customer_id,funder_id,session_id,trainee_id,program_id,document_type,reference,title,training_summary,participant_count,issue_date,valid_until,status,amount_excl_tax_cents,vat_rate_basis_points,tax_cents,amount_incl_tax_cents,notes,terms,sent_at,accepted_at,signed_at,signed_document_path,signed_document_received_at,signed_document_received_by,generated_document_path,generated_document_name,generated_at,email_queued_at,emailed_at,last_email_recipient,last_email_outbox_id,bpf_revenue_category,bpf_revenue_recognized_at,bpf_included,created_at,updated_at').eq('organization_id', organizationId).in('status', ['accepted', 'signed', 'completed']).order('created_at', { ascending: false }),
      supabase.from('training_invoices').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }),
      supabase.from('training_invoice_lines').select('*').eq('organization_id', organizationId).order('position'),
      supabase.from('training_invoice_payments').select('*').eq('organization_id', organizationId).order('payment_date', { ascending: false })
    ]);
    const firstError = customerResult.error || funderResult.error || commercialResult.error || invoiceResult.error || lineResult.error || paymentResult.error;
    if (firstError) setError(`Chargement impossible : ${firstError.message}`);
    else {
      setCustomers((customerResult.data ?? []) as TrainingCustomerRecord[]);
      setFunders((funderResult.data ?? []) as TrainingFunderRecord[]);
      setCommercialDocuments((commercialResult.data ?? []).map((row) => ({
        ...row,
        participant_count: Number(row.participant_count),
        amount_excl_tax_cents: Number(row.amount_excl_tax_cents),
        vat_rate_basis_points: Number(row.vat_rate_basis_points),
        tax_cents: Number(row.tax_cents),
        amount_incl_tax_cents: Number(row.amount_incl_tax_cents)
      })) as TrainingCommercialDocumentRecord[]);
      setInvoices((invoiceResult.data ?? []).map((row) => ({
        ...row,
        subtotal_cents: Number(row.subtotal_cents),
        tax_cents: Number(row.tax_cents),
        total_cents: Number(row.total_cents),
        paid_amount_cents: Number(row.paid_amount_cents),
        balance_due_cents: Number(row.balance_due_cents)
      })) as TrainingInvoiceRecord[]);
      setLines((lineResult.data ?? []).map((row) => ({
        ...row,
        quantity: Number(row.quantity),
        unit_price_excl_tax_cents: Number(row.unit_price_excl_tax_cents),
        subtotal_cents: Number(row.subtotal_cents),
        tax_cents: Number(row.tax_cents),
        total_cents: Number(row.total_cents)
      })) as TrainingInvoiceLineRecord[]);
      setPayments((paymentResult.data ?? []).map((row) => ({ ...row, amount_cents: Number(row.amount_cents) })) as TrainingInvoicePaymentRecord[]);
    }
    setLoading(false);
  }, [organization, demoMode]);

  useEffect(() => { void load(); }, [load]);

  const customerById = useMemo(() => new Map(customers.map((row) => [row.id, row])), [customers]);
  const funderById = useMemo(() => new Map(funders.map((row) => [row.id, row])), [funders]);
  const commercialById = useMemo(() => new Map(commercialDocuments.map((row) => [row.id, row])), [commercialDocuments]);
  const invoiceById = useMemo(() => new Map(invoices.map((row) => [row.id, row])), [invoices]);
  const linesByInvoice = useMemo(() => {
    const grouped = new Map<string, TrainingInvoiceLineRecord[]>();
    lines.forEach((row) => grouped.set(row.invoice_id, [...(grouped.get(row.invoice_id) ?? []), row]));
    return grouped;
  }, [lines]);

  const billedByDocument = useMemo(() => {
    const values = new Map<string, number>();
    invoices.filter((row) => row.status !== 'canceled').forEach((row) => {
      const signedAmount = row.document_kind === 'invoice' ? row.subtotal_cents : -row.subtotal_cents;
      values.set(row.commercial_document_id, (values.get(row.commercial_document_id) ?? 0) + signedAmount);
    });
    return values;
  }, [invoices]);

  const billableDocuments = useMemo(() => commercialDocuments.filter((row) => (
    row.amount_excl_tax_cents - (billedByDocument.get(row.id) ?? 0) > 0
  )), [commercialDocuments, billedByDocument]);

  useEffect(() => {
    const requested = searchParams.get('commercial');
    if (!requested || !commercialById.has(requested)) return;
    setEditorOpen(true);
    selectCommercialDocument(requested);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commercialById, searchParams]);

  const metrics = useMemo(() => {
    const invoiceRows = invoices.filter((row) => row.document_kind === 'invoice' && row.status !== 'canceled');
    const creditRows = invoices.filter((row) => row.document_kind === 'credit_note' && row.status !== 'canceled');
    const billed = invoiceRows.reduce((sum, row) => sum + row.total_cents, 0) - creditRows.reduce((sum, row) => sum + row.total_cents, 0);
    const collected = invoiceRows.reduce((sum, row) => sum + row.paid_amount_cents, 0);
    const outstanding = invoiceRows.reduce((sum, row) => sum + row.balance_due_cents, 0);
    const overdue = invoiceRows.filter((row) => row.status === 'overdue' || (row.balance_due_cents > 0 && row.due_date < today())).reduce((sum, row) => sum + row.balance_due_cents, 0);
    const remaining = billableDocuments.reduce((sum, row) => sum + row.amount_excl_tax_cents - (billedByDocument.get(row.id) ?? 0), 0);
    return { billed, collected, outstanding, overdue, remaining };
  }, [invoices, billableDocuments, billedByDocument]);

  const visibleInvoices = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr');
    return invoices.filter((row) => {
      const isLate = row.status === 'overdue' || (row.document_kind === 'invoice' && row.balance_due_cents > 0 && row.due_date < today());
      if (filter === 'open' && (row.document_kind !== 'invoice' || !['issued', 'sent', 'partial', 'overdue'].includes(row.status))) return false;
      if (filter === 'overdue' && !isLate) return false;
      if (filter === 'paid' && row.status !== 'paid') return false;
      if (filter === 'credits' && row.document_kind !== 'credit_note') return false;
      if (!normalized) return true;
      const buyer = row.buyer_snapshot?.name ?? '';
      return `${row.invoice_number ?? 'brouillon'} ${row.title} ${buyer}`.toLocaleLowerCase('fr').includes(normalized);
    });
  }, [invoices, filter, query]);

  const visiblePayments = useMemo(() => payments.filter((payment) => {
    const invoice = invoiceById.get(payment.invoice_id);
    const normalized = query.trim().toLocaleLowerCase('fr');
    return !normalized || `${invoice?.invoice_number ?? ''} ${invoice?.buyer_snapshot?.name ?? ''} ${payment.reference ?? ''}`.toLocaleLowerCase('fr').includes(normalized);
  }), [payments, invoiceById, query]);

  function selectCommercialDocument(id: string) {
    const document = commercialById.get(id);
    if (!document) return;
    const remaining = document.amount_excl_tax_cents - (billedByDocument.get(document.id) ?? 0);
    const payerKind = document.customer_id ? 'customer' : 'funder';
    const customer = customerById.get(document.customer_id ?? '');
    const funder = funderById.get(document.funder_id ?? '');
    const suggestedCategory: TrainingBpfRevenueCategory | '' = document.bpf_revenue_category
      ?? (funder?.funder_type === 'employer' ? 'companies'
        : funder?.funder_type === 'cpf' ? 'cpf'
          : !funder && customer?.customer_type === 'company' ? 'companies'
            : !funder && customer?.customer_type === 'individual' ? 'individuals'
              : '');
    setInvoiceForm((current) => ({
      ...current,
      commercialDocumentId: document.id,
      payerKind,
      amountExclTax: String(remaining / 100).replace('.', ','),
      vatRate: String(document.vat_rate_basis_points / 100).replace('.', ','),
      bpfRevenueCategory: suggestedCategory,
      issueDate: today(),
      serviceDate: document.issue_date || today(),
      dueDate: addDays(today(), Number(settingsForm.paymentTermsDays) || termsDays)
    }));
  }

  async function createInvoice(event: FormEvent) {
    event.preventDefault();
    if (!organization || !canManage) return;
    const document = commercialById.get(invoiceForm.commercialDocumentId);
    const amount = moneyToCents(invoiceForm.amountExclTax);
    const vatRate = Math.round(Number(invoiceForm.vatRate.replace(',', '.')) * 100);
    if (!document || !invoiceForm.bpfRevenueCategory || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(vatRate)) {
      setError('Sélectionne un dossier, une catégorie BPF et vérifie le montant et la TVA.');
      return;
    }
    setSaving(true); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const id = crypto.randomUUID();
        const tax = Math.round(amount * vatRate / 10000);
        const now = new Date().toISOString();
        const customer = customerById.get(document.customer_id ?? '');
        const funder = funderById.get(document.funder_id ?? '');
        const invoice: TrainingInvoiceRecord = {
          id, organization_id: organization.id, commercial_document_id: document.id, credited_invoice_id: null,
          customer_id: invoiceForm.payerKind === 'customer' ? document.customer_id : null,
          funder_id: invoiceForm.payerKind === 'funder' ? document.funder_id : null,
          session_id: document.session_id, program_id: document.program_id, document_kind: 'invoice',
          invoice_number: null, payer_kind: invoiceForm.payerKind, title: document.title,
          issue_date: invoiceForm.issueDate, service_date: invoiceForm.serviceDate, due_date: invoiceForm.dueDate,
          status: 'draft', bpf_revenue_category: invoiceForm.bpfRevenueCategory as TrainingBpfRevenueCategory,
          subtotal_cents: amount, tax_cents: tax, total_cents: amount + tax, paid_amount_cents: 0, balance_due_cents: amount + tax,
          seller_snapshot: {}, buyer_snapshot: invoiceForm.payerKind === 'customer'
            ? { kind: 'customer', name: customer?.legal_name, contact_name: customer?.contact_name, email: customer?.email, address: customer?.billing_address, postal_code: customer?.postal_code, city: customer?.city, siret: customer?.siret, vat_number: customer?.vat_number }
            : { kind: 'funder', name: funder?.name, contact_name: funder?.contact_name, email: funder?.email, address: funder?.billing_address, postal_code: funder?.postal_code, city: funder?.city, siret: funder?.siret, vat_number: funder?.vat_number },
          payment_terms_text: null, late_penalty_text: null, tax_exemption_text: null,
          purchase_order_number: invoiceForm.purchaseOrderNumber || null, notes: invoiceForm.notes || null,
          issued_at: null, sent_at: null, paid_at: null, generated_document_path: null, generated_document_name: null,
          generated_at: null, email_queued_at: null, emailed_at: null, last_email_recipient: null, last_email_outbox_id: null,
          reminder_count: 0, last_reminded_at: null, created_at: now, updated_at: now
        };
        const line: TrainingInvoiceLineRecord = {
          id: crypto.randomUUID(), organization_id: organization.id, invoice_id: id, position: 1,
          description: document.training_summary || document.title, quantity: 1, unit_label: 'forfait',
          unit_price_excl_tax_cents: amount, vat_rate_basis_points: vatRate,
          subtotal_cents: amount, tax_cents: tax, total_cents: amount + tax, created_at: now, updated_at: now
        };
        const nextInvoices = [invoice, ...invoices];
        const nextLines = [...lines, line];
        setInvoices(nextInvoices); setLines(nextLines);
        writeJsonStorage(`ncr-suite-training-invoices-${organization.id}`, nextInvoices);
        writeJsonStorage(`ncr-suite-training-invoice-lines-${organization.id}`, nextLines);
      } else {
        const { error: rpcError } = await supabase.rpc('create_training_invoice', {
          p_organization_id: organization.id,
          p_commercial_document_id: document.id,
          p_payer_kind: invoiceForm.payerKind,
          p_amount_excl_tax_cents: amount,
          p_vat_rate_basis_points: vatRate,
          p_issue_date: invoiceForm.issueDate,
          p_service_date: invoiceForm.serviceDate,
          p_due_date: invoiceForm.dueDate,
          p_bpf_revenue_category: invoiceForm.bpfRevenueCategory,
          p_purchase_order_number: invoiceForm.purchaseOrderNumber || null,
          p_notes: invoiceForm.notes || null
        });
        if (rpcError) throw rpcError;
        await load();
      }
      setEditorOpen(false);
      setSearchParams({});
      setSuccess('Facture brouillon créée. Vérifie-la puis émets-la pour attribuer son numéro définitif.');
    } catch (caught) {
      setError(`Création impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setSaving(false); }
  }

  async function issueInvoice(row: TrainingInvoiceRecord) {
    if (!organization || !canManage) return;
    if (!window.confirm(`Émettre définitivement cette facture de ${formatTrainingMoney(row.total_cents)} ? Son numéro ne pourra plus être modifié.`)) return;
    setBusyId(row.id); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const number = `${settingsForm.invoicePrefix || 'FAC'}-${row.issue_date.slice(0, 4)}-${String(invoices.filter((item) => item.invoice_number).length + 1).padStart(6, '0')}`;
        const next = invoices.map((item) => item.id === row.id ? {
          ...item, invoice_number: number, status: 'issued' as const, issued_at: new Date().toISOString(),
          seller_snapshot: {
            name: organization.public_name || organization.name, address: organization.company_address,
            postal_code: organization.company_postal_code, city: organization.company_city,
            siret: organization.company_siret, vat_number: organization.training_vat_number,
            nda_number: organization.training_nda_number, email: organization.training_reply_to_email || organization.company_email,
            phone: organization.company_phone, bank_account_holder: settingsForm.bankAccountHolder,
            bank_name: settingsForm.bankName, iban: settingsForm.bankIban, bic: settingsForm.bankBic
          },
          payment_terms_text: `Paiement à ${settingsForm.paymentTermsDays} jours`,
          late_penalty_text: settingsForm.latePenaltyText,
          tax_exemption_text: item.tax_cents === 0 ? settingsForm.taxExemptionText : null
        } : item);
        setInvoices(next);
        writeJsonStorage(`ncr-suite-training-invoices-${organization.id}`, next);
      } else {
        const { error: rpcError } = await supabase.rpc('issue_training_invoice', {
          p_organization_id: organization.id,
          p_invoice_id: row.id
        });
        if (rpcError) throw rpcError;
        await load();
      }
      setSuccess('Facture émise et numérotée. Elle est prête à être envoyée.');
    } catch (caught) {
      setError(`Émission impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setBusyId(''); }
  }

  async function generatePdf(row: TrainingInvoiceRecord) {
    if (!organization) throw new Error('Organisation introuvable.');
    let invoice = row;
    if (!row.buyer_snapshot?.name) {
      const customer = customerById.get(row.customer_id ?? '');
      const funder = funderById.get(row.funder_id ?? '');
      invoice = {
        ...row,
        buyer_snapshot: row.payer_kind === 'customer'
          ? { kind: 'customer', name: customer?.legal_name, contact_name: customer?.contact_name, email: customer?.email, phone: customer?.phone, address: customer?.billing_address, postal_code: customer?.postal_code, city: customer?.city, siret: customer?.siret, vat_number: customer?.vat_number }
          : { kind: 'funder', name: funder?.name, contact_name: funder?.contact_name, email: funder?.email, phone: funder?.phone, address: funder?.billing_address, postal_code: funder?.postal_code, city: funder?.city, siret: funder?.siret, vat_number: funder?.vat_number, reference_code: funder?.reference_code }
      };
    }
    return generateTrainingInvoicePdf({ organization, invoice, lines: linesByInvoice.get(row.id) ?? [] });
  }

  async function downloadPdf(row: TrainingInvoiceRecord) {
    const target = prepareFileWindow('Document de facturation', 'NCR Suite prépare le PDF…');
    setBusyId(row.id); setError('');
    try {
      const generated = await generatePdf(row);
      const url = URL.createObjectURL(generated.blob);
      showBlobDownload(target, url, generated.filename);
      window.setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (caught) {
      closeFileWindow(target);
      setError(`PDF impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setBusyId(''); }
  }

  async function sendInvoice(row: TrainingInvoiceRecord) {
    if (!organization || !canManage) return;
    const email = row.buyer_snapshot?.email;
    if (!email) {
      setError('Le payeur ne possède pas d’adresse e-mail. Complète sa fiche CRM puis recrée le brouillon si nécessaire.');
      return;
    }
    if (!window.confirm(`${row.email_queued_at ? 'Renvoyer' : 'Envoyer'} ${row.document_kind === 'credit_note' ? 'l’avoir' : 'la facture'} ${row.invoice_number} à ${email} ?`)) return;
    setBusyId(row.id); setError(''); setSuccess('');
    try {
      const generated = await generatePdf(row);
      const now = new Date().toISOString();
      if (demoMode || !supabase) {
        const next = invoices.map((item) => item.id === row.id ? {
          ...item, status: item.document_kind === 'invoice' && item.status === 'issued' ? 'sent' as const : item.status,
          sent_at: item.sent_at || now, emailed_at: now, email_queued_at: now,
          generated_document_name: generated.filename, generated_at: now, last_email_recipient: email
        } : item);
        setInvoices(next);
        writeJsonStorage(`ncr-suite-training-invoices-${organization.id}`, next);
      } else {
        const path = `${organization.id}/billing/generated/${row.id}/${Date.now()}-${generated.filename}`;
        const { error: uploadError } = await supabase.storage.from('training-documents').upload(path, generated.blob, {
          contentType: 'application/pdf', cacheControl: '3600', upsert: false
        });
        if (uploadError) throw uploadError;
        const { error: queueError } = await supabase.rpc('queue_training_invoice_email', {
          p_organization_id: organization.id,
          p_invoice_id: row.id,
          p_attachment_path: path,
          p_attachment_name: generated.filename,
          p_force: Boolean(row.email_queued_at)
        });
        if (queueError) throw queueError;
        await load();
      }
      setSuccess(`Document placé dans la file Brevo pour ${email}.`);
    } catch (caught) {
      setError(`Envoi impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setBusyId(''); }
  }

  function openPayment(row: TrainingInvoiceRecord) {
    setPaymentInvoiceId(row.id);
    setPaymentForm({
      amount: String(row.balance_due_cents / 100).replace('.', ','),
      paymentDate: today(),
      paymentMethod: 'bank_transfer',
      reference: '',
      notes: ''
    });
  }

  async function recordPayment(event: FormEvent) {
    event.preventDefault();
    if (!organization || !canManage) return;
    const invoice = invoiceById.get(paymentInvoiceId);
    const amount = moneyToCents(paymentForm.amount);
    if (!invoice || !Number.isFinite(amount) || amount <= 0 || amount > invoice.balance_due_cents) {
      setError('Le montant encaissé doit être positif et inférieur ou égal au solde.');
      return;
    }
    setSaving(true); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const payment: TrainingInvoicePaymentRecord = {
          id: crypto.randomUUID(), organization_id: organization.id, invoice_id: invoice.id,
          payment_date: paymentForm.paymentDate, amount_cents: amount, payment_method: paymentForm.paymentMethod,
          reference: paymentForm.reference || null, notes: paymentForm.notes || null, created_at: new Date().toISOString()
        };
        const paid = invoice.paid_amount_cents + amount;
        const nextInvoices = invoices.map((item) => item.id === invoice.id ? {
          ...item, paid_amount_cents: paid, balance_due_cents: Math.max(0, item.total_cents - paid),
          status: paid >= item.total_cents ? 'paid' as const : item.due_date < today() ? 'overdue' as const : 'partial' as const,
          paid_at: paid >= item.total_cents ? new Date().toISOString() : null
        } : item);
        const nextPayments = [payment, ...payments];
        setInvoices(nextInvoices); setPayments(nextPayments);
        writeJsonStorage(`ncr-suite-training-invoices-${organization.id}`, nextInvoices);
        writeJsonStorage(`ncr-suite-training-invoice-payments-${organization.id}`, nextPayments);
      } else {
        const { error: rpcError } = await supabase.rpc('record_training_invoice_payment', {
          p_organization_id: organization.id,
          p_invoice_id: invoice.id,
          p_amount_cents: amount,
          p_payment_date: paymentForm.paymentDate,
          p_payment_method: paymentForm.paymentMethod,
          p_reference: paymentForm.reference || null,
          p_notes: paymentForm.notes || null
        });
        if (rpcError) throw rpcError;
        await load();
      }
      setPaymentInvoiceId('');
      setSuccess('Encaissement enregistré dans l’historique.');
    } catch (caught) {
      setError(`Encaissement impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setSaving(false); }
  }

  async function createCreditNote(row: TrainingInvoiceRecord) {
    if (!organization || !canConfigure) return;
    if (!window.confirm(`Créer un avoir sur le solde non encore crédité de ${row.invoice_number} ? L’avoir sera émis immédiatement.`)) return;
    const reason = window.prompt('Motif de l’avoir', 'Annulation ou correction de la prestation') ?? '';
    setBusyId(row.id); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        setSuccess('Simulation : l’avoir doit être créé avec une base Supabase connectée.');
      } else {
        const { error: rpcError } = await supabase.rpc('create_training_credit_note', {
          p_organization_id: organization.id, p_invoice_id: row.id, p_reason: reason || null
        });
        if (rpcError) throw rpcError;
        await load();
        setSuccess('Avoir émis. Il est disponible dans la liste et peut être envoyé au payeur.');
      }
    } catch (caught) {
      setError(`Avoir impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setBusyId(''); }
  }

  async function cancelDraft(row: TrainingInvoiceRecord) {
    if (!organization || !canManage || !window.confirm('Annuler ce brouillon ? Le dossier commercial redeviendra facturable pour ce montant.')) return;
    setBusyId(row.id); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const next = invoices.map((item) => item.id === row.id ? { ...item, status: 'canceled' as const } : item);
        setInvoices(next);
        writeJsonStorage(`ncr-suite-training-invoices-${organization.id}`, next);
      } else {
        const { error: rpcError } = await supabase.rpc('cancel_training_invoice_draft', {
          p_organization_id: organization.id, p_invoice_id: row.id
        });
        if (rpcError) throw rpcError;
        await load();
      }
      setSuccess('Brouillon annulé.');
    } catch (caught) {
      setError(`Annulation impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setBusyId(''); }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    if (!organization || !canConfigure) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      if (!demoMode && supabase) {
        const { error: rpcError } = await supabase.rpc('update_training_billing_settings', {
          p_organization_id: organization.id,
          p_invoice_prefix: settingsForm.invoicePrefix,
          p_payment_terms_days: Number(settingsForm.paymentTermsDays),
          p_late_penalty_text: settingsForm.latePenaltyText,
          p_tax_exemption_text: settingsForm.taxExemptionText || null,
          p_bank_account_holder: settingsForm.bankAccountHolder || null,
          p_bank_name: settingsForm.bankName || null,
          p_bank_iban: settingsForm.bankIban || null,
          p_bank_bic: settingsForm.bankBic || null,
          p_reminder_enabled: settingsForm.reminderEnabled,
          p_reminder_first_delay_days: Number(settingsForm.reminderFirstDelayDays),
          p_reminder_interval_days: Number(settingsForm.reminderIntervalDays),
          p_reminder_max_count: Number(settingsForm.reminderMaxCount)
        });
        if (rpcError) throw rpcError;
      }
      setSuccess('Réglages de facturation enregistrés.');
    } catch (caught) {
      setError(`Enregistrement impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setSaving(false); }
  }

  const selectedPaymentInvoice = invoiceById.get(paymentInvoiceId);

  return (
    <div className="page training-page training-billing-page">
      <header className="page-header training-page-header">
        <div>
          <p className="eyebrow">FORMATION · PILOTAGE FINANCIER</p>
          <h1>Facturation et encaissements</h1>
          <p>Transforme les dossiers acceptés en factures, suis les règlements et laisse NCR Suite relancer les échéances en retard.</p>
        </div>
        {canManage && <button className="primary-button" type="button" onClick={() => { setEditorOpen(true); setTab('invoices'); }}><Icon name="creditCard" size={17} />Nouvelle facture</button>}
      </header>

      {error && <div className="alert error-alert">{error}</div>}
      {success && <div className="alert success-alert">{success}</div>}

      <section className="training-billing-metrics" aria-label="Indicateurs de facturation">
        <article><span><Icon name="file" size={20} /></span><div><small>Facturé TTC net</small><strong>{formatTrainingMoney(metrics.billed)}</strong><em>factures moins avoirs</em></div></article>
        <article><span><Icon name="check" size={20} /></span><div><small>Encaissé</small><strong>{formatTrainingMoney(metrics.collected)}</strong><em>paiements enregistrés</em></div></article>
        <article><span><Icon name="activity" size={20} /></span><div><small>À encaisser</small><strong>{formatTrainingMoney(metrics.outstanding)}</strong><em>solde des factures</em></div></article>
        <article className={metrics.overdue > 0 ? 'is-alert' : ''}><span><Icon name="alert" size={20} /></span><div><small>En retard</small><strong>{formatTrainingMoney(metrics.overdue)}</strong><em>échéances dépassées</em></div></article>
        <article><span><Icon name="briefcase" size={20} /></span><div><small>Reste à facturer HT</small><strong>{formatTrainingMoney(metrics.remaining)}</strong><em>dossiers commerciaux</em></div></article>
      </section>

      <div className="training-billing-tabs" role="tablist" aria-label="Facturation Formation">
        <button type="button" className={tab === 'invoices' ? 'active' : ''} onClick={() => setTab('invoices')}><Icon name="file" size={15} />Factures</button>
        <button type="button" className={tab === 'payments' ? 'active' : ''} onClick={() => setTab('payments')}><Icon name="creditCard" size={15} />Encaissements</button>
        {canConfigure && <button type="button" className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><Icon name="settings" size={15} />Réglages</button>}
      </div>

      {editorOpen && tab === 'invoices' && <section className="panel training-form-panel training-billing-editor">
        <div className="panel-header"><div><p className="eyebrow">NOUVEAU BROUILLON</p><h2>Facturer un dossier accepté</h2></div><button type="button" className="secondary-button compact-button" onClick={() => { setEditorOpen(false); setSearchParams({}); }}>Fermer</button></div>
        <form className="training-form-grid" onSubmit={createInvoice}>
          <label className="full-field">Dossier commercial *<select required value={invoiceForm.commercialDocumentId} onChange={(event) => selectCommercialDocument(event.target.value)}><option value="">Sélectionner</option>{billableDocuments.map((row) => <option key={row.id} value={row.id}>{row.reference} · {row.title} · reste {formatTrainingMoney(row.amount_excl_tax_cents - (billedByDocument.get(row.id) ?? 0))} HT</option>)}</select></label>
          <label>Payeur *<select value={invoiceForm.payerKind} onChange={(event) => setInvoiceForm({ ...invoiceForm, payerKind: event.target.value as 'customer' | 'funder' })}><option value="customer" disabled={!commercialById.get(invoiceForm.commercialDocumentId)?.customer_id}>Client</option><option value="funder" disabled={!commercialById.get(invoiceForm.commercialDocumentId)?.funder_id}>Financeur</option></select></label>
          <label>Catégorie BPF *<select required value={invoiceForm.bpfRevenueCategory} onChange={(event) => setInvoiceForm({ ...invoiceForm, bpfRevenueCategory: event.target.value as TrainingBpfRevenueCategory | '' })}><option value="">Sélectionner la rubrique</option>{Object.entries(bpfRevenueLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Montant HT *<input required inputMode="decimal" value={invoiceForm.amountExclTax} onChange={(event) => setInvoiceForm({ ...invoiceForm, amountExclTax: event.target.value })} /></label>
          <label>TVA (%) *<input required inputMode="decimal" value={invoiceForm.vatRate} onChange={(event) => setInvoiceForm({ ...invoiceForm, vatRate: event.target.value })} /></label>
          <label>Date d’émission *<input required type="date" value={invoiceForm.issueDate} onChange={(event) => setInvoiceForm({ ...invoiceForm, issueDate: event.target.value, dueDate: addDays(event.target.value, Number(settingsForm.paymentTermsDays) || termsDays) })} /></label>
          <label>Date de prestation *<input required type="date" value={invoiceForm.serviceDate} onChange={(event) => setInvoiceForm({ ...invoiceForm, serviceDate: event.target.value })} /></label>
          <label>Échéance *<input required type="date" min={invoiceForm.issueDate} value={invoiceForm.dueDate} onChange={(event) => setInvoiceForm({ ...invoiceForm, dueDate: event.target.value })} /></label>
          <label>Bon de commande<input value={invoiceForm.purchaseOrderNumber} onChange={(event) => setInvoiceForm({ ...invoiceForm, purchaseOrderNumber: event.target.value })} placeholder="Référence facultative" /></label>
          <label className="full-field">Note interne / visible sur le PDF<textarea rows={2} value={invoiceForm.notes} onChange={(event) => setInvoiceForm({ ...invoiceForm, notes: event.target.value })} /></label>
          <div className="form-actions full-field"><button className="primary-button" disabled={saving || !invoiceForm.commercialDocumentId} type="submit">{saving ? 'Création…' : 'Créer le brouillon'}</button></div>
        </form>
      </section>}

      {paymentInvoiceId && selectedPaymentInvoice && <section className="panel training-form-panel training-payment-editor">
        <div className="panel-header"><div><p className="eyebrow">ENCAISSEMENT</p><h2>{selectedPaymentInvoice.invoice_number} · reste {formatTrainingMoney(selectedPaymentInvoice.balance_due_cents)}</h2></div><button type="button" className="secondary-button compact-button" onClick={() => setPaymentInvoiceId('')}>Fermer</button></div>
        <form className="training-form-grid" onSubmit={recordPayment}>
          <label>Montant reçu *<input required inputMode="decimal" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} /></label>
          <label>Date *<input required type="date" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm({ ...paymentForm, paymentDate: event.target.value })} /></label>
          <label>Mode *<select value={paymentForm.paymentMethod} onChange={(event) => setPaymentForm({ ...paymentForm, paymentMethod: event.target.value as TrainingInvoicePaymentMethod })}>{Object.entries(paymentMethodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Référence<input value={paymentForm.reference} onChange={(event) => setPaymentForm({ ...paymentForm, reference: event.target.value })} placeholder="Virement, chèque…" /></label>
          <label className="full-field">Note<textarea rows={2} value={paymentForm.notes} onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })} /></label>
          <div className="form-actions full-field"><button className="primary-button" disabled={saving} type="submit">{saving ? 'Enregistrement…' : 'Enregistrer l’encaissement'}</button></div>
        </form>
      </section>}

      {tab !== 'settings' && <section className="panel training-billing-list">
        <div className="training-toolbar">
          <label className="training-search"><Icon name="search" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === 'invoices' ? 'Numéro, client, formation…' : 'Facture, payeur, référence…'} /></label>
          {tab === 'invoices' && <div className="training-filter-chips">{(['all', 'open', 'overdue', 'paid', 'credits'] as InvoiceFilter[]).map((value) => <button type="button" key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'Tout' : value === 'open' ? 'À encaisser' : value === 'overdue' ? 'En retard' : value === 'paid' ? 'Réglées' : 'Avoirs'}</button>)}</div>}
        </div>

        {loading ? <div className="training-empty">Chargement…</div> : tab === 'invoices' ? (
          visibleInvoices.length === 0 ? <div className="training-empty"><Icon name="file" size={30} /><strong>Aucun document</strong><span>Les factures créées depuis les dossiers commerciaux apparaîtront ici.</span></div> :
          <div className="training-invoice-list">{visibleInvoices.map((row) => {
            const isLate = row.status === 'overdue' || (row.document_kind === 'invoice' && row.balance_due_cents > 0 && row.due_date < today());
            const buyer = row.buyer_snapshot?.name || (row.customer_id ? customerById.get(row.customer_id)?.legal_name : funderById.get(row.funder_id ?? '')?.name) || 'Payeur à compléter';
            return <article key={row.id} className={isLate ? 'is-overdue' : ''}>
              <span className="training-invoice-kind"><Icon name={row.document_kind === 'credit_note' ? 'activity' : 'file'} size={21} /></span>
              <div className="training-invoice-main"><div><small>{row.document_kind === 'credit_note' ? 'AVOIR' : 'FACTURE'}</small><strong>{row.invoice_number || 'Brouillon'} · {row.title}</strong></div><p>{buyer}</p><em>Émise le {dateLabel(row.issue_date)} · échéance {dateLabel(row.due_date)}</em>{row.reminder_count > 0 && <span><Icon name="message" size={12} />{row.reminder_count} relance(s)</span>}</div>
              <div className="training-invoice-value"><strong>{formatTrainingMoney(row.total_cents)}</strong>{row.document_kind === 'invoice' && row.balance_due_cents > 0 && <small>Reste {formatTrainingMoney(row.balance_due_cents)}</small>}<span className={`status-chip ${statusClass(isLate && row.status !== 'paid' ? 'overdue' : row.status)}`}>{isLate && row.status !== 'paid' ? 'En retard' : invoiceStatusLabels[row.status]}</span></div>
              <div className="training-invoice-actions">
                <button type="button" className="secondary-button compact-button" disabled={busyId === row.id} onClick={() => void downloadPdf(row)}><Icon name="file" size={14} />PDF</button>
                {canManage && row.status === 'draft' && <button type="button" className="primary-button compact-button" disabled={busyId === row.id} onClick={() => void issueInvoice(row)}><Icon name="check" size={14} />Émettre</button>}
                {canManage && !['draft', 'canceled'].includes(row.status) && <button type="button" className="secondary-button compact-button" disabled={busyId === row.id} onClick={() => void sendInvoice(row)}><Icon name="message" size={14} />{row.email_queued_at ? 'Renvoyer' : 'Envoyer'}</button>}
                {canManage && row.document_kind === 'invoice' && row.balance_due_cents > 0 && !['draft', 'canceled'].includes(row.status) && <button type="button" className="primary-button compact-button" onClick={() => openPayment(row)}><Icon name="creditCard" size={14} />Encaisser</button>}
                {canConfigure && row.document_kind === 'invoice' && !['draft', 'canceled'].includes(row.status) && <button type="button" className="secondary-button compact-button" disabled={busyId === row.id} onClick={() => void createCreditNote(row)}>Créer un avoir</button>}
                {canManage && row.status === 'draft' && <button type="button" className="danger-text-button" disabled={busyId === row.id} onClick={() => void cancelDraft(row)}>Annuler</button>}
              </div>
            </article>;
          })}</div>
        ) : (
          visiblePayments.length === 0 ? <div className="training-empty"><Icon name="creditCard" size={30} /><strong>Aucun encaissement</strong><span>Les règlements enregistrés sont conservés ici.</span></div> :
          <div className="training-payment-list">{visiblePayments.map((payment) => {
            const invoice = invoiceById.get(payment.invoice_id);
            return <article key={payment.id}><span><Icon name="check" size={18} /></span><div><strong>{invoice?.invoice_number || 'Facture'}</strong><p>{invoice?.buyer_snapshot?.name || 'Payeur'}</p><small>{dateLabel(payment.payment_date)} · {paymentMethodLabels[payment.payment_method]}{payment.reference ? ` · ${payment.reference}` : ''}</small></div><b>{formatTrainingMoney(payment.amount_cents)}</b></article>;
          })}</div>
        )}
      </section>}

      {tab === 'settings' && canConfigure && <section className="panel training-form-panel training-billing-settings">
        <div className="panel-header"><div><p className="eyebrow">PARAMÈTRES</p><h2>Numérotation, règlement et relances</h2></div></div>
        <form className="training-form-grid" onSubmit={saveSettings}>
          <label>Préfixe des factures *<input required maxLength={12} value={settingsForm.invoicePrefix} onChange={(event) => setSettingsForm({ ...settingsForm, invoicePrefix: event.target.value.toUpperCase() })} /></label>
          <label>Délai de paiement (jours) *<input required type="number" min={0} max={365} value={settingsForm.paymentTermsDays} onChange={(event) => setSettingsForm({ ...settingsForm, paymentTermsDays: event.target.value })} /></label>
          <label className="full-field">Pénalités de retard *<input required value={settingsForm.latePenaltyText} onChange={(event) => setSettingsForm({ ...settingsForm, latePenaltyText: event.target.value })} /></label>
          <label className="full-field">Mention d’exonération de TVA<input value={settingsForm.taxExemptionText} onChange={(event) => setSettingsForm({ ...settingsForm, taxExemptionText: event.target.value })} placeholder="Obligatoire pour émettre une facture avec TVA à 0 %" /></label>
          <label>Titulaire du compte<input value={settingsForm.bankAccountHolder} onChange={(event) => setSettingsForm({ ...settingsForm, bankAccountHolder: event.target.value })} /></label>
          <label>Banque<input value={settingsForm.bankName} onChange={(event) => setSettingsForm({ ...settingsForm, bankName: event.target.value })} /></label>
          <label>IBAN<input value={settingsForm.bankIban} onChange={(event) => setSettingsForm({ ...settingsForm, bankIban: event.target.value })} /></label>
          <label>BIC<input value={settingsForm.bankBic} onChange={(event) => setSettingsForm({ ...settingsForm, bankBic: event.target.value })} /></label>
          <label className="full-field training-toggle-field"><input type="checkbox" checked={settingsForm.reminderEnabled} onChange={(event) => setSettingsForm({ ...settingsForm, reminderEnabled: event.target.checked })} /><span><strong>Relances automatiques activées</strong><small>Brevo réutilise le PDF envoyé et conserve chaque relance dans la file d’e-mails.</small></span></label>
          <label>Première relance après échéance<input type="number" min={0} max={365} value={settingsForm.reminderFirstDelayDays} onChange={(event) => setSettingsForm({ ...settingsForm, reminderFirstDelayDays: event.target.value })} /></label>
          <label>Intervalle entre relances<input type="number" min={1} max={365} value={settingsForm.reminderIntervalDays} onChange={(event) => setSettingsForm({ ...settingsForm, reminderIntervalDays: event.target.value })} /></label>
          <label>Nombre maximal de relances<input type="number" min={0} max={12} value={settingsForm.reminderMaxCount} onChange={(event) => setSettingsForm({ ...settingsForm, reminderMaxCount: event.target.value })} /></label>
          <div className="form-actions full-field"><button className="primary-button" disabled={saving} type="submit">{saving ? 'Enregistrement…' : 'Enregistrer les réglages'}</button></div>
        </form>
      </section>}
    </div>
  );
}
