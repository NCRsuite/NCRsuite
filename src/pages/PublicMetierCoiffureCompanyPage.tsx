import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { BeautyPublicReviews } from '../components/BeautyPublicReviews';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import '../beautyVerifiedReviews.css';
import '../beautyServiceImages.css';
import '../beautyMultiServiceBooking.css';

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
  banner_position_x: number;
  banner_position_y: number;
  banner_landscape_zoom: number;
  banner_portrait_position_x: number;
  banner_portrait_position_y: number;
  banner_portrait_zoom: number;
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
  category_name: string | null;
  duration_minutes: number;
  price_cents: number;
  image_url: string | null;
  online_booking_enabled?: boolean;
  booking_min_notice_hours?: number | null;
  booking_max_days_ahead?: number | null;
  booking_buffer_before_minutes?: number;
  booking_buffer_after_minutes?: number;
  booking_weekdays?: number[] | null;
  booking_start_time?: string | null;
  booking_end_time?: string | null;
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

interface PortalBookingIdentity {
  account_id: string;
  client_id: string;
  company_id: string;
  company_name: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

interface PortalActivationStatus {
  available: boolean;
  already_active: boolean;
  invitation_pending: boolean;
  masked_email: string | null;
  company_name: string;
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
  service_names?: string[];
  service_count?: number;
  total_duration_minutes?: number;
  staff_name: string;
  amount_cents: number;
  site_id: string;
  site_name: string;
  site_address: string | null;
}

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const fullDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortTime = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const shortDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
const shortDayNumber = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' });

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

function dateInputForTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} h ${remaining}` : `${hours} h`;
}

export function PublicMetierCoiffureCompanyPage() {
  const { slug = '' } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [siteId, setSiteId] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const serviceId = serviceIds[0] ?? '';
  const [staffId, setStaffId] = useState('any');
  const [date, setDate] = useState(dateInput());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [nextSlots, setNextSlots] = useState<Slot[]>([]);
  const [loadingNextSlots, setLoadingNextSlots] = useState(false);
  const [pendingQuickSlot, setPendingQuickSlot] = useState<Slot | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [website, setWebsite] = useState('');
  const [consent, setConsent] = useState(false);
  const [portalIdentity, setPortalIdentity] = useState<PortalBookingIdentity | null>(null);
  const [activationStatus, setActivationStatus] = useState<PortalActivationStatus | null>(null);
  const [activationBusy, setActivationBusy] = useState(false);
  const [activationMessage, setActivationMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BookingResult | null>(null);
  const embedMode = new URLSearchParams(location.search).get('embed') === '1';

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
      else if (!pageData) setPageError('Cette enseigne est introuvable ou sa page publique est désactivée.');
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

  useEffect(() => {
    let active = true;
    async function loadPortalIdentity() {
      if (!supabase || !user || !slug) {
        setPortalIdentity(null);
        return;
      }
      const { data: identity, error: identityError } = await supabase.rpc('get_current_coiffure_client_booking_identity', { p_slug: slug });
      if (!active) return;
      if (identityError) {
        setPortalIdentity(null);
        return;
      }
      setPortalIdentity(identity ? identity as PortalBookingIdentity : null);
    }
    void loadPortalIdentity();
    return () => { active = false; };
  }, [user?.id, slug]);

  useEffect(() => {
    if (!data) return;
    const params = new URLSearchParams(location.search);
    const requestedService = params.get('service');
    const requestedServices = (params.get('services') || '').split(',').map((id) => id.trim()).filter(Boolean);
    const requestedStaff = params.get('staff');
    const validRequestedServices = requestedServices.filter((id) => data.services.some((service) => service.id === id)).slice(0, 6);
    if (validRequestedServices.length > 0) setServiceIds(validRequestedServices);
    else if (requestedService && data.services.some((service) => service.id === requestedService)) setServiceIds([requestedService]);
    if (requestedStaff && data.staff.some((member) => member.id === requestedStaff)) setStaffId(requestedStaff);
  }, [data?.company.id, location.search]);

  const selectedServices = useMemo(
    () => serviceIds.map((id) => data?.services.find((service) => service.id === id)).filter(Boolean) as PublicService[],
    [data?.services, serviceIds]
  );
  const selectedService = selectedServices[0] ?? null;
  const selectedDuration = useMemo(() => selectedServices.reduce((sum, service) => sum + service.duration_minutes, 0), [selectedServices]);
  const selectedAmount = useMemo(() => selectedServices.reduce((sum, service) => sum + service.price_cents, 0), [selectedServices]);
  const serviceGroups = useMemo(() => {
    const groups = new Map<string, PublicService[]>();
    (data?.services ?? []).forEach((service) => {
      const category = service.category_name?.trim() || 'Autres';
      const rows = groups.get(category) ?? [];
      rows.push(service);
      groups.set(category, rows);
    });
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === 'Autres') return 1;
      if (b === 'Autres') return -1;
      return a.localeCompare(b, 'fr');
    });
  }, [data?.services]);
  const compatibleStaff = useMemo(() => {
    if (!data || serviceIds.length === 0) return [];
    return data.staff.filter((member) => serviceIds.every((id) => member.service_ids.includes(id)) && (!member.site_id || member.site_id === siteId));
  }, [data, serviceIds, siteId]);

  useEffect(() => {
    if (staffId !== 'any' && !compatibleStaff.some((member) => member.id === staffId)) setStaffId('any');
  }, [compatibleStaff, staffId]);

  useEffect(() => {
    let active = true;
    async function loadSlots() {
      setSelectedSlot(null);
      setSlots([]);
      setError('');
      if (!supabase || !data?.company.booking_enabled || !siteId || serviceIds.length === 0 || !date) return;
      setLoadingSlots(true);
      const { data: slotData, error: requestError } = await supabase.rpc('get_public_metier_coiffure_company_multi_slots', {
        p_slug: data.company.public_slug,
        p_site_id: siteId,
        p_service_ids: serviceIds,
        p_date: date,
        p_staff_id: staffId === 'any' ? null : staffId
      });
      if (!active) return;
      if (requestError) setError(requestError.message);
      else {
        const loadedSlots = (Array.isArray(slotData) ? slotData : []) as Slot[];
        setSlots(loadedSlots);
        if (pendingQuickSlot) {
          const quickMatch = loadedSlots.find((slot) => slot.slot_start === pendingQuickSlot.slot_start && slot.staff_id === pendingQuickSlot.staff_id);
          if (quickMatch) setSelectedSlot(quickMatch);
          setPendingQuickSlot(null);
        }
      }
      setLoadingSlots(false);
    }
    void loadSlots();
    return () => { active = false; };
  }, [data?.company.public_slug, data?.company.booking_enabled, siteId, serviceIds, staffId, date]);

  const displayedSlots = useMemo(() => {
    if (staffId !== 'any') return slots;
    const unique = new Map<string, Slot>();
    slots.forEach((slot) => { if (!unique.has(slot.slot_start)) unique.set(slot.slot_start, slot); });
    return [...unique.values()];
  }, [slots, staffId]);

  useEffect(() => {
    let active = true;
    async function loadNextSlots() {
      setNextSlots([]);
      if (!supabase || !data?.company.booking_enabled || !siteId || serviceIds.length === 0) return;
      setLoadingNextSlots(true);
      const { data: nextData } = await supabase.rpc('get_public_metier_coiffure_next_multi_slots', {
        p_slug: data.company.public_slug,
        p_site_id: siteId,
        p_service_ids: serviceIds,
        p_staff_id: staffId === 'any' ? null : staffId,
        p_limit: 3
      });
      if (!active) return;
      setNextSlots((Array.isArray(nextData) ? nextData : []) as Slot[]);
      setLoadingNextSlots(false);
    }
    void loadNextSlots();
    return () => { active = false; };
  }, [data?.company.public_slug, data?.company.booking_enabled, siteId, serviceIds, staffId]);

  useEffect(() => {
    let active = true;
    async function loadActivationStatus() {
      if (!supabase || !result?.token) {
        setActivationStatus(null);
        return;
      }
      const { data: statusData } = await supabase.rpc('public_booking_client_portal_activation_status', { p_token: result.token });
      if (!active) return;
      setActivationStatus(statusData ? statusData as PortalActivationStatus : null);
    }
    void loadActivationStatus();
    return () => { active = false; };
  }, [result?.token]);

  async function activateClientSpace() {
    if (!supabase || !result?.token) return;
    setActivationBusy(true);
    setActivationMessage('');
    const { data: activationData, error: activationError } = await supabase.rpc('request_public_booking_client_portal_activation', {
      p_token: result.token
    });
    if (activationError) {
      setActivationMessage(activationError.message);
    } else {
      const payload = activationData as { status?: 'active' | 'sent'; masked_email?: string | null };
      if (payload?.status === 'active') {
        setActivationMessage('Votre espace client est actif. Vous pouvez l’ouvrir maintenant.');
        setActivationStatus((current) => current ? { ...current, already_active: true, invitation_pending: false } : current);
      } else {
        setActivationMessage(`E-mail d’activation envoyé${payload?.masked_email ? ` à ${payload.masked_email}` : ''}.`);
        setActivationStatus((current) => current ? { ...current, invitation_pending: true } : current);
      }
    }
    setActivationBusy(false);
  }

  const quickDates = useMemo(() => {
    const globalLimit = data?.settings.max_days_ahead ?? 60;
    const serviceLimit = selectedServices.reduce(
      (limit, service) => Math.min(limit, service.booking_max_days_ahead ?? globalLimit),
      globalLimit
    );
    const limit = Math.max(1, Math.min(7, globalLimit, serviceLimit));
    return Array.from({ length: Math.min(6, limit) }, (_, index) => addDays(new Date(), index));
  }, [data?.settings.max_days_ahead, selectedServices]);

  function chooseService(nextServiceId: string) {
    setServiceIds((current) => {
      if (current.includes(nextServiceId)) return current.filter((id) => id !== nextServiceId);
      if (current.length >= 6) {
        setError('Vous pouvez sélectionner jusqu’à 6 prestations dans un même rendez-vous.');
        return current;
      }
      setError('');
      return [...current, nextServiceId];
    });
    setStaffId('any');
    setPendingQuickSlot(null);
    setSelectedSlot(null);
  }

  function clearServices() {
    setServiceIds([]);
    setStaffId('any');
    setPendingQuickSlot(null);
    setSelectedSlot(null);
    setError('');
  }

  function chooseNextSlot(slot: Slot) {
    const timezone = data?.sites.find((site) => site.id === siteId)?.timezone || 'Europe/Paris';
    const targetDate = dateInputForTimeZone(new Date(slot.slot_start), timezone);
    const existing = slots.find((candidate) => candidate.slot_start === slot.slot_start && candidate.staff_id === slot.staff_id);
    if (targetDate === date && existing) {
      setSelectedSlot(existing);
      return;
    }
    setPendingQuickSlot(slot);
    setDate(targetDate);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !data || selectedServices.length === 0 || !selectedSlot || !siteId) return;
    setSaving(true);
    setError('');
    const { data: bookingData, error: requestError } = portalIdentity
      ? await supabase.rpc('create_coiffure_client_portal_booking_v2', {
          p_account_id: portalIdentity.account_id,
          p_site_id: siteId,
          p_service_ids: serviceIds,
          p_staff_id: selectedSlot.staff_id,
          p_starts_at: selectedSlot.slot_start,
          p_notes: notes || null,
          p_privacy_consent: consent
        })
      : await supabase.rpc('create_public_metier_coiffure_company_booking_v2', {
          p_slug: data.company.public_slug,
          p_site_id: siteId,
          p_service_ids: serviceIds,
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

  if (loading) return <div className="company-public-state"><img src="/brand/ncr-suite-icon.png" alt="" /><p>Chargement de l’enseigne…</p></div>;
  if (pageError || !data) return <div className="company-public-state company-public-error"><h1>Page indisponible</h1><p>{pageError}</p><Link to="/" className="secondary-button">Retour à NCR Suite</Link></div>;

  const style = {
    '--company-accent': data.company.primary_color,
    '--company-banner-landscape-x': `${data.company.banner_position_x ?? 50}%`,
    '--company-banner-landscape-y': `${data.company.banner_position_y ?? 50}%`,
    '--company-banner-landscape-zoom': String((data.company.banner_landscape_zoom ?? 100) / 100),
    '--company-banner-portrait-x': `${data.company.banner_portrait_position_x ?? data.company.banner_position_x ?? 50}%`,
    '--company-banner-portrait-y': `${data.company.banner_portrait_position_y ?? data.company.banner_position_y ?? 50}%`,
    '--company-banner-portrait-zoom': String((data.company.banner_portrait_zoom ?? 100) / 100)
  } as CSSProperties;
  const selectedSite = data.sites.find((site) => site.id === siteId) ?? data.sites[0] ?? null;
  const minDate = dateInput();
  const effectiveMaxDays = selectedServices.reduce(
    (limit, service) => Math.min(limit, service.booking_max_days_ahead ?? limit),
    data.settings.max_days_ahead || 90
  );
  const maxDate = dateInput(addDays(new Date(), effectiveMaxDays));
  const bookingStep = serviceIds.length === 0 ? 1 : !date ? 2 : !selectedSlot ? 3 : 4;

  if (result) {
    return <div className={`company-public-page${embedMode ? ' embedded' : ''}`} style={style}>
      <main className="company-public-success">
        <div className="company-public-success-mark">✓</div>
        <p className="eyebrow">RENDEZ-VOUS ENREGISTRÉ</p>
        <h1>{result.status === 'confirmed' ? 'Votre rendez-vous est confirmé' : 'Votre demande a bien été envoyée'}</h1>
        <p>{result.company_name} vous attend le <strong>{fullDate.format(new Date(result.starts_at))}</strong> à <strong>{shortTime.format(new Date(result.starts_at))}</strong>.</p>
        <div className="company-public-recap">
          <span><small>{(result.service_count ?? 1) > 1 ? 'Prestations' : 'Prestation'}</small><strong>{result.service_name}</strong></span>
          <span><small>Avec</small><strong>{result.staff_name}</strong></span>
          <span><small>Lieu</small><strong>{result.site_name}</strong></span>
          <span><small>Tarif</small><strong>{currency.format(result.amount_cents / 100)}</strong></span>
        </div>
        {activationStatus && <section className="company-public-activation-card">
          <span className="company-public-activation-icon"><Icon name={activationStatus.already_active ? 'check' : 'users'} size={22} /></span>
          <div>
            <small>ESPACE CLIENT BEAUTY</small>
            <strong>{activationStatus.already_active ? 'Votre espace client est déjà actif' : activationStatus.invitation_pending ? 'Votre activation est prête' : 'Retrouvez tous vos rendez-vous au même endroit'}</strong>
            <p>{activationStatus.already_active
              ? 'Gérez vos prochains rendez-vous, vos avantages et votre historique sans ressaisir vos coordonnées.'
              : activationStatus.available
                ? `Activez votre espace personnel gratuitement${activationStatus.masked_email ? ` avec ${activationStatus.masked_email}` : ''}. Aucun compte n’était nécessaire pour réserver.`
                : 'Une adresse e-mail est nécessaire dans votre dossier client pour activer cet espace.'}</p>
            {activationMessage && <em>{activationMessage}</em>}
          </div>
          <div className="company-public-activation-actions">
            {activationStatus.already_active
              ? <Link className="primary-button" to="/espace-client-coiffure">Ouvrir mon espace</Link>
              : activationStatus.available && <button className="primary-button" type="button" disabled={activationBusy} onClick={() => void activateClientSpace()}>{activationBusy ? 'Envoi…' : activationStatus.invitation_pending ? 'Renvoyer l’e-mail' : 'Activer mon espace client'}</button>}
          </div>
        </section>}
        <div className="company-public-success-actions">
          <Link className="primary-button" to={`/reservation/${result.token}`}>Gérer mon rendez-vous</Link>
          <Link className="secondary-button" to={`/salon/${result.company_slug}`}>Retour à l’enseigne</Link>
        </div>
      </main>
    </div>;
  }

  return <div className={`company-public-page${embedMode ? ' embedded' : ''}`} style={style}>
    <header className={`company-public-hero${data.company.banner_url ? ' has-banner' : ''}`}>
      {data.company.banner_url && <div className="company-public-hero-media" aria-hidden="true"><img src={data.company.banner_url} alt="" /></div>}
      <div className="company-public-nav">
        <div className="company-public-brand">
          <span>{data.company.logo_url ? <img src={data.company.logo_url} alt="" /> : data.company.name.slice(0, 1).toUpperCase()}</span>
          <div><strong>{data.company.name}</strong><small>Coiffure & beauté</small></div>
        </div>
        <div className="company-public-nav-actions">
          <Link className="company-public-client-link" to="/espace-client-coiffure"><Icon name="users" size={16} /> Mon espace</Link>
          {data.company.booking_enabled && <a className="company-public-book-button" href="#reserver"><Icon name="calendar" size={16} /> Prendre rendez-vous</a>}
        </div>
      </div>
      <div className="company-public-hero-content">
        <div className="company-public-hero-badges"><span>Coiffure & beauté</span>{data.company.booking_enabled && <span className="available"><i /> Réservation en ligne</span>}</div>
        <h1>{data.company.name}</h1>
        <p className="company-public-tagline">{data.company.tagline || 'Votre moment beauté, simplement.'}</p>
        {data.company.description && <p className="company-public-description">{data.company.description}</p>}
        <div className="company-public-contact-row">
          {selectedSite && <a href="#infos"><Icon name="map" size={16} /> {[selectedSite.address, selectedSite.postal_code, selectedSite.city].filter(Boolean).join(' ') || selectedSite.name}</a>}
          {data.company.phone && <a href={`tel:${data.company.phone}`}><Icon name="phone" size={16} /> {data.company.phone}</a>}
        </div>
      </div>
    </header>

    <nav className="company-public-tabs" aria-label="Navigation de l’enseigne">
      <div>
        <a href="#reserver" className="active">Réserver</a>
        <a href="#prestations">Prestations</a>
        {data.staff.length > 0 && <a href="#equipe">Équipe</a>}
        <a href="#avis">Avis</a>
        <a href="#infos">Infos</a>
      </div>
    </nav>

    <main className="company-public-content">
      {data.sites.length > 0 && <section className="company-public-info-grid" id="infos">
        <article><span className="company-public-info-icon"><Icon name="map" size={20} /></span><div><small>Adresse</small><strong>{selectedSite?.name || data.sites[0].name}</strong><p>{[selectedSite?.address, selectedSite?.postal_code, selectedSite?.city].filter(Boolean).join(' ')}</p></div></article>
        <article><span className="company-public-info-icon"><Icon name="clock" size={20} /></span><div><small>Horaires</small><strong>{data.company.hours_text || 'Sur rendez-vous'}</strong>{data.company.practical_info && <p>{data.company.practical_info}</p>}</div></article>
      </section>}

      <section className="company-public-booking" id="reserver">
        <div className="company-public-booking-head">
          <div><p className="eyebrow">RÉSERVATION</p><h2>{data.company.booking_enabled ? 'Choisissez votre rendez-vous' : 'Réservation temporairement fermée'}</h2><p>{data.settings.welcome_text || (data.company.booking_enabled ? 'Un parcours simple, étape par étape.' : 'Contactez directement l’enseigne pour toute demande.')}</p></div>
          {data.company.booking_enabled && <div className="company-public-step-meter" aria-label={`Étape ${bookingStep} sur 4`}><span className={bookingStep >= 1 ? 'done' : ''}>1</span><i className={bookingStep >= 2 ? 'done' : ''}/><span className={bookingStep >= 2 ? 'done' : ''}>2</span><i className={bookingStep >= 3 ? 'done' : ''}/><span className={bookingStep >= 3 ? 'done' : ''}>3</span><i className={bookingStep >= 4 ? 'done' : ''}/><span className={bookingStep >= 4 ? 'done' : ''}>4</span></div>}
        </div>

        {data.company.booking_enabled ? <div className="company-public-booking-flow">
          {data.sites.length > 1 && <div className="company-public-site-choice"><label>Lieu<select value={siteId} onChange={(event) => { setSiteId(event.target.value); setStaffId('any'); setSelectedSlot(null); }}>{data.sites.map((site) => <option key={site.id} value={site.id}>{site.name}{site.city ? ` · ${site.city}` : ''}</option>)}</select></label></div>}

          <section className="company-public-book-step open">
            <div className="company-public-step-title"><span>1</span><div><strong>Choisissez vos prestations</strong><small>{selectedServices.length > 0 ? `${selectedServices.length} prestation${selectedServices.length > 1 ? 's' : ''} · ${durationLabel(selectedDuration)} · ${currency.format(selectedAmount / 100)}` : 'Sélectionnez une ou plusieurs prestations'}</small></div></div>
            <div className="company-public-booking-category-groups">{serviceGroups.map(([category, services]) => <section className="company-public-booking-category" key={category}><div className="company-public-booking-category-head"><strong>{category}</strong><small>{services.length} prestation{services.length > 1 ? 's' : ''}</small></div><div className="company-public-booking-services">{services.map((service) => { const selected = serviceIds.includes(service.id); return <button type="button" key={service.id} className={selected ? 'active' : ''} onClick={() => chooseService(service.id)}><span className="company-public-service-thumb">{service.image_url ? <img src={service.image_url} alt="" /> : <Icon name="sparkles" size={20} />}</span><span className="company-public-service-copy"><strong>{service.name}</strong>{service.description && <small>{service.description}</small>}</span><b>{durationLabel(service.duration_minutes)} · {currency.format(service.price_cents / 100)}</b><em>{selected ? '✓' : '+'}</em></button>; })}</div></section>)}{data.services.length === 0 && <div className="company-public-empty">Les prestations seront bientôt disponibles en ligne.</div>}</div>
            {selectedServices.length > 0 && <div className="company-public-multi-selection"><div className="company-public-multi-selection-head"><div><span>Votre rendez-vous</span><strong>{selectedServices.length} prestation{selectedServices.length > 1 ? 's' : ''}</strong></div><button type="button" onClick={clearServices}>Tout retirer</button></div><div className="company-public-multi-selection-items">{selectedServices.map((service, index) => <div key={service.id}><span>{index + 1}</span><div><strong>{service.name}</strong><small>{durationLabel(service.duration_minutes)}</small></div><b>{currency.format(service.price_cents / 100)}</b><button type="button" aria-label={`Retirer ${service.name}`} onClick={() => chooseService(service.id)}>×</button></div>)}</div><footer><span>Durée estimée <strong>{durationLabel(selectedDuration)}</strong></span><span>Total <strong>{currency.format(selectedAmount / 100)}</strong></span></footer></div>}
          </section>

          {serviceIds.length > 0 && <section className="company-public-book-step open">
            <div className="company-public-step-title"><span>2</span><div><strong>Avec qui ?</strong><small>Choisissez un professionnel ou laissez l’enseigne vous proposer le premier disponible</small></div></div>
            <div className="company-public-staff-choice">
              <button type="button" className={staffId === 'any' ? 'active' : ''} onClick={() => { setPendingQuickSlot(null); setSelectedSlot(null); setStaffId('any'); }}><span className="any"><Icon name="sparkles" size={19} /></span><strong>Peu importe</strong><small>Premier disponible</small></button>
              {compatibleStaff.map((member) => <button type="button" key={member.id} className={staffId === member.id ? 'active' : ''} onClick={() => { setPendingQuickSlot(null); setSelectedSlot(null); setStaffId(member.id); }}><span style={{ background: member.color || data.company.primary_color }}>{member.display_name.slice(0, 1).toUpperCase()}</span><strong>{member.display_name}</strong><small>Compatible avec toute la sélection</small></button>)}
            </div>
            {compatibleStaff.length === 0 && <div className="company-public-multi-warning"><Icon name="info" size={17} /><span><strong>Aucun professionnel ne réalise toute cette combinaison.</strong><small>Retirez une prestation ou contactez l’enseigne pour organiser ce rendez-vous.</small></span></div>}
          </section>}

          {serviceIds.length > 0 && <div className="company-public-next-availability">
            <div className="company-public-next-head"><span>⚡</span><div><strong>Premiers créneaux disponibles</strong><small>{staffId === 'any' ? 'NCR cherche le premier professionnel disponible pour vous.' : 'Les prochains créneaux avec le professionnel choisi.'}</small></div></div>
            {loadingNextSlots ? <p className="company-public-hint">Recherche des meilleurs créneaux…</p> : nextSlots.length === 0 ? <p className="company-public-hint">Aucun créneau proche trouvé. Utilisez le calendrier pour explorer les prochaines dates.</p> : <div className="company-public-next-grid">{nextSlots.map((slot) => <button type="button" key={`quick-${slot.slot_start}-${slot.staff_id}`} onClick={() => chooseNextSlot(slot)}><span><small>{shortDay.format(new Date(slot.slot_start)).replace('.', '')} {shortDayNumber.format(new Date(slot.slot_start)).replace('.', '')}</small><strong>{shortTime.format(new Date(slot.slot_start))}</strong></span><em>{slot.staff_name}</em><b>Choisir</b></button>)}</div>}
          </div>}

          {serviceIds.length > 0 && <section className="company-public-book-step open">
            <div className="company-public-step-title"><span>3</span><div><strong>Date & heure</strong><small>Choisissez un créneau ci-dessus ou explorez le calendrier</small></div></div>
            <div className="company-public-date-row">
              <div className="company-public-quick-dates">{quickDates.map((item) => { const value = dateInput(item); return <button type="button" key={value} className={date === value ? 'active' : ''} onClick={() => setDate(value)}><small>{shortDay.format(item).replace('.', '')}</small><strong>{shortDayNumber.format(item).replace('.', '')}</strong></button>; })}</div>
              <label className="company-public-date-picker"><span>Autre date</span><input type="date" value={date} min={minDate} max={maxDate} onChange={(event) => { setPendingQuickSlot(null); setSelectedSlot(null); setDate(event.target.value); }} /></label>
            </div>
            <div className="company-public-slots">
              <div className="company-public-slots-head"><h3>{fullDate.format(new Date(`${date}T12:00:00`))}</h3>{selectedServices.length > 0 && <span>{selectedServices.length > 1 ? `${selectedServices.length} prestations · ${durationLabel(selectedDuration)}` : selectedServices[0].name}</span>}</div>
              {loadingSlots ? <p className="company-public-hint">Recherche des disponibilités…</p> : displayedSlots.length === 0 ? <p className="company-public-hint">Aucun créneau disponible ce jour-là. Essayez une autre date.</p> : <div>{displayedSlots.map((slot) => <button type="button" key={`${slot.slot_start}-${slot.staff_id}`} className={selectedSlot?.slot_start === slot.slot_start && selectedSlot.staff_id === slot.staff_id ? 'active' : ''} onClick={() => setSelectedSlot(slot)}><strong>{shortTime.format(new Date(slot.slot_start))}</strong><small>{slot.staff_name}</small></button>)}</div>}
            </div>
          </section>}

          {selectedSlot && selectedServices.length > 0 && <section className="company-public-book-step open final-step">
            <div className="company-public-step-title"><span>4</span><div><strong>{portalIdentity ? 'Confirmez votre rendez-vous' : 'Vos coordonnées'}</strong><small>{portalIdentity ? 'Votre identité est déjà liée à votre espace client' : 'Dernière étape avant confirmation'}</small></div></div>
            <form className="company-public-customer-form" onSubmit={submit}>
              <div className={`company-public-booking-summary${selectedService?.image_url ? ' has-image' : ''}`}>{selectedService?.image_url && <span className="company-public-summary-image"><img src={selectedService.image_url} alt="" /></span>}<div><small>{selectedServices.length > 1 ? 'Vos prestations' : 'Votre sélection'}</small><strong>{selectedServices.map((service) => service.name).join(' + ')}</strong></div><span>{fullDate.format(new Date(selectedSlot.slot_start))} · {shortTime.format(new Date(selectedSlot.slot_start))} · {selectedSlot.staff_name} · {durationLabel(selectedDuration)}</span><b>{currency.format(selectedAmount / 100)}</b></div>
              {portalIdentity && <div className="company-public-portal-identity"><span><Icon name="check" size={18} /></span><div><small>Réservation pour</small><strong>{[portalIdentity.first_name, portalIdentity.last_name].filter(Boolean).join(' ')}</strong><p>Vos coordonnées sont reprises automatiquement depuis votre dossier client chez {data.company.name}.</p></div><Link to="/espace-client-coiffure">Mon profil</Link></div>}
              <div className="company-public-fields">
                {!portalIdentity && <><label>Prénom<input value={firstName} onChange={(event) => setFirstName(event.target.value)} required autoComplete="given-name" /></label>
                <label>Nom<input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" /></label>
                <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
                <label>Téléphone<input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" /></label></>}
                <label className="full">Message<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Une précision pour l’enseigne ? (optionnel)" /></label>
                {!portalIdentity && <label className="company-public-honeypot" aria-hidden="true">Site web<input value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" /></label>}
                <label className="company-public-consent full"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required /><span>{data.settings.privacy_notice || 'J’accepte que mes coordonnées soient utilisées pour organiser et suivre mon rendez-vous.'}</span></label>
              </div>
              {error && <div className="error-message" role="alert">{error}</div>}
              <button className="company-public-confirm" type="submit" disabled={saving}>{saving ? 'Réservation…' : data.settings.confirmation_mode === 'manual' ? 'Envoyer ma demande' : 'Confirmer mon rendez-vous'}</button>
              {data.settings.cancellation_policy && <p className="company-public-policy">{data.settings.cancellation_policy}</p>}
            </form>
          </section>}
        </div> : <div className="company-public-contact-card"><strong>Besoin d’un rendez-vous ?</strong><p>La réservation en ligne est temporairement désactivée.</p>{data.company.phone && <a href={`tel:${data.company.phone}`} className="primary-button">Appeler l’enseigne</a>}</div>}
      </section>

      <section className="company-public-section" id="prestations">
        <div className="company-public-section-heading"><p className="eyebrow">PRESTATIONS</p><h2>Tout ce que propose {data.company.name}</h2><p>Durée et tarif sont affichés clairement avant toute réservation.</p></div>
        <div className="company-public-service-category-groups">
          {serviceGroups.map(([category, services]) => <section className="company-public-service-category" key={category}><div className="company-public-service-category-head"><div><span>CATÉGORIE</span><h3>{category}</h3></div><small>{services.length} prestation{services.length > 1 ? 's' : ''}</small></div><div className="company-public-service-grid">{services.map((service) => <button type="button" key={service.id} className={serviceIds.includes(service.id) ? 'active' : ''} onClick={() => { chooseService(service.id); document.getElementById('reserver')?.scrollIntoView({ behavior: 'smooth' }); }}><span className={`company-public-service-card-image${service.image_url ? '' : ' fallback'}`}>{service.image_url ? <img src={service.image_url} alt="" /> : <Icon name="camera" size={28} />}</span><div><strong>{service.name}</strong>{service.description && <p>{service.description}</p>}</div><span><small>{durationLabel(service.duration_minutes)}</small><b>{currency.format(service.price_cents / 100)}</b></span></button>)}</div></section>)}
          {data.services.length === 0 && <div className="company-public-empty">Les prestations seront bientôt disponibles en ligne.</div>}
        </div>
      </section>

      {data.staff.length > 0 && <section className="company-public-section" id="equipe">
        <div className="company-public-section-heading"><p className="eyebrow">ÉQUIPE</p><h2>Les professionnels de l’enseigne</h2><p>Chaque collaborateur est présenté uniquement avec les prestations qu’il réalise dans cette enseigne.</p></div>
        <div className="company-public-team-grid">{data.staff.map((member) => <article key={member.id}><span style={{ background: member.color || data.company.primary_color }}>{member.display_name.slice(0, 1).toUpperCase()}</span><strong>{member.display_name}</strong><small>{member.service_ids.length} prestation{member.service_ids.length > 1 ? 's' : ''}</small>{serviceIds.length > 0 && serviceIds.every((id) => member.service_ids.includes(id)) && <em>Compatible avec toute votre sélection</em>}</article>)}</div>
      </section>}

      <BeautyPublicReviews slug={data.company.public_slug}/>

      <section className="company-public-about" id="a-propos">
        <div><p className="eyebrow">À PROPOS</p><h2>{data.company.name}</h2><p>{data.company.description || data.company.tagline || 'Découvrez une expérience beauté pensée autour de vos besoins et de votre confort.'}</p></div>
        <aside><span><Icon name="clock" size={18}/><strong>{data.company.hours_text || 'Sur rendez-vous'}</strong></span>{data.company.practical_info && <p>{data.company.practical_info}</p>}{data.company.email && <a href={`mailto:${data.company.email}`}><Icon name="message" size={16}/> {data.company.email}</a>}{data.company.phone && <a href={`tel:${data.company.phone}`}><Icon name="phone" size={16}/> {data.company.phone}</a>}</aside>
      </section>
    </main>

    <footer className="company-public-footer"><strong>{data.company.name}</strong><div><Link to="/espace-client-coiffure">Espace client</Link>{data.company.show_ncr_branding && <span>Propulsé par NCR Suite</span>}</div></footer>
  </div>;
}