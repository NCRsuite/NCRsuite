import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { supabase } from '../lib/supabase';
import { downloadCalendarFile, googleCalendarUrl, outlookCalendarUrl } from '../lib/calendar';

interface ManagedBooking {
  appointment_id: string;
  token: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  starts_at: string;
  ends_at: string;
  notes: string | null;
  amount_cents: number;
  organization_name: string;
  organization_slug: string;
  primary_color: string;
  logo_url: string | null;
  banner_url: string | null;
  organization_address: string | null;
  organization_hours_text: string | null;
  organization_practical_info: string | null;
  show_ncr_branding: boolean;
  timezone: string;
  cancel_notice_hours: number;
  service_id: string;
  service_name: string;
  service_duration_minutes: number;
  staff_id: string;
  staff_name: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  can_cancel: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  cancellation_policy: string | null;
  privacy_notice: string | null;
}

interface AvailableSlot {
  slot_start: string;
  slot_end: string;
  staff_id: string;
  staff_name: string;
}

const statusLabels: Record<ManagedBooking['status'], string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  completed: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absent'
};

const currencyFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

function dateToInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

export function PublicBookingManagePage() {
  const { token = '' } = useParams();
  const [booking, setBooking] = useState<ManagedBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [date, setDate] = useState(dateToInput(addDays(new Date(), 1)));
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadBooking() {
    setLoading(true);
    setError('');
    if (!supabase) {
      setError('La gestion de réservation n’est pas configurée.');
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await supabase.rpc('get_public_booking', { p_token: token });
    if (loadError) setError(loadError.message);
    else if (!data) setError('Cette réservation est introuvable.');
    else setBooking(data as ManagedBooking);
    setLoading(false);
  }

  useEffect(() => { loadBooking(); }, [token]);

  useEffect(() => {
    let active = true;
    async function loadSlots() {
      setSlots([]);
      setSelectedSlot(null);
      if (!rescheduling || !booking || !supabase) return;
      setLoadingSlots(true);
      const { data, error: slotsError } = await supabase.rpc('get_public_available_slots', {
        p_slug: booking.organization_slug,
        p_service_id: booking.service_id,
        p_date: date,
        p_staff_id: null
      });
      if (!active) return;
      if (slotsError) setError(slotsError.message);
      else setSlots((data ?? []) as AvailableSlot[]);
      setLoadingSlots(false);
    }
    loadSlots();
    return () => { active = false; };
  }, [rescheduling, booking, date]);

  const displayedSlots = useMemo(() => {
    const unique = new Map<string, AvailableSlot>();
    for (const slot of slots) {
      if (!unique.has(slot.slot_start)) unique.set(slot.slot_start, slot);
    }
    return Array.from(unique.values());
  }, [slots]);

  async function cancelBooking() {
    if (!supabase || !booking) return;
    if (!window.confirm('Confirmer l’annulation de ce rendez-vous ?')) return;
    setBusy(true);
    setError('');
    setSuccess('');
    const { error: cancelError } = await supabase.rpc('cancel_public_booking', {
      p_token: token,
      p_reason: 'Annulation demandée par le client depuis le lien public'
    });
    if (cancelError) setError(cancelError.message);
    else {
      setSuccess('Le rendez-vous a bien été annulé.');
      await loadBooking();
    }
    setBusy(false);
  }

  async function saveReschedule() {
    if (!supabase || !booking || !selectedSlot) return;
    setBusy(true);
    setError('');
    setSuccess('');
    const { error: rescheduleError } = await supabase.rpc('reschedule_public_booking', {
      p_token: token,
      p_staff_id: selectedSlot.staff_id,
      p_starts_at: selectedSlot.slot_start
    });
    if (rescheduleError) {
      setError(rescheduleError.message);
      setSelectedSlot(null);
    } else {
      setSuccess('Le rendez-vous a bien été déplacé.');
      setRescheduling(false);
      await loadBooking();
    }
    setBusy(false);
  }

  if (loading) {
    return <div className="public-booking-state"><img src="/brand/ncr-suite-icon.png" alt="" /><p>Chargement de la réservation…</p></div>;
  }

  if (!booking) {
    return (
      <div className="public-booking-state public-error-state">
        <img src="/brand/ncr-suite-logo-horizontal.png" alt="NCR Suite" />
        <h1>Réservation introuvable</h1>
        <p>{error}</p>
        <Link className="secondary-button" to="/connexion">Accéder à NCR Suite</Link>
      </div>
    );
  }

  const style = { '--accent': booking.primary_color } as CSSProperties;
  const canManage = booking.can_cancel && ['pending', 'confirmed'].includes(booking.status);
  const canAddToCalendar = booking.status === 'confirmed';
  const calendarEvent = {
    title: `${booking.service_name} — ${booking.organization_name}`,
    description: `Rendez-vous avec ${booking.staff_name}. Référence ${booking.appointment_id.slice(0, 8).toUpperCase()}.`,
    startsAt: booking.starts_at,
    endsAt: booking.ends_at,
    location: booking.organization_address || booking.organization_name
  };

  return (
    <div className="public-booking-page" style={style}>
      <header className="public-booking-brand">
        <div className="public-business-mark">{booking.logo_url ? <img src={booking.logo_url} alt="" /> : booking.organization_name.slice(0, 1).toUpperCase()}</div>
        <div><strong>{booking.organization_name}</strong><span>Gestion de votre réservation</span></div>
      </header>

      <main className="public-booking-container booking-manage-container">
        <section className="public-booking-hero compact-hero">
          <p className="eyebrow">VOTRE RENDEZ-VOUS</p>
          <h1>Bonjour {booking.client_name}.</h1>
          <p>Retrouvez ici les informations de votre rendez-vous et les actions encore disponibles.</p>
        </section>

        {error && <div className="error-message public-manage-message" role="alert">{error}</div>}
        {success && <div className="success-message public-manage-message" role="status">{success}</div>}

        <section className="public-manage-card">
          <div className="public-manage-status-row">
            <span className={`appointment-status ${booking.status}`}>{statusLabels[booking.status]}</span>
            <small>Référence {booking.appointment_id.slice(0, 8).toUpperCase()}</small>
          </div>
          <div className="public-manage-main">
            <div className="public-manage-date"><strong>{timeFormatter.format(new Date(booking.starts_at))}</strong><span>{dateFormatter.format(new Date(booking.starts_at))}</span></div>
            <div className="public-manage-service"><span>Prestation</span><strong>{booking.service_name}</strong><small>Avec {booking.staff_name}</small></div>
            <div className="public-manage-price"><span>Tarif</span><strong>{currencyFormatter.format((booking.amount_cents ?? 0) / 100)}</strong></div>
          </div>
          <div className="public-manage-contact">
            <div><span>Coordonnées de réservation</span><strong>{booking.client_email || booking.client_phone || 'Non renseigné'}</strong></div>
            <div><span>Modification en ligne</span><strong>{canManage ? `Jusqu’à ${booking.cancel_notice_hours} h avant` : 'Indisponible'}</strong></div>
          </div>

          {canAddToCalendar && (
            <div className="calendar-actions-card">
              <div>
                <strong>Ajouter à votre calendrier</strong>
                <span>Recevez un rappel directement depuis votre téléphone ou votre agenda.</span>
              </div>
              <div className="calendar-provider-links">
                <a href={googleCalendarUrl(calendarEvent)} target="_blank" rel="noreferrer">Google Agenda</a>
                <a href={outlookCalendarUrl(calendarEvent)} target="_blank" rel="noreferrer">Outlook</a>
                <button type="button" onClick={() => downloadCalendarFile(calendarEvent, `rendez-vous-${booking.organization_slug}.ics`)}>Apple / .ics</button>
              </div>
            </div>
          )}

          {canManage && !rescheduling && (
            <div className="public-success-actions">
              <button className="primary-button" type="button" onClick={() => setRescheduling(true)}><Icon name="calendar" size={18} />Déplacer le rendez-vous</button>
              <button className="secondary-button danger-button" type="button" onClick={cancelBooking} disabled={busy}>Annuler le rendez-vous</button>
            </div>
          )}

          {!canManage && booking.status !== 'cancelled' && (
            <div className="info-message public-manage-note">Le délai de modification en ligne est dépassé. Contactez directement l’établissement pour toute demande.</div>
          )}
        </section>

        {rescheduling && canManage && (
          <section className="public-manage-card public-reschedule-card">
            <div className="public-step-heading"><span>↻</span><div><h2>Choisir un nouveau créneau</h2><p>La prestation reste identique. Le professionnel peut changer selon les disponibilités.</p></div></div>
            <label className="public-date-field">Nouvelle date<input type="date" min={dateToInput(new Date())} max={dateToInput(addDays(new Date(), 365))} value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <div className="public-slots">
              {loadingSlots && <div className="public-slots-state">Recherche des disponibilités…</div>}
              {!loadingSlots && displayedSlots.length === 0 && <div className="public-slots-state">Aucun créneau disponible ce jour-là.</div>}
              {!loadingSlots && displayedSlots.map((slot) => (
                <button key={`${slot.slot_start}-${slot.staff_id}`} type="button" className={selectedSlot?.slot_start === slot.slot_start && selectedSlot.staff_id === slot.staff_id ? 'selected' : ''} onClick={() => setSelectedSlot(slot)}>
                  <strong>{timeFormatter.format(new Date(slot.slot_start))}</strong><small>{slot.staff_name}</small>
                </button>
              ))}
            </div>
            <div className="public-success-actions">
              <button className="secondary-button" type="button" onClick={() => { setRescheduling(false); setSelectedSlot(null); }}>Retour</button>
              <button className="primary-button" type="button" disabled={!selectedSlot || busy} onClick={saveReschedule}>{busy ? 'Modification…' : 'Valider ce nouveau créneau'}</button>
            </div>
          </section>
        )}

        <section className="public-manage-card public-client-information-card">
          <div className="public-step-heading"><span>i</span><div><h2>Informations utiles</h2><p>Retrouvez les règles appliquées à votre réservation et les coordonnées de l’établissement.</p></div></div>
          <div className="public-client-info-grid">
            <div>
              <span>Modification et annulation</span>
              <p>{booking.cancellation_policy || `Les actions en ligne restent possibles jusqu’à ${booking.cancel_notice_hours} h avant le rendez-vous.`}</p>
            </div>
            <div>
              <span>Utilisation de vos données</span>
              <p>{booking.privacy_notice || 'Vos coordonnées sont utilisées uniquement pour organiser, confirmer et suivre ce rendez-vous.'}</p>
            </div>
          </div>
          {(booking.organization_address || booking.organization_hours_text || booking.organization_practical_info) && (
            <div className="public-client-info-grid public-establishment-details">
              {booking.organization_address && <div><span>Adresse</span><p>{booking.organization_address}</p></div>}
              {booking.organization_hours_text && <div><span>Horaires</span><p>{booking.organization_hours_text}</p></div>}
              {booking.organization_practical_info && <div><span>Informations pratiques</span><p>{booking.organization_practical_info}</p></div>}
            </div>
          )}
          {(booking.contact_email || booking.contact_phone) && (
            <div className="public-establishment-contact">
              <strong>Contacter {booking.organization_name}</strong>
              <div>
                {booking.contact_email && <a href={`mailto:${booking.contact_email}`}>{booking.contact_email}</a>}
                {booking.contact_phone && <a href={`tel:${booking.contact_phone.replace(/\s+/g, '')}`}>{booking.contact_phone}</a>}
              </div>
            </div>
          )}
        </section>
      </main>
      {booking.show_ncr_branding && <footer className="public-booking-footer">Propulsé par <strong>NCR Suite</strong></footer>}
    </div>
  );
}
