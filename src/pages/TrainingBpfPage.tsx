import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  calculateDemoTrainingBpf,
  normalizeTrainingBpfCalculation,
  normalizeTrainingBpfReport,
  trainingBpfDeliveryModeLabels,
  trainingBpfObjectiveLabels,
  trainingBpfReportStatusLabels,
  trainingBpfRevenueKeys,
  trainingBpfRevenueLabels,
  trainingBpfRncpLevelLabels,
  trainingBpfTraineeLabels,
  trainingBpfTrainerRelationshipLabels,
  type TrainingBpfCalculation,
  type TrainingBpfDeliveryMode,
  type TrainingBpfObjective,
  type TrainingBpfReportRecord,
  type TrainingBpfRevenueCategory,
  type TrainingBpfRncpLevel,
  type TrainingBpfTraineeType,
  type TrainingBpfTrainerRelationship
} from '../features/training/bpf';
import { generateTrainingBpfCsv } from '../features/training/bpfCsv';
import { generateTrainingBpfPdf } from '../features/training/bpfPdf';
import {
  formatTrainingMoney,
  personName,
  type TrainingAttendanceRecord,
  type TrainingCommercialDocumentRecord,
  type TrainingCustomerRecord,
  type TrainingEnrollmentRecord,
  type TrainingFunderRecord,
  type TrainingProgramRecord,
  type TrainingSessionRecord,
  type TrainingTraineeRecord,
  type TrainingTrainerRecord
} from '../features/training/types';
import { closeFileWindow, prepareFileWindow, showBlobDownload } from '../lib/browserFiles';
import { readJsonStorage, writeJsonStorage } from '../lib/safeStorage';
import { supabase } from '../lib/supabase';

type Tab = 'overview' | 'financial' | 'pedagogical' | 'sources';

type ReportForm = {
  exerciseStart: string;
  exerciseEnd: string;
  legalForm: string;
  nafCode: string;
  addressPublic: boolean;
  totalCompanyRevenue: string;
  totalTrainingCharges: string;
  trainerSalaries: string;
  externalTrainingCosts: string;
  executiveName: string;
  executiveTitle: string;
  notes: string;
};

type ProgramDraft = {
  objective: TrainingBpfObjective;
  rncpLevel: TrainingBpfRncpLevel | '';
  specialtyCode: string;
  specialtyName: string;
};

type DocumentDraft = {
  included: boolean;
  category: TrainingBpfRevenueCategory | '';
  recognizedAt: string;
};

const emptyReportForm: ReportForm = {
  exerciseStart: '',
  exerciseEnd: '',
  legalForm: '',
  nafCode: '',
  addressPublic: false,
  totalCompanyRevenue: '0',
  totalTrainingCharges: '0',
  trainerSalaries: '0',
  externalTrainingCosts: '0',
  executiveName: '',
  executiveTitle: '',
  notes: ''
};

function readRows<T>(key: string) {
  return readJsonStorage<T[]>(key, []);
}

function centsToInput(cents: number) {
  return String(Math.round((Number(cents) || 0) / 100 * 100) / 100).replace('.', ',');
}

function inputToCents(value: string) {
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : Number.NaN;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

function hoursLabel(value: number) {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(Number(value) || 0)} h`;
}

function reportStorageKey(organizationId: string) {
  return `ncr-suite-training-bpf-reports-${organizationId}`;
}

function newDemoReport(organizationId: string, year: number, userId: string | null, executiveName?: string | null): TrainingBpfReportRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    organization_id: organizationId,
    reporting_year: year,
    exercise_start: `${year}-01-01`,
    exercise_end: `${year}-12-31`,
    status: 'draft',
    legal_form: null,
    naf_code: null,
    address_public: false,
    total_company_revenue_cents: 0,
    total_training_charges_cents: 0,
    trainer_salaries_cents: 0,
    external_training_costs_cents: 0,
    executive_name: executiveName || null,
    executive_title: null,
    revenue_overrides: {},
    notes: null,
    calculated_data: null,
    calculated_at: null,
    locked_at: null,
    locked_by: null,
    created_by: userId,
    created_at: now,
    updated_at: now
  };
}

export function TrainingBpfPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [reports, setReports] = useState<TrainingBpfReportRecord[]>([]);
  const [report, setReport] = useState<TrainingBpfReportRecord | null>(null);
  const [calculation, setCalculation] = useState<TrainingBpfCalculation | null>(null);
  const [programs, setPrograms] = useState<TrainingProgramRecord[]>([]);
  const [trainers, setTrainers] = useState<TrainingTrainerRecord[]>([]);
  const [trainees, setTrainees] = useState<TrainingTraineeRecord[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionRecord[]>([]);
  const [enrollments, setEnrollments] = useState<TrainingEnrollmentRecord[]>([]);
  const [attendance, setAttendance] = useState<TrainingAttendanceRecord[]>([]);
  const [documents, setDocuments] = useState<TrainingCommercialDocumentRecord[]>([]);
  const [customers, setCustomers] = useState<TrainingCustomerRecord[]>([]);
  const [funders, setFunders] = useState<TrainingFunderRecord[]>([]);
  const [reportForm, setReportForm] = useState<ReportForm>(emptyReportForm);
  const [revenueDraft, setRevenueDraft] = useState<Record<TrainingBpfRevenueCategory, string>>(
    Object.fromEntries(trainingBpfRevenueKeys.map((key) => [key, '0'])) as Record<TrainingBpfRevenueCategory, string>
  );
  const [programDrafts, setProgramDrafts] = useState<Record<string, ProgramDraft>>({});
  const [documentDrafts, setDocumentDrafts] = useState<Record<string, DocumentDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const canReopen = ['owner', 'admin'].includes(organization?.role ?? 'viewer');
  const locked = report?.status === 'locked';

  function applyReportState(nextReport: TrainingBpfReportRecord, nextCalculation: TrainingBpfCalculation) {
    setReport(nextReport);
    setCalculation(nextCalculation);
    setReportForm({
      exerciseStart: nextReport.exercise_start,
      exerciseEnd: nextReport.exercise_end,
      legalForm: nextReport.legal_form || '',
      nafCode: nextReport.naf_code || '',
      addressPublic: nextReport.address_public,
      totalCompanyRevenue: centsToInput(nextReport.total_company_revenue_cents),
      totalTrainingCharges: centsToInput(nextReport.total_training_charges_cents),
      trainerSalaries: centsToInput(nextReport.trainer_salaries_cents),
      externalTrainingCosts: centsToInput(nextReport.external_training_costs_cents),
      executiveName: nextReport.executive_name || '',
      executiveTitle: nextReport.executive_title || '',
      notes: nextReport.notes || ''
    });
    setRevenueDraft(Object.fromEntries(trainingBpfRevenueKeys.map((key) => [
      key,
      centsToInput(nextReport.revenue_overrides[key] ?? nextCalculation.financial.auto_revenues_cents[key])
    ])) as Record<TrainingBpfRevenueCategory, string>);
  }

  async function loadData(preferredReportId?: string, silent = false) {
    if (!organization) return;
    const organizationId = organization.id;
    if (!silent) setLoading(true);
    setError('');
    try {
      if (demoMode || !supabase) {
        const nextPrograms = readRows<TrainingProgramRecord>(`ncr-suite-training-programs-${organizationId}`);
        const nextTrainers = readRows<TrainingTrainerRecord>(`ncr-suite-training-trainers-${organizationId}`);
        const nextTrainees = readRows<TrainingTraineeRecord>(`ncr-suite-training-trainees-${organizationId}`);
        const nextSessions = readRows<TrainingSessionRecord>(`ncr-suite-training-sessions-${organizationId}`);
        const nextEnrollments = readRows<TrainingEnrollmentRecord>(`ncr-suite-training-enrollments-${organizationId}`);
        const nextAttendance = readRows<TrainingAttendanceRecord>(`ncr-suite-training-attendance-${organizationId}`);
        const nextDocuments = readRows<TrainingCommercialDocumentRecord>(`ncr-suite-training-commercial-${organizationId}`);
        const nextCustomers = readRows<TrainingCustomerRecord>(`ncr-suite-training-customers-${organizationId}`);
        const nextFunders = readRows<TrainingFunderRecord>(`ncr-suite-training-funders-${organizationId}`);
        let nextReports = readRows<TrainingBpfReportRecord>(reportStorageKey(organizationId)).map(normalizeTrainingBpfReport);
        const defaultYear = new Date().getFullYear() - 1;
        if (nextReports.length === 0) {
          nextReports = [newDemoReport(organizationId, defaultYear, user?.id ?? null, organization.training_legal_representative)];
        }
        const selected = nextReports.find((row) => row.id === preferredReportId)
          ?? nextReports.find((row) => row.reporting_year === defaultYear)
          ?? [...nextReports].sort((a, b) => b.reporting_year - a.reporting_year)[0];
        const nextCalculation = selected.status === 'locked' && selected.calculated_data
          ? selected.calculated_data
          : calculateDemoTrainingBpf({
            organization,
            report: selected,
            programs: nextPrograms,
            trainers: nextTrainers,
            sessions: nextSessions,
            enrollments: nextEnrollments,
            attendance: nextAttendance,
            documents: nextDocuments,
            customers: nextCustomers,
            funders: nextFunders
          });
        const calculatedReport = {
          ...selected,
          calculated_data: nextCalculation,
          calculated_at: nextCalculation.generated_at,
          updated_at: new Date().toISOString()
        };
        nextReports = nextReports.map((row) => row.id === calculatedReport.id ? calculatedReport : row);
        writeJsonStorage(reportStorageKey(organizationId), nextReports);
        setReports(nextReports.sort((a, b) => b.reporting_year - a.reporting_year));
        setPrograms(nextPrograms); setTrainers(nextTrainers); setTrainees(nextTrainees);
        setSessions(nextSessions); setEnrollments(nextEnrollments); setAttendance(nextAttendance);
        setDocuments(nextDocuments); setCustomers(nextCustomers); setFunders(nextFunders);
        applyReportState(calculatedReport, nextCalculation);
      } else {
        const [
          reportResult,
          programResult,
          trainerResult,
          traineeResult,
          sessionResult,
          enrollmentResult,
          attendanceResult,
          documentResult,
          customerResult,
          funderResult
        ] = await Promise.all([
          supabase.from('training_bpf_reports').select('*').eq('organization_id', organizationId).order('reporting_year', { ascending: false }),
          supabase.from('training_programs').select('id,organization_id,site_id,title,code,duration_hours,modality,objectives,description,audience,prerequisites,detailed_program,teaching_methods,training_resources,assessment_methods,accessibility,price_excl_tax_cents,vat_rate_basis_points,default_capacity,default_location,completion_status,bpf_objective,bpf_rncp_level,bpf_specialty_code,bpf_specialty_name,status,created_at,updated_at').eq('organization_id', organizationId).neq('status', 'archived').order('title'),
          supabase.from('training_trainers').select('id,organization_id,first_name,last_name,email,phone,specialties,notes,bpf_relationship,status,created_at').eq('organization_id', organizationId).neq('status', 'archived').order('last_name'),
          supabase.from('training_trainees').select('id,organization_id,first_name,last_name,email,phone,company,notes,status,created_at').eq('organization_id', organizationId).neq('status', 'archived').order('last_name'),
          supabase.from('training_sessions').select('id,organization_id,site_id,program_id,trainer_id,title,starts_at,ends_at,capacity,location,modality,status,notes,source_commercial_document_id,bpf_delivery_mode,created_at').eq('organization_id', organizationId).eq('status', 'completed').order('ends_at', { ascending: false }),
          supabase.from('training_session_enrollments').select('organization_id,session_id,trainee_id,status,bpf_trainee_type,bpf_attended_hours').eq('organization_id', organizationId),
          supabase.from('training_attendance').select('id,organization_id,site_id,session_id,trainee_id,attendance_date,period,status,signature_path,signatory_name,signed_at,notes,created_at,updated_at').eq('organization_id', organizationId),
          supabase.from('training_commercial_documents').select('id,organization_id,site_id,opportunity_id,customer_id,funder_id,session_id,trainee_id,program_id,document_type,reference,title,training_summary,participant_count,issue_date,valid_until,status,amount_excl_tax_cents,vat_rate_basis_points,tax_cents,amount_incl_tax_cents,notes,terms,sent_at,accepted_at,signed_at,signed_document_path,signed_document_received_at,signed_document_received_by,bpf_revenue_category,bpf_revenue_recognized_at,bpf_included,created_at,updated_at').eq('organization_id', organizationId).order('issue_date', { ascending: false }),
          supabase.from('training_customers').select('id,organization_id,site_id,customer_type,legal_name,contact_name,email,phone,billing_address,postal_code,city,siret,vat_number,notes,status,created_at,updated_at').eq('organization_id', organizationId),
          supabase.from('training_funders').select('id,organization_id,funder_type,name,contact_name,email,phone,billing_address,postal_code,city,reference_code,notes,status,created_at,updated_at').eq('organization_id', organizationId)
        ]);
        const firstError = reportResult.error || programResult.error || trainerResult.error || traineeResult.error
          || sessionResult.error || enrollmentResult.error || attendanceResult.error || documentResult.error
          || customerResult.error || funderResult.error;
        if (firstError) throw firstError;

        let nextReports = (reportResult.data ?? []).map((row) => normalizeTrainingBpfReport(row as TrainingBpfReportRecord));
        if (nextReports.length === 0) {
          const defaultYear = new Date().getFullYear() - 1;
          const { data: createdId, error: createError } = await supabase.rpc('create_training_bpf_report', {
            p_organization_id: organizationId,
            p_reporting_year: defaultYear
          });
          if (createError) throw createError;
          const { data: createdRows, error: reloadError } = await supabase.from('training_bpf_reports').select('*').eq('organization_id', organizationId).order('reporting_year', { ascending: false });
          if (reloadError) throw reloadError;
          nextReports = (createdRows ?? []).map((row) => normalizeTrainingBpfReport(row as TrainingBpfReportRecord));
          preferredReportId = String(createdId);
        }
        const defaultYear = new Date().getFullYear() - 1;
        const selected = nextReports.find((row) => row.id === preferredReportId)
          ?? nextReports.find((row) => row.reporting_year === defaultYear)
          ?? nextReports[0];
        let nextCalculation: TrainingBpfCalculation;
        if (selected.status === 'locked' && selected.calculated_data && 'financial' in selected.calculated_data) {
          nextCalculation = normalizeTrainingBpfCalculation(selected.calculated_data);
        } else {
          const { data, error: calculationError } = await supabase.rpc('refresh_training_bpf_report', {
            p_organization_id: organizationId,
            p_report_id: selected.id
          });
          if (calculationError) throw calculationError;
          nextCalculation = normalizeTrainingBpfCalculation(data as TrainingBpfCalculation);
        }
        const calculatedReport = { ...selected, calculated_data: nextCalculation, calculated_at: nextCalculation.generated_at };
        nextReports = nextReports.map((row) => row.id === calculatedReport.id ? calculatedReport : row);

        setReports(nextReports);
        setPrograms((programResult.data ?? []).map((row) => ({ ...row, duration_hours: Number(row.duration_hours), price_excl_tax_cents: Number(row.price_excl_tax_cents), vat_rate_basis_points: Number(row.vat_rate_basis_points), default_capacity: Number(row.default_capacity) })) as TrainingProgramRecord[]);
        setTrainers((trainerResult.data ?? []) as TrainingTrainerRecord[]);
        setTrainees((traineeResult.data ?? []) as TrainingTraineeRecord[]);
        setSessions((sessionResult.data ?? []) as TrainingSessionRecord[]);
        setEnrollments((enrollmentResult.data ?? []).map((row) => ({ ...row, bpf_attended_hours: row.bpf_attended_hours == null ? null : Number(row.bpf_attended_hours) })) as TrainingEnrollmentRecord[]);
        setAttendance((attendanceResult.data ?? []) as TrainingAttendanceRecord[]);
        setDocuments((documentResult.data ?? []).map((row) => ({
          ...row,
          participant_count: Number(row.participant_count),
          amount_excl_tax_cents: Number(row.amount_excl_tax_cents),
          vat_rate_basis_points: Number(row.vat_rate_basis_points),
          tax_cents: Number(row.tax_cents),
          amount_incl_tax_cents: Number(row.amount_incl_tax_cents)
        })) as TrainingCommercialDocumentRecord[]);
        setCustomers((customerResult.data ?? []) as TrainingCustomerRecord[]);
        setFunders((funderResult.data ?? []) as TrainingFunderRecord[]);
        applyReportState(calculatedReport, nextCalculation);
      }
    } catch (caught) {
      setError(`Chargement du BPF impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!organization) return;
    void loadData();
  }, [organization?.id, demoMode]);

  useEffect(() => {
    setProgramDrafts(Object.fromEntries(programs.map((program) => [program.id, {
      objective: program.bpf_objective ?? 'other_professional',
      rncpLevel: program.bpf_rncp_level ?? '',
      specialtyCode: program.bpf_specialty_code ?? '',
      specialtyName: program.bpf_specialty_name ?? ''
    }])));
  }, [programs]);

  useEffect(() => {
    setDocumentDrafts(Object.fromEntries(documents.map((document) => [document.id, {
      included: document.bpf_included ?? false,
      category: document.bpf_revenue_category ?? '',
      recognizedAt: document.bpf_revenue_recognized_at || document.issue_date
    }])));
  }, [documents]);

  const programById = useMemo(() => new Map(programs.map((row) => [row.id, row])), [programs]);
  const traineeById = useMemo(() => new Map(trainees.map((row) => [row.id, row])), [trainees]);
  const customerById = useMemo(() => new Map(customers.map((row) => [row.id, row])), [customers]);
  const funderById = useMemo(() => new Map(funders.map((row) => [row.id, row])), [funders]);
  const periodSessions = useMemo(() => {
    if (!report) return [];
    return sessions.filter((row) => {
      const end = row.ends_at.slice(0, 10);
      return end >= report.exercise_start && end <= report.exercise_end;
    });
  }, [sessions, report]);
  const periodSessionIds = useMemo(() => new Set(periodSessions.map((row) => row.id)), [periodSessions]);
  const periodProgramIds = useMemo(() => new Set(periodSessions.map((row) => row.program_id)), [periodSessions]);
  const periodTrainerIds = useMemo(() => new Set(periodSessions.map((row) => row.trainer_id).filter(Boolean) as string[]), [periodSessions]);
  const periodEnrollments = useMemo(() => enrollments.filter((row) => periodSessionIds.has(row.session_id) && row.status !== 'canceled'), [enrollments, periodSessionIds]);
  const periodDocuments = useMemo(() => {
    if (!report) return [];
    return documents.filter((row) => {
      const date = (row.bpf_revenue_recognized_at || row.issue_date).slice(0, 10);
      return ['accepted', 'signed', 'completed'].includes(row.status)
        && date >= report.exercise_start
        && date <= report.exercise_end;
    });
  }, [documents, report]);
  const sourceIssueCount = useMemo(() => calculation?.quality.warnings.filter((row) => !['organization', 'report'].includes(row.entity_type)).length ?? 0, [calculation]);
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [...new Set([...reports.map((row) => row.reporting_year), ...Array.from({ length: 7 }, (_, index) => current - index)])].sort((a, b) => b - a);
  }, [reports]);

  async function ensureYear(year: number) {
    if (!organization || !user) return;
    const existing = reports.find((row) => row.reporting_year === year);
    if (existing) {
      setLoading(true);
      await loadData(existing.id);
      return;
    }
    setSaving(true); setError(''); setSuccess('');
    try {
      let id = '';
      if (demoMode || !supabase) {
        const next = newDemoReport(organization.id, year, user.id, organization.training_legal_representative);
        const stored = readRows<TrainingBpfReportRecord>(reportStorageKey(organization.id));
        writeJsonStorage(reportStorageKey(organization.id), [next, ...stored]);
        id = next.id;
      } else {
        const { data, error: createError } = await supabase.rpc('create_training_bpf_report', {
          p_organization_id: organization.id,
          p_reporting_year: year
        });
        if (createError) throw createError;
        id = String(data);
      }
      await loadData(id, true);
      setSuccess(`Le brouillon BPF ${year} est prêt.`);
    } catch (caught) {
      setError(`Création impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setSaving(false); }
  }

  async function refresh() {
    if (!report) return;
    setRefreshing(true); setError(''); setSuccess('');
    await loadData(report.id, true);
    setSuccess('Les calculs et les contrôles BPF sont actualisés.');
  }

  async function saveReport(event?: FormEvent) {
    event?.preventDefault();
    if (!organization || !report || !calculation || locked || !canManage) return;
    const totalCompanyRevenue = inputToCents(reportForm.totalCompanyRevenue);
    const totalTrainingCharges = inputToCents(reportForm.totalTrainingCharges);
    const trainerSalaries = inputToCents(reportForm.trainerSalaries);
    const externalTrainingCosts = inputToCents(reportForm.externalTrainingCosts);
    const enteredRevenues = Object.fromEntries(trainingBpfRevenueKeys.map((key) => [key, inputToCents(revenueDraft[key])])) as Record<TrainingBpfRevenueCategory, number>;
    if ([totalCompanyRevenue, totalTrainingCharges, trainerSalaries, externalTrainingCosts, ...Object.values(enteredRevenues)].some((value) => !Number.isFinite(value))) {
      setError('Un montant financier est invalide.');
      return;
    }
    const overrides = Object.fromEntries(trainingBpfRevenueKeys
      .filter((key) => enteredRevenues[key] !== calculation.financial.auto_revenues_cents[key])
      .map((key) => [key, enteredRevenues[key]])) as Partial<Record<TrainingBpfRevenueCategory, number>>;
    if (trainerSalaries > totalTrainingCharges || externalTrainingCosts > totalTrainingCharges) {
      setError('Les salaires et honoraires ne peuvent pas dépasser le total des charges.');
      return;
    }
    if (!reportForm.exerciseStart || !reportForm.exerciseEnd || reportForm.exerciseEnd < reportForm.exerciseStart) {
      setError('La période comptable est invalide.');
      return;
    }
    const payload = {
      exercise_start: reportForm.exerciseStart,
      exercise_end: reportForm.exerciseEnd,
      legal_form: reportForm.legalForm.trim() || null,
      naf_code: reportForm.nafCode.trim().toUpperCase() || null,
      address_public: reportForm.addressPublic,
      total_company_revenue_cents: totalCompanyRevenue,
      total_training_charges_cents: totalTrainingCharges,
      trainer_salaries_cents: trainerSalaries,
      external_training_costs_cents: externalTrainingCosts,
      executive_name: reportForm.executiveName.trim() || null,
      executive_title: reportForm.executiveTitle.trim() || null,
      revenue_overrides: overrides,
      notes: reportForm.notes.trim() || null
    };
    setSaving(true); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const stored = readRows<TrainingBpfReportRecord>(reportStorageKey(organization.id));
        writeJsonStorage(reportStorageKey(organization.id), stored.map((row) => row.id === report.id ? { ...row, ...payload, updated_at: new Date().toISOString() } : row));
      } else {
        const { error: updateError } = await supabase.from('training_bpf_reports').update(payload).eq('organization_id', organization.id).eq('id', report.id);
        if (updateError) throw updateError;
      }
      await loadData(report.id, true);
      setSuccess('Les données du BPF sont enregistrées.');
    } catch (caught) {
      setError(`Enregistrement impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setSaving(false); }
  }

  async function changeStatus(nextStatus: 'reviewed' | 'locked') {
    if (!organization || !report || !calculation || locked) return;
    if (nextStatus === 'locked' && !calculation.quality.ready) {
      setError('Corrige les contrôles bloquants avant le verrouillage.');
      return;
    }
    if (nextStatus === 'locked' && !window.confirm(`Verrouiller le BPF ${report.reporting_year} ?`)) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const now = new Date().toISOString();
        const stored = readRows<TrainingBpfReportRecord>(reportStorageKey(organization.id));
        writeJsonStorage(reportStorageKey(organization.id), stored.map((row) => row.id === report.id ? {
          ...row,
          status: nextStatus,
          locked_at: nextStatus === 'locked' ? now : null,
          locked_by: nextStatus === 'locked' ? user?.id ?? null : null,
          calculated_data: calculation,
          calculated_at: calculation.generated_at,
          updated_at: now
        } : row));
      } else {
        const { error: statusError } = await supabase.rpc('set_training_bpf_report_status', {
          p_organization_id: organization.id,
          p_report_id: report.id,
          p_status: nextStatus
        });
        if (statusError) throw statusError;
      }
      await loadData(report.id, true);
      setSuccess(nextStatus === 'locked' ? 'Le BPF est verrouillé.' : 'Le BPF est marqué comme vérifié.');
    } catch (caught) {
      setError(`Changement de statut impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setSaving(false); }
  }

  async function reopenReport() {
    if (!organization || !report || !canReopen || !locked) return;
    if (!window.confirm(`Rouvrir le BPF ${report.reporting_year} ?`)) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const stored = readRows<TrainingBpfReportRecord>(reportStorageKey(organization.id));
        writeJsonStorage(reportStorageKey(organization.id), stored.map((row) => row.id === report.id ? {
          ...row, status: 'draft', locked_at: null, locked_by: null, updated_at: new Date().toISOString()
        } : row));
      } else {
        const { error: reopenError } = await supabase.rpc('reopen_training_bpf_report', {
          p_organization_id: organization.id,
          p_report_id: report.id
        });
        if (reopenError) throw reopenError;
      }
      await loadData(report.id, true);
      setSuccess('Le BPF est rouvert en brouillon.');
    } catch (caught) {
      setError(`Réouverture impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setSaving(false); }
  }

  async function saveProgram(programId: string) {
    if (!organization || locked) return;
    const draft = programDrafts[programId];
    if (!draft || !/^[0-9]{3}$/.test(draft.specialtyCode.trim()) || !draft.specialtyName.trim()) {
      setError('La spécialité doit contenir un code à 3 chiffres et un libellé.');
      return;
    }
    if (draft.objective === 'rncp' && !draft.rncpLevel) {
      setError('Sélectionne le niveau RNCP.');
      return;
    }
    const payload = {
      bpf_objective: draft.objective,
      bpf_rncp_level: draft.objective === 'rncp' ? draft.rncpLevel || null : null,
      bpf_specialty_code: draft.specialtyCode.trim(),
      bpf_specialty_name: draft.specialtyName.trim()
    };
    setBusyId(`program-${programId}`); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        writeJsonStorage(`ncr-suite-training-programs-${organization.id}`, readRows<TrainingProgramRecord>(`ncr-suite-training-programs-${organization.id}`).map((row) => row.id === programId ? { ...row, ...payload } : row));
      } else {
        const { error: updateError } = await supabase.from('training_programs').update(payload).eq('organization_id', organization.id).eq('id', programId);
        if (updateError) throw updateError;
      }
      await loadData(report?.id, true);
      setSuccess('La formation est classée pour le BPF.');
    } catch (caught) {
      setError(`Classement impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setBusyId(''); }
  }

  async function updateSession(sessionId: string, deliveryMode: TrainingBpfDeliveryMode) {
    if (!organization || locked) return;
    setBusyId(`session-${sessionId}`); setError('');
    try {
      if (demoMode || !supabase) {
        writeJsonStorage(`ncr-suite-training-sessions-${organization.id}`, readRows<TrainingSessionRecord>(`ncr-suite-training-sessions-${organization.id}`).map((row) => row.id === sessionId ? { ...row, bpf_delivery_mode: deliveryMode } : row));
      } else {
        const { error: updateError } = await supabase.from('training_sessions').update({ bpf_delivery_mode: deliveryMode }).eq('organization_id', organization.id).eq('id', sessionId);
        if (updateError) throw updateError;
      }
      await loadData(report?.id, true);
    } catch (caught) { setError(`Mise à jour impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setBusyId(''); }
  }

  async function updateTrainer(trainerId: string, relationship: TrainingBpfTrainerRelationship) {
    if (!organization || locked) return;
    setBusyId(`trainer-${trainerId}`); setError('');
    try {
      if (demoMode || !supabase) {
        writeJsonStorage(`ncr-suite-training-trainers-${organization.id}`, readRows<TrainingTrainerRecord>(`ncr-suite-training-trainers-${organization.id}`).map((row) => row.id === trainerId ? { ...row, bpf_relationship: relationship } : row));
      } else {
        const { error: updateError } = await supabase.from('training_trainers').update({ bpf_relationship: relationship }).eq('organization_id', organization.id).eq('id', trainerId);
        if (updateError) throw updateError;
      }
      await loadData(report?.id, true);
    } catch (caught) { setError(`Mise à jour impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setBusyId(''); }
  }

  async function updateEnrollment(sessionId: string, traineeId: string, traineeType: TrainingBpfTraineeType) {
    if (!organization || locked) return;
    setBusyId(`enrollment-${sessionId}-${traineeId}`); setError('');
    try {
      if (demoMode || !supabase) {
        writeJsonStorage(`ncr-suite-training-enrollments-${organization.id}`, readRows<TrainingEnrollmentRecord>(`ncr-suite-training-enrollments-${organization.id}`).map((row) => row.session_id === sessionId && row.trainee_id === traineeId ? { ...row, bpf_trainee_type: traineeType } : row));
      } else {
        const { error: updateError } = await supabase.from('training_session_enrollments').update({ bpf_trainee_type: traineeType }).eq('organization_id', organization.id).eq('session_id', sessionId).eq('trainee_id', traineeId);
        if (updateError) throw updateError;
      }
      await loadData(report?.id, true);
    } catch (caught) { setError(`Mise à jour impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setBusyId(''); }
  }

  async function saveDocument(documentId: string) {
    if (!organization || locked) return;
    const draft = documentDrafts[documentId];
    if (!draft) return;
    if (draft.included && !draft.category) {
      setError('Classe le produit financier avant de le retenir.');
      return;
    }
    const payload = {
      bpf_included: draft.included,
      bpf_revenue_category: draft.category || null,
      bpf_revenue_recognized_at: draft.recognizedAt || null
    };
    setBusyId(`document-${documentId}`); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        writeJsonStorage(`ncr-suite-training-commercial-${organization.id}`, readRows<TrainingCommercialDocumentRecord>(`ncr-suite-training-commercial-${organization.id}`).map((row) => row.id === documentId ? { ...row, ...payload } : row));
      } else {
        const { error: updateError } = await supabase.from('training_commercial_documents').update(payload).eq('organization_id', organization.id).eq('id', documentId);
        if (updateError) throw updateError;
      }
      await loadData(report?.id, true);
      setSuccess('Le produit financier est enregistré.');
    } catch (caught) { setError(`Mise à jour impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setBusyId(''); }
  }

  async function exportPdf() {
    if (!organization || !calculation) return;
    const fileWindow = prepareFileWindow('Préparation du BPF', 'Le document est en cours de génération.');
    try {
      const result = await generateTrainingBpfPdf(organization, calculation);
      const pdfBuffer = new Uint8Array(result.bytes).buffer as ArrayBuffer;
      const url = URL.createObjectURL(new Blob([pdfBuffer], { type: 'application/pdf' }));
      showBlobDownload(fileWindow, url, result.filename, 'BPF préparatoire prêt');
      window.setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (caught) {
      closeFileWindow(fileWindow);
      setError(`Export PDF impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    }
  }

  function exportCsv() {
    if (!organization || !calculation) return;
    const result = generateTrainingBpfCsv(organization, calculation);
    const url = URL.createObjectURL(new Blob([result.content], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = result.filename;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openWarning(entityType: string) {
    if (entityType === 'organization') navigate('/profil-organisme');
    else if (entityType === 'report') setTab('financial');
    else setTab('sources');
  }

  if (loading) return <div className="page"><div className="panel loading-panel">Préparation du BPF…</div></div>;
  if (!organization || !report || !calculation) return <div className="page"><div className="error-message page-message">Le BPF n’est pas disponible.</div></div>;

  return <div className="page training-bpf-page">
    <header className="training-bpf-header">
      <div>
        <p className="eyebrow">FORMATION · BPF AUTOMATIQUE</p>
        <h1>Bilan pédagogique et financier</h1>
        <p>{dateLabel(report.exercise_start)} au {dateLabel(report.exercise_end)}</p>
      </div>
      <div className="training-bpf-header-actions">
        <label className="training-bpf-year">Exercice<select value={report.reporting_year} disabled={saving} onChange={(event) => void ensureYear(Number(event.target.value))}>{yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
        <span className={`status-badge ${report.status === 'locked' ? 'active' : report.status === 'reviewed' ? 'pending' : 'inactive'}`}>{trainingBpfReportStatusLabels[report.status]}</span>
        <button className="icon-button" type="button" title="Actualiser les calculs" disabled={refreshing} onClick={() => void refresh()}><Icon name="refresh" size={19} /></button>
        <button className="secondary-button compact-button" type="button" onClick={() => void exportPdf()}><Icon name="file" size={17} /> PDF</button>
        <button className="secondary-button compact-button" type="button" onClick={exportCsv}><Icon name="chart" size={17} /> CSV</button>
      </div>
    </header>

    {error && <div className="error-message page-message" role="alert">{error}</div>}
    {success && <div className="success-message page-message" role="status">{success}</div>}

    <section className="training-bpf-metrics">
      <article><span><Icon name="calendar" size={20} /></span><div><strong>{calculation.general.completed_sessions}</strong><small>sessions clôturées</small></div></article>
      <article><span><Icon name="users" size={20} /></span><div><strong>{calculation.trainees.total.count}</strong><small>stagiaires déclarés</small></div></article>
      <article><span><Icon name="clock" size={20} /></span><div><strong>{hoursLabel(calculation.trainees.total.hours)}</strong><small>heures-stagiaires</small></div></article>
      <article><span><Icon name="creditCard" size={20} /></span><div><strong>{formatTrainingMoney(calculation.financial.total_products_cents)}</strong><small>produits HT retenus</small></div></article>
      <article className={calculation.quality.ready ? 'is-ready' : 'has-alerts'}><span><Icon name={calculation.quality.ready ? 'check' : 'alert'} size={20} /></span><div><strong>{calculation.quality.completeness_percent}%</strong><small>contrôles complétés</small></div></article>
    </section>

    <nav className="training-bpf-tabs" aria-label="Sections BPF">
      {([
        ['overview', 'Pilotage', 'activity'],
        ['financial', 'Financier', 'creditCard'],
        ['pedagogical', 'Pédagogique', 'graduation'],
        ['sources', `Données${sourceIssueCount ? ` · ${sourceIssueCount}` : ''}`, 'clipboard']
      ] as const).map(([key, label, icon]) => <button key={key} type="button" className={tab === key ? 'active' : ''} onClick={() => setTab(key)}><Icon name={icon} size={17} />{label}</button>)}
    </nav>

    {tab === 'overview' && <div className="training-bpf-overview">
      <section className={`training-bpf-readiness ${calculation.quality.ready ? 'ready' : 'attention'}`}>
        <div className="training-bpf-readiness-score"><strong>{calculation.quality.completeness_percent}%</strong><span>{calculation.quality.ready ? 'prêt à verrouiller' : 'à compléter'}</span></div>
        <div><h2>{calculation.quality.ready ? 'Contrôles bloquants terminés' : `${calculation.quality.critical_count} contrôle${calculation.quality.critical_count > 1 ? 's' : ''} bloquant${calculation.quality.critical_count > 1 ? 's' : ''}`}</h2><p>{calculation.quality.warning_count} point{calculation.quality.warning_count > 1 ? 's' : ''} de vigilance · {calculation.sources.unreviewed_revenue_documents} document{calculation.sources.unreviewed_revenue_documents > 1 ? 's' : ''} financier{calculation.sources.unreviewed_revenue_documents > 1 ? 's' : ''} à contrôler</p></div>
        <button className="primary-button" type="button" onClick={() => setTab(calculation.quality.critical_count ? 'sources' : 'financial')}>{calculation.quality.critical_count ? 'Corriger les données' : 'Vérifier les montants'}</button>
      </section>

      <div className="training-bpf-overview-grid">
        <section className="panel training-bpf-checklist">
          <header><div><p className="eyebrow">CONTRÔLES</p><h2>Points à traiter</h2></div><span>{calculation.quality.warnings.length}</span></header>
          {calculation.quality.warnings.length === 0 ? <div className="training-bpf-empty"><Icon name="check" size={25} /><strong>Aucun point bloquant</strong></div> : <div className="training-bpf-warning-list">{calculation.quality.warnings.slice(0, 12).map((warning, index) => <button key={`${warning.code}-${warning.entity_id}-${index}`} type="button" onClick={() => openWarning(warning.entity_type)}><i className={warning.severity} /><span><strong>{warning.label}</strong><small>{warning.severity === 'critical' ? 'Bloquant' : 'À vérifier'}</small></span><Icon name="chevronRight" size={17} /></button>)}</div>}
        </section>
        <aside className="training-bpf-side">
          <section className="panel training-bpf-source-summary"><p className="eyebrow">SOURCES RETENUES</p><dl><div><dt>Sessions</dt><dd>{calculation.sources.completed_sessions}</dd></div><div><dt>Participations</dt><dd>{calculation.sources.enrollments}</dd></div><div><dt>Produits financiers</dt><dd>{calculation.sources.included_revenue_documents}</dd></div><div><dt>Formation à distance</dt><dd>{calculation.general.distance_learning ? 'Oui' : 'Non'}</dd></div></dl></section>
          <section className="panel training-bpf-workflow"><p className="eyebrow">VALIDATION</p><ol><li className="done"><span>1</span><div><strong>Brouillon calculé</strong><small>{dateLabel(calculation.period.end)}</small></div></li><li className={report.status !== 'draft' ? 'done' : ''}><span>2</span><div><strong>Vérification</strong><small>Contrôle financier et pédagogique</small></div></li><li className={report.status === 'locked' ? 'done' : ''}><span>3</span><div><strong>Verrouillage</strong><small>Instantané annuel</small></div></li></ol></section>
        </aside>
      </div>
    </div>}

    {tab === 'financial' && <form className="training-bpf-financial" onSubmit={saveReport}>
      <section className="panel training-bpf-identity">
        <header><div><p className="eyebrow">CADRES A ET B</p><h2>Identification et exercice</h2></div><button className="text-button" type="button" onClick={() => navigate('/profil-organisme')}>Profil organisme</button></header>
        <div className="training-bpf-form-grid">
          <label>NDA<input value={organization.training_nda_number || ''} disabled /></label>
          <label>SIRET<input value={organization.company_siret || ''} disabled /></label>
          <label>Forme juridique<input value={reportForm.legalForm} disabled={locked} onChange={(event) => setReportForm({ ...reportForm, legalForm: event.target.value })} placeholder="SAS, SARL, EI…" /></label>
          <label>Code NAF<input value={reportForm.nafCode} disabled={locked} onChange={(event) => setReportForm({ ...reportForm, nafCode: event.target.value })} placeholder="8559A" /></label>
          <label>Début de l’exercice<input type="date" value={reportForm.exerciseStart} disabled={locked} onChange={(event) => setReportForm({ ...reportForm, exerciseStart: event.target.value })} /></label>
          <label>Fin de l’exercice<input type="date" value={reportForm.exerciseEnd} disabled={locked} onChange={(event) => setReportForm({ ...reportForm, exerciseEnd: event.target.value })} /></label>
          <label>Nom du dirigeant<input value={reportForm.executiveName} disabled={locked} onChange={(event) => setReportForm({ ...reportForm, executiveName: event.target.value })} /></label>
          <label>Qualité du dirigeant<input value={reportForm.executiveTitle} disabled={locked} onChange={(event) => setReportForm({ ...reportForm, executiveTitle: event.target.value })} placeholder="Président, gérant…" /></label>
          <label className="training-bpf-checkbox"><input type="checkbox" checked={reportForm.addressPublic} disabled={locked} onChange={(event) => setReportForm({ ...reportForm, addressPublic: event.target.checked })} /><span>Adresse rendue publique</span></label>
        </div>
      </section>

      <section className="panel training-bpf-revenue">
        <header><div><p className="eyebrow">CADRE C</p><h2>Origine des produits hors taxes</h2></div><strong>{formatTrainingMoney(calculation.financial.total_products_cents)}</strong></header>
        <div className="training-bpf-revenue-head"><span>Rubrique</span><span>Calcul NCR</span><span>Montant retenu</span></div>
        {trainingBpfRevenueKeys.map((key) => <label key={key} className="training-bpf-revenue-row"><span>{trainingBpfRevenueLabels[key]}</span><b>{formatTrainingMoney(calculation.financial.auto_revenues_cents[key])}</b><input inputMode="decimal" value={revenueDraft[key]} disabled={locked} onChange={(event) => setRevenueDraft({ ...revenueDraft, [key]: event.target.value })} /></label>)}
        <footer><span>Total des produits de formation</span><strong>{formatTrainingMoney(trainingBpfRevenueKeys.reduce((sum, key) => sum + (inputToCents(revenueDraft[key]) || 0), 0))}</strong></footer>
      </section>

      <section className="panel training-bpf-charges">
        <header><div><p className="eyebrow">CADRE D</p><h2>Charges et chiffre d’affaires</h2></div></header>
        <div className="training-bpf-form-grid">
          <label>Chiffre d’affaires global HT (€)<input inputMode="decimal" value={reportForm.totalCompanyRevenue} disabled={locked} onChange={(event) => setReportForm({ ...reportForm, totalCompanyRevenue: event.target.value })} /></label>
          <label>Part formation calculée<input value={`${calculation.financial.training_revenue_percent} %`} disabled /></label>
          <label>Total des charges de formation (€)<input inputMode="decimal" value={reportForm.totalTrainingCharges} disabled={locked} onChange={(event) => setReportForm({ ...reportForm, totalTrainingCharges: event.target.value })} /></label>
          <label>Salaires des formateurs (€)<input inputMode="decimal" value={reportForm.trainerSalaries} disabled={locked} onChange={(event) => setReportForm({ ...reportForm, trainerSalaries: event.target.value })} /></label>
          <label>Achats et honoraires de formation (€)<input inputMode="decimal" value={reportForm.externalTrainingCosts} disabled={locked} onChange={(event) => setReportForm({ ...reportForm, externalTrainingCosts: event.target.value })} /></label>
          <label className="full-field">Notes internes<textarea rows={4} value={reportForm.notes} disabled={locked} onChange={(event) => setReportForm({ ...reportForm, notes: event.target.value })} /></label>
        </div>
      </section>
      {!locked && <div className="training-bpf-savebar"><span>Les montants retenus remplacent le calcul automatique pour cet exercice.</span><button className="primary-button" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer et recalculer'}</button></div>}
    </form>}

    {tab === 'pedagogical' && <div className="training-bpf-pedagogical">
      <section className="panel training-bpf-table-section"><header><div><p className="eyebrow">CADRE E</p><h2>Personnes dispensant des heures de formation</h2></div></header><div className="training-bpf-data-table"><div className="head"><span>Catégorie</span><span>Nombre</span><span>Heures</span></div><div><span>Personnes internes</span><b>{calculation.trainers.internal.count}</b><b>{hoursLabel(calculation.trainers.internal.hours)}</b></div><div><span>Personnes extérieures</span><b>{calculation.trainers.external.count}</b><b>{hoursLabel(calculation.trainers.external.hours)}</b></div></div></section>
      <section className="panel training-bpf-table-section"><header><div><p className="eyebrow">CADRE F1</p><h2>Type de stagiaires</h2></div></header><div className="training-bpf-data-table"><div className="head"><span>Public</span><span>Stagiaires</span><span>Heures-stagiaires</span></div>{Object.entries(trainingBpfTraineeLabels).map(([key, label]) => { const value = calculation.trainees.categories[key as TrainingBpfTraineeType]; return <div key={key}><span>{label}</span><b>{value.count}</b><b>{hoursLabel(value.hours)}</b></div>; })}<div className="total"><span>Total F1</span><b>{calculation.trainees.total.count}</b><b>{hoursLabel(calculation.trainees.total.hours)}</b></div></div></section>
      <section className="panel training-bpf-table-section"><header><div><p className="eyebrow">CADRE F2</p><h2>Activité confiée à un autre organisme</h2></div></header><div className="training-bpf-data-table"><div className="head"><span>Activité</span><span>Stagiaires</span><span>Heures-stagiaires</span></div><div><span>Actions sous-traitées par votre organisme</span><b>{calculation.trainees.outsourced_by_us.count}</b><b>{hoursLabel(calculation.trainees.outsourced_by_us.hours)}</b></div></div></section>
      <section className="panel training-bpf-table-section"><header><div><p className="eyebrow">CADRE F3</p><h2>Objectif général des prestations</h2></div></header><div className="training-bpf-data-table"><div className="head"><span>Objectif</span><span>Stagiaires</span><span>Heures-stagiaires</span></div>{Object.entries(trainingBpfObjectiveLabels).map(([key, label]) => { const value = calculation.objectives.categories[key as TrainingBpfObjective]; return <div key={key}><span>{label}</span><b>{value.count}</b><b>{hoursLabel(value.hours)}</b></div>; })}</div><details className="training-bpf-rncp"><summary>Détail des niveaux RNCP</summary><div className="training-bpf-data-table">{Object.entries(trainingBpfRncpLevelLabels).map(([key, label]) => { const value = calculation.objectives.rncp_levels[key as TrainingBpfRncpLevel]; return <div key={key}><span>{label}</span><b>{value.count}</b><b>{hoursLabel(value.hours)}</b></div>; })}</div></details></section>
      <section className="panel training-bpf-table-section"><header><div><p className="eyebrow">CADRE F4</p><h2>Principales spécialités de formation</h2></div></header><div className="training-bpf-data-table"><div className="head"><span>Spécialité</span><span>Stagiaires</span><span>Heures-stagiaires</span></div>{calculation.specialties.main.map((specialty) => <div key={`${specialty.code}-${specialty.name}`}><span><i>{specialty.code}</i>{specialty.name}</span><b>{specialty.count}</b><b>{hoursLabel(specialty.hours)}</b></div>)}{calculation.specialties.other.count > 0 && <div><span>Autres spécialités</span><b>{calculation.specialties.other.count}</b><b>{hoursLabel(calculation.specialties.other.hours)}</b></div>}<div className="total"><span>Total F4</span><b>{calculation.specialties.total.count}</b><b>{hoursLabel(calculation.specialties.total.hours)}</b></div></div></section>
      <section className="panel training-bpf-table-section"><header><div><p className="eyebrow">CADRE G</p><h2>Actions confiées à votre organisme</h2></div></header><div className="training-bpf-data-table"><div className="head"><span>Activité</span><span>Stagiaires</span><span>Heures-stagiaires</span></div><div><span>Interventions en sous-traitance</span><b>{calculation.trainees.subcontracted_for_other.count}</b><b>{hoursLabel(calculation.trainees.subcontracted_for_other.hours)}</b></div></div></section>
    </div>}

    {tab === 'sources' && <div className="training-bpf-sources">
      <details className="panel training-bpf-source-group" open>
        <summary><span><Icon name="graduation" size={19} /><strong>Formations et spécialités</strong></span><b>{[...periodProgramIds].length}</b></summary>
        <div className="training-bpf-source-list">{programs.filter((row) => periodProgramIds.has(row.id)).map((program) => { const draft = programDrafts[program.id]; if (!draft) return null; return <article key={program.id}><div className="training-bpf-source-title"><strong>{program.title}</strong><small>{program.code || 'Sans code interne'}</small></div><div className="training-bpf-program-fields"><select value={draft.objective} disabled={locked} onChange={(event) => setProgramDrafts({ ...programDrafts, [program.id]: { ...draft, objective: event.target.value as TrainingBpfObjective } })}>{Object.entries(trainingBpfObjectiveLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>{draft.objective === 'rncp' && <select value={draft.rncpLevel} disabled={locked} onChange={(event) => setProgramDrafts({ ...programDrafts, [program.id]: { ...draft, rncpLevel: event.target.value as TrainingBpfRncpLevel | '' } })}><option value="">Niveau RNCP</option>{Object.entries(trainingBpfRncpLevelLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>}<input value={draft.specialtyCode} disabled={locked} inputMode="numeric" maxLength={3} placeholder="Code NSF" onChange={(event) => setProgramDrafts({ ...programDrafts, [program.id]: { ...draft, specialtyCode: event.target.value.replace(/\D/g, '').slice(0, 3) } })} /><input value={draft.specialtyName} disabled={locked} placeholder="Spécialité dominante" onChange={(event) => setProgramDrafts({ ...programDrafts, [program.id]: { ...draft, specialtyName: event.target.value } })} /></div>{!locked && <button className="secondary-button compact-button" type="button" disabled={busyId === `program-${program.id}`} onClick={() => void saveProgram(program.id)}>{busyId === `program-${program.id}` ? 'Enregistrement…' : 'Enregistrer'}</button>}</article>; })}</div>
      </details>

      <details className="panel training-bpf-source-group">
        <summary><span><Icon name="calendar" size={19} /><strong>Sessions et réalisation</strong></span><b>{periodSessions.length}</b></summary>
        <div className="training-bpf-source-list compact">{periodSessions.map((session) => <article key={session.id}><div className="training-bpf-source-title"><strong>{session.title}</strong><small>{dateLabel(session.ends_at)} · {programById.get(session.program_id)?.title}</small></div><select value={session.bpf_delivery_mode ?? 'direct'} disabled={locked || busyId === `session-${session.id}`} onChange={(event) => void updateSession(session.id, event.target.value as TrainingBpfDeliveryMode)}>{Object.entries(trainingBpfDeliveryModeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></article>)}</div>
      </details>

      <details className="panel training-bpf-source-group" open={periodEnrollments.some((row) => !row.bpf_trainee_type)}>
        <summary><span><Icon name="users" size={19} /><strong>Catégorie des stagiaires</strong></span><b>{periodEnrollments.length}</b></summary>
        <div className="training-bpf-source-list compact">{periodEnrollments.map((enrollment) => { const session = periodSessions.find((row) => row.id === enrollment.session_id); const trainee = traineeById.get(enrollment.trainee_id); return <article key={`${enrollment.session_id}-${enrollment.trainee_id}`} className={!enrollment.bpf_trainee_type ? 'needs-review' : ''}><div className="training-bpf-source-title"><strong>{trainee ? personName(trainee.first_name, trainee.last_name) : 'Stagiaire'}</strong><small>{session?.title || 'Session'} · {enrollment.status}</small></div><select value={enrollment.bpf_trainee_type ?? ''} disabled={locked || busyId === `enrollment-${enrollment.session_id}-${enrollment.trainee_id}`} onChange={(event) => { const value = event.target.value as TrainingBpfTraineeType | ''; if (value) void updateEnrollment(enrollment.session_id, enrollment.trainee_id, value); }}><option value="">À classer</option>{Object.entries(trainingBpfTraineeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></article>; })}</div>
      </details>

      <details className="panel training-bpf-source-group">
        <summary><span><Icon name="briefcase" size={19} /><strong>Statut des formateurs</strong></span><b>{periodTrainerIds.size}</b></summary>
        <div className="training-bpf-source-list compact">{trainers.filter((row) => periodTrainerIds.has(row.id)).map((trainer) => <article key={trainer.id}><div className="training-bpf-source-title"><strong>{personName(trainer.first_name, trainer.last_name)}</strong><small>{trainer.specialties.join(' · ') || 'Formateur'}</small></div><select value={trainer.bpf_relationship ?? 'internal'} disabled={locked || busyId === `trainer-${trainer.id}`} onChange={(event) => void updateTrainer(trainer.id, event.target.value as TrainingBpfTrainerRelationship)}>{Object.entries(trainingBpfTrainerRelationshipLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></article>)}</div>
      </details>

      <details className="panel training-bpf-source-group" open={periodDocuments.some((row) => row.bpf_included && !row.bpf_revenue_category)}>
        <summary><span><Icon name="creditCard" size={19} /><strong>Produits financiers</strong></span><b>{periodDocuments.length}</b></summary>
        <div className="training-bpf-source-list">{periodDocuments.map((document) => { const draft = documentDrafts[document.id]; if (!draft) return null; return <article key={document.id} className={draft.included && !draft.category ? 'needs-review' : ''}><div className="training-bpf-source-title"><strong>{document.reference} · {document.title}</strong><small>{customerById.get(document.customer_id ?? '')?.legal_name || funderById.get(document.funder_id ?? '')?.name || 'Dossier commercial'} · {formatTrainingMoney(document.amount_excl_tax_cents)}</small></div><div className="training-bpf-document-fields"><label><input type="checkbox" checked={draft.included} disabled={locked} onChange={(event) => setDocumentDrafts({ ...documentDrafts, [document.id]: { ...draft, included: event.target.checked } })} /><span>Retenir</span></label><select value={draft.category} disabled={locked} onChange={(event) => setDocumentDrafts({ ...documentDrafts, [document.id]: { ...draft, category: event.target.value as TrainingBpfRevenueCategory | '' } })}><option value="">Catégorie financière</option>{trainingBpfRevenueKeys.map((key) => <option key={key} value={key}>{trainingBpfRevenueLabels[key]}</option>)}</select><input type="date" value={draft.recognizedAt} disabled={locked} onChange={(event) => setDocumentDrafts({ ...documentDrafts, [document.id]: { ...draft, recognizedAt: event.target.value } })} /></div>{!locked && <button className="secondary-button compact-button" type="button" disabled={busyId === `document-${document.id}`} onClick={() => void saveDocument(document.id)}>{busyId === `document-${document.id}` ? 'Enregistrement…' : 'Enregistrer'}</button>}</article>; })}</div>
      </details>
    </div>}

    <footer className="training-bpf-footer">
      <div><strong>{trainingBpfReportStatusLabels[report.status]}</strong><span>{calculation.quality.critical_count} bloquant{calculation.quality.critical_count > 1 ? 's' : ''} · {calculation.quality.warning_count} vigilance{calculation.quality.warning_count > 1 ? 's' : ''}</span></div>
      <div>{report.status === 'draft' && <button className="secondary-button" type="button" disabled={saving} onClick={() => void changeStatus('reviewed')}>Marquer comme vérifié</button>}{report.status === 'reviewed' && <button className="primary-button" type="button" disabled={saving || !calculation.quality.ready} onClick={() => void changeStatus('locked')}><Icon name="lock" size={17} /> Verrouiller le BPF</button>}{report.status === 'locked' && canReopen && <button className="secondary-button" type="button" disabled={saving} onClick={() => void reopenReport()}>Rouvrir le brouillon</button>}</div>
    </footer>
  </div>;
}
