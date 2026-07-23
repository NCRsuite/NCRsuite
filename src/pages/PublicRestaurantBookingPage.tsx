import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { roundRestaurantDateToSlot, toRestaurantLocalDateKey } from '../features/restaurant/runtime';
import { supabase } from '../lib/supabase';

type Language = 'fr' | 'en' | 'es' | 'it';

interface PublicBookingConfig {
  organization_name: string;
  public_name: string | null;
  primary_color: string;
  logo_url: string | null;
  booking_enabled: boolean;
  booking_welcome_text: string | null;
  booking_welcome_text_en: string | null;
  booking_welcome_text_es: string | null;
  booking_welcome_text_it: string | null;
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
const languageLabels: Record<Language, string> = { fr: 'FR', en: 'EN', es: 'ES', it: 'IT' };

const ui: Record<Language, {
  languageNav: string; loading: string; unavailableTitle: string; unavailableMessage: string;
  eyebrow: string; defaultWelcome: string; slotsEvery: (value: number) => string;
  ahead: (value: number) => string; minimumNotice: (value: number) => string;
  confirmedTitle: string; sentTitle: string; confirmedMessage: string; sentMessage: string;
  another: string; name: string; partySize: string; date: string; time: string;
  checking: string; manualAvailable: string; available: string; selectSlot: string;
  unavailableSlot: string; email: string; phone: string; notes: string;
  sending: string; confirm: string; send: string; waitAvailability: string;
  loadError: string; availabilityError: string; bookingError: string; viewMenu: string;
}> = {
  fr: {
    languageNav: 'Choisir la langue', loading: 'Chargement…', unavailableTitle: 'Réservation indisponible', unavailableMessage: 'Ce restaurant ne prend pas encore de réservation en ligne.', eyebrow: 'RÉSERVATION EN LIGNE', defaultWelcome: 'Choisissez votre date et envoyez votre demande de réservation.',
    slotsEvery: (value) => `Créneaux toutes les ${value} min`, ahead: (value) => `Réservation jusqu’à ${value} jours à l’avance`, minimumNotice: (value) => `Délai minimum : ${value} h`,
    confirmedTitle: 'Réservation confirmée', sentTitle: 'Demande envoyée', confirmedMessage: 'Votre réservation est confirmée. Le créneau et la table sont désormais bloqués.', sentMessage: 'Votre demande a bien été envoyée. Le créneau est provisoirement bloqué en attendant la confirmation du restaurant.', another: 'Faire une autre demande',
    name: 'Nom', partySize: 'Nombre de personnes', date: 'Date', time: 'Heure', checking: 'Vérification des tables disponibles…', manualAvailable: 'Créneau disponible — le restaurant attribuera la table.', available: 'Une table adaptée est disponible sur ce créneau.', selectSlot: 'Sélectionne un créneau pour vérifier sa disponibilité.', unavailableSlot: 'Ce créneau n’est pas disponible. Choisis une autre date ou une autre heure.', email: 'E-mail', phone: 'Téléphone', notes: 'Demande particulière', sending: 'Envoi…', confirm: 'Confirmer la réservation', send: 'Envoyer la demande', waitAvailability: 'Attends la confirmation de disponibilité du créneau.', loadError: 'Impossible de charger la page de réservation.', availabilityError: 'Impossible de vérifier ce créneau.', bookingError: 'Réservation impossible.', viewMenu: 'Voir la carte',
  },
  en: {
    languageNav: 'Choose language', loading: 'Loading…', unavailableTitle: 'Booking unavailable', unavailableMessage: 'This restaurant is not accepting online bookings yet.', eyebrow: 'ONLINE BOOKING', defaultWelcome: 'Choose a date and send your booking request.',
    slotsEvery: (value) => `Slots every ${value} min`, ahead: (value) => `Book up to ${value} days ahead`, minimumNotice: (value) => `Minimum notice: ${value} h`,
    confirmedTitle: 'Booking confirmed', sentTitle: 'Request sent', confirmedMessage: 'Your booking is confirmed. The time slot and table are now reserved.', sentMessage: 'Your request has been sent. The time slot is temporarily held while the restaurant confirms it.', another: 'Make another request',
    name: 'Name', partySize: 'Number of guests', date: 'Date', time: 'Time', checking: 'Checking available tables…', manualAvailable: 'Time slot available — the restaurant will assign the table.', available: 'A suitable table is available for this time slot.', selectSlot: 'Select a time slot to check availability.', unavailableSlot: 'This time slot is unavailable. Choose another date or time.', email: 'Email', phone: 'Phone', notes: 'Special request', sending: 'Sending…', confirm: 'Confirm booking', send: 'Send request', waitAvailability: 'Wait for the availability check to finish.', loadError: 'Unable to load the booking page.', availabilityError: 'Unable to check this time slot.', bookingError: 'Unable to complete the booking.', viewMenu: 'View menu',
  },
  es: {
    languageNav: 'Elegir idioma', loading: 'Cargando…', unavailableTitle: 'Reserva no disponible', unavailableMessage: 'Este restaurante todavía no acepta reservas en línea.', eyebrow: 'RESERVA EN LÍNEA', defaultWelcome: 'Elige una fecha y envía tu solicitud de reserva.',
    slotsEvery: (value) => `Turnos cada ${value} min`, ahead: (value) => `Reserva hasta con ${value} días de antelación`, minimumNotice: (value) => `Antelación mínima: ${value} h`,
    confirmedTitle: 'Reserva confirmada', sentTitle: 'Solicitud enviada', confirmedMessage: 'Tu reserva está confirmada. El horario y la mesa ya están bloqueados.', sentMessage: 'Tu solicitud se ha enviado. El horario queda bloqueado provisionalmente hasta la confirmación del restaurante.', another: 'Hacer otra solicitud',
    name: 'Nombre', partySize: 'Número de personas', date: 'Fecha', time: 'Hora', checking: 'Comprobando las mesas disponibles…', manualAvailable: 'Horario disponible — el restaurante asignará la mesa.', available: 'Hay una mesa adecuada disponible para este horario.', selectSlot: 'Selecciona un horario para comprobar la disponibilidad.', unavailableSlot: 'Este horario no está disponible. Elige otra fecha u hora.', email: 'Correo electrónico', phone: 'Teléfono', notes: 'Petición especial', sending: 'Enviando…', confirm: 'Confirmar la reserva', send: 'Enviar la solicitud', waitAvailability: 'Espera a que termine la comprobación de disponibilidad.', loadError: 'No se puede cargar la página de reservas.', availabilityError: 'No se puede comprobar este horario.', bookingError: 'No se puede completar la reserva.', viewMenu: 'Ver la carta',
  },
  it: {
    languageNav: 'Scegli la lingua', loading: 'Caricamento…', unavailableTitle: 'Prenotazione non disponibile', unavailableMessage: 'Questo ristorante non accetta ancora prenotazioni online.', eyebrow: 'PRENOTAZIONE ONLINE', defaultWelcome: 'Scegli una data e invia la tua richiesta di prenotazione.',
    slotsEvery: (value) => `Fasce ogni ${value} min`, ahead: (value) => `Prenotazione fino a ${value} giorni prima`, minimumNotice: (value) => `Preavviso minimo: ${value} h`,
    confirmedTitle: 'Prenotazione confermata', sentTitle: 'Richiesta inviata', confirmedMessage: 'La prenotazione è confermata. La fascia oraria e il tavolo sono ora riservati.', sentMessage: 'La richiesta è stata inviata. La fascia oraria è bloccata temporaneamente in attesa della conferma del ristorante.', another: 'Invia un’altra richiesta',
    name: 'Nome', partySize: 'Numero di persone', date: 'Data', time: 'Ora', checking: 'Verifica dei tavoli disponibili…', manualAvailable: 'Fascia disponibile — il ristorante assegnerà il tavolo.', available: 'È disponibile un tavolo adatto per questa fascia oraria.', selectSlot: 'Seleziona una fascia oraria per verificare la disponibilità.', unavailableSlot: 'Questa fascia oraria non è disponibile. Scegli un’altra data o ora.', email: 'E-mail', phone: 'Telefono', notes: 'Richiesta particolare', sending: 'Invio…', confirm: 'Conferma la prenotazione', send: 'Invia la richiesta', waitAvailability: 'Attendi il completamento della verifica della disponibilità.', loadError: 'Impossibile caricare la pagina di prenotazione.', availabilityError: 'Impossibile verificare questa fascia oraria.', bookingError: 'Impossibile completare la prenotazione.', viewMenu: 'Vedi il menù',
  },
};

function normalizeLanguage(value: string | null | undefined): Language | null {
  return value === 'fr' || value === 'en' || value === 'es' || value === 'it' ? value : null;
}

function detectInitialLanguage(queryLanguage?: string | null): Language {
  const selected = normalizeLanguage(queryLanguage);
  if (selected) return selected;
  if (typeof navigator === 'undefined') return 'fr';
  return normalizeLanguage(navigator.language.toLowerCase().slice(0, 2)) ?? 'fr';
}

function localizedWelcome(config: PublicBookingConfig, language: Language) {
  if (language === 'en' && config.booking_welcome_text_en?.trim()) return config.booking_welcome_text_en.trim();
  if (language === 'es' && config.booking_welcome_text_es?.trim()) return config.booking_welcome_text_es.trim();
  if (language === 'it' && config.booking_welcome_text_it?.trim()) return config.booking_welcome_text_it.trim();
  const source = config.booking_welcome_text?.trim();
  if (!source) return ui[language].defaultWelcome;
  return source;
}

function timeValue(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function nextBookingSlot(config: PublicBookingConfig) {
  const earliest = new Date(Date.now() + Math.max(0, config.min_notice_hours) * 60 * 60 * 1000);
  return roundRestaurantDateToSlot(earliest, config.slot_interval, 'ceil');
}

export function PublicRestaurantBookingPage() {
  const { slug = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [language, setLanguage] = useState<Language>(() => detectInitialLanguage(searchParams.get('lang')));
  const [config, setConfig] = useState<PublicBookingConfig | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [availability, setAvailability] = useState<PublicBookingAvailability | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const copy = ui[language];

  useEffect(() => {
    const selected = normalizeLanguage(searchParams.get('lang'));
    if (selected && selected !== language) setLanguage(selected);
  }, [searchParams, language]);

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
        setError(ui[language].loadError);
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
      } catch {
        if (!canceled) setAvailability({ available: false, reason: ui[language].availabilityError });
      } finally {
        if (!canceled) setCheckingAvailability(false);
      }
    }, 350);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [slug, form.date, form.time, form.partySize, language]);

  useEffect(() => {
    setError('');
    setSuccess('');
  }, [language]);

  function chooseLanguage(value: Language) {
    setLanguage(value);
    const next = new URLSearchParams(searchParams);
    next.set('lang', value);
    setSearchParams(next, { replace: true });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !slug || !config) return;
    if (checkingAvailability || availability?.available !== true) {
      setError(copy.waitAvailability);
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
      setSuccess(config.confirmation_mode === 'automatic' ? copy.confirmedMessage : copy.sentMessage);
      const initial = nextBookingSlot(config);
      setForm({ ...emptyForm, partySize: '2', date: toRestaurantLocalDateKey(initial), time: timeValue(initial) });
      setAvailability(null);
    } catch {
      setError(copy.bookingError);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="public-restaurant-page" lang={language}><div className="public-restaurant-loading">{copy.loading}</div></div>;
  if (!config?.booking_enabled) return <div className="public-restaurant-page" lang={language}><div className="public-restaurant-error"><h1>{copy.unavailableTitle}</h1><p>{error || copy.unavailableMessage}</p></div></div>;

  const minTime = bookingWindow && form.date === bookingWindow.minDate ? bookingWindow.minTime : undefined;

  return <div className="public-restaurant-page public-booking-page" lang={language} style={{ '--restaurant-brand': config.primary_color } as CSSProperties}>
    <main className="public-booking-card">
      <div className="public-booking-language-row">
        <a href={`/r/${slug}/menu?lang=${language}`}>{copy.viewMenu}</a>
        <nav className="restaurant-public-languages public-booking-languages" aria-label={copy.languageNav}>{(Object.keys(languageLabels) as Language[]).map((value) => <button type="button" key={value} className={language === value ? 'active' : ''} onClick={() => chooseLanguage(value)} aria-pressed={language === value}>{languageLabels[value]}</button>)}</nav>
      </div>
      {config.logo_url && <img className="public-booking-logo" src={config.logo_url} alt=""/>}
      <p className="public-booking-eyebrow">{copy.eyebrow}</p>
      <h1>{config.public_name || config.organization_name}</h1>
      <p>{localizedWelcome(config, language)}</p>
      <div className="public-booking-rules">
        <span>{copy.slotsEvery(config.slot_interval)}</span>
        <span>{copy.ahead(config.max_days_ahead)}</span>
        {config.min_notice_hours > 0 && <span>{copy.minimumNotice(config.min_notice_hours)}</span>}
      </div>
      {error && <div className="public-booking-message error">{error}</div>}
      {success
        ? <div className="public-booking-success"><strong>{config.confirmation_mode === 'automatic' ? copy.confirmedTitle : copy.sentTitle}</strong><p>{success}</p><button type="button" onClick={() => setSuccess('')}>{copy.another}</button></div>
        : <form onSubmit={submit}>
          <label>{copy.name} *<input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label>
          <label>{copy.partySize} *<input type="number" min="1" max="30" required value={form.partySize} onChange={(e) => { setAvailability(null); setForm({ ...form, partySize: e.target.value }); }}/></label>
          <label>{copy.date} *<input type="date" min={bookingWindow?.minDate} max={bookingWindow?.maxDate} required value={form.date} onChange={(e) => { setAvailability(null); setForm({ ...form, date: e.target.value }); }}/></label>
          <label>{copy.time} *<input type="time" min={minTime} step={Math.max(5, config.slot_interval) * 60} required value={form.time} onChange={(e) => { setAvailability(null); setForm({ ...form, time: e.target.value }); }}/></label>
          {(form.date && form.time) && <div className={`public-booking-availability ${checkingAvailability ? 'checking' : availability?.available ? 'available' : 'unavailable'}`} aria-live="polite">
            {checkingAvailability
              ? copy.checking
              : availability?.available
                ? availability.manual_assignment
                  ? copy.manualAvailable
                  : copy.available
                : availability?.reason === ui[language].availabilityError
                  ? copy.availabilityError
                  : availability
                    ? copy.unavailableSlot
                    : copy.selectSlot}
          </div>}
          <label>{copy.email}<input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/></label>
          <label>{copy.phone}<input inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}/></label>
          <label className="full">{copy.notes}<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/></label>
          <button disabled={saving || checkingAvailability || availability?.available !== true}>{saving ? copy.sending : config.confirmation_mode === 'automatic' ? copy.confirm : copy.send}</button>
        </form>}
      <footer>{[config.booking_contact_phone, config.booking_contact_email].filter(Boolean).join(' · ')}</footer>
    </main>
  </div>;
}
