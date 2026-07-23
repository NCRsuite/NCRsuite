import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatTrainingMoney,
  nullableText,
  trainingCrmActivityTypeLabels,
  trainingCrmSourceLabels,
  trainingCrmStageLabels,
  type TrainingCrmActivityRecord,
  type TrainingCrmActivityType,
  type TrainingCrmOpportunityRecord,
  type TrainingCrmSource,
  type TrainingCrmStage,
  type TrainingCustomerRecord,
  type TrainingProgramRecord
} from '../features/training/types';
import { readJsonStorage, writeJsonStorage } from '../lib/safeStorage';
import { supabase } from '../lib/supabase';

type Props = {
  customers: TrainingCustomerRecord[];
  programs: TrainingProgramRecord[];
  onCustomerCreated: (customer: TrainingCustomerRecord) => void;
  onCreateDocument: (opportunity: TrainingCrmOpportunityRecord) => void;
};

type OpportunityForm = {
  title: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  customerId: string;
  programId: string;
  source: TrainingCrmSource;
  amount: string;
  expectedCloseDate: string;
  nextActionLabel: string;
  nextActionAt: string;
  notes: string;
  siteId: string;
};

type ActivityForm = {
  activityType: TrainingCrmActivityType;
  subject: string;
  dueAt: string;
  details: string;
  completed: boolean;
};

const activeStages: TrainingCrmStage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won'];

function localDateTimeInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function tomorrowMorning() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return localDateTimeInput(date);
}

function inThirtyDays() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

function emptyOpportunity(siteId = ''): OpportunityForm {
  return {
    title: '',
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    customerId: '',
    programId: '',
    source: 'other',
    amount: '0',
    expectedCloseDate: inThirtyDays(),
    nextActionLabel: 'Rappeler le prospect',
    nextActionAt: tomorrowMorning(),
    notes: '',
    siteId
  };
}

const emptyActivity: ActivityForm = {
  activityType: 'task',
  subject: '',
  dueAt: tomorrowMorning(),
  details: '',
  completed: false
};

function moneyToCents(value: string) {
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : Number.NaN;
}

function dateTimeLabel(value: string | null) {
  if (!value) return 'Non planifiée';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function dateLabel(value: string | null) {
  if (!value) return 'Sans échéance';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`));
}

function isOverdue(value: string | null) {
  return Boolean(value && new Date(value).getTime() < Date.now());
}

function opportunityStorageKey(organizationId: string) {
  return `ncr-suite-training-crm-opportunities-${organizationId}`;
}

function activityStorageKey(organizationId: string) {
  return `ncr-suite-training-crm-activities-${organizationId}`;
}

const opportunitySelect = 'id,organization_id,site_id,customer_id,program_id,title,company_name,contact_name,contact_email,contact_phone,source,stage,estimated_value_cents,probability,expected_close_date,next_action_label,next_action_at,notes,lost_reason,assigned_to,created_by,won_at,lost_at,created_at,updated_at';
const activitySelect = 'id,organization_id,opportunity_id,activity_type,subject,details,due_at,status,completed_at,created_by,created_at,updated_at';

export function TrainingCrmPipeline({ customers, programs, onCustomerCreated, onCreateDocument }: Props) {
  const { organization, activeSiteId, sites } = useOrganization();
  const { user, demoMode } = useAuth();
  const [opportunities, setOpportunities] = useState<TrainingCrmOpportunityRecord[]>([]);
  const [activities, setActivities] = useState<TrainingCrmActivityRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [view, setView] = useState<'active' | 'lost'>('active');
  const [query, setQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [opportunityForm, setOpportunityForm] = useState<OpportunityForm>(() => emptyOpportunity());
  const [activityForm, setActivityForm] = useState<ActivityForm>(emptyActivity);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');

  const loadData = useCallback(async (showLoading = true) => {
    if (!organization) return;
    if (showLoading) setLoading(true);
    setError('');
    if (demoMode || !supabase) {
      const storedOpportunities = readJsonStorage<TrainingCrmOpportunityRecord[]>(opportunityStorageKey(organization.id), []);
      const visible = activeSiteId
        ? storedOpportunities.filter((row) => !row.site_id || row.site_id === activeSiteId)
        : storedOpportunities;
      setOpportunities(visible);
      setActivities(readJsonStorage<TrainingCrmActivityRecord[]>(activityStorageKey(organization.id), []));
      setLoading(false);
      return;
    }

    let opportunityRequest = supabase
      .from('training_crm_opportunities')
      .select(opportunitySelect)
      .eq('organization_id', organization.id)
      .order('updated_at', { ascending: false });
    if (activeSiteId) opportunityRequest = opportunityRequest.or(`site_id.is.null,site_id.eq.${activeSiteId}`);

    const [opportunityResult, activityResult] = await Promise.all([
      opportunityRequest,
      supabase
        .from('training_crm_activities')
        .select(activitySelect)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(800)
    ]);
    const firstError = opportunityResult.error || activityResult.error;
    if (firstError) {
      setError(`CRM indisponible : ${firstError.message}`);
    } else {
      setOpportunities((opportunityResult.data ?? []).map((row) => ({
        ...row,
        estimated_value_cents: Number(row.estimated_value_cents),
        probability: Number(row.probability)
      })) as TrainingCrmOpportunityRecord[]);
      setActivities((activityResult.data ?? []) as TrainingCrmActivityRecord[]);
    }
    setLoading(false);
  }, [organization, activeSiteId, demoMode]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const candidates = opportunities.filter((row) => view === 'lost' ? row.stage === 'lost' : row.stage !== 'lost');
    if (!selectedId && candidates.length > 0) setSelectedId(candidates[0].id);
    if (selectedId && !candidates.some((row) => row.id === selectedId)) setSelectedId(candidates[0]?.id ?? '');
  }, [opportunities, selectedId, view]);

  const customerById = useMemo(() => new Map(customers.map((row) => [row.id, row])), [customers]);
  const programById = useMemo(() => new Map(programs.map((row) => [row.id, row])), [programs]);
  const selectedOpportunity = useMemo(
    () => opportunities.find((row) => row.id === selectedId) ?? null,
    [opportunities, selectedId]
  );
  const selectedActivities = useMemo(
    () => activities.filter((row) => row.opportunity_id === selectedId),
    [activities, selectedId]
  );

  const filteredOpportunities = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    return opportunities.filter((row) => {
      if (view === 'lost' ? row.stage !== 'lost' : row.stage === 'lost') return false;
      if (!needle) return true;
      const customer = customerById.get(row.customer_id ?? '');
      const program = programById.get(row.program_id ?? '');
      return [row.title, row.company_name, row.contact_name, row.contact_email, customer?.legal_name, program?.title]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('fr')
        .includes(needle);
    });
  }, [opportunities, query, view, customerById, programById]);

  const plannedActions = useMemo(() => activities
    .filter((row) => row.status === 'planned' && row.due_at && opportunities.some((opportunity) => opportunity.id === row.opportunity_id && !['won', 'lost'].includes(opportunity.stage)))
    .sort((a, b) => new Date(a.due_at ?? 0).getTime() - new Date(b.due_at ?? 0).getTime()), [activities, opportunities]);

  const metrics = useMemo(() => {
    const open = opportunities.filter((row) => !['won', 'lost'].includes(row.stage));
    const closed = opportunities.filter((row) => ['won', 'lost'].includes(row.stage));
    const won = opportunities.filter((row) => row.stage === 'won');
    return {
      open: open.length,
      pipeline: open.reduce((sum, row) => sum + row.estimated_value_cents, 0),
      weighted: open.reduce((sum, row) => sum + Math.round(row.estimated_value_cents * row.probability / 100), 0),
      actions: plannedActions.length,
      conversion: closed.length > 0 ? Math.round(won.length / closed.length * 100) : null
    };
  }, [opportunities, plannedActions]);

  function persistDemo(nextOpportunities: TrainingCrmOpportunityRecord[], nextActivities = activities) {
    if (!organization) return;
    const storedOpportunities = readJsonStorage<TrainingCrmOpportunityRecord[]>(opportunityStorageKey(organization.id), []);
    const persistedOpportunities = activeSiteId
      ? [
          ...storedOpportunities.filter((row) => Boolean(row.site_id) && row.site_id !== activeSiteId),
          ...nextOpportunities
        ]
      : nextOpportunities;
    setOpportunities(nextOpportunities);
    setActivities(nextActivities);
    writeJsonStorage(opportunityStorageKey(organization.id), persistedOpportunities);
    writeJsonStorage(activityStorageKey(organization.id), nextActivities);
  }

  function openOpportunityEditor() {
    setOpportunityForm(emptyOpportunity(activeSiteId || sites[0]?.id || ''));
    setShowEditor(true);
    setError('');
    setSuccess('');
  }

  async function saveOpportunity(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !canManage) return;
    const amount = moneyToCents(opportunityForm.amount);
    if (opportunityForm.title.trim().length < 2) {
      setError('Renseigne le besoin commercial.');
      return;
    }
    if (!opportunityForm.customerId && !opportunityForm.companyName.trim() && !opportunityForm.contactName.trim()) {
      setError('Renseigne une entreprise, un contact ou sélectionne un client.');
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Le montant potentiel est invalide.');
      return;
    }
    if (opportunityForm.nextActionAt && !opportunityForm.nextActionLabel.trim()) {
      setError('Indique l’action à réaliser.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    const payload = {
      organization_id: organization.id,
      site_id: nullableText(opportunityForm.siteId),
      customer_id: nullableText(opportunityForm.customerId),
      program_id: nullableText(opportunityForm.programId),
      title: opportunityForm.title.trim(),
      company_name: nullableText(opportunityForm.companyName),
      contact_name: nullableText(opportunityForm.contactName),
      contact_email: nullableText(opportunityForm.contactEmail),
      contact_phone: nullableText(opportunityForm.contactPhone),
      source: opportunityForm.source,
      estimated_value_cents: amount,
      expected_close_date: nullableText(opportunityForm.expectedCloseDate),
      next_action_label: nullableText(opportunityForm.nextActionLabel),
      next_action_at: opportunityForm.nextActionAt ? new Date(opportunityForm.nextActionAt).toISOString() : null,
      notes: nullableText(opportunityForm.notes),
      assigned_to: user.id,
      created_by: user.id
    };

    try {
      if (demoMode || !supabase) {
        const now = new Date().toISOString();
        const created: TrainingCrmOpportunityRecord = {
          id: crypto.randomUUID(),
          ...payload,
          stage: 'new',
          probability: 20,
          lost_reason: null,
          won_at: null,
          lost_at: null,
          created_at: now,
          updated_at: now
        };
        const nextActivities = [...activities];
        if (created.next_action_at && created.next_action_label) {
          nextActivities.unshift({
            id: crypto.randomUUID(),
            organization_id: organization.id,
            opportunity_id: created.id,
            activity_type: 'task',
            subject: created.next_action_label,
            details: null,
            due_at: created.next_action_at,
            status: 'planned',
            completed_at: null,
            created_by: user.id,
            created_at: now,
            updated_at: now
          });
        }
        persistDemo([created, ...opportunities], nextActivities);
        setSelectedId(created.id);
      } else {
        const { data, error: insertError } = await supabase
          .from('training_crm_opportunities')
          .insert(payload)
          .select(opportunitySelect)
          .single();
        if (insertError) throw insertError;
        if (!data) throw new Error('L’opportunité créée n’a pas été retournée.');
        setSelectedId(String(data.id));
        await loadData(false);
      }
      setShowEditor(false);
      setSuccess('L’opportunité est ajoutée au pipeline.');
    } catch (caught) {
      setError(`Création impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  }

  async function moveOpportunity(opportunity: TrainingCrmOpportunityRecord, stage: TrainingCrmStage) {
    if (!organization || !canManage || opportunity.stage === stage) return;
    const lostReason = stage === 'lost' ? window.prompt('Pourquoi cette opportunité est-elle perdue ?') : null;
    if (stage === 'lost' && !lostReason?.trim()) return;
    setBusyId(opportunity.id);
    setError('');
    setSuccess('');
    try {
      if (demoMode || !supabase) {
        const now = new Date().toISOString();
        const moved: TrainingCrmOpportunityRecord = {
          ...opportunity,
          stage,
          probability: stage === 'won' ? 100 : stage === 'lost' ? 0 : Math.max(opportunity.probability, stage === 'qualified' ? 40 : stage === 'proposal' ? 60 : stage === 'negotiation' ? 80 : 20),
          lost_reason: stage === 'lost' ? lostReason : null,
          won_at: stage === 'won' ? now : null,
          lost_at: stage === 'lost' ? now : null,
          next_action_label: ['won', 'lost'].includes(stage) ? null : opportunity.next_action_label,
          next_action_at: ['won', 'lost'].includes(stage) ? null : opportunity.next_action_at,
          updated_at: now
        };
        const activity: TrainingCrmActivityRecord = {
          id: crypto.randomUUID(),
          organization_id: organization.id,
          opportunity_id: opportunity.id,
          activity_type: 'note',
          subject: `Étape mise à jour : ${trainingCrmStageLabels[stage]}`,
          details: lostReason,
          due_at: null,
          status: 'completed',
          completed_at: now,
          created_by: user?.id ?? null,
          created_at: now,
          updated_at: now
        };
        persistDemo(opportunities.map((row) => row.id === opportunity.id ? moved : row), [activity, ...activities]);
      } else {
        const { error: requestError } = await supabase.rpc('move_training_crm_opportunity', {
          p_organization_id: organization.id,
          p_opportunity_id: opportunity.id,
          p_stage: stage,
          p_lost_reason: lostReason
        });
        if (requestError) throw requestError;
        await loadData(false);
      }
      setSuccess(`Opportunité déplacée vers « ${trainingCrmStageLabels[stage]} ».`);
    } catch (caught) {
      setError(`Mise à jour impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally {
      setBusyId('');
    }
  }

  async function convertToCustomer(opportunity: TrainingCrmOpportunityRecord) {
    if (!organization || !user || !canManage || opportunity.customer_id) return;
    setBusyId(`customer-${opportunity.id}`);
    setError('');
    setSuccess('');
    try {
      let customer: TrainingCustomerRecord;
      if (demoMode || !supabase) {
        const customerId = crypto.randomUUID();
        customer = {
          id: customerId,
          organization_id: organization.id,
          site_id: opportunity.site_id,
          customer_type: 'company',
          legal_name: opportunity.company_name || opportunity.contact_name || opportunity.title,
          contact_name: opportunity.contact_name,
          email: opportunity.contact_email,
          phone: opportunity.contact_phone,
          billing_address: null,
          postal_code: null,
          city: null,
          siret: null,
          vat_number: null,
          notes: opportunity.notes,
          status: 'active',
          created_at: new Date().toISOString()
        };
        const existingCustomers = readJsonStorage<TrainingCustomerRecord[]>(`ncr-suite-training-customers-${organization.id}`, customers);
        writeJsonStorage(`ncr-suite-training-customers-${organization.id}`, [...existingCustomers, customer]);
        persistDemo(opportunities.map((row) => row.id === opportunity.id ? {
          ...row,
          customer_id: customerId,
          stage: row.stage === 'new' ? 'qualified' : row.stage,
          probability: row.stage === 'new' ? Math.max(row.probability, 40) : row.probability,
          updated_at: new Date().toISOString()
        } : row));
      } else {
        const { data, error: requestError } = await supabase.rpc('convert_training_crm_opportunity_to_customer', {
          p_organization_id: organization.id,
          p_opportunity_id: opportunity.id
        });
        if (requestError) throw requestError;
        const customerId = String((data as { customer_id?: string } | null)?.customer_id ?? '');
        if (!customerId) throw new Error('La fiche client n’a pas été retournée.');
        const { data: customerData, error: customerError } = await supabase
          .from('training_customers')
          .select('id,organization_id,site_id,customer_type,legal_name,contact_name,email,phone,billing_address,postal_code,city,siret,vat_number,notes,status,created_at,updated_at')
          .eq('organization_id', organization.id)
          .eq('id', customerId)
          .single();
        if (customerError) throw customerError;
        customer = customerData as TrainingCustomerRecord;
        await loadData(false);
      }
      onCustomerCreated(customer);
      setSuccess('La fiche client est créée et reliée à l’opportunité.');
    } catch (caught) {
      setError(`Conversion impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally {
      setBusyId('');
    }
  }

  async function saveActivity(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !selectedOpportunity || !canManage) return;
    if (activityForm.subject.trim().length < 2) {
      setError('Renseigne l’objet de l’action.');
      return;
    }
    const requiresDate = activityForm.activityType !== 'note' && !activityForm.completed;
    if (requiresDate && !activityForm.dueAt) {
      setError('Planifie la date de l’action.');
      return;
    }

    setSaving(true);
    setError('');
    const now = new Date().toISOString();
    const payload = {
      organization_id: organization.id,
      opportunity_id: selectedOpportunity.id,
      activity_type: activityForm.activityType,
      subject: activityForm.subject.trim(),
      details: nullableText(activityForm.details),
      due_at: activityForm.dueAt ? new Date(activityForm.dueAt).toISOString() : null,
      status: activityForm.activityType === 'note' || activityForm.completed ? 'completed' as const : 'planned' as const,
      completed_at: activityForm.activityType === 'note' || activityForm.completed ? now : null,
      created_by: user.id
    };
    try {
      if (demoMode || !supabase) {
        const created: TrainingCrmActivityRecord = {
          id: crypto.randomUUID(),
          ...payload,
          created_at: now,
          updated_at: now
        };
        const nextActivities = [created, ...activities];
        const nextPlanned = nextActivities
          .filter((row) => row.opportunity_id === selectedOpportunity.id && row.status === 'planned' && row.due_at)
          .sort((a, b) => new Date(a.due_at ?? 0).getTime() - new Date(b.due_at ?? 0).getTime())[0];
        persistDemo(opportunities.map((row) => row.id === selectedOpportunity.id ? {
          ...row,
          next_action_label: nextPlanned?.subject ?? null,
          next_action_at: nextPlanned?.due_at ?? null,
          updated_at: now
        } : row), nextActivities);
      } else {
        const { error: insertError } = await supabase.from('training_crm_activities').insert(payload);
        if (insertError) throw insertError;
        await loadData(false);
      }
      setActivityForm({ ...emptyActivity, dueAt: tomorrowMorning() });
      setSuccess('L’action est ajoutée à l’historique.');
    } catch (caught) {
      setError(`Action impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  }

  async function completeActivity(activity: TrainingCrmActivityRecord) {
    if (!organization || !canManage) return;
    setBusyId(`activity-${activity.id}`);
    setError('');
    try {
      if (demoMode || !supabase) {
        const now = new Date().toISOString();
        const nextActivities = activities.map((row) => row.id === activity.id ? { ...row, status: 'completed' as const, completed_at: now, updated_at: now } : row);
        const nextPlanned = nextActivities
          .filter((row) => row.opportunity_id === activity.opportunity_id && row.status === 'planned' && row.due_at)
          .sort((a, b) => new Date(a.due_at ?? 0).getTime() - new Date(b.due_at ?? 0).getTime())[0];
        persistDemo(opportunities.map((row) => row.id === activity.opportunity_id ? {
          ...row,
          next_action_label: nextPlanned?.subject ?? null,
          next_action_at: nextPlanned?.due_at ?? null,
          updated_at: now
        } : row), nextActivities);
      } else {
        const { error: requestError } = await supabase.rpc('set_training_crm_activity_completed', {
          p_organization_id: organization.id,
          p_activity_id: activity.id,
          p_completed: true
        });
        if (requestError) throw requestError;
        await loadData(false);
      }
      setSuccess('Action terminée.');
    } catch (caught) {
      setError(`Mise à jour impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally {
      setBusyId('');
    }
  }

  if (!organization) return null;

  const boardStages = view === 'lost' ? ['lost'] as TrainingCrmStage[] : activeStages;

  return (
    <section className="training-crm-layout">
      <div className="training-crm-toolbar">
        <div className="training-crm-view-toggle" role="tablist" aria-label="Vue du pipeline">
          <button type="button" className={view === 'active' ? 'active' : ''} onClick={() => setView('active')}>Pipeline</button>
          <button type="button" className={view === 'lost' ? 'active' : ''} onClick={() => setView('lost')}>Perdues</button>
        </div>
        <label className="search-field training-crm-search"><span className="sr-only">Rechercher une opportunité</span><Icon name="search" size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Entreprise, contact, formation…" /></label>
        {canManage && <button type="button" className="primary-button" onClick={openOpportunityEditor}><Icon name="plus" size={17} />Nouvelle opportunité</button>}
      </div>

      <div className="training-crm-metrics">
        <article><small>Opportunités ouvertes</small><strong>{metrics.open}</strong><span>en cours de suivi</span></article>
        <article><small>Pipeline HT</small><strong>{formatTrainingMoney(metrics.pipeline)}</strong><span>{formatTrainingMoney(metrics.weighted)} pondérés</span></article>
        <article><small>Actions à réaliser</small><strong>{metrics.actions}</strong><span>{plannedActions.filter((row) => isOverdue(row.due_at)).length} en retard</span></article>
        <article><small>Taux de transformation</small><strong>{metrics.conversion == null ? '—' : `${metrics.conversion} %`}</strong><span>opportunités clôturées</span></article>
      </div>

      {showEditor && (
        <section className="panel training-form-panel training-crm-editor">
          <div className="panel-header"><div><p className="eyebrow">NOUVEAU PROSPECT</p><h2>Ajouter une opportunité</h2></div><button type="button" className="secondary-button compact-button" onClick={() => setShowEditor(false)}>Fermer</button></div>
          <form className="training-form-grid" onSubmit={saveOpportunity}>
            <label>Besoin / projet *<input autoFocus required value={opportunityForm.title} onChange={(event) => setOpportunityForm({ ...opportunityForm, title: event.target.value })} placeholder="Ex. Formation SST pour 12 salariés" /></label>
            <label>Entreprise<input value={opportunityForm.companyName} onChange={(event) => setOpportunityForm({ ...opportunityForm, companyName: event.target.value })} /></label>
            <label>Client existant<select value={opportunityForm.customerId} onChange={(event) => { const customer = customerById.get(event.target.value); setOpportunityForm({ ...opportunityForm, customerId: event.target.value, companyName: customer?.legal_name || opportunityForm.companyName, contactName: customer?.contact_name || opportunityForm.contactName, contactEmail: customer?.email || opportunityForm.contactEmail, contactPhone: customer?.phone || opportunityForm.contactPhone }); }}><option value="">Nouveau prospect</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.legal_name}</option>)}</select></label>
            <label>Contact<input value={opportunityForm.contactName} onChange={(event) => setOpportunityForm({ ...opportunityForm, contactName: event.target.value })} /></label>
            <label>E-mail<input type="email" value={opportunityForm.contactEmail} onChange={(event) => setOpportunityForm({ ...opportunityForm, contactEmail: event.target.value })} /></label>
            <label>Téléphone<input value={opportunityForm.contactPhone} onChange={(event) => setOpportunityForm({ ...opportunityForm, contactPhone: event.target.value })} /></label>
            <label>Origine<select value={opportunityForm.source} onChange={(event) => setOpportunityForm({ ...opportunityForm, source: event.target.value as TrainingCrmSource })}>{Object.entries(trainingCrmSourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Formation envisagée<select value={opportunityForm.programId} onChange={(event) => { const program = programById.get(event.target.value); setOpportunityForm({ ...opportunityForm, programId: event.target.value, title: opportunityForm.title || program?.title || '', amount: program ? String(program.price_excl_tax_cents / 100).replace('.', ',') : opportunityForm.amount }); }}><option value="">À définir</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.title}</option>)}</select></label>
            <label>Montant potentiel HT (€)<input inputMode="decimal" value={opportunityForm.amount} onChange={(event) => setOpportunityForm({ ...opportunityForm, amount: event.target.value })} /></label>
            <label>Décision estimée<input type="date" value={opportunityForm.expectedCloseDate} onChange={(event) => setOpportunityForm({ ...opportunityForm, expectedCloseDate: event.target.value })} /></label>
            <label>Prochaine action<input value={opportunityForm.nextActionLabel} onChange={(event) => setOpportunityForm({ ...opportunityForm, nextActionLabel: event.target.value })} /></label>
            <label>Date de relance<input type="datetime-local" value={opportunityForm.nextActionAt} onChange={(event) => setOpportunityForm({ ...opportunityForm, nextActionAt: event.target.value })} /></label>
            {sites.length > 1 && <label>Établissement<select value={opportunityForm.siteId} onChange={(event) => setOpportunityForm({ ...opportunityForm, siteId: event.target.value })}><option value="">Global</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>}
            <label className="full-field">Notes<textarea rows={3} value={opportunityForm.notes} onChange={(event) => setOpportunityForm({ ...opportunityForm, notes: event.target.value })} /></label>
            <div className="form-actions full-field"><button type="button" className="secondary-button" onClick={() => setShowEditor(false)}>Annuler</button><button className="primary-button" disabled={saving}>{saving ? 'Création…' : 'Ajouter au pipeline'}</button></div>
          </form>
        </section>
      )}

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      <div className="training-crm-workspace">
        <div className={`training-crm-board ${view === 'lost' ? 'lost-view' : ''}`}>
          {boardStages.map((stage) => {
            const rows = filteredOpportunities.filter((row) => row.stage === stage);
            const total = rows.reduce((sum, row) => sum + row.estimated_value_cents, 0);
            return (
              <section key={stage} className={`training-crm-column stage-${stage}`}>
                <header><span>{trainingCrmStageLabels[stage]}</span><strong>{rows.length}</strong><small>{formatTrainingMoney(total)}</small></header>
                <div>
                  {loading && <div className="training-crm-empty">Chargement…</div>}
                  {!loading && rows.length === 0 && <div className="training-crm-empty">Aucune opportunité</div>}
                  {rows.map((opportunity) => {
                    const customer = customerById.get(opportunity.customer_id ?? '');
                    const program = programById.get(opportunity.program_id ?? '');
                    return (
                      <article key={opportunity.id} className={selectedId === opportunity.id ? 'selected' : ''}>
                        <button type="button" className="training-crm-card-main" onClick={() => setSelectedId(opportunity.id)}>
                          <span><strong>{opportunity.title}</strong><small>{customer?.legal_name || opportunity.company_name || opportunity.contact_name || 'Prospect à compléter'}</small></span>
                          <em>{formatTrainingMoney(opportunity.estimated_value_cents)}</em>
                          {program && <span className="training-crm-program">{program.title}</span>}
                          <span className={`training-crm-next-action ${isOverdue(opportunity.next_action_at) ? 'overdue' : ''}`}><Icon name="clock" size={13} />{opportunity.next_action_label ? `${opportunity.next_action_label} · ${dateTimeLabel(opportunity.next_action_at)}` : opportunity.stage === 'lost' ? opportunity.lost_reason || 'Raison non renseignée' : 'Aucune relance planifiée'}</span>
                        </button>
                        {canManage && <select aria-label={`Étape de ${opportunity.title}`} value={opportunity.stage} disabled={busyId === opportunity.id} onChange={(event) => void moveOpportunity(opportunity, event.target.value as TrainingCrmStage)}>{Object.entries(trainingCrmStageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="panel training-crm-actions-panel">
          <div className="panel-header"><div><p className="eyebrow">RELANCES</p><h2>Prochaines actions</h2></div><span>{plannedActions.length}</span></div>
          <div className="training-crm-action-list">
            {plannedActions.length === 0 && <div className="training-crm-positive"><Icon name="check" size={20} /><span><strong>Tout est à jour</strong><small>Aucune relance planifiée.</small></span></div>}
            {plannedActions.slice(0, 16).map((activity) => {
              const opportunity = opportunities.find((row) => row.id === activity.opportunity_id);
              return (
                <article key={activity.id} className={isOverdue(activity.due_at) ? 'overdue' : ''}>
                  <button type="button" className="training-crm-action-main" onClick={() => setSelectedId(activity.opportunity_id)}>
                    <strong>{activity.subject}</strong>
                    <span>{opportunity?.company_name || opportunity?.contact_name || opportunity?.title}</span>
                    <small>{dateTimeLabel(activity.due_at)}</small>
                  </button>
                  {canManage && <button type="button" className="icon-button" title="Marquer comme terminée" disabled={busyId === `activity-${activity.id}`} onClick={() => void completeActivity(activity)}><Icon name="check" size={16} /></button>}
                </article>
              );
            })}
          </div>
        </aside>
      </div>

      {selectedOpportunity && (
        <section className="panel training-crm-detail">
          <header className="training-crm-detail-head">
            <div>
              <p className="eyebrow">FICHE OPPORTUNITÉ</p>
              <h2>{selectedOpportunity.title}</h2>
              <p>{customerById.get(selectedOpportunity.customer_id ?? '')?.legal_name || selectedOpportunity.company_name || selectedOpportunity.contact_name} · décision {dateLabel(selectedOpportunity.expected_close_date)}</p>
            </div>
            <div className="training-crm-detail-actions">
              {!selectedOpportunity.customer_id && canManage && <button type="button" className="secondary-button compact-button" disabled={busyId === `customer-${selectedOpportunity.id}`} onClick={() => void convertToCustomer(selectedOpportunity)}><Icon name="building" size={16} />{busyId === `customer-${selectedOpportunity.id}` ? 'Création…' : 'Créer la fiche client'}</button>}
              {selectedOpportunity.customer_id && canManage && !['won', 'lost'].includes(selectedOpportunity.stage) && <button type="button" className="primary-button compact-button" onClick={() => onCreateDocument(selectedOpportunity)}><Icon name="file" size={16} />Préparer le devis</button>}
            </div>
          </header>

          <div className="training-crm-detail-grid">
            <div className="training-crm-contact">
              <h3>Contact</h3>
              <dl>
                <div><dt>Entreprise</dt><dd>{customerById.get(selectedOpportunity.customer_id ?? '')?.legal_name || selectedOpportunity.company_name || 'À compléter'}</dd></div>
                <div><dt>Interlocuteur</dt><dd>{selectedOpportunity.contact_name || 'À compléter'}</dd></div>
                <div><dt>E-mail</dt><dd>{selectedOpportunity.contact_email || 'À compléter'}</dd></div>
                <div><dt>Téléphone</dt><dd>{selectedOpportunity.contact_phone || 'À compléter'}</dd></div>
                <div><dt>Origine</dt><dd>{trainingCrmSourceLabels[selectedOpportunity.source]}</dd></div>
                <div><dt>Probabilité</dt><dd>{selectedOpportunity.probability} %</dd></div>
              </dl>
              {selectedOpportunity.notes && <p>{selectedOpportunity.notes}</p>}
            </div>

            <div className="training-crm-history">
              <h3>Historique</h3>
              <div>
                {selectedActivities.length === 0 && <div className="training-crm-empty">Aucune activité enregistrée.</div>}
                {selectedActivities.slice(0, 30).map((activity) => (
                  <article key={activity.id}>
                    <span className={activity.status}><Icon name={activity.activity_type === 'email' ? 'message' : activity.activity_type === 'meeting' ? 'calendar' : activity.activity_type === 'call' ? 'headset' : activity.activity_type === 'task' ? 'check' : 'file'} size={15} /></span>
                    <div><strong>{activity.subject}</strong><small>{trainingCrmActivityTypeLabels[activity.activity_type]} · {activity.status === 'planned' ? dateTimeLabel(activity.due_at) : dateTimeLabel(activity.completed_at || activity.created_at)}</small>{activity.details && <p>{activity.details}</p>}</div>
                    {activity.status === 'planned' && canManage && <button type="button" className="icon-button" title="Marquer comme terminée" onClick={() => void completeActivity(activity)}><Icon name="check" size={15} /></button>}
                  </article>
                ))}
              </div>
            </div>

            {canManage && !['won', 'lost'].includes(selectedOpportunity.stage) && (
              <form className="training-crm-activity-form" onSubmit={saveActivity}>
                <h3>Ajouter une action</h3>
                <label>Type<select value={activityForm.activityType} onChange={(event) => setActivityForm({ ...activityForm, activityType: event.target.value as TrainingCrmActivityType })}>{Object.entries(trainingCrmActivityTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label>Objet<input required value={activityForm.subject} onChange={(event) => setActivityForm({ ...activityForm, subject: event.target.value })} placeholder="Ex. Présenter le programme" /></label>
                {activityForm.activityType !== 'note' && <label>Date<input type="datetime-local" value={activityForm.dueAt} onChange={(event) => setActivityForm({ ...activityForm, dueAt: event.target.value })} /></label>}
                {activityForm.activityType !== 'note' && <label className="training-crm-checkbox"><input type="checkbox" checked={activityForm.completed} onChange={(event) => setActivityForm({ ...activityForm, completed: event.target.checked })} />Action déjà réalisée</label>}
                <label>Détail<textarea rows={3} value={activityForm.details} onChange={(event) => setActivityForm({ ...activityForm, details: event.target.value })} /></label>
                <button className="primary-button" disabled={saving}><Icon name="plus" size={16} />{saving ? 'Ajout…' : 'Ajouter'}</button>
              </form>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
