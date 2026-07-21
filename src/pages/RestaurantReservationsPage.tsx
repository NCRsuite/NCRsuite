import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { organizationHasFeature } from '../config/planEntitlements';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { restaurantErrorMessage, safeRestaurantStorageArray, toRestaurantLocalDateKey } from '../features/restaurant/runtime';
import { nullableRestaurantText, type RestaurantReservationRecord, type RestaurantReservationStatus, type RestaurantTableRecord } from '../features/restaurant/types';
import { supabase } from '../lib/supabase';

function toLocalInput(date: Date) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

function defaultDate() {
  const date = new Date();
  date.setHours(date.getHours() + 2, 0, 0, 0);
  return toLocalInput(date);
}

function reservationDateForDay(day: string) {
  const target = new Date(`${day}T19:00:00`);
  const now = new Date();
  if (target.toDateString() === now.toDateString() && target.getTime() < now.getTime()) {
    now.setHours(now.getHours() + 2, 0, 0, 0);
    return toLocalInput(now);
  }
  return toLocalInput(target);
}


function intervalsOverlap(startA: string, durationA: number, startB: string, durationB: number) {
  const aStart = new Date(startA).getTime();
  const aEnd = aStart + durationA * 60000;
  const bStart = new Date(startB).getTime();
  const bEnd = bStart + durationB * 60000;
  return aStart < bEnd && bStart < aEnd;
}

function startOfWeek(date: Date) {
  const start = new Date(date);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function isoDay(date: Date) {
  return toLocalInput(date).slice(0, 10);
}

function servicePeriod(reservationAt: string) {
  const hour = new Date(reservationAt).getHours();
  if (hour < 11) return 'morning';
  if (hour < 17) return 'lunch';
  return 'dinner';
}

const emptyForm = {
  guestName: '',
  guestEmail: '',
  guestPhone: '',
  partySize: '2',
  reservationAt: defaultDate(),
  durationMinutes: '120',
  tableId: '',
  notes: ''
};

const statusLabels: Record<RestaurantReservationStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  seated: 'Installée',
  completed: 'Terminée',
  canceled: 'Annulée',
  no_show: 'Absente'
};

const blockingStatuses: RestaurantReservationStatus[] = ['pending', 'confirmed', 'seated'];

type StatusFilter = 'all' | RestaurantReservationStatus;
type ServiceFilter = 'all' | 'morning' | 'lunch' | 'dinner';

export function RestaurantReservationsPage() {
  const { organization, updateBookingSettings } = useOrganization();
  const { user, demoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<RestaurantReservationRecord[]>([]);
  const [tables, setTables] = useState<RestaurantTableRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [day, setDay] = useState(toRestaurantLocalDateKey());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activatingPublicPage, setActivatingPublicPage] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [unavailableTableIds, setUnavailableTableIds] = useState<Set<string>>(new Set());
  const [availabilityError, setAvailabilityError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const formOpen = searchParams.get('new') === '1';
  const hasOnline = Boolean(organization && organizationHasFeature(organization, 'restaurant_online_reservations'));
  const publicPageActive = Boolean(hasOnline && organization?.booking_enabled);
  const canManagePublicPage = Boolean(organization && ['owner', 'admin', 'manager'].includes(organization.role ?? 'viewer'));

  const selectedDate = useMemo(() => new Date(`${day}T12:00:00`), [day]);
  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  }), [weekStart]);

  function openNewReservation() {
    setForm({ ...emptyForm, reservationAt: reservationDateForDay(day) });
    setSearchParams({ new: '1' });
  }

  function moveDay(offset: number) {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + offset);
    setDay(isoDay(next));
  }

  async function activatePublicPage() {
    if (!organization || !hasOnline || !canManagePublicPage) return;
    setActivatingPublicPage(true);
    setError('');
    setSuccess('');
    try {
      await updateBookingSettings({
        enabled: true,
        confirmationMode: organization.booking_confirmation_mode ?? 'manual',
        slotInterval: organization.booking_slot_interval ?? 15,
        minNoticeHours: organization.booking_min_notice_hours ?? 2,
        maxDaysAhead: organization.booking_max_days_ahead ?? 180,
        cancelNoticeHours: organization.booking_cancel_notice_hours ?? 12,
        welcomeText: organization.booking_welcome_text ?? ''
      });
      setSuccess('La page publique de réservation est maintenant activée.');
    } catch (caught) {
      setError(restaurantErrorMessage(caught, 'Activation de la page publique impossible.'));
    } finally {
      setActivatingPublicPage(false);
    }
  }

  async function load() {
    if (!organization) return;
    setLoading(true);
    setError('');
    const start = startOfWeek(new Date(`${day}T12:00:00`));
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    try {
      if (demoMode || !supabase) {
        setRows(safeRestaurantStorageArray<RestaurantReservationRecord>(`ncr-restaurant-reservations-${organization.id}`));
        setTables(safeRestaurantStorageArray<RestaurantTableRecord>(`ncr-restaurant-tables-${organization.id}`));
      } else {
        const [reservationResult, tableResult] = await Promise.all([
          supabase
            .from('restaurant_reservations')
            .select('*,restaurant_tables(name,area)')
            .eq('organization_id', organization.id)
            .gte('reservation_at', start.toISOString())
            .lt('reservation_at', end.toISOString())
            .order('reservation_at'),
          supabase
            .from('restaurant_tables')
            .select('*')
            .eq('organization_id', organization.id)
            .eq('active', true)
            .order('area')
            .order('name')
        ]);
        const firstError = reservationResult.error || tableResult.error;
        if (firstError) throw firstError;
        setRows((reservationResult.data ?? []) as RestaurantReservationRecord[]);
        setTables((tableResult.data ?? []) as RestaurantTableRecord[]);
      }
    } catch (caught) {
      setError(restaurantErrorMessage(caught, 'Chargement des réservations impossible.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [organization?.id, demoMode, day]);

  const requestedPartySize = Math.max(1, Math.min(100, Number(form.partySize) || 1));
  const requestedDuration = Math.max(30, Math.min(360, Number(form.durationMinutes) || 120));

  useEffect(() => {
    if (!formOpen || !organization || !form.reservationAt) {
      setUnavailableTableIds(new Set());
      setAvailabilityError('');
      return;
    }

    const requestedDate = new Date(form.reservationAt);
    if (Number.isNaN(requestedDate.getTime())) return;

    let canceled = false;
    const timeout = window.setTimeout(async () => {
      setCheckingAvailability(true);
      setAvailabilityError('');
      try {
        let ids: string[] = [];
        if (demoMode || !supabase) {
          const reservations = safeRestaurantStorageArray<RestaurantReservationRecord>(`ncr-restaurant-reservations-${organization.id}`);
          ids = tables
            .filter((table) => {
              if (table.capacity < requestedPartySize || table.service_status === 'unavailable') return true;
              return reservations.some((reservation) =>
                reservation.table_id === table.id
                && blockingStatuses.includes(reservation.status)
                && intervalsOverlap(form.reservationAt, requestedDuration, reservation.reservation_at, reservation.duration_minutes)
              );
            })
            .map((table) => table.id);
        } else {
          const { data, error: availabilityRpcError } = await supabase.rpc('get_restaurant_unavailable_table_ids', {
            p_organization_id: organization.id,
            p_reservation_at: requestedDate.toISOString(),
            p_duration_minutes: requestedDuration,
            p_party_size: requestedPartySize,
            p_exclude_reservation_id: null
          });
          if (availabilityRpcError) throw availabilityRpcError;
          ids = Array.isArray(data) ? data.map(String) : [];
        }

        if (!canceled) {
          const nextUnavailable = new Set(ids);
          setUnavailableTableIds(nextUnavailable);
          setForm((current) => current.tableId && nextUnavailable.has(current.tableId) ? { ...current, tableId: '' } : current);
        }
      } catch (caught) {
        if (!canceled) setAvailabilityError(restaurantErrorMessage(caught, 'Impossible de vérifier les tables disponibles.'));
      } finally {
        if (!canceled) setCheckingAvailability(false);
      }
    }, 250);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [formOpen, organization?.id, form.reservationAt, form.durationMinutes, form.partySize, demoMode, tables]);

  const availableTables = useMemo(
    () => tables.filter((table) =>
      table.active
      && table.capacity >= requestedPartySize
      && table.service_status !== 'unavailable'
      && !unavailableTableIds.has(table.id)
    ),
    [tables, requestedPartySize, unavailableTableIds]
  );

  async function createReservation(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user) return;
    setSaving(true);
    setError('');
    setSuccess('');

    const table = tables.find((row) => row.id === form.tableId);
    const payload = {
      organization_id: organization.id,
      table_id: form.tableId || null,
      source: 'manual',
      guest_name: form.guestName.trim(),
      guest_email: nullableRestaurantText(form.guestEmail)?.toLowerCase() ?? null,
      guest_phone: nullableRestaurantText(form.guestPhone),
      party_size: requestedPartySize,
      reservation_at: new Date(form.reservationAt).toISOString(),
      duration_minutes: requestedDuration,
      status: 'confirmed',
      notes: nullableRestaurantText(form.notes),
      created_by: user.id
    } as const;

    try {
      if (tables.length > 0 && !form.tableId) {
        throw new Error('Aucune table disponible n’a été sélectionnée. La réservation est bloquée pour éviter une surréservation.');
      }
      if (form.tableId && unavailableTableIds.has(form.tableId)) {
        throw new Error('Cette table vient d’être réservée sur ce créneau. Choisis une autre table.');
      }
      if (table && table.capacity < requestedPartySize) {
        throw new Error(`La table ${table.name} ne possède pas assez de places.`);
      }

      let created: RestaurantReservationRecord;
      if (demoMode || !supabase) {
        const allReservations = safeRestaurantStorageArray<RestaurantReservationRecord>(`ncr-restaurant-reservations-${organization.id}`);
        if (form.tableId && allReservations.some((reservation) =>
          reservation.table_id === form.tableId
          && blockingStatuses.includes(reservation.status)
          && intervalsOverlap(payload.reservation_at, requestedDuration, reservation.reservation_at, reservation.duration_minutes)
        )) {
          throw new Error('Cette table est déjà réservée sur ce créneau.');
        }

        created = {
          id: crypto.randomUUID(),
          ...payload,
          source: 'manual',
          status: 'confirmed',
          restaurant_tables: table ? { name: table.name, area: table.area } : null
        };
        const stored = [...allReservations, created].sort((a, b) => a.reservation_at.localeCompare(b.reservation_at));
        localStorage.setItem(`ncr-restaurant-reservations-${organization.id}`, JSON.stringify(stored));
      } else {
        const { data, error: insertError } = await supabase
          .from('restaurant_reservations')
          .insert(payload)
          .select('*,restaurant_tables(name,area)')
          .single();
        if (insertError) throw insertError;
        created = data as RestaurantReservationRecord;
      }

      setRows((current) => [...current, created].sort((a, b) => a.reservation_at.localeCompare(b.reservation_at)));
      setForm({ ...emptyForm, reservationAt: reservationDateForDay(day) });
      setSearchParams({});
      setSuccess('La réservation a été créée et le créneau de la table est bloqué.');
    } catch (caught) {
      setError(restaurantErrorMessage(caught, 'Création impossible.'));
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(row: RestaurantReservationRecord, status: RestaurantReservationStatus) {
    if (!organization) return;
    try {
      if (demoMode || !supabase) {
        const allRows = safeRestaurantStorageArray<RestaurantReservationRecord>(`ncr-restaurant-reservations-${organization.id}`);
        const stored = allRows.map((item) => item.id === row.id ? { ...item, status } : item);
        localStorage.setItem(`ncr-restaurant-reservations-${organization.id}`, JSON.stringify(stored));
        setRows((current) => current.map((item) => item.id === row.id ? { ...item, status } : item));
      } else {
        const { error: updateError } = await supabase.rpc('set_restaurant_reservation_status', {
          p_reservation_id: row.id,
          p_status: status
        });
        if (updateError) throw updateError;
        setRows((current) => current.map((item) => item.id === row.id ? { ...item, status } : item));
      }
    } catch (caught) {
      setError(restaurantErrorMessage(caught, 'Mise à jour impossible.'));
    }
  }

  const activeRows = useMemo(
    () => rows
      .filter((row) => toRestaurantLocalDateKey(row.reservation_at) === day)
      .sort((a, b) => a.reservation_at.localeCompare(b.reservation_at)),
    [rows, day]
  );

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('fr-FR');
    return activeRows.filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesService = serviceFilter === 'all' || servicePeriod(row.reservation_at) === serviceFilter;
      const haystack = [row.guest_name, row.guest_phone, row.guest_email, row.restaurant_tables?.name, row.restaurant_tables?.area, row.notes]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('fr-FR');
      return matchesStatus && matchesService && (!needle || haystack.includes(needle));
    });
  }, [activeRows, search, statusFilter, serviceFilter]);

  const validRows = activeRows.filter((row) => !['canceled', 'no_show'].includes(row.status));
  const covers = validRows.reduce((total, row) => total + row.party_size, 0);
  const pendingCount = activeRows.filter((row) => row.status === 'pending').length;
  const seatedCount = activeRows.filter((row) => row.status === 'seated').length;
  const completedCount = activeRows.filter((row) => row.status === 'completed').length;
  const todayIso = toRestaurantLocalDateKey();
  const selectedDayTitle = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(selectedDate);

  if (!organization) return null;

  return <div className="page restaurant-page restaurant-reservations-premium">
    <header className="page-header restaurant-reservations-header">
      <div>
        <p className="eyebrow">ACCUEIL & RÉSERVATIONS</p>
        <h1>Le service en un coup d’œil</h1>
        <p>Réservations, couverts, tables et arrivées réunis dans un seul écran.</p>
      </div>
      <div className="header-actions">
        {publicPageActive && <a className="secondary-button" href={`/r/${organization.slug}/reserver`} target="_blank" rel="noreferrer"><Icon name="eye" size={18}/>Page publique</a>}
        {hasOnline && !publicPageActive && canManagePublicPage && (
          <button className="secondary-button" onClick={() => void activatePublicPage()} disabled={activatingPublicPage}>
            <Icon name="eye" size={18}/>{activatingPublicPage ? 'Activation…' : 'Activer la page publique'}
          </button>
        )}
        <button className="primary-button restaurant-booking-primary" onClick={openNewReservation}><Icon name="plus" size={18}/>Nouvelle réservation</button>
      </div>
    </header>

    {hasOnline && !publicPageActive && (
      <div className="info-message page-message">
        La réservation en ligne est incluse dans votre formule, mais la page publique est désactivée. Active-la ici ou depuis les paramètres de l’entreprise.
      </div>
    )}

    <section className="restaurant-reservation-overview">
      <div className="restaurant-reservation-metric main">
        <span className="restaurant-reservation-metric-icon"><Icon name="calendar" size={20}/></span>
        <div><small>Réservations</small><strong>{activeRows.length}</strong><span>{selectedDayTitle}</span></div>
      </div>
      <div className="restaurant-reservation-metric">
        <span className="restaurant-reservation-metric-icon"><Icon name="users" size={20}/></span>
        <div><small>Couverts attendus</small><strong>{covers}</strong><span>{validRows.length} table{validRows.length > 1 ? 's' : ''} active{validRows.length > 1 ? 's' : ''}</span></div>
      </div>
      <div className="restaurant-reservation-metric warning">
        <span className="restaurant-reservation-metric-icon"><Icon name="clock" size={20}/></span>
        <div><small>À confirmer</small><strong>{pendingCount}</strong><span>Demandes en attente</span></div>
      </div>
      <div className="restaurant-reservation-metric success">
        <span className="restaurant-reservation-metric-icon"><Icon name="utensils" size={20}/></span>
        <div><small>En salle</small><strong>{seatedCount}</strong><span>{completedCount} terminée{completedCount > 1 ? 's' : ''}</span></div>
      </div>
    </section>

    <section className="panel restaurant-week-navigator">
      <div className="restaurant-week-toolbar">
        <button type="button" className="restaurant-date-arrow" onClick={() => moveDay(-1)} aria-label="Jour précédent"><Icon name="chevronRight" size={18}/></button>
        <div>
          <p className="eyebrow">SEMAINE DU {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(weekStart).toUpperCase()}</p>
          <h2>{selectedDayTitle}</h2>
        </div>
        <div className="restaurant-week-actions">
          {day !== todayIso && <button type="button" className="secondary-button compact-button" onClick={() => setDay(todayIso)}>Aujourd’hui</button>}
          <button type="button" className="restaurant-date-arrow next" onClick={() => moveDay(1)} aria-label="Jour suivant"><Icon name="chevronRight" size={18}/></button>
        </div>
      </div>
      <div className="restaurant-week-strip">
        {weekDays.map((date) => {
          const dateIso = isoDay(date);
          const count = rows.filter((row) => toRestaurantLocalDateKey(row.reservation_at) === dateIso && !['canceled', 'no_show'].includes(row.status)).length;
          return <button
            type="button"
            key={dateIso}
            className={`${dateIso === day ? 'active' : ''} ${dateIso === todayIso ? 'today' : ''}`}
            onClick={() => setDay(dateIso)}
          >
            <span>{new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date).replace('.', '')}</span>
            <strong>{date.getDate()}</strong>
            <small>{count ? `${count} résa.` : 'Libre'}</small>
          </button>;
        })}
      </div>
    </section>

    {formOpen && <section className="panel restaurant-booking-composer">
      <div className="restaurant-booking-composer-head">
        <div>
          <p className="eyebrow">NOUVELLE RÉSERVATION</p>
          <h2>Préparer l’arrivée du client</h2>
          <p>Choisis le créneau, le nombre de couverts et une table réellement disponible.</p>
        </div>
        <button type="button" className="secondary-button compact-button" onClick={() => setSearchParams({})}><Icon name="close" size={16}/>Fermer</button>
      </div>
      <form className="restaurant-booking-form" onSubmit={createReservation}>
        <div className="restaurant-booking-form-main">
          <section className="restaurant-booking-form-section">
            <div className="restaurant-booking-section-title"><span>1</span><div><strong>Client et couverts</strong><small>Les informations utiles pour l’accueil.</small></div></div>
            <div className="restaurant-booking-fields two-columns">
              <label>Nom du client *<input autoFocus required value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} placeholder="Ex. Martin"/></label>
              <label>Téléphone<input inputMode="tel" value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })} placeholder="06 00 00 00 00"/></label>
              <label className="full-field">E-mail<input type="email" value={form.guestEmail} onChange={(e) => setForm({ ...form, guestEmail: e.target.value })} placeholder="client@email.fr"/></label>
            </div>
            <div className="restaurant-booking-choice-group">
              <span>Nombre de personnes</span>
              <div className="restaurant-booking-choice-row">
                {[1, 2, 3, 4, 5, 6].map((size) => <button type="button" key={size} className={requestedPartySize === size ? 'active' : ''} onClick={() => setForm({ ...form, partySize: String(size) })}>{size}</button>)}
                <label className="restaurant-booking-custom-number">Autre<input type="number" min="1" max="100" required value={form.partySize} onChange={(e) => setForm({ ...form, partySize: e.target.value })}/></label>
              </div>
            </div>
          </section>

          <section className="restaurant-booking-form-section">
            <div className="restaurant-booking-section-title"><span>2</span><div><strong>Créneau du service</strong><small>La disponibilité des tables se met à jour automatiquement.</small></div></div>
            <div className="restaurant-booking-fields two-columns">
              <label>Date et heure *<input type="datetime-local" min={toLocalInput(new Date())} required value={form.reservationAt} onChange={(e) => setForm({ ...form, reservationAt: e.target.value })}/></label>
              <label>Durée estimée<select value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}><option value="60">1 heure</option><option value="90">1 h 30</option><option value="120">2 heures</option><option value="150">2 h 30</option><option value="180">3 heures</option></select></label>
            </div>
            <div className="restaurant-booking-duration-row">
              {[60, 90, 120, 150, 180].map((duration) => <button type="button" key={duration} className={requestedDuration === duration ? 'active' : ''} onClick={() => setForm({ ...form, durationMinutes: String(duration) })}>{duration < 120 ? `${duration} min` : duration === 120 ? '2 h' : duration === 150 ? '2 h 30' : '3 h'}</button>)}
            </div>
          </section>

          <section className="restaurant-booking-form-section">
            <div className="restaurant-booking-section-title"><span>3</span><div><strong>Notes d’accueil</strong><small>Allergie, poussette, anniversaire ou demande particulière.</small></div></div>
            <label className="restaurant-booking-notes">Notes<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ex. chaise haute, anniversaire, client allergique aux fruits à coque…"/></label>
          </section>
        </div>

        <aside className="restaurant-booking-table-picker">
          <div className="restaurant-booking-table-picker-head">
            <div><p className="eyebrow">TABLE DISPONIBLE</p><h3>{checkingAvailability ? 'Vérification…' : `${availableTables.length} possibilité${availableTables.length > 1 ? 's' : ''}`}</h3></div>
            <span className={`restaurant-booking-availability-dot ${availabilityError || availableTables.length === 0 ? 'warning' : 'success'}`}/>
          </div>
          <p className={`restaurant-availability-note ${availabilityError ? 'error' : availableTables.length === 0 ? 'warning' : 'success'}`}>
            {checkingAvailability
              ? 'NCR Suite contrôle les chevauchements…'
              : availabilityError
                ? availabilityError
                : availableTables.length > 0
                  ? 'Sélectionne une table adaptée au nombre de couverts.'
                  : tables.length > 0
                    ? 'Aucune table adaptée n’est libre sur ce créneau.'
                    : 'Aucune table configurée : l’attribution sera faite plus tard.'}
          </p>
          {availableTables.length > 0
            ? <div className="restaurant-booking-table-grid">{availableTables.map((table) => <button
                type="button"
                key={table.id}
                className={form.tableId === table.id ? 'active' : ''}
                onClick={() => setForm({ ...form, tableId: table.id })}
              >
                <span className="restaurant-booking-table-icon"><Icon name="utensils" size={18}/></span>
                <strong>{table.name}</strong>
                <small>{table.area}</small>
                <em>{table.capacity} places</em>
              </button>)}</div>
            : <div className="restaurant-booking-no-table"><Icon name="alert" size={22}/><span>{tables.length ? 'Change le créneau ou le nombre de personnes.' : 'Crée d’abord ton plan de salle pour bénéficier du blocage automatique.'}</span></div>}
          <div className="restaurant-booking-summary">
            <div><span>Client</span><strong>{form.guestName || 'À renseigner'}</strong></div>
            <div><span>Couverts</span><strong>{requestedPartySize}</strong></div>
            <div><span>Durée</span><strong>{requestedDuration} min</strong></div>
            <div><span>Table</span><strong>{tables.find((table) => table.id === form.tableId)?.name ?? 'Non choisie'}</strong></div>
          </div>
          <div className="restaurant-booking-submit">
            <button type="button" className="secondary-button" onClick={() => setSearchParams({})}>Annuler</button>
            <button className="primary-button" disabled={saving || checkingAvailability || (tables.length > 0 && availableTables.length === 0)}>{saving ? 'Enregistrement…' : 'Confirmer la réservation'}</button>
          </div>
        </aside>
      </form>
    </section>}

    {error && <div className="error-message page-message">{error}</div>}
    {success && <div className="success-message page-message">{success}</div>}

    <section className="panel restaurant-reservation-board">
      <div className="restaurant-reservation-board-head">
        <div>
          <p className="eyebrow">SERVICE DU JOUR</p>
          <h2>{filteredRows.length} réservation{filteredRows.length > 1 ? 's' : ''} affichée{filteredRows.length > 1 ? 's' : ''}</h2>
        </div>
        <div className="restaurant-reservation-search"><Icon name="search" size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Client, téléphone, table…"/></div>
      </div>

      <div className="restaurant-reservation-filters">
        <div className="restaurant-reservation-service-tabs">
          {([
            ['all', 'Toute la journée'],
            ['morning', 'Matin'],
            ['lunch', 'Midi'],
            ['dinner', 'Soir']
          ] as [ServiceFilter, string][]).map(([value, label]) => <button type="button" key={value} className={serviceFilter === value ? 'active' : ''} onClick={() => setServiceFilter(value)}>{label}</button>)}
        </div>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} aria-label="Filtrer par statut">
          <option value="all">Tous les statuts</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {loading
        ? <div className="restaurant-empty">Chargement du service…</div>
        : activeRows.length === 0
          ? <div className="restaurant-empty restaurant-reservation-empty"><span><Icon name="calendar" size={28}/></span><strong>Aucune réservation pour cette journée</strong><p>Le service est libre. Ajoute une réservation ou partage la page publique.</p><button className="primary-button" onClick={openNewReservation}><Icon name="plus" size={17}/>Ajouter une réservation</button></div>
          : filteredRows.length === 0
            ? <div className="restaurant-empty"><Icon name="search" size={26}/><strong>Aucun résultat</strong><span>Modifie les filtres ou la recherche.</span></div>
            : <div className="restaurant-reservation-timeline">{filteredRows.map((row) => {
                const reservationTime = new Date(row.reservation_at);
                const endTime = new Date(reservationTime.getTime() + row.duration_minutes * 60000);
                const nextAction = row.status === 'pending'
                  ? { status: 'confirmed' as RestaurantReservationStatus, label: 'Confirmer' }
                  : row.status === 'confirmed'
                    ? { status: 'seated' as RestaurantReservationStatus, label: 'Installer' }
                    : row.status === 'seated'
                      ? { status: 'completed' as RestaurantReservationStatus, label: 'Terminer' }
                      : null;
                return <article className={`restaurant-reservation-ticket status-${row.status}`} key={row.id}>
                  <div className="restaurant-reservation-ticket-time">
                    <strong>{new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(reservationTime)}</strong>
                    <span>→ {new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(endTime)}</span>
                    <small>{row.duration_minutes} min</small>
                  </div>
                  <div className="restaurant-reservation-ticket-main">
                    <div className="restaurant-reservation-ticket-title">
                      <div>
                        <span className={`restaurant-reservation-status-dot ${row.status}`}/>
                        <h3>{row.guest_name}</h3>
                        <span className="restaurant-reservation-party"><Icon name="users" size={14}/>{row.party_size}</span>
                      </div>
                      <span className={`restaurant-reservation-source ${row.source}`}>{row.source === 'online' ? 'En ligne' : 'Interne'}</span>
                    </div>
                    <div className="restaurant-reservation-ticket-details">
                      <span><Icon name="utensils" size={15}/><strong>{row.restaurant_tables?.name ?? 'Table à attribuer'}</strong>{row.restaurant_tables?.area ? ` · ${row.restaurant_tables.area}` : ''}</span>
                      {row.guest_phone && <a href={`tel:${row.guest_phone}`}><Icon name="users" size={15}/>{row.guest_phone}</a>}
                      {row.guest_email && <a href={`mailto:${row.guest_email}`}><Icon name="file" size={15}/>{row.guest_email}</a>}
                    </div>
                    {row.notes && <div className="restaurant-reservation-ticket-note"><Icon name="alert" size={15}/><span>{row.notes}</span></div>}
                  </div>
                  <div className="restaurant-reservation-ticket-actions">
                    <select className={`restaurant-status-select ${row.status}`} value={row.status} onChange={(event) => void setStatus(row, event.target.value as RestaurantReservationStatus)}>
                      {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    {nextAction && <button type="button" className="restaurant-reservation-next-action" onClick={() => void setStatus(row, nextAction.status)}>{nextAction.label}<Icon name="chevronRight" size={16}/></button>}
                  </div>
                </article>;
              })}</div>}
    </section>
  </div>;
}
