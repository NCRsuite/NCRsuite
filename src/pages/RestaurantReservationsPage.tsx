import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { organizationHasFeature } from '../config/planEntitlements';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
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

function errorMessage(caught: unknown, fallback: string) {
  if (caught instanceof Error) return caught.message;
  if (caught && typeof caught === 'object' && 'message' in caught && typeof caught.message === 'string') return caught.message;
  return fallback;
}

function intervalsOverlap(startA: string, durationA: number, startB: string, durationB: number) {
  const aStart = new Date(startA).getTime();
  const aEnd = aStart + durationA * 60000;
  const bStart = new Date(startB).getTime();
  const bEnd = bStart + durationB * 60000;
  return aStart < bEnd && bStart < aEnd;
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

export function RestaurantReservationsPage() {
  const { organization, updateBookingSettings } = useOrganization();
  const { user, demoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<RestaurantReservationRecord[]>([]);
  const [tables, setTables] = useState<RestaurantTableRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
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
      setError(errorMessage(caught, 'Activation de la page publique impossible.'));
    } finally {
      setActivatingPublicPage(false);
    }
  }

  async function load() {
    if (!organization) return;
    setLoading(true);
    setError('');
    const start = new Date(`${day}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    if (demoMode || !supabase) {
      setRows(JSON.parse(localStorage.getItem(`ncr-restaurant-reservations-${organization.id}`) || '[]'));
      setTables(JSON.parse(localStorage.getItem(`ncr-restaurant-tables-${organization.id}`) || '[]'));
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
      if (firstError) setError(firstError.message);
      setRows((reservationResult.data ?? []) as RestaurantReservationRecord[]);
      setTables((tableResult.data ?? []) as RestaurantTableRecord[]);
    }
    setLoading(false);
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
          const reservations = JSON.parse(localStorage.getItem(`ncr-restaurant-reservations-${organization.id}`) || '[]') as RestaurantReservationRecord[];
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
        if (!canceled) setAvailabilityError(errorMessage(caught, 'Impossible de vérifier les tables disponibles.'));
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
        const allReservations = JSON.parse(localStorage.getItem(`ncr-restaurant-reservations-${organization.id}`) || '[]') as RestaurantReservationRecord[];
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
      setForm({ ...emptyForm, reservationAt: defaultDate() });
      setSearchParams({});
      setSuccess('La réservation a été créée et le créneau de la table est bloqué.');
    } catch (caught) {
      setError(errorMessage(caught, 'Création impossible.'));
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(row: RestaurantReservationRecord, status: RestaurantReservationStatus) {
    if (!organization) return;
    try {
      if (demoMode || !supabase) {
        const next = rows.map((item) => item.id === row.id ? { ...item, status } : item);
        localStorage.setItem(`ncr-restaurant-reservations-${organization.id}`, JSON.stringify(next));
        setRows(next);
      } else {
        const { error: updateError } = await supabase
          .from('restaurant_reservations')
          .update({ status })
          .eq('organization_id', organization.id)
          .eq('id', row.id);
        if (updateError) throw updateError;
        setRows((current) => current.map((item) => item.id === row.id ? { ...item, status } : item));
      }
    } catch (caught) {
      setError(errorMessage(caught, 'Mise à jour impossible.'));
    }
  }

  const activeRows = useMemo(() => rows.filter((row) => row.reservation_at.slice(0, 10) === day), [rows, day]);
  const covers = activeRows
    .filter((row) => !['canceled', 'no_show'].includes(row.status))
    .reduce((total, row) => total + row.party_size, 0);

  if (!organization) return null;

  return <div className="page restaurant-page">
    <header className="page-header">
      <div>
        <p className="eyebrow">RESTAURATION</p>
        <h1>Réservations</h1>
        <p>Centralise les réservations internes et celles reçues depuis le lien public.</p>
      </div>
      <div className="header-actions">
        {publicPageActive && <a className="secondary-button" href={`/r/${organization.slug}/reserver`} target="_blank" rel="noreferrer"><Icon name="eye" size={18}/>Page publique</a>}
        {hasOnline && !publicPageActive && canManagePublicPage && (
          <button className="secondary-button" onClick={() => void activatePublicPage()} disabled={activatingPublicPage}>
            <Icon name="eye" size={18}/>{activatingPublicPage ? 'Activation…' : 'Activer la page publique'}
          </button>
        )}
        <button className="primary-button" onClick={() => setSearchParams({ new: '1' })}><Icon name="plus" size={18}/>Nouvelle réservation</button>
      </div>
    </header>

    {hasOnline && !publicPageActive && (
      <div className="info-message page-message">
        La réservation en ligne est incluse dans votre formule, mais la page publique est désactivée. Active-la ici ou depuis les paramètres de l’entreprise.
      </div>
    )}

    {formOpen && <section className="panel restaurant-form-panel">
      <div className="panel-header">
        <div><p className="eyebrow">NOUVELLE RÉSERVATION</p><h2>Ajouter des clients</h2></div>
        <button className="secondary-button compact-button" onClick={() => setSearchParams({})}>Fermer</button>
      </div>
      <form className="restaurant-form-grid" onSubmit={createReservation}>
        <label>Nom *<input autoFocus required value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })}/></label>
        <label>Nombre de personnes *<input type="number" min="1" max="100" required value={form.partySize} onChange={(e) => setForm({ ...form, partySize: e.target.value })}/></label>
        <label>Date et heure *<input type="datetime-local" required value={form.reservationAt} onChange={(e) => setForm({ ...form, reservationAt: e.target.value })}/></label>
        <label>Durée estimée<select value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}><option value="60">1 h</option><option value="90">1 h 30</option><option value="120">2 h</option><option value="150">2 h 30</option><option value="180">3 h</option></select></label>
        <label>E-mail<input type="email" value={form.guestEmail} onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}/></label>
        <label>Téléphone<input value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}/></label>
        <label className="full-field">Table
          <select value={form.tableId} onChange={(e) => setForm({ ...form, tableId: e.target.value })} disabled={checkingAvailability} required={tables.length > 0}>
            <option value="">{tables.length > 0 ? 'Choisir une table disponible' : 'Aucune table configurée — attribution ultérieure'}</option>
            {availableTables.map((table) => <option key={table.id} value={table.id}>{table.name} · {table.area} · {table.capacity} places</option>)}
          </select>
          <span className={`restaurant-availability-note ${availabilityError ? 'error' : availableTables.length === 0 ? 'warning' : 'success'}`}>
            {checkingAvailability
              ? 'Vérification des disponibilités…'
              : availabilityError
                ? availabilityError
                : availableTables.length > 0
                  ? `${availableTables.length} table${availableTables.length > 1 ? 's' : ''} disponible${availableTables.length > 1 ? 's' : ''} pour ce créneau.`
                  : tables.length > 0
                    ? 'Aucune table adaptée n’est libre : la réservation est bloquée sur ce créneau.'
                    : 'Aucune table n’est encore configurée : la réservation restera sans table.'}
          </span>
        </label>
        <label className="full-field">Notes<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></label>
        <div className="form-actions full-field">
          <button type="button" className="secondary-button" onClick={() => setSearchParams({})}>Annuler</button>
          <button className="primary-button" disabled={saving || checkingAvailability || (tables.length > 0 && availableTables.length === 0)}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </section>}

    {error && <div className="error-message page-message">{error}</div>}
    {success && <div className="success-message page-message">{success}</div>}

    <section className="panel restaurant-list-panel">
      <div className="restaurant-toolbar">
        <div><p className="eyebrow">SERVICE</p><h2>{activeRows.length} réservation{activeRows.length > 1 ? 's' : ''} · {covers} couverts</h2></div>
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)}/>
      </div>
      {loading
        ? <div className="restaurant-empty">Chargement…</div>
        : activeRows.length === 0
          ? <div className="restaurant-empty"><Icon name="calendar" size={30}/><strong>Aucune réservation</strong><span>Ajoute une réservation ou partage la page publique.</span></div>
          : <div className="restaurant-card-list">{activeRows.map((row) => <article className="restaurant-record-card restaurant-reservation-card" key={row.id}>
            <span className="restaurant-time-block">{new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(row.reservation_at))}</span>
            <div className="restaurant-record-main">
              <strong>{row.guest_name} · {row.party_size} pers.</strong>
              <span>{row.restaurant_tables?.name ? `${row.restaurant_tables.name} · ${row.restaurant_tables.area}` : 'Table à attribuer'} · source {row.source === 'online' ? 'en ligne' : 'interne'}</span>
              <small>{[row.guest_phone, row.guest_email, row.notes].filter(Boolean).join(' · ') || 'Aucune précision'}</small>
            </div>
            <select className={`restaurant-status-select ${row.status}`} value={row.status} onChange={(e) => void setStatus(row, e.target.value as RestaurantReservationStatus)}>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </article>)}</div>}
    </section>
  </div>;
}
