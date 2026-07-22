import { FormEvent, type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

type RewardKind = 'discount_percent' | 'discount_fixed' | 'free_service' | 'gift' | 'custom';
type RewardStatus = 'available' | 'redeemed' | 'expired' | 'cancelled';
type Tab = 'programme' | 'clients' | 'recompenses';

interface LoyaltySettings {
  organization_id: string;
  portal_enabled: boolean;
  program_active: boolean;
  program_name: string;
  program_description: string | null;
  points_enabled: boolean;
  points_per_euro: number;
  points_per_visit: number;
  points_reward_threshold: number;
  points_reward_label: string;
  points_reward_kind: RewardKind;
  points_reward_value: number;
  points_reward_valid_days: number;
  visits_enabled: boolean;
  visits_required: number;
  visits_reward_label: string;
  visits_reward_kind: RewardKind;
  visits_reward_value: number;
  visits_reward_valid_days: number;
  birthday_enabled: boolean;
  birthday_days_before: number;
  birthday_reward_label: string;
  birthday_reward_kind: RewardKind;
  birthday_reward_value: number;
  birthday_reward_valid_days: number;
  welcome_enabled: boolean;
  welcome_points: number;
  welcome_reward_label: string;
  welcome_reward_kind: RewardKind;
  welcome_reward_value: number;
  welcome_reward_valid_days: number;
  allow_client_birthdate_edit: boolean;
}

interface PortalAccess {
  id: string;
  email: string;
  display_name: string | null;
  status: 'active' | 'suspended';
  last_seen_at: string | null;
}

interface PortalInvitation {
  id: string;
  email: string;
  display_name: string | null;
  status: 'pending' | 'expired';
  expires_at: string;
}

interface LoyaltyClient {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  loyalty_opt_in: boolean;
  birthday_consent: boolean;
  marketing_opt_in: boolean;
  points_balance: number;
  visits_balance: number;
  available_rewards: number;
  completed_appointments: number;
  portal_accounts: PortalAccess[];
  pending_invitations: PortalInvitation[];
}

interface LoyaltyReward {
  id: string;
  client_id: string;
  source_type: 'points' | 'visits' | 'birthday' | 'welcome' | 'manual';
  title: string;
  description: string | null;
  reward_kind: RewardKind;
  reward_value: number;
  status: RewardStatus;
  issued_at: string;
  expires_at: string | null;
  redeemed_at: string | null;
}

interface LoyaltyOverview {
  settings: LoyaltySettings;
  summary: {
    clients: number;
    members: number;
    portal_accounts: number;
    available_rewards: number;
  };
  clients: LoyaltyClient[];
  rewards: LoyaltyReward[];
}

const rewardKindLabels: Record<RewardKind, string> = {
  discount_percent: 'Remise en pourcentage',
  discount_fixed: 'Remise en euros',
  free_service: 'Prestation offerte',
  gift: 'Cadeau',
  custom: 'Avantage personnalisé'
};

const sourceLabels: Record<LoyaltyReward['source_type'], string> = {
  points: 'Points',
  visits: 'Passages',
  birthday: 'Anniversaire',
  welcome: 'Bienvenue',
  manual: 'Offert manuellement'
};

const defaultSettings: LoyaltySettings = {
  organization_id: '',
  portal_enabled: true,
  program_active: false,
  program_name: 'Programme fidélité',
  program_description: null,
  points_enabled: false,
  points_per_euro: 1,
  points_per_visit: 0,
  points_reward_threshold: 100,
  points_reward_label: 'Récompense fidélité',
  points_reward_kind: 'discount_fixed',
  points_reward_value: 500,
  points_reward_valid_days: 90,
  visits_enabled: false,
  visits_required: 10,
  visits_reward_label: 'Passage offert',
  visits_reward_kind: 'free_service',
  visits_reward_value: 0,
  visits_reward_valid_days: 90,
  birthday_enabled: false,
  birthday_days_before: 7,
  birthday_reward_label: 'Avantage anniversaire',
  birthday_reward_kind: 'discount_percent',
  birthday_reward_value: 10,
  birthday_reward_valid_days: 30,
  welcome_enabled: false,
  welcome_points: 0,
  welcome_reward_label: 'Cadeau de bienvenue',
  welcome_reward_kind: 'gift',
  welcome_reward_value: 0,
  welcome_reward_valid_days: 60,
  allow_client_birthdate_edit: true
};

function clientName(client?: LoyaltyClient | null) {
  if (!client) return 'Client';
  return [client.first_name, client.last_name].filter(Boolean).join(' ');
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function formatReward(kind: RewardKind, value: number) {
  if (kind === 'discount_percent') return `${value} % de remise`;
  if (kind === 'discount_fixed') return `${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value / 100)} de remise`;
  if (kind === 'free_service') return 'Prestation offerte';
  if (kind === 'gift') return value > 0 ? `Cadeau d’une valeur de ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value / 100)}` : 'Cadeau offert';
  return value > 0 ? `Valeur indicative ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value / 100)}` : 'Avantage défini par le salon';
}

function RewardFields({ prefix, settings, setSettings }: {
  prefix: 'points' | 'visits' | 'birthday' | 'welcome';
  settings: LoyaltySettings;
  setSettings: Dispatch<SetStateAction<LoyaltySettings>>;
}) {
  const labelKey = `${prefix}_reward_label` as keyof LoyaltySettings;
  const kindKey = `${prefix}_reward_kind` as keyof LoyaltySettings;
  const valueKey = `${prefix}_reward_value` as keyof LoyaltySettings;
  const validKey = `${prefix}_reward_valid_days` as keyof LoyaltySettings;
  const kind = settings[kindKey] as RewardKind;
  return <div className="loyalty-reward-fields">
    <label>Nom de la récompense<input value={String(settings[labelKey])} onChange={(event) => setSettings((current) => ({ ...current, [labelKey]: event.target.value }))}/></label>
    <label>Type<select value={kind} onChange={(event) => setSettings((current) => ({ ...current, [kindKey]: event.target.value as RewardKind }))}>{Object.entries(rewardKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>{kind === 'discount_percent' ? 'Pourcentage' : kind === 'discount_fixed' || kind === 'gift' || kind === 'custom' ? 'Valeur en centimes' : 'Valeur indicative'}<input type="number" min={0} value={Number(settings[valueKey])} onChange={(event) => setSettings((current) => ({ ...current, [valueKey]: Number(event.target.value) }))}/></label>
    <label>Validité en jours<input type="number" min={1} max={730} value={Number(settings[validKey])} onChange={(event) => setSettings((current) => ({ ...current, [validKey]: Number(event.target.value) }))}/></label>
  </div>;
}

export function LoyaltyPage() {
  const { organization } = useOrganization();
  const [overview, setOverview] = useState<LoyaltyOverview | null>(null);
  const [settings, setSettings] = useState<LoyaltySettings>(defaultSettings);
  const [tab, setTab] = useState<Tab>('programme');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [loyaltyOptIn, setLoyaltyOptIn] = useState(true);
  const [birthdayConsent, setBirthdayConsent] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [pointsDelta, setPointsDelta] = useState(0);
  const [visitsDelta, setVisitsDelta] = useState(0);
  const [adjustmentLabel, setAdjustmentLabel] = useState('Ajustement manuel');
  const [rewardTitle, setRewardTitle] = useState('Avantage personnalisé');
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardKind, setRewardKind] = useState<RewardKind>('custom');
  const [rewardValue, setRewardValue] = useState(0);
  const [rewardValidDays, setRewardValidDays] = useState(90);

  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');

  const load = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    setError('');
    if (!supabase) {
      setError('Supabase est requis pour utiliser la fidélité.');
      setLoading(false);
      return;
    }
    const { data, error: rpcError } = await supabase.rpc('coiffure_loyalty_admin_overview', { p_organization_id: organization.id });
    if (rpcError) setError(rpcError.message);
    else {
      const next = data as LoyaltyOverview;
      setOverview(next);
      setSettings({ ...defaultSettings, ...(next.settings ?? {}), organization_id: organization.id });
      setSelectedClientId((current) => current && next.clients.some((client) => client.id === current) ? current : next.clients[0]?.id ?? '');
    }
    setLoading(false);
  }, [organization]);

  useEffect(() => { void load(); }, [load]);

  const selectedClient = useMemo(() => overview?.clients.find((client) => client.id === selectedClientId) ?? null, [overview, selectedClientId]);
  const filteredClients = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    if (!overview) return [];
    if (!needle) return overview.clients;
    return overview.clients.filter((client) => [client.first_name, client.last_name, client.email, client.phone].filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(needle));
  }, [overview, query]);
  const clientRewards = useMemo(() => overview?.rewards.filter((reward) => reward.client_id === selectedClientId) ?? [], [overview, selectedClientId]);

  useEffect(() => {
    if (!selectedClient) return;
    setInviteEmail(selectedClient.email ?? '');
    setInviteName(clientName(selectedClient));
    setBirthDate(selectedClient.birth_date ?? '');
    setLoyaltyOptIn(selectedClient.loyalty_opt_in);
    setBirthdayConsent(selectedClient.birthday_consent);
    setMarketingOptIn(selectedClient.marketing_opt_in);
  }, [selectedClient]);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    if (!organization || !supabase) return;
    setBusy('settings'); setError(''); setSuccess('');
    const { error: rpcError } = await supabase.rpc('update_coiffure_loyalty_settings', { p_organization_id: organization.id, p_settings: settings });
    if (rpcError) setError(rpcError.message);
    else { setSuccess('La configuration fidélité a été enregistrée.'); await load(); }
    setBusy('');
  }

  async function saveClientProfile(event: FormEvent) {
    event.preventDefault();
    if (!organization || !selectedClient || !supabase) return;
    setBusy('profile'); setError(''); setSuccess('');
    const { error: rpcError } = await supabase.rpc('update_coiffure_client_loyalty_profile', {
      p_organization_id: organization.id,
      p_client_id: selectedClient.id,
      p_birth_date: birthDate || null,
      p_loyalty_opt_in: loyaltyOptIn,
      p_birthday_consent: birthdayConsent,
      p_marketing_opt_in: marketingOptIn
    });
    if (rpcError) setError(rpcError.message); else { setSuccess('La fiche fidélité du client a été mise à jour.'); await load(); }
    setBusy('');
  }

  async function inviteClient(event: FormEvent) {
    event.preventDefault();
    if (!organization || !selectedClient || !supabase) return;
    setBusy('invite'); setError(''); setSuccess('');
    const { error: rpcError } = await supabase.rpc('create_coiffure_client_portal_invitation', {
      p_organization_id: organization.id,
      p_client_id: selectedClient.id,
      p_email: inviteEmail,
      p_display_name: inviteName || null
    });
    if (rpcError) setError(rpcError.message); else { setSuccess('L’invitation à l’espace client a été envoyée.'); await load(); }
    setBusy('');
  }

  async function invitationAction(invitation: PortalInvitation, action: 'resend' | 'revoke') {
    if (!organization || !supabase) return;
    setBusy(invitation.id); setError(''); setSuccess('');
    const rpc = action === 'resend' ? 'resend_coiffure_client_portal_invitation' : 'revoke_coiffure_client_portal_invitation';
    const { error: rpcError } = await supabase.rpc(rpc, { p_organization_id: organization.id, p_invitation_id: invitation.id });
    if (rpcError) setError(rpcError.message); else { setSuccess(action === 'resend' ? 'Invitation renvoyée.' : 'Invitation annulée.'); await load(); }
    setBusy('');
  }

  async function setPortalAccountStatus(account: PortalAccess) {
    if (!organization || !supabase) return;
    const nextStatus = account.status === 'active' ? 'suspended' : 'active';
    setBusy(account.id); setError(''); setSuccess('');
    const { error: rpcError } = await supabase.rpc('set_coiffure_client_portal_account_status', {
      p_organization_id: organization.id,
      p_account_id: account.id,
      p_status: nextStatus
    });
    if (rpcError) setError(rpcError.message);
    else { setSuccess(nextStatus === 'active' ? 'L’accès client a été réactivé.' : 'L’accès client a été suspendu.'); await load(); }
    setBusy('');
  }

  async function adjustBalance(event: FormEvent) {
    event.preventDefault();
    if (!organization || !selectedClient || !supabase) return;
    setBusy('adjust'); setError(''); setSuccess('');
    const { error: rpcError } = await supabase.rpc('adjust_coiffure_loyalty_balance', {
      p_organization_id: organization.id,
      p_client_id: selectedClient.id,
      p_points_delta: pointsDelta,
      p_visits_delta: visitsDelta,
      p_label: adjustmentLabel,
      p_note: null
    });
    if (rpcError) setError(rpcError.message); else { setSuccess('Le solde fidélité a été ajusté.'); setPointsDelta(0); setVisitsDelta(0); await load(); }
    setBusy('');
  }

  async function issueReward(event: FormEvent) {
    event.preventDefault();
    if (!organization || !selectedClient || !supabase) return;
    setBusy('reward'); setError(''); setSuccess('');
    const { error: rpcError } = await supabase.rpc('issue_coiffure_manual_reward', {
      p_organization_id: organization.id,
      p_client_id: selectedClient.id,
      p_title: rewardTitle,
      p_description: rewardDescription || null,
      p_reward_kind: rewardKind,
      p_reward_value: rewardValue,
      p_valid_days: rewardValidDays
    });
    if (rpcError) setError(rpcError.message); else { setSuccess('La récompense a été ajoutée à l’espace client.'); setRewardDescription(''); await load(); }
    setBusy('');
  }

  async function setRewardStatus(reward: LoyaltyReward, status: 'redeemed' | 'cancelled' | 'available') {
    if (!organization || !supabase) return;
    setBusy(reward.id); setError(''); setSuccess('');
    const { error: rpcError } = await supabase.rpc('set_coiffure_loyalty_reward_status', { p_organization_id: organization.id, p_reward_id: reward.id, p_status: status });
    if (rpcError) setError(rpcError.message); else { setSuccess(status === 'redeemed' ? 'Récompense marquée comme utilisée.' : status === 'cancelled' ? 'Récompense annulée.' : 'Récompense réactivée.'); await load(); }
    setBusy('');
  }

  if (!organization) return null;

  return <div className="page loyalty-page">
    <header className="page-header loyalty-page-header">
      <div><p className="eyebrow">COIFFURE · RELATION CLIENT</p><h1>Fidélité & espace client</h1><p>Active seulement les mécaniques qui correspondent au salon : points, carte de passages, anniversaire, bienvenue ou récompenses libres.</p></div>
      <button className="secondary-button" onClick={() => void load()} disabled={loading}><Icon name="activity" size={18}/>Actualiser</button>
    </header>

    {error && <div className="error-message page-message" role="alert">{error}</div>}
    {success && <div className="success-message page-message" role="status">{success}</div>}

    <section className="loyalty-summary-grid">
      <article><span><Icon name="users" size={20}/></span><div><strong>{overview?.summary.clients ?? 0}</strong><small>clients actifs</small></div></article>
      <article><span><Icon name="chart" size={20}/></span><div><strong>{overview?.summary.members ?? 0}</strong><small>inscrits à la fidélité</small></div></article>
      <article><span><Icon name="monitor" size={20}/></span><div><strong>{overview?.summary.portal_accounts ?? 0}</strong><small>espaces clients actifs</small></div></article>
      <article><span><Icon name="sparkles" size={20}/></span><div><strong>{overview?.summary.available_rewards ?? 0}</strong><small>récompenses disponibles</small></div></article>
    </section>

    <div className="segmented-control loyalty-tabs">
      <button className={tab === 'programme' ? 'active' : ''} onClick={() => setTab('programme')}>Programme</button>
      <button className={tab === 'clients' ? 'active' : ''} onClick={() => setTab('clients')}>Clients</button>
      <button className={tab === 'recompenses' ? 'active' : ''} onClick={() => setTab('recompenses')}>Récompenses</button>
    </div>

    {loading ? <section className="panel loyalty-loading"><span/><p>Chargement de la fidélité…</p></section> : tab === 'programme' ? <form className="loyalty-program-form" onSubmit={saveSettings}>
      <section className="panel loyalty-master-panel">
        <div className="panel-header"><div><p className="eyebrow">ACTIVATION GÉNÉRALE</p><h2>Un programme entièrement modulable</h2></div><label className="switch-field"><input type="checkbox" checked={settings.program_active} onChange={(event) => setSettings((current) => ({ ...current, program_active: event.target.checked }))}/><span/>Programme actif</label></div>
        <div className="loyalty-basic-fields"><label>Nom du programme<input value={settings.program_name} onChange={(event) => setSettings((current) => ({ ...current, program_name: event.target.value }))}/></label><label>Description affichée au client<textarea rows={3} value={settings.program_description ?? ''} onChange={(event) => setSettings((current) => ({ ...current, program_description: event.target.value || null }))} placeholder="Ex. Chaque passage vous rapproche d’un nouvel avantage."/></label></div>
        <div className="loyalty-portal-toggle"><div><span><Icon name="monitor" size={21}/></span><p><strong>Espace client Coiffure</strong><small>Rendez-vous, solde fidélité, récompenses et préférences anniversaire.</small></p></div><label className="switch-field"><input type="checkbox" checked={settings.portal_enabled} onChange={(event) => setSettings((current) => ({ ...current, portal_enabled: event.target.checked }))}/><span/>{settings.portal_enabled ? 'Ouvert' : 'Fermé'}</label></div>
      </section>

      <section className="loyalty-rule-grid">
        <article className={`panel loyalty-rule-card ${settings.points_enabled ? 'enabled' : ''}`}>
          <div className="loyalty-rule-heading"><span><Icon name="chart" size={21}/></span><div><h2>Système de points</h2><p>Crédite automatiquement les rendez-vous terminés.</p></div><label className="switch-field compact"><input type="checkbox" checked={settings.points_enabled} onChange={(event) => setSettings((current) => ({ ...current, points_enabled: event.target.checked }))}/><span/></label></div>
          <div className="loyalty-rule-body"><div className="loyalty-inline-fields"><label>Points par euro<input type="number" min={0} value={settings.points_per_euro} onChange={(event) => setSettings((current) => ({ ...current, points_per_euro: Number(event.target.value) }))}/></label><label>Bonus par rendez-vous<input type="number" min={0} value={settings.points_per_visit} onChange={(event) => setSettings((current) => ({ ...current, points_per_visit: Number(event.target.value) }))}/></label><label>Seuil de récompense<input type="number" min={1} value={settings.points_reward_threshold} onChange={(event) => setSettings((current) => ({ ...current, points_reward_threshold: Number(event.target.value) }))}/></label></div><RewardFields prefix="points" settings={settings} setSettings={setSettings}/></div>
        </article>

        <article className={`panel loyalty-rule-card ${settings.visits_enabled ? 'enabled' : ''}`}>
          <div className="loyalty-rule-heading"><span><Icon name="calendar" size={21}/></span><div><h2>Carte de passages</h2><p>Un rendez-vous terminé compte comme un passage.</p></div><label className="switch-field compact"><input type="checkbox" checked={settings.visits_enabled} onChange={(event) => setSettings((current) => ({ ...current, visits_enabled: event.target.checked }))}/><span/></label></div>
          <div className="loyalty-rule-body"><label className="loyalty-single-number">Nombre de passages requis<input type="number" min={1} value={settings.visits_required} onChange={(event) => setSettings((current) => ({ ...current, visits_required: Number(event.target.value) }))}/></label><RewardFields prefix="visits" settings={settings} setSettings={setSettings}/></div>
        </article>

        <article className={`panel loyalty-rule-card ${settings.birthday_enabled ? 'enabled' : ''}`}>
          <div className="loyalty-rule-heading"><span><Icon name="sparkles" size={21}/></span><div><h2>Avantage anniversaire</h2><p>Prépare automatiquement une récompense si le client l’autorise.</p></div><label className="switch-field compact"><input type="checkbox" checked={settings.birthday_enabled} onChange={(event) => setSettings((current) => ({ ...current, birthday_enabled: event.target.checked }))}/><span/></label></div>
          <div className="loyalty-rule-body"><label className="loyalty-single-number">Visible combien de jours avant<input type="number" min={0} max={60} value={settings.birthday_days_before} onChange={(event) => setSettings((current) => ({ ...current, birthday_days_before: Number(event.target.value) }))}/></label><RewardFields prefix="birthday" settings={settings} setSettings={setSettings}/><label className="loyalty-check-line"><input type="checkbox" checked={settings.allow_client_birthdate_edit} onChange={(event) => setSettings((current) => ({ ...current, allow_client_birthdate_edit: event.target.checked }))}/><span><Icon name="check" size={14}/></span>Autoriser le client à saisir ou corriger sa date de naissance</label></div>
        </article>

        <article className={`panel loyalty-rule-card ${settings.welcome_enabled ? 'enabled' : ''}`}>
          <div className="loyalty-rule-heading"><span><Icon name="plus" size={21}/></span><div><h2>Bonus de bienvenue</h2><p>Attribué une seule fois lors de l’activation de l’espace client.</p></div><label className="switch-field compact"><input type="checkbox" checked={settings.welcome_enabled} onChange={(event) => setSettings((current) => ({ ...current, welcome_enabled: event.target.checked }))}/><span/></label></div>
          <div className="loyalty-rule-body"><label className="loyalty-single-number">Points offerts à l’inscription<input type="number" min={0} value={settings.welcome_points} onChange={(event) => setSettings((current) => ({ ...current, welcome_points: Number(event.target.value) }))}/></label><RewardFields prefix="welcome" settings={settings} setSettings={setSettings}/></div>
        </article>
      </section>

      <div className="loyalty-save-bar"><div><strong>Le salon garde le contrôle</strong><span>Les systèmes désactivés ne sont ni calculés ni affichés au client.</span></div><button className="primary-button" disabled={!canManage || busy === 'settings'}>{busy === 'settings' ? 'Enregistrement…' : 'Enregistrer le programme'}</button></div>
    </form> : tab === 'clients' ? <section className="loyalty-client-layout">
      <aside className="panel loyalty-client-list">
        <div className="panel-header"><div><p className="eyebrow">CLIENTS</p><h2>{filteredClients.length} fiche{filteredClients.length > 1 ? 's' : ''}</h2></div></div>
        <label className="search-field"><Icon name="search" size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom, e-mail ou téléphone"/></label>
        <div className="loyalty-client-scroll">{filteredClients.map((client) => <button key={client.id} className={selectedClientId === client.id ? 'active' : ''} onClick={() => setSelectedClientId(client.id)}><span>{client.first_name.slice(0, 1).toUpperCase()}</span><div><strong>{clientName(client)}</strong><small>{client.points_balance} pts · {client.visits_balance} passage{client.visits_balance > 1 ? 's' : ''}</small></div>{client.available_rewards > 0 && <b>{client.available_rewards}</b>}</button>)}{filteredClients.length === 0 && <div className="security-empty"><Icon name="users" size={28}/><span>Aucun client trouvé.</span></div>}</div>
      </aside>
      <main className="loyalty-client-main">{!selectedClient ? <section className="panel security-empty"><Icon name="users" size={32}/><strong>Sélectionne un client</strong></section> : <>
        <section className="panel loyalty-client-hero"><div><p className="eyebrow">FICHE FIDÉLITÉ</p><h2>{clientName(selectedClient)}</h2><p>{[selectedClient.email, selectedClient.phone].filter(Boolean).join(' · ') || 'Coordonnées à compléter'}</p></div><div><span><strong>{selectedClient.points_balance}</strong> points</span><span><strong>{selectedClient.visits_balance}</strong> passages</span><span><strong>{selectedClient.available_rewards}</strong> avantages</span></div></section>
        <section className="loyalty-client-work-grid">
          <form className="panel loyalty-client-form" onSubmit={saveClientProfile}><div className="panel-header"><div><p className="eyebrow">PRÉFÉRENCES</p><h2>Participation du client</h2></div></div><label>Date de naissance<input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)}/></label><label className="loyalty-check-line"><input type="checkbox" checked={loyaltyOptIn} onChange={(event) => setLoyaltyOptIn(event.target.checked)}/><span><Icon name="check" size={14}/></span>Inscrit au programme fidélité</label><label className="loyalty-check-line"><input type="checkbox" checked={birthdayConsent} onChange={(event) => setBirthdayConsent(event.target.checked)}/><span><Icon name="check" size={14}/></span>Accepte l’avantage anniversaire</label><label className="loyalty-check-line"><input type="checkbox" checked={marketingOptIn} onChange={(event) => setMarketingOptIn(event.target.checked)}/><span><Icon name="check" size={14}/></span>Accepte les communications commerciales</label><button className="primary-button" disabled={busy === 'profile'}>{busy === 'profile' ? 'Enregistrement…' : 'Enregistrer la fiche'}</button></form>
          <form className="panel loyalty-client-form" onSubmit={inviteClient}><div className="panel-header"><div><p className="eyebrow">ESPACE CLIENT</p><h2>Accès personnel</h2></div></div><label>Nom affiché<input value={inviteName} onChange={(event) => setInviteName(event.target.value)}/></label><label>Adresse e-mail<input type="email" required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)}/></label><button className="primary-button" disabled={busy === 'invite' || !settings.portal_enabled}><Icon name="message" size={16}/>{busy === 'invite' ? 'Envoi…' : 'Envoyer l’invitation'}</button>{!settings.portal_enabled && <p className="info-message">L’espace client est fermé dans la configuration générale.</p>}<div className="loyalty-access-list">{selectedClient.portal_accounts.map((account) => <div key={account.id}><span><Icon name="monitor" size={17}/></span><p><strong>{account.display_name || account.email}</strong><small>{account.email} · {account.last_seen_at ? `ouvert le ${formatDate(account.last_seen_at)}` : 'jamais ouvert'}</small></p><em className={account.status}>{account.status === 'active' ? 'Actif' : 'Suspendu'}</em><button type="button" className={account.status === 'active' ? 'danger' : ''} disabled={busy === account.id} onClick={() => void setPortalAccountStatus(account)}>{account.status === 'active' ? 'Suspendre' : 'Réactiver'}</button></div>)}{selectedClient.pending_invitations.map((invitation) => <div key={invitation.id}><span><Icon name="message" size={17}/></span><p><strong>{invitation.display_name || invitation.email}</strong><small>{invitation.email} · expire le {formatDate(invitation.expires_at)}</small></p><em>En attente</em><button type="button" disabled={busy === invitation.id} onClick={() => void invitationAction(invitation, 'resend')}>Renvoyer</button><button type="button" className="danger" disabled={busy === invitation.id} onClick={() => void invitationAction(invitation, 'revoke')}>Annuler</button></div>)}</div></form>
          <form className="panel loyalty-client-form" onSubmit={adjustBalance}><div className="panel-header"><div><p className="eyebrow">AJUSTEMENT</p><h2>Corriger le solde</h2></div></div><div className="loyalty-inline-fields"><label>Points + / −<input type="number" value={pointsDelta} onChange={(event) => setPointsDelta(Number(event.target.value))}/></label><label>Passages + / −<input type="number" value={visitsDelta} onChange={(event) => setVisitsDelta(Number(event.target.value))}/></label></div><label>Motif<input value={adjustmentLabel} onChange={(event) => setAdjustmentLabel(event.target.value)}/></label><button className="secondary-button" disabled={busy === 'adjust' || (pointsDelta === 0 && visitsDelta === 0)}>{busy === 'adjust' ? 'Application…' : 'Appliquer l’ajustement'}</button></form>
          <form className="panel loyalty-client-form" onSubmit={issueReward}><div className="panel-header"><div><p className="eyebrow">AUTRE AVANTAGE</p><h2>Offrir librement</h2></div></div><label>Intitulé<input required value={rewardTitle} onChange={(event) => setRewardTitle(event.target.value)}/></label><label>Description<textarea rows={2} value={rewardDescription} onChange={(event) => setRewardDescription(event.target.value)}/></label><div className="loyalty-inline-fields"><label>Type<select value={rewardKind} onChange={(event) => setRewardKind(event.target.value as RewardKind)}>{Object.entries(rewardKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Valeur<input type="number" min={0} value={rewardValue} onChange={(event) => setRewardValue(Number(event.target.value))}/></label><label>Validité<input type="number" min={1} value={rewardValidDays} onChange={(event) => setRewardValidDays(Number(event.target.value))}/></label></div><button className="secondary-button" disabled={busy === 'reward'}>{busy === 'reward' ? 'Création…' : 'Ajouter la récompense'}</button></form>
        </section>
        <section className="panel loyalty-client-rewards"><div className="panel-header"><div><p className="eyebrow">AVANTAGES DU CLIENT</p><h2>{clientRewards.length} récompense{clientRewards.length > 1 ? 's' : ''}</h2></div></div>{clientRewards.length === 0 ? <div className="security-empty"><Icon name="sparkles" size={28}/><span>Aucune récompense pour le moment.</span></div> : <div className="loyalty-reward-list">{clientRewards.map((reward) => <article key={reward.id}><span><Icon name="sparkles" size={19}/></span><div><strong>{reward.title}</strong><small>{sourceLabels[reward.source_type]} · {formatReward(reward.reward_kind, reward.reward_value)} · expire {formatDate(reward.expires_at)}</small>{reward.description && <p>{reward.description}</p>}</div><em className={reward.status}>{reward.status === 'available' ? 'Disponible' : reward.status === 'redeemed' ? 'Utilisée' : reward.status === 'expired' ? 'Expirée' : 'Annulée'}</em>{reward.status === 'available' && <><button disabled={busy === reward.id} onClick={() => void setRewardStatus(reward, 'redeemed')}>Utilisée</button><button className="danger" disabled={busy === reward.id} onClick={() => void setRewardStatus(reward, 'cancelled')}>Annuler</button></>}{reward.status === 'cancelled' && <button disabled={busy === reward.id} onClick={() => void setRewardStatus(reward, 'available')}>Réactiver</button>}</article>)}</div>}</section>
      </>}</main>
    </section> : <section className="panel loyalty-all-rewards"><div className="panel-header"><div><p className="eyebrow">SUIVI GLOBAL</p><h2>Toutes les récompenses</h2></div><span>{overview?.rewards.length ?? 0} éléments</span></div><div className="loyalty-reward-table"><div className="loyalty-reward-table-head"><span>Client</span><span>Avantage</span><span>Origine</span><span>Validité</span><span>Statut</span></div>{overview?.rewards.map((reward) => { const client = overview.clients.find((item) => item.id === reward.client_id); return <button key={reward.id} onClick={() => { setSelectedClientId(reward.client_id); setTab('clients'); }}><strong>{clientName(client)}</strong><span>{reward.title}<small>{formatReward(reward.reward_kind, reward.reward_value)}</small></span><span>{sourceLabels[reward.source_type]}</span><span>{formatDate(reward.expires_at)}</span><em className={reward.status}>{reward.status === 'available' ? 'Disponible' : reward.status === 'redeemed' ? 'Utilisée' : reward.status === 'expired' ? 'Expirée' : 'Annulée'}</em></button>; })}</div></section>}
  </div>;
}
