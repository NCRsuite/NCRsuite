import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AdminCreateSpaceModal } from '../components/AdminCreateSpaceModal';
import { BillingAdminPanel } from '../components/BillingAdminPanel';
import { MetierAdminPanel } from '../components/MetierAdminPanel';
import { OfferCatalogAdminPanel } from '../components/OfferCatalogAdminPanel';
import { PushAdminPanel } from '../components/PushAdminPanel';
import { AdminSaasCockpit } from '../components/AdminSaasCockpit';
import { AdminSupportPanel } from '../components/AdminSupportPanel';
import { AdminActivityPanel } from '../components/AdminActivityPanel';
import { AdminDiagnosticsPanel } from '../components/AdminDiagnosticsPanel';
import { AdminMonitoringPanel } from '../components/AdminMonitoringPanel';
import { AdminTrainingSavPanel } from '../components/AdminTrainingSavPanel';
import { AdminAccessRequestsPanel } from '../components/AdminAccessRequestsPanel';
import { AdminCommercialReadinessPanel } from '../components/AdminCommercialReadinessPanel';
import { AdminNotificationCenter, type AdminNotificationSection } from '../components/AdminNotificationCenter';
import { Icon } from '../components/Icon';
import { PremiumSkeleton } from '../components/PremiumSkeleton';
import { useAuth } from '../contexts/AuthContext';
import { usePlatformAdmin } from '../contexts/PlatformAdminContext';
import { businessPacks, businessTypeOptions } from '../config/businessPacks';
import { getDomainPlans } from '../config/domainPlans';
import { supabase } from '../lib/supabase';
import type { BusinessType, OrganizationStatus, Plan, SubscriptionStatus } from '../types';

interface AdminMetrics {
  organizations_total: number;
  organizations_active: number;
  organizations_trial: number;
  organizations_suspended: number;
  active_users: number;
  estimated_mrr_cents: number;
  trials_ending_soon: number;
}

interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  business_type: BusinessType;
  plan: Plan;
  organization_status: OrganizationStatus;
  subscription_status: SubscriptionStatus;
  monthly_price_cents: number;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  provider: 'manual' | 'qonto' | 'stripe';
  internal_notes: string | null;
  owner_email: string | null;
  active_members: number;
  clients_count: number;
  appointments_count: number;
  documents_bytes: number;
  open_tickets: number;
  onboarding_status: 'not_started' | 'in_progress' | 'completed';
  onboarding_requested_plan: Plan | null;
  company_phone: string | null;
  company_city: string | null;
  health: 'healthy' | 'attention' | 'critical';
  last_activity_at: string | null;
  created_at: string;
}

type AdminClientTab = 'summary' | 'access' | 'subscription' | 'support' | 'activity' | 'advanced';

interface AdminClientHub {
  members: Array<{
    user_id: string;
    email: string;
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
    role: string;
    status: string;
    created_at: string;
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    expires_at: string;
    created_at: string;
  }>;
  support_tickets: Array<{
    id: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    updated_at: string;
    created_at: string;
  }>;
  support_access: null | {
    id: string;
    ticket_id: string;
    status: string;
    reason: string;
    duration_minutes: number;
    requested_at: string;
    approved_at: string | null;
    started_at: string | null;
    expires_at: string | null;
    ended_at: string | null;
  };
  activity: Array<{
    id: number;
    action: string;
    entity_type: string;
    entity_id: string | null;
    actor_email: string | null;
    created_at: string;
  }>;
  counts: {
    pending_invitations: number;
    open_tickets: number;
    urgent_tickets: number;
  };
}

const emptyClientHub: AdminClientHub = {
  members: [],
  invitations: [],
  support_tickets: [],
  support_access: null,
  activity: [],
  counts: { pending_invitations: 0, open_tickets: 0, urgent_tickets: 0 }
};

const emptyMetrics: AdminMetrics = {
  organizations_total: 0,
  organizations_active: 0,
  organizations_trial: 0,
  organizations_suspended: 0,
  active_users: 0,
  estimated_mrr_cents: 0,
  trials_ending_soon: 0
};

const planValues: Plan[] = ['decouverte', 'essentielle', 'professionnelle', 'metier'];
const platformAdminSections = [
  'cockpit','access','overview','support','activity','diagnostics',
  'monitoring','validation','trainingSav','catalogue','billing','metier','push'
] as const;
type PlatformAdminSection = typeof platformAdminSections[number];

const clientAdminSections = new Set<PlatformAdminSection>(['overview','access']);
const billingAdminSections = new Set<PlatformAdminSection>(['billing','catalogue','metier']);
const platformAdminAdvancedSections = new Set<PlatformAdminSection>(['activity','diagnostics','monitoring','validation','trainingSav','push']);

const adminGroupLabels = {
  cockpit: 'Vue d’ensemble',
  clients: 'Clients',
  billing: 'Abonnements & essais',
  support: 'Assistance NCR',
  platform: 'Plateforme'
} as const;

function adminSectionGroup(section: PlatformAdminSection) {
  if (section === 'cockpit') return 'cockpit';
  if (clientAdminSections.has(section)) return 'clients';
  if (billingAdminSections.has(section)) return 'billing';
  if (section === 'support') return 'support';
  return 'platform';
}

const planLabels: Record<Plan, string> = {
  decouverte: 'Découverte',
  essentielle: 'Essentielle',
  professionnelle: 'Professionnelle',
  metier: 'Métier'
};

function adminPlansFor(businessType: BusinessType) {
  const definitions = getDomainPlans(businessType);
  return planValues.map((value) => ({
    value,
    label: definitions[value].label,
    defaultPrice: definitions[value].monthlyPriceCents,
    memberLimit: definitions[value].memberLimit,
    detail: definitions[value].detail,
    additions: definitions[value].additions
  }));
}

const organizationStatusLabels: Record<OrganizationStatus, string> = {
  trial: 'Essai',
  active: 'Active',
  suspended: 'Suspendue',
  closed: 'Fermée'
};

const subscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  trialing: 'Période d’essai',
  active: 'Actif',
  past_due: 'Paiement en retard',
  paused: 'En pause',
  canceled: 'Résilié'
};

function money(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);
}

function bytesLabel(value: number) {
  if (!value) return '0 Mo';
  const megabytes = value / (1024 * 1024);
  if (megabytes < 1024) return `${megabytes.toFixed(megabytes < 10 ? 1 : 0)} Mo`;
  return `${(megabytes / 1024).toFixed(1)} Go`;
}

function dateLabel(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));
}

function dateTimeLabel(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function daysUntil(value: string | null) {
  if (!value) return null;
  const end = new Date(value).getTime();
  if (!Number.isFinite(end)) return null;
  return Math.ceil((end - Date.now()) / 86_400_000);
}

function roleLabel(value: string) {
  if (value === 'owner') return 'Propriétaire';
  if (value === 'admin') return 'Administrateur';
  if (value === 'manager') return 'Manager';
  if (value === 'trainer') return 'Formateur';
  if (value === 'agent') return 'Agent';
  return value.split('_').join(' ');
}

function supportStatusLabel(value: string) {
  const labels: Record<string, string> = { open: 'Nouveau', in_progress: 'En cours', waiting_customer: 'Attente client', resolved: 'Résolu', closed: 'Fermé' };
  return labels[value] ?? value;
}

function supportAccessStatusLabel(value: string) {
  const labels: Record<string, string> = { pending: 'Autorisation demandée', approved: 'Autorisation accordée', active: 'Prise en main active' };
  return labels[value] ?? value;
}

function activityLabel(value: string) {
  const labels: Record<string, string> = {
    'platform.support_access_requested': 'Demande de prise en main NCR',
    'platform.support_session_started': 'Prise en main NCR démarrée',
    'support.access_approved': 'Prise en main autorisée par le client',
    'support.access_denied': 'Prise en main refusée par le client',
    'organization.created_trial': 'Espace créé en essai',
    'organization.created_payment_required': 'Espace créé — paiement requis',
    'organization.onboarding_completed_trial': 'Démarrage terminé pendant l’essai',
    'organization.onboarding_completed_payment_pending': 'Démarrage terminé — paiement en attente'
  };
  if (labels[value]) return labels[value];
  return value.split('.').join(' · ').split('_').join(' ');
}

function inputDate(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

function dateToIso(value: string) {
  return value ? new Date(`${value}T23:59:59`).toISOString() : null;
}

function statusClass(value: string) {
  if (['active', 'trial', 'trialing'].includes(value)) return 'positive';
  if (['suspended', 'paused', 'past_due'].includes(value)) return 'warning';
  if (['closed', 'canceled'].includes(value)) return 'negative';
  return '';
}

function initialPlatformAdminSection(): PlatformAdminSection {
  const requested = new URLSearchParams(window.location.search).get('section');
  return platformAdminSections.includes(requested as PlatformAdminSection)
    ? requested as PlatformAdminSection
    : 'cockpit';
}

export function PlatformAdminPage() {
  const [activeSection, setActiveSection] = useState<PlatformAdminSection>(initialPlatformAdminSection);
  const { user, signOut } = useAuth();
  const { profile, canManage } = usePlatformAdmin();
  const [metrics, setMetrics] = useState<AdminMetrics>(emptyMetrics);
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [selected, setSelected] = useState<AdminOrganization | null>(null);
  const [clientDetailTab, setClientDetailTab] = useState<AdminClientTab>('summary');
  const [clientHub, setClientHub] = useState<AdminClientHub>(emptyClientHub);
  const [clientHubLoading, setClientHubLoading] = useState(false);
  const [clientHubError, setClientHubError] = useState('');
  const [supportSearchSeed, setSupportSearchSeed] = useState('');
  const [supportTicketSeed, setSupportTicketSeed] = useState('');
  const [search, setSearch] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<AdminOrganization[]>([]);
  const [globalSearchFocused, setGlobalSearchFocused] = useState(false);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [domainFilter, setDomainFilter] = useState<'all' | BusinessType>('all');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [loginEmail, setLoginEmail] = useState(user?.email ?? '');
  const [changingLoginEmail, setChangingLoginEmail] = useState(false);
  const [showDeleteOrganization, setShowDeleteOrganization] = useState(false);
  const [deleteOrganizationName, setDeleteOrganizationName] = useState('');
  const [deletingOrganization, setDeletingOrganization] = useState(false);

  const [editPlan, setEditPlan] = useState<Plan>('decouverte');
  const [editOrganizationStatus, setEditOrganizationStatus] = useState<OrganizationStatus>('active');
  const [editSubscriptionStatus, setEditSubscriptionStatus] = useState<SubscriptionStatus>('active');
  const [editPrice, setEditPrice] = useState('0.00');
  const [editTrialEnd, setEditTrialEnd] = useState('');
  const [editPeriodEnd, setEditPeriodEnd] = useState('');
  const [editCancelAtPeriodEnd, setEditCancelAtPeriodEnd] = useState(false);
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notificationId = params.get('notification');
    if (!notificationId || !supabase) return;

    void (async () => {
      try {
        await supabase.rpc('mark_platform_admin_notifications_read', {
          p_notification_id: notificationId
        });
      } finally {
        window.history.replaceState({}, '', '/administration-ncr');
      }
    })();
  }, []);

  function populateEditor(org: AdminOrganization) {
    setSelected(org);
    setEditPlan(org.plan);
    setEditOrganizationStatus(org.organization_status);
    setEditSubscriptionStatus(org.subscription_status);
    setEditPrice((org.monthly_price_cents / 100).toFixed(2));
    setEditTrialEnd(inputDate(org.trial_ends_at));
    setEditPeriodEnd(inputDate(org.current_period_end));
    setEditCancelAtPeriodEnd(org.cancel_at_period_end);
    setEditNotes(org.internal_notes ?? '');
    setMessage('');
    setError('');
    setShowDeleteOrganization(false);
    setDeleteOrganizationName('');
  }

  async function loadDashboard() {
    if (!supabase) return;
    const { data, error: requestError } = await supabase.rpc('admin_platform_dashboard');
    if (requestError) throw requestError;
    setMetrics((data ?? emptyMetrics) as AdminMetrics);
  }

  async function loadOrganizations(preserveSelection = true) {
    if (!supabase) return;
    const { data, error: requestError } = await supabase.rpc('admin_list_organizations', {
      p_search: search.trim() || null,
      p_plan: planFilter || null,
      p_status: statusFilter || null
    });
    if (requestError) throw requestError;
    const rows = (Array.isArray(data) ? data : []) as AdminOrganization[];
    setOrganizations(rows);
    if (preserveSelection && selected) {
      const nextSelected = rows.find((row) => row.id === selected.id);
      if (nextSelected) populateEditor(nextSelected);
      else setSelected(null);
    }
  }

  async function loadClientHub(organizationId: string) {
    const client = supabase;
    if (!client) return;
    setClientHubLoading(true);
    setClientHubError('');
    const { data, error: requestError } = await client.rpc('admin_get_organization_hub', {
      p_organization_id: organizationId
    });
    if (requestError) {
      setClientHub(emptyClientHub);
      setClientHubError(requestError.message);
    } else {
      const payload = (data ?? {}) as Partial<AdminClientHub>;
      setClientHub({
        ...emptyClientHub,
        ...payload,
        counts: { ...emptyClientHub.counts, ...(payload.counts ?? {}) }
      });
    }
    setClientHubLoading(false);
  }

  async function loadAll(preserveSelection = true) {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadDashboard(), loadOrganizations(preserveSelection)]);
    } catch (requestError: any) {
      setError(requestError?.message ?? 'Impossible de charger l’administration NCR.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll(false);
  }, []);

  useEffect(() => {
    setLoginEmail(user?.email ?? '');
  }, [user?.email]);

  useEffect(() => {
    if (!selected?.id) {
      setClientHub(emptyClientHub);
      setClientHubError('');
      return;
    }
    setClientDetailTab('summary');
    void loadClientHub(selected.id);
  }, [selected?.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrganizations(false).catch((requestError: any) => setError(requestError?.message ?? 'Recherche impossible.'));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [search, planFilter, statusFilter]);

  useEffect(() => {
    const needle = globalSearch.trim();
    const client = supabase;
    if (!client || needle.length < 2) {
      setGlobalSearchResults([]);
      setGlobalSearchLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        setGlobalSearchLoading(true);
        const { data, error: requestError } = await client.rpc('admin_list_organizations', {
          p_search: needle,
          p_plan: null,
          p_status: null
        });
        if (requestError) {
          setGlobalSearchResults([]);
        } else {
          setGlobalSearchResults(((Array.isArray(data) ? data : []) as AdminOrganization[]).slice(0, 7));
        }
        setGlobalSearchLoading(false);
      })();
    }, 180);

    return () => window.clearTimeout(timer);
  }, [globalSearch]);

  const domainCounts = useMemo(() => {
    const counts = new Map<BusinessType, number>();
    for (const organization of organizations) counts.set(organization.business_type, (counts.get(organization.business_type) ?? 0) + 1);
    return counts;
  }, [organizations]);

  const visibleOrganizations = useMemo(
    () => organizations.filter((organization) => domainFilter === 'all' || organization.business_type === domainFilter),
    [organizations, domainFilter]
  );

  const organizationGroups = useMemo(() => businessTypeOptions
    .map((domain) => ({
      domain,
      organizations: visibleOrganizations.filter((organization) => organization.business_type === domain.id)
    }))
    .filter((group) => group.organizations.length > 0), [visibleOrganizations]);

  const selectedPlans = useMemo(() => adminPlansFor(selected?.business_type ?? 'coiffure'), [selected?.business_type]);
  const selectedPlan = useMemo(() => selectedPlans.find((plan) => plan.value === editPlan), [selectedPlans, editPlan]);

  function changePlan(value: Plan) {
    setEditPlan(value);
    const defaultPrice = selectedPlans.find((plan) => plan.value === value)?.defaultPrice ?? 0;
    setEditPrice((defaultPrice / 100).toFixed(2));
  }

  async function changeSuperAdminLoginEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || profile?.role !== 'super_admin') return;

    const nextEmail = loginEmail.trim().toLowerCase();
    if (!nextEmail || nextEmail === user?.email?.toLowerCase()) {
      setError(nextEmail ? 'Cette adresse est déjà utilisée pour ta connexion.' : 'Saisis une adresse e-mail valide.');
      setMessage('');
      return;
    }

    setChangingLoginEmail(true);
    setError('');
    setMessage('');

    const { error: updateError } = await supabase.auth.updateUser(
      { email: nextEmail },
      { emailRedirectTo: `${window.location.origin}/administration-ncr` }
    );

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage(
        'La demande de changement a été envoyée. Confirme les e-mails reçus sur l’ancienne et la nouvelle adresse, puis reconnecte-toi avec la nouvelle adresse.'
      );
    }

    setChangingLoginEmail(false);
  }

  async function handleSpaceCreated(_organizationId: string, organizationName: string) {
    setShowCreateSpace(false);
    setSearch('');
    setDomainFilter('all');
    setPlanFilter('');
    setStatusFilter('');
    setError('');
    setMessage(`L’espace ${organizationName} a été créé. Le propriétaire le verra dans « Changer d’entreprise » avec son abonnement séparé.`);
    await loadAll(false);
  }

  async function saveSubscription(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !supabase || !canManage) return;

    const priceCents = Math.round(Number(editPrice.replace(',', '.')) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      setError('Le tarif mensuel est invalide.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    const { error: requestError } = await supabase.rpc('admin_update_organization_subscription', {
      p_organization_id: selected.id,
      p_plan: editPlan,
      p_organization_status: editOrganizationStatus,
      p_subscription_status: editSubscriptionStatus,
      p_monthly_price_cents: priceCents,
      p_trial_ends_at: dateToIso(editTrialEnd),
      p_current_period_end: dateToIso(editPeriodEnd),
      p_cancel_at_period_end: editCancelAtPeriodEnd,
      p_internal_notes: editNotes.trim() || null
    });

    if (requestError) {
      setError(requestError.message);
    } else {
      setMessage('L’abonnement et l’accès de l’entreprise ont été mis à jour.');
      await loadAll(true);
      await loadClientHub(selected.id);
    }
    setSaving(false);
  }


  async function deleteSelectedOrganization() {
    if (!selected || !supabase || profile?.role !== 'super_admin') return;
    if (deleteOrganizationName.trim().toLocaleLowerCase('fr-FR') !== selected.name.trim().toLocaleLowerCase('fr-FR')) {
      setError('Saisis exactement le nom de l’entreprise pour confirmer la suppression.');
      return;
    }

    setDeletingOrganization(true);
    setError('');
    setMessage('');

    const { data, error: requestError } = await supabase.functions.invoke('admin-delete-organization', {
      body: {
        organizationId: selected.id,
        confirmationName: deleteOrganizationName.trim()
      }
    });

    if (requestError) {
      setError(requestError.message || 'Suppression impossible.');
      setDeletingOrganization(false);
      return;
    }

    if (data?.error) {
      setError(String(data.error));
      setDeletingOrganization(false);
      return;
    }

    const deletedName = selected.name;
    const storageWarningCount = Array.isArray(data?.storage_warnings) ? data.storage_warnings.length : 0;
    setSelected(null);
    setShowDeleteOrganization(false);
    setDeleteOrganizationName('');
    setMessage(
      storageWarningCount > 0
        ? `L’entreprise ${deletedName} a été supprimée. Certains fichiers devront être vérifiés dans Supabase Storage.`
        : `L’entreprise ${deletedName} et toutes ses données ont été supprimées définitivement.`
    );
    await loadAll(false);
    setDeletingOrganization(false);
  }

  function openSupportForOrganization(organization: AdminOrganization) {
    setSupportTicketSeed('');
    setSupportSearchSeed(organization.name);
    setActiveSection('support');
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  function openSupportTicket(ticketId?: string) {
    setSupportSearchSeed('');
    setSupportTicketSeed(ticketId ?? '');
    setActiveSection('support');
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  function openOrganizationFromSupport(organizationId: string) {
    const organization = organizations.find((row) => row.id === organizationId);
    if (organization) populateEditor(organization);
    setActiveSection('overview');
    setSearch('');
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  function openOrganizationFromGlobalSearch(organization: AdminOrganization) {
    setGlobalSearch('');
    setGlobalSearchResults([]);
    setGlobalSearchFocused(false);
    setSearch('');
    setDomainFilter('all');
    setPlanFilter('');
    setStatusFilter('');
    populateEditor(organization);
    setActiveSection('overview');
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  function openNotificationSection(section: AdminNotificationSection) {
    setActiveSection(section);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  const selectedTrialDays = selected?.organization_status === 'trial' ? daysUntil(selected.trial_ends_at) : null;
  const selectedAttentionItems = selected ? [
    ...(selected.health === 'critical' ? [{ icon: 'alert' as const, tone: 'danger', title: 'État critique', detail: 'Un statut d’accès, de paiement ou un ticket urgent demande une vérification.' }] : []),
    ...(selectedTrialDays !== null && selectedTrialDays <= 3 ? [{ icon: 'clock' as const, tone: selectedTrialDays < 0 ? 'danger' : 'warning', title: selectedTrialDays < 0 ? 'Essai arrivé à échéance' : `Essai : J-${Math.max(selectedTrialDays, 0)}`, detail: selectedTrialDays < 0 ? 'Les données restent conservées. Vérifie la conversion ou le statut d’accès.' : 'La fin de l’essai approche : vérifie le suivi commercial.' }] : []),
    ...(clientHub.counts.urgent_tickets > 0 ? [{ icon: 'headset' as const, tone: 'danger', title: `${clientHub.counts.urgent_tickets} ticket(s) urgent(s)`, detail: 'Ouvre l’Assistance NCR pour traiter la demande en priorité.' }] : []),
    ...(clientHub.counts.open_tickets > 0 && clientHub.counts.urgent_tickets === 0 ? [{ icon: 'message' as const, tone: 'info', title: `${clientHub.counts.open_tickets} demande(s) d’assistance ouverte(s)`, detail: 'Une conversation avec cette entreprise est en cours.' }] : []),
    ...(clientHub.counts.pending_invitations > 0 ? [{ icon: 'users' as const, tone: 'warning', title: `${clientHub.counts.pending_invitations} invitation(s) en attente`, detail: 'Des accès n’ont pas encore été acceptés.' }] : []),
    ...(selected.onboarding_status !== 'completed' ? [{ icon: 'clipboard' as const, tone: 'warning', title: 'Démarrage incomplet', detail: 'L’entreprise n’a pas encore terminé toute sa section Démarrage.' }] : [])
  ] : [];

  return (
    <div className="platform-admin-page">
      <header className="platform-admin-topbar">
        <div className="platform-admin-brand">
          <img src="/brand/ncr-suite-logo-horizontal.png" alt="NCR Suite" />
          <span>Administration centrale</span>
        </div>
        <div className="platform-admin-global-search">
          <Icon name="search" size={18} />
          <input
            value={globalSearch}
            onChange={(event) => setGlobalSearch(event.target.value)}
            onFocus={() => setGlobalSearchFocused(true)}
            onBlur={() => window.setTimeout(() => setGlobalSearchFocused(false), 120)}
            placeholder="Rechercher une entreprise, un e-mail…"
            aria-label="Recherche globale dans les entreprises"
          />
          {globalSearch && <button type="button" className="platform-admin-search-clear" onMouseDown={(event) => event.preventDefault()} onClick={() => { setGlobalSearch(''); setGlobalSearchResults([]); }} aria-label="Effacer la recherche"><Icon name="close" size={15} /></button>}
          {globalSearchFocused && globalSearch.trim().length >= 2 && (
            <div className="platform-admin-search-results">
              {globalSearchLoading && <div className="platform-admin-search-state">Recherche…</div>}
              {!globalSearchLoading && globalSearchResults.length === 0 && <div className="platform-admin-search-state">Aucune entreprise trouvée.</div>}
              {!globalSearchLoading && globalSearchResults.map((organization) => (
                <button key={organization.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => openOrganizationFromGlobalSearch(organization)}>
                  <span className="admin-company-avatar">{organization.name.slice(0, 1).toUpperCase()}</span>
                  <span><strong>{organization.name}</strong><small>{businessPacks[organization.business_type].label} · {organization.owner_email || organization.slug}</small></span>
                  <span className={`admin-health-pill ${organization.health}`}><i />{organization.health === 'healthy' ? 'Saine' : organization.health === 'attention' ? 'À surveiller' : 'Critique'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="platform-admin-account">
          {canManage && <button type="button" className="secondary-button platform-admin-create-button" onClick={() => setShowCreateSpace(true)}><Icon name="plus" size={16} /><span>Créer un espace</span></button>}
          <AdminNotificationCenter onNavigate={openNotificationSection} />
          <span><strong>{user?.user_metadata?.full_name || 'NCR Admin'}</strong><small>{profile?.role === 'super_admin' ? 'Super-administrateur' : 'Support'}</small></span>
          <button className="icon-button" type="button" onClick={() => signOut()} aria-label="Se déconnecter"><Icon name="logout" size={19} /></button>
        </div>
      </header>

      <main className="platform-admin-content">
        {error && <div className="error-message page-message" role="alert">{error}</div>}
        {message && <div className="success-message page-message" role="status">{message}</div>}

        {profile?.role === 'super_admin' && platformAdminAdvancedSections.has(activeSection) && (
          <section className="panel" aria-labelledby="super-admin-login-email-title">
            <div className="panel-header">
              <div>
                <p className="eyebrow">COMPTE SUPER-ADMINISTRATEUR</p>
                <h2 id="super-admin-login-email-title">Adresse de connexion</h2>
                <p>Le changement conserve le même compte, le même mot de passe et tous les droits d’administration.</p>
              </div>
            </div>
            <form onSubmit={changeSuperAdminLoginEmail} className="form-grid">
              <label className="field">
                <span>Nouvelle adresse e-mail</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="contact@ncr-suite.fr"
                  required
                />
              </label>
              <div className="form-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={changingLoginEmail || loginEmail.trim().toLowerCase() === user?.email?.toLowerCase()}
                >
                  {changingLoginEmail ? 'Envoi en cours…' : 'Changer mon e-mail de connexion'}
                </button>
              </div>
            </form>
          </section>
        )}

        <nav className="platform-admin-tabs admin-saas-tabs admin-primary-nav" aria-label="Navigation principale de l’administration NCR">
          <button type="button" className={adminSectionGroup(activeSection) === 'cockpit' ? 'active' : ''} onClick={() => setActiveSection('cockpit')}><Icon name="home" size={19} /><span><strong>Vue d’ensemble</strong><small>Priorités et pilotage du jour</small></span></button>
          <button type="button" className={adminSectionGroup(activeSection) === 'clients' ? 'active' : ''} onClick={() => setActiveSection('overview')}><Icon name="building" size={19} /><span><strong>Clients</strong><small>Entreprises et demandes d’accès</small></span></button>
          <button type="button" className={adminSectionGroup(activeSection) === 'billing' ? 'active' : ''} onClick={() => setActiveSection('billing')}><Icon name="creditCard" size={19} /><span><strong>Abonnements & essais</strong><small>Essais, Stripe, offres et paiements</small></span></button>
          <button type="button" className={adminSectionGroup(activeSection) === 'support' ? 'active' : ''} onClick={() => { setSupportSearchSeed(''); setSupportTicketSeed(''); setActiveSection('support'); }}><Icon name="headset" size={19} /><span><strong>Assistance NCR</strong><small>Conversations et prises en main</small></span></button>
          <button type="button" className={adminSectionGroup(activeSection) === 'platform' ? 'active' : ''} onClick={() => setActiveSection('monitoring')}><Icon name="tool" size={19} /><span><strong>Plateforme</strong><small>Surveillance et outils avancés</small></span></button>
        </nav>

        <div className="admin-current-zone" aria-live="polite">
          <span>{adminGroupLabels[adminSectionGroup(activeSection)]}</span>
          <button type="button" onClick={() => void loadAll(true)} disabled={loading}><Icon name="refresh" size={14} /> {loading ? 'Actualisation…' : 'Actualiser les données'}</button>
        </div>

        {clientAdminSections.has(activeSection) && (
          <nav className="admin-secondary-nav" aria-label="Gestion des clients">
            <button type="button" className={activeSection === 'overview' ? 'active' : ''} onClick={() => setActiveSection('overview')}><Icon name="building" size={16} /> Entreprises</button>
            <button type="button" className={activeSection === 'access' ? 'active' : ''} onClick={() => setActiveSection('access')}><Icon name="users" size={16} /> Demandes d’accès</button>
          </nav>
        )}

        {billingAdminSections.has(activeSection) && (
          <nav className="admin-secondary-nav" aria-label="Abonnements et offres">
            <button type="button" className={activeSection === 'billing' ? 'active' : ''} onClick={() => setActiveSection('billing')}><Icon name="creditCard" size={16} /> Abonnements & essais</button>
            <button type="button" className={activeSection === 'catalogue' ? 'active' : ''} onClick={() => setActiveSection('catalogue')}><Icon name="clipboard" size={16} /> Catalogue des offres</button>
            <button type="button" className={activeSection === 'metier' ? 'active' : ''} onClick={() => setActiveSection('metier')}><Icon name="tool" size={16} /> Offres Métier</button>
          </nav>
        )}

        {platformAdminAdvancedSections.has(activeSection) && (
          <nav className="admin-secondary-nav admin-secondary-nav-scroll" aria-label="Outils avancés de la plateforme">
            <button type="button" className={activeSection === 'monitoring' ? 'active' : ''} onClick={() => setActiveSection('monitoring')}><Icon name="shield" size={16} /> Surveillance</button>
            <button type="button" className={activeSection === 'diagnostics' ? 'active' : ''} onClick={() => setActiveSection('diagnostics')}><Icon name="monitor" size={16} /> Diagnostic</button>
            <button type="button" className={activeSection === 'activity' ? 'active' : ''} onClick={() => setActiveSection('activity')}><Icon name="activity" size={16} /> Journal</button>
            <button type="button" className={activeSection === 'validation' ? 'active' : ''} onClick={() => setActiveSection('validation')}><Icon name="clipboard" size={16} /> Recette client</button>
            <button type="button" className={activeSection === 'trainingSav' ? 'active' : ''} onClick={() => setActiveSection('trainingSav')}><Icon name="graduation" size={16} /> SAV Formation</button>
            <button type="button" className={activeSection === 'push' ? 'active' : ''} onClick={() => setActiveSection('push')}><Icon name="bell" size={16} /> Push</button>
          </nav>
        )}

        {activeSection === 'cockpit' && (
          <AdminSaasCockpit
            onOpenOrganizations={() => setActiveSection('overview')}
            onOpenBilling={() => setActiveSection('billing')}
            onOpenSupport={openSupportTicket}
            onOpenActivity={() => setActiveSection('activity')}
          />
        )}

        {activeSection === 'support' && <AdminSupportPanel key={`${supportSearchSeed || 'all-support'}:${supportTicketSeed || 'queue'}`} initialSearch={supportSearchSeed} initialTicketId={supportTicketSeed} onOpenOrganization={openOrganizationFromSupport} />}
        {activeSection === 'access' && <AdminAccessRequestsPanel canReview={profile?.role === 'super_admin'} />}
        {activeSection === 'activity' && <AdminActivityPanel />}
        {activeSection === 'diagnostics' && <AdminDiagnosticsPanel onOpenSupport={() => setActiveSection('support')} />}
        {activeSection === 'monitoring' && <AdminMonitoringPanel />}
        {activeSection === 'validation' && <AdminCommercialReadinessPanel />}
        {activeSection === 'trainingSav' && <AdminTrainingSavPanel />}

        {activeSection === 'overview' && (<>
        <section className="admin-clients-heading">
          <div><p className="eyebrow">PORTEFEUILLE CLIENT</p><h1>Entreprises</h1><p>Retrouve un client, vérifie son état et modifie son accès sans entrer dans ses données métier.</p></div>
          {canManage && <button type="button" className="primary-button" onClick={() => setShowCreateSpace(true)}><Icon name="plus" size={17} /> Créer un espace</button>}
        </section>
        <section className="platform-admin-metrics">
          <article><span className="admin-metric-icon"><Icon name="building" size={22} /></span><div><small>Entreprises</small><strong>{metrics.organizations_total}</strong><em>{metrics.organizations_active} actives</em></div></article>
          <article><span className="admin-metric-icon"><Icon name="creditCard" size={22} /></span><div><small>MRR estimé</small><strong>{money(metrics.estimated_mrr_cents)}</strong><em>abonnements actifs</em></div></article>
          <article><span className="admin-metric-icon"><Icon name="users" size={22} /></span><div><small>Accès actifs</small><strong>{metrics.active_users}</strong><em>toutes entreprises</em></div></article>
          <article><span className="admin-metric-icon"><Icon name="activity" size={22} /></span><div><small>Essais</small><strong>{metrics.organizations_trial}</strong><em>{metrics.trials_ending_soon} finissent sous 7 jours</em></div></article>
          <article><span className="admin-metric-icon danger"><Icon name="lock" size={22} /></span><div><small>Suspendues</small><strong>{metrics.organizations_suspended}</strong><em>accès métier bloqué</em></div></article>
        </section>

        <section className="platform-admin-workspace">
          <article className="panel admin-organizations-panel">
            <div className="panel-header admin-list-header">
              <div><p className="eyebrow">ENTREPRISES</p><h2>Comptes clients</h2></div>
              <div className="admin-list-header-actions">
                <span>{visibleOrganizations.length} résultat(s) · {organizationGroups.length} domaine(s)</span>
                {canManage && (
                  <button type="button" className="primary-button compact" onClick={() => setShowCreateSpace(true)}>
                    <Icon name="plus" size={17} />
                    Créer un espace
                  </button>
                )}
              </div>
            </div>

            <div className="admin-filters">
              <label className="admin-search-field"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, identifiant ou e-mail…" /></label>
              <select value={domainFilter} onChange={(event) => setDomainFilter(event.target.value as 'all' | BusinessType)} aria-label="Filtrer par domaine">
                <option value="all">Tous les domaines</option>
                {businessTypeOptions.map((domain) => <option key={domain.id} value={domain.id}>{domain.label} ({domainCounts.get(domain.id) ?? 0})</option>)}
              </select>
              <select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)} aria-label="Filtrer par formule">
                <option value="">Toutes les formules</option>
                {planValues.map((plan) => <option key={plan} value={plan}>{planLabels[plan]}</option>)}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrer par statut">
                <option value="">Tous les statuts</option>
                <option value="trial">Essai</option>
                <option value="active">Active</option>
                <option value="suspended">Suspendue</option>
                <option value="closed">Fermée</option>
              </select>
            </div>

            <div className="admin-organization-list admin-domain-organization-list">
              {loading && <PremiumSkeleton label="Chargement des entreprises" rows={4} compact />}
              {!loading && visibleOrganizations.length === 0 && <div className="admin-empty-state">Aucune entreprise ne correspond aux filtres.</div>}
              {!loading && organizationGroups.map(({ domain, organizations: domainOrganizations }) => (
                <section className="admin-domain-group" key={domain.id}>
                  <header className="admin-domain-group-header">
                    <span className="admin-domain-group-icon"><Icon name={businessPacks[domain.id].icon} size={18} /></span>
                    <div><strong>{domain.label}</strong><small>{domainOrganizations.length} entreprise{domainOrganizations.length > 1 ? 's' : ''}</small></div>
                  </header>
                  <div className="admin-domain-group-rows">
                    {domainOrganizations.map((org) => (
                      <button key={org.id} type="button" className={`admin-organization-row${selected?.id === org.id ? ' selected' : ''}`} onClick={() => populateEditor(org)}>
                        <span className="admin-company-avatar">{org.name.slice(0, 1).toUpperCase()}</span>
                        <span className="admin-company-main"><strong>{org.name}</strong><small>{org.owner_email || org.slug}</small></span>
                        <span className="admin-company-stats"><small>{org.active_members} utilisateur(s)</small><small>{org.open_tickets} ticket(s)</small></span>
                        <span className="admin-company-plan">{planLabels[org.plan]}<small>{money(org.monthly_price_cents)}/mois</small></span>
                        <span className={`admin-health-pill ${org.health}`}><i />{org.health === 'healthy' ? 'Saine' : org.health === 'attention' ? 'À surveiller' : 'Critique'}</span>
                        <Icon name="chevronRight" size={18} />
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </article>

          <aside className="panel admin-editor-panel admin-client-hub-panel">
            {!selected ? (
              <div className="admin-editor-empty">
                <span><Icon name="building" size={28} /></span>
                <h2>Sélectionne une entreprise</h2>
                <p>Sa fiche client centralisera les accès, l’abonnement, l’assistance NCR et l’activité utile.</p>
              </div>
            ) : (
              <form onSubmit={saveSubscription} className="admin-subscription-form admin-client-hub-form">
                <header className="admin-client-hub-head">
                  <div className="admin-editor-company">
                    <span className="admin-company-avatar large">{selected.name.slice(0, 1).toUpperCase()}</span>
                    <div><p className="eyebrow">FICHE CLIENT</p><h2>{selected.name}</h2><small>{businessPacks[selected.business_type].label} · {selected.owner_email || 'Propriétaire non identifié'}</small></div>
                  </div>
                  <div className="admin-client-hub-head-actions">
                    <span className={`admin-health-pill ${selected.health}`}><i />{selected.health === 'healthy' ? 'Saine' : selected.health === 'attention' ? 'À surveiller' : 'Prioritaire'}</span>
                    <button type="button" className="secondary-button compact" onClick={() => openSupportForOrganization(selected)}><Icon name="headset" size={15} /> Assistance {selected.open_tickets > 0 ? `(${selected.open_tickets})` : ''}</button>
                  </div>
                </header>

                <nav className="admin-client-hub-tabs" aria-label={`Fiche de ${selected.name}`}>
                  <button type="button" className={clientDetailTab === 'summary' ? 'active' : ''} onClick={() => setClientDetailTab('summary')}><Icon name="home" size={15} /> Synthèse</button>
                  <button type="button" className={clientDetailTab === 'access' ? 'active' : ''} onClick={() => setClientDetailTab('access')}><Icon name="users" size={15} /> Accès {clientHub.counts.pending_invitations > 0 && <b>{clientHub.counts.pending_invitations}</b>}</button>
                  <button type="button" className={clientDetailTab === 'subscription' ? 'active' : ''} onClick={() => setClientDetailTab('subscription')}><Icon name="creditCard" size={15} /> Abonnement</button>
                  <button type="button" className={clientDetailTab === 'support' ? 'active' : ''} onClick={() => setClientDetailTab('support')}><Icon name="headset" size={15} /> Assistance {clientHub.counts.open_tickets > 0 && <b>{clientHub.counts.open_tickets}</b>}</button>
                  <button type="button" className={clientDetailTab === 'activity' ? 'active' : ''} onClick={() => setClientDetailTab('activity')}><Icon name="activity" size={15} /> Activité</button>
                  {profile?.role === 'super_admin' && <button type="button" className={clientDetailTab === 'advanced' ? 'active' : ''} onClick={() => setClientDetailTab('advanced')}><Icon name="settings" size={15} /> Avancé</button>}
                </nav>

                {clientHubError && <div className="warning-message admin-client-hub-load-error"><Icon name="alert" size={16} /><span>Les informations détaillées n’ont pas pu être chargées : {clientHubError}</span><button type="button" onClick={() => void loadClientHub(selected.id)}>Réessayer</button></div>}

                {clientDetailTab === 'summary' && (
                  <div className="admin-client-hub-view">
                    <section className="admin-client-attention-block">
                      <div className="admin-client-section-title"><div><p className="eyebrow">À TRAITER</p><h3>Ce qui mérite ton attention</h3></div><span>{selectedAttentionItems.length}</span></div>
                      {clientHubLoading ? <PremiumSkeleton label="Analyse de la fiche client" rows={2} compact /> : selectedAttentionItems.length === 0 ? (
                        <div className="admin-client-all-good"><Icon name="check" size={20} /><div><strong>Rien d’urgent</strong><small>L’entreprise ne présente aucun point prioritaire actuellement.</small></div></div>
                      ) : (
                        <div className="admin-client-attention-list">
                          {selectedAttentionItems.map((item, index) => <article key={`${item.title}-${index}`} className={`admin-client-attention-item ${item.tone}`}><span><Icon name={item.icon} size={17} /></span><div><strong>{item.title}</strong><small>{item.detail}</small></div></article>)}
                        </div>
                      )}
                    </section>

                    <div className="admin-detail-strip admin-detail-strip-rich admin-client-summary-strip">
                      <div><span>Utilisateurs</span><strong>{selected.active_members}</strong></div>
                      <div><span>Formule</span><strong>{planLabels[selected.plan]}</strong></div>
                      <div><span>Mensuel HT</span><strong>{money(selected.monthly_price_cents)}</strong></div>
                      <div><span>Dernière activité</span><strong>{dateLabel(selected.last_activity_at)}</strong></div>
                    </div>

                    <section className="admin-client-summary-grid">
                      <article>
                        <span><Icon name="building" size={18} /></span>
                        <div><small>Entreprise</small><strong>{selected.company_city || 'Localisation non renseignée'}</strong><em>{selected.company_phone || selected.owner_email || selected.slug}</em></div>
                      </article>
                      <article>
                        <span><Icon name="creditCard" size={18} /></span>
                        <div><small>Abonnement</small><strong>{organizationStatusLabels[selected.organization_status]} · {subscriptionStatusLabels[selected.subscription_status]}</strong><em>{selected.provider === 'stripe' ? 'Stripe' : selected.provider === 'qonto' ? 'Qonto' : 'Gestion manuelle'}</em></div>
                      </article>
                      <article>
                        <span><Icon name="clipboard" size={18} /></span>
                        <div><small>Démarrage</small><strong>{selected.onboarding_status === 'completed' ? 'Terminé' : 'À terminer'}</strong><em>Créée {dateLabel(selected.created_at)}</em></div>
                      </article>
                      <article>
                        <span><Icon name="file" size={18} /></span>
                        <div><small>Données</small><strong>{bytesLabel(selected.documents_bytes)} de documents</strong><em>{selected.clients_count} client(s) · {selected.appointments_count} rendez-vous</em></div>
                      </article>
                    </section>

                    {selected.organization_status === 'trial' && (
                      <section className="admin-client-trial-card">
                        <span><Icon name="clock" size={20} /></span>
                        <div><small>ESSAI EN COURS</small><strong>{selectedTrialDays === null ? 'Date de fin à vérifier' : selectedTrialDays < 0 ? 'Essai arrivé à échéance' : `${selectedTrialDays} jour${selectedTrialDays > 1 ? 's' : ''} restant${selectedTrialDays > 1 ? 's' : ''}`}</strong><em>Fin prévue : {dateLabel(selected.trial_ends_at)} · données conservées après échéance.</em></div>
                        <button type="button" className="secondary-button compact" onClick={() => setClientDetailTab('subscription')}>Gérer</button>
                      </section>
                    )}

                    <div className="admin-client-summary-actions">
                      <button type="button" className="primary-button" onClick={() => setClientDetailTab('subscription')}><Icon name="creditCard" size={16} /> Gérer l’abonnement</button>
                      <button type="button" className="secondary-button" onClick={() => setClientDetailTab('access')}><Icon name="users" size={16} /> Voir les accès</button>
                      <button type="button" className="secondary-button" onClick={() => setClientDetailTab('support')}><Icon name="headset" size={16} /> Assistance NCR</button>
                    </div>
                  </div>
                )}

                {clientDetailTab === 'access' && (
                  <div className="admin-client-hub-view">
                    <div className="admin-client-section-title"><div><p className="eyebrow">UTILISATEURS & ACCÈS</p><h3>Qui peut entrer dans cet espace</h3><p>Lecture centralisée des membres actifs ou désactivés et des invitations encore en attente.</p></div><span>{clientHub.members.length}</span></div>
                    {clientHubLoading ? <PremiumSkeleton label="Chargement des accès" rows={4} compact /> : <>
                      <div className="admin-client-member-list">
                        {clientHub.members.length === 0 && <div className="admin-empty-state">Aucun membre rattaché à cette entreprise.</div>}
                        {clientHub.members.map((member) => <article key={member.user_id}>
                          <span className="admin-member-avatar">{member.full_name.slice(0, 1).toUpperCase()}</span>
                          <div><strong>{member.full_name}</strong><small>{member.email}{member.phone ? ` · ${member.phone}` : ''}</small></div>
                          <span className="admin-member-role">{roleLabel(member.role)}</span>
                          <span className={`admin-status-pill ${member.status === 'active' ? 'positive' : 'warning'}`}>{member.status === 'active' ? 'Actif' : 'Désactivé'}</span>
                        </article>)}
                      </div>
                      {clientHub.invitations.length > 0 && <section className="admin-client-pending-access"><div className="admin-client-mini-title"><strong>Invitations en attente</strong><span>{clientHub.invitations.length}</span></div>{clientHub.invitations.map((invitation) => <article key={invitation.id}><span><Icon name="message" size={16} /></span><div><strong>{invitation.email}</strong><small>{roleLabel(invitation.role)} · expire {dateLabel(invitation.expires_at)}</small></div></article>)}</section>}
                    </>}
                    <div className="info-message admin-client-readonly-note"><Icon name="info" size={17} /><span>Cette vue reste volontairement sûre : les changements de compte métier se font depuis l’espace client ou pendant une prise en main NCR autorisée.</span></div>
                  </div>
                )}

                {clientDetailTab === 'subscription' && (
                  <div className="admin-client-hub-view">
                    <div className="admin-client-section-title"><div><p className="eyebrow">ABONNEMENT</p><h3>Formule, essai et accès commercial</h3><p>Les réglages importants sont regroupés ici, loin des outils techniques.</p></div><span className={`admin-status-pill ${statusClass(editSubscriptionStatus)}`}>{subscriptionStatusLabels[editSubscriptionStatus]}</span></div>
                    {!canManage && <div className="info-message">Ton rôle Support permet la consultation, mais pas la modification des formules.</div>}
                    <div className="admin-form-grid">
                      <label>
                        Formule
                        <select value={editPlan} onChange={(event) => changePlan(event.target.value as Plan)} disabled={!canManage}>
                          {selectedPlans.map((plan) => <option key={plan.value} value={plan.value}>{plan.label}</option>)}
                        </select>
                        <small>Limite prévue : {selectedPlan?.memberLimit ?? 1} accès · tarif catalogue {money(selectedPlan?.defaultPrice ?? 0)} HT/mois.</small>
                      </label>
                      <label>
                        Tarif mensuel HT
                        <div className="admin-price-input"><input inputMode="decimal" value={editPrice} onChange={(event) => setEditPrice(event.target.value)} disabled={!canManage} /><span>€</span></div>
                        <small>Modifiable pour les offres Métier ou les accords spécifiques.</small>
                      </label>
                      <div className="info-message full-field admin-plan-summary">
                        <strong>{selectedPlan?.label} — offre {businessPacks[selected.business_type].label}</strong>
                        <span>{selectedPlan?.detail}</span>
                        <ul>{selectedPlan?.additions.map((addition) => <li key={addition}>{addition}</li>)}</ul>
                      </div>
                      <label>
                        Accès de l’entreprise
                        <select value={editOrganizationStatus} onChange={(event) => setEditOrganizationStatus(event.target.value as OrganizationStatus)} disabled={!canManage}>
                          <option value="trial">Essai</option><option value="active">Active</option><option value="suspended">Suspendue</option><option value="closed">Fermée</option>
                        </select>
                      </label>
                      <label>
                        État de l’abonnement
                        <select value={editSubscriptionStatus} onChange={(event) => setEditSubscriptionStatus(event.target.value as SubscriptionStatus)} disabled={!canManage}>
                          <option value="trialing">Période d’essai</option><option value="active">Actif</option><option value="past_due">Paiement en retard</option><option value="paused">En pause</option><option value="canceled">Résilié</option>
                        </select>
                      </label>
                      <label>Fin de l’essai<input type="date" value={editTrialEnd} onChange={(event) => setEditTrialEnd(event.target.value)} disabled={!canManage} /></label>
                      <label>Fin de période<input type="date" value={editPeriodEnd} onChange={(event) => setEditPeriodEnd(event.target.value)} disabled={!canManage} /></label>
                      <label className="admin-checkbox-field full-field"><input type="checkbox" checked={editCancelAtPeriodEnd} onChange={(event) => setEditCancelAtPeriodEnd(event.target.checked)} disabled={!canManage} /><span><strong>Résiliation en fin de période</strong><small>L’accès reste actif jusqu’à la date prévue.</small></span></label>
                      <label className="full-field">Note interne NCR<textarea rows={4} maxLength={2000} value={editNotes} onChange={(event) => setEditNotes(event.target.value)} disabled={!canManage} placeholder="Échange commercial, particularité du contrat, incident de paiement…" /></label>
                    </div>
                    <div className="admin-current-status"><span className={`admin-status-pill ${statusClass(editOrganizationStatus)}`}>{organizationStatusLabels[editOrganizationStatus]}</span><span className={`admin-status-pill ${statusClass(editSubscriptionStatus)}`}>{subscriptionStatusLabels[editSubscriptionStatus]}</span><span>{selected.provider === 'qonto' ? 'Paiement Qonto' : selected.provider === 'stripe' ? 'Paiement Stripe' : 'Gestion manuelle'}</span></div>
                    {canManage && <button className="primary-button full" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer la formule et l’accès'}</button>}
                  </div>
                )}

                {clientDetailTab === 'support' && (
                  <div className="admin-client-hub-view">
                    <div className="admin-client-section-title"><div><p className="eyebrow">ASSISTANCE NCR</p><h3>Conversations et prise en main</h3><p>Tu vois ici l’état du support sans quitter la fiche client.</p></div><span>{clientHub.counts.open_tickets}</span></div>
                    {clientHub.support_access && <article className={`admin-client-support-access ${clientHub.support_access.status}`}><span><Icon name="monitor" size={20} /></span><div><small>{supportAccessStatusLabel(clientHub.support_access.status)}</small><strong>{clientHub.support_access.reason}</strong><em>{clientHub.support_access.status === 'active' ? `Expire ${dateTimeLabel(clientHub.support_access.expires_at)}` : `${clientHub.support_access.duration_minutes} min demandées · ${dateTimeLabel(clientHub.support_access.requested_at)}`}</em></div></article>}
                    {clientHubLoading ? <PremiumSkeleton label="Chargement de l’assistance" rows={3} compact /> : <div className="admin-client-ticket-list">
                      {clientHub.support_tickets.length === 0 && <div className="admin-client-all-good"><Icon name="check" size={20} /><div><strong>Aucune demande récente</strong><small>Cette entreprise n’a pas de ticket d’assistance à afficher.</small></div></div>}
                      {clientHub.support_tickets.map((ticket) => <article key={ticket.id} className={ticket.priority === 'urgent' ? 'urgent' : ''}><span><Icon name="message" size={17} /></span><div><strong>{ticket.subject}</strong><small>{supportStatusLabel(ticket.status)} · {dateTimeLabel(ticket.updated_at)}</small></div><em>{ticket.priority === 'urgent' ? 'Urgent' : ticket.category}</em></article>)}
                    </div>}
                    <button type="button" className="primary-button full" onClick={() => openSupportForOrganization(selected)}><Icon name="headset" size={16} /> Ouvrir l’Assistance NCR de {selected.name}</button>
                    <div className="info-message admin-client-readonly-note"><Icon name="shield" size={17} /><span>La prise en main reste soumise à l’autorisation du client et conserve sa traçabilité complète dans l’Assistance NCR.</span></div>
                  </div>
                )}

                {clientDetailTab === 'activity' && (
                  <div className="admin-client-hub-view">
                    <div className="admin-client-section-title"><div><p className="eyebrow">ACTIVITÉ</p><h3>Dernières actions utiles</h3><p>Une chronologie courte pour comprendre ce qui s’est passé, sans ouvrir le journal technique complet.</p></div><button type="button" className="secondary-button compact" onClick={() => setActiveSection('activity')}>Journal complet</button></div>
                    {clientHubLoading ? <PremiumSkeleton label="Chargement de l’activité" rows={4} compact /> : <div className="admin-client-activity-list">
                      {clientHub.activity.length === 0 && <div className="admin-empty-state">Aucune activité récente à afficher.</div>}
                      {clientHub.activity.map((entry) => <article key={entry.id}><span><Icon name="activity" size={15} /></span><div><strong>{activityLabel(entry.action)}</strong><small>{entry.actor_email || 'Système NCR'} · {entry.entity_type}</small></div><time>{dateTimeLabel(entry.created_at)}</time></article>)}
                    </div>}
                  </div>
                )}

                {clientDetailTab === 'advanced' && profile?.role === 'super_admin' && (
                  <div className="admin-client-hub-view admin-client-advanced-view">
                    <div className="admin-client-section-title"><div><p className="eyebrow">AVANCÉ</p><h3>Actions rares ou sensibles</h3><p>Cette zone est volontairement séparée des tâches quotidiennes.</p></div><Icon name="lock" size={19} /></div>
                    <section className="admin-client-technical-card"><span><Icon name="info" size={19} /></span><div><strong>Identifiants techniques</strong><small>Slug : {selected.slug}</small><small>ID : {selected.id}</small></div></section>
                    <section className="admin-organization-danger-zone">
                      <div className="admin-organization-danger-head"><span><Icon name="alert" size={20} /></span><div><strong>Supprimer définitivement cette entreprise</strong><small>Cette action supprime l’espace, l’abonnement, les données métier, les documents et les accès associés. Elle fonctionne même si l’entreprise est active.</small></div></div>
                      {!showDeleteOrganization ? <button type="button" className="secondary-button danger-button full" onClick={() => { setShowDeleteOrganization(true); setDeleteOrganizationName(''); setError(''); }}>Supprimer l’entreprise</button> : <div className="admin-organization-delete-confirmation"><div className="warning-message"><strong>Suppression irréversible</strong><span>Les comptes de connexion ne seront pas supprimés, car un utilisateur peut appartenir à plusieurs entreprises. L’entreprise et toutes ses données seront en revanche définitivement effacées.</span></div><label>Pour confirmer, saisis exactement : <strong>{selected.name}</strong><input value={deleteOrganizationName} onChange={(event) => setDeleteOrganizationName(event.target.value)} autoComplete="off" placeholder={selected.name} disabled={deletingOrganization} /></label><div className="admin-delete-actions"><button type="button" className="secondary-button" onClick={() => { setShowDeleteOrganization(false); setDeleteOrganizationName(''); }} disabled={deletingOrganization}>Annuler</button><button type="button" className="secondary-button danger-button" onClick={() => void deleteSelectedOrganization()} disabled={deletingOrganization || deleteOrganizationName.trim().toLocaleLowerCase('fr-FR') !== selected.name.trim().toLocaleLowerCase('fr-FR')}>{deletingOrganization ? 'Suppression en cours…' : 'Supprimer définitivement'}</button></div></div>}
                    </section>
                  </div>
                )}
              </form>
            )}
          </aside>
        </section>
        </>)}

        {activeSection === 'catalogue' && (
          <OfferCatalogAdminPanel />
        )}

        {activeSection === 'billing' && (
          <BillingAdminPanel canManage={canManage} onChanged={() => void loadAll(true)} onOpenOrganization={openOrganizationFromSupport} />
        )}

        {activeSection === 'metier' && (
          <MetierAdminPanel canManage={canManage} />
        )}
        {activeSection === 'push' && (
          <PushAdminPanel canManage={canManage} />
        )}

      </main>

      {showCreateSpace && (
        <AdminCreateSpaceModal
          onClose={() => setShowCreateSpace(false)}
          onCreated={handleSpaceCreated}
        />
      )}
    </div>
  );
}
