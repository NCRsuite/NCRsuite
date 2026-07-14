import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { supabase } from '../lib/supabase';
import { downloadCalendarFile, googleCalendarUrl, outlookCalendarUrl } from '../lib/calendar';

interface PublicOrganization {
  id: string;
  name: string;
  slug: string;
  primary_color: string;
  logo_url: string | null;
  banner_url: string | null;
  tagline: string | null;
  address: string | null;
  hours_text: string | null;
  practical_info: string | null;
  show_ncr_branding: boolean;
  timezone: string;
}


interface PublicSite {
  id: string;
  name: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  is_primary: boolean;
}

interface PublicSettings {
  confirmation_mode: 'automatic' | 'manual';
  slot_interval: number;
  min_notice_hours: number;
  max_days_ahead: number;
  cancel_notice_hours: number;
  welcome_text: string | null;
  cancellation_policy: string | null;
  privacy_notice: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

interface PublicService {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
}

interface PublicStaff {
  id: string;
  display_name: string;
  color: string | null;
  service_ids: string[];
  site_id: string | null;
}

interface PublicBookingPageData {
  organization: PublicOrganization;
  settings: PublicSettings;
  sites: PublicSite[];
  services: PublicService[];
  staff: PublicStaff[];
}

interface AvailableSlot {
  slot_start: string;
  slot_end: string;
  staff_id: string;
  staff_name: string;
}

interface BookingResult {
  appointment_id: string;
  token: string;
  status: 'pending' | 'confirmed';
  starts_at: string;
  ends_at: string;
  organization_name: string;
  organization_slug: string;
  service_name: string;
  staff_name: string;
  amount_cents: number;
  site_id: string | null;
  site_name: string | null;
  site_address: string | null;
}

interface CustomerForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  website: string;
  consent: boolean;
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const fullDateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`;
}

function emptyCustomerForm(): CustomerForm {
  return { firstName: '', lastName: '', email: '', phone: '', notes: '', website: '', consent: false };
}

export function PublicBookingPage() {
  const { slug = '' } = useParams();
  const [pageData, setPageData] = useState<PublicBookingPageData | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [pageError, setPageError] = useState('');
  const [siteId, setSiteId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffChoice, setStaffChoice] = useState('any');
  const [date, setDate] = useState(dateToInput(new Date()));
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [customer, setCustomer] = useState<CustomerForm>(emptyCustomerForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BookingResult | null>(null);

  useEffect(() => {
    let active = true;
    async function loadPage() {
      setLoadingPage(true);
      setPageError('');
      if (!supabase) {
        setPageError('La réservation en ligne n’est pas configurée.');
        setLoadingPage(false);
        return;
      }
      const { data, error: loadError } = await supabase.rpc('get_public_booking_page', { p_slug: slug });
      if (!active) return;
      if (loadError) {
        setPageError(`Impossible de charger la réservation : ${loadError.message}`);
      } else if (!data) {
        setPageError('Cette page de réservation est introuvable ou temporairement désactivée.');
      } else {
        const typed = data as PublicBookingPageData;
        setPageData(typed);
        setSiteId(typed.sites.find((site) => site.is_primary)?.id ?? typed.sites[0]?.id ?? '');
        setDate(dateToInput(new Date()));
      }
      setLoadingPage(false);
    }
    loadPage();
    return () => { active = false; };
  }, [slug]);

  const availableServices = useMemo(() => {
    if (!pageData) return [];
    if (!siteId) return pageData.services;
    const serviceIds = new Set(pageData.staff.filter((member) => member.site_id === siteId).flatMap((member) => member.service_ids));
    return pageData.services.filter((service) => serviceIds.has(service.id));
  }, [pageData, siteId]);

  const selectedService = useMemo(
    () => availableServices.find((service) => service.id === serviceId) ?? null,
    [availableServices, serviceId]
  );

  useEffect(() => {
    if (serviceId && !availableServices.some((service) => service.id === serviceId)) {
      setServiceId('');
      setSelectedSlot(null);
    }
  }, [availableServices, serviceId]);

  const compatibleStaff = useMemo(() => {
    if (!pageData || !serviceId) return [];
    return pageData.staff.filter((member) => member.service_ids.includes(serviceId) && (!siteId || member.site_id === siteId));
  }, [pageData, serviceId, siteId]);

  useEffect(() => {
    if (staffChoice !== 'any' && !compatibleStaff.some((member) => member.id === staffChoice)) {
      setStaffChoice('any');
    }
  }, [compatibleStaff, staffChoice]);

  useEffect(() => {
    let active = true;
    async function loadSlots() {
      setSelectedSlot(null);
      setSlots([]);
      setError('');
      if (!supabase || !pageData || !serviceId || !date) return;
      setLoadingSlots(true);
      const { data, error: slotsError } = await supabase.rpc('get_public_available_slots_v2', {
        p_slug: pageData.organization.slug,
        p_site_id: siteId || null,
        p_service_id: serviceId,
        p_date: date,
        p_staff_id: staffChoice === 'any' ? null : staffChoice
      });
      if (!active) return;
      if (slotsError) setError(`Impossible de charger les créneaux : ${slotsError.message}`);
      else setSlots((data ?? []) as AvailableSlot[]);
      setLoadingSlots(false);
    }
    loadSlots();
    return () => { active = false; };
  }, [pageData, siteId, serviceId, staffChoice, date]);

  const displayedSlots = useMemo(() => {
    if (staffChoice !== 'any') return slots;
    const unique = new Map<string, AvailableSlot>();
    for (const slot of slots) {
      if (!unique.has(slot.slot_start)) unique.set(slot.slot_start, slot);
    }
    return Array.from(unique.values());
  }, [slots, staffChoice]);

  const minDate = dateToInput(new Date());
  const maxDate = pageData ? dateToInput(addDays(new Date(), pageData.settings.max_days_ahead)) : minDate;

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !pageData || !selectedService || !selectedSlot) return;
    setSaving(true);
    setError('');
    try {
      const { data, error: bookingError } = await supabase.rpc('create_public_booking_v3', {
        p_slug: pageData.organization.slug,
        p_site_id: siteId || null,
        p_service_id: selectedService.id,
        p_staff_id: selectedSlot.staff_id,
        p_starts_at: selectedSlot.slot_start,
        p_first_name: customer.firstName,
        p_last_name: customer.lastName,
        p_email: customer.email,
        p_phone: customer.phone,
        p_notes: customer.notes,
        p_website: customer.website,
        p_privacy_consent: customer.consent
      });
      if (bookingError) throw bookingError;
      setResult(data as BookingResult);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'La réservation a échoué.';
      setError(message);
      const { data } = await supabase.rpc('get_public_available_slots_v2', {
        p_slug: pageData.organization.slug,
        p_site_id: siteId || null,
        p_service_id: selectedService.id,
        p_date: date,
        p_staff_id: staffChoice === 'any' ? null : staffChoice
      });
      setSlots((data ?? []) as AvailableSlot[]);
      setSelectedSlot(null);
    } finally {
      setSaving(false);
    }
  }

  if (loadingPage) {
    return <div className="public-booking-state"><img src="/brand/ncr-suite-icon.png" alt="" /><p>Chargement des disponibilités…</p></div>;
  }

  if (pageError || !pageData) {
    return (
      <div className="public-booking-state public-error-state">
        <img src="/brand/ncr-suite-logo-horizontal.png" alt="NCR Suite" />
        <h1>Réservation indisponible</h1>
        <p>{pageError}</p>
        <Link className="secondary-button" to="/connexion">Accéder à NCR Suite</Link>
      </div>
    );
  }

  const publicStyle = { '--accent': pageData.organization.primary_color } as CSSProperties;
  const selectedSite = pageData.sites.find((site) => site.id === siteId) ?? null;
  const hasSiteChoice = pageData.sites.length > 1;
  const stepOffset = hasSiteChoice ? 1 : 0;

  if (result) {
    const manageUrl = `/reservation/${result.token}`;
    const calendarEvent = {
      title: `${result.service_name} — ${pageData.organization.name}`,
      description: `Rendez-vous à ${result.site_name || pageData.organization.name} avec ${result.staff_name}. Gestion : ${window.location.origin}${manageUrl}`,
      startsAt: result.starts_at,
      endsAt: result.ends_at,
      location: result.site_address || pageData.organization.address || result.site_name || pageData.organization.name
    };
    return (
      <div className="public-booking-page" style={publicStyle}>
        <header className="public-booking-brand">
          <div className="public-business-mark">{pageData.organization.logo_url ? <img src={pageData.organization.logo_url} alt="" /> : pageData.organization.name.slice(0, 1).toUpperCase()}</div>
          <div><strong>{pageData.organization.name}</strong><span>Réservation en ligne</span></div>
        </header>
        <main className="public-booking-container booking-success-container">
          <section className="public-success-card">
            <div className="public-success-icon">✓</div>
            <p className="eyebrow">DEMANDE ENREGISTRÉE</p>
            <h1>{result.status === 'confirmed' ? 'Votre rendez-vous est confirmé.' : 'Votre demande attend une validation.'}</h1>
            <p>Votre réservation apparaît immédiatement dans le planning de {result.site_name || pageData.organization.name}.</p>{result.site_name && <div className="public-booking-site-result"><strong>{result.site_name}</strong>{result.site_address && <span>{result.site_address}</span>}</div>}
            <div className="public-booking-recap">
              <div><span>Prestation</span><strong>{result.service_name}</strong></div>
              <div><span>Date</span><strong>{fullDateFormatter.format(new Date(result.starts_at))}</strong></div>
              <div><span>Heure</span><strong>{timeFormatter.format(new Date(result.starts_at))}</strong></div>
              <div><span>Avec</span><strong>{result.staff_name}</strong></div>
              <div><span>Tarif</span><strong>{currencyFormatter.format(result.amount_cents / 100)}</strong></div>
              <div><span>Statut</span><strong>{result.status === 'confirmed' ? 'Confirmé' : 'En attente'}</strong></div>
            </div>
            <div className="public-success-actions">
              <Link className="primary-button" to={manageUrl}>Gérer ma réservation</Link>
              {result.status === 'confirmed' && (
                <button className="secondary-button" type="button" onClick={() => downloadCalendarFile(calendarEvent, `rendez-vous-${result.organization_slug}.ics`)}>Ajouter au calendrier</button>
              )}
              <button className="secondary-button" type="button" onClick={() => window.print()}>Imprimer</button>
            </div>
            {result.status === 'confirmed' && (
              <div className="calendar-provider-links" aria-label="Ajouter le rendez-vous à un calendrier">
                <a href={googleCalendarUrl(calendarEvent)} target="_blank" rel="noreferrer">Google Agenda</a>
                <a href={outlookCalendarUrl(calendarEvent)} target="_blank" rel="noreferrer">Outlook</a>
                <button type="button" onClick={() => downloadCalendarFile(calendarEvent, `rendez-vous-${result.organization_slug}.ics`)}>Apple / fichier .ics</button>
              </div>
            )}
            <div className="info-message public-manage-note">
              Conservez le lien « Gérer ma réservation » : il permet de déplacer ou d’annuler le rendez-vous dans le respect du délai fixé par l’établissement.
            </div>
          </section>
        </main>
        {pageData.organization.show_ncr_branding && <footer className="public-booking-footer">Propulsé par <strong>NCR Suite</strong></footer>}
      </div>
    );
  }

  return (
    <div className="public-booking-page" style={publicStyle}>
      <header className="public-booking-brand">
        <div className="public-business-mark">{pageData.organization.logo_url ? <img src={pageData.organization.logo_url} alt="" /> : pageData.organization.name.slice(0, 1).toUpperCase()}</div>
        <div><strong>{pageData.organization.name}</strong><span>Réservation en ligne</span></div>
      </header>

      <main className="public-booking-container">
        <section
          className={`public-booking-hero ${pageData.organization.banner_url ? 'with-banner' : ''}`}
          style={pageData.organization.banner_url ? { backgroundImage: `linear-gradient(90deg, rgba(7,9,12,.88), rgba(7,9,12,.35)), url(${pageData.organization.banner_url})` } : undefined}
        >
          <p className="eyebrow">PRENEZ RENDEZ-VOUS</p>
          <h1>{pageData.organization.tagline || 'Choisissez le créneau qui vous convient.'}</h1>
          <p>{pageData.settings.welcome_text || 'Sélectionnez une prestation, un professionnel et une disponibilité. Aucun compte client n’est nécessaire.'}</p>
        </section>

        {(selectedSite?.address || pageData.organization.address || pageData.organization.hours_text || pageData.organization.practical_info) && (
          <section className="public-business-information">
            {(selectedSite?.address || pageData.organization.address) && <div><span>Adresse</span><strong>{selectedSite?.address || pageData.organization.address}</strong></div>}
            {pageData.organization.hours_text && <div><span>Horaires</span><strong>{pageData.organization.hours_text}</strong></div>}
            {pageData.organization.practical_info && <div><span>Informations pratiques</span><strong>{pageData.organization.practical_info}</strong></div>}
          </section>
        )}

        <div className="public-booking-grid">
          {hasSiteChoice && (
            <section className="public-booking-panel public-site-panel">
              <div className="public-step-heading"><span>1</span><div><h2>Votre établissement</h2><p>Choisissez le site dans lequel vous souhaitez être reçu.</p></div></div>
              <div className="public-site-grid">
                {pageData.sites.map((site) => (
                  <button type="button" key={site.id} className={`public-site-choice ${siteId === site.id ? 'selected' : ''}`} onClick={() => { setSiteId(site.id); setStaffChoice('any'); setSelectedSlot(null); }}>
                    <span className="public-service-icon"><Icon name="building" size={20} /></span>
                    <div><strong>{site.name}</strong><p>{[site.address, site.postal_code, site.city].filter(Boolean).join(' ') || 'Adresse communiquée lors de la confirmation'}</p>{site.is_primary && <small>Établissement principal</small>}</div>
                  </button>
                ))}
              </div>
            </section>
          )}
          <section className={`public-booking-panel ${hasSiteChoice && !siteId ? 'disabled-panel' : ''}`}>
            <div className="public-step-heading"><span>{1 + stepOffset}</span><div><h2>Votre prestation</h2><p>Durée et tarif affichés avant validation.</p></div></div>
            <div className="public-service-grid">
              {availableServices.map((service) => (
                <button
                  type="button"
                  key={service.id}
                  className={`public-service-choice ${serviceId === service.id ? 'selected' : ''}`}
                  onClick={() => setServiceId(service.id)} disabled={hasSiteChoice && !siteId}
                >
                  <span className="public-service-icon"><Icon name="sparkles" size={20} /></span>
                  <div><strong>{service.name}</strong>{service.description && <p>{service.description}</p>}<small>{formatDuration(service.duration_minutes)} · {currencyFormatter.format(service.price_cents / 100)}</small></div>
                </button>
              ))}
            </div>
            {availableServices.length === 0 && <div className="info-message">Aucune prestation n’est encore proposée en ligne.</div>}
          </section>

          <section className={`public-booking-panel ${!serviceId ? 'disabled-panel' : ''}`}>
            <div className="public-step-heading"><span>{2 + stepOffset}</span><div><h2>Votre préférence</h2><p>Choisissez une personne ou laissez NCR Suite trouver une disponibilité.</p></div></div>
            <div className="public-staff-grid">
              <button type="button" className={`public-staff-choice ${staffChoice === 'any' ? 'selected' : ''}`} onClick={() => setStaffChoice('any')} disabled={!serviceId}>
                <div className="public-staff-avatar">∞</div><div><strong>Peu importe</strong><small>Le premier professionnel disponible</small></div>
              </button>
              {compatibleStaff.map((member) => (
                <button type="button" key={member.id} className={`public-staff-choice ${staffChoice === member.id ? 'selected' : ''}`} onClick={() => setStaffChoice(member.id)} disabled={!serviceId}>
                  <div className="public-staff-avatar" style={{ background: member.color || pageData.organization.primary_color }}>{member.display_name.slice(0, 1).toUpperCase()}</div>
                  <div><strong>{member.display_name}</strong><small>Voir ses disponibilités</small></div>
                </button>
              ))}
            </div>
          </section>

          <section className={`public-booking-panel ${!serviceId ? 'disabled-panel' : ''}`}>
            <div className="public-step-heading"><span>{3 + stepOffset}</span><div><h2>Date et heure</h2><p>Seuls les créneaux réellement disponibles sont proposés.</p></div></div>
            <label className="public-date-field">Date souhaitée<input type="date" min={minDate} max={maxDate} value={date} onChange={(event) => setDate(event.target.value)} disabled={!serviceId} /></label>
            <div className="public-slots">
              {loadingSlots && <div className="public-slots-state">Recherche des disponibilités…</div>}
              {!loadingSlots && serviceId && displayedSlots.length === 0 && <div className="public-slots-state">Aucun créneau disponible ce jour-là. Essayez une autre date.</div>}
              {!loadingSlots && displayedSlots.map((slot) => (
                <button
                  type="button"
                  key={`${slot.slot_start}-${slot.staff_id}`}
                  className={selectedSlot?.slot_start === slot.slot_start && selectedSlot?.staff_id === slot.staff_id ? 'selected' : ''}
                  onClick={() => setSelectedSlot(slot)}
                >
                  <strong>{timeFormatter.format(new Date(slot.slot_start))}</strong>
                  <small>{staffChoice === 'any' ? 'Disponible' : slot.staff_name}</small>
                </button>
              ))}
            </div>
          </section>

          <section className={`public-booking-panel public-customer-panel ${!selectedSlot ? 'disabled-panel' : ''}`}>
            <div className="public-step-heading"><span>{4 + stepOffset}</span><div><h2>Vos coordonnées</h2><p>Une adresse e-mail ou un téléphone est nécessaire.</p></div></div>
            {selectedService && selectedSlot && (
              <div className="public-selection-summary">
                <Icon name="calendar" size={20} />
                <div><strong>{selectedService.name}</strong><span>{fullDateFormatter.format(new Date(selectedSlot.slot_start))} à {timeFormatter.format(new Date(selectedSlot.slot_start))} · {selectedSlot.staff_name}</span></div>
                <b>{currencyFormatter.format(selectedService.price_cents / 100)}</b>
              </div>
            )}
            <form className="public-customer-form" onSubmit={submitBooking}>
              <label>Prénom <span aria-hidden="true">*</span><input required minLength={2} maxLength={80} value={customer.firstName} onChange={(event) => setCustomer((current) => ({ ...current, firstName: event.target.value }))} disabled={!selectedSlot} /></label>
              <label>Nom<input maxLength={100} value={customer.lastName} onChange={(event) => setCustomer((current) => ({ ...current, lastName: event.target.value }))} disabled={!selectedSlot} /></label>
              <label>E-mail<input type="email" value={customer.email} onChange={(event) => setCustomer((current) => ({ ...current, email: event.target.value }))} disabled={!selectedSlot} placeholder="vous@exemple.fr" /></label>
              <label>Téléphone<input type="tel" value={customer.phone} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} disabled={!selectedSlot} placeholder="06 00 00 00 00" /></label>
              <label className="full-field">Message facultatif<textarea rows={3} maxLength={1000} value={customer.notes} onChange={(event) => setCustomer((current) => ({ ...current, notes: event.target.value }))} disabled={!selectedSlot} placeholder="Une précision utile pour le rendez-vous…" /></label>
              <label className="public-honeypot" aria-hidden="true">Site internet<input tabIndex={-1} autoComplete="off" value={customer.website} onChange={(event) => setCustomer((current) => ({ ...current, website: event.target.value }))} /></label>
              {error && <div className="error-message full-field" role="alert">{error}</div>}
              <div className="public-consent-box full-field">
                <label className="public-consent-check">
                  <input
                    type="checkbox"
                    checked={customer.consent}
                    onChange={(event) => setCustomer((current) => ({ ...current, consent: event.target.checked }))}
                    disabled={!selectedSlot}
                    required
                  />
                  <span>J’accepte que mes coordonnées soient utilisées pour organiser et suivre ce rendez-vous.</span>
                </label>
                <details>
                  <summary>Confidentialité et conditions de modification</summary>
                  <div className="public-policy-content">
                    <p><strong>Utilisation des données.</strong> {pageData.settings.privacy_notice || 'Vos coordonnées sont utilisées uniquement pour organiser, confirmer et suivre votre rendez-vous.'}</p>
                    <p><strong>Modification et annulation.</strong> {pageData.settings.cancellation_policy || `Les actions en ligne restent possibles jusqu’à ${pageData.settings.cancel_notice_hours} h avant le rendez-vous.`}</p>
                    {(pageData.settings.contact_email || pageData.settings.contact_phone) && (
                      <p><strong>Contact.</strong> {[pageData.settings.contact_email, pageData.settings.contact_phone].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                </details>
              </div>
              <div className="public-booking-submit full-field">
                <p>Une confirmation et un lien privé de gestion seront envoyés par e-mail lorsque l’adresse est renseignée.</p>
                <button className="primary-button" disabled={!selectedSlot || saving || !customer.consent || (!customer.email.trim() && !customer.phone.trim())}>
                  {saving ? 'Réservation en cours…' : pageData.settings.confirmation_mode === 'manual' ? 'Envoyer ma demande' : 'Confirmer mon rendez-vous'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
      {pageData.organization.show_ncr_branding && <footer className="public-booking-footer">Propulsé par <strong>NCR Suite</strong></footer>}
    </div>
  );
}
