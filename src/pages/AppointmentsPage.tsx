import { type CSSProperties, type MouseEvent as ReactMouseEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useBeautyEnseigneContext } from '../hooks/useBeautyEnseigneContext';
import { supabase } from '../lib/supabase';
import '../beautyAppointmentWeekPlanner.css';

type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
type ViewMode = 'week' | 'day';

interface ClientRecord {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
}

interface ServiceRecord {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  active: boolean;
}

interface StaffRecord {
  id: string;
  display_name: string;
  site_id: string | null;
  color: string | null;
  active: boolean;
}

interface StaffServiceRecord {
  staff_id: string;
  service_id: string;
}

interface WorkingHourRecord {
  staff_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

interface BreakRecord {
  staff_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

interface AppointmentServiceItemRecord {
  appointment_id: string;
  service_id: string;
  position: number;
  service_name: string;
  duration_minutes: number;
  price_cents: number;
}

interface AppointmentRecord {
  id: string;
  client_id: string;
  service_id: string;
  staff_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  amount_cents: number | null;
  source: 'internal' | 'public';
  created_at: string;
  site_id: string | null;
}

interface AppointmentFormState {
  siteId: string;
  clientId: string;
  serviceId: string;
  staffId: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed';
  notes: string;
}

type AvailabilityBlockKind = 'closure' | 'leave' | 'block';

interface AvailabilityBlockRecord {
  id: string;
  company_id: string;
  site_id: string;
  staff_id: string | null;
  kind: AvailabilityBlockKind;
  label: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  active: boolean;
  created_at: string;
}

interface AvailabilityBlockFormState {
  kind: AvailabilityBlockKind;
  siteId: string;
  staffId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  label: string;
}

const statusLabels: Record<AppointmentStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  completed: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absent'
};

const availabilityKindLabels: Record<AvailabilityBlockKind, string> = {
  closure: 'Fermeture',
  leave: 'Congé',
  block: 'Blocage'
};

const availabilityKindDescriptions: Record<AvailabilityBlockKind, string> = {
  closure: 'Fermer ce lieu à la réservation pendant une période.',
  leave: 'Rendre un collaborateur indisponible.',
  block: 'Bloquer ponctuellement du temps pour le lieu ou un collaborateur.'
};

const currencyFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
const fullDateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

function dateToInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timeToInput(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  const mondayOffset = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - mondayOffset);
  return copy;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function minutesFromTime(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
  return hours * 60 + minutes;
}

function fullClientName(client?: ClientRecord) {
  if (!client) return 'Client inconnu';
  return [client.first_name, client.last_name].filter(Boolean).join(' ');
}

function nextRoundedTime() {
  const date = new Date();
  date.setSeconds(0, 0);
  const minutes = date.getMinutes();
  const rounded = Math.ceil(minutes / 15) * 15;
  date.setMinutes(rounded);
  if (date.getHours() >= 19) {
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
  }
  return date;
}

function emptyForm(siteId = ''): AppointmentFormState {
  const next = nextRoundedTime();
  return {
    siteId,
    clientId: '',
    serviceId: '',
    staffId: '',
    date: dateToInput(next),
    time: timeToInput(next),
    status: 'confirmed',
    notes: ''
  };
}

function emptyAvailabilityForm(siteId = '', date = new Date()): AvailabilityBlockFormState {
  return {
    kind: 'block',
    siteId,
    staffId: '',
    startDate: dateToInput(date),
    endDate: dateToInput(date),
    startTime: '09:00',
    endTime: '10:00',
    allDay: false,
    label: ''
  };
}

function overlapsDay(block: AvailabilityBlockRecord, date: Date) {
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);
  return new Date(block.starts_at) < dayEnd && new Date(block.ends_at) > dayStart;
}

const WEEK_SLOT_MINUTES = 30;
const WEEK_GRID_PX_PER_MINUTE = 1.15;

interface WeekAppointmentLayout {
  appointment: AppointmentRecord;
  lane: number;
  laneCount: number;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function minuteOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function timeFromMinutes(totalMinutes: number) {
  const normalized = clamp(Math.round(totalMinutes / 15) * 15, 0, 23 * 60 + 45);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function layoutOverlappingAppointments(rows: AppointmentRecord[]): WeekAppointmentLayout[] {
  const sorted = [...rows].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const result: WeekAppointmentLayout[] = [];
  let group: AppointmentRecord[] = [];
  let groupEnd = 0;

  const flush = () => {
    if (group.length === 0) return;
    const laneEnds: number[] = [];
    const staged: Array<{ appointment: AppointmentRecord; lane: number }> = [];

    group.forEach((appointment) => {
      const start = new Date(appointment.starts_at).getTime();
      const end = new Date(appointment.ends_at).getTime();
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
      if (lane < 0) {
        lane = laneEnds.length;
        laneEnds.push(end);
      } else {
        laneEnds[lane] = end;
      }
      staged.push({ appointment, lane });
    });

    const laneCount = Math.max(1, laneEnds.length);
    staged.forEach((item) => result.push({ ...item, laneCount }));
    group = [];
    groupEnd = 0;
  };

  sorted.forEach((appointment) => {
    const start = new Date(appointment.starts_at).getTime();
    const end = new Date(appointment.ends_at).getTime();
    if (group.length > 0 && start >= groupEnd) flush();
    group.push(appointment);
    groupEnd = Math.max(groupEnd, end);
  });
  flush();
  return result;
}

export function AppointmentsPage() {
  const { organization, sites, activeSite, activeSiteId } = useOrganization();
  const { demoMode } = useAuth();
  const { beautyMode, selectedEnseigne, selectedEnseigneId } = useBeautyEnseigneContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [staffServices, setStaffServices] = useState<StaffServiceRecord[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHourRecord[]>([]);
  const [breaks, setBreaks] = useState<BreakRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [appointmentItems, setAppointmentItems] = useState<AppointmentServiceItemRecord[]>([]);
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlockRecord[]>([]);
  const [form, setForm] = useState<AppointmentFormState>(emptyForm);
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityBlockFormState>(emptyAvailabilityForm);
  const [availabilityFormOpen, setAvailabilityFormOpen] = useState(false);
  const [editingAvailabilityId, setEditingAvailabilityId] = useState<string | null>(null);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityBusyId, setAvailabilityBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [staffFilter, setStaffFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');

  const canEditAppointments = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const canChangeStatus = ['owner', 'admin', 'manager', 'employee'].includes(organization?.role ?? 'viewer');
  const personalView = ['employee', 'viewer'].includes(organization?.role ?? 'viewer');
  const formOpen = canEditAppointments && (searchParams.get('new') === '1' || editingId !== null);
  const beautySites = useMemo(() => {
    if (!beautyMode || !selectedEnseigne) return [];
    const allowed = new Set(selectedEnseigne.sites.map((site) => site.id));
    return sites.filter((site) => allowed.has(site.id));
  }, [beautyMode, selectedEnseigne, sites]);
  const defaultBeautySiteId = activeSiteId && beautySites.some((site) => site.id === activeSiteId)
    ? activeSiteId
    : beautySites.find((site) => site.is_primary)?.id ?? beautySites[0]?.id ?? '';
  const appointmentSites = beautyMode ? beautySites : sites;
  const effectivePlanningSiteId = beautyMode
    ? (activeSiteId && beautySites.some((site) => site.id === activeSiteId)
      ? activeSiteId
      : beautySites.length === 1 ? beautySites[0].id : null)
    : activeSiteId;

  const loadData = useCallback(async () => {
    if (!organization) return;
    const organizationId = organization.id;
    if (beautyMode && !selectedEnseigneId) {
      setClients([]);
      setServices([]);
      setStaff([]);
      setStaffServices([]);
      setWorkingHours([]);
      setBreaks([]);
      setAppointments([]);
      setAppointmentItems([]);
      setAvailabilityBlocks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');

    if (demoMode || !supabase) {
      const read = <T,>(key: string): T[] => {
        const raw = localStorage.getItem(`${key}-${organizationId}`);
        return raw ? JSON.parse(raw) as T[] : [];
      };
      setClients(read<ClientRecord>('ncr-suite-demo-clients').filter((row) => row.status === 'active'));
      setServices(read<ServiceRecord>('ncr-suite-demo-services').filter((row) => row.active));
      setStaff(read<StaffRecord>('ncr-suite-demo-staff').filter((row) => row.active));
      setStaffServices(read<StaffServiceRecord>('ncr-suite-demo-staff-services'));
      setWorkingHours(read<WorkingHourRecord>('ncr-suite-demo-staff-hours'));
      setBreaks(read<BreakRecord>('ncr-suite-demo-staff-breaks'));
      setAppointments(read<AppointmentRecord>('ncr-suite-demo-appointments'));
      setAppointmentItems([]);
      const demoBlocks = read<AvailabilityBlockRecord>('ncr-suite-demo-beauty-blocks');
      setAvailabilityBlocks(beautyMode && selectedEnseigneId ? demoBlocks.filter((row) => row.company_id === selectedEnseigneId && row.active) : []);
      setLoading(false);
      return;
    }

    const rangeStart = new Date();
    rangeStart.setMonth(rangeStart.getMonth() - 3);
    const rangeEnd = new Date();
    rangeEnd.setFullYear(rangeEnd.getFullYear() + 1);

    let clientsQuery = supabase.from('clients').select('id,first_name,last_name,email,phone,status').eq('organization_id', organizationId).eq('status', 'active').order('first_name');
    let servicesQuery = supabase.from('services').select('id,name,duration_minutes,price_cents,active').eq('organization_id', organizationId).eq('active', true).order('name');
    let staffQuery = supabase.from('staff').select('id,display_name,site_id,color,active').eq('organization_id', organizationId).eq('active', true).order('display_name');
    let appointmentsQuery = supabase.from('appointments')
      .select('id,client_id,service_id,staff_id,site_id,starts_at,ends_at,status,notes,amount_cents,source,created_at')
      .eq('organization_id', organizationId)
      .gte('starts_at', rangeStart.toISOString())
      .lt('starts_at', rangeEnd.toISOString())
      .order('starts_at', { ascending: true });
    if (beautyMode && selectedEnseigneId) {
      clientsQuery = clientsQuery.eq('company_id', selectedEnseigneId);
      servicesQuery = servicesQuery.eq('company_id', selectedEnseigneId);
      staffQuery = staffQuery.eq('company_id', selectedEnseigneId);
      appointmentsQuery = appointmentsQuery.eq('company_id', selectedEnseigneId);
    }
    if (organization.plan === 'metier' && effectivePlanningSiteId) {
      staffQuery = staffQuery.eq('site_id', effectivePlanningSiteId);
      appointmentsQuery = appointmentsQuery.eq('site_id', effectivePlanningSiteId);
    }

    const [clientsResult, servicesResult, staffResult, assignmentsResult, hoursResult, breaksResult, appointmentsResult] = await Promise.all([
      clientsQuery,
      servicesQuery,
      staffQuery,
      supabase.from('staff_services').select('staff_id,service_id').eq('organization_id', organizationId),
      supabase.from('staff_working_hours').select('staff_id,weekday,start_time,end_time').eq('organization_id', organizationId),
      supabase.from('staff_breaks').select('staff_id,weekday,start_time,end_time').eq('organization_id', organizationId),
      appointmentsQuery
    ]);

    const appointmentIds = ((appointmentsResult.data ?? []) as AppointmentRecord[]).map((row) => row.id);
    const itemsResult = beautyMode && selectedEnseigneId && appointmentIds.length > 0
      ? await supabase.from('appointment_service_items')
        .select('appointment_id,service_id,position,service_name,duration_minutes,price_cents')
        .eq('organization_id', organizationId)
        .eq('company_id', selectedEnseigneId)
        .in('appointment_id', appointmentIds)
        .order('position', { ascending: true })
      : { data: [], error: null };

    const blocksResult = beautyMode && selectedEnseigneId
      ? await supabase.from('beauty_availability_blocks')
        .select('id,company_id,site_id,staff_id,kind,label,starts_at,ends_at,all_day,active,created_at')
        .eq('organization_id', organizationId)
        .eq('company_id', selectedEnseigneId)
        .eq('active', true)
        .gt('ends_at', rangeStart.toISOString())
        .lt('starts_at', rangeEnd.toISOString())
        .order('starts_at', { ascending: true })
      : { data: [], error: null };

    const firstError = [clientsResult, servicesResult, staffResult, assignmentsResult, hoursResult, breaksResult, appointmentsResult, itemsResult, blocksResult]
      .find((result) => result.error)?.error;

    if (firstError) {
      setError(`Impossible de charger le planning : ${firstError.message}`);
    } else {
      setClients((clientsResult.data ?? []) as ClientRecord[]);
      setServices((servicesResult.data ?? []) as ServiceRecord[]);
      setStaff((staffResult.data ?? []) as StaffRecord[]);
      setStaffServices((assignmentsResult.data ?? []) as StaffServiceRecord[]);
      setWorkingHours((hoursResult.data ?? []) as WorkingHourRecord[]);
      setBreaks((breaksResult.data ?? []) as BreakRecord[]);
      setAppointments((appointmentsResult.data ?? []) as AppointmentRecord[]);
      setAppointmentItems((itemsResult.data ?? []) as AppointmentServiceItemRecord[]);
      setAvailabilityBlocks((blocksResult.data ?? []) as AvailabilityBlockRecord[]);
    }
    setLoading(false);
  }, [organization, demoMode, effectivePlanningSiteId, beautyMode, selectedEnseigneId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const defaultSiteId = beautyMode
      ? defaultBeautySiteId
      : activeSiteId ?? sites.find((site) => site.is_primary)?.id ?? sites[0]?.id ?? '';
    setForm((current) => current.siteId && appointmentSites.some((site) => site.id === current.siteId)
      ? current
      : { ...current, siteId: defaultSiteId, staffId: '' });
  }, [beautyMode, defaultBeautySiteId, activeSiteId, sites, appointmentSites]);

  useEffect(() => {
    if (!beautyMode || !selectedEnseigneId) {
      setAvailabilityFormOpen(false);
      setEditingAvailabilityId(null);
      setAvailabilityBlocks([]);
      return;
    }
    setAvailabilityForm((current) => current.siteId && beautySites.some((site) => site.id === current.siteId)
      ? current
      : emptyAvailabilityForm(defaultBeautySiteId));
  }, [beautyMode, selectedEnseigneId, defaultBeautySiteId, beautySites]);

  const clientById = useMemo(() => new Map(clients.map((row) => [row.id, row])), [clients]);
  const serviceById = useMemo(() => new Map(services.map((row) => [row.id, row])), [services]);
  const staffById = useMemo(() => new Map(staff.map((row) => [row.id, row])), [staff]);
  const appointmentItemsById = useMemo(() => {
    const map = new Map<string, AppointmentServiceItemRecord[]>();
    appointmentItems.forEach((item) => {
      const rows = map.get(item.appointment_id) ?? [];
      rows.push(item);
      map.set(item.appointment_id, rows);
    });
    map.forEach((rows) => rows.sort((a, b) => a.position - b.position));
    return map;
  }, [appointmentItems]);

  function appointmentServiceLabel(appointment: AppointmentRecord) {
    const items = appointmentItemsById.get(appointment.id) ?? [];
    if (items.length > 0) return items.map((item) => item.service_name).join(' + ');
    return serviceById.get(appointment.service_id)?.name ?? 'Prestation inconnue';
  }

  function appointmentDurationMinutes(appointment: AppointmentRecord) {
    return Math.max(1, Math.round((new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60000));
  }

  const compatibleStaff = useMemo(() => {
    if (!form.serviceId) return staff;
    const allowed = new Set(staffServices.filter((row) => row.service_id === form.serviceId).map((row) => row.staff_id));
    return staff.filter((row) => allowed.has(row.id) && (!form.siteId || row.site_id === form.siteId));
  }, [staff, staffServices, form.serviceId, form.siteId]);

  useEffect(() => {
    if (form.staffId && !compatibleStaff.some((row) => row.id === form.staffId)) {
      setForm((current) => ({ ...current, staffId: '' }));
    }
  }, [compatibleStaff, form.staffId]);

  const visibleAppointments = useMemo(() => appointments.filter((appointment) => {
    const staffMatches = staffFilter === 'all' || appointment.staff_id === staffFilter;
    const statusMatches = statusFilter === 'all' || appointment.status === statusFilter;
    return staffMatches && statusMatches;
  }), [appointments, staffFilter, statusFilter]);

  const availabilityStaff = useMemo(() => {
    const allowedSites = new Set(beautySites.map((site) => site.id));
    return staff.filter((member) => allowedSites.has(member.site_id ?? '') && (!availabilityForm.siteId || member.site_id === availabilityForm.siteId));
  }, [staff, beautySites, availabilityForm.siteId]);

  const visibleAvailabilityBlocks = useMemo(() => availabilityBlocks.filter((block) => {
    if (effectivePlanningSiteId && block.site_id !== effectivePlanningSiteId) return false;
    if (staffFilter === 'all') return true;
    return block.staff_id === null || block.staff_id === staffFilter;
  }), [availabilityBlocks, effectivePlanningSiteId, staffFilter]);

  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const visibleStaff = useMemo(() => staff.filter((member) => staffFilter === 'all' || member.id === staffFilter), [staff, staffFilter]);
  const selectedDayAppointments = useMemo(
    () => visibleAppointments.filter((row) => sameDay(new Date(row.starts_at), selectedDate)).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [visibleAppointments, selectedDate]
  );
  const selectedDayAvailabilityBlocks = useMemo(
    () => visibleAvailabilityBlocks.filter((block) => overlapsDay(block, selectedDate)).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [visibleAvailabilityBlocks, selectedDate]
  );

  const weekPlannerBounds = useMemo(() => {
    const relevantStaffIds = new Set(visibleStaff.map((member) => member.id));
    const hourStarts = workingHours
      .filter((row) => relevantStaffIds.has(row.staff_id))
      .map((row) => minutesFromTime(row.start_time));
    const hourEnds = workingHours
      .filter((row) => relevantStaffIds.has(row.staff_id))
      .map((row) => minutesFromTime(row.end_time));
    const weekEnd = addDays(weekStart, 7);
    const appointmentStarts = visibleAppointments
      .filter((row) => {
        const start = new Date(row.starts_at);
        return start >= weekStart && start < weekEnd;
      })
      .map((row) => minuteOfDay(new Date(row.starts_at)));
    const appointmentEnds = visibleAppointments
      .filter((row) => {
        const start = new Date(row.starts_at);
        return start >= weekStart && start < weekEnd;
      })
      .map((row) => minuteOfDay(new Date(row.ends_at)));

    const rawStart = Math.min(8 * 60, ...(hourStarts.length ? hourStarts : [8 * 60]), ...(appointmentStarts.length ? appointmentStarts : [8 * 60]));
    const rawEnd = Math.max(20 * 60, ...(hourEnds.length ? hourEnds : [20 * 60]), ...(appointmentEnds.length ? appointmentEnds : [20 * 60]));
    const startMinute = clamp(Math.floor(rawStart / 60) * 60, 5 * 60, 12 * 60);
    const endMinute = clamp(Math.ceil(rawEnd / 60) * 60, 14 * 60, 24 * 60);
    return { startMinute, endMinute };
  }, [visibleStaff, workingHours, visibleAppointments, weekStart]);

  const weekPlannerSlots = useMemo(() => {
    const slots: number[] = [];
    for (let minute = weekPlannerBounds.startMinute; minute < weekPlannerBounds.endMinute; minute += WEEK_SLOT_MINUTES) {
      slots.push(minute);
    }
    return slots;
  }, [weekPlannerBounds]);

  const weekPlannerHeight = (weekPlannerBounds.endMinute - weekPlannerBounds.startMinute) * WEEK_GRID_PX_PER_MINUTE;

  const todayAppointments = appointments.filter((row) => row.status !== 'cancelled' && sameDay(new Date(row.starts_at), new Date()));
  const weekAppointments = appointments.filter((row) => {
    const start = new Date(row.starts_at);
    return row.status !== 'cancelled' && start >= weekStart && start < addDays(weekStart, 7);
  });
  const pendingCount = appointments.filter((row) => row.status === 'pending').length;
  const weekAmount = weekAppointments.reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);

  function openCreateForm(date?: Date, time?: string, staffId?: string) {
    if (!canEditAppointments) return;
    setAvailabilityFormOpen(false);
    setEditingAvailabilityId(null);
    const base = emptyForm(beautyMode ? defaultBeautySiteId : activeSiteId ?? sites.find((site) => site.is_primary)?.id ?? sites[0]?.id ?? '');
    if (date) base.date = dateToInput(date);
    if (time) base.time = time;
    if (staffId && staff.some((member) => member.id === staffId)) base.staffId = staffId;
    setEditingId(null);
    setForm(base);
    setError('');
    setSuccess('');
    setSearchParams({ new: '1' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openEditForm(appointment: AppointmentRecord) {
    if (!canEditAppointments || appointment.status === 'cancelled') return;
    if ((appointmentItemsById.get(appointment.id)?.length ?? 0) > 1) {
      setError('Ce rendez-vous contient plusieurs prestations. Sa composition est protégée depuis l’Agenda ; vous pouvez modifier son statut ou le déplacer depuis le lien client.');
      setSelectedDate(startOfDay(new Date(appointment.starts_at)));
      setViewMode('day');
      return;
    }
    const start = new Date(appointment.starts_at);
    setForm({
      siteId: appointment.site_id ?? (beautyMode ? defaultBeautySiteId : activeSiteId ?? sites.find((site) => site.is_primary)?.id ?? ''),
      clientId: appointment.client_id,
      serviceId: appointment.service_id,
      staffId: appointment.staff_id,
      date: dateToInput(start),
      time: timeToInput(start),
      status: appointment.status === 'pending' ? 'pending' : 'confirmed',
      notes: appointment.notes ?? ''
    });
    setEditingId(appointment.id);
    setSearchParams({});
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeForm() {
    setEditingId(null);
    setForm(emptyForm(beautyMode ? defaultBeautySiteId : activeSiteId ?? sites.find((site) => site.is_primary)?.id ?? sites[0]?.id ?? ''));
    setError('');
    setSearchParams({});
  }

  function openAvailabilityForm(date = selectedDate, staffId = '') {
    if (!beautyMode || !selectedEnseigneId || !canEditAppointments || !defaultBeautySiteId) return;
    setEditingId(null);
    setSearchParams({});
    const member = staff.find((row) => row.id === staffId);
    const siteId = member?.site_id && beautySites.some((site) => site.id === member.site_id) ? member.site_id : defaultBeautySiteId;
    const next = emptyAvailabilityForm(siteId, date);
    next.staffId = staffId;
    setAvailabilityForm(next);
    setEditingAvailabilityId(null);
    setAvailabilityFormOpen(true);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openEditAvailability(block: AvailabilityBlockRecord) {
    if (!canEditAppointments) return;
    const start = new Date(block.starts_at);
    const end = new Date(block.ends_at);
    const endDate = block.all_day ? dateToInput(addDays(end, -1)) : dateToInput(end);
    setAvailabilityForm({
      kind: block.kind,
      siteId: block.site_id,
      staffId: block.staff_id ?? '',
      startDate: dateToInput(start),
      endDate,
      startTime: timeToInput(start),
      endTime: timeToInput(end),
      allDay: block.all_day,
      label: block.label ?? ''
    });
    setEditingAvailabilityId(block.id);
    setAvailabilityFormOpen(true);
    setEditingId(null);
    setSearchParams({});
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeAvailabilityForm() {
    setEditingAvailabilityId(null);
    setAvailabilityFormOpen(false);
    setAvailabilityForm(emptyAvailabilityForm(defaultBeautySiteId, selectedDate));
    setError('');
  }

  async function saveAvailabilityBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !beautyMode || !selectedEnseigneId || !canEditAppointments) return;
    if (!availabilityForm.siteId || !beautySites.some((site) => site.id === availabilityForm.siteId)) {
      setError('Sélectionnez un lieu appartenant à cette enseigne.');
      return;
    }
    if (availabilityForm.kind === 'leave' && !availabilityForm.staffId) {
      setError('Sélectionnez le collaborateur concerné par ce congé.');
      return;
    }
    if (availabilityForm.staffId && !availabilityStaff.some((member) => member.id === availabilityForm.staffId)) {
      setError('Ce collaborateur n’appartient pas au lieu sélectionné.');
      return;
    }
    if (!availabilityForm.startDate || !availabilityForm.endDate) {
      setError('Renseignez la période à bloquer.');
      return;
    }

    const startLocal = availabilityForm.allDay
      ? `${availabilityForm.startDate}T00:00:00`
      : `${availabilityForm.startDate}T${availabilityForm.startTime}:00`;
    const endDateExclusive = availabilityForm.allDay
      ? dateToInput(addDays(new Date(`${availabilityForm.endDate}T12:00:00`), 1))
      : availabilityForm.endDate;
    const endLocal = availabilityForm.allDay
      ? `${endDateExclusive}T00:00:00`
      : `${endDateExclusive}T${availabilityForm.endTime}:00`;

    if (new Date(endLocal).getTime() <= new Date(startLocal).getTime()) {
      setError('La fin de l’indisponibilité doit être après son début.');
      return;
    }

    setAvailabilitySaving(true);
    setError('');
    setSuccess('');
    try {
      if (demoMode || !supabase) {
        const existing = availabilityBlocks.find((row) => row.id === editingAvailabilityId);
        const saved: AvailabilityBlockRecord = {
          id: existing?.id ?? crypto.randomUUID(),
          company_id: selectedEnseigneId,
          site_id: availabilityForm.siteId,
          staff_id: availabilityForm.staffId || null,
          kind: availabilityForm.kind,
          label: availabilityForm.label.trim() || null,
          starts_at: new Date(startLocal).toISOString(),
          ends_at: new Date(endLocal).toISOString(),
          all_day: availabilityForm.allDay,
          active: true,
          created_at: existing?.created_at ?? new Date().toISOString()
        };
        const allRaw = localStorage.getItem(`ncr-suite-demo-beauty-blocks-${organization.id}`);
        const allRows = allRaw ? JSON.parse(allRaw) as AvailabilityBlockRecord[] : [];
        const nextAll = existing ? allRows.map((row) => row.id === saved.id ? saved : row) : [...allRows, saved];
        localStorage.setItem(`ncr-suite-demo-beauty-blocks-${organization.id}`, JSON.stringify(nextAll));
        setAvailabilityBlocks(nextAll.filter((row) => row.company_id === selectedEnseigneId && row.active));
      } else {
        const { error: saveError } = await supabase.rpc('save_beauty_availability_block', {
          p_organization_id: organization.id,
          p_company_id: selectedEnseigneId,
          p_site_id: availabilityForm.siteId,
          p_staff_id: availabilityForm.staffId || null,
          p_kind: availabilityForm.kind,
          p_label: availabilityForm.label,
          p_starts_local: startLocal,
          p_ends_local: endLocal,
          p_all_day: availabilityForm.allDay,
          p_block_id: editingAvailabilityId
        });
        if (saveError) throw saveError;
        await loadData();
      }
      setSelectedDate(startOfDay(new Date(startLocal)));
      setSuccess(editingAvailabilityId ? 'L’indisponibilité a bien été modifiée.' : 'L’indisponibilité a bien été ajoutée au planning.');
      setEditingAvailabilityId(null);
      setAvailabilityFormOpen(false);
      setAvailabilityForm(emptyAvailabilityForm(defaultBeautySiteId));
    } catch (caught) {
      const message = typeof caught === 'object' && caught && 'message' in caught ? String(caught.message) : 'Une erreur inconnue est survenue.';
      setError(`Enregistrement impossible : ${message}`);
    } finally {
      setAvailabilitySaving(false);
    }
  }

  async function removeAvailabilityBlock(block: AvailabilityBlockRecord) {
    if (!organization || !selectedEnseigneId || !canEditAppointments) return;
    if (!window.confirm(`Supprimer « ${block.label || availabilityKindLabels[block.kind]} » du planning ?`)) return;
    setAvailabilityBusyId(block.id);
    setError('');
    setSuccess('');
    try {
      if (demoMode || !supabase) {
        const raw = localStorage.getItem(`ncr-suite-demo-beauty-blocks-${organization.id}`);
        const allRows = raw ? JSON.parse(raw) as AvailabilityBlockRecord[] : [];
        const nextAll = allRows.map((row) => row.id === block.id ? { ...row, active: false } : row);
        localStorage.setItem(`ncr-suite-demo-beauty-blocks-${organization.id}`, JSON.stringify(nextAll));
        setAvailabilityBlocks(nextAll.filter((row) => row.company_id === selectedEnseigneId && row.active));
      } else {
        const { error: removeError } = await supabase.rpc('set_beauty_availability_block_active', {
          p_organization_id: organization.id,
          p_company_id: selectedEnseigneId,
          p_block_id: block.id,
          p_active: false
        });
        if (removeError) throw removeError;
        await loadData();
      }
      if (editingAvailabilityId === block.id) closeAvailabilityForm();
      setSuccess('L’indisponibilité a été retirée du planning.');
    } catch (caught) {
      const message = typeof caught === 'object' && caught && 'message' in caught ? String(caught.message) : 'Une erreur inconnue est survenue.';
      setError(`Suppression impossible : ${message}`);
    } finally {
      setAvailabilityBusyId(null);
    }
  }

  function localAvailabilityError() {
    const service = serviceById.get(form.serviceId);
    const member = staffById.get(form.staffId);
    if (!service || !member) return 'Sélectionnez une prestation et un collaborateur.';

    const start = new Date(`${form.date}T${form.time}:00`);
    if (Number.isNaN(start.getTime())) return 'La date ou l’heure est invalide.';
    const end = new Date(start.getTime() + service.duration_minutes * 60_000);
    const weekday = (start.getDay() + 6) % 7;
    const hours = workingHours.find((row) => row.staff_id === member.id && row.weekday === weekday);
    if (!hours) return `${member.display_name} ne travaille pas ce jour-là.`;

    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    if (start.toDateString() !== end.toDateString()) return 'Le rendez-vous ne peut pas se terminer le lendemain.';
    if (startMinutes < minutesFromTime(hours.start_time) || endMinutes > minutesFromTime(hours.end_time)) {
      return `Le créneau doit être compris entre ${hours.start_time.slice(0, 5)} et ${hours.end_time.slice(0, 5)}.`;
    }

    const overlapsBreak = breaks.some((row) => row.staff_id === member.id
      && row.weekday === weekday
      && startMinutes < minutesFromTime(row.end_time)
      && endMinutes > minutesFromTime(row.start_time));
    if (overlapsBreak) return 'Le créneau chevauche une pause du collaborateur.';

    const overlapsAppointment = appointments.some((row) => row.id !== editingId
      && row.staff_id === member.id
      && row.status !== 'cancelled'
      && start < new Date(row.ends_at)
      && end > new Date(row.starts_at));
    if (overlapsAppointment) return 'Ce créneau est déjà occupé pour ce collaborateur.';

    const overlapsBlockedTime = beautyMode && availabilityBlocks.some((block) => block.active
      && block.site_id === form.siteId
      && (block.staff_id === null || block.staff_id === member.id)
      && start < new Date(block.ends_at)
      && end > new Date(block.starts_at));
    if (overlapsBlockedTime) return 'Ce créneau est bloqué par une fermeture, un congé ou une indisponibilité.';
    return '';
  }

  async function saveAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !canEditAppointments) return;
    if (organization.plan === 'metier' && !form.siteId) {
      setError('Sélectionnez un établissement.');
      return;
    }
    if (!form.clientId || !form.serviceId || !form.staffId || !form.date || !form.time) {
      setError('Tous les champs obligatoires doivent être renseignés.');
      return;
    }

    const availabilityError = localAvailabilityError();
    if (availabilityError) {
      setError(availabilityError);
      return;
    }

    const startsAt = new Date(`${form.date}T${form.time}:00`);
    const service = serviceById.get(form.serviceId)!;
    const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60_000);
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (demoMode || !supabase) {
        const existing = appointments.find((row) => row.id === editingId);
        const saved: AppointmentRecord = {
          id: existing?.id ?? crypto.randomUUID(),
          client_id: form.clientId,
          service_id: form.serviceId,
          staff_id: form.staffId,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          status: form.status,
          notes: form.notes.trim() || null,
          amount_cents: service.price_cents,
          source: existing?.source ?? 'internal',
          created_at: existing?.created_at ?? new Date().toISOString(),
          site_id: organization.plan === 'metier' ? form.siteId || null : null
        };
        const next = existing
          ? appointments.map((row) => row.id === saved.id ? saved : row)
          : [...appointments, saved].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
        localStorage.setItem(`ncr-suite-demo-appointments-${organization.id}`, JSON.stringify(next));
        setAppointments(next);
      } else {
        const { error: saveError } = await supabase.rpc(organization.plan === 'metier' ? 'save_appointment_v2' : 'save_appointment', {
          p_organization_id: organization.id,
          p_appointment_id: editingId,
          ...(organization.plan === 'metier' ? { p_site_id: form.siteId } : {}),
          p_client_id: form.clientId,
          p_service_id: form.serviceId,
          p_staff_id: form.staffId,
          p_starts_at: startsAt.toISOString(),
          p_status: form.status,
          p_notes: form.notes
        });
        if (saveError) throw saveError;
        await loadData();
      }

      setSelectedDate(startOfDay(startsAt));
      setSuccess(editingId ? 'Le rendez-vous a bien été modifié.' : 'Le rendez-vous a bien été créé.');
      setEditingId(null);
      setForm(emptyForm(beautyMode ? defaultBeautySiteId : activeSiteId ?? sites.find((site) => site.is_primary)?.id ?? sites[0]?.id ?? ''));
      setSearchParams({});
    } catch (caught) {
      const message = typeof caught === 'object' && caught && 'message' in caught ? String(caught.message) : 'Une erreur inconnue est survenue.';
      setError(`Enregistrement impossible : ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(appointment: AppointmentRecord, status: AppointmentStatus) {
    if (!organization || !canChangeStatus || appointment.status === status) return;
    let reason: string | null = null;
    if (status === 'cancelled') {
      reason = window.prompt('Motif d’annulation (facultatif) :')?.trim() || null;
      if (!window.confirm('Confirmer l’annulation de ce rendez-vous ?')) return;
    }

    setBusyId(appointment.id);
    setError('');
    setSuccess('');
    try {
      if (demoMode || !supabase) {
        const next = appointments.map((row) => row.id === appointment.id ? { ...row, status } : row);
        localStorage.setItem(`ncr-suite-demo-appointments-${organization.id}`, JSON.stringify(next));
        setAppointments(next);
      } else {
        const { error: statusError } = await supabase.rpc('set_appointment_status', {
          p_organization_id: organization.id,
          p_appointment_id: appointment.id,
          p_status: status,
          p_cancellation_reason: reason
        });
        if (statusError) throw statusError;
        await loadData();
      }
      setSuccess(`Le rendez-vous est maintenant « ${statusLabels[status]} ».`);
    } catch (caught) {
      const message = typeof caught === 'object' && caught && 'message' in caught ? String(caught.message) : 'Une erreur inconnue est survenue.';
      setError(`Mise à jour impossible : ${message}`);
    } finally {
      setBusyId(null);
    }
  }

  function movePeriod(direction: number) {
    setSelectedDate((current) => addDays(current, direction * (viewMode === 'week' ? 7 : 1)));
  }

  function weekSlotState(day: Date, slotStartMinute: number) {
    const slotEndMinute = slotStartMinute + WEEK_SLOT_MINUTES;
    const weekday = (day.getDay() + 6) % 7;
    const relevantStaff = visibleStaff.filter((member) => {
      if (effectivePlanningSiteId && member.site_id !== effectivePlanningSiteId) return false;
      return workingHours.some((row) => row.staff_id === member.id
        && row.weekday === weekday
        && slotStartMinute >= minutesFromTime(row.start_time)
        && slotEndMinute <= minutesFromTime(row.end_time));
    });

    if (relevantStaff.length === 0) return 'closed';

    const slotStart = new Date(day);
    slotStart.setHours(Math.floor(slotStartMinute / 60), slotStartMinute % 60, 0, 0);
    const slotEnd = new Date(day);
    slotEnd.setHours(Math.floor(slotEndMinute / 60), slotEndMinute % 60, 0, 0);

    let blockedCount = 0;
    let busyCount = 0;
    let freeCount = 0;

    relevantStaff.forEach((member) => {
      const onBreak = breaks.some((row) => row.staff_id === member.id
        && row.weekday === weekday
        && slotStartMinute < minutesFromTime(row.end_time)
        && slotEndMinute > minutesFromTime(row.start_time));
      const unavailable = visibleAvailabilityBlocks.some((block) => block.site_id === member.site_id
        && (block.staff_id === null || block.staff_id === member.id)
        && slotStart < new Date(block.ends_at)
        && slotEnd > new Date(block.starts_at));
      const occupied = visibleAppointments.some((appointment) => appointment.staff_id === member.id
        && appointment.status !== 'cancelled'
        && slotStart < new Date(appointment.ends_at)
        && slotEnd > new Date(appointment.starts_at));

      if (onBreak || unavailable) blockedCount += 1;
      else if (occupied) busyCount += 1;
      else freeCount += 1;
    });

    if (freeCount > 0) return 'free';
    if (busyCount > 0) return 'busy';
    if (blockedCount > 0) return 'blocked';
    return 'closed';
  }

  function handleWeekDayClick(day: Date, event: ReactMouseEvent<HTMLDivElement>) {
    if (!canEditAppointments) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeY = clamp(event.clientY - rect.top, 0, rect.height);
    const minute = weekPlannerBounds.startMinute + relativeY / WEEK_GRID_PX_PER_MINUTE;
    openCreateForm(day, timeFromMinutes(minute), staffFilter === 'all' ? undefined : staffFilter);
  }

  function availabilityBlockCard(block: AvailabilityBlockRecord) {
    const member = block.staff_id ? staffById.get(block.staff_id) : null;
    const site = sites.find((item) => item.id === block.site_id);
    const start = new Date(block.starts_at);
    const end = new Date(block.ends_at);
    const period = block.all_day
      ? 'Toute la journée'
      : `${timeFormatter.format(start)} — ${timeFormatter.format(end)}`;
    return (
      <article key={block.id} className={`availability-day-card kind-${block.kind}`}>
        <span className="availability-day-icon"><Icon name={block.kind === 'leave' ? 'users' : block.kind === 'closure' ? 'building' : 'lock'} size={17} /></span>
        <div>
          <div className="availability-day-title"><strong>{block.label || availabilityKindLabels[block.kind]}</strong><span>{availabilityKindLabels[block.kind]}</span></div>
          <p>{period}{member ? ` · ${member.display_name}` : ' · Tout le lieu'}{site ? ` · ${site.name}` : ''}</p>
        </div>
        {canEditAppointments && <div className="availability-day-actions"><button type="button" onClick={() => openEditAvailability(block)}>Modifier</button><button type="button" disabled={availabilityBusyId === block.id} onClick={() => void removeAvailabilityBlock(block)}>{availabilityBusyId === block.id ? 'Retrait…' : 'Retirer'}</button></div>}
      </article>
    );
  }

  function appointmentCard(appointment: AppointmentRecord) {
    const client = clientById.get(appointment.client_id);
    const service = serviceById.get(appointment.service_id);
    const items = appointmentItemsById.get(appointment.id) ?? [];
    const member = staffById.get(appointment.staff_id);
    return (
      <article key={appointment.id} className={`appointment-card status-${appointment.status}`} style={{ '--staff-color': member?.color ?? '#0a84ff' } as CSSProperties}>
        <div className="appointment-time">
          <strong>{timeFormatter.format(new Date(appointment.starts_at))}</strong>
          <span>{timeFormatter.format(new Date(appointment.ends_at))}</span>
        </div>
        <div className="appointment-main">
          <div className="appointment-title-row">
            <h3>{fullClientName(client)}</h3>
            <span className={`status-chip appointment-status ${appointment.status}`}>{statusLabels[appointment.status]}</span>
          </div>
          <p>{appointmentServiceLabel(appointment)} · {member?.display_name ?? 'Collaborateur inconnu'}{organization?.plan === 'metier' ? ` · ${sites.find((site) => site.id === appointment.site_id)?.name ?? 'Site non attribué'}` : ''}</p>
          <small>{appointmentDurationMinutes(appointment)} min · {currencyFormatter.format((appointment.amount_cents ?? service?.price_cents ?? 0) / 100)}{items.length > 1 ? ` · ${items.length} prestations` : ''}</small>
          {appointment.notes && <em>{appointment.notes}</em>}
        </div>
        {canChangeStatus && (
          <div className="appointment-actions">
            {canEditAppointments && appointment.status !== 'cancelled' && appointment.status !== 'completed' && items.length <= 1 && (
              <button type="button" className="secondary-button compact-button" onClick={() => openEditForm(appointment)}>Modifier</button>
            )}
            {items.length > 1 && <span className="appointment-multi-badge">Multi-prestations</span>}
            <select
              aria-label={`Changer le statut du rendez-vous de ${fullClientName(client)}`}
              value={appointment.status}
              disabled={busyId === appointment.id}
              onChange={(event) => changeStatus(appointment, event.target.value as AppointmentStatus)}
            >
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmé</option>
              <option value="completed">Terminé</option>
              <option value="no_show">Absent</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
        )}
      </article>
    );
  }

  return (
    <div className="page appointments-page appointments-planning-premium">
      <header className="page-header appointment-planning-hero">
        <div>
          <p className="eyebrow">PLANNING</p>
          <h1>Rendez-vous</h1>
          <p>{personalView ? 'Consultez les rendez-vous qui vous sont attribués et mettez leur statut à jour.' : `Planifiez l’activité ${activeSite ? `de ${activeSite.name}` : 'de tous les établissements'} sans double réservation.`}</p>
        </div>
        {canEditAppointments && <div className="appointment-planning-actions">{beautyMode && selectedEnseigneId && <button className="secondary-button" type="button" onClick={() => openAvailabilityForm()}><Icon name="lock" size={17} />Bloquer du temps</button>}<button className="primary-button" type="button" onClick={() => openCreateForm()}><Icon name="calendar" size={18} />Nouveau rendez-vous</button></div>}
      </header>

      {beautyMode && availabilityFormOpen && canEditAppointments && selectedEnseigneId && (
        <section className="panel beauty-availability-panel">
          <div className="panel-header">
            <div><p className="eyebrow">DISPONIBILITÉS · {selectedEnseigne?.name}</p><h2>{editingAvailabilityId ? 'Modifier l’indisponibilité' : 'Bloquer du temps'}</h2><small>Ces périodes disparaissent automatiquement de la réservation en ligne.</small></div>
            <button type="button" className="secondary-button" onClick={closeAvailabilityForm}>Fermer</button>
          </div>
          <form className="beauty-availability-form" onSubmit={saveAvailabilityBlock}>
            <div className="beauty-availability-kind-grid">
              {(Object.keys(availabilityKindLabels) as AvailabilityBlockKind[]).map((kind) => <button type="button" key={kind} className={availabilityForm.kind === kind ? 'active' : ''} onClick={() => setAvailabilityForm((current) => ({ ...current, kind, staffId: kind === 'closure' ? '' : current.staffId }))}><span><Icon name={kind === 'leave' ? 'users' : kind === 'closure' ? 'building' : 'lock'} size={18} /></span><strong>{availabilityKindLabels[kind]}</strong><small>{availabilityKindDescriptions[kind]}</small></button>)}
            </div>
            <div className="beauty-availability-fields">
              <label>Lieu <span aria-hidden="true">*</span><select value={availabilityForm.siteId} onChange={(event) => setAvailabilityForm((current) => ({ ...current, siteId: event.target.value, staffId: '' }))} required><option value="">Sélectionner un lieu</option>{beautySites.map((site) => <option key={site.id} value={site.id}>{site.name}{site.is_primary ? ' · Principal' : ''}</option>)}</select></label>
              {availabilityForm.kind !== 'closure' && <label>Collaborateur {availabilityForm.kind === 'leave' && <span aria-hidden="true">*</span>}<select value={availabilityForm.staffId} onChange={(event) => setAvailabilityForm((current) => ({ ...current, staffId: event.target.value }))} required={availabilityForm.kind === 'leave'}><option value="">{availabilityForm.kind === 'leave' ? 'Sélectionner un collaborateur' : 'Tout le lieu'}</option>{availabilityStaff.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select></label>}
              <label>Du <span aria-hidden="true">*</span><input type="date" value={availabilityForm.startDate} onChange={(event) => setAvailabilityForm((current) => ({ ...current, startDate: event.target.value, endDate: current.endDate < event.target.value ? event.target.value : current.endDate }))} required /></label>
              <label>Au <span aria-hidden="true">*</span><input type="date" min={availabilityForm.startDate} value={availabilityForm.endDate} onChange={(event) => setAvailabilityForm((current) => ({ ...current, endDate: event.target.value }))} required /></label>
              {!availabilityForm.allDay && <><label>Début <span aria-hidden="true">*</span><input type="time" step="900" value={availabilityForm.startTime} onChange={(event) => setAvailabilityForm((current) => ({ ...current, startTime: event.target.value }))} required /></label><label>Fin <span aria-hidden="true">*</span><input type="time" step="900" value={availabilityForm.endTime} onChange={(event) => setAvailabilityForm((current) => ({ ...current, endTime: event.target.value }))} required /></label></>}
              <label className="beauty-availability-all-day"><input type="checkbox" checked={availabilityForm.allDay} onChange={(event) => setAvailabilityForm((current) => ({ ...current, allDay: event.target.checked }))} /><span><strong>Journée entière</strong><small>NCR bloque automatiquement la journée complète, même si les horaires changent.</small></span></label>
              <label className="beauty-availability-label">Motif / libellé<input maxLength={160} value={availabilityForm.label} onChange={(event) => setAvailabilityForm((current) => ({ ...current, label: event.target.value }))} placeholder={availabilityForm.kind === 'leave' ? 'Ex. Congés annuels' : availabilityForm.kind === 'closure' ? 'Ex. Fermeture exceptionnelle' : 'Ex. Formation, pause exceptionnelle…'} /></label>
            </div>
            <div className="form-actions beauty-availability-actions"><button className="secondary-button" type="button" onClick={closeAvailabilityForm}>Annuler</button><button className="primary-button" type="submit" disabled={availabilitySaving}>{availabilitySaving ? 'Enregistrement…' : editingAvailabilityId ? 'Enregistrer' : 'Bloquer cette période'}</button></div>
          </form>
        </section>
      )}

      {formOpen && (
        <section className="panel appointment-form-panel">
          <div className="panel-header">
            <div><p className="eyebrow">{editingId ? 'MODIFICATION' : 'NOUVEAU'}</p><h2>{editingId ? 'Modifier le rendez-vous' : 'Créer un rendez-vous'}</h2></div>
            <button type="button" className="secondary-button" onClick={closeForm}>Fermer</button>
          </div>
          <form className="appointment-form" onSubmit={saveAppointment}>
            {organization?.plan === 'metier' && (
              <label>
                Établissement <span aria-hidden="true">*</span>
                <select value={form.siteId} onChange={(event) => setForm((current) => ({ ...current, siteId: event.target.value, staffId: '' }))} required disabled={beautyMode ? appointmentSites.length === 1 : Boolean(activeSiteId)}>
                  <option value="">Sélectionner un établissement</option>
                  {appointmentSites.map((site) => <option key={site.id} value={site.id}>{site.name}{site.is_primary ? ' · Principal' : ''}</option>)}
                </select>
              </label>
            )}
            <label>
              Client <span aria-hidden="true">*</span>
              <select value={form.clientId} onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))} required>
                <option value="">Sélectionner un client</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{fullClientName(client)}{client.phone ? ` · ${client.phone}` : ''}</option>)}
              </select>
            </label>
            <label>
              Prestation <span aria-hidden="true">*</span>
              <select value={form.serviceId} onChange={(event) => setForm((current) => ({ ...current, serviceId: event.target.value }))} required>
                <option value="">Sélectionner une prestation</option>
                {services.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.duration_minutes} min · {currencyFormatter.format(service.price_cents / 100)}</option>)}
              </select>
            </label>
            <label>
              Collaborateur <span aria-hidden="true">*</span>
              <select value={form.staffId} onChange={(event) => setForm((current) => ({ ...current, staffId: event.target.value }))} required disabled={!form.serviceId}>
                <option value="">{form.serviceId ? 'Sélectionner un collaborateur' : 'Choisissez d’abord une prestation'}</option>
                {compatibleStaff.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}
              </select>
            </label>
            <label>
              Statut initial
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AppointmentFormState['status'] }))}>
                <option value="confirmed">Confirmé</option>
                <option value="pending">En attente</option>
              </select>
            </label>
            <label>
              Date <span aria-hidden="true">*</span>
              <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} required />
            </label>
            <label>
              Heure <span aria-hidden="true">*</span>
              <input type="time" step="900" value={form.time} onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))} required />
            </label>
            <div className="appointment-preview">
              <span>Durée et tarif</span>
              <strong>{form.serviceId ? `${serviceById.get(form.serviceId)?.duration_minutes ?? 0} min · ${currencyFormatter.format((serviceById.get(form.serviceId)?.price_cents ?? 0) / 100)}` : 'À définir'}</strong>
            </div>
            <label className="appointment-notes-field">
              Notes internes
              <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} placeholder="Préférence, information utile, consigne…" />
            </label>
            <div className="form-actions appointment-form-actions">
              <button className="secondary-button" type="button" onClick={closeForm}>Annuler</button>
              <button className="primary-button" type="submit" disabled={saving || clients.length === 0 || services.length === 0 || staff.length === 0}>
                {saving ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Créer le rendez-vous'}
              </button>
            </div>
          </form>
          {(clients.length === 0 || services.length === 0 || staff.length === 0) && (
            <div className="inline-empty-state appointment-prerequisite">
              Pour créer un rendez-vous, il faut au moins un client actif, une prestation active et un collaborateur configuré.
            </div>
          )}
        </section>
      )}

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      <section className="appointment-summary-grid" aria-label="Résumé des rendez-vous">
        <article className="panel appointment-summary-card"><span>Aujourd’hui</span><strong>{todayAppointments.length}</strong><small>rendez-vous non annulé{todayAppointments.length > 1 ? 's' : ''}</small></article>
        <article className="panel appointment-summary-card"><span>Semaine affichée</span><strong>{weekAppointments.length}</strong><small>rendez-vous planifié{weekAppointments.length > 1 ? 's' : ''}</small></article>
        <article className="panel appointment-summary-card"><span>À confirmer</span><strong>{pendingCount}</strong><small>demande{pendingCount > 1 ? 's' : ''} en attente</small></article>
        <article className="panel appointment-summary-card"><span>Prévision semaine</span><strong>{currencyFormatter.format(weekAmount / 100)}</strong><small>hors rendez-vous annulés</small></article>
      </section>

      <section className="panel planner-panel">
        <div className="planner-toolbar">
          <div className="planner-period-controls">
            <button type="button" className="icon-nav-button" onClick={() => movePeriod(-1)} aria-label="Période précédente">‹</button>
            <button type="button" className="secondary-button" onClick={() => setSelectedDate(startOfDay(new Date()))}>Aujourd’hui</button>
            <button type="button" className="icon-nav-button" onClick={() => movePeriod(1)} aria-label="Période suivante">›</button>
            <div>
              <p className="eyebrow">{viewMode === 'week' ? 'SEMAINE' : 'JOURNÉE'}</p>
              <h2>{viewMode === 'week' ? `${shortDateFormatter.format(weekStart)} — ${shortDateFormatter.format(addDays(weekStart, 6))}` : fullDateFormatter.format(selectedDate)}</h2>
            </div>
          </div>
          <div className="planner-filters">
            <div className="segmented-control" role="group" aria-label="Affichage du planning">
              <button type="button" className={viewMode === 'week' ? 'active' : ''} onClick={() => setViewMode('week')}>Semaine</button>
              <button type="button" className={viewMode === 'day' ? 'active' : ''} onClick={() => setViewMode('day')}>Jour</button>
            </div>
            <select value={staffFilter} onChange={(event) => setStaffFilter(event.target.value)} aria-label="Filtrer par collaborateur">
              <option value="all">Toute l’équipe</option>
              {staff.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="Filtrer par statut">
              <option value="all">Tous les statuts</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>

        <div className="planning-mobile-day-strip appointment-mobile-days" aria-label="Choisir un jour">
          {weekDays.map((day) => {
            const count = visibleAppointments.filter((row) => sameDay(new Date(row.starts_at), day)).length;
            return <button key={day.toISOString()} type="button" className={`${sameDay(day, selectedDate) ? 'active' : ''}${sameDay(day, new Date()) ? ' today' : ''}`} onClick={() => { setSelectedDate(day); setViewMode('day'); }}><span>{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</span><strong>{day.getDate()}</strong><small>{count}</small></button>;
          })}
        </div>

        {loading ? (
          <div className="list-state">Chargement du planning…</div>
        ) : viewMode === 'week' ? (
          <div className="beauty-week-planner-shell">
            <div className="beauty-week-planner-legend">
              <span><i className="free"/>Libre</span>
              <span><i className="busy"/>Occupé</span>
              <span><i className="blocked"/>Pause / indisponible</span>
              <span><i className="closed"/>Hors horaires</span>
            </div>

            <div className="beauty-week-planner" style={{ '--week-grid-height': `${weekPlannerHeight}px` } as CSSProperties}>
              <div className="beauty-week-header-time">HEURE</div>
              {weekDays.map((day) => {
                const dayRows = visibleAppointments.filter((row) => sameDay(new Date(row.starts_at), day));
                return <button
                  key={`head-${day.toISOString()}`}
                  type="button"
                  className={`beauty-week-day-header${sameDay(day, new Date()) ? ' today' : ''}`}
                  onClick={() => { setSelectedDate(day); setViewMode('day'); }}
                >
                  <span>{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                  <strong>{day.getDate()}</strong>
                  <small>{dayRows.length} RDV</small>
                </button>;
              })}

              <div className="beauty-week-time-axis" style={{ height: weekPlannerHeight }}>
                {weekPlannerSlots.filter((minute) => minute % 60 === 0).map((minute) => (
                  <span key={minute} style={{ top: (minute - weekPlannerBounds.startMinute) * WEEK_GRID_PX_PER_MINUTE }}>
                    {timeFromMinutes(minute)}
                  </span>
                ))}
              </div>

              {weekDays.map((day) => {
                const dayAppointments = visibleAppointments
                  .filter((row) => sameDay(new Date(row.starts_at), day))
                  .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
                const laidOutAppointments = layoutOverlappingAppointments(dayAppointments);
                const dayBlocks = visibleAvailabilityBlocks
                  .filter((block) => overlapsDay(block, day))
                  .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
                const isToday = sameDay(day, new Date());
                const now = new Date();
                const nowMinute = minuteOfDay(now);
                const showNow = isToday
                  && nowMinute >= weekPlannerBounds.startMinute
                  && nowMinute <= weekPlannerBounds.endMinute;

                return <div
                  key={`column-${day.toISOString()}`}
                  className={`beauty-week-day-column${isToday ? ' today' : ''}`}
                  style={{ height: weekPlannerHeight }}
                  onClick={(event) => handleWeekDayClick(day, event)}
                >
                  <div className="beauty-week-slot-layer" aria-hidden="true">
                    {weekPlannerSlots.map((minute) => (
                      <span
                        key={minute}
                        className={`beauty-week-slot ${weekSlotState(day, minute)}`}
                        style={{
                          top: (minute - weekPlannerBounds.startMinute) * WEEK_GRID_PX_PER_MINUTE,
                          height: WEEK_SLOT_MINUTES * WEEK_GRID_PX_PER_MINUTE
                        }}
                      />
                    ))}
                  </div>

                  {dayBlocks.map((block) => {
                    const dayStart = startOfDay(day);
                    const dayEnd = addDays(dayStart, 1);
                    const blockStart = new Date(Math.max(new Date(block.starts_at).getTime(), dayStart.getTime()));
                    const blockEnd = new Date(Math.min(new Date(block.ends_at).getTime(), dayEnd.getTime()));
                    const startMinute = block.all_day ? weekPlannerBounds.startMinute : clamp(minuteOfDay(blockStart), weekPlannerBounds.startMinute, weekPlannerBounds.endMinute);
                    const endMinute = block.all_day ? weekPlannerBounds.endMinute : clamp(minuteOfDay(blockEnd), weekPlannerBounds.startMinute, weekPlannerBounds.endMinute);
                    if (endMinute <= startMinute) return null;
                    const member = block.staff_id ? staffById.get(block.staff_id) : null;
                    return <button
                      key={`week-block-${block.id}-${dateToInput(day)}`}
                      type="button"
                      className={`beauty-week-unavailability kind-${block.kind}${block.staff_id ? ' staff-only' : ' whole-site'}`}
                      style={{
                        top: (startMinute - weekPlannerBounds.startMinute) * WEEK_GRID_PX_PER_MINUTE,
                        height: Math.max(22, (endMinute - startMinute) * WEEK_GRID_PX_PER_MINUTE)
                      }}
                      onClick={(event) => { event.stopPropagation(); openEditAvailability(block); }}
                      title={`${block.label || availabilityKindLabels[block.kind]}${member ? ` · ${member.display_name}` : ''}`}
                    >
                      <Icon name={block.kind === 'leave' ? 'users' : block.kind === 'closure' ? 'building' : 'lock'} size={11}/>
                      <span>{block.label || availabilityKindLabels[block.kind]}</span>
                      {member && <small>{member.display_name}</small>}
                    </button>;
                  })}

                  {laidOutAppointments.map(({ appointment, lane, laneCount }) => {
                    const client = clientById.get(appointment.client_id);
                    const member = staffById.get(appointment.staff_id);
                    const items = appointmentItemsById.get(appointment.id) ?? [];
                    const start = new Date(appointment.starts_at);
                    const end = new Date(appointment.ends_at);
                    const startMinute = clamp(minuteOfDay(start), weekPlannerBounds.startMinute, weekPlannerBounds.endMinute);
                    const endMinute = clamp(minuteOfDay(end), weekPlannerBounds.startMinute, weekPlannerBounds.endMinute);
                    const duration = Math.max(15, endMinute - startMinute);
                    const laneWidth = 100 / laneCount;
                    return <button
                      type="button"
                      key={appointment.id}
                      className={`beauty-week-appointment status-${appointment.status}`}
                      style={{
                        '--appointment-color': member?.color || '#8b5cf6',
                        top: (startMinute - weekPlannerBounds.startMinute) * WEEK_GRID_PX_PER_MINUTE + 2,
                        height: Math.max(28, duration * WEEK_GRID_PX_PER_MINUTE - 4),
                        left: `calc(${lane * laneWidth}% + 2px)`,
                        width: `calc(${laneWidth}% - 4px)`
                      } as CSSProperties}
                      title={`${timeFormatter.format(start)}–${timeFormatter.format(end)} · ${fullClientName(client)} · ${appointmentServiceLabel(appointment)} · ${member?.display_name ?? ''}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (items.length > 1) {
                          setSelectedDate(startOfDay(start));
                          setViewMode('day');
                        } else {
                          openEditForm(appointment);
                        }
                      }}
                    >
                      <span className="beauty-week-appointment-time">{timeFormatter.format(start)}</span>
                      <strong>{fullClientName(client)}</strong>
                      <span className="beauty-week-appointment-service">{appointmentServiceLabel(appointment)}</span>
                      <small>{member?.display_name ?? 'Équipe'} · {appointmentDurationMinutes(appointment)} min</small>
                    </button>;
                  })}

                  {showNow && <span
                    className="beauty-week-now-line"
                    style={{ top: (nowMinute - weekPlannerBounds.startMinute) * WEEK_GRID_PX_PER_MINUTE }}
                    aria-label="Heure actuelle"
                  ><i/></span>}
                </div>;
              })}
            </div>
          </div>
        ) : (
          <div className="day-planner">
            <div className="day-planner-heading">
              <div><p className="eyebrow">AGENDA DU JOUR</p><h3>{selectedDayAppointments.length} rendez-vous</h3></div>
              {canEditAppointments && <button className="secondary-button" type="button" onClick={() => openCreateForm(selectedDate, '09:00')}>Ajouter sur cette journée</button>}
            </div>
            {selectedDayAvailabilityBlocks.length > 0 && <div className="availability-day-list"><div className="availability-day-list-head"><span><Icon name="lock" size={15} />Indisponibilités</span><small>{selectedDayAvailabilityBlocks.length}</small></div>{selectedDayAvailabilityBlocks.map(availabilityBlockCard)}</div>}
            {selectedDayAppointments.length === 0 ? (
              <div className="list-state empty-appointments-state">
                <div className="empty-icon"><Icon name="calendar" size={30} /></div>
                <h3>Aucun rendez-vous ce jour-là</h3>
                <p>{selectedDayAvailabilityBlocks.length > 0 ? 'Aucun rendez-vous n’est planifié sur les périodes encore disponibles.' : 'La journée est libre pour les filtres sélectionnés.'}</p>
                {canEditAppointments && <div className="empty-appointments-actions">{beautyMode && <button className="secondary-button" type="button" onClick={() => openAvailabilityForm(selectedDate)}>Bloquer du temps</button>}<button className="primary-button" type="button" onClick={() => openCreateForm(selectedDate, '09:00')}>Créer un rendez-vous</button></div>}
              </div>
            ) : <div className="day-appointment-list">{selectedDayAppointments.map(appointmentCard)}</div>}
          </div>
        )}
        {viewMode === 'day' && <div className="planning-mobile-agenda appointment-mobile-agenda"><div className="planning-mobile-agenda-heading"><p className="eyebrow">AGENDA DU JOUR</p><strong>{fullDateFormatter.format(selectedDate)}</strong></div>{selectedDayAvailabilityBlocks.length > 0 && <div className="availability-day-list compact">{selectedDayAvailabilityBlocks.map(availabilityBlockCard)}</div>}{selectedDayAppointments.length === 0 ? <div className="planning-empty-state compact"><Icon name="calendar" size={26}/><strong>Aucun rendez-vous</strong><span>{selectedDayAvailabilityBlocks.length > 0 ? 'Les périodes bloquées sont affichées ci-dessus.' : 'La journée est libre pour les filtres choisis.'}</span></div> : <div className="day-appointment-list">{selectedDayAppointments.map(appointmentCard)}</div>}</div>}
      </section>
    </div>
  );
}
