import { supabase } from '../../lib/supabase';

function base64UrlToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}


function arrayBufferToBase64Url(value: ArrayBuffer | null) {
  if (!value) return '';
  let binary = '';
  for (const byte of new Uint8Array(value)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function pushIsSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export function runsAsInstalledPwa() {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export async function currentPushSubscription() {
  if (!pushIsSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function enablePushOnDevice(deviceLabel?: string) {
  if (!supabase) throw new Error('Supabase n’est pas configuré.');
  if (!pushIsSupported()) throw new Error('Les notifications push ne sont pas disponibles sur ce navigateur.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('L’autorisation de notification a été refusée.');

  const { data: publicKey, error: keyError } = await supabase.rpc('get_push_public_key');
  if (keyError) throw keyError;
  if (!publicKey) throw new Error('Les notifications push ne sont pas encore initialisées par NCR.');

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(String(publicKey)),
    });
  }

  const json = subscription.toJSON();
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: subscription.endpoint,
    p_p256dh: json.keys?.p256dh ?? arrayBufferToBase64Url(subscription.getKey('p256dh')),
    p_auth_key: json.keys?.auth ?? arrayBufferToBase64Url(subscription.getKey('auth')),
    p_expiration_time: subscription.expirationTime ?? null,
    p_device_label: deviceLabel || null,
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
  return subscription;
}

export async function disablePushOnDevice() {
  if (!supabase) throw new Error('Supabase n’est pas configuré.');
  const subscription = await currentPushSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  const { error } = await supabase.rpc('disable_push_subscription', { p_endpoint: endpoint });
  if (error) throw error;
}
