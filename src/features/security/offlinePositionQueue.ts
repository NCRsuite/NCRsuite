import { supabase } from '../../lib/supabase';

export interface PendingSecurityPosition {
  id: string;
  organizationId: string;
  shiftId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recordedAt: string;
}

const STORAGE_KEY = 'ncr-security-pending-positions-v1';
const MAX_ITEMS = 120;

function readQueue(): PendingSecurityPosition[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingSecurityPosition[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: PendingSecurityPosition[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
  } catch {
    // Le stockage local peut être indisponible en navigation privée stricte.
  }
}

export function pendingSecurityPositionCount(organizationId?: string) {
  const items = readQueue();
  return organizationId ? items.filter((item) => item.organizationId === organizationId).length : items.length;
}

export function queueSecurityPosition(item: Omit<PendingSecurityPosition, 'id'>) {
  const queue = readQueue();
  queue.push({ ...item, id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}` });
  writeQueue(queue);
  return queue.filter((row) => row.organizationId === item.organizationId).length;
}

export async function flushSecurityPositionQueue(organizationId: string) {
  if (!supabase || !navigator.onLine) return { sent: 0, remaining: pendingSecurityPositionCount(organizationId) };
  const queue = readQueue();
  const keep: PendingSecurityPosition[] = [];
  let sent = 0;

  for (const item of queue) {
    if (item.organizationId !== organizationId) {
      keep.push(item);
      continue;
    }
    const { error } = await supabase.rpc('record_security_agent_position_at', {
      p_organization_id: item.organizationId,
      p_shift_id: item.shiftId,
      p_latitude: item.latitude,
      p_longitude: item.longitude,
      p_accuracy_m: item.accuracy,
      p_recorded_at: item.recordedAt
    });
    if (error) keep.push(item);
    else sent += 1;
  }

  writeQueue(keep);
  return { sent, remaining: keep.filter((item) => item.organizationId === organizationId).length };
}
