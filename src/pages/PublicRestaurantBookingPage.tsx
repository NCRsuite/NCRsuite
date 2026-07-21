import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { restaurantErrorMessage, roundRestaurantDateToSlot, toRestaurantLocalDateKey } from '../features/restaurant/runtime';
import { supabase } from '../lib/supabase';

interface PublicBookingConfig {
  organization_name: string;
  public_name: string | null;
  primary_color: string;
  logo_url: string | null;
  booking_enabled: boolean;
  booking_welcome_text: string | null;
  booking_contact_phone: string | null;
  booking_contact_email: string | null;
  confirmation_mode: 'automatic' | 'manual';
  slot_interval: number;
  min_notice_hours: number;
  max_days_ahead: number;
  cancel_notice_hours: number;
}

interface PublicBookingAvailability {
  available: boolean;
  manual_assignment?: boolean;
  reason?: string | null;
}

const emptyForm = { name: '', email: '', phone: '', partySize: '2', date: '', time: '', notes: '' };

function timeValue(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function nextBookingSlot(config: PublicBookingConfig) {
  const earliest = new Date(Date.now() + Math.max(0, config.min_notice_hours) * 60 * 60 * 1000);
  return roundRestaurantDateToSlot(earliest, config.slot_interval, 'ceil');
}

export function PublicRestaurantBookingPage() {
  const { slug = '' } = useParams();
  const [config, setConfig] = useState<PublicBookingConfig | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [availability, setAvailability] = useState<PublicBookingAvailability | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!supabase || !slug) {
      setLoading(false);
      return;
    }
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      const { data, error: loadError } = await supabase!.rpc('get_public_restaurant_booking_config', { p_slug: slug });
      if (!active) return;
      if (loadError) {
        setError(restaurantErrorMessage(loadError, 'Impossible de charger la page de réservation.'));
      } else {
        const loaded = (Array.isArray(data) ? data[0] : data) as PublicBookingConfig | null;
        setConfig(loaded);
        if (loaded?.booking_enabled) {
          const initial = nextBookingSlot(loaded);
          setForm((current) => current.date ? current : { ...current, date: toRestaurantLocalDateKey(initial), time: timeValue(initial) });
        }
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [slug]);

  const bookingWindow = useMemo(() => {
    if (!config) return null;
    const earliest = nextBookingSlot(config);
    const latest = new Date();
    latest.setDate(latest.getDate() + Math.max(1, config.max_days_ahead));
    latest.setHours(23, 59, 59, 999);
    return {
      earliest,
      latest,
      minDate: toRestaurantLocalDateKey(earliest),
      maxDate: toRestaurantLocalDateKey(latest),
      minTime: timeValue(earliest)
    };
  }, [config]);

  useEffect(() => {
    if (!supabase || !slug || !form.date || !form.time || !form.partySize) {
      setAvailability(null);
      return;
    }

    const client = supabase;
    const date = new Date(`${form.date}T${form.time}:00`);
    if (Number.isNaN(date.getTime())) return;

    let canceled = false;
    const timeout = window.setTimeout(async () => {
      setCheckingAvailability(true);
      setAvailability(null);
      try {
        const { data, error: availabilityError } = await client.rpc('get_public_restaurant_booking_availability', {
          p_slug: slug,
          p_party_size: Math.max(1, Math.min(30, Number(form.partySize) || 1)),
          p_reservation_at: date.toISOString(),
          p_duration_minutes: 120
        });
        if (availabilityError) throw availabilityError;
        if (!canceled) setAvailability((Array.isArray(data) ? data[0] : data) as PublicBookingAvailability);
      } catch (caught) {
        if (!canceled) setAvailability({ available: false, reason: restaurantErrorMessage(caught, 'Impossible de vérifier ce créneau.') });
      } finally {
        if (!canceled) setCheckingAvailability(false);
      }
    }, 350);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [slug, form.date, form.time, form.partySize]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !slug || !config) return;
    if (checkingAvailability || availability?.available !== true) {
      setError(availability?.reason || 'Attends la confirmation de disponibilité du créneau.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const reservationAt = new Date(`${form.date}T${form.time}:00`);
      const { error: bookingError } = await supabase.rpc('create_public_restaurant_reservation', {
        p_slug: slug,
        p_guest_name: form.name,
        p_guest_email: form.email || null,
        p_guest_phone: form.phone || null,
        p_party_size: Number(form.partySize),
        p_reservation_at: reservationAt.toISOString(),
        p_notes: form.notes || null
      });
      if (bookingError) throw bookingError;
      setSuccess(config.confirmation_mode === 'automatic'
        ? 'Votre réservation est confirmée. Le créneau et la table sont désormais bloqués.'
        : 'Votre demande a bien été envoyée. Le créneau est provisoirement bloqué en attendant la confirmation du restaurant.');
      const initial = nextBookingSlot(config);
      setForm({ ...emptyForm, partySize: '2', date: toRestaurantLocalDateKey(initial), time: timeValue(initial) });
      setAvailability(null);
    } catch (caught) {
      setError(restaurantErrorMessage(caught, 'Réservation impossible.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="public-restaurant-page"><div className="public-restaurant-loading">Chargement…</div></div>;
  if (!config?.booking_enabled) return <div className="public-restaurant-page"><div className="public-restaurant-error"><h1>Réservation indisponible</h1><p>{error || 'Ce restaurant ne prend pas encore de réservation en ligne.'}</p></div></div>;

  const minTime = bookingWindow && form.date === bookingWindow.minDate ? bookingWindow.minTime : undefined;

  return <div className="public-restaurant-page public-booking-page" style={{ '--restaurant-brand': config.primary_color } as React.CSSProperties}>
    <main className="public-booking-card">
      {config.logo_url && <img className="public-booking-logo" src={config.logo_url} alt=""/>}
      <p className="public-booking-eyebrow">RÉSERVATION EN LIGNE</p>
      <h1>{config.public_name || config.organization_name}</h1>
      <p>{config.booking_welcome_text || 'Choisissez votre date et envoyez votre demande de réservation.'}</p>
      <div className="public-booking-rules">
        <span>Créneaux toutes les {config.slot_interval} min</span>
        <span>Réservation jusqu’à {config.max_days_ahead} jours à l’avance</span>
        {config.min_notice_hours > 0 && <span>Délai minimum : {config.min_notice_hours} h</span>}
      </div>
      {error && <div className="public-booking-message error">{error}</div>}
      {success
        ? <div className="public-booking-success"><strong>{config.confirmation_mode === 'automatic' ? 'Réservation confirmée' : 'Demande envoyée'}</strong><p>{success}</p><button type="button" onClick={() => setSuccess('')}>Faire une autre demande</button></div>
        : <form onSubmit={submit}>
          <label>Nom *<input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label>
          <label>Nombre de personnes *<input type="number" min="1" max="30" required value={form.partySize} onChange={(e) => { setAvailability(null); setForm({ ...form, partySize: e.target.value }); }}/></label>
          <label>Date *<input type="date" min={bookingWindow?.minDate} max={bookingWindow?.maxDate} required value={form.date} onChange={(e) => { setAvailability(null); setForm({ ...form, date: e.target.value }); }}/></label>
          <label>Heure *<input type="time" min={minTime} step={Math.max(5, config.slot_interval) * 60} required value={form.time} onChange={(e) => { setAvailability(null); setForm({ ...form, time: e.target.value }); }}/></label>
          {(form.date && form.time) && <div className={`public-booking-availability ${checkingAvailability ? 'checking' : availability?.available ? 'available' : 'unavailable'}`} aria-live="polite">
            {checkingAvailability
              ? 'Vérification des tables disponibles…'
              : availability?.available
                ? availability.manual_assignment
                  ? 'Créneau disponible — le restaurant attribuera la table.'
                  : 'Une table adaptée est disponible sur ce créneau.'
                : availability?.reason || 'Sélectionne un créneau pour vérifier sa disponibilité.'}
          </div>}
          <label>E-mail<input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/></label>
          <label>Téléphone<input inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}/></label>
          <label className="full">Demande particulière<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></label>
          <button disabled={saving || checkingAvailability || availability?.available !== true}>{saving ? 'Envoi…' : config.confirmation_mode === 'automatic' ? 'Confirmer la réservation' : 'Envoyer la demande'}</button>
        </form>}
      <footer>{[config.booking_contact_phone, config.booking_contact_email].filter(Boolean).join(' · ')}</footer>
    </main>
  </div>;
}
