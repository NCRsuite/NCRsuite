import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  currentPushSubscription,
  enablePushOnDevice,
  pushIsSupported,
  runsAsInstalledPwa
} from '../features/notifications/pushNotifications';
import { supabase } from '../lib/supabase';
import { Icon } from './Icon';
import { PremiumSkeleton } from './PremiumSkeleton';

export type AdminNotificationSection = 'cockpit' | 'access' | 'support' | 'billing';

interface AdminNotification {
  id: string;
  recipient_user_id: string;
  category: 'access' | 'support' | 'subscription' | 'module' | 'system';
  event_type: string;
  title: string;
  body: string;
  target_section: AdminNotificationSection;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short'
});

function notificationIcon(category: AdminNotification['category']) {
  if (category === 'access') return 'users';
  if (category === 'support') return 'message';
  if (category === 'subscription') return 'creditCard';
  if (category === 'module') return 'tool';
  return 'bell';
}

export function AdminNotificationCenter({
  onNavigate
}: {
  onNavigate: (section: AdminNotificationSection) => void;
}) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deviceAlertsEnabled, setDeviceAlertsEnabled] = useState(false);
  const [deviceMessage, setDeviceMessage] = useState('');
  const [enablingDeviceAlerts, setEnablingDeviceAlerts] = useState(false);
  const [toast, setToast] = useState<AdminNotification | null>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  );

  const loadNotifications = useCallback(async (announceNew = true) => {
    if (!supabase || !user) return;
    const { data, error: requestError } = await supabase
      .from('platform_admin_notifications')
      .select('id,recipient_user_id,category,event_type,title,body,target_section,urgency,entity_type,entity_id,metadata,read_at,created_at')
      .order('created_at', { ascending: false })
      .limit(40);

    if (requestError) {
      setError(requestError.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as AdminNotification[];
    if (initialized.current && announceNew) {
      const fresh = rows
        .filter((notification) => !notification.read_at && !knownIds.current.has(notification.id))
        .sort((left, right) => left.created_at.localeCompare(right.created_at));
      if (fresh.length > 0) {
        const newest = fresh[fresh.length - 1];
        setToast(newest);
      }
    }
    knownIds.current = new Set(rows.map((notification) => notification.id));
    initialized.current = true;
    setNotifications(rows);
    setError('');
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!pushIsSupported()) return;
    void currentPushSubscription()
      .then((subscription) => setDeviceAlertsEnabled(Boolean(subscription)))
      .catch(() => setDeviceAlertsEnabled(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadNotifications(false);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadNotifications(true);
    }, 8000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void loadNotifications(true);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [loadNotifications, user]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 9000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function markRead(notificationId?: string) {
    if (!supabase) return;
    const { error: requestError } = await supabase.rpc('mark_platform_admin_notifications_read', {
      p_notification_id: notificationId || null
    });
    if (requestError) {
      setError(requestError.message);
      return;
    }
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((notification) =>
      !notification.read_at && (!notificationId || notification.id === notificationId)
        ? { ...notification, read_at: readAt }
        : notification
    ));
  }

  function openNotification(notification: AdminNotification) {
    void markRead(notification.id);
    setOpen(false);
    setToast(null);
    onNavigate(notification.target_section);
  }

  async function enableDeviceAlerts() {
    setEnablingDeviceAlerts(true);
    setError('');
    setDeviceMessage('');
    try {
      await enablePushOnDevice('Super-admin NCR');
      setDeviceAlertsEnabled(true);
      const { error: testError } = await supabase!.rpc('queue_platform_admin_push_test');
      if (testError) {
        setError(`Téléphone enregistré, mais le test n’a pas pu être programmé : ${testError.message}`);
      } else {
        setDeviceMessage('Alertes écran verrouillé activées. Le test arrivera dans moins d’une minute.');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Activation impossible.');
    } finally {
      setEnablingDeviceAlerts(false);
    }
  }

  const appleInstallRequired = typeof navigator !== 'undefined'
    && /iPhone|iPad|iPod/i.test(navigator.userAgent)
    && !runsAsInstalledPwa();

  return (
    <div className="admin-notification-center">
      <button
        className={`admin-notification-trigger${unreadCount ? ' has-unread' : ''}`}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={unreadCount ? `${unreadCount} notification(s) non lue(s)` : 'Notifications'}
      >
        <Icon name="bell" size={19} />
        {unreadCount > 0 && <b>{unreadCount > 99 ? '99+' : unreadCount}</b>}
      </button>

      {open && (
        <section className="admin-notification-popover" aria-label="Notifications super-administrateur">
          <header>
            <div><strong>Notifications</strong><small>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</small></div>
            {unreadCount > 0 && <button type="button" onClick={() => void markRead()}>Tout marquer comme lu</button>}
          </header>

          {pushIsSupported() && !deviceAlertsEnabled && (
            <button
              className="admin-notification-device-action"
              type="button"
              onClick={() => void enableDeviceAlerts()}
              disabled={enablingDeviceAlerts}
            >
              <Icon name="bell" size={17} />
              <span><strong>{enablingDeviceAlerts ? 'Activation…' : 'Activer sur ce téléphone'}</strong><small>Recevoir les alertes même PWA fermée ou écran verrouillé.</small></span>
            </button>
          )}

          {!pushIsSupported() && appleInstallRequired && (
            <p className="admin-notification-info">Sur iPhone, ouvrez NCR Suite depuis l’icône ajoutée à l’écran d’accueil pour activer les alertes verrouillées.</p>
          )}
          {deviceAlertsEnabled && (
            <p className="admin-notification-success"><Icon name="check" size={15} /> Alertes écran verrouillé actives sur cet appareil.</p>
          )}
          {deviceMessage && <p className="admin-notification-success">{deviceMessage}</p>}
          {error && <p className="admin-notification-error">{error}</p>}
          {loading ? (
            <PremiumSkeleton label="Chargement des notifications" rows={3} compact />
          ) : notifications.length === 0 ? (
            <div className="admin-notification-empty"><Icon name="check" size={22} /><span>Aucune nouvelle demande.</span></div>
          ) : (
            <div className="admin-notification-list">
              {notifications.map((notification) => (
                <button
                  type="button"
                  className={`${notification.read_at ? 'read' : 'unread'} ${notification.urgency}`}
                  key={notification.id}
                  onClick={() => openNotification(notification)}
                >
                  <span><Icon name={notificationIcon(notification.category)} size={17} /></span>
                  <div><strong>{notification.title}</strong><p>{notification.body}</p><small>{dateTimeFormatter.format(new Date(notification.created_at))}</small></div>
                  {!notification.read_at && <i aria-hidden="true" />}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {toast && (
        <button
          type="button"
          className={`admin-notification-toast ${toast.urgency}`}
          onClick={() => openNotification(toast)}
          aria-live="assertive"
        >
          <span><Icon name={notificationIcon(toast.category)} size={20} /></span>
          <div><strong>{toast.title}</strong><p>{toast.body}</p><small>Appuyer pour ouvrir</small></div>
          <Icon name="chevronRight" size={18} />
        </button>
      )}
    </div>
  );
}
