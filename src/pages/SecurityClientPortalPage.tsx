import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { closeFileWindow, navigateFileWindow, prepareFileWindow } from '../lib/browserFiles';
import { supabase } from '../lib/supabase';

type PortalPermissions = { planning: boolean; logbook: boolean; patrols: boolean; documents: boolean; messages: boolean };
type PortalAccount = { account_id: string; organization_id: string; client_id: string; organization_name: string; organization_logo_url: string | null; organization_primary_color: string | null; client_name: string; display_name: string | null; role: string; permissions: PortalPermissions; unread_messages: number; last_seen_at: string | null };
type PortalOrganization = { id: string; name: string; logo_url: string | null; primary_color: string | null; email: string | null; phone: string | null; address: string | null };
type PortalClient = { id: string; company_name: string; contact_name: string | null; email: string | null; phone: string | null };
type PortalSummary = { sites: number; upcoming_shifts: number; completed_shifts: number; urgent_events: number; documents: number; unread_messages: number };
type PortalSite = { id: string; name: string; code: string | null; address: string | null; postal_code: string | null; city: string | null; contact_name: string | null; contact_phone: string | null; color_hex: string | null };
type PortalShift = { id: string; site_id: string; site_name: string; color_hex: string | null; title: string | null; starts_at: string; ends_at: string; status: string; dossier_status: string | null; actual_minutes: number | null; dossier_closed_at: string | null; agent_name: string | null; logbook_count: number; urgent_count: number; completed_patrols: number };
type PortalLogEntry = { id: string; shift_id: string | null; site_id: string; site_name: string; occurred_at: string; category: string; severity: string; title: string; details: string | null; status: string };
type PortalPatrol = { id: string; shift_id: string | null; site_id: string; site_name: string; started_at: string; completed_at: string | null; status: string; notes: string | null; agent_name: string | null; scan_count: number; expected_count: number };
type PortalDocument = { id: string; title: string; category: string; storage_path: string; mime_type: string | null; size_bytes: number | null; published_at: string; site_id: string | null; shift_id: string | null; site_name: string | null };
type PortalMessage = { id: string; author_type: 'security' | 'client'; author_name: string | null; body: string; created_at: string; read_by_client_at: string | null; read_by_security_at: string | null };
type DashboardData = { account: { id: string; role: string; display_name: string | null; permissions: PortalPermissions }; organization: PortalOrganization; client: PortalClient; summary: PortalSummary; sites: PortalSite[]; shifts: PortalShift[]; logbook: PortalLogEntry[]; patrols: PortalPatrol[]; documents: PortalDocument[]; messages: PortalMessage[] };
type PortalTab = 'overview' | 'missions' | 'logbook' | 'patrols' | 'documents' | 'messages';
type PortalTabItem = { id: PortalTab; label: string; icon: 'home' | 'calendar' | 'clipboard' | 'shield' | 'file' | 'message'; enabled: boolean; count?: number };

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
function dateTime(value: string | null) { return value ? dateTimeFormatter.format(new Date(value)) : '—'; }
function isoDate(offsetDays: number) { const value = new Date(); value.setDate(value.getDate() + offsetDays); return value.toISOString().slice(0, 10); }
function statusLabel(value: string) { return ({ planned: 'Planifiée', completed: 'Terminée', canceled: 'Annulée', active: 'En cours', in_progress: 'En cours', abandoned: 'Abandonnée', open: 'Ouvert', closed: 'Clôturé', processed: 'Traité', archived: 'Archivé' } as Record<string, string>)[value] ?? categoryLabel(value); }
function categoryLabel(value: string) { return value.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase()); }

export function SecurityClientPortalPage() {
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

  const selectedAccount = useMemo(() => accounts.find((account) => account.account_id === accountId) ?? accounts[0] ?? null, [accounts, accountId]);

  const loadAccounts = useCallback(async () => {
    if (!user || !supabase) return;
    setLoading(true); setError('');
    const { data, error: rpcError } = await supabase.rpc('current_security_client_portal_accounts');
    if (rpcError) setError(rpcError.message);
    else {
      const rows = (data ?? []) as PortalAccount[];
      setAccounts(rows);
      setAccountId((current) => current && rows.some((row) => row.account_id === current) ? current : rows[0]?.account_id ?? '');
    }
    setLoading(false);
  }, [user?.id]);

  const loadDashboard = useCallback(async (targetAccountId: string) => {
    if (!supabase || !targetAccountId) { setDashboard(null); return; }
    setLoading(true); setError('');
    const { data, error: rpcError } = await supabase.rpc('security_client_portal_dashboard', { p_account_id: targetAccountId, p_from: appliedFromDate, p_to: appliedToDate });
    if (rpcError) setError(rpcError.message);
    else {
      setDashboard(data as DashboardData);
      setAccounts((current) => current.map((account) => account.account_id === targetAccountId ? { ...account, unread_messages: 0 } : account));
    }
    setLoading(false);
  }, [appliedFromDate, appliedToDate]);

  useEffect(() => { if (user) void loadAccounts(); else { setAccounts([]); setDashboard(null); } }, [user?.id, loadAccounts]);
  useEffect(() => { if (selectedAccount?.account_id) void loadDashboard(selectedAccount.account_id); }, [selectedAccount?.account_id, loadDashboard]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy('login'); setError('');
    try { await signIn(email.trim(), password); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Connexion impossible.'); }
    setBusy('');
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !selectedAccount || !messageBody.trim()) return;
    setBusy('message'); setError('');
    const { error: sendError } = await supabase.rpc('security_client_portal_send_message', { p_account_id: selectedAccount.account_id, p_body: messageBody.trim() });
    if (sendError) setError(sendError.message);
    else { setMessageBody(''); await loadDashboard(selectedAccount.account_id); await loadAccounts(); }
    setBusy('');
  }

  async function openDocument(document: PortalDocument) {
    if (!supabase) return;
    const target = prepareFileWindow('Ouverture du document', document.title);
    const { data, error: signedError } = await supabase.storage.from('security-client-documents').createSignedUrl(document.storage_path, 300);
    if (signedError || !data?.signedUrl) { closeFileWindow(target); setError(signedError?.message ?? 'Document inaccessible.'); return; }
    navigateFileWindow(target, data.signedUrl);
  }

  if (authLoading) return <div className="security-client-loading-screen"><img src="/brand/ncr-suite-icon.png" alt=""/><span>Ouverture du portail client…</span></div>;

  if (!user) return <div className="security-client-public-shell">
    <div className="security-client-public-glow" />
    <section className="security-client-login-card">
      <div className="security-client-public-brand"><span><Icon name="shield" size={27}/></span><div><strong>Portail client Sécurité</strong><small>Propulsé par NCR Suite</small></div></div>
      <div className="security-client-login-copy"><p className="eyebrow">ESPACE SÉCURISÉ</p><h1>Suivez vos prestations en toute transparence.</h1><p>Planning, missions réalisées, main courante, rondes QR, documents et échanges avec votre prestataire.</p></div>
      <form className="security-client-auth-form" onSubmit={login}>
        <label>Adresse e-mail<input type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Mot de passe<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <button className="primary-button full" disabled={busy === 'login'}>{busy === 'login' ? 'Connexion…' : 'Ouvrir mon portail'}</button>
      </form>
      {error && <div className="error-message page-message">{error}</div>}
      <div className="security-client-public-footer"><span>Accès uniquement sur invitation</span><span>·</span><a href="mailto:contact@ncr-suite.fr">Besoin d’aide ?</a></div>
    </section>
  </div>;

  if (!loading && accounts.length === 0) return <div className="security-client-public-shell">
    <section className="security-client-login-card security-client-no-access">
      <span className="security-client-no-access-icon"><Icon name="lock" size={30}/></span>
      <p className="eyebrow">PORTAIL CLIENT SÉCURITÉ</p><h1>Aucun accès actif</h1><p>Cette adresse n’est rattachée à aucun portail client actif. Utilise le lien d’invitation transmis par ton prestataire de sécurité.</p>
      {error && <div className="error-message page-message">{error}</div>}
      <button className="secondary-button full" onClick={() => void signOut()}>Se connecter avec une autre adresse</button>
    </section>
  </div>;

  const accent = dashboard?.organization.primary_color || selectedAccount?.organization_primary_color || '#1d4ed8';
  const permissions = dashboard?.account.permissions ?? selectedAccount?.permissions;
  const availableTabs: PortalTabItem[] = [
    { id: 'overview', label: 'Vue d’ensemble', icon: 'home', enabled: true },
    { id: 'missions', label: 'Missions', icon: 'calendar', enabled: Boolean(permissions?.planning), count: dashboard?.shifts.length },
    { id: 'logbook', label: 'Main courante', icon: 'clipboard', enabled: Boolean(permissions?.logbook), count: dashboard?.logbook.length },
    { id: 'patrols', label: 'Rondes', icon: 'shield', enabled: Boolean(permissions?.patrols), count: dashboard?.patrols.length },
    { id: 'documents', label: 'Documents', icon: 'file', enabled: Boolean(permissions?.documents), count: dashboard?.documents.length },
    { id: 'messages', label: 'Messages', icon: 'message', enabled: Boolean(permissions?.messages), count: selectedAccount?.unread_messages }
  ];
  const tabs = availableTabs.filter((item) => item.enabled);

  return <div className="security-client-portal" style={{ '--portal-accent': accent } as React.CSSProperties}>
    <header className="security-client-topbar">
      <div className="security-client-topbar-brand">{dashboard?.organization.logo_url || selectedAccount?.organization_logo_url ? <img src={dashboard?.organization.logo_url || selectedAccount?.organization_logo_url || ''} alt=""/> : <span><Icon name="shield" size={23}/></span>}<div><strong>{dashboard?.organization.name || selectedAccount?.organization_name || 'Portail Sécurité'}</strong><small>Espace client sécurisé</small></div></div>
      <div className="security-client-topbar-actions">
        {accounts.length > 1 && <select value={selectedAccount?.account_id ?? ''} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.account_id} value={account.account_id}>{account.organization_name} · {account.client_name}</option>)}</select>}
        <div className="security-client-user"><span>{(dashboard?.account.display_name || user.email || 'C').slice(0,1).toUpperCase()}</span><div><strong>{dashboard?.account.display_name || user.email}</strong><small>{dashboard?.client.company_name || selectedAccount?.client_name}</small></div></div>
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
          <form className="security-client-date-filter" onSubmit={(event) => { event.preventDefault(); if (toDate < fromDate) { setError('La date de fin doit être postérieure à la date de début.'); return; } setError(''); setAppliedFromDate(fromDate); setAppliedToDate(toDate); }}><label>Du<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)}/></label><label>Au<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)}/></label><button className="secondary-button" disabled={loading}><Icon name="search" size={16}/>Afficher</button></form>
        </section>

        {error && <div className="error-message page-message">{error}</div>}
        {loading && !dashboard ? <div className="security-client-loading"><span/><p>Chargement de vos informations…</p></div> : dashboard ? <>
          {tab === 'overview' && <div className="security-client-overview">
            <section className="security-client-welcome"><div><span><Icon name="shield" size={25}/></span><div><p className="eyebrow">BIENVENUE DANS VOTRE ESPACE</p><h2>{dashboard.client.company_name}</h2><p>Retrouvez ici les informations opérationnelles partagées par {dashboard.organization.name}.</p></div></div><div className="security-client-welcome-contact">{dashboard.organization.phone && <a href={`tel:${dashboard.organization.phone}`}>{dashboard.organization.phone}</a>}{dashboard.organization.email && <a href={`mailto:${dashboard.organization.email}`}>{dashboard.organization.email}</a>}</div></section>
            <section className="security-client-kpis">
              <article><span><Icon name="map" size={21}/></span><div><strong>{dashboard.summary.sites}</strong><small>Sites suivis</small></div></article>
              {permissions?.planning && <article><span><Icon name="calendar" size={21}/></span><div><strong>{dashboard.summary.upcoming_shifts}</strong><small>Missions à venir</small></div></article>}
              {permissions?.planning && <article><span><Icon name="check" size={21}/></span><div><strong>{dashboard.summary.completed_shifts}</strong><small>Missions terminées</small></div></article>}
              {permissions?.logbook && <article className={dashboard.summary.urgent_events > 0 ? 'warning' : ''}><span><Icon name="alert" size={21}/></span><div><strong>{dashboard.summary.urgent_events}</strong><small>Événements urgents</small></div></article>}
              {permissions?.documents && <article><span><Icon name="file" size={21}/></span><div><strong>{dashboard.summary.documents}</strong><small>Documents partagés</small></div></article>}
            </section>
            <section className="security-client-overview-grid">
              {permissions?.planning && <article className="security-client-card"><div className="security-client-card-head"><div><p className="eyebrow">PROCHAINES MISSIONS</p><h2>Planning à venir</h2></div><button onClick={() => setTab('missions')}>Tout voir</button></div><div className="security-client-compact-list">{dashboard.shifts.filter((shift) => new Date(shift.starts_at) >= new Date()).slice(0,5).map((shift) => <div key={shift.id}><span style={{ background: shift.color_hex || accent }}/><div><strong>{shift.site_name}</strong><small>{dateTime(shift.starts_at)} · {shift.agent_name || 'Agent à affecter'}</small></div><em>{statusLabel(shift.status)}</em></div>)}{dashboard.shifts.filter((shift) => new Date(shift.starts_at) >= new Date()).length === 0 && <div className="security-client-empty">Aucune mission à venir sur la période.</div>}</div></article>}
              {permissions?.logbook && <article className="security-client-card"><div className="security-client-card-head"><div><p className="eyebrow">DERNIERS ÉVÉNEMENTS</p><h2>Main courante</h2></div><button onClick={() => setTab('logbook')}>Tout voir</button></div><div className="security-client-compact-list events">{dashboard.logbook.slice(0,5).map((entry) => <div key={entry.id}><span className={entry.severity}><Icon name={entry.severity === 'urgent' ? 'alert' : 'clipboard'} size={15}/></span><div><strong>{entry.title}</strong><small>{entry.site_name} · {dateTime(entry.occurred_at)}</small></div><em>{categoryLabel(entry.category)}</em></div>)}{dashboard.logbook.length === 0 && <div className="security-client-empty">Aucun événement partagé sur la période.</div>}</div></article>}
              {!permissions?.planning && !permissions?.logbook && <article className="security-client-card"><div className="security-client-empty">Les informations opérationnelles disponibles apparaissent dans les rubriques autorisées de votre portail.</div></article>}
            </section>
            <section className="security-client-sites"><div className="security-client-section-title"><p className="eyebrow">VOS SITES</p><h2>Périmètre surveillé</h2></div><div>{dashboard.sites.map((site) => <article key={site.id}><span style={{ background: site.color_hex || accent }}><Icon name="building" size={21}/></span><div><strong>{site.name}</strong><p>{[site.address, site.postal_code, site.city].filter(Boolean).join(' ') || 'Adresse non renseignée'}</p>{site.contact_name && <small>Contact sur site : {site.contact_name}{site.contact_phone ? ` · ${site.contact_phone}` : ''}</small>}</div></article>)}</div></section>
          </div>}

          {tab === 'missions' && <section className="security-client-table-card"><div className="security-client-table-head"><p>{dashboard.shifts.length} mission{dashboard.shifts.length > 1 ? 's' : ''} sur la période</p></div><div className="security-client-mission-list">{dashboard.shifts.map((shift) => <article key={shift.id}><div className="security-client-mission-date"><strong>{new Date(shift.starts_at).getDate()}</strong><span>{new Intl.DateTimeFormat('fr-FR',{month:'short'}).format(new Date(shift.starts_at))}</span></div><span className="security-client-site-dot" style={{ background: shift.color_hex || accent }}/><div className="security-client-mission-main"><div><strong>{shift.title || shift.site_name}</strong><small>{shift.site_name} · {dateTime(shift.starts_at)} → {new Intl.DateTimeFormat('fr-FR',{timeStyle:'short'}).format(new Date(shift.ends_at))}</small></div><p>Agent : <strong>{shift.agent_name || 'À affecter'}</strong></p><div className="security-client-mission-metrics"><span><Icon name="clipboard" size={14}/>{shift.logbook_count} événement{shift.logbook_count > 1 ? 's' : ''}</span><span><Icon name="shield" size={14}/>{shift.completed_patrols} ronde{shift.completed_patrols > 1 ? 's' : ''}</span>{shift.urgent_count > 0 && <span className="urgent"><Icon name="alert" size={14}/>{shift.urgent_count} urgent</span>}</div></div><em className={`security-client-status ${shift.status}`}>{statusLabel(shift.status)}</em></article>)}{dashboard.shifts.length === 0 && <div className="security-client-empty large">Aucune mission sur cette période.</div>}</div></section>}

          {tab === 'logbook' && <section className="security-client-timeline">{dashboard.logbook.map((entry) => <article key={entry.id}><div className={`security-client-timeline-icon ${entry.severity}`}><Icon name={entry.severity === 'urgent' ? 'alert' : 'clipboard'} size={18}/></div><div><div className="security-client-timeline-head"><div><strong>{entry.title}</strong><small>{entry.site_name} · {dateTime(entry.occurred_at)}</small></div><span>{categoryLabel(entry.category)}</span></div>{entry.details && <p>{entry.details}</p>}<footer><em className={entry.severity}>{entry.severity === 'urgent' ? 'Urgent' : entry.severity === 'attention' ? 'Attention' : 'Information'}</em><small>{statusLabel(entry.status)}</small></footer></div></article>)}{dashboard.logbook.length === 0 && <div className="security-client-empty large">Aucun événement de main courante partagé.</div>}</section>}

          {tab === 'patrols' && <section className="security-client-patrol-grid">{dashboard.patrols.map((patrol) => { const percent = patrol.expected_count > 0 ? Math.min(100, Math.round((patrol.scan_count / patrol.expected_count) * 100)) : 0; return <article key={patrol.id}><div className="security-client-patrol-head"><span><Icon name="shield" size={20}/></span><em className={`security-client-status ${patrol.status}`}>{statusLabel(patrol.status)}</em></div><h2>{patrol.site_name}</h2><p>{dateTime(patrol.started_at)} · {patrol.agent_name || 'Agent non renseigné'}</p><div className="security-client-progress"><div><span style={{ width: `${percent}%` }}/></div><strong>{patrol.scan_count}/{patrol.expected_count}</strong></div><small>{percent}% des points de contrôle validés</small>{patrol.notes && <blockquote>{patrol.notes}</blockquote>}</article>; })}{dashboard.patrols.length === 0 && <div className="security-client-empty large">Aucune ronde sur cette période.</div>}</section>}

          {tab === 'documents' && <section className="security-client-documents"><div className="security-client-documents-intro"><span><Icon name="file" size={24}/></span><div><h2>Documents partagés</h2><p>Rapports, consignes, contrats et pièces mis à disposition par votre prestataire.</p></div></div><div className="security-client-document-grid">{dashboard.documents.map((document) => <article key={document.id}><span><Icon name="file" size={23}/></span><div><em>{categoryLabel(document.category)}</em><h3>{document.title}</h3><p>{document.site_name || 'Tous les sites'}</p><small>Publié le {dateTime(document.published_at)}{document.size_bytes ? ` · ${(document.size_bytes / 1024 / 1024).toFixed(1)} Mo` : ''}</small></div><button className="secondary-button" onClick={() => void openDocument(document)}><Icon name="eye" size={16}/>Ouvrir</button></article>)}{dashboard.documents.length === 0 && <div className="security-client-empty large">Aucun document partagé.</div>}</div></section>}

          {tab === 'messages' && <section className="security-client-messages"><div className="security-client-message-header"><span><Icon name="message" size={22}/></span><div><h2>Échanges avec {dashboard.organization.name}</h2><p>Une messagerie réservée aux informations liées à vos prestations.</p></div></div><div className="security-client-message-thread">{dashboard.messages.map((message) => <div key={message.id} className={message.author_type}><div><strong>{message.author_name || (message.author_type === 'client' ? dashboard.client.company_name : dashboard.organization.name)}</strong><small>{dateTime(message.created_at)}</small></div><p>{message.body}</p></div>)}{dashboard.messages.length === 0 && <div className="security-client-empty">Aucun échange pour le moment.</div>}</div><form className="security-client-message-composer" onSubmit={sendMessage}><textarea rows={4} maxLength={3000} value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder="Écrire à votre prestataire de sécurité…"/><div><small>{messageBody.length}/3000</small><button className="primary-button" disabled={busy === 'message' || !messageBody.trim()}><Icon name="message" size={16}/>{busy === 'message' ? 'Envoi…' : 'Envoyer'}</button></div></form></section>}
        </> : null}
      </main>
    </div>
  </div>;
}
