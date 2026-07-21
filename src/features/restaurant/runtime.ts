export function toRestaurantLocalDateKey(value: string | Date = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toRestaurantLocalDateTimeInput(value: string | Date = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function restaurantDayBounds(day: string) {
  const start = new Date(`${day}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function roundRestaurantDateToSlot(date: Date, intervalMinutes: number, direction: 'ceil' | 'floor' = 'ceil') {
  const interval = Math.max(5, Math.min(60, Number(intervalMinutes) || 15));
  const minutesFromMidnight = date.getHours() * 60 + date.getMinutes();
  const rounded = (direction === 'ceil' ? Math.ceil(minutesFromMidnight / interval) : Math.floor(minutesFromMidnight / interval)) * interval;
  const result = new Date(date);
  result.setHours(0, rounded, 0, 0);
  return result;
}

export function restaurantErrorMessage(caught: unknown, fallback: string) {
  let message = '';
  if (caught instanceof Error) message = caught.message;
  else if (caught && typeof caught === 'object' && 'message' in caught && typeof caught.message === 'string') message = caught.message;

  const normalized = message.toLowerCase();
  if (normalized.includes('failed to fetch') || normalized.includes('networkerror') || normalized.includes('load failed')) {
    return 'Connexion indisponible. Vérifie le réseau puis réessaie.';
  }
  if (normalized.includes('jwt') || normalized.includes('session') || normalized.includes('authentification')) {
    return 'Ta session a expiré. Déconnecte-toi puis reconnecte-toi.';
  }
  if (normalized.includes('already reserved') || normalized.includes('déjà réservée') || normalized.includes('surréservation')) {
    return 'Ce créneau vient d’être pris. Actualise les disponibilités et choisis une autre table.';
  }
  return message || fallback;
}

export function safeRestaurantStorageArray<T>(key: string): T[] {
  try {
    const value = localStorage.getItem(key);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}
