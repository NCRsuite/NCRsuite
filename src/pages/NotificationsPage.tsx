import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import { currentPushSubscription, disablePushOnDevice, enablePushOnDevice, pushIsSupported, runsAsInstalledPwa } from '../features/notifications/pushNotifications';

interface Preferences {
  push_enabled: boolean;
  planning_enabled: boolean;
  appointments_enabled: boolean;
  documents_enabled: boolean;
  security_alerts_enabled: boolean;
  billing_enabled: boolean;
  system_enabled: boolean;
}

interface NotificationEvent {
  id: string;
  category: keyof Omit<Preferences, 'push_enabled'> | 'system';
  title: string;
  body: string;
  url: string;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  read_at: string | null;
  scheduled_for: string;
  created_at: string;
}

const defaultPreferences: Preferences = {
  push_enabled: false,
  planning_enabled: true,
  appointments_enabled: true,
  documents_enabled: true,
  security_alerts_enabled: true,
  billing_enabled: true,
  system_enabled: true,
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function NotificationsPage() {
  const { organization } = useOrganization();
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [deviceEnabled, setDeviceEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const categoryOptions = useMemo(() => {
    if (!organization) return [];
    return [
      { key: 'planning_enabled' as const, label: 'Planning et horaires', detail: 'Créations, modifications et rappels de missions ou sessions.', visible: true },
      { key: 'appointments_enabled' as const, label: 'Rendez-vous', detail: 'Nouveaux rendez-vous, modifications, annulations et rappels.', visible: organization.business_type === 'coiffure' },
      { key: 'documents_enabled' as const, label: 'Documents', detail: 'Documents disponibles, convocations, attestations et dossiers.', visible: ['formation', 'securite'].includes(organization.business_type) },
      { key: 'security_alerts_enabled' as const, label: 'Alertes terrain', detail: 'Consignes critiques, PTI, SOS et urgences opérationnelles.', visible: organization.business_type === 'securite' },
      { key: 'billing_enabled' as const, label: 'Facturation', detail: 'Factures envoyées, payées ou en retard.', visible: organization.business_type === 'securite' },
      { key: 'system_enabled' as const, label: 'Informations NCR Suite', detail: 'Informations importantes liées au compte et au service.', visible: true },
    ].filter((item) => item.visible);
  }, [organization]);

  async function load() {
    if (!organization || !supabase) return;
    setLoading(true);
    setError('');
    const now = new Date().toISOString();
    const [{ data: pref, error: prefError }, { data: rows, error: eventError }, subscription] = await Promise.all([
      supabase.from('notification_preferences').select('*').eq('organization_id', organization.id).maybeSingle(),
      supabase.from('notification_events').select('id,category,title,body,url,urgency,read_at,scheduled_for,created_at').eq('organization_id', organization.id).lte('scheduled_for', now).order('scheduled_for', { ascending: false }).limit(100),
      currentPushSubscription().catch(() => null),
    ]);
    if (prefError) setError(prefError.message);
    if (eventError) setError(eventError.message);
    setPreferences(pref ? { ...defaultPreferences, ...pref } : defaultPreferences);
    setEvents((rows ?? []) as NotificationEvent[]);
    setDeviceEnabled(Boolean(subscription));
    setLoading(false);
  }

  useEffect(() => { void load(); }, [organization?.id]);

  useEffect(() => {
    if (!organization || !supabase) return;
    const client = supabase;
    const organizationId = organization.id;
    const channel = client.channel(`notification-events-${organizationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_events', filter: `organization_id=eq.${organizationId}` }, () => void load())
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [organization?.id]);

  async function savePreferences(next = preferences) {
    if (!organization || !supabase) return;
    setSaving(true);
    setError('');
    const { error: requestError } = await supabase.rpc('save_notification_preferences', {
      p_organization_id: organization.id,
      p_push_enabled: next.push_enabled,
      p_planning_enabled: next.planning_enabled,
      p_appointments_enabled: next.appointments_enabled,
      p_documents_enabled: next.documents_enabled,
      p_security_alerts_enabled: next.security_alerts_enabled,
      p_billing_enabled: next.billing_enabled,
      p_system_enabled: next.system_enabled,
    });
    if (requestError) setError(requestError.message);
    setSaving(false);
  }

  async function enable() {
    if (!organization || !supabase) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const label = /iPhone|iPad/i.test(navigator.userAgent) ? 'iPhone / iPad' : /Android/i.test(navigator.userAgent) ? 'Android' : 'Navigateur';
      await enablePushOnDevice(label);
      const next = { ...preferences, push_enabled: true };
      setPreferences(next);
      await savePreferences(next);
      await supabase.rpc('queue_test_push', { p_organization_id: organization.id });
      setDeviceEnabled(true);
      setMessage('Notifications activées. Une notification de test arrivera dans moins d’une minute.');
    } catch (caught: any) {
      setError(caught?.message ?? 'Activation impossible.');
    } finally {
      setSaving(false);
    }
  }

  async function disable() {
    setSaving(true);
    setError('');
    try {
      await disablePushOnDevice();
      const next = { ...preferences, push_enabled: false };
      setPreferences(next);
      await savePreferences(next);
      setDeviceEnabled(false);
      setMessage('Notifications désactivées sur cet appareil.');
    } catch (caught: any) {
      setError(caught?.message ?? 'Désactivation impossible.');
    } finally {
      setSaving(false);
    }
  }

  async function markRead(event: NotificationEvent) {
    if (!organization || !supabase) return;
    if (!event.read_at) await supabase.rpc('mark_notification_read', { p_organization_id: organization.id, p_event_id: event.id });
    window.location.assign(event.url || '/');
  }

  async function markAllRead() {
    if (!organization || !supabase) return;
    await supabase.rpc('mark_all_notifications_read', { p_organization_id: organization.id });
    await load();
  }

  if (!organization) return null;
  const supported = pushIsSupported();
  const installed = runsAsInstalledPwa();
  const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const unread = events.filter((event) => !event.read_at).length;

  return (
    <div className="page notification-page">
      <header className="page-header">
        <div><p className="eyebrow">CENTRE NCR SUITE</p><h1>Notifications</h1><p>Choisis les alertes reçues dans l’application et sur l’écran verrouillé.</p></div>
        {unread > 0 && <button className="secondary-button" type="button" onClick={markAllRead}>Tout marquer comme lu</button>}
      </header>

      {error && <div className="error-message page-message">{error}</div>}
      {message && <div className="success-message page-message">{message}</div>}

      <section className="notification-grid">
        <article className="panel push-activation-card">
          <div className="panel-header"><div><p className="eyebrow">CET APPAREIL</p><h2>Notifications push</h2></div><span className={`notification-status-dot ${deviceEnabled ? 'active' : ''}`} /></div>
          <div className="push-device-state">
            <span className="push-device-icon"><Icon name="bell" size={28} /></span>
            <div><strong>{deviceEnabled ? 'Notifications actives' : 'Notifications non activées'}</strong><p>{deviceEnabled ? 'Cet appareil peut recevoir les alertes même lorsque NCR Suite est fermée.' : 'Active-les pour recevoir les alertes importantes sur le téléphone verrouillé.'}</p></div>
          </div>
          {!supported && isAppleMobile && !installed && <div className="info-message">Sur iPhone, ouvre NCR Suite depuis l’icône ajoutée à l’écran d’accueil, puis reviens ici pour activer les notifications.</div>}
          {!supported && !(isAppleMobile && !installed) && <div className="info-message">Ce navigateur ne prend pas en charge les notifications push.</div>}
          {supported && !deviceEnabled && <button className="primary-button full" type="button" disabled={saving} onClick={enable}>{saving ? 'Activation…' : 'Activer les notifications'}</button>}
          {supported && deviceEnabled && <button className="secondary-button full" type="button" disabled={saving} onClick={disable}>Désactiver sur cet appareil</button>}
        </article>

        <article className="panel notification-preferences-card">
          <div className="panel-header"><div><p className="eyebrow">PRÉFÉRENCES</p><h2>Alertes à recevoir</h2></div></div>
          <div className="notification-preference-list">
            {categoryOptions.map((option) => (
              <label className="notification-preference-row" key={option.key}>
                <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                <input type="checkbox" checked={preferences[option.key]} onChange={(event) => {
                  const next = { ...preferences, [option.key]: event.target.checked };
                  setPreferences(next);
                  void savePreferences(next);
                }} />
              </label>
            ))}
          </div>
        </article>
      </section>

      <section className="panel notification-inbox">
        <div className="panel-header"><div><p className="eyebrow">HISTORIQUE</p><h2>Centre de notifications</h2></div><span>{unread} non lue{unread > 1 ? 's' : ''}</span></div>
        {loading && <div className="empty-state">Chargement des notifications…</div>}
        {!loading && events.length === 0 && <div className="empty-state"><Icon name="bell" size={28} /><h3>Aucune notification</h3><p>Les alertes de planning, rendez-vous, documents et urgences apparaîtront ici.</p></div>}
        <div className="notification-event-list">
          {events.map((event) => (
            <button type="button" key={event.id} className={`notification-event ${event.read_at ? '' : 'unread'} urgency-${event.urgency}`} onClick={() => void markRead(event)}>
              <span className="notification-event-icon"><Icon name={event.urgency === 'critical' || event.urgency === 'high' ? 'alert' : 'bell'} size={20} /></span>
              <span className="notification-event-content"><strong>{event.title}</strong><p>{event.body}</p><small>{dateLabel(event.scheduled_for)}</small></span>
              {!event.read_at && <i />}
              <Icon name="chevronRight" size={17} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
