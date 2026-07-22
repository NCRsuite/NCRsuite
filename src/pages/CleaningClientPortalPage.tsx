import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { closeFileWindow, navigateFileWindow, prepareFileWindow } from '../lib/browserFiles';
import { supabase } from '../lib/supabase';

type PortalPermissions = {
  planning: boolean;
  reports: boolean;
  anomalies: boolean;
  quality: boolean;
  documents: boolean;
  messages: boolean;
};

type PortalAccount = {
  account_id: string;
  organization_id: string;
  client_id: string;
  organization_name: string;
  organization_logo_url: string | null;
  organization_primary_color: string | null;
  client_name: string;
  display_name: string | null;
  role: string;
  permissions: PortalPermissions;
  unread_messages: number;
  last_seen_at: string | null;
};

type PortalOrganization = {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

type PortalClient = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
};

type PortalSummary = {
  sites: number;
  upcoming_interventions: number;
  completed_interventions: number;
  open_anomalies: number;
  average_quality: number | null;
  documents: number;
  unread_messages: number;
};

type PortalSite = {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  contact_name: string | null;
  contact_phone: string | null;
};

type PortalIntervention = {
  id: string;
  site_id: string;
  site_name: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  actual_started_at: string | null;
  actual_ended_at: string | null;
  agent_name: string | null;
  report_text: string | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
  task_count: number;
  completed_tasks: number;
  anomaly_count: number;
  quality_score: number | null;
};

type PortalAnomaly = {
  id: string;
  intervention_id: string | null;
  site_id: string;
  site_name: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  corrective_action: string | null;
  created_at: string;
  resolved_at: string | null;
};

type PortalQualityControl = {
  id: string;
  intervention_id: string | null;
  site_id: string;
  site_name: string;
  overall_score: number;
  score_cleanliness: number;
  score_compliance: number;
  score_punctuality: number;
  score_material: number;
  observations: string | null;
  corrective_action: string | null;
  controlled_at: string;
  agent_name: string | null;
};

type PortalDocument = {
  id: string;
  title: string;
  category: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  published_at: string;
  site_id: string | null;
  intervention_id: string | null;
  site_name: string | null;
};

type PortalMessage = {
  id: string;
  author_type: 'cleaning' | 'client';
  author_name: string | null;
  body: string;
  created_at: string;
  read_by_client_at: string | null;
  read_by_cleaning_at: string | null;
};

type DashboardData = {
  account: { id: string; role: string; display_name: string | null; permissions: PortalPermissions };
  organization: PortalOrganization;
  client: PortalClient;
  summary: PortalSummary;
  sites: PortalSite[];
  interventions: PortalIntervention[];
  anomalies: PortalAnomaly[];
  quality_controls: PortalQualityControl[];
  documents: PortalDocument[];
  messages: PortalMessage[];
};

type PortalTab = 'overview' | 'interventions' | 'reports' | 'anomalies' | 'quality' | 'documents' | 'messages';
type PortalTabItem = {
  id: PortalTab;
  label: string;
  icon: 'home' | 'calendar' | 'file' | 'alert' | 'chart' | 'message';
  enabled: boolean;
  count?: number;
};

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' });

function dateTime(value: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : '—';
}

function isoDate(offsetDays: number) {
  const value = new Date();
  value.setDate(value.getDate() + offsetDays);
  return value.toISOString().slice(0, 10);
}

function statusLabel(value: string) {
  return ({
    planned: 'Planifiée',
    in_progress: 'En cours',
    completed: 'Terminée',
    canceled: 'Annulée',
    open: 'Ouverte',
    resolved: 'Résolue',
    closed: 'Clôturée'
  } as Record<string, string>)[value] ?? categoryLabel(value);
}

function severityLabel(value: string) {
  return ({ low: 'Faible', medium: 'Moyenne', high: 'Élevée', critical: 'Critique' } as Record<string, string>)[value] ?? categoryLabel(value);
}

function categoryLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function qualityTone(score: number | null) {
  if (score === null) return '';
  if (score < 3) return 'warning';
  return '';
}

export function CleaningClientPortalPage() {
  const { user, signIn, signOut, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accounts, setAccounts] = useState<PortalAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [tab, setTab] = useState<PortalTab>('overview');
  const [fromDate, setFromDate] = useState(() => isoDate(-30));
  const [toDate, setToDate] = useState(() => isoDate(60));
  const [appliedFromDate, setAppliedFromDate] = useState(() => isoDate(-30));
  const [appliedToDate, setAppliedToDate] = useState(() => isoDate(60));
  const [messageBody, setMessageBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.account_id === accountId) ?? accounts[0] ?? null,
    [accounts, accountId]
  );

  const loadAccounts = useCallback(async () => {
    if (!user || !supabase) return;
    setLoading(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('current_cleaning_client_portal_accounts');
    if (rpcError) setError(rpcError.message);
    else {
      const rows = (data ?? []) as PortalAccount[];
      setAccounts(rows);
      setAccountId((current) => current && rows.some((row) => row.account_id === current) ? current : rows[0]?.account_id ?? '');
    }
    setLoading(false);
  }, [user?.id]);

  const loadDashboard = useCallback(async (targetAccountId: string) => {
    if (!supabase || !targetAccountId) {
      setDashboard(null);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('cleaning_client_portal_dashboard', {
      p_account_id: targetAccountId,
      p_from: appliedFromDate,
      p_to: appliedToDate
    });
    if (rpcError) setError(rpcError.message);
    else {
      setDashboard(data as DashboardData);
      setAccounts((current) => current.map((account) => account.account_id === targetAccountId ? { ...account, unread_messages: 0 } : account));
    }
    setLoading(false);
  }, [appliedFromDate, appliedToDate]);

  useEffect(() => {
    if (user) void loadAccounts();
    else {
      setAccounts([]);
      setDashboard(null);
    }
  }, [user?.id, loadAccounts]);

  useEffect(() => {
    if (selectedAccount?.account_id) void loadDashboard(selectedAccount.account_id);
  }, [selectedAccount?.account_id, loadDashboard]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy('login');
    setError('');
    try {
      await signIn(email.trim(), password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Connexion impossible.');
    }
    setBusy('');
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !selectedAccount || !messageBody.trim()) return;
    setBusy('message');
    setError('');
    const { error: sendError } = await supabase.rpc('cleaning_client_portal_send_message', {
      p_account_id: selectedAccount.account_id,
      p_body: messageBody.trim()
    });
    if (sendError) setError(sendError.message);
    else {
      setMessageBody('');
      await loadDashboard(selectedAccount.account_id);
      await loadAccounts();
    }
    setBusy('');
  }

  async function openDocument(document: PortalDocument) {
    if (!supabase) return;
    const target = prepareFileWindow('Ouverture du document', document.title);
    const { data, error: signedError } = await supabase.storage.from('cleaning-client-documents').createSignedUrl(document.storage_path, 300);
    if (signedError || !data?.signedUrl) {
      closeFileWindow(target);
      setError(signedError?.message ?? 'Document inaccessible.');
      return;
    }
    navigateFileWindow(target, data.signedUrl);
  }

  if (authLoading) {
    return <div className="security-client-loading-screen"><img src="/brand/ncr-suite-icon.png" alt=""/><span>Ouverture du portail client…</span></div>;
  }

  if (!user) {
    return <div className="security-client-public-shell cleaning-client-public-shell">
      <div className="security-client-public-glow" />
      <section className="security-client-login-card">
        <div className="security-client-public-brand"><span><Icon name="sparkles" size={27}/></span><div><strong>Portail client Nettoyage</strong><small>Propulsé par NCR Suite</small></div></div>
        <div className="security-client-login-copy"><p className="eyebrow">ESPACE SÉCURISÉ</p><h1>Suivez vos prestations en toute transparence.</h1><p>Planning, interventions réalisées, rapports de passage, anomalies, contrôles qualité, documents et échanges avec votre prestataire.</p></div>
        <form className="security-client-auth-form" onSubmit={login}>
          <label>Adresse e-mail<input type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Mot de passe<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <button className="primary-button full" disabled={busy === 'login'}>{busy === 'login' ? 'Connexion…' : 'Ouvrir mon portail'}</button>
        </form>
        {error && <div className="error-message page-message">{error}</div>}
        <div className="security-client-public-footer"><span>Accès uniquement sur invitation</span><span>·</span><a href="mailto:contact@ncr-suite.fr">Besoin d’aide ?</a></div>
      </section>
    </div>;
  }

  if (!loading && accounts.length === 0) {
    return <div className="security-client-public-shell cleaning-client-public-shell">
      <section className="security-client-login-card security-client-no-access">
        <span className="security-client-no-access-icon"><Icon name="lock" size={30}/></span>
        <p className="eyebrow">PORTAIL CLIENT NETTOYAGE</p><h1>Aucun accès actif</h1><p>Cette adresse n’est rattachée à aucun portail client actif. Utilisez le lien d’invitation transmis par votre prestataire de nettoyage.</p>
        {error && <div className="error-message page-message">{error}</div>}
        <button className="secondary-button full" onClick={() => void signOut()}>Se connecter avec une autre adresse</button>
      </section>
    </div>;
  }

  const accent = dashboard?.organization.primary_color || selectedAccount?.organization_primary_color || '#0f766e';
  const permissions = dashboard?.account.permissions ?? selectedAccount?.permissions;
  const completedReports = dashboard?.interventions.filter((intervention) => intervention.status === 'completed') ?? [];
  const availableTabs: PortalTabItem[] = [
    { id: 'overview', label: 'Vue d’ensemble', icon: 'home', enabled: true },
    { id: 'interventions', label: 'Interventions', icon: 'calendar', enabled: Boolean(permissions?.planning), count: dashboard?.interventions.length },
    { id: 'reports', label: 'Rapports', icon: 'file', enabled: Boolean(permissions?.reports), count: completedReports.length },
    { id: 'anomalies', label: 'Anomalies', icon: 'alert', enabled: Boolean(permissions?.anomalies), count: dashboard?.anomalies.length },
    { id: 'quality', label: 'Qualité', icon: 'chart', enabled: Boolean(permissions?.quality), count: dashboard?.quality_controls.length },
    { id: 'documents', label: 'Documents', icon: 'file', enabled: Boolean(permissions?.documents), count: dashboard?.documents.length },
    { id: 'messages', label: 'Messages', icon: 'message', enabled: Boolean(permissions?.messages), count: selectedAccount?.unread_messages }
  ];
  const tabs = availableTabs.filter((item) => item.enabled);

  return <div className="security-client-portal cleaning-client-portal" style={{ '--portal-accent': accent } as React.CSSProperties}>
    <header className="security-client-topbar">
      <div className="security-client-topbar-brand">
        {dashboard?.organization.logo_url || selectedAccount?.organization_logo_url
          ? <img src={dashboard?.organization.logo_url || selectedAccount?.organization_logo_url || ''} alt=""/>
          : <span><Icon name="sparkles" size={23}/></span>}
        <div><strong>{dashboard?.organization.name || selectedAccount?.organization_name || 'Portail Nettoyage'}</strong><small>Espace client sécurisé</small></div>
      </div>
      <div className="security-client-topbar-actions">
        {accounts.length > 1 && <select value={selectedAccount?.account_id ?? ''} onChange={(event) => { setAccountId(event.target.value); setTab('overview'); }}>{accounts.map((account) => <option key={account.account_id} value={account.account_id}>{account.organization_name} · {account.client_name}</option>)}</select>}
        <div className="security-client-user"><span>{(dashboard?.account.display_name || user.email || 'C').slice(0, 1).toUpperCase()}</span><div><strong>{dashboard?.account.display_name || user.email}</strong><small>{dashboard?.client.company_name || selectedAccount?.client_name}</small></div></div>
        <button className="security-client-icon-button" title="Se déconnecter" onClick={() => void signOut()}><Icon name="logout" size={19}/></button>
      </div>
    </header>

    <div className="security-client-portal-body">
      <aside className="security-client-sidebar">
        <div className="security-client-sidebar-title"><p className="eyebrow">MON ESPACE</p><strong>{dashboard?.client.company_name || selectedAccount?.client_name}</strong></div>
        <nav>{tabs.map((item) => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><Icon name={item.icon} size={19}/><span>{item.label}</span>{typeof item.count === 'number' && item.count > 0 && <b>{item.count}</b>}</button>)}</nav>
        <div className="security-client-sidebar-support"><Icon name="headset" size={18}/><div><strong>Besoin d’aide ?</strong><a href={`mailto:${dashboard?.organization.email || 'contact@ncr-suite.fr'}`}>Contacter mon prestataire</a></div></div>
      </aside>

      <main className="security-client-content">
        <section className="security-client-content-header">
          <div><p className="eyebrow">{dashboard?.organization.name || selectedAccount?.organization_name}</p><h1>{tabs.find((item) => item.id === tab)?.label}</h1><p>Période consultée du {dateFormatter.format(new Date(`${appliedFromDate}T12:00:00`))} au {dateFormatter.format(new Date(`${appliedToDate}T12:00:00`))}.</p></div>
          <form className="security-client-date-filter" onSubmit={(event) => {
            event.preventDefault();
            if (toDate < fromDate) {
              setError('La date de fin doit être postérieure à la date de début.');
              return;
            }
            setError('');
            setAppliedFromDate(fromDate);
            setAppliedToDate(toDate);
          }}>
            <label>Du<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)}/></label>
            <label>Au<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)}/></label>
            <button className="secondary-button" disabled={loading}><Icon name="search" size={16}/>Afficher</button>
          </form>
        </section>

        {error && <div className="error-message page-message">{error}</div>}
        {loading && !dashboard ? <div className="security-client-loading"><span/><p>Chargement de vos informations…</p></div> : dashboard ? <>
          {tab === 'overview' && <div className="security-client-overview">
            <section className="security-client-welcome"><div><span><Icon name="sparkles" size={25}/></span><div><p className="eyebrow">BIENVENUE DANS VOTRE ESPACE</p><h2>{dashboard.client.company_name}</h2><p>Retrouvez ici les informations opérationnelles partagées par {dashboard.organization.name}.</p></div></div><div className="security-client-welcome-contact">{dashboard.organization.phone && <a href={`tel:${dashboard.organization.phone}`}>{dashboard.organization.phone}</a>}{dashboard.organization.email && <a href={`mailto:${dashboard.organization.email}`}>{dashboard.organization.email}</a>}</div></section>
            <section className="security-client-kpis">
              <article><span><Icon name="map" size={21}/></span><div><strong>{dashboard.summary.sites}</strong><small>Sites suivis</small></div></article>
              {permissions?.planning && <article><span><Icon name="calendar" size={21}/></span><div><strong>{dashboard.summary.upcoming_interventions}</strong><small>Interventions à venir</small></div></article>}
              {permissions?.reports && <article><span><Icon name="check" size={21}/></span><div><strong>{dashboard.summary.completed_interventions}</strong><small>Passages terminés</small></div></article>}
              {permissions?.anomalies && <article className={dashboard.summary.open_anomalies > 0 ? 'warning' : ''}><span><Icon name="alert" size={21}/></span><div><strong>{dashboard.summary.open_anomalies}</strong><small>Anomalies ouvertes</small></div></article>}
              {permissions?.quality && <article className={qualityTone(dashboard.summary.average_quality)}><span><Icon name="chart" size={21}/></span><div><strong>{dashboard.summary.average_quality === null ? '—' : `${dashboard.summary.average_quality.toFixed(1)}/5`}</strong><small>Qualité moyenne</small></div></article>}
              {permissions?.documents && <article><span><Icon name="file" size={21}/></span><div><strong>{dashboard.summary.documents}</strong><small>Documents partagés</small></div></article>}
            </section>
            <section className="security-client-overview-grid">
              {permissions?.planning && <article className="security-client-card"><div className="security-client-card-head"><div><p className="eyebrow">PROCHAINES INTERVENTIONS</p><h2>Planning à venir</h2></div><button onClick={() => setTab('interventions')}>Tout voir</button></div><div className="security-client-compact-list">{dashboard.interventions.filter((intervention) => new Date(intervention.starts_at) >= new Date()).slice(0, 5).map((intervention) => <div key={intervention.id}><span style={{ background: accent }}/><div><strong>{intervention.site_name}</strong><small>{dateTime(intervention.starts_at)} · {intervention.agent_name || 'Agent à affecter'}</small></div><em>{statusLabel(intervention.status)}</em></div>)}{dashboard.interventions.filter((intervention) => new Date(intervention.starts_at) >= new Date()).length === 0 && <div className="security-client-empty">Aucune intervention à venir sur la période.</div>}</div></article>}
              {permissions?.anomalies && <article className="security-client-card"><div className="security-client-card-head"><div><p className="eyebrow">DERNIÈRES ANOMALIES</p><h2>Suivi opérationnel</h2></div><button onClick={() => setTab('anomalies')}>Tout voir</button></div><div className="security-client-compact-list events">{dashboard.anomalies.slice(0, 5).map((anomaly) => <div key={anomaly.id}><span className={anomaly.severity === 'critical' || anomaly.severity === 'high' ? 'urgent' : 'attention'}><Icon name="alert" size={15}/></span><div><strong>{anomaly.title}</strong><small>{anomaly.site_name} · {dateTime(anomaly.created_at)}</small></div><em>{severityLabel(anomaly.severity)}</em></div>)}{dashboard.anomalies.length === 0 && <div className="security-client-empty">Aucune anomalie partagée sur la période.</div>}</div></article>}
            </section>
            <section className="security-client-sites"><div className="security-client-section-title"><p className="eyebrow">VOS SITES</p><h2>Périmètre entretenu</h2></div><div>{dashboard.sites.map((site) => <article key={site.id}><span style={{ background: accent }}><Icon name="building" size={21}/></span><div><strong>{site.name}</strong><p>{[site.address, site.postal_code, site.city].filter(Boolean).join(' ') || 'Adresse non renseignée'}</p>{site.contact_name && <small>Contact sur site : {site.contact_name}{site.contact_phone ? ` · ${site.contact_phone}` : ''}</small>}</div></article>)}</div></section>
          </div>}

          {tab === 'interventions' && <section className="security-client-table-card"><div className="security-client-table-head"><p>{dashboard.interventions.length} intervention{dashboard.interventions.length > 1 ? 's' : ''} sur la période</p></div><div className="security-client-mission-list">{dashboard.interventions.map((intervention) => <article key={intervention.id}><div className="security-client-mission-date"><strong>{new Date(intervention.starts_at).getDate()}</strong><span>{new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(intervention.starts_at))}</span></div><span className="security-client-site-dot" style={{ background: accent }}/><div className="security-client-mission-main"><div><strong>{intervention.title || intervention.site_name}</strong><small>{intervention.site_name} · {dateTime(intervention.starts_at)} → {timeFormatter.format(new Date(intervention.ends_at))}</small></div><p>Agent : <strong>{intervention.agent_name || 'À affecter'}</strong></p><div className="security-client-mission-metrics">{permissions?.reports && <span><Icon name="clipboard" size={14}/>{intervention.completed_tasks}/{intervention.task_count} tâche{intervention.task_count > 1 ? 's' : ''}</span>}{permissions?.anomalies && intervention.anomaly_count > 0 && <span className="urgent"><Icon name="alert" size={14}/>{intervention.anomaly_count} anomalie{intervention.anomaly_count > 1 ? 's' : ''}</span>}{permissions?.quality && intervention.quality_score !== null && <span><Icon name="chart" size={14}/>{intervention.quality_score.toFixed(1)}/5</span>}</div></div><em className={`security-client-status ${intervention.status}`}>{statusLabel(intervention.status)}</em></article>)}{dashboard.interventions.length === 0 && <div className="security-client-empty large">Aucune intervention sur cette période.</div>}</div></section>}

          {tab === 'reports' && <section className="security-client-table-card"><div className="security-client-table-head"><p>{completedReports.length} rapport{completedReports.length > 1 ? 's' : ''} de passage</p></div><div className="security-client-mission-list cleaning-client-report-list">{completedReports.map((intervention) => <article key={intervention.id}><div className="security-client-mission-date"><strong>{new Date(intervention.actual_ended_at || intervention.ends_at).getDate()}</strong><span>{new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(intervention.actual_ended_at || intervention.ends_at))}</span></div><span className="security-client-site-dot" style={{ background: accent }}/><div className="security-client-mission-main"><div><strong>{intervention.site_name}</strong><small>Terminé le {dateTime(intervention.actual_ended_at || intervention.ends_at)} · {intervention.agent_name || 'Agent non renseigné'}</small></div><p>{intervention.report_text || 'Passage terminé sans commentaire.'}</p><div className="security-client-mission-metrics"><span><Icon name="check" size={14}/>{intervention.completed_tasks}/{intervention.task_count} tâche{intervention.task_count > 1 ? 's' : ''} réalisée{intervention.completed_tasks > 1 ? 's' : ''}</span>{intervention.before_photo_url && <a href={intervention.before_photo_url} target="_blank" rel="noreferrer"><Icon name="eye" size={14}/>Photo avant</a>}{intervention.after_photo_url && <a href={intervention.after_photo_url} target="_blank" rel="noreferrer"><Icon name="eye" size={14}/>Photo après</a>}</div></div><em className="security-client-status completed">Rapport disponible</em></article>)}{completedReports.length === 0 && <div className="security-client-empty large">Aucun rapport de passage sur cette période.</div>}</div></section>}

          {tab === 'anomalies' && <section className="security-client-timeline">{dashboard.anomalies.map((anomaly) => <article key={anomaly.id}><div className={`security-client-timeline-icon ${anomaly.severity === 'critical' || anomaly.severity === 'high' ? 'urgent' : 'attention'}`}><Icon name="alert" size={18}/></div><div><div className="security-client-timeline-head"><div><strong>{anomaly.title}</strong><small>{anomaly.site_name} · {dateTime(anomaly.created_at)}</small></div><span>{severityLabel(anomaly.severity)}</span></div><p>{anomaly.description}</p>{anomaly.corrective_action && <blockquote>Action corrective : {anomaly.corrective_action}</blockquote>}<footer><em className={anomaly.severity === 'critical' || anomaly.severity === 'high' ? 'urgent' : 'attention'}>{severityLabel(anomaly.severity)}</em><small>{statusLabel(anomaly.status)}{anomaly.resolved_at ? ` · ${dateTime(anomaly.resolved_at)}` : ''}</small></footer></div></article>)}{dashboard.anomalies.length === 0 && <div className="security-client-empty large">Aucune anomalie partagée.</div>}</section>}

          {tab === 'quality' && <section className="security-client-patrol-grid cleaning-client-quality-grid">{dashboard.quality_controls.map((control) => <article key={control.id}><div className="security-client-patrol-head"><span><Icon name="chart" size={20}/></span><em className={`security-client-status ${control.overall_score >= 3 ? 'completed' : 'open'}`}>{control.overall_score.toFixed(1)}/5</em></div><h2>{control.site_name}</h2><p>{dateTime(control.controlled_at)} · {control.agent_name || 'Agent non renseigné'}</p><div className="security-client-progress"><div><span style={{ width: `${Math.min(100, control.overall_score * 20)}%` }}/></div><strong>{Math.round(control.overall_score * 20)}%</strong></div><small>Propreté {control.score_cleanliness.toFixed(1)} · Conformité {control.score_compliance.toFixed(1)} · Ponctualité {control.score_punctuality.toFixed(1)} · Matériel {control.score_material.toFixed(1)}</small>{control.observations && <blockquote>{control.observations}</blockquote>}{control.corrective_action && <blockquote>Action corrective : {control.corrective_action}</blockquote>}</article>)}{dashboard.quality_controls.length === 0 && <div className="security-client-empty large">Aucun contrôle qualité sur cette période.</div>}</section>}

          {tab === 'documents' && <section className="security-client-documents"><div className="security-client-documents-intro"><span><Icon name="file" size={24}/></span><div><h2>Documents partagés</h2><p>Rapports, consignes, contrôles qualité, contrats et pièces mis à disposition par votre prestataire.</p></div></div><div className="security-client-document-grid">{dashboard.documents.map((document) => <article key={document.id}><span><Icon name="file" size={23}/></span><div><em>{categoryLabel(document.category)}</em><h3>{document.title}</h3><p>{document.site_name || 'Tous les sites'}</p><small>Publié le {dateTime(document.published_at)}{document.size_bytes ? ` · ${(document.size_bytes / 1024 / 1024).toFixed(1)} Mo` : ''}</small></div><button className="secondary-button" onClick={() => void openDocument(document)}><Icon name="eye" size={16}/>Ouvrir</button></article>)}{dashboard.documents.length === 0 && <div className="security-client-empty large">Aucun document partagé.</div>}</div></section>}

          {tab === 'messages' && <section className="security-client-messages"><div className="security-client-message-header"><span><Icon name="message" size={22}/></span><div><h2>Échanges avec {dashboard.organization.name}</h2><p>Une messagerie réservée aux informations liées à vos prestations de nettoyage.</p></div></div><div className="security-client-message-thread">{dashboard.messages.map((message) => <div key={message.id} className={message.author_type}><div><strong>{message.author_name || (message.author_type === 'client' ? dashboard.client.company_name : dashboard.organization.name)}</strong><small>{dateTime(message.created_at)}</small></div><p>{message.body}</p></div>)}{dashboard.messages.length === 0 && <div className="security-client-empty">Aucun échange pour le moment.</div>}</div><form className="security-client-message-composer" onSubmit={sendMessage}><textarea rows={4} maxLength={3000} value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder="Écrire à votre prestataire de nettoyage…"/><div><small>{messageBody.length}/3000</small><button className="primary-button" disabled={busy === 'message' || !messageBody.trim()}><Icon name="message" size={16}/>{busy === 'message' ? 'Envoi…' : 'Envoyer'}</button></div></form></section>}
        </> : null}
      </main>
    </div>
  </div>;
}
