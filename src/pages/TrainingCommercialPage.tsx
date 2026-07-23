import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { organizationHasFeature } from '../config/planEntitlements';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { generateTrainingCommercialPdf } from '../features/training/commercialPdf';
import {
  formatTrainingMoney,
  nullableText,
  personName,
  trainingCommercialDocumentStatusLabels,
  trainingCommercialDocumentTypeLabels,
  trainingCustomerTypeLabels,
  trainingFunderTypeLabels,
  trainingProgramCompletion,
  type TrainingCommercialDocumentRecord,
  type TrainingCommercialDocumentStatus,
  type TrainingCommercialDocumentType,
  type TrainingCustomerRecord,
  type TrainingCustomerType,
  type TrainingFunderRecord,
  type TrainingFunderType,
  type TrainingProgramRecord,
  type TrainingSessionRecord,
  type TrainingTraineeRecord
} from '../features/training/types';
import { closeFileWindow, prepareFileWindow, showBlobDownload } from '../lib/browserFiles';
import { readJsonStorage, writeJsonStorage } from '../lib/safeStorage';
import { supabase } from '../lib/supabase';

type Tab = 'documents' | 'customers' | 'funders';
type Editor = 'document' | 'customer' | 'funder' | null;

type CustomerForm = {
  customerType: TrainingCustomerType;
  legalName: string;
  contactName: string;
  email: string;
  phone: string;
  billingAddress: string;
  postalCode: string;
  city: string;
  siret: string;
  vatNumber: string;
  notes: string;
  siteId: string;
};

type FunderForm = {
  funderType: TrainingFunderType;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  billingAddress: string;
  postalCode: string;
  city: string;
  referenceCode: string;
  notes: string;
};

type DocumentForm = {
  documentType: TrainingCommercialDocumentType;
  title: string;
  trainingSummary: string;
  customerId: string;
  funderId: string;
  sessionId: string;
  traineeId: string;
  programId: string;
  participantCount: string;
  issueDate: string;
  validUntil: string;
  amountExclTax: string;
  vatRate: string;
  notes: string;
  terms: string;
  siteId: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const inThirtyDays = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
};

const emptyCustomer: CustomerForm = {
  customerType: 'company', legalName: '', contactName: '', email: '', phone: '', billingAddress: '', postalCode: '', city: '', siret: '', vatNumber: '', notes: '', siteId: ''
};
const emptyFunder: FunderForm = {
  funderType: 'opco', name: '', contactName: '', email: '', phone: '', billingAddress: '', postalCode: '', city: '', referenceCode: '', notes: ''
};
const emptyDocument: DocumentForm = {
  documentType: 'quote', title: '', trainingSummary: '', customerId: '', funderId: '', sessionId: '', traineeId: '', programId: '', participantCount: '1', issueDate: today(), validUntil: inThirtyDays(), amountExclTax: '0', vatRate: '20', notes: '', terms: 'Conditions de règlement et modalités d’exécution à convenir entre les parties.', siteId: ''
};

function moneyToCents(value: string) {
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : Number.NaN;
}

function dateLabel(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`));
}

function statusClass(status: TrainingCommercialDocumentStatus) {
  if (['accepted', 'signed', 'completed'].includes(status)) return 'active';
  if (['refused', 'canceled'].includes(status)) return 'inactive';
  return 'pending';
}

function readRows<T>(key: string): T[] {
  return readJsonStorage<T[]>(key, []);
}

export function TrainingCommercialPage() {
  const { organization, sites, activeSiteId } = useOrganization();
  const { user, demoMode } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('documents');
  const [editor, setEditor] = useState<Editor>(searchParams.get('new') === '1' ? 'document' : null);
  const [customers, setCustomers] = useState<TrainingCustomerRecord[]>([]);
  const [funders, setFunders] = useState<TrainingFunderRecord[]>([]);
  const [documents, setDocuments] = useState<TrainingCommercialDocumentRecord[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionRecord[]>([]);
  const [trainees, setTrainees] = useState<TrainingTraineeRecord[]>([]);
  const [programs, setPrograms] = useState<TrainingProgramRecord[]>([]);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomer);
  const [funderForm, setFunderForm] = useState<FunderForm>(emptyFunder);
  const [documentForm, setDocumentForm] = useState<DocumentForm>(emptyDocument);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const multiSiteEnabled = organization ? organizationHasFeature(organization, 'multi_site') : false;

  useEffect(() => {
    if (!organization) return;
    setCustomerForm((current) => ({ ...current, siteId: current.siteId || activeSiteId || sites[0]?.id || '' }));
    setDocumentForm((current) => ({ ...current, siteId: current.siteId || activeSiteId || sites[0]?.id || '' }));
  }, [organization, activeSiteId, sites]);

  useEffect(() => {
    if (!organization) return;
    let active = true;
    const organizationId = organization.id;
    async function load() {
      setLoading(true); setError('');
      if (demoMode || !supabase) {
        if (!active) return;
        setCustomers(readRows<TrainingCustomerRecord>(`ncr-suite-training-customers-${organizationId}`));
        setFunders(readRows<TrainingFunderRecord>(`ncr-suite-training-funders-${organizationId}`));
        setDocuments(readRows<TrainingCommercialDocumentRecord>(`ncr-suite-training-commercial-${organizationId}`));
        setSessions(readRows<TrainingSessionRecord>(`ncr-suite-training-sessions-${organizationId}`));
        setTrainees(readRows<TrainingTraineeRecord>(`ncr-suite-training-trainees-${organizationId}`));
        setPrograms(readRows<TrainingProgramRecord>(`ncr-suite-training-programs-${organizationId}`));
        setLoading(false);
        return;
      }
      let customerRequest = supabase.from('training_customers').select('id,organization_id,site_id,customer_type,legal_name,contact_name,email,phone,billing_address,postal_code,city,siret,vat_number,notes,status,created_at,updated_at').eq('organization_id', organizationId).neq('status', 'archived').order('legal_name');
      let documentRequest = supabase.from('training_commercial_documents').select('id,organization_id,site_id,customer_id,funder_id,session_id,trainee_id,program_id,document_type,reference,title,training_summary,participant_count,issue_date,valid_until,status,amount_excl_tax_cents,vat_rate_basis_points,tax_cents,amount_incl_tax_cents,notes,terms,sent_at,accepted_at,signed_at,signed_document_path,signed_document_received_at,signed_document_received_by,generated_document_path,generated_document_name,generated_at,email_queued_at,emailed_at,last_email_recipient,last_email_outbox_id,created_at,updated_at').eq('organization_id', organizationId).order('created_at', { ascending: false });
      let sessionRequest = supabase.from('training_sessions').select('id,organization_id,site_id,program_id,trainer_id,title,starts_at,ends_at,capacity,location,modality,status,notes,closed_at,closed_by,closure_notes,reopened_at,reopened_by,source_commercial_document_id,validated_at,validated_by,created_at').eq('organization_id', organizationId).neq('status', 'canceled').order('starts_at', { ascending: false });
      if (activeSiteId) {
        const siteScope = `site_id.is.null,site_id.eq.${activeSiteId}`;
        customerRequest = customerRequest.or(siteScope);
        documentRequest = documentRequest.or(siteScope);
        sessionRequest = sessionRequest.or(siteScope);
      }
      const [customerResult, funderResult, documentResult, sessionResult, traineeResult, programResult] = await Promise.all([
        customerRequest,
        supabase.from('training_funders').select('id,organization_id,funder_type,name,contact_name,email,phone,billing_address,postal_code,city,reference_code,notes,status,created_at,updated_at').eq('organization_id', organizationId).neq('status', 'archived').order('name'),
        documentRequest,
        sessionRequest,
        supabase.from('training_trainees').select('id,organization_id,first_name,last_name,email,phone,company,notes,status,created_at').eq('organization_id', organizationId).eq('status', 'active').order('last_name'),
        supabase.from('training_programs').select('id,organization_id,site_id,title,code,duration_hours,modality,objectives,description,audience,prerequisites,detailed_program,teaching_methods,training_resources,assessment_methods,accessibility,price_excl_tax_cents,vat_rate_basis_points,default_capacity,default_location,completion_status,status,created_at,updated_at').eq('organization_id', organizationId).neq('status', 'archived').order('title')
      ]);
      if (!active) return;
      const firstError = customerResult.error || funderResult.error || documentResult.error || sessionResult.error || traineeResult.error || programResult.error;
      if (firstError) setError(`Chargement impossible : ${firstError.message}`);
      else {
        setCustomers((customerResult.data ?? []) as TrainingCustomerRecord[]);
        setFunders((funderResult.data ?? []) as TrainingFunderRecord[]);
        setDocuments((documentResult.data ?? []).map((row) => ({
          ...row,
          participant_count: Number(row.participant_count), amount_excl_tax_cents: Number(row.amount_excl_tax_cents), vat_rate_basis_points: Number(row.vat_rate_basis_points), tax_cents: Number(row.tax_cents), amount_incl_tax_cents: Number(row.amount_incl_tax_cents)
        })) as TrainingCommercialDocumentRecord[]);
        setSessions((sessionResult.data ?? []) as TrainingSessionRecord[]);
        setTrainees((traineeResult.data ?? []) as TrainingTraineeRecord[]);
        setPrograms((programResult.data ?? []).map((row) => ({ ...row, duration_hours: Number(row.duration_hours), price_excl_tax_cents: Number(row.price_excl_tax_cents), vat_rate_basis_points: Number(row.vat_rate_basis_points), default_capacity: Number(row.default_capacity) })) as TrainingProgramRecord[]);
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [organization, activeSiteId, demoMode]);

  const customerById = useMemo(() => new Map(customers.map((row) => [row.id, row])), [customers]);
  const funderById = useMemo(() => new Map(funders.map((row) => [row.id, row])), [funders]);
  const sessionById = useMemo(() => new Map(sessions.map((row) => [row.id, row])), [sessions]);
  const traineeById = useMemo(() => new Map(trainees.map((row) => [row.id, row])), [trainees]);
  const programById = useMemo(() => new Map(programs.map((row) => [row.id, row])), [programs]);


  useEffect(() => {
    const requestedProgram = searchParams.get('program');
    if (searchParams.get('new') === '1' && requestedProgram && programs.length > 0) {
      const program = programById.get(requestedProgram);
      if (program) {
        setEditor('document');
        setDocumentForm((current) => ({
          ...current,
          programId: program.id,
          title: program.title,
          trainingSummary: program.description || program.objectives || '',
          participantCount: String(program.default_capacity),
          amountExclTax: String(program.price_excl_tax_cents / 100).replace('.', ','),
          vatRate: String(program.vat_rate_basis_points / 100).replace('.', ','),
          siteId: program.site_id || current.siteId,
          terms: organization?.training_default_terms || current.terms
        }));
      }
    }
  }, [searchParams, programs, programById, organization?.training_default_terms]);

  const filteredDocuments = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    if (!needle) return documents;
    return documents.filter((row) => [row.reference, row.title, row.training_summary, customerById.get(row.customer_id ?? '')?.legal_name, funderById.get(row.funder_id ?? '')?.name]
      .filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(needle));
  }, [documents, query, customerById, funderById]);
  const filteredCustomers = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    if (!needle) return customers;
    return customers.filter((row) => [row.legal_name, row.contact_name, row.email, row.phone, row.city, row.siret].filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(needle));
  }, [customers, query]);
  const filteredFunders = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    if (!needle) return funders;
    return funders.filter((row) => [row.name, row.contact_name, row.email, row.reference_code].filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(needle));
  }, [funders, query]);

  const totals = useMemo(() => ({
    open: documents.filter((row) => ['draft', 'sent'].includes(row.status)).length,
    accepted: documents.filter((row) => ['accepted', 'signed', 'completed'].includes(row.status)).length,
    value: documents.filter((row) => !['refused', 'canceled'].includes(row.status)).reduce((sum, row) => sum + row.amount_excl_tax_cents, 0)
  }), [documents]);

  function closeEditor() {
    setEditor(null); setSearchParams({}); setError('');
  }

  function openEditor(next: Exclude<Editor, null>) {
    setEditor(next); setError(''); setSuccess('');
    if (next === 'document') {
      const requestedProgram = programById.get(searchParams.get('program') ?? '');
      setDocumentForm({
        ...emptyDocument,
        siteId: activeSiteId || sites[0]?.id || '',
        programId: requestedProgram?.id ?? '',
        title: requestedProgram?.title ?? '',
        trainingSummary: requestedProgram?.description || requestedProgram?.objectives || '',
        participantCount: requestedProgram ? String(requestedProgram.default_capacity) : '1',
        amountExclTax: requestedProgram ? String(requestedProgram.price_excl_tax_cents / 100).replace('.', ',') : '0',
        vatRate: requestedProgram ? String(requestedProgram.vat_rate_basis_points / 100).replace('.', ',') : '20',
        terms: organization?.training_default_terms || emptyDocument.terms
      });
    }
    if (next === 'customer') setCustomerForm({ ...emptyCustomer, siteId: activeSiteId || sites[0]?.id || '' });
    if (next === 'funder') setFunderForm(emptyFunder);
  }

  async function saveCustomer(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !canManage) return;
    if (customerForm.legalName.trim().length < 2) { setError('Renseigne le nom de l’entreprise ou du client.'); return; }
    setSaving(true); setError(''); setSuccess('');
    const payload = {
      organization_id: organization.id,
      site_id: multiSiteEnabled ? nullableText(customerForm.siteId) : null,
      customer_type: customerForm.customerType,
      legal_name: customerForm.legalName.trim(),
      contact_name: nullableText(customerForm.contactName), email: nullableText(customerForm.email), phone: nullableText(customerForm.phone),
      billing_address: nullableText(customerForm.billingAddress), postal_code: nullableText(customerForm.postalCode), city: nullableText(customerForm.city),
      siret: nullableText(customerForm.siret), vat_number: nullableText(customerForm.vatNumber), notes: nullableText(customerForm.notes), created_by: user.id
    };
    try {
      let created: TrainingCustomerRecord;
      if (demoMode || !supabase) {
        created = { id: crypto.randomUUID(), ...payload, status: 'active', created_at: new Date().toISOString() };
        const next = [...customers, created];
        writeJsonStorage(`ncr-suite-training-customers-${organization.id}`, next);
      } else {
        const { data, error: insertError } = await supabase.from('training_customers').insert(payload).select('id,organization_id,site_id,customer_type,legal_name,contact_name,email,phone,billing_address,postal_code,city,siret,vat_number,notes,status,created_at,updated_at').single();
        if (insertError) throw insertError;
        if (!data) throw new Error('Le client créé n’a pas été retourné par Supabase.');
        created = data as TrainingCustomerRecord;
      }
      setCustomers((current) => [...current, created].sort((a, b) => a.legal_name.localeCompare(b.legal_name, 'fr')));
      setSuccess('Le client a été ajouté.'); closeEditor(); setTab('customers');
    } catch (caught) { setError(`Création impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setSaving(false); }
  }

  async function saveFunder(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !canManage) return;
    if (funderForm.name.trim().length < 2) { setError('Renseigne le nom du financeur.'); return; }
    setSaving(true); setError(''); setSuccess('');
    const payload = {
      organization_id: organization.id, funder_type: funderForm.funderType, name: funderForm.name.trim(),
      contact_name: nullableText(funderForm.contactName), email: nullableText(funderForm.email), phone: nullableText(funderForm.phone),
      billing_address: nullableText(funderForm.billingAddress), postal_code: nullableText(funderForm.postalCode), city: nullableText(funderForm.city),
      reference_code: nullableText(funderForm.referenceCode), notes: nullableText(funderForm.notes), created_by: user.id
    };
    try {
      let created: TrainingFunderRecord;
      if (demoMode || !supabase) {
        created = { id: crypto.randomUUID(), ...payload, status: 'active', created_at: new Date().toISOString() };
        writeJsonStorage(`ncr-suite-training-funders-${organization.id}`, [...funders, created]);
      } else {
        const { data, error: insertError } = await supabase.from('training_funders').insert(payload).select('id,organization_id,funder_type,name,contact_name,email,phone,billing_address,postal_code,city,reference_code,notes,status,created_at,updated_at').single();
        if (insertError) throw insertError;
        if (!data) throw new Error('Le financeur créé n’a pas été retourné par Supabase.');
        created = data as TrainingFunderRecord;
      }
      setFunders((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name, 'fr')));
      setSuccess('Le financeur a été ajouté.'); closeEditor(); setTab('funders');
    } catch (caught) { setError(`Création impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setSaving(false); }
  }

  async function saveDocument(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !canManage) return;
    const amount = moneyToCents(documentForm.amountExclTax);
    const vatRate = Number(documentForm.vatRate.replace(',', '.'));
    const participantCount = Number(documentForm.participantCount);
    if (documentForm.title.trim().length < 2) { setError('Renseigne l’objet du dossier.'); return; }
    const selectedProgram = programById.get(documentForm.programId);
    if (!selectedProgram) { setError('Sélectionne une formation complète.'); return; }
    if (!trainingProgramCompletion(selectedProgram).ready) { setError('La fiche formation doit être complète avant de créer une proposition.'); return; }
    if (!Number.isFinite(amount) || amount < 0) { setError('Le montant HT est invalide.'); return; }
    if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) { setError('Le taux de TVA est invalide.'); return; }
    if (!Number.isInteger(participantCount) || participantCount < 1) { setError('Le nombre de participants est invalide.'); return; }
    if (!documentForm.customerId && !documentForm.traineeId) { setError('Sélectionne un client ou un stagiaire bénéficiaire.'); return; }
    setSaving(true); setError(''); setSuccess('');
    const payload = {
      organization_id: organization.id,
      site_id: multiSiteEnabled ? nullableText(documentForm.siteId) : null,
      customer_id: nullableText(documentForm.customerId), funder_id: nullableText(documentForm.funderId), session_id: nullableText(documentForm.sessionId), trainee_id: nullableText(documentForm.traineeId), program_id: documentForm.programId,
      document_type: documentForm.documentType, title: documentForm.title.trim(), training_summary: nullableText(documentForm.trainingSummary), participant_count: participantCount,
      issue_date: documentForm.issueDate, valid_until: nullableText(documentForm.validUntil), amount_excl_tax_cents: amount, vat_rate_basis_points: Math.round(vatRate * 100),
      notes: nullableText(documentForm.notes), terms: nullableText(documentForm.terms), created_by: user.id
    };
    try {
      let created: TrainingCommercialDocumentRecord;
      if (demoMode || !supabase) {
        const tax = Math.round(amount * Math.round(vatRate * 100) / 10000);
        created = { id: crypto.randomUUID(), ...payload, reference: `${documentForm.documentType === 'quote' ? 'DEV' : documentForm.documentType === 'agreement' ? 'CONV' : 'CTR'}-${new Date().getFullYear()}-${String(documents.length + 1).padStart(4, '0')}`, status: 'draft', tax_cents: tax, amount_incl_tax_cents: amount + tax, sent_at: null, accepted_at: null, signed_at: null, signed_document_path: null, signed_document_received_at: null, signed_document_received_by: null, generated_document_path: null, generated_document_name: null, generated_at: null, email_queued_at: null, emailed_at: null, last_email_recipient: null, last_email_outbox_id: null, created_at: new Date().toISOString() };
        writeJsonStorage(`ncr-suite-training-commercial-${organization.id}`, [created, ...documents]);
      } else {
        const { data, error: insertError } = await supabase.from('training_commercial_documents').insert(payload).select('id,organization_id,site_id,customer_id,funder_id,session_id,trainee_id,program_id,document_type,reference,title,training_summary,participant_count,issue_date,valid_until,status,amount_excl_tax_cents,vat_rate_basis_points,tax_cents,amount_incl_tax_cents,notes,terms,sent_at,accepted_at,signed_at,signed_document_path,signed_document_received_at,signed_document_received_by,generated_document_path,generated_document_name,generated_at,email_queued_at,emailed_at,last_email_recipient,last_email_outbox_id,created_at,updated_at').single();
        if (insertError) throw insertError;
        if (!data) throw new Error('Le dossier créé n’a pas été retourné par Supabase.');
        created = { ...(data as TrainingCommercialDocumentRecord), participant_count: Number(data.participant_count), amount_excl_tax_cents: Number(data.amount_excl_tax_cents), vat_rate_basis_points: Number(data.vat_rate_basis_points), tax_cents: Number(data.tax_cents), amount_incl_tax_cents: Number(data.amount_incl_tax_cents) };
      }
      setDocuments((current) => [created, ...current]);
      setSuccess(`${trainingCommercialDocumentTypeLabels[created.document_type]} ${created.reference} créé.`); closeEditor(); setTab('documents');
    } catch (caught) { setError(`Création impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setSaving(false); }
  }

  async function updateDocumentStatus(row: TrainingCommercialDocumentRecord, status: TrainingCommercialDocumentStatus) {
    if (!organization || !canManage) return;
    setBusyId(row.id); setError(''); setSuccess('');
    try {
      const timestamp = new Date().toISOString();
      const patch: Partial<TrainingCommercialDocumentRecord> = { status };
      if (status === 'sent') patch.sent_at = timestamp;
      if (status === 'accepted') patch.accepted_at = timestamp;
      if (status === 'signed') patch.signed_at = timestamp;
      if (demoMode || !supabase) {
        const next = documents.map((item) => item.id === row.id ? { ...item, ...patch } : item);
        writeJsonStorage(`ncr-suite-training-commercial-${organization.id}`, next);
      } else {
        const { error: updateError } = await supabase.from('training_commercial_documents').update(patch).eq('organization_id', organization.id).eq('id', row.id);
        if (updateError) throw updateError;
      }
      setDocuments((current) => current.map((item) => item.id === row.id ? { ...item, ...patch } : item));
      setSuccess(`Statut mis à jour : ${trainingCommercialDocumentStatusLabels[status]}.`);
    } catch (caught) { setError(`Mise à jour impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setBusyId(''); }
  }

  async function uploadSignedDocument(row: TrainingCommercialDocumentRecord, file: File) {
    if (!organization || !user || !canManage) return;
    if (file.size > 20 * 1024 * 1024) { setError('Le document signé ne doit pas dépasser 20 Mo.'); return; }
    setBusyId(row.id); setError(''); setSuccess('');
    try {
      const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf';
      const path = `${organization.id}/commercial/signes/${row.id}-${Date.now()}.${extension}`;
      const timestamp = new Date().toISOString();
      const patch = { status: 'signed' as const, signed_at: timestamp, signed_document_path: path, signed_document_received_at: timestamp, signed_document_received_by: user.id };
      if (demoMode || !supabase) {
        const next = documents.map((item) => item.id === row.id ? { ...item, ...patch } : item);
        writeJsonStorage(`ncr-suite-training-commercial-${organization.id}`, next);
      } else {
        const { error: uploadError } = await supabase.storage.from('training-documents').upload(path, file, { contentType: file.type || 'application/pdf', upsert: true });
        if (uploadError) throw uploadError;
        const { error: updateError } = await supabase.from('training_commercial_documents').update(patch).eq('organization_id', organization.id).eq('id', row.id);
        if (updateError) throw updateError;
      }
      setDocuments((current) => current.map((item) => item.id === row.id ? { ...item, ...patch } : item));
      setSuccess(`${row.reference} est marqué comme signé. Tu peux maintenant créer la session.`);
    } catch (caught) { setError(`Import impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setBusyId(''); }
  }

  function resolveCommercialRecipient(row: TrainingCommercialDocumentRecord) {
    const customer = customerById.get(row.customer_id ?? '');
    const trainee = traineeById.get(row.trainee_id ?? '');
    const funder = funderById.get(row.funder_id ?? '');
    const candidates = row.document_type === 'contract'
      ? [
          { kind: 'trainee' as const, email: trainee?.email, name: trainee ? personName(trainee.first_name, trainee.last_name) : '' },
          { kind: 'customer' as const, email: customer?.email, name: customer?.contact_name || customer?.legal_name || '' },
          { kind: 'funder' as const, email: funder?.email, name: funder?.contact_name || funder?.name || '' }
        ]
      : [
          { kind: 'customer' as const, email: customer?.email, name: customer?.contact_name || customer?.legal_name || '' },
          { kind: 'trainee' as const, email: trainee?.email, name: trainee ? personName(trainee.first_name, trainee.last_name) : '' },
          { kind: 'funder' as const, email: funder?.email, name: funder?.contact_name || funder?.name || '' }
        ];
    return candidates.find((candidate) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(candidate.email ?? '').trim())) ?? null;
  }

  async function sendCommercialDocument(row: TrainingCommercialDocumentRecord) {
    if (!organization || !canManage) return;
    const recipient = resolveCommercialRecipient(row);
    if (!recipient) {
      setError('Aucune adresse e-mail valide n’est disponible pour ce dossier. Complète le client, le stagiaire ou le financeur.');
      return;
    }
    const label = trainingCommercialDocumentTypeLabels[row.document_type];
    if (!window.confirm(`${row.email_queued_at ? 'Renvoyer' : 'Envoyer'} ${label.toLowerCase()} ${row.reference} à ${recipient.email} ?`)) return;
    setBusyId(row.id); setError(''); setSuccess('');
    try {
      const generated = await generateTrainingCommercialPdf({
        organization,
        document: row,
        customer: customerById.get(row.customer_id ?? '') ?? null,
        funder: funderById.get(row.funder_id ?? '') ?? null,
        session: sessionById.get(row.session_id ?? '') ?? null,
        trainee: traineeById.get(row.trainee_id ?? '') ?? null,
        program: programById.get(row.program_id ?? '') ?? null
      });
      const now = new Date().toISOString();
      const nextStatus: TrainingCommercialDocumentStatus = row.status === 'draft' ? 'sent' : row.status;
      if (demoMode || !supabase) {
        const patch: Partial<TrainingCommercialDocumentRecord> = {
          status: nextStatus,
          sent_at: row.sent_at || now,
          generated_document_name: generated.filename,
          generated_at: now,
          email_queued_at: now,
          emailed_at: now,
          last_email_recipient: String(recipient.email)
        };
        const next = documents.map((item) => item.id === row.id ? { ...item, ...patch } : item);
        setDocuments(next);
        writeJsonStorage(`ncr-suite-training-commercial-${organization.id}`, next);
      } else {
        const safeTimestamp = Date.now();
        const storagePath = `${organization.id}/commercial/generated/${row.id}/${safeTimestamp}-${generated.filename}`;
        const { error: uploadError } = await supabase.storage.from('training-documents').upload(storagePath, generated.blob, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: false
        });
        if (uploadError) throw uploadError;
        const { data: queueResult, error: queueError } = await supabase.rpc('queue_training_commercial_document_email', {
          p_organization_id: organization.id,
          p_document_id: row.id,
          p_recipient_kind: recipient.kind,
          p_attachment_path: storagePath,
          p_attachment_name: generated.filename,
          p_force: Boolean(row.email_queued_at)
        });
        if (queueError) throw queueError;
        const result = (queueResult ?? {}) as { outbox_id?: string; recipient_email?: string };
        setDocuments((current) => current.map((item) => item.id === row.id ? {
          ...item,
          status: nextStatus,
          sent_at: item.sent_at || now,
          generated_document_path: storagePath,
          generated_document_name: generated.filename,
          generated_at: now,
          email_queued_at: now,
          last_email_recipient: result.recipient_email || String(recipient.email),
          last_email_outbox_id: result.outbox_id || null
        } : item));
      }
      setSuccess(`${label} ${row.reference} placé dans la file Brevo pour ${recipient.email}.`);
    } catch (caught) {
      setError(`Envoi impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setBusyId(''); }
  }

  async function archiveEntity(kind: 'customer' | 'funder', id: string, label: string) {
    if (!organization || !canManage || !window.confirm(`Archiver « ${label} » ?`)) return;
    setBusyId(id); setError('');
    try {
      const table = kind === 'customer' ? 'training_customers' : 'training_funders';
      if (demoMode || !supabase) {
        if (kind === 'customer') {
          const next = customers.filter((row) => row.id !== id); setCustomers(next); writeJsonStorage(`ncr-suite-training-customers-${organization.id}`, next);
        } else {
          const next = funders.filter((row) => row.id !== id); setFunders(next); writeJsonStorage(`ncr-suite-training-funders-${organization.id}`, next);
        }
      } else {
        const { error: updateError } = await supabase.from(table).update({ status: 'archived' }).eq('organization_id', organization.id).eq('id', id);
        if (updateError) throw updateError;
        if (kind === 'customer') setCustomers((current) => current.filter((row) => row.id !== id));
        else setFunders((current) => current.filter((row) => row.id !== id));
      }
      setSuccess('Élément archivé.');
    } catch (caught) { setError(`Archivage impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setBusyId(''); }
  }

  async function downloadPdf(row: TrainingCommercialDocumentRecord) {
    if (!organization) return;
    const fileWindow = prepareFileWindow(`${trainingCommercialDocumentTypeLabels[row.document_type]} ${row.reference}`, 'NCR Suite prépare le document…');
    try {
      const result = await generateTrainingCommercialPdf({
        organization, document: row, customer: customerById.get(row.customer_id ?? '') ?? null, funder: funderById.get(row.funder_id ?? '') ?? null,
        session: sessionById.get(row.session_id ?? '') ?? null, trainee: traineeById.get(row.trainee_id ?? '') ?? null,
        program: programById.get(row.program_id ?? '') ?? null
      });
      const url = URL.createObjectURL(result.blob);
      showBlobDownload(fileWindow, url, result.filename, `${trainingCommercialDocumentTypeLabels[row.document_type]} prêt`);
      window.setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (caught) {
      closeFileWindow(fileWindow);
      setError(`PDF impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    }
  }

  if (!organization) return null;

  return (
    <div className="page training-page training-commercial-page">
      <header className="page-header">
        <div><p className="eyebrow">FORMATION · ADMINISTRATION COMMERCIALE</p><h1>Commercial & financeurs</h1><p>Centralisez les entreprises clientes, les prises en charge et les documents reliés aux sessions.</p></div>
        {canManage && <button className="primary-button" type="button" onClick={() => openEditor(tab === 'customers' ? 'customer' : tab === 'funders' ? 'funder' : 'document')}><Icon name="plus" size={18} />{tab === 'customers' ? 'Ajouter un client' : tab === 'funders' ? 'Ajouter un financeur' : 'Créer un dossier'}</button>}
      </header>

      <section className="training-commercial-metrics">
        <article><span><Icon name="file" size={20} /></span><div><small>Dossiers ouverts</small><strong>{totals.open}</strong></div></article>
        <article><span><Icon name="check" size={20} /></span><div><small>Acceptés ou signés</small><strong>{totals.accepted}</strong></div></article>
        <article><span><Icon name="creditCard" size={20} /></span><div><small>Montant HT suivi</small><strong>{formatTrainingMoney(totals.value)}</strong></div></article>
        <article><span><Icon name="building" size={20} /></span><div><small>Clients / financeurs</small><strong>{customers.length} / {funders.length}</strong></div></article>
      </section>

      <div className="training-commercial-tabs" role="tablist" aria-label="Administration commerciale">
        <button type="button" className={tab === 'documents' ? 'active' : ''} onClick={() => { setTab('documents'); setQuery(''); }}><Icon name="file" size={17} />Dossiers</button>
        <button type="button" className={tab === 'customers' ? 'active' : ''} onClick={() => { setTab('customers'); setQuery(''); }}><Icon name="building" size={17} />Entreprises</button>
        <button type="button" className={tab === 'funders' ? 'active' : ''} onClick={() => { setTab('funders'); setQuery(''); }}><Icon name="creditCard" size={17} />Financeurs</button>
      </div>

      {editor && (
        <section className="panel training-form-panel training-commercial-editor">
          <div className="panel-header"><div><p className="eyebrow">NOUVEAU</p><h2>{editor === 'document' ? 'Dossier commercial' : editor === 'customer' ? 'Entreprise cliente' : 'Financeur'}</h2></div><button className="secondary-button compact-button" type="button" onClick={closeEditor}>Fermer</button></div>
          {editor === 'customer' && <form className="training-form-grid" onSubmit={saveCustomer}>
            <label>Type<select value={customerForm.customerType} onChange={(event) => setCustomerForm({ ...customerForm, customerType: event.target.value as TrainingCustomerType })}><option value="company">Entreprise</option><option value="individual">Particulier</option></select></label>
            <label>Nom / raison sociale *<input autoFocus required value={customerForm.legalName} onChange={(event) => setCustomerForm({ ...customerForm, legalName: event.target.value })} /></label>
            <label>Contact principal<input value={customerForm.contactName} onChange={(event) => setCustomerForm({ ...customerForm, contactName: event.target.value })} /></label>
            <label>E-mail<input type="email" value={customerForm.email} onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })} /></label>
            <label>Téléphone<input value={customerForm.phone} onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })} /></label>
            <label>SIRET<input value={customerForm.siret} onChange={(event) => setCustomerForm({ ...customerForm, siret: event.target.value })} /></label>
            <label>N° TVA<input value={customerForm.vatNumber} onChange={(event) => setCustomerForm({ ...customerForm, vatNumber: event.target.value })} /></label>
            {multiSiteEnabled && <label>Établissement<select value={customerForm.siteId} onChange={(event) => setCustomerForm({ ...customerForm, siteId: event.target.value })}><option value="">Global</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>}
            <label className="full-field">Adresse de facturation<input value={customerForm.billingAddress} onChange={(event) => setCustomerForm({ ...customerForm, billingAddress: event.target.value })} /></label>
            <label>Code postal<input value={customerForm.postalCode} onChange={(event) => setCustomerForm({ ...customerForm, postalCode: event.target.value })} /></label>
            <label>Ville<input value={customerForm.city} onChange={(event) => setCustomerForm({ ...customerForm, city: event.target.value })} /></label>
            <label className="full-field">Notes<textarea rows={3} value={customerForm.notes} onChange={(event) => setCustomerForm({ ...customerForm, notes: event.target.value })} /></label>
            <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={closeEditor}>Annuler</button><button className="primary-button" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
          </form>}
          {editor === 'funder' && <form className="training-form-grid" onSubmit={saveFunder}>
            <label>Type<select value={funderForm.funderType} onChange={(event) => setFunderForm({ ...funderForm, funderType: event.target.value as TrainingFunderType })}>{Object.entries(trainingFunderTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Nom du financeur *<input autoFocus required value={funderForm.name} onChange={(event) => setFunderForm({ ...funderForm, name: event.target.value })} /></label>
            <label>Contact<input value={funderForm.contactName} onChange={(event) => setFunderForm({ ...funderForm, contactName: event.target.value })} /></label>
            <label>Référence / code<input value={funderForm.referenceCode} onChange={(event) => setFunderForm({ ...funderForm, referenceCode: event.target.value })} placeholder="Ex. dossier OPCO" /></label>
            <label>E-mail<input type="email" value={funderForm.email} onChange={(event) => setFunderForm({ ...funderForm, email: event.target.value })} /></label>
            <label>Téléphone<input value={funderForm.phone} onChange={(event) => setFunderForm({ ...funderForm, phone: event.target.value })} /></label>
            <label className="full-field">Adresse<input value={funderForm.billingAddress} onChange={(event) => setFunderForm({ ...funderForm, billingAddress: event.target.value })} /></label>
            <label>Code postal<input value={funderForm.postalCode} onChange={(event) => setFunderForm({ ...funderForm, postalCode: event.target.value })} /></label>
            <label>Ville<input value={funderForm.city} onChange={(event) => setFunderForm({ ...funderForm, city: event.target.value })} /></label>
            <label className="full-field">Notes<textarea rows={3} value={funderForm.notes} onChange={(event) => setFunderForm({ ...funderForm, notes: event.target.value })} /></label>
            <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={closeEditor}>Annuler</button><button className="primary-button" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
          </form>}
          {editor === 'document' && <form className="training-form-grid" onSubmit={saveDocument}>
            <label>Document<select value={documentForm.documentType} onChange={(event) => setDocumentForm({ ...documentForm, documentType: event.target.value as TrainingCommercialDocumentType })}>{Object.entries(trainingCommercialDocumentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Objet *<input autoFocus required value={documentForm.title} onChange={(event) => setDocumentForm({ ...documentForm, title: event.target.value })} placeholder="Ex. Formation SST interentreprises" /></label>
            <label className="full-field">Formation complète *<select required value={documentForm.programId} onChange={(event) => { const program = programById.get(event.target.value); setDocumentForm({ ...documentForm, programId: event.target.value, title: program?.title || documentForm.title, trainingSummary: program?.description || program?.objectives || '', participantCount: program ? String(program.default_capacity) : documentForm.participantCount, amountExclTax: program ? String(program.price_excl_tax_cents / 100).replace('.', ',') : documentForm.amountExclTax, vatRate: program ? String(program.vat_rate_basis_points / 100).replace('.', ',') : documentForm.vatRate, siteId: program?.site_id || documentForm.siteId }); }}><option value="">Sélectionner une formation</option>{programs.map((program) => <option key={program.id} value={program.id} disabled={!trainingProgramCompletion(program).ready}>{program.title}{trainingProgramCompletion(program).ready ? '' : ' · à compléter'}</option>)}</select></label>
            <label>Entreprise cliente<select value={documentForm.customerId} onChange={(event) => setDocumentForm({ ...documentForm, customerId: event.target.value })}><option value="">Aucune / particulier</option>{customers.map((row) => <option key={row.id} value={row.id}>{row.legal_name}</option>)}</select></label>
            <label>Stagiaire bénéficiaire<select value={documentForm.traineeId} onChange={(event) => setDocumentForm({ ...documentForm, traineeId: event.target.value })}><option value="">Non nominatif</option>{trainees.map((row) => <option key={row.id} value={row.id}>{personName(row.first_name, row.last_name)}</option>)}</select></label>
            <label>Financeur<select value={documentForm.funderId} onChange={(event) => setDocumentForm({ ...documentForm, funderId: event.target.value })}><option value="">Sans financeur</option>{funders.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label>Session<select value={documentForm.sessionId} onChange={(event) => { const session = sessionById.get(event.target.value); const program = session ? programById.get(session.program_id) : null; setDocumentForm({ ...documentForm, sessionId: event.target.value, programId: program?.id || documentForm.programId, title: documentForm.title || session?.title || '', trainingSummary: documentForm.trainingSummary || program?.description || program?.objectives || session?.title || '' }); }}><option value="">Dossier hors session</option>{sessions.map((row) => <option key={row.id} value={row.id}>{row.title} · {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(row.starts_at))}</option>)}</select></label>
            {multiSiteEnabled && <label>Établissement<select value={documentForm.siteId} onChange={(event) => setDocumentForm({ ...documentForm, siteId: event.target.value })}><option value="">Global</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>}
            <label>Participants<input type="number" min="1" value={documentForm.participantCount} onChange={(event) => setDocumentForm({ ...documentForm, participantCount: event.target.value })} /></label>
            <label>Date d’émission<input type="date" required value={documentForm.issueDate} onChange={(event) => setDocumentForm({ ...documentForm, issueDate: event.target.value })} /></label>
            <label>Valable jusqu’au<input type="date" value={documentForm.validUntil} onChange={(event) => setDocumentForm({ ...documentForm, validUntil: event.target.value })} /></label>
            <label>Montant HT (€)<input inputMode="decimal" value={documentForm.amountExclTax} onChange={(event) => setDocumentForm({ ...documentForm, amountExclTax: event.target.value })} /></label>
            <label>TVA (%)<input inputMode="decimal" value={documentForm.vatRate} onChange={(event) => setDocumentForm({ ...documentForm, vatRate: event.target.value })} /></label>
            <label className="full-field">Résumé de la formation<textarea rows={3} value={documentForm.trainingSummary} onChange={(event) => setDocumentForm({ ...documentForm, trainingSummary: event.target.value })} /></label>
            <label className="full-field">Notes<textarea rows={3} value={documentForm.notes} onChange={(event) => setDocumentForm({ ...documentForm, notes: event.target.value })} /></label>
            <label className="full-field">Conditions<textarea rows={4} value={documentForm.terms} onChange={(event) => setDocumentForm({ ...documentForm, terms: event.target.value })} /></label>
            <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={closeEditor}>Annuler</button><button className="primary-button" disabled={saving}>{saving ? 'Création…' : 'Créer le dossier'}</button></div>
          </form>}
        </section>
      )}

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      <section className="panel training-commercial-list">
        <div className="training-toolbar"><div><p className="eyebrow">{tab === 'documents' ? 'SUIVI COMMERCIAL' : tab === 'customers' ? 'PORTEFEUILLE CLIENTS' : 'PRISES EN CHARGE'}</p><h2>{tab === 'documents' ? `${documents.length} dossier${documents.length > 1 ? 's' : ''}` : tab === 'customers' ? `${customers.length} client${customers.length > 1 ? 's' : ''}` : `${funders.length} financeur${funders.length > 1 ? 's' : ''}`}</h2></div><label className="search-field"><span className="sr-only">Rechercher</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher…" /></label></div>
        {loading ? <div className="training-empty">Chargement…</div> : tab === 'documents' ? (
          filteredDocuments.length === 0 ? <div className="training-empty"><Icon name="file" size={30} /><strong>Aucun dossier commercial</strong><span>Crée le premier devis, la première convention ou le premier contrat.</span></div> :
          <div className="training-commercial-document-list">{filteredDocuments.map((row) => {
            const customer = customerById.get(row.customer_id ?? ''); const trainee = traineeById.get(row.trainee_id ?? ''); const funder = funderById.get(row.funder_id ?? ''); const session = sessionById.get(row.session_id ?? ''); const program = programById.get(row.program_id ?? '');
            return <article key={row.id}>
              <span className="training-commercial-document-icon"><Icon name={row.document_type === 'quote' ? 'creditCard' : row.document_type === 'agreement' ? 'file' : 'signature'} size={22} /></span>
              <div className="training-commercial-document-main"><div><span className="training-commercial-type">{trainingCommercialDocumentTypeLabels[row.document_type]}</span><strong>{row.reference} · {row.title}</strong></div><p>{customer?.legal_name || (trainee ? personName(trainee.first_name, trainee.last_name) : 'Bénéficiaire à compléter')}{funder ? ` · ${funder.name}` : ''}</p><small>{program ? `${program.title} · ` : session ? `${session.title} · ` : ''}Émis le {dateLabel(row.issue_date)}{row.valid_until ? ` · validité ${dateLabel(row.valid_until)}` : ''}</small></div>
              <div className="training-commercial-document-value"><strong>{formatTrainingMoney(row.amount_incl_tax_cents)}</strong><span className={`status-chip ${statusClass(row.status)}`}>{trainingCommercialDocumentStatusLabels[row.status]}</span></div>
              <div className="training-commercial-document-actions"><button type="button" className="secondary-button compact-button" onClick={() => void downloadPdf(row)}><Icon name="file" size={15} />PDF</button>{canManage && <button type="button" className="primary-button compact-button" disabled={busyId === row.id} onClick={() => void sendCommercialDocument(row)}><Icon name="message" size={15} />{busyId === row.id ? 'Préparation…' : row.email_queued_at ? 'Renvoyer' : 'Envoyer'}</button>}{canManage && ['sent','accepted'].includes(row.status) && <label className="secondary-button compact-button training-signed-upload"><Icon name="signature" size={15} />Signé reçu<input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadSignedDocument(row, file); event.currentTarget.value = ''; }} /></label>}{canManage && row.status === 'signed' && !row.session_id && row.program_id && <button type="button" className="primary-button compact-button" onClick={() => navigate(`/parcours-formation?convert=${encodeURIComponent(row.id)}`)}>Créer la session</button>}{canManage && <select aria-label={`Statut de ${row.reference}`} value={row.status} disabled={busyId === row.id} onChange={(event) => void updateDocumentStatus(row, event.target.value as TrainingCommercialDocumentStatus)}>{Object.entries(trainingCommercialDocumentStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>}{row.email_queued_at && <small className="training-commercial-email-state"><Icon name="check" size={12} />Brevo · {row.last_email_recipient || 'envoi programmé'}</small>}</div>
            </article>;
          })}</div>
        ) : tab === 'customers' ? (
          filteredCustomers.length === 0 ? <div className="training-empty"><Icon name="building" size={30} /><strong>Aucune entreprise cliente</strong><span>Ajoute les clients qui financent ou commandent les formations.</span></div> :
          <div className="training-commercial-entity-grid">{filteredCustomers.map((row) => <article key={row.id}><span><Icon name="building" size={22} /></span><div><small>{trainingCustomerTypeLabels[row.customer_type]}</small><strong>{row.legal_name}</strong><p>{row.contact_name || 'Contact non renseigné'}</p><em>{[row.email, row.phone, row.city].filter(Boolean).join(' · ') || 'Coordonnées à compléter'}</em></div>{canManage && <button type="button" className="danger-text-button" disabled={busyId === row.id} onClick={() => void archiveEntity('customer', row.id, row.legal_name)}>Archiver</button>}</article>)}</div>
        ) : (
          filteredFunders.length === 0 ? <div className="training-empty"><Icon name="creditCard" size={30} /><strong>Aucun financeur</strong><span>Ajoute un OPCO, un employeur ou un autre organisme de prise en charge.</span></div> :
          <div className="training-commercial-entity-grid">{filteredFunders.map((row) => <article key={row.id}><span><Icon name="creditCard" size={22} /></span><div><small>{trainingFunderTypeLabels[row.funder_type]}</small><strong>{row.name}</strong><p>{row.contact_name || row.reference_code || 'Référence non renseignée'}</p><em>{[row.email, row.phone, row.city].filter(Boolean).join(' · ') || 'Coordonnées à compléter'}</em></div>{canManage && <button type="button" className="danger-text-button" disabled={busyId === row.id} onClick={() => void archiveEntity('funder', row.id, row.name)}>Archiver</button>}</article>)}</div>
        )}
      </section>
    </div>
  );
}
