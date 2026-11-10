/** Presentation and request guards shared by the public Beauty journeys. */
export function readableBrand(color: string | null | undefined) {
  const hex = /^#[0-9a-f]{6}$/i.test(color || '') ? color! : '#36433e';
  const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  const luminance = (values: number[]) => values.map((value) => {
    const n = value / 255;
    return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
  }).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
  let ink = [...rgb];
  // Keep the configured hue, darkening only the action/text tone for white text.
  while (luminance(ink) > .183) ink = ink.map((value) => Math.floor(value * .92));
  return { color: hex, ink: `#${ink.map((value) => value.toString(16).padStart(2, '0')).join('')}` };
}

export function bookingError(error: unknown) {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  if (/fetch|network|réseau|timeout/i.test(message) || !message) {
    return 'La réponse du serveur n’a pas pu être vérifiée. Avant de réessayer, consultez vos rendez-vous ou contactez le salon pour éviter une réservation en double.';
  }
  return message;
}

export function isBookingConfirmation(value: unknown): value is {
  appointment_id: string; token: string; status: 'confirmed' | 'pending'; starts_at: string; ends_at: string;
} {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.appointment_id === 'string' && !!row.appointment_id
    && typeof row.token === 'string' && !!row.token
    && (row.status === 'confirmed' || row.status === 'pending')
    && typeof row.starts_at === 'string' && Number.isFinite(Date.parse(row.starts_at))
    && typeof row.ends_at === 'string' && Number.isFinite(Date.parse(row.ends_at));
}

/** Synchronous lock: a second event cannot race React's pending state update. */
export function createSubmissionGate() {
  let pending = false;
  return async (action: () => Promise<void>) => {
    if (pending) return false;
    pending = true;
    try { await action(); return true; } finally { pending = false; }
  };
}

export function clientReturnPath(value: string | null) {
  if (!value || !/^\/(salon|reserver|reservation)\/[a-zA-Z0-9_-]+(?:[?#]|$)/.test(value)) return null;
  return value;
}

export function durationBetween(start: string, end: string) {
  const minutes = Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60}` : ''}` : `${minutes} min`;
}

/** Redirect only a server-resolved company, never an organization guessed from its slug. */
export function canonicalBeautyBookingPath(
  legacy: { id: string; slug: string },
  company: { id: string; public_slug: string } | null | undefined,
  search: string,
  hash: string,
) {
  if (!company || company.id !== legacy.id || company.public_slug !== legacy.slug
    || !/^[a-zA-Z0-9_-]+$/.test(company.public_slug)) return null;
  const anchor = hash === '#reservation' ? '#reserver' : hash === '#salon-infos' ? '#infos' : hash;
  return `/salon/${encodeURIComponent(company.public_slug)}${search}${anchor}`;
}
