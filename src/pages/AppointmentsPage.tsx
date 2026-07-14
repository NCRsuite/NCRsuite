import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

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

const statusLabels: Record<AppointmentStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  completed: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absent'
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

export function AppointmentsPage() {
  const { organization, sites, activeSite, activeSiteId } = useOrganization();
  const { demoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [staffServices, setStaffServices] = useState<StaffServiceRecord[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHourRecord[]>([]);
  const [breaks, setBreaks] = useState<BreakRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [form, setForm] = useState<AppointmentFormState>(emptyForm);
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

  const loadData = useCallback(async () => {
    if (!organization) return;
    const organizationId = organization.id;
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
      setLoading(false);
      return;
    }

    const rangeStart = new Date();
    rangeStart.setMonth(rangeStart.getMonth() - 3);
    const rangeEnd = new Date();
    rangeEnd.setFullYear(rangeEnd.getFullYear() + 1);

    let staffQuery = supabase.from('staff').select('id,display_name,site_id,color,active').eq('organization_id', organizationId).eq('active', true).order('display_name');
    let appointmentsQuery = supabase.from('appointments')
      .select('id,client_id,service_id,staff_id,site_id,starts_at,ends_at,status,notes,amount_cents,source,created_at')
      .eq('organization_id', organizationId)
      .gte('starts_at', rangeStart.toISOString())
      .lt('starts_at', rangeEnd.toISOString())
      .order('starts_at', { ascending: true });
    if (organization.plan === 'metier' && activeSiteId) {
      staffQuery = staffQuery.eq('site_id', activeSiteId);
      appointmentsQuery = appointmentsQuery.eq('site_id', activeSiteId);
    }

    const [clientsResult, servicesResult, staffResult, assignmentsResult, hoursResult, breaksResult, appointmentsResult] = await Promise.all([
      supabase.from('clients').select('id,first_name,last_name,email,phone,status').eq('organization_id', organizationId).eq('status', 'active').order('first_name'),
      supabase.from('services').select('id,name,duration_minutes,price_cents,active').eq('organization_id', organizationId).eq('active', true).order('name'),
      staffQuery,
      supabase.from('staff_services').select('staff_id,service_id').eq('organization_id', organizationId),
      supabase.from('staff_working_hours').select('staff_id,weekday,start_time,end_time').eq('organization_id', organizationId),
      supabase.from('staff_breaks').select('staff_id,weekday,start_time,end_time').eq('organization_id', organizationId),
      appointmentsQuery
    ]);

    const firstError = [clientsResult, servicesResult, staffResult, assignmentsResult, hoursResult, breaksResult, appointmentsResult]
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
    }
    setLoading(false);
  }, [organization, demoMode, activeSiteId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const defaultSiteId = activeSiteId ?? sites.find((site) => site.is_primary)?.id ?? sites[0]?.id ?? '';
    setForm((current) => current.siteId ? current : { ...current, siteId: defaultSiteId });
  }, [activeSiteId, sites]);

  const clientById = useMemo(() => new Map(clients.map((row) => [row.id, row])), [clients]);
  const serviceById = useMemo(() => new Map(services.map((row) => [row.id, row])), [services]);
  const staffById = useMemo(() => new Map(staff.map((row) => [row.id, row])), [staff]);

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

  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const selectedDayAppointments = useMemo(
    () => visibleAppointments.filter((row) => sameDay(new Date(row.starts_at), selectedDate)).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [visibleAppointments, selectedDate]
  );

  const todayAppointments = appointments.filter((row) => row.status !== 'cancelled' && sameDay(new Date(row.starts_at), new Date()));
  const weekAppointments = appointments.filter((row) => {
    const start = new Date(row.starts_at);
    return row.status !== 'cancelled' && start >= weekStart && start < addDays(weekStart, 7);
  });
  const pendingCount = appointments.filter((row) => row.status === 'pending').length;
  const weekAmount = weekAppointments.reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);

  function openCreateForm(date?: Date, time?: string) {
    if (!canEditAppointments) return;
    const base = emptyForm(activeSiteId ?? sites.find((site) => site.is_primary)?.id ?? sites[0]?.id ?? '');
    if (date) base.date = dateToInput(date);
    if (time) base.time = time;
    setEditingId(null);
    setForm(base);
    setError('');
    setSuccess('');
    setSearchParams({ new: '1' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openEditForm(appointment: AppointmentRecord) {
    if (!canEditAppointments || appointment.status === 'cancelled') return;
    const start = new Date(appointment.starts_at);
    setForm({
      siteId: appointment.site_id ?? activeSiteId ?? sites.find((site) => site.is_primary)?.id ?? '',
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
    setForm(emptyForm(activeSiteId ?? sites.find((site) => site.is_primary)?.id ?? sites[0]?.id ?? ''));
    setError('');
    setSearchParams({});
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
      setForm(emptyForm(activeSiteId ?? sites.find((site) => site.is_primary)?.id ?? sites[0]?.id ?? ''));
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

  function appointmentCard(appointment: AppointmentRecord) {
    const client = clientById.get(appointment.client_id);
    const service = serviceById.get(appointment.service_id);
    const member = staffById.get(appointment.staff_id);
    return (
      <article key={appointment.id} className={`appointment-card status-${appointment.status}`} style={{ '--staff-color': member?.color ?? '#0a84ff' } as React.CSSProperties}>
        <div className="appointment-time">
          <strong>{timeFormatter.format(new Date(appointment.starts_at))}</strong>
          <span>{timeFormatter.format(new Date(appointment.ends_at))}</span>
        </div>
        <div className="appointment-main">
          <div className="appointment-title-row">
            <h3>{fullClientName(client)}</h3>
            <span className={`status-chip appointment-status ${appointment.status}`}>{statusLabels[appointment.status]}</span>
          </div>
          <p>{service?.name ?? 'Prestation inconnue'} · {member?.display_name ?? 'Collaborateur inconnu'}{organization?.plan === 'metier' ? ` · ${sites.find((site) => site.id === appointment.site_id)?.name ?? 'Site non attribué'}` : ''}</p>
          <small>{service ? `${service.duration_minutes} min · ${currencyFormatter.format((appointment.amount_cents ?? service.price_cents) / 100)}` : ''}</small>
          {appointment.notes && <em>{appointment.notes}</em>}
        </div>
        {canChangeStatus && (
          <div className="appointment-actions">
            {canEditAppointments && appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
              <button type="button" className="secondary-button compact-button" onClick={() => openEditForm(appointment)}>Modifier</button>
            )}
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
    <div className="page appointments-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">PLANNING</p>
          <h1>Rendez-vous</h1>
          <p>{personalView ? 'Consultez les rendez-vous qui vous sont attribués et mettez leur statut à jour.' : `Planifiez l’activité ${activeSite ? `de ${activeSite.name}` : 'de tous les établissements'} sans double réservation.`}</p>
        </div>
        {canEditAppointments && <button className="primary-button" type="button" onClick={() => openCreateForm()}><Icon name="calendar" size={18} />Nouveau rendez-vous</button>}
      </header>

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
                <select value={form.siteId} onChange={(event) => setForm((current) => ({ ...current, siteId: event.target.value, staffId: '' }))} required disabled={Boolean(activeSiteId)}>
                  <option value="">Sélectionner un établissement</option>
                  {sites.map((site) => <option key={site.id} value={site.id}>{site.name}{site.is_primary ? ' · Principal' : ''}</option>)}
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

        {loading ? (
          <div className="list-state">Chargement du planning…</div>
        ) : viewMode === 'week' ? (
          <div className="week-planner">
            {weekDays.map((day) => {
              const dayAppointments = visibleAppointments.filter((row) => sameDay(new Date(row.starts_at), day)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
              return (
                <section key={day.toISOString()} className={`week-day-column${sameDay(day, new Date()) ? ' today' : ''}`}>
                  <button type="button" className="week-day-header" onClick={() => { setSelectedDate(day); setViewMode('day'); }}>
                    <span>{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                    <strong>{day.getDate()}</strong>
                    <small>{dayAppointments.length} RDV</small>
                  </button>
                  <div className="week-day-events">
                    {dayAppointments.length === 0 ? (
                      canEditAppointments ? <button type="button" className="empty-day-button" onClick={() => openCreateForm(day, '09:00')}>+ Ajouter</button> : <span className="empty-day-label">Aucun rendez-vous</span>
                    ) : dayAppointments.map((appointment) => appointmentCard(appointment))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="day-planner">
            <div className="day-planner-heading">
              <div><p className="eyebrow">AGENDA DU JOUR</p><h3>{selectedDayAppointments.length} rendez-vous</h3></div>
              {canEditAppointments && <button className="secondary-button" type="button" onClick={() => openCreateForm(selectedDate, '09:00')}>Ajouter sur cette journée</button>}
            </div>
            {selectedDayAppointments.length === 0 ? (
              <div className="list-state empty-appointments-state">
                <div className="empty-icon"><Icon name="calendar" size={30} /></div>
                <h3>Aucun rendez-vous ce jour-là</h3>
                <p>La journée est libre pour les filtres sélectionnés.</p>
                {canEditAppointments && <button className="primary-button" type="button" onClick={() => openCreateForm(selectedDate, '09:00')}>Créer un rendez-vous</button>}
              </div>
            ) : <div className="day-appointment-list">{selectedDayAppointments.map(appointmentCard)}</div>}
          </div>
        )}
      </section>
    </div>
  );
}
