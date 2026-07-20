import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
}

interface PublicBookingAvailability {
  available: boolean;
  manual_assignment?: boolean;
  reason?: string | null;
}

function errorMessage(caught: unknown, fallback: string) {
  if (caught instanceof Error) return caught.message;
  if (caught && typeof caught === 'object' && 'message' in caught && typeof caught.message === 'string') return caught.message;
  return fallback;
}

const emptyForm = { name: '', email: '', phone: '', partySize: '2', date: '', time: '19:30', notes: '' };

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
    supabase.rpc('get_public_restaurant_booking_config', { p_slug: slug }).then(({ data, error: loadError }) => {
      if (loadError) setError(loadError.message);
      else setConfig((Array.isArray(data) ? data[0] : data) as PublicBookingConfig | null);
      setLoading(false);
    });
  }, [slug]);

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
        if (!canceled) setAvailability({ available: false, reason: errorMessage(caught, 'Impossible de vérifier ce créneau.') });
      } finally {
        if (!canceled) setCheckingAvailability(false);
      }
    }, 300);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [slug, form.date, form.time, form.partySize]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !slug) return;
    if (availability && !availability.available) {
      setError(availability.reason || 'Aucune table n’est disponible sur ce créneau.');
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
      setSuccess('Votre demande a bien été envoyée et le créneau a été provisoirement bloqué. Le restaurant pourra la confirmer depuis NCR Suite.');
      setForm(emptyForm);
      setAvailability(null);
    } catch (caught) {
      setError(errorMessage(caught, 'Réservation impossible.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="public-restaurant-page"><div className="public-restaurant-loading">Chargement…</div></div>;
  if (!config?.booking_enabled) return <div className="public-restaurant-page"><div className="public-restaurant-error"><h1>Réservation indisponible</h1><p>{error || 'Ce restaurant ne prend pas encore de réservation en ligne.'}</p></div></div>;

  return <div className="public-restaurant-page public-booking-page" style={{ '--restaurant-brand': config.primary_color } as React.CSSProperties}>
    <main className="public-booking-card">
      {config.logo_url && <img className="public-booking-logo" src={config.logo_url} alt=""/>}
      <p className="public-booking-eyebrow">RÉSERVATION EN LIGNE</p>
      <h1>{config.public_name || config.organization_name}</h1>
      <p>{config.booking_welcome_text || 'Choisissez votre date et envoyez votre demande de réservation.'}</p>
      {error && <div className="public-booking-message error">{error}</div>}
      {success
        ? <div className="public-booking-success"><strong>Demande envoyée</strong><p>{success}</p><button onClick={() => setSuccess('')}>Faire une autre demande</button></div>
        : <form onSubmit={submit}>
          <label>Nom *<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label>
          <label>Nombre de personnes *<input type="number" min="1" max="30" required value={form.partySize} onChange={(e) => setForm({ ...form, partySize: e.target.value })}/></label>
          <label>Date *<input type="date" min={new Date().toISOString().slice(0, 10)} required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}/></label>
          <label>Heure *<input type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}/></label>
          {(form.date && form.time) && <div className={`public-booking-availability ${checkingAvailability ? 'checking' : availability?.available ? 'available' : 'unavailable'}`}>
            {checkingAvailability
              ? 'Vérification des tables disponibles…'
              : availability?.available
                ? availability.manual_assignment
                  ? 'Créneau disponible — le restaurant attribuera la table.'
                  : 'Une table adaptée est disponible sur ce créneau.'
                : availability?.reason || 'Aucune table disponible sur ce créneau.'}
          </div>}
          <label>E-mail<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/></label>
          <label>Téléphone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}/></label>
          <label className="full">Demande particulière<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></label>
          <button disabled={saving || checkingAvailability || availability?.available === false}>{saving ? 'Envoi…' : 'Envoyer la demande'}</button>
        </form>}
      <footer>{[config.booking_contact_phone, config.booking_contact_email].filter(Boolean).join(' · ')}</footer>
    </main>
  </div>;
}
