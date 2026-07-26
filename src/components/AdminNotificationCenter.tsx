import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { enablePushOnDevice, pushIsSupported } from '../features/notifications/pushNotifications';
import { supabase } from '../lib/supabase';
import { Icon } from './Icon';

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
  const [deviceAlertsEnabled, setDeviceAlertsEnabled] = useState(
    () => typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );
  const [enablingDeviceAlerts, setEnablingDeviceAlerts] = useState(false);
  const [toast, setToast] = useState<AdminNotification | null>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  );

  const showDeviceNotification = useCallback(async (notification: AdminNotification) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (!('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(notification.title, {
        body: notification.body,
        icon: '/brand/ncr-suite-icon.png',
        badge: '/icons/icon-192.png',
        tag: `ncr-admin-${notification.id}`,
        requireInteraction: notification.urgency === 'critical',
        data: { url: '/administration-ncr' }
      });
    } catch {
      // L'alerte interne reste toujours disponible si le navigateur bloque l'alerte système.
    }
  }, []);

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
        void showDeviceNotification(newest);
      }
    }
    knownIds.current = new Set(rows.map((notification) => notification.id));
    initialized.current = true;
    setNotifications(rows);
    setError('');
    setLoading(false);
  }, [showDeviceNotification, user]);

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
    try {
      await enablePushOnDevice('Super-admin NCR');
      setDeviceAlertsEnabled(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Activation impossible.');
    } finally {
      setEnablingDeviceAlerts(false);
    }
  }

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
              <span><strong>{enablingDeviceAlerts ? 'Activation…' : 'Activer sur ce téléphone'}</strong><small>Recevoir aussi une alerte système pendant l’utilisation.</small></span>
            </button>
          )}

          {error && <p className="admin-notification-error">{error}</p>}
          {loading ? (
            <div className="admin-notification-empty">Chargement…</div>
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
