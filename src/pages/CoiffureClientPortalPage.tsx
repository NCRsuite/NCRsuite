import { FormEvent, type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import '../beautyClientPortal.css';

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
    visits_enabled: boolean;
    visits_required: number;
    birthday_enabled: boolean;
    allow_client_birthdate_edit: boolean;
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
    staff_name: string;
    site_name: string | null;
  }>;
};

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
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState<PortalTab>('home');
  const [birthDate, setBirthDate] = useState('');
  const [birthdayConsent, setBirthdayConsent] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const loadAccounts = useCallback(async () => {
    if (!user || !supabase) {
      setAccounts([]);
      setDashboard(null);
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
      setBirthDate(next.client.birth_date ?? '');
      setBirthdayConsent(Boolean(next.client.birthday_consent));
      setMarketingOptIn(Boolean(next.client.marketing_opt_in));
    }
    setLoading(false);
  }, [selectedAccountId]);

  useEffect(() => { void loadAccounts(); }, [loadAccounts]);
  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const upcoming = useMemo(() => dashboard?.appointments
    .filter((appointment) => ['pending', 'confirmed'].includes(appointment.status) && new Date(appointment.starts_at).getTime() >= Date.now())
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at)) ?? [], [dashboard]);

  const history = useMemo(() => dashboard?.appointments
    .filter((appointment) => !upcoming.some((item) => item.id === appointment.id))
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at)) ?? [], [dashboard, upcoming]);

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

        <section className="beauty-client-dashboard-grid">
          <article className="beauty-client-card">
            <div className="beauty-client-card-head"><div><p className="beauty-client-eyebrow">MES RDV</p><h2>{nextAppointment ? 'Prochain rendez-vous' : 'Aucun rendez-vous à venir'}</h2></div><button onClick={() => setTab('appointments')}>Tout voir</button></div>
            {nextAppointment ? <div className="beauty-client-next"><span className="beauty-client-date-badge"><strong>{dayNumber.format(new Date(nextAppointment.starts_at))}</strong><small>{monthShort.format(new Date(nextAppointment.starts_at)).replace('.', '')}</small></span><div><h3>{nextAppointment.service_name}</h3><p>{dateTime(nextAppointment.starts_at)}<br/>avec {nextAppointment.staff_name}{nextAppointment.site_name ? ` · ${nextAppointment.site_name}` : ''}</p></div>{nextAppointment.public_token && <Link to={`/reservation/${nextAppointment.public_token}`}>Gérer</Link>}</div> : <div className="beauty-client-empty"><Icon name="calendar" size={25}/><p>Réservez votre prochain créneau directement auprès de votre enseigne.</p><Link to={bookingPath}>Réserver maintenant</Link></div>}
            {latestCompleted && <div className="beauty-client-rebook"><div><strong>Envie de reprendre rendez-vous ?</strong><small>Dernière prestation : {latestCompleted.service_name} avec {latestCompleted.staff_name}</small></div><Link to={bookingPath}>Reprendre RDV →</Link></div>}
          </article>

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
        <div className="beauty-client-appointment-group"><h2>À venir</h2><div className="beauty-client-appointment-list">{upcoming.map((appointment) => <article className="beauty-client-appointment" key={appointment.id}><span className="beauty-client-date-badge"><strong>{dayNumber.format(new Date(appointment.starts_at))}</strong><small>{monthShort.format(new Date(appointment.starts_at)).replace('.', '')}</small></span><div><h3>{appointment.service_name}</h3><p>{dateTime(appointment.starts_at)} · {appointment.staff_name}{appointment.site_name ? ` · ${appointment.site_name}` : ''}</p><div className="beauty-client-appointment-meta"><em className={`beauty-client-status ${appointment.status}`}>{appointmentLabels[appointment.status]}</em>{appointment.amount_cents != null && <small>{money.format(appointment.amount_cents / 100)}</small>}</div></div><div className="beauty-client-appointment-actions">{appointment.public_token && <Link className="primary" to={`/reservation/${appointment.public_token}`}>Gérer</Link>}</div></article>)}{upcoming.length === 0 && <div className="beauty-client-empty"><Icon name="calendar" size={26}/><p>Aucun rendez-vous à venir.</p><Link to={bookingPath}>Prendre rendez-vous</Link></div>}</div></div>
        <div className="beauty-client-appointment-group"><h2>Historique</h2><div className="beauty-client-appointment-list">{history.map((appointment) => <article className="beauty-client-appointment" key={appointment.id}><span className="beauty-client-date-badge"><strong>{dayNumber.format(new Date(appointment.starts_at))}</strong><small>{monthShort.format(new Date(appointment.starts_at)).replace('.', '')}</small></span><div><h3>{appointment.service_name}</h3><p>{dateTime(appointment.starts_at)} · {appointment.staff_name}</p><div className="beauty-client-appointment-meta"><em className={`beauty-client-status ${appointment.status}`}>{appointmentLabels[appointment.status]}</em>{appointment.amount_cents != null && <small>{money.format(appointment.amount_cents / 100)}</small>}</div></div><div className="beauty-client-appointment-actions">{appointment.status === 'completed' && <Link to={bookingPath}>Reprendre RDV</Link>}</div></article>)}{history.length === 0 && <div className="beauty-client-empty"><p>Aucun historique pour le moment.</p></div>}</div></div>
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
  </div>;
}
