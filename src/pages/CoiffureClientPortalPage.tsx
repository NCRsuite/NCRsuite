import { FormEvent, type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type RewardKind = 'discount_percent' | 'discount_fixed' | 'free_service' | 'gift' | 'custom';
type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

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
  organization: { id: string; name: string; slug: string; logo_url: string | null; primary_color: string; email: string | null; phone: string | null; address: string | null };
  client: { id: string; first_name: string; last_name: string | null; email: string | null; phone: string | null; birth_date: string | null; loyalty_opt_in: boolean; birthday_consent: boolean; marketing_opt_in: boolean };
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
  rewards: Array<{ id: string; source_type: string; title: string; description: string | null; reward_kind: RewardKind; reward_value: number; status: 'available' | 'redeemed' | 'expired' | 'cancelled'; issued_at: string; expires_at: string | null; redeemed_at: string | null }>;
  history: Array<{ id: string; entry_type: string; points_delta: number; visits_delta: number; label: string; created_at: string }>;
  appointments: Array<{ id: string; starts_at: string; ends_at: string; status: AppointmentStatus; amount_cents: number | null; public_token: string | null; service_name: string; staff_name: string; site_name: string | null }>;
};

const appointmentLabels: Record<AppointmentStatus, string> = { pending: 'En attente', confirmed: 'Confirmé', completed: 'Terminé', cancelled: 'Annulé', no_show: 'Absent' };

function dateTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}
function shortDate(value: string | null) {
  if (!value) return 'Sans expiration';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}
function rewardValue(kind: RewardKind, value: number) {
  if (kind === 'discount_percent') return `${value} % de remise`;
  if (kind === 'discount_fixed') return `${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value / 100)} de remise`;
  if (kind === 'free_service') return 'Prestation offerte';
  if (kind === 'gift') return 'Cadeau offert';
  return 'Avantage personnalisé';
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
  const [tab, setTab] = useState<'home' | 'appointments' | 'rewards' | 'profile'>('home');
  const [birthDate, setBirthDate] = useState('');
  const [birthdayConsent, setBirthdayConsent] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const loadAccounts = useCallback(async () => {
    if (!user || !supabase) { setAccounts([]); setDashboard(null); setLoading(false); return; }
    setLoading(true); setError('');
    const { data, error: rpcError } = await supabase.rpc('current_coiffure_client_portal_accounts');
    if (rpcError) setError(rpcError.message);
    else {
      const rows = (data ?? []) as PortalAccount[];
      setAccounts(rows);
      setSelectedAccountId((current) => current && rows.some((row) => row.account_id === current) ? current : rows[0]?.account_id ?? '');
    }
    setLoading(false);
  }, [user]);

  const loadDashboard = useCallback(async () => {
    if (!selectedAccountId || !supabase) { setDashboard(null); return; }
    setLoading(true); setError('');
    const { data, error: rpcError } = await supabase.rpc('coiffure_client_portal_dashboard', { p_account_id: selectedAccountId });
    if (rpcError) setError(rpcError.message);
    else {
      const next = data as PortalDashboard;
      setDashboard(next);
      setBirthDate(next.client.birth_date ?? '');
      setBirthdayConsent(next.client.birthday_consent);
      setMarketingOptIn(next.client.marketing_opt_in);
    }
    setLoading(false);
  }, [selectedAccountId]);

  useEffect(() => { void loadAccounts(); }, [loadAccounts]);
  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const upcoming = useMemo(() => dashboard?.appointments.filter((appointment) => ['pending', 'confirmed'].includes(appointment.status) && new Date(appointment.starts_at).getTime() >= Date.now()).sort((a, b) => a.starts_at.localeCompare(b.starts_at)) ?? [], [dashboard]);
  const history = useMemo(() => dashboard?.appointments.filter((appointment) => !upcoming.some((item) => item.id === appointment.id)) ?? [], [dashboard, upcoming]);
  const availableRewards = useMemo(() => dashboard?.rewards.filter((reward) => reward.status === 'available') ?? [], [dashboard]);
  const selectedAccount = accounts.find((account) => account.account_id === selectedAccountId);
  const accent = dashboard?.organization.primary_color || selectedAccount?.organization_primary_color || '#c026d3';
  const pointsProgress = dashboard?.settings.points_enabled ? Math.min(100, Math.max(0, Math.round((dashboard.balance.points / Math.max(1, dashboard.settings.points_reward_threshold)) * 100))) : 0;
  const visitsProgress = dashboard?.settings.visits_enabled ? Math.min(100, Math.max(0, Math.round((dashboard.balance.visits / Math.max(1, dashboard.settings.visits_required)) * 100))) : 0;

  async function login(event: FormEvent) {
    event.preventDefault(); setPending(true); setError('');
    try { await signIn(email, password); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Connexion impossible.'); }
    setPending(false);
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !selectedAccountId) return;
    setPending(true); setError(''); setSuccess('');
    const { error: rpcError } = await supabase.rpc('update_coiffure_client_portal_profile', { p_account_id: selectedAccountId, p_birth_date: birthDate || null, p_birthday_consent: birthdayConsent, p_marketing_opt_in: marketingOptIn });
    if (rpcError) setError(rpcError.message); else { setSuccess('Tes préférences ont été enregistrées.'); await loadDashboard(); }
    setPending(false);
  }

  if (!user) return <div className="hair-client-public-shell" style={{ '--hair-accent': accent } as CSSProperties}><div className="hair-client-public-glow"/><section className="hair-client-login-card"><div className="hair-client-brand"><span><Icon name="scissors" size={25}/></span><div><strong>Espace client Coiffure</strong><small>Rendez-vous & fidélité</small></div></div><div className="hair-client-invitation-heading"><p className="eyebrow">CONNEXION CLIENT</p><h1>Retrouve ton salon.</h1><p>Connecte-toi avec l’adresse utilisée lors de l’activation de ton invitation.</p></div><form className="hair-client-auth-form" onSubmit={login}><label>Adresse e-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email"/></label><label>Mot de passe<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password"/></label><button className="primary-button full" disabled={pending}>{pending ? 'Connexion…' : 'Ouvrir mon espace'}</button></form>{error && <div className="error-message page-message">{error}</div>}<div className="hair-client-public-footer"><Link to="/connexion">Accès entreprise NCR Suite</Link><span>·</span><a href="mailto:contact@ncr-suite.fr">Besoin d’aide ?</a></div></section></div>;

  if (loading && !dashboard) return <div className="hair-client-portal-state"><span/><p>Chargement de ton espace client…</p></div>;

  if (accounts.length === 0) return <div className="hair-client-public-shell" style={{ '--hair-accent': accent } as CSSProperties}><section className="hair-client-login-card"><div className="hair-client-brand"><span><Icon name="alert" size={24}/></span><div><strong>Aucun espace client actif</strong><small>{user.email}</small></div></div><div className="info-message">Demande à ton salon de t’envoyer une invitation depuis la rubrique Fidélité.</div><button className="secondary-button full" onClick={() => void signOut()}>Se déconnecter</button></section></div>;

  if (!dashboard) return <div className="hair-client-portal-state error"><Icon name="alert" size={28}/><p>{error || 'Impossible de charger cet espace.'}</p><button className="secondary-button" onClick={() => void loadDashboard()}>Réessayer</button></div>;

  return <div className="hair-client-portal" style={{ '--hair-accent': accent } as CSSProperties}>
    <header className="hair-client-portal-header"><div className="hair-client-brand">{dashboard.organization.logo_url ? <img src={dashboard.organization.logo_url} alt=""/> : <span><Icon name="scissors" size={23}/></span>}<div><strong>{dashboard.organization.name}</strong><small>{dashboard.settings.program_active ? dashboard.settings.program_name : 'Espace rendez-vous'}</small></div></div><div className="hair-client-header-actions">{accounts.length > 1 && <select value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}>{accounts.map((account) => <option key={account.account_id} value={account.account_id}>{account.organization_name} · {account.client_name}</option>)}</select>}<button onClick={() => void signOut()}><Icon name="logout" size={18}/><span>Déconnexion</span></button></div></header>
    <nav className="hair-client-portal-nav"><button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}><Icon name="home" size={18}/>Accueil</button><button className={tab === 'appointments' ? 'active' : ''} onClick={() => setTab('appointments')}><Icon name="calendar" size={18}/>Rendez-vous</button><button className={tab === 'rewards' ? 'active' : ''} onClick={() => setTab('rewards')}><Icon name="sparkles" size={18}/>Avantages{availableRewards.length > 0 && <b>{availableRewards.length}</b>}</button><button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}><Icon name="users" size={18}/>Profil</button></nav>
    <main className="hair-client-portal-main">
      {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}
      {tab === 'home' && <><section className="hair-client-welcome"><div><p className="eyebrow">BONJOUR {dashboard.client.first_name.toUpperCase()}</p><h1>{availableRewards.length > 0 ? `${availableRewards.length} avantage${availableRewards.length > 1 ? 's' : ''} t’attend${availableRewards.length > 1 ? 'ent' : ''}.` : 'Bienvenue dans ton espace.'}</h1><p>{dashboard.settings.program_description || 'Retrouve ici tes rendez-vous et les avantages préparés par ton salon.'}</p></div><Link className="primary-button" to={`/reserver/${dashboard.organization.slug}`}><Icon name="calendar" size={17}/>Prendre rendez-vous</Link></section>
        {dashboard.settings.program_active && <section className="hair-client-balance-grid">{dashboard.settings.points_enabled && <article><div><span><Icon name="chart" size={20}/></span><p><strong>{dashboard.balance.points}</strong><small>points disponibles</small></p></div><div className="hair-client-progress"><span style={{ width: `${pointsProgress}%` }}/></div><small>{Math.max(0, dashboard.settings.points_reward_threshold - dashboard.balance.points)} point{Math.max(0, dashboard.settings.points_reward_threshold - dashboard.balance.points) > 1 ? 's' : ''} avant le prochain avantage</small></article>}{dashboard.settings.visits_enabled && <article><div><span><Icon name="calendar" size={20}/></span><p><strong>{dashboard.balance.visits}/{dashboard.settings.visits_required}</strong><small>passages validés</small></p></div><div className="hair-client-progress"><span style={{ width: `${visitsProgress}%` }}/></div><small>{Math.max(0, dashboard.settings.visits_required - dashboard.balance.visits)} passage{Math.max(0, dashboard.settings.visits_required - dashboard.balance.visits) > 1 ? 's' : ''} avant le prochain avantage</small></article>}{!dashboard.settings.points_enabled && !dashboard.settings.visits_enabled && <article className="simple"><span><Icon name="sparkles" size={22}/></span><div><strong>Programme personnalisé</strong><p>Ton salon attribue directement les avantages qu’il souhaite t’offrir.</p></div></article>}</section>}
        <section className="hair-client-home-grid"><article className="hair-client-card"><div className="hair-client-card-head"><div><p className="eyebrow">PROCHAIN RENDEZ-VOUS</p><h2>{upcoming.length > 0 ? 'À venir' : 'Aucun rendez-vous'}</h2></div><button onClick={() => setTab('appointments')}>Tout voir</button></div>{upcoming[0] ? <div className="hair-client-next-appointment"><span><strong>{new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(new Date(upcoming[0].starts_at))}</strong><small>{new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(upcoming[0].starts_at))}</small></span><div><h3>{upcoming[0].service_name}</h3><p>{dateTime(upcoming[0].starts_at)} · {upcoming[0].staff_name}{upcoming[0].site_name ? ` · ${upcoming[0].site_name}` : ''}</p></div>{upcoming[0].public_token && <Link to={`/reservation/${upcoming[0].public_token}`}>Gérer</Link>}</div> : <div className="hair-client-empty"><Icon name="calendar" size={27}/><p>Tu peux réserver ton prochain créneau directement en ligne.</p><Link to={`/reserver/${dashboard.organization.slug}`}>Réserver</Link></div>}</article><article className="hair-client-card"><div className="hair-client-card-head"><div><p className="eyebrow">AVANTAGES</p><h2>Disponibles maintenant</h2></div><button onClick={() => setTab('rewards')}>Tout voir</button></div>{availableRewards.slice(0, 2).map((reward) => <div className="hair-client-mini-reward" key={reward.id}><span><Icon name="sparkles" size={18}/></span><div><strong>{reward.title}</strong><small>{rewardValue(reward.reward_kind, reward.reward_value)} · jusqu’au {shortDate(reward.expires_at)}</small></div></div>)}{availableRewards.length === 0 && <div className="hair-client-empty"><Icon name="sparkles" size={27}/><p>Tes prochains avantages apparaîtront ici.</p></div>}</article></section>
      </>}
      {tab === 'appointments' && <section className="hair-client-section"><div className="hair-client-section-heading"><p className="eyebrow">MES RENDEZ-VOUS</p><h1>Planning & historique</h1><Link className="primary-button" to={`/reserver/${dashboard.organization.slug}`}><Icon name="plus" size={17}/>Nouveau rendez-vous</Link></div><h2 className="hair-client-subtitle">À venir</h2><div className="hair-client-appointment-list">{upcoming.map((appointment) => <article key={appointment.id}><span className="hair-client-date-badge"><strong>{new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(new Date(appointment.starts_at))}</strong><small>{new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(appointment.starts_at))}</small></span><div><h2>{appointment.service_name}</h2><p>{dateTime(appointment.starts_at)} · {appointment.staff_name}{appointment.site_name ? ` · ${appointment.site_name}` : ''}</p><em className={appointment.status}>{appointmentLabels[appointment.status]}</em></div>{appointment.public_token && <Link to={`/reservation/${appointment.public_token}`}>Déplacer ou annuler</Link>}</article>)}{upcoming.length === 0 && <div className="hair-client-empty large"><Icon name="calendar" size={30}/><p>Aucun rendez-vous à venir.</p></div>}</div><h2 className="hair-client-subtitle">Historique</h2><div className="hair-client-appointment-list history">{history.map((appointment) => <article key={appointment.id}><span className="hair-client-date-badge"><strong>{new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(new Date(appointment.starts_at))}</strong><small>{new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(appointment.starts_at))}</small></span><div><h2>{appointment.service_name}</h2><p>{dateTime(appointment.starts_at)} · {appointment.staff_name}</p><em className={appointment.status}>{appointmentLabels[appointment.status]}</em></div>{appointment.amount_cents != null && <strong>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(appointment.amount_cents / 100)}</strong>}</article>)}{history.length === 0 && <div className="hair-client-empty"><p>Aucun historique pour le moment.</p></div>}</div></section>}
      {tab === 'rewards' && <section className="hair-client-section"><div className="hair-client-section-heading"><p className="eyebrow">FIDÉLITÉ</p><h1>Mes avantages</h1></div><div className="hair-client-reward-grid">{dashboard.rewards.map((reward) => <article key={reward.id} className={reward.status}><div className="hair-client-reward-head"><span><Icon name="sparkles" size={21}/></span><em>{reward.status === 'available' ? 'Disponible' : reward.status === 'redeemed' ? 'Utilisé' : reward.status === 'expired' ? 'Expiré' : 'Annulé'}</em></div><h2>{reward.title}</h2><strong>{rewardValue(reward.reward_kind, reward.reward_value)}</strong>{reward.description && <p>{reward.description}</p>}<small>{reward.status === 'redeemed' ? `Utilisé le ${shortDate(reward.redeemed_at)}` : `Valable jusqu’au ${shortDate(reward.expires_at)}`}</small></article>)}{dashboard.rewards.length === 0 && <div className="hair-client-empty large"><Icon name="sparkles" size={32}/><h2>Aucun avantage pour le moment</h2><p>Continue tes visites : les récompenses de ton salon apparaîtront ici.</p></div>}</div>{dashboard.settings.program_active && dashboard.history.length > 0 && <><h2 className="hair-client-subtitle">Activité fidélité</h2><div className="hair-client-loyalty-history">{dashboard.history.map((entry) => <div key={entry.id}><span><Icon name={entry.points_delta >= 0 && entry.visits_delta >= 0 ? 'plus' : 'activity'} size={16}/></span><p><strong>{entry.label}</strong><small>{shortDate(entry.created_at)}</small></p><div>{entry.points_delta !== 0 && <b className={entry.points_delta > 0 ? 'positive' : ''}>{entry.points_delta > 0 ? '+' : ''}{entry.points_delta} pts</b>}{entry.visits_delta !== 0 && <b className={entry.visits_delta > 0 ? 'positive' : ''}>{entry.visits_delta > 0 ? '+' : ''}{entry.visits_delta} passage</b>}</div></div>)}</div></>}</section>}
      {tab === 'profile' && <section className="hair-client-section"><div className="hair-client-section-heading"><p className="eyebrow">MON PROFIL</p><h1>Informations & préférences</h1></div><div className="hair-client-profile-grid"><article className="hair-client-card"><h2>Coordonnées</h2><div className="hair-client-profile-lines"><div><span>Nom</span><strong>{dashboard.client.first_name} {dashboard.client.last_name || ''}</strong></div><div><span>E-mail</span><strong>{dashboard.client.email || user.email}</strong></div><div><span>Téléphone</span><strong>{dashboard.client.phone || 'Non renseigné'}</strong></div></div><p className="info-message">Pour modifier ton nom, ton e-mail ou ton téléphone, contacte directement le salon.</p></article><form className="hair-client-card hair-client-profile-form" onSubmit={saveProfile}><h2>Anniversaire & communications</h2>{dashboard.settings.allow_client_birthdate_edit ? <label>Date de naissance<input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)}/></label> : <div className="hair-client-profile-lines"><div><span>Date de naissance</span><strong>{birthDate ? shortDate(birthDate) : 'Non renseignée'}</strong></div></div>}{dashboard.settings.birthday_enabled && <label className="hair-client-check"><input type="checkbox" checked={birthdayConsent} onChange={(event) => setBirthdayConsent(event.target.checked)}/><span><Icon name="check" size={13}/></span><p><strong>Recevoir mon avantage anniversaire</strong><small>Ta date est utilisée uniquement pour préparer cet avantage.</small></p></label>}<label className="hair-client-check"><input type="checkbox" checked={marketingOptIn} onChange={(event) => setMarketingOptIn(event.target.checked)}/><span><Icon name="check" size={13}/></span><p><strong>Recevoir les actualités du salon</strong><small>Offres, nouveautés et informations commerciales.</small></p></label><button className="primary-button" disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer mes préférences'}</button></form></div><article className="hair-client-contact-card"><span><Icon name="message" size={21}/></span><div><strong>Besoin de contacter {dashboard.organization.name} ?</strong><p>{dashboard.organization.address || 'Les coordonnées du salon sont disponibles ci-dessous.'}</p></div><div>{dashboard.organization.email && <a href={`mailto:${dashboard.organization.email}`}>{dashboard.organization.email}</a>}{dashboard.organization.phone && <a href={`tel:${dashboard.organization.phone.replace(/\s+/g, '')}`}>{dashboard.organization.phone}</a>}</div></article></section>}
    </main>
    <footer className="hair-client-portal-footer">Espace sécurisé propulsé par <strong>NCR Suite</strong></footer>
  </div>;
}
