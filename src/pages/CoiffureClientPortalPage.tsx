import { FormEvent, type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BeautyClientReviewModal } from '../components/BeautyClientReviewModal';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import '../beautyClientPortal.css';
import '../beautyVerifiedReviews.css';

type RewardKind = 'discount_percent' | 'discount_fixed' | 'free_service' | 'gift' | 'custom';
type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
type PortalTab = 'home' | 'appointments' | 'rewards' | 'profile';

type PortalAccount = {
  account_id: string;
  organization_id: string;
  client_id: string;
  organization_name: string;
  organization_logo_url: string | null;
  organization_primary_color: string | null;
  client_name: string;
  display_name: string | null;
  unread_rewards: number;
  last_seen_at: string | null;
};

type ClientGrowthState = {
  google_review_url: string | null;
  referral_enabled: boolean;
  company_name: string | null;
};

type ReferralLinkState = {
  enabled: boolean;
  code?: string;
  public_slug?: string;
  path?: string;
  referrer_reward_label?: string;
  referred_reward_label?: string;
  pending_count?: number;
  qualified_count?: number;
};

type ReviewState = {
  appointment_id: string;
  service_id: string | null;
  staff_id: string | null;
  review_id: string | null;
  can_review: boolean;
  rating: number | null;
  comment: string | null;
};

type PortalDashboard = {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    primary_color: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  client: {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    birth_date: string | null;
    loyalty_opt_in: boolean;
    birthday_consent: boolean;
    marketing_opt_in: boolean;
  };
  settings: {
    portal_enabled: boolean;
    program_active: boolean;
    program_name: string;
    program_description: string | null;
    points_enabled: boolean;
    points_reward_threshold: number;
    points_reward_label?: string;
    visits_enabled: boolean;
    visits_required: number;
    visits_reward_label?: string;
    birthday_enabled: boolean;
    allow_client_birthdate_edit: boolean;
    loyalty_card_enabled?: boolean;
    loyalty_status_enabled?: boolean;
    loyalty_status_silver_visits?: number;
    loyalty_status_gold_visits?: number;
    loyalty_status_vip_visits?: number;
  };
  balance: { points: number; visits: number };
  rewards: Array<{
    id: string;
    source_type: string;
    title: string;
    description: string | null;
    reward_kind: RewardKind;
    reward_value: number;
    status: 'available' | 'redeemed' | 'expired' | 'cancelled';
    issued_at: string;
    expires_at: string | null;
    redeemed_at: string | null;
  }>;
  history: Array<{
    id: string;
    entry_type: string;
    points_delta: number;
    visits_delta: number;
    label: string;
    created_at: string;
  }>;
  appointments: Array<{
    id: string;
    starts_at: string;
    ends_at: string;
    status: AppointmentStatus;
    amount_cents: number | null;
    public_token: string | null;
    service_name: string;
    service_ids: string[];
    staff_id: string | null;
    staff_name: string;
    site_name: string | null;
    can_cancel: boolean;
    can_reschedule: boolean;
  }>;
};

type PortalAppointment = PortalDashboard['appointments'][number];

const appointmentLabels: Record<AppointmentStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  completed: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absent'
};

const money = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const dayNumber = new Intl.DateTimeFormat('fr-FR', { day: '2-digit' });
const monthShort = new Intl.DateTimeFormat('fr-FR', { month: 'short' });

function dateTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));
}

function shortDate(value: string | null) {
  if (!value) return 'Sans expiration';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function rewardValue(kind: RewardKind, value: number) {
  if (kind === 'discount_percent') return `${value} % de remise`;
  if (kind === 'discount_fixed') return `${money.format(value / 100)} de remise`;
  if (kind === 'free_service') return 'Prestation offerte';
  if (kind === 'gift') return 'Cadeau offert';
  return 'Avantage personnalisé';
}

function rewardStatus(status: PortalDashboard['rewards'][number]['status']) {
  if (status === 'available') return 'Disponible';
  if (status === 'redeemed') return 'Utilisé';
  if (status === 'expired') return 'Expiré';
  return 'Annulé';
}

export function CoiffureClientPortalPage() {
  const { user, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accounts, setAccounts] = useState<PortalAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [dashboard, setDashboard] = useState<PortalDashboard | null>(null);
  const [reviewStates, setReviewStates] = useState<ReviewState[]>([]);
  const [growthState, setGrowthState] = useState<ClientGrowthState | null>(null);
  const [referralLink, setReferralLink] = useState<ReferralLinkState | null>(null);
  const [reviewingAppointment, setReviewingAppointment] = useState<PortalAppointment | null>(null);
  const [busyAppointmentId, setBusyAppointmentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState<PortalTab>('home');
  const [birthDate, setBirthDate] = useState('');
  const [birthdayConsent, setBirthdayConsent] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [loyaltyCardOpen, setLoyaltyCardOpen] = useState(false);

  const loadAccounts = useCallback(async () => {
    if (!user || !supabase) {
      setAccounts([]);
      setDashboard(null);
      setReviewStates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('current_coiffure_client_portal_accounts');
    if (rpcError) setError(rpcError.message);
    else {
      const rows = (data ?? []) as PortalAccount[];
      setAccounts(rows);
      setSelectedAccountId((current) => current && rows.some((row) => row.account_id === current)
        ? current
        : rows[0]?.account_id ?? '');
    }
    setLoading(false);
  }, [user]);

  const loadDashboard = useCallback(async () => {
    if (!selectedAccountId || !supabase) {
      setDashboard(null);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('coiffure_client_portal_dashboard', { p_account_id: selectedAccountId });
    if (rpcError) setError(rpcError.message);
    else {
      const next = data as PortalDashboard;
      setDashboard(next);
      setLoyaltyCardOpen(false);
      setBirthDate(next.client.birth_date ?? '');
      setBirthdayConsent(Boolean(next.client.birthday_consent));
      setMarketingOptIn(Boolean(next.client.marketing_opt_in));
    }
    setLoading(false);
  }, [selectedAccountId]);

  const loadReviewState = useCallback(async () => {
    if (!selectedAccountId || !supabase) {
      setReviewStates([]);
      return;
    }
    const { data, error: rpcError } = await supabase.rpc('coiffure_client_review_state', { p_account_id: selectedAccountId });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setReviewStates((Array.isArray(data) ? data : []) as ReviewState[]);
  }, [selectedAccountId]);

  const loadGrowthState = useCallback(async () => {
    if (!selectedAccountId || !supabase) {
      setGrowthState(null);
      setReferralLink(null);
      return;
    }
    const [{ data: growthData, error: growthError }, { data: referralData, error: referralError }] = await Promise.all([
      supabase.rpc('coiffure_client_growth_state', { p_account_id: selectedAccountId }),
      supabase.rpc('get_or_create_beauty_referral_link', { p_account_id: selectedAccountId })
    ]);
    if (growthError) {
      setError(growthError.message);
      return;
    }
    setGrowthState((growthData ?? null) as ClientGrowthState | null);
    if (!referralError) setReferralLink((referralData ?? null) as ReferralLinkState | null);
  }, [selectedAccountId]);

  useEffect(() => { void loadAccounts(); }, [loadAccounts]);
  useEffect(() => { void loadDashboard(); void loadReviewState(); void loadGrowthState(); }, [loadDashboard, loadReviewState, loadGrowthState]);

  const upcoming = useMemo(() => dashboard?.appointments
    .filter((appointment) => ['pending', 'confirmed'].includes(appointment.status) && new Date(appointment.starts_at).getTime() >= Date.now())
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at)) ?? [], [dashboard]);

  const history = useMemo(() => dashboard?.appointments
    .filter((appointment) => !upcoming.some((item) => item.id === appointment.id))
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at)) ?? [], [dashboard, upcoming]);

  const reviewByAppointment = useMemo(() => new Map(reviewStates.map((state) => [state.appointment_id, state])), [reviewStates]);
  const latestCompleted = useMemo(() => history.find((appointment) => appointment.status === 'completed') ?? null, [history]);
  const availableRewards = useMemo(() => dashboard?.rewards.filter((reward) => reward.status === 'available') ?? [], [dashboard]);
  const selectedAccount = accounts.find((account) => account.account_id === selectedAccountId);
  const accent = dashboard?.organization.primary_color || selectedAccount?.organization_primary_color || '#2997ff';
  const style = { '--beauty-client-accent': accent } as CSSProperties;
  const bookingPath = dashboard?.organization.slug ? `/salon/${dashboard.organization.slug}#reserver` : '/reserver/';
  const publicPagePath = dashboard?.organization.slug ? `/salon/${dashboard.organization.slug}` : '/';
  const pointsProgress = dashboard?.settings.points_enabled
    ? Math.min(100, Math.max(0, Math.round((dashboard.balance.points / Math.max(1, dashboard.settings.points_reward_threshold)) * 100))) : 0;
  const visitsProgress = dashboard?.settings.visits_enabled
    ? Math.min(100, Math.max(0, Math.round((dashboard.balance.visits / Math.max(1, dashboard.settings.visits_required)) * 100))) : 0;
  const completedAppointments = dashboard?.appointments.filter((appointment) => appointment.status === 'completed').length ?? 0;
  const loyaltyCardEnabled = Boolean(dashboard?.settings.program_active && dashboard?.settings.loyalty_card_enabled);
  const loyaltyStatusEnabled = Boolean(loyaltyCardEnabled && dashboard?.settings.loyalty_status_enabled);
  const silverThreshold = Math.max(1, dashboard?.settings.loyalty_status_silver_visits ?? 5);
  const goldThreshold = Math.max(silverThreshold + 1, dashboard?.settings.loyalty_status_gold_visits ?? 10);
  const vipThreshold = Math.max(goldThreshold + 1, dashboard?.settings.loyalty_status_vip_visits ?? 20);
  const loyaltyStatus = completedAppointments >= vipThreshold ? 'VIP'
    : completedAppointments >= goldThreshold ? 'Gold'
      : completedAppointments >= silverThreshold ? 'Silver'
        : 'Membre';
  const statusSteps = [
    { label: 'Silver', threshold: silverThreshold },
    { label: 'Gold', threshold: goldThreshold },
    { label: 'VIP', threshold: vipThreshold }
  ];
  const nextStatus = statusSteps.find((step) => completedAppointments < step.threshold) ?? null;
  const currentStatusFloor = loyaltyStatus === 'VIP' ? vipThreshold
    : loyaltyStatus === 'Gold' ? goldThreshold
      : loyaltyStatus === 'Silver' ? silverThreshold
        : 0;
  const statusProgress = nextStatus
    ? Math.min(100, Math.max(0, Math.round(((completedAppointments - currentStatusFloor) / Math.max(1, nextStatus.threshold - currentStatusFloor)) * 100)))
    : 100;
  const nextRewardLabel = availableRewards[0]?.title
    || (dashboard?.settings.points_enabled ? dashboard.settings.points_reward_label : null)
    || (dashboard?.settings.visits_enabled ? dashboard.settings.visits_reward_label : null)
    || 'Avantage fidélité';

  const referralUrl = referralLink?.enabled && referralLink.path ? `${window.location.origin}${referralLink.path}` : '';

  async function shareReferral() {
    if (!referralUrl) return;
    const shareText = `Je vous recommande ${dashboard?.organization.name || 'mon enseigne beauté'} ✨ Réservez avec mon lien de parrainage.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Mon lien de parrainage', text: shareText, url: referralUrl });
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(referralUrl);
      setSuccess('Lien de parrainage copié.');
    } catch {
      window.prompt('Copiez votre lien de parrainage :', referralUrl);
    }
  }

  function rebookPath(appointment: PortalAppointment) {
    if (!dashboard?.organization.slug) return '/reserver/';
    const params = new URLSearchParams();
    if (appointment.service_ids?.length) params.set('services', appointment.service_ids.join(','));
    if (appointment.staff_id) params.set('staff', appointment.staff_id);
    const query = params.toString();
    return `/salon/${dashboard.organization.slug}${query ? `?${query}` : ''}#reserver`;
  }

  async function cancelAppointment(appointment: PortalAppointment) {
    if (!supabase || !appointment.public_token || !appointment.can_cancel) return;
    if (!window.confirm('Annuler ce rendez-vous ?')) return;
    setBusyAppointmentId(appointment.id);
    setError('');
    setSuccess('');
    const { error: cancelError } = await supabase.rpc('cancel_public_booking', {
      p_token: appointment.public_token,
      p_reason: 'Annulation depuis l’espace client Beauty'
    });
    if (cancelError) setError(cancelError.message);
    else {
      setSuccess('Votre rendez-vous a bien été annulé.');
      await loadDashboard();
    }
    setBusyAppointmentId('');
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Connexion impossible.');
    }
    setPending(false);
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !selectedAccountId) return;
    setPending(true);
    setError('');
    setSuccess('');
    const { error: rpcError } = await supabase.rpc('update_coiffure_client_portal_profile', {
      p_account_id: selectedAccountId,
      p_birth_date: birthDate || null,
      p_birthday_consent: birthdayConsent,
      p_marketing_opt_in: marketingOptIn
    });
    if (rpcError) setError(rpcError.message);
    else {
      setSuccess('Tes préférences ont été enregistrées.');
      await loadDashboard();
    }
    setPending(false);
  }

  if (!user) {
    return <div className="beauty-client-login" style={style}>
      <section className="beauty-client-login-card">
        <div className="beauty-client-login-brand"><span><Icon name="scissors" size={24}/></span><div><strong>Espace client Beauté</strong><small>Vos rendez-vous, votre enseigne</small></div></div>
        <div className="beauty-client-login-copy"><p className="eyebrow">ESPACE PERSONNEL</p><h1>Retrouvez vos rendez-vous</h1><p>Connectez-vous avec l’adresse utilisée lors de l’activation de votre espace client.</p></div>
        <form className="beauty-client-auth-form" onSubmit={login}>
          <label>Adresse e-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email"/></label>
          <label>Mot de passe<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password"/></label>
          <button className="beauty-client-login-button" disabled={pending}>{pending ? 'Connexion…' : 'Ouvrir mon espace'}</button>
        </form>
        {error && <div className="beauty-client-message error">{error}</div>}
        <div className="beauty-client-login-footer"><Link to="/connexion">Accès professionnel</Link><span>·</span><a href="mailto:contact@ncr-suite.fr">Besoin d’aide ?</a></div>
      </section>
    </div>;
  }

  if (loading && !dashboard) return <div className="beauty-client-state"><span className="spinner"/><p>Chargement de votre espace client…</p></div>;

  if (accounts.length === 0) {
    return <div className="beauty-client-login" style={style}><section className="beauty-client-login-card"><div className="beauty-client-login-brand"><span><Icon name="alert" size={23}/></span><div><strong>Aucun espace client actif</strong><small>{user.email}</small></div></div><div className="beauty-client-login-copy"><h1>Votre espace n’est pas encore activé</h1><p>Demandez à votre enseigne de vous envoyer une invitation depuis son espace NCR Suite.</p></div><button className="beauty-client-login-button" onClick={() => void signOut()}>Se déconnecter</button></section></div>;
  }

  if (!dashboard) return <div className="beauty-client-state"><Icon name="alert" size={28}/><p>{error || 'Impossible de charger cet espace.'}</p><button className="beauty-client-secondary" onClick={() => void loadDashboard()}>Réessayer</button></div>;

  const nextAppointment = upcoming[0] ?? null;
  const latestReviewState = latestCompleted ? reviewByAppointment.get(latestCompleted.id) : null;

  return <div className="beauty-client-shell" style={style}>
    <header className="beauty-client-topbar">
      <div className="beauty-client-topbar-inner">
        <div className="beauty-client-brand">
          {dashboard.organization.logo_url ? <img src={dashboard.organization.logo_url} alt=""/> : <span>{dashboard.organization.name.slice(0, 1).toUpperCase()}</span>}
          <div><strong>{dashboard.organization.name}</strong><small>Votre espace client</small></div>
        </div>
        <div className="beauty-client-top-actions">
          {accounts.length > 1 && <select className="beauty-client-company-switch" value={selectedAccountId} onChange={(event) => { setSelectedAccountId(event.target.value); setTab('home'); }}>{accounts.map((account) => <option key={account.account_id} value={account.account_id}>{account.organization_name}</option>)}</select>}
          <Link className="beauty-client-page-link" to={publicPagePath}><Icon name="eye" size={16}/><span>Voir l’enseigne</span></Link>
          <button className="beauty-client-icon-action" onClick={() => void signOut()}><Icon name="logout" size={17}/><span>Déconnexion</span></button>
        </div>
      </div>
    </header>

    <nav className="beauty-client-tabs"><div className="beauty-client-tabs-inner">
      <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}><Icon name="home" size={17}/>Accueil</button>
      <button className={tab === 'appointments' ? 'active' : ''} onClick={() => setTab('appointments')}><Icon name="calendar" size={17}/>Rendez-vous</button>
      <button className={tab === 'rewards' ? 'active' : ''} onClick={() => setTab('rewards')}><Icon name="sparkles" size={17}/>Avantages{availableRewards.length > 0 && <b>{availableRewards.length}</b>}</button>
      <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}><Icon name="users" size={17}/>Profil</button>
    </div></nav>

    <main className="beauty-client-main">
      {error && <div className="beauty-client-message error">{error}</div>}
      {success && <div className="beauty-client-message success">{success}</div>}

      {tab === 'home' && <>
        <section className="beauty-client-welcome">
          <div className="beauty-client-welcome-copy">
            <p className="beauty-client-eyebrow">BONJOUR {dashboard.client.first_name.toUpperCase()}</p>
            <h1>{nextAppointment ? 'Votre prochain rendez-vous approche' : 'Bienvenue dans votre espace'}</h1>
            <p>{dashboard.settings.program_description || `Retrouvez ici vos rendez-vous et vos avantages chez ${dashboard.organization.name}.`}</p>
            <div className="beauty-client-welcome-actions"><Link className="beauty-client-primary" to={bookingPath}><Icon name="calendar" size={16}/>Prendre rendez-vous</Link><Link className="beauty-client-secondary" to={publicPagePath}><Icon name="eye" size={16}/>Voir la page de l’enseigne</Link></div>
          </div>
          <aside className="beauty-client-identity-card">
            <div className="beauty-client-identity-top">{dashboard.organization.logo_url ? <img src={dashboard.organization.logo_url} alt=""/> : <span>{dashboard.organization.name.slice(0, 1).toUpperCase()}</span>}<div><strong>{dashboard.organization.name}</strong><small>Enseigne liée à votre dossier client</small></div></div>
            <div className="beauty-client-identity-address"><Icon name="map" size={17}/><span>{dashboard.organization.address || 'Adresse disponible sur la page de l’enseigne'}</span></div>
          </aside>
        </section>

        {loyaltyCardEnabled && <section className="beauty-client-loyalty-wallet-section">
          <div className="beauty-client-loyalty-wallet-heading">
            <div><p className="beauty-client-eyebrow">MA CARTE DE FIDÉLITÉ</p><h2>{dashboard.settings.program_name}</h2></div>
            <small>Carte personnelle · {dashboard.organization.name}</small>
          </div>
          <button type="button" className={`beauty-client-loyalty-wallet ${loyaltyCardOpen ? 'open' : ''}`} onClick={() => setLoyaltyCardOpen((current) => !current)} aria-expanded={loyaltyCardOpen}>
            <span className="beauty-client-loyalty-wallet-glow"/>
            <span className="beauty-client-loyalty-wallet-top">
              <span className="beauty-client-loyalty-wallet-brand">
                {dashboard.organization.logo_url ? <img src={dashboard.organization.logo_url} alt=""/> : <b>{dashboard.organization.name.slice(0, 1).toUpperCase()}</b>}
                <span><strong>{dashboard.organization.name}</strong><small>Carte fidélité</small></span>
              </span>
              {loyaltyStatusEnabled && <em className={`beauty-client-loyalty-status ${loyaltyStatus.toLowerCase()}`}>{loyaltyStatus}</em>}
            </span>

            <span className="beauty-client-loyalty-wallet-main">
              <span><small>TITULAIRE</small><strong>{[dashboard.client.first_name, dashboard.client.last_name].filter(Boolean).join(' ')}</strong></span>
              <span className="beauty-client-loyalty-wallet-metrics">
                {dashboard.settings.points_enabled && <span><b>{dashboard.balance.points}</b><small>points</small></span>}
                {dashboard.settings.visits_enabled && <span><b>{dashboard.balance.visits}</b><small>passages</small></span>}
                {!dashboard.settings.points_enabled && !dashboard.settings.visits_enabled && <span><b>{availableRewards.length}</b><small>avantage{availableRewards.length > 1 ? 's' : ''}</small></span>}
              </span>
            </span>

            <span className="beauty-client-loyalty-wallet-progresses">
              {dashboard.settings.points_enabled && <span><span><small>Progression points</small><b>{pointsProgress}%</b></span><i><b style={{ width: `${pointsProgress}%` }}/></i></span>}
              {dashboard.settings.visits_enabled && <span><span><small>Carte passages</small><b>{dashboard.balance.visits}/{dashboard.settings.visits_required}</b></span><i><b style={{ width: `${visitsProgress}%` }}/></i></span>}
            </span>

            <span className="beauty-client-loyalty-wallet-footer">
              <small>{loyaltyCardOpen ? 'Touchez pour refermer' : 'Touchez pour voir le détail'}</small>
              <strong>{availableRewards.length > 0 ? `${availableRewards.length} avantage${availableRewards.length > 1 ? 's' : ''} disponible${availableRewards.length > 1 ? 's' : ''}` : 'Carte active'}</strong>
            </span>

            {loyaltyCardOpen && <span className="beauty-client-loyalty-wallet-details">
              <span><small>PROCHAINE RÉCOMPENSE</small><strong>{nextRewardLabel}</strong>{availableRewards[0] ? <em>Disponible maintenant</em> : dashboard.settings.points_enabled ? <em>{Math.max(0, dashboard.settings.points_reward_threshold - dashboard.balance.points)} point(s) restant(s)</em> : dashboard.settings.visits_enabled ? <em>{Math.max(0, dashboard.settings.visits_required - dashboard.balance.visits)} passage(s) restant(s)</em> : <em>Selon les avantages de l’enseigne</em>}</span>
              {loyaltyStatusEnabled && <span><small>STATUT {loyaltyStatus.toUpperCase()}</small><strong>{nextStatus ? `${Math.max(0, nextStatus.threshold - completedAppointments)} rendez-vous avant ${nextStatus.label}` : 'Statut maximal atteint'}</strong><i><b style={{ width: `${statusProgress}%` }}/></i><em>{completedAppointments} rendez-vous terminé{completedAppointments > 1 ? 's' : ''} dans cette enseigne</em></span>}
            </span>}
          </button>
        </section>}

        <section className="beauty-client-dashboard-grid">
          <article className="beauty-client-card">
            <div className="beauty-client-card-head"><div><p className="beauty-client-eyebrow">MES RDV</p><h2>{nextAppointment ? 'Prochain rendez-vous' : 'Aucun rendez-vous à venir'}</h2></div><button onClick={() => setTab('appointments')}>Tout voir</button></div>
            {nextAppointment ? <div className="beauty-client-next"><span className="beauty-client-date-badge"><strong>{dayNumber.format(new Date(nextAppointment.starts_at))}</strong><small>{monthShort.format(new Date(nextAppointment.starts_at)).replace('.', '')}</small></span><div><h3>{nextAppointment.service_name}</h3><p>{dateTime(nextAppointment.starts_at)}<br/>avec {nextAppointment.staff_name}{nextAppointment.site_name ? ` · ${nextAppointment.site_name}` : ''}</p></div>{nextAppointment.public_token && <div className="beauty-client-next-actions">{nextAppointment.can_reschedule && <Link to={`/reservation/${nextAppointment.public_token}?action=reschedule`}>Modifier</Link>}{nextAppointment.can_cancel && <button type="button" disabled={busyAppointmentId === nextAppointment.id} onClick={() => void cancelAppointment(nextAppointment)}>{busyAppointmentId === nextAppointment.id ? 'Annulation…' : 'Annuler'}</button>}{!nextAppointment.can_reschedule && !nextAppointment.can_cancel && <Link to={`/reservation/${nextAppointment.public_token}`}>Voir</Link>}</div>}</div> : <div className="beauty-client-empty"><Icon name="calendar" size={25}/><p>Réservez votre prochain créneau directement auprès de votre enseigne.</p><Link to={bookingPath}>Réserver maintenant</Link></div>}
            {latestCompleted && <div className="beauty-client-rebook"><div><strong>Envie de reprendre rendez-vous ?</strong><small>Dernière prestation : {latestCompleted.service_name} avec {latestCompleted.staff_name}</small></div><div className="beauty-client-appointment-actions"><Link to={rebookPath(latestCompleted)}>Reprendre RDV →</Link>{latestReviewState?.can_review && <button className="beauty-client-review-action" onClick={() => setReviewingAppointment(latestCompleted)}>Donner mon avis</button>}{growthState?.google_review_url && <a className="beauty-client-google-review" href={growthState.google_review_url} target="_blank" rel="noreferrer"><Icon name="sparkles" size={14}/> Avis Google</a>}{latestReviewState?.review_id && <span className="beauty-client-review-published"><b>★ {latestReviewState.rating}</b> Avis publié</span>}</div></div>}
          </article>

          {referralLink?.enabled && referralUrl && <article className="beauty-client-card beauty-client-referral-card">
            <div className="beauty-client-card-head"><div><p className="beauty-client-eyebrow">PARRAINAGE</p><h2>Faites découvrir {dashboard.organization.name}</h2></div><span className="beauty-client-referral-code">{referralLink.code}</span></div>
            <p>Partagez votre lien personnel. Les avantages sont validés seulement après le premier rendez-vous terminé de votre filleul.</p>
            <div className="beauty-client-referral-benefits"><span><small>Pour vous</small><strong>{referralLink.referrer_reward_label || 'Avantage parrainage'}</strong></span><span><small>Pour votre filleul</small><strong>{referralLink.referred_reward_label || 'Avantage de bienvenue'}</strong></span></div>
            <div className="beauty-client-referral-stats"><span><strong>{referralLink.pending_count ?? 0}</strong><small>en attente</small></span><span><strong>{referralLink.qualified_count ?? 0}</strong><small>validé{(referralLink.qualified_count ?? 0) > 1 ? 's' : ''}</small></span></div>
            <button className="beauty-client-primary beauty-client-referral-share" type="button" onClick={() => void shareReferral()}><Icon name="users" size={15}/>Partager mon lien</button>
          </article>}

          <article className="beauty-client-card">
            <div className="beauty-client-card-head"><div><p className="beauty-client-eyebrow">FIDÉLITÉ</p><h2>{availableRewards.length > 0 ? `${availableRewards.length} avantage${availableRewards.length > 1 ? 's' : ''} disponible${availableRewards.length > 1 ? 's' : ''}` : 'Votre fidélité'}</h2></div><button onClick={() => setTab('rewards')}>Détails</button></div>
            {dashboard.settings.program_active ? <div className="beauty-client-balance-list">
              {dashboard.settings.points_enabled && <div className="beauty-client-balance-item"><div className="beauty-client-balance-top"><strong>{dashboard.balance.points} pts</strong><small>Objectif {dashboard.settings.points_reward_threshold}</small></div><div className="beauty-client-progress"><span style={{ width: `${pointsProgress}%` }}/></div><small>{Math.max(0, dashboard.settings.points_reward_threshold - dashboard.balance.points)} point(s) avant le prochain avantage</small></div>}
              {dashboard.settings.visits_enabled && <div className="beauty-client-balance-item"><div className="beauty-client-balance-top"><strong>{dashboard.balance.visits}/{dashboard.settings.visits_required}</strong><small>passages</small></div><div className="beauty-client-progress"><span style={{ width: `${visitsProgress}%` }}/></div><small>{Math.max(0, dashboard.settings.visits_required - dashboard.balance.visits)} passage(s) restant(s)</small></div>}
              {!dashboard.settings.points_enabled && !dashboard.settings.visits_enabled && <div className="beauty-client-empty"><Icon name="sparkles" size={25}/><p>Vos avantages personnalisés apparaîtront ici.</p></div>}
            </div> : <div className="beauty-client-empty"><Icon name="sparkles" size={25}/><p>Le programme fidélité de cette enseigne n’est pas actif.</p></div>}
          </article>
        </section>
      </>}

      {tab === 'appointments' && <section>
        <div className="beauty-client-section-head"><div><p className="beauty-client-eyebrow">RENDEZ-VOUS</p><h1>Mes rendez-vous</h1></div><Link className="beauty-client-primary" to={bookingPath}><Icon name="plus" size={16}/>Nouveau rendez-vous</Link></div>
        <div className="beauty-client-appointment-group"><h2>À venir</h2><div className="beauty-client-appointment-list">{upcoming.map((appointment) => <article className="beauty-client-appointment" key={appointment.id}><span className="beauty-client-date-badge"><strong>{dayNumber.format(new Date(appointment.starts_at))}</strong><small>{monthShort.format(new Date(appointment.starts_at)).replace('.', '')}</small></span><div><h3>{appointment.service_name}</h3><p>{dateTime(appointment.starts_at)} · {appointment.staff_name}{appointment.site_name ? ` · ${appointment.site_name}` : ''}</p><div className="beauty-client-appointment-meta"><em className={`beauty-client-status ${appointment.status}`}>{appointmentLabels[appointment.status]}</em>{appointment.amount_cents != null && <small>{money.format(appointment.amount_cents / 100)}</small>}</div></div><div className="beauty-client-appointment-actions">{appointment.public_token && appointment.can_reschedule && <Link className="primary" to={`/reservation/${appointment.public_token}?action=reschedule`}>Modifier</Link>}{appointment.public_token && appointment.can_cancel && <button type="button" className="beauty-client-cancel-action" disabled={busyAppointmentId === appointment.id} onClick={() => void cancelAppointment(appointment)}>{busyAppointmentId === appointment.id ? 'Annulation…' : 'Annuler'}</button>}{appointment.public_token && !appointment.can_reschedule && !appointment.can_cancel && <Link to={`/reservation/${appointment.public_token}`}>Voir</Link>}</div></article>)}{upcoming.length === 0 && <div className="beauty-client-empty"><Icon name="calendar" size={26}/><p>Aucun rendez-vous à venir.</p><Link to={bookingPath}>Prendre rendez-vous</Link></div>}</div></div>
        <div className="beauty-client-appointment-group"><h2>Historique</h2><div className="beauty-client-appointment-list">{history.map((appointment) => { const reviewState = reviewByAppointment.get(appointment.id); return <article className="beauty-client-appointment" key={appointment.id}><span className="beauty-client-date-badge"><strong>{dayNumber.format(new Date(appointment.starts_at))}</strong><small>{monthShort.format(new Date(appointment.starts_at)).replace('.', '')}</small></span><div><h3>{appointment.service_name}</h3><p>{dateTime(appointment.starts_at)} · {appointment.staff_name}</p><div className="beauty-client-appointment-meta"><em className={`beauty-client-status ${appointment.status}`}>{appointmentLabels[appointment.status]}</em>{appointment.amount_cents != null && <small>{money.format(appointment.amount_cents / 100)}</small>}{reviewState?.review_id && <span className="beauty-client-review-published"><b>★ {reviewState.rating}</b> Avis vérifié</span>}</div></div><div className="beauty-client-appointment-actions">{appointment.status === 'completed' && <Link to={rebookPath(appointment)}>Reprendre RDV</Link>}{appointment.status === 'completed' && reviewState?.can_review && <button className="beauty-client-review-action" onClick={() => setReviewingAppointment(appointment)}>Donner mon avis</button>}{appointment.status === 'completed' && growthState?.google_review_url && <a className="beauty-client-google-review" href={growthState.google_review_url} target="_blank" rel="noreferrer"><Icon name="sparkles" size={14}/> Avis Google</a>}</div></article>; })}{history.length === 0 && <div className="beauty-client-empty"><p>Aucun historique pour le moment.</p></div>}</div></div>
      </section>}

      {tab === 'rewards' && <section>
        <div className="beauty-client-section-head"><div><p className="beauty-client-eyebrow">FIDÉLITÉ</p><h1>Mes avantages</h1></div></div>
        <div className="beauty-client-reward-grid">{dashboard.rewards.map((reward) => <article className={`beauty-client-reward ${reward.status === 'redeemed' ? 'used' : reward.status}`} key={reward.id}><div className="beauty-client-reward-head"><span className="beauty-client-reward-icon"><Icon name="sparkles" size={19}/></span><em>{rewardStatus(reward.status)}</em></div><h2>{reward.title}</h2><strong>{rewardValue(reward.reward_kind, reward.reward_value)}</strong>{reward.description && <p>{reward.description}</p>}<small>{reward.status === 'redeemed' ? `Utilisé le ${shortDate(reward.redeemed_at)}` : `Valable jusqu’au ${shortDate(reward.expires_at)}`}</small></article>)}{dashboard.rewards.length === 0 && <div className="beauty-client-empty"><Icon name="sparkles" size={28}/><p>Aucun avantage pour le moment. Vos prochains avantages apparaîtront ici.</p></div>}</div>
      </section>}

      {tab === 'profile' && <section>
        <div className="beauty-client-section-head"><div><p className="beauty-client-eyebrow">PROFIL</p><h1>Mes informations</h1></div></div>
        <div className="beauty-client-profile-grid">
          <article className="beauty-client-card"><h2>Coordonnées</h2><div className="beauty-client-profile-lines"><div><span>Nom</span><strong>{dashboard.client.first_name} {dashboard.client.last_name || ''}</strong></div><div><span>E-mail</span><strong>{dashboard.client.email || user.email || 'Non renseigné'}</strong></div><div><span>Téléphone</span><strong>{dashboard.client.phone || 'Non renseigné'}</strong></div></div><p className="beauty-client-message">Pour modifier ces coordonnées, contactez directement {dashboard.organization.name}.</p></article>
          <form className="beauty-client-card beauty-client-profile-form" onSubmit={saveProfile}><h2>Préférences</h2>{dashboard.settings.allow_client_birthdate_edit ? <label>Date de naissance<input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)}/></label> : <div className="beauty-client-profile-lines"><div><span>Date de naissance</span><strong>{birthDate ? shortDate(birthDate) : 'Non renseignée'}</strong></div></div>}{dashboard.settings.birthday_enabled && <label className="beauty-client-check"><input type="checkbox" checked={birthdayConsent} onChange={(event) => setBirthdayConsent(event.target.checked)}/><span><strong>Avantage anniversaire</strong><small>Autoriser l’enseigne à utiliser ma date uniquement pour cet avantage.</small></span></label>}<label className="beauty-client-check"><input type="checkbox" checked={marketingOptIn} onChange={(event) => setMarketingOptIn(event.target.checked)}/><span><strong>Actualités de l’enseigne</strong><small>Recevoir ses nouveautés et offres commerciales.</small></span></label><button className="beauty-client-login-button" disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer mes préférences'}</button></form>
        </div>
        <article className="beauty-client-card beauty-client-contact"><div><strong>Contacter {dashboard.organization.name}</strong><p>{dashboard.organization.address || 'Retrouvez toutes les informations sur sa page publique.'}</p></div><div className="beauty-client-contact-links">{dashboard.organization.email && <a href={`mailto:${dashboard.organization.email}`}><Icon name="message" size={14}/> E-mail</a>}{dashboard.organization.phone && <a href={`tel:${dashboard.organization.phone.replace(/\s+/g, '')}`}><Icon name="phone" size={14}/> Appeler</a>}<Link to={publicPagePath}><Icon name="eye" size={14}/> Page publique</Link></div></article>
      </section>}
    </main>

    <nav className="beauty-client-mobile-nav">
      <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}><Icon name="home" size={17}/>Accueil</button>
      <button className={tab === 'appointments' ? 'active' : ''} onClick={() => setTab('appointments')}><Icon name="calendar" size={17}/>RDV</button>
      <button className={tab === 'rewards' ? 'active' : ''} onClick={() => setTab('rewards')}><Icon name="sparkles" size={17}/>Avantages</button>
      <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}><Icon name="users" size={17}/>Profil</button>
    </nav>

    {reviewingAppointment && <BeautyClientReviewModal
      open
      accountId={selectedAccountId}
      appointmentId={reviewingAppointment.id}
      serviceName={reviewingAppointment.service_name}
      staffName={reviewingAppointment.staff_name}
      onClose={() => setReviewingAppointment(null)}
      onSubmitted={async () => { setSuccess(growthState?.google_review_url ? 'Merci, votre avis vérifié est publié. Vous pouvez aussi laisser un avis Google depuis votre historique.' : 'Merci, votre avis vérifié est maintenant publié.'); await loadReviewState(); }}
    />}
  </div>;
}
