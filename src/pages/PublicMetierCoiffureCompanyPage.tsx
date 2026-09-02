import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { supabase } from '../lib/supabase';

interface PublicCompany {
  id: string;
  organization_id: string;
  name: string;
  legal_name: string | null;
  public_slug: string;
  logo_url: string | null;
  primary_color: string;
  tagline: string | null;
  description: string | null;
  banner_url: string | null;
  hours_text: string | null;
  practical_info: string | null;
  email: string | null;
  phone: string | null;
  booking_enabled: boolean;
  show_ncr_branding: boolean;
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
  site_id: string | null;
  service_ids: string[];
}

interface PageData {
  company: PublicCompany;
  settings: PublicSettings;
  sites: PublicSite[];
  services: PublicService[];
  staff: PublicStaff[];
}

interface Slot {
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
  company_name: string;
  company_slug: string;
  service_name: string;
  staff_name: string;
  amount_cents: number;
  site_id: string;
  site_name: string;
  site_address: string | null;
}

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const fullDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortTime = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

function dateInput(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} h ${remaining}` : `${hours} h`;
}

export function PublicMetierCoiffureCompanyPage() {
  const { slug = '' } = useParams();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [siteId, setSiteId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('any');
  const [date, setDate] = useState(dateInput());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [website, setWebsite] = useState('');
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BookingResult | null>(null);

  useEffect(() => {
    let active = true;
    async function loadPage() {
      setLoading(true);
      setPageError('');
      if (!supabase) {
        setPageError('Cette page est momentanément indisponible.');
        setLoading(false);
        return;
      }
      const { data: pageData, error: requestError } = await supabase.rpc('get_public_metier_coiffure_company_page', { p_slug: slug });
      if (!active) return;
      if (requestError) setPageError(requestError.message);
      else if (!pageData) setPageError('Ce salon est introuvable ou sa page publique est désactivée.');
      else {
        const typed = pageData as PageData;
        typed.sites = Array.isArray(typed.sites) ? typed.sites : [];
        typed.services = Array.isArray(typed.services) ? typed.services : [];
        typed.staff = Array.isArray(typed.staff) ? typed.staff : [];
        setData(typed);
        setSiteId(typed.sites.find((site) => site.is_primary)?.id ?? typed.sites[0]?.id ?? '');
        document.title = `${typed.company.name} — Réservation`;
        const description = typed.company.description || typed.company.tagline || `Découvrez ${typed.company.name} et réservez votre rendez-vous en ligne.`;
        let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'description';
          document.head.appendChild(meta);
        }
        meta.content = description.slice(0, 160);
      }
      setLoading(false);
    }
    void loadPage();
    return () => { active = false; };
  }, [slug]);

  const selectedService = useMemo(() => data?.services.find((service) => service.id === serviceId) ?? null, [data?.services, serviceId]);
  const compatibleStaff = useMemo(() => {
    if (!data || !serviceId) return [];
    return data.staff.filter((member) => member.service_ids.includes(serviceId) && member.site_id === siteId);
  }, [data, serviceId, siteId]);

  useEffect(() => {
    if (staffId !== 'any' && !compatibleStaff.some((member) => member.id === staffId)) setStaffId('any');
  }, [compatibleStaff, staffId]);

  useEffect(() => {
    let active = true;
    async function loadSlots() {
      setSelectedSlot(null);
      setSlots([]);
      setError('');
      if (!supabase || !data?.company.booking_enabled || !siteId || !serviceId || !date) return;
      setLoadingSlots(true);
      const { data: slotData, error: requestError } = await supabase.rpc('get_public_metier_coiffure_company_slots', {
        p_slug: data.company.public_slug,
        p_site_id: siteId,
        p_service_id: serviceId,
        p_date: date,
        p_staff_id: staffId === 'any' ? null : staffId
      });
      if (!active) return;
      if (requestError) setError(requestError.message);
      else setSlots((Array.isArray(slotData) ? slotData : []) as Slot[]);
      setLoadingSlots(false);
    }
    void loadSlots();
    return () => { active = false; };
  }, [data?.company.public_slug, data?.company.booking_enabled, siteId, serviceId, staffId, date]);

  const displayedSlots = useMemo(() => {
    if (staffId !== 'any') return slots;
    const unique = new Map<string, Slot>();
    slots.forEach((slot) => { if (!unique.has(slot.slot_start)) unique.set(slot.slot_start, slot); });
    return [...unique.values()];
  }, [slots, staffId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !data || !selectedService || !selectedSlot || !siteId) return;
    setSaving(true);
    setError('');
    const { data: bookingData, error: requestError } = await supabase.rpc('create_public_metier_coiffure_company_booking', {
      p_slug: data.company.public_slug,
      p_site_id: siteId,
      p_service_id: selectedService.id,
      p_staff_id: selectedSlot.staff_id,
      p_starts_at: selectedSlot.slot_start,
      p_first_name: firstName,
      p_last_name: lastName,
      p_email: email,
      p_phone: phone,
      p_notes: notes || null,
      p_website: website || null,
      p_privacy_consent: consent
    });
    setSaving(false);
    if (requestError) {
      setError(requestError.message);
      setSelectedSlot(null);
      return;
    }
    setResult(bookingData as BookingResult);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (loading) return <div className="company-public-state"><img src="/brand/ncr-suite-icon.png" alt="" /><p>Chargement du salon…</p></div>;
  if (pageError || !data) return <div className="company-public-state company-public-error"><h1>Page indisponible</h1><p>{pageError}</p><Link to="/" className="secondary-button">Retour à NCR Suite</Link></div>;

  const style = { '--company-accent': data.company.primary_color } as CSSProperties;
  const selectedSite = data.sites.find((site) => site.id === siteId) ?? null;
  const minDate = dateInput();
  const maxDate = dateInput(addDays(new Date(), data.settings.max_days_ahead || 90));

  if (result) {
    return <div className="company-public-page" style={style}>
      <main className="company-public-success">
        <div className="company-public-success-mark">✓</div>
        <p className="eyebrow">RENDEZ-VOUS ENREGISTRÉ</p>
        <h1>{result.status === 'confirmed' ? 'Votre rendez-vous est confirmé' : 'Votre demande a bien été envoyée'}</h1>
        <p>{result.company_name} vous attend le <strong>{fullDate.format(new Date(result.starts_at))}</strong> à <strong>{shortTime.format(new Date(result.starts_at))}</strong>.</p>
        <div className="company-public-recap">
          <span><small>Prestation</small><strong>{result.service_name}</strong></span>
          <span><small>Avec</small><strong>{result.staff_name}</strong></span>
          <span><small>Lieu</small><strong>{result.site_name}</strong></span>
          <span><small>Tarif</small><strong>{currency.format(result.amount_cents / 100)}</strong></span>
        </div>
        <div className="company-public-success-actions">
          <Link className="primary-button" to={`/reservation/${result.token}`}>Gérer mon rendez-vous</Link>
          <Link className="secondary-button" to={`/salon/${result.company_slug}`}>Retour au salon</Link>
        </div>
      </main>
    </div>;
  }

  return <div className="company-public-page" style={style}>
    <header className={`company-public-hero${data.company.banner_url ? ' has-banner' : ''}`} style={data.company.banner_url ? { backgroundImage: `linear-gradient(180deg,rgba(10,16,28,.18),rgba(10,16,28,.72)),url(${data.company.banner_url})` } : undefined}>
      <div className="company-public-nav">
        <div className="company-public-brand">
          <span>{data.company.logo_url ? <img src={data.company.logo_url} alt="" /> : data.company.name.slice(0, 1).toUpperCase()}</span>
          <div><strong>{data.company.name}</strong><small>Coiffure & beauté</small></div>
        </div>
        {data.company.booking_enabled && <a className="company-public-book-button" href="#reserver">Prendre rendez-vous</a>}
      </div>
      <div className="company-public-hero-content">
        <p className="eyebrow">VOTRE SALON</p>
        <h1>{data.company.name}</h1>
        <p className="company-public-tagline">{data.company.tagline || 'Votre moment beauté, simplement.'}</p>
        {data.company.description && <p className="company-public-description">{data.company.description}</p>}
        <div className="company-public-contact-row">
          {data.company.phone && <a href={`tel:${data.company.phone}`}><Icon name="phone" size={16} /> {data.company.phone}</a>}
          {data.company.email && <a href={`mailto:${data.company.email}`}><Icon name="message" size={16} /> {data.company.email}</a>}
        </div>
      </div>
    </header>

    <main className="company-public-content">
      {data.sites.length > 0 && <section className="company-public-info-grid">
        <article><Icon name="map" size={20} /><div><small>Où nous trouver</small><strong>{selectedSite?.name || data.sites[0].name}</strong><p>{[selectedSite?.address, selectedSite?.postal_code, selectedSite?.city].filter(Boolean).join(' ')}</p></div></article>
        <article><Icon name="clock" size={20} /><div><small>Horaires</small><strong>{data.company.hours_text || 'Sur rendez-vous'}</strong>{data.company.practical_info && <p>{data.company.practical_info}</p>}</div></article>
      </section>}

      <section className="company-public-section">
        <div className="company-public-section-heading"><p className="eyebrow">NOS PRESTATIONS</p><h2>Choisissez votre moment</h2></div>
        <div className="company-public-service-grid">
          {data.services.map((service) => <button type="button" key={service.id} className={service.id === serviceId ? 'active' : ''} onClick={() => { setServiceId(service.id); document.getElementById('reserver')?.scrollIntoView({ behavior: 'smooth' }); }}>
            <div><strong>{service.name}</strong>{service.description && <p>{service.description}</p>}</div>
            <span><small>{durationLabel(service.duration_minutes)}</small><b>{currency.format(service.price_cents / 100)}</b></span>
          </button>)}
          {data.services.length === 0 && <div className="company-public-empty">Les prestations seront bientôt disponibles en ligne.</div>}
        </div>
      </section>

      {data.staff.length > 0 && <section className="company-public-section">
        <div className="company-public-section-heading"><p className="eyebrow">L'ÉQUIPE</p><h2>Les professionnels du salon</h2></div>
        <div className="company-public-team-grid">{data.staff.map((member) => <article key={member.id}><span style={{ background: member.color || data.company.primary_color }}>{member.display_name.slice(0, 1).toUpperCase()}</span><strong>{member.display_name}</strong><small>{member.service_ids.length} prestation{member.service_ids.length > 1 ? 's' : ''}</small></article>)}</div>
      </section>}

      <section className="company-public-booking" id="reserver">
        <div className="company-public-section-heading"><p className="eyebrow">RÉSERVATION</p><h2>{data.company.booking_enabled ? 'Votre prochain rendez-vous' : 'Réservation temporairement fermée'}</h2><p>{data.settings.welcome_text || (data.company.booking_enabled ? 'Choisissez votre prestation, votre professionnel et le créneau qui vous convient.' : 'Contactez directement le salon pour toute demande.')}</p></div>

        {data.company.booking_enabled ? <div className="company-public-booking-layout">
          <div className="company-public-booking-selector">
            {data.sites.length > 1 && <label>Établissement<select value={siteId} onChange={(event) => setSiteId(event.target.value)}>{data.sites.map((site) => <option key={site.id} value={site.id}>{site.name}{site.city ? ` · ${site.city}` : ''}</option>)}</select></label>}
            <label>Prestation<select value={serviceId} onChange={(event) => setServiceId(event.target.value)}><option value="">Choisir une prestation</option>{data.services.map((service) => <option key={service.id} value={service.id}>{service.name} · {currency.format(service.price_cents / 100)}</option>)}</select></label>
            <label>Avec<select value={staffId} onChange={(event) => setStaffId(event.target.value)} disabled={!serviceId}><option value="any">Peu importe</option>{compatibleStaff.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select></label>
            <label>Date<input type="date" value={date} min={minDate} max={maxDate} onChange={(event) => setDate(event.target.value)} /></label>
          </div>

          <div className="company-public-slots">
            <h3>Créneaux disponibles</h3>
            {!serviceId ? <p className="company-public-hint">Choisissez d'abord une prestation.</p> : loadingSlots ? <p className="company-public-hint">Recherche des disponibilités…</p> : displayedSlots.length === 0 ? <p className="company-public-hint">Aucun créneau disponible ce jour-là.</p> : <div>{displayedSlots.map((slot) => <button type="button" key={`${slot.slot_start}-${slot.staff_id}`} className={selectedSlot?.slot_start === slot.slot_start && selectedSlot.staff_id === slot.staff_id ? 'active' : ''} onClick={() => setSelectedSlot(slot)}><strong>{shortTime.format(new Date(slot.slot_start))}</strong><small>{slot.staff_name}</small></button>)}</div>}
          </div>

          {selectedSlot && selectedService && <form className="company-public-customer-form" onSubmit={submit}>
            <div className="company-public-booking-summary"><strong>{selectedService.name}</strong><span>{fullDate.format(new Date(selectedSlot.slot_start))} · {shortTime.format(new Date(selectedSlot.slot_start))} · {selectedSlot.staff_name}</span><b>{currency.format(selectedService.price_cents / 100)}</b></div>
            <div className="company-public-fields">
              <label>Prénom<input value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label>
              <label>Nom<input value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
              <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
              <label>Téléphone<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
              <label className="full">Message<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Optionnel" /></label>
              <label className="company-public-honeypot" aria-hidden="true">Site web<input value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" /></label>
              <label className="company-public-consent full"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required /><span>{data.settings.privacy_notice || 'J’accepte que mes coordonnées soient utilisées pour organiser et suivre mon rendez-vous.'}</span></label>
            </div>
            {error && <div className="error-message" role="alert">{error}</div>}
            <button className="company-public-confirm" type="submit" disabled={saving}>{saving ? 'Réservation…' : data.settings.confirmation_mode === 'manual' ? 'Envoyer ma demande' : 'Confirmer mon rendez-vous'}</button>
            {data.settings.cancellation_policy && <p className="company-public-policy">{data.settings.cancellation_policy}</p>}
          </form>}
        </div> : <div className="company-public-contact-card"><strong>Besoin d'un rendez-vous ?</strong><p>La réservation en ligne est temporairement désactivée.</p>{data.company.phone && <a href={`tel:${data.company.phone}`} className="primary-button">Appeler le salon</a>}</div>}
      </section>
    </main>

    <footer className="company-public-footer"><strong>{data.company.name}</strong>{data.company.show_ncr_branding && <span>Propulsé par NCR Suite</span>}</footer>
  </div>;
}
