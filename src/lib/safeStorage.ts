/**
 * Lecture résiliente du stockage navigateur.
 * Une valeur corrompue ne doit jamais empêcher NCR Suite de démarrer.
 */
export function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    try { window.localStorage.removeItem(key); } catch { /* stockage indisponible */ }
    return fallback;
  }
}

export function writeJsonStorage(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key: string): void {
  try { window.localStorage.removeItem(key); } catch { /* stockage indisponible */ }
}


export function parseStoredJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
