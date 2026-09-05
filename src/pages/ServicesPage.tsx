import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useBeautyEnseigneContext } from '../hooks/useBeautyEnseigneContext';
import { useConfirmDialog } from '../contexts/ConfirmDialogContext';
import { supabase } from '../lib/supabase';
import '../beautyServiceImages.css';

interface ServiceRecord {
  id: string;
  company_id?: string | null;
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
  active: boolean;
  created_at: string;
}

interface ServiceFormState {
  name: string;
  categoryName: string;
  description: string;
  durationMinutes: string;
  price: string;
  onlineBookingEnabled: boolean;
  bookingMinNoticeHours: string;
  bookingMaxDaysAhead: string;
  bookingBufferBeforeMinutes: string;
  bookingBufferAfterMinutes: string;
  bookingWeekdays: number[];
  bookingStartTime: string;
  bookingEndTime: string;
}

type StatusFilter = 'all' | 'active' | 'inactive';

const emptyForm: ServiceFormState = {
  name: '',
  categoryName: '',
  description: '',
  durationMinutes: '30',
  price: '',
  onlineBookingEnabled: true,
  bookingMinNoticeHours: '',
  bookingMaxDaysAhead: '',
  bookingBufferBeforeMinutes: '0',
  bookingBufferAfterMinutes: '0',
  bookingWeekdays: [],
  bookingStartTime: '',
  bookingEndTime: ''
};
const beautyWeekdays = [
  { value: 0, label: 'Lun' },
  { value: 1, label: 'Mar' },
  { value: 2, label: 'Mer' },
  { value: 3, label: 'Jeu' },
  { value: 4, label: 'Ven' },
  { value: 5, label: 'Sam' },
  { value: 6, label: 'Dim' }
] as const;
const currencyFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const acceptedImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];

function normalizeNullable(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} h ${remainingMinutes.toString().padStart(2, '0')}` : `${hours} h`;
}

function parsePriceToCents(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [euros, decimals = ''] = normalized.split('.');
  return Number(euros) * 100 + Number(decimals.padEnd(2, '0'));
}

function serviceToForm(service: ServiceRecord): ServiceFormState {
  return {
    name: service.name,
    categoryName: service.category_name ?? '',
    description: service.description ?? '',
    durationMinutes: String(service.duration_minutes),
    price: (service.price_cents / 100).toFixed(2).replace('.', ','),
    onlineBookingEnabled: service.online_booking_enabled !== false,
    bookingMinNoticeHours: service.booking_min_notice_hours == null ? '' : String(service.booking_min_notice_hours),
    bookingMaxDaysAhead: service.booking_max_days_ahead == null ? '' : String(service.booking_max_days_ahead),
    bookingBufferBeforeMinutes: String(service.booking_buffer_before_minutes ?? 0),
    bookingBufferAfterMinutes: String(service.booking_buffer_after_minutes ?? 0),
    bookingWeekdays: Array.isArray(service.booking_weekdays) ? service.booking_weekdays : [],
    bookingStartTime: service.booking_start_time?.slice(0, 5) ?? '',
    bookingEndTime: service.booking_end_time?.slice(0, 5) ?? ''
  };
}

function imageExtension(file: File) {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

async function convertAppleImageIfNeeded(file: File) {
  if (!['image/heic', 'image/heif'].includes(file.type)) return file;
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Cette photo HEIC ne peut pas être convertie sur cet appareil. Utilisez une image JPG, PNG ou WebP.'));
      element.src = sourceUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Conversion de l’image impossible.');
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) throw new Error('Conversion de l’image impossible.');
    return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export function ServicesPage() {
  const { organization } = useOrganization();
  const { demoMode } = useAuth();
  const { beautyMode, selectedEnseigne, selectedEnseigneId, loading: enseigneLoading } = useBeautyEnseigneContext();
  const { confirm } = useConfirmDialog();
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [form, setForm] = useState<ServiceFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const formOpen = searchParams.get('new') === '1' || editingId !== null;
  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');

  useEffect(() => {
    if (!organization) return;
    const organizationId = organization.id;
    let active = true;

    async function loadServices() {
      if (beautyMode && enseigneLoading) return;
      setLoading(true);
      setError('');

      if (beautyMode && !selectedEnseigneId) {
        if (active) {
          setServices([]);
          setLoading(false);
        }
        return;
      }

      if (demoMode || !supabase) {
        const stored = localStorage.getItem(`ncr-suite-demo-services-${organizationId}`);
        const rows = stored ? JSON.parse(stored) as ServiceRecord[] : [];
        const scoped = beautyMode ? rows.filter((row) => row.company_id === selectedEnseigneId) : rows;
        if (active) {
          setServices(scoped);
          setLoading(false);
        }
        return;
      }

      let request = supabase
        .from('services')
        .select('id,company_id,name,category_name,description,duration_minutes,price_cents,image_url,online_booking_enabled,booking_min_notice_hours,booking_max_days_ahead,booking_buffer_before_minutes,booking_buffer_after_minutes,booking_weekdays,booking_start_time,booking_end_time,active,created_at')
        .eq('organization_id', organizationId);
      if (beautyMode && selectedEnseigneId) request = request.eq('company_id', selectedEnseigneId);
      const { data, error: loadError } = await request
        .order('active', { ascending: false })
        .order('name', { ascending: true });

      if (!active) return;
      if (loadError) setError(`Impossible de charger les prestations : ${loadError.message}`);
      else setServices((data ?? []) as ServiceRecord[]);
      setLoading(false);
    }

    void loadServices();
    return () => { active = false; };
  }, [organization?.id, demoMode, beautyMode, selectedEnseigneId, enseigneLoading]);

  useEffect(() => {
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview('');
    setRemoveImage(false);
    setSearchParams({});
    setQuery('');
    setSuccess('');
  }, [selectedEnseigneId]);

  useEffect(() => () => {
    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const filteredServices = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    return services.filter((service) => {
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && service.active)
        || (statusFilter === 'inactive' && !service.active);
      const matchesQuery = !needle || [service.name, service.category_name, service.description]
        .filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [services, query, statusFilter]);

  const activeCount = services.filter((service) => service.active).length;
  const categoryOptions = useMemo(() => [...new Set(services
    .map((service) => service.category_name?.trim())
    .filter((value): value is string => Boolean(value)))]
    .sort((a, b) => a.localeCompare(b, 'fr')), [services]);
  const groupedFilteredServices = useMemo(() => {
    const groups = new Map<string, ServiceRecord[]>();
    filteredServices.forEach((service) => {
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
  }, [filteredServices]);

  function resetImageEditor(nextPreview = '') {
    setImageFile(null);
    setImagePreview(nextPreview);
    setRemoveImage(false);
  }

  function openCreateForm() {
    if (!canManage || (beautyMode && !selectedEnseigneId)) return;
    setEditingId(null);
    setForm(emptyForm);
    resetImageEditor();
    setError('');
    setSuccess('');
    setSearchParams({ new: '1' });
  }

  function openEditForm(service: ServiceRecord) {
    if (!canManage) return;
    setSearchParams({});
    setEditingId(service.id);
    setForm(serviceToForm(service));
    resetImageEditor(service.image_url ?? '');
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeForm() {
    setEditingId(null);
    setForm(emptyForm);
    resetImageEditor();
    setError('');
    setSearchParams({});
  }

  function selectImage(file: File | null) {
    if (!file) return;
    setError('');
    if (!acceptedImageTypes.includes(file.type) && !file.type.startsWith('image/')) {
      setError('Choisissez une image PNG, JPG, WebP ou une photo compatible.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('La photo de la prestation ne doit pas dépasser 8 Mo.');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveImage(false);
  }

  function removeServiceImage() {
    setImageFile(null);
    setImagePreview('');
    setRemoveImage(true);
  }

  async function uploadServiceImage(serviceId: string, file: File) {
    if (!organization || !selectedEnseigneId || !supabase) throw new Error('Le service de fichiers est indisponible.');
    const normalized = await convertAppleImageIfNeeded(file);
    const path = `${organization.id}/beauty-service-${selectedEnseigneId}-${serviceId}-${Date.now()}.${imageExtension(normalized)}`;
    const { error: uploadError } = await supabase.storage
      .from('organization-branding')
      .upload(path, normalized, { contentType: normalized.type, cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;
    return supabase.storage.from('organization-branding').getPublicUrl(path).data.publicUrl;
  }

  async function handleSaveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !canManage) return;
    if (beautyMode && !selectedEnseigneId) {
      setError('Créez ou sélectionnez d’abord une enseigne.');
      return;
    }

    const name = form.name.trim();
    const categoryName = form.categoryName.trim();
    const durationMinutes = Number(form.durationMinutes);
    const priceCents = parsePriceToCents(form.price);
    const bookingMinNoticeHours = form.bookingMinNoticeHours === '' ? null : Number(form.bookingMinNoticeHours);
    const bookingMaxDaysAhead = form.bookingMaxDaysAhead === '' ? null : Number(form.bookingMaxDaysAhead);
    const bookingBufferBeforeMinutes = Number(form.bookingBufferBeforeMinutes || '0');
    const bookingBufferAfterMinutes = Number(form.bookingBufferAfterMinutes || '0');
    const bookingStartTime = form.bookingStartTime || null;
    const bookingEndTime = form.bookingEndTime || null;
    if (name.length < 2) { setError('Le nom de la prestation doit contenir au moins 2 caractères.'); return; }
    if (beautyMode && categoryName.length < 2) { setError('Indiquez une catégorie pour ranger cette prestation.'); return; }
    if (beautyMode && categoryName.length > 80) { setError('La catégorie ne doit pas dépasser 80 caractères.'); return; }
    if (beautyMode && bookingMinNoticeHours !== null && (!Number.isInteger(bookingMinNoticeHours) || bookingMinNoticeHours < 0 || bookingMinNoticeHours > 720)) { setError('Le délai minimum doit être compris entre 0 et 720 heures.'); return; }
    if (beautyMode && bookingMaxDaysAhead !== null && (!Number.isInteger(bookingMaxDaysAhead) || bookingMaxDaysAhead < 1 || bookingMaxDaysAhead > 365)) { setError('La période de réservation doit être comprise entre 1 et 365 jours.'); return; }
    if (beautyMode && (!Number.isInteger(bookingBufferBeforeMinutes) || bookingBufferBeforeMinutes < 0 || bookingBufferBeforeMinutes > 240)) { setError('Le temps de préparation doit être compris entre 0 et 240 minutes.'); return; }
    if (beautyMode && (!Number.isInteger(bookingBufferAfterMinutes) || bookingBufferAfterMinutes < 0 || bookingBufferAfterMinutes > 240)) { setError('Le temps après prestation doit être compris entre 0 et 240 minutes.'); return; }
    if (beautyMode && Boolean(bookingStartTime) !== Boolean(bookingEndTime)) { setError('Renseignez le début et la fin de la plage réservable, ou laissez les deux champs vides.'); return; }
    if (beautyMode && bookingStartTime && bookingEndTime && bookingStartTime >= bookingEndTime) { setError('L’heure de fin doit être après l’heure de début.'); return; }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 720) { setError('La durée doit être comprise entre 5 minutes et 12 heures.'); return; }
    if (priceCents === null || priceCents < 0) { setError('Indiquez un tarif valide, avec au maximum deux décimales.'); return; }

    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      organization_id: organization.id,
      ...(beautyMode ? { company_id: selectedEnseigneId } : {}),
      name,
      ...(beautyMode ? { category_name: categoryName } : {}),
      description: normalizeNullable(form.description),
      duration_minutes: durationMinutes,
      price_cents: priceCents,
      ...(beautyMode ? {
        online_booking_enabled: form.onlineBookingEnabled,
        booking_min_notice_hours: bookingMinNoticeHours,
        booking_max_days_ahead: bookingMaxDaysAhead,
        booking_buffer_before_minutes: bookingBufferBeforeMinutes,
        booking_buffer_after_minutes: bookingBufferAfterMinutes,
        booking_weekdays: form.bookingWeekdays.length > 0 ? form.bookingWeekdays : null,
        booking_start_time: bookingStartTime,
        booking_end_time: bookingEndTime
      } : {})
    };

    const wasEditing = Boolean(editingId);

    try {
      let saved: ServiceRecord;
      if (demoMode || !supabase) {
        const stored = localStorage.getItem(`ncr-suite-demo-services-${organization.id}`);
        const allRows = stored ? JSON.parse(stored) as ServiceRecord[] : [];
        const existing = allRows.find((service) => service.id === editingId);
        saved = {
          id: existing?.id ?? crypto.randomUUID(),
          company_id: beautyMode ? selectedEnseigneId : existing?.company_id ?? null,
          name: payload.name,
          category_name: beautyMode ? categoryName : existing?.category_name ?? null,
          description: payload.description,
          duration_minutes: payload.duration_minutes,
          price_cents: payload.price_cents,
          image_url: removeImage ? null : existing?.image_url ?? null,
          online_booking_enabled: beautyMode ? form.onlineBookingEnabled : existing?.online_booking_enabled,
          booking_min_notice_hours: beautyMode ? bookingMinNoticeHours : existing?.booking_min_notice_hours ?? null,
          booking_max_days_ahead: beautyMode ? bookingMaxDaysAhead : existing?.booking_max_days_ahead ?? null,
          booking_buffer_before_minutes: beautyMode ? bookingBufferBeforeMinutes : existing?.booking_buffer_before_minutes ?? 0,
          booking_buffer_after_minutes: beautyMode ? bookingBufferAfterMinutes : existing?.booking_buffer_after_minutes ?? 0,
          booking_weekdays: beautyMode ? (form.bookingWeekdays.length > 0 ? form.bookingWeekdays : null) : existing?.booking_weekdays ?? null,
          booking_start_time: beautyMode ? bookingStartTime : existing?.booking_start_time ?? null,
          booking_end_time: beautyMode ? bookingEndTime : existing?.booking_end_time ?? null,
          active: existing?.active ?? true,
          created_at: existing?.created_at ?? new Date().toISOString()
        };
        const next = existing ? allRows.map((service) => service.id === saved.id ? saved : service) : [saved, ...allRows];
        localStorage.setItem(`ncr-suite-demo-services-${organization.id}`, JSON.stringify(next));
      } else if (editingId) {
        let request = supabase.from('services').update({
          name: payload.name,
          ...(beautyMode ? { category_name: categoryName } : {}),
          description: payload.description,
          duration_minutes: payload.duration_minutes,
          price_cents: payload.price_cents,
          ...(beautyMode ? {
            online_booking_enabled: form.onlineBookingEnabled,
            booking_min_notice_hours: bookingMinNoticeHours,
            booking_max_days_ahead: bookingMaxDaysAhead,
            booking_buffer_before_minutes: bookingBufferBeforeMinutes,
            booking_buffer_after_minutes: bookingBufferAfterMinutes,
            booking_weekdays: form.bookingWeekdays.length > 0 ? form.bookingWeekdays : null,
            booking_start_time: bookingStartTime,
            booking_end_time: bookingEndTime
          } : {})
        }).eq('organization_id', organization.id).eq('id', editingId);
        if (beautyMode && selectedEnseigneId) request = request.eq('company_id', selectedEnseigneId);
        const { data, error: updateError } = await request
          .select('id,company_id,name,category_name,description,duration_minutes,price_cents,image_url,online_booking_enabled,booking_min_notice_hours,booking_max_days_ahead,booking_buffer_before_minutes,booking_buffer_after_minutes,booking_weekdays,booking_start_time,booking_end_time,active,created_at').single();
        if (updateError) throw updateError;
        saved = data as ServiceRecord;
      } else {
        const { data, error: insertError } = await supabase.from('services').insert(payload)
          .select('id,company_id,name,category_name,description,duration_minutes,price_cents,image_url,online_booking_enabled,booking_min_notice_hours,booking_max_days_ahead,booking_buffer_before_minutes,booking_buffer_after_minutes,booking_weekdays,booking_start_time,booking_end_time,active,created_at').single();
        if (insertError) throw insertError;
        saved = data as ServiceRecord;
      }

      let mediaWarning = '';
      if (!demoMode && supabase && beautyMode && selectedEnseigneId && (imageFile || removeImage)) {
        try {
          const nextImageUrl = imageFile ? await uploadServiceImage(saved.id, imageFile) : null;
          const { data: mediaSaved, error: mediaError } = await supabase.from('services')
            .update({ image_url: nextImageUrl })
            .eq('organization_id', organization.id)
            .eq('company_id', selectedEnseigneId)
            .eq('id', saved.id)
            .select('id,company_id,name,category_name,description,duration_minutes,price_cents,image_url,online_booking_enabled,booking_min_notice_hours,booking_max_days_ahead,booking_buffer_before_minutes,booking_buffer_after_minutes,booking_weekdays,booking_start_time,booking_end_time,active,created_at')
            .single();
          if (mediaError) throw mediaError;
          saved = mediaSaved as ServiceRecord;
        } catch (caught) {
          mediaWarning = caught instanceof Error ? caught.message : 'Photo non enregistrée.';
        }
      }

      setServices((current) => {
        const exists = current.some((service) => service.id === saved.id);
        return exists ? current.map((service) => service.id === saved.id ? saved : service) : [saved, ...current];
      });
      setSuccess(beautyMode && selectedEnseigne
        ? `${wasEditing ? 'Prestation mise à jour' : 'Prestation créée'} pour ${selectedEnseigne.name}.`
        : wasEditing ? 'La prestation a bien été mise à jour.' : 'La prestation a bien été créée.');
      if (mediaWarning) setError(`La prestation est enregistrée, mais la photo n’a pas pu être enregistrée : ${mediaWarning}`);
      setEditingId(null);
      setForm(emptyForm);
      resetImageEditor();
      setSearchParams({});
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Une erreur inconnue est survenue.';
      setError(`${wasEditing ? 'Modification' : 'Création'} impossible : ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleServiceStatus(service: ServiceRecord) {
    if (!organization || !canManage) return;
    const nextActive = !service.active;
    const decision = await confirm({
      title: `${nextActive ? 'Réactiver' : 'Désactiver'} ${service.name} ?`,
      message: nextActive
        ? 'La prestation redeviendra disponible dans le catalogue et dans les parcours qui l’utilisent.'
        : beautyMode
          ? 'La prestation reste conservée dans l’historique, mais elle ne sera plus proposée pour les nouveaux rendez-vous tant qu’elle est désactivée.'
          : 'La prestation reste conservée dans l’historique, mais elle ne sera plus proposée tant qu’elle est désactivée.',
      confirmLabel: nextActive ? 'Réactiver' : 'Désactiver',
      tone: nextActive ? 'default' : 'warning'
    });
    if (!decision.confirmed) return;
    setBusyId(service.id);
    setError('');
    setSuccess('');

    try {
      if (demoMode || !supabase) {
        const stored = localStorage.getItem(`ncr-suite-demo-services-${organization.id}`);
        const allRows = stored ? JSON.parse(stored) as ServiceRecord[] : [];
        const next = allRows.map((row) => row.id === service.id ? { ...row, active: nextActive } : row);
        localStorage.setItem(`ncr-suite-demo-services-${organization.id}`, JSON.stringify(next));
      } else {
        let request = supabase.from('services').update({ active: nextActive })
          .eq('organization_id', organization.id).eq('id', service.id);
        if (beautyMode && selectedEnseigneId) request = request.eq('company_id', selectedEnseigneId);
        const { error: updateError } = await request;
        if (updateError) throw updateError;
      }
      setServices((current) => current.map((row) => row.id === service.id ? { ...row, active: nextActive } : row));
      setSuccess(nextActive ? 'La prestation est de nouveau disponible.' : 'La prestation a été désactivée.');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Une erreur inconnue est survenue.';
      setError(`Mise à jour impossible : ${message}`);
    } finally {
      setBusyId(null);
    }
  }

  if (!organization) return null;

  return (
    <div className="page services-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">CATALOGUE</p>
          <h1>Prestations</h1>
          <p>{beautyMode
            ? selectedEnseigne ? `Catalogue propre à l’enseigne ${selectedEnseigne.name}.` : 'Créez une enseigne pour commencer à définir ses prestations.'
            : `Définissez les services, les durées et les tarifs proposés par ${organization.name}.`}</p>
        </div>
        {canManage && <button className="primary-button" type="button" onClick={openCreateForm} disabled={beautyMode && !selectedEnseigneId}><Icon name="sparkles" size={18} />Créer une prestation</button>}
      </header>

      {beautyMode && !selectedEnseigneId && !enseigneLoading && <div className="info-message page-message" role="status">Aucune enseigne n’est encore configurée. Créez-la d’abord dans « Centre & enseignes ».</div>}
      {!canManage && <div className="info-message page-message" role="status">Votre rôle permet de consulter les prestations, mais pas de les modifier.</div>}

      {formOpen && canManage && (!beautyMode || selectedEnseigneId) && (
        <section className="panel service-form-panel" aria-labelledby="service-form-title">
          <div className="panel-header">
            <div><p className="eyebrow">{editingId ? 'MODIFICATION' : 'NOUVELLE PRESTATION'}</p><h2 id="service-form-title">{editingId ? 'Modifier la prestation' : 'Créer une prestation'}</h2>{beautyMode && selectedEnseigne && <small>Enseigne : {selectedEnseigne.name}</small>}</div>
            <button className="secondary-button compact-button" type="button" onClick={closeForm}>Fermer</button>
          </div>
          <form className="service-form" onSubmit={handleSaveService}>
            <label className="service-name-field">Nom de la prestation <span aria-hidden="true">*</span><input autoFocus required minLength={2} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ex. Coupe femme" /></label>
            {beautyMode && <label>Catégorie <span aria-hidden="true">*</span><input required minLength={2} maxLength={80} list="beauty-service-category-options" value={form.categoryName} onChange={(event) => setForm((current) => ({ ...current, categoryName: event.target.value }))} placeholder="Ex. Ongles, Cils, Coiffure…" /><datalist id="beauty-service-category-options">{categoryOptions.map((category) => <option key={category} value={category} />)}</datalist><small>Choisissez une catégorie existante ou saisissez-en une nouvelle.</small></label>}
            <label>Durée <span aria-hidden="true">*</span><select required value={form.durationMinutes} onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))}>{[15,20,30,45,60,75,90,105,120,150,180].map((minutes) => <option key={minutes} value={minutes}>{formatDuration(minutes)}</option>)}</select></label>
            <label>Tarif TTC en euros <span aria-hidden="true">*</span><div className="price-input"><input required inputMode="decimal" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} placeholder="Ex. 35,00" /><span>€</span></div></label>
            <label className="full-field">Description<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Décrivez brièvement la prestation et ce qu’elle comprend…" rows={4} /></label>
            {beautyMode && <details className="beauty-booking-rules full-field">
              <summary><span><Icon name="calendar" size={18} /><span><strong>Règles de réservation</strong><small>Facultatif · par défaut, cette prestation suit les réglages de l’enseigne et du collaborateur.</small></span></span><em>{form.onlineBookingEnabled ? 'Réservable en ligne' : 'Sur demande'}</em></summary>
              <div className="beauty-booking-rules-body">
                <label className="beauty-booking-switch full-field"><input type="checkbox" checked={form.onlineBookingEnabled} onChange={(event) => setForm((current) => ({ ...current, onlineBookingEnabled: event.target.checked }))} /><span><strong>Réservable en ligne</strong><small>Désactivez uniquement si cette prestation doit être prise par téléphone ou directement avec l’enseigne.</small></span></label>
                <div className="beauty-booking-rule-grid">
                  <label>Délai minimum <small>heures · vide = réglage de l’enseigne</small><input type="number" min={0} max={720} inputMode="numeric" disabled={!form.onlineBookingEnabled} value={form.bookingMinNoticeHours} onChange={(event) => setForm((current) => ({ ...current, bookingMinNoticeHours: event.target.value }))} placeholder="Hériter" /></label>
                  <label>Réservable jusqu’à <small>jours à l’avance · vide = enseigne</small><input type="number" min={1} max={365} inputMode="numeric" disabled={!form.onlineBookingEnabled} value={form.bookingMaxDaysAhead} onChange={(event) => setForm((current) => ({ ...current, bookingMaxDaysAhead: event.target.value }))} placeholder="Hériter" /></label>
                  <label>Préparation avant <small>minutes bloquées avant</small><input type="number" min={0} max={240} inputMode="numeric" disabled={!form.onlineBookingEnabled} value={form.bookingBufferBeforeMinutes} onChange={(event) => setForm((current) => ({ ...current, bookingBufferBeforeMinutes: event.target.value }))} /></label>
                  <label>Temps après <small>minutes bloquées après</small><input type="number" min={0} max={240} inputMode="numeric" disabled={!form.onlineBookingEnabled} value={form.bookingBufferAfterMinutes} onChange={(event) => setForm((current) => ({ ...current, bookingBufferAfterMinutes: event.target.value }))} /></label>
                </div>
                <div className="beauty-booking-days">
                  <div><strong>Jours réservables</strong><small>Aucune sélection = tous les jours où le collaborateur travaille.</small></div>
                  <div>{beautyWeekdays.map((day) => <button type="button" key={day.value} disabled={!form.onlineBookingEnabled} className={form.bookingWeekdays.includes(day.value) ? 'active' : ''} onClick={() => setForm((current) => ({ ...current, bookingWeekdays: current.bookingWeekdays.includes(day.value) ? current.bookingWeekdays.filter((value) => value !== day.value) : [...current.bookingWeekdays, day.value].sort() }))}>{day.label}</button>)}</div>
                </div>
                <div className="beauty-booking-rule-grid beauty-booking-time-range">
                  <label>À partir de <small>facultatif</small><input type="time" disabled={!form.onlineBookingEnabled} value={form.bookingStartTime} onChange={(event) => setForm((current) => ({ ...current, bookingStartTime: event.target.value }))} /></label>
                  <label>Jusqu’à <small>facultatif</small><input type="time" disabled={!form.onlineBookingEnabled} value={form.bookingEndTime} onChange={(event) => setForm((current) => ({ ...current, bookingEndTime: event.target.value }))} /></label>
                </div>
                <p className="beauty-booking-rules-note">NCR combine automatiquement ces règles avec les horaires du collaborateur et les rendez-vous déjà pris. Les règles de l’enseigne restent le garde-fou global.</p>
              </div>
            </details>}
            {beautyMode && <div className="beauty-service-media full-field">
              <div className="beauty-service-media-preview">{imagePreview ? <img src={imagePreview} alt="Aperçu de la prestation" /> : <span className="beauty-service-media-placeholder"><Icon name="camera" size={26} />Aucune photo</span>}</div>
              <div className="beauty-service-media-copy"><strong>Photo de la prestation</strong><small>Facultative. Elle sera affichée sur la page publique de l’enseigne et pendant le choix de la prestation.</small><div className="beauty-service-media-actions"><label className="secondary-button compact-button"><Icon name="camera" size={15} />{imagePreview ? 'Remplacer' : 'Ajouter une photo'}<input hidden type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif,image/*" onChange={(event) => { selectImage(event.target.files?.[0] ?? null); event.currentTarget.value = ''; }} /></label>{imagePreview && <button type="button" className="danger-text-button" onClick={removeServiceImage}>Retirer</button>}{imageFile && <span className="beauty-service-media-file">{imageFile.name}</span>}</div></div>
            </div>}
            <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={closeForm}>Annuler</button><button className="primary-button" type="submit" disabled={saving} aria-busy={saving}>{saving ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Enregistrer la prestation'}</button></div>
          </form>
        </section>
      )}

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      <section className="service-summary-grid" aria-label="Résumé des prestations">
        <article className="panel service-summary-card"><span>Prestations actives</span><strong>{activeCount}</strong><small>disponible{activeCount > 1 ? 's' : ''} pour la planification</small></article>
        <article className="panel service-summary-card"><span>Durée moyenne</span><strong>{activeCount > 0 ? formatDuration(Math.round(services.filter((service) => service.active).reduce((total, service) => total + service.duration_minutes, 0) / activeCount)) : '—'}</strong><small>sur les prestations actives</small></article>
        <article className="panel service-summary-card"><span>Tarif moyen</span><strong>{activeCount > 0 ? currencyFormatter.format(services.filter((service) => service.active).reduce((total, service) => total + service.price_cents, 0) / activeCount / 100) : '—'}</strong><small>sur les prestations actives</small></article>
        {beautyMode && <article className="panel service-summary-card"><span>Catégories</span><strong>{categoryOptions.length}</strong><small>propres à cette enseigne</small></article>}
      </section>

      <section className="panel services-list-panel">
        <div className="services-toolbar">
          <div><p className="eyebrow">CATALOGUE{beautyMode && selectedEnseigne ? ` · ${selectedEnseigne.name}` : ''}</p><h2>{services.length} prestation{services.length > 1 ? 's' : ''}</h2></div>
          <div className="services-filters"><label className="search-field"><span className="sr-only">Rechercher une prestation</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une prestation" /></label><label className="status-filter"><span className="sr-only">Filtrer les prestations par statut</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}><option value="active">Actives</option><option value="inactive">Inactives</option><option value="all">Toutes</option></select></label></div>
        </div>

        {loading || enseigneLoading ? <div className="list-state beauty-loading-state" aria-busy="true">Chargement des prestations…</div> : filteredServices.length === 0 ? (
          <div className="list-state empty-service-state"><div className="empty-icon"><Icon name="sparkles" size={30} /></div><h3>{services.length === 0 ? 'Aucune prestation pour le moment' : 'Aucun résultat'}</h3><p>{services.length === 0 ? (beautyMode && selectedEnseigne ? `Aucune prestation n’est encore rattachée à ${selectedEnseigne.name}.` : 'Créez votre catalogue avant d’ajouter les collaborateurs et les rendez-vous.') : 'Modifiez votre recherche ou le filtre sélectionné.'}</p>{services.length === 0 && canManage && (!beautyMode || selectedEnseigneId) && <button className="primary-button" type="button" onClick={openCreateForm}>Créer la première prestation</button>}</div>
        ) : (
          <div className="beauty-service-category-groups">{groupedFilteredServices.map(([category, categoryServices]) => <section className="beauty-service-category-group" key={category}><div className="beauty-service-category-heading"><div><span>CATÉGORIE</span><h3>{category}</h3></div><small>{categoryServices.length} prestation{categoryServices.length > 1 ? 's' : ''}</small></div><div className="services-grid">{categoryServices.map((service) => <article className={`service-card${service.active ? '' : ' inactive'}`} key={service.id}>{beautyMode && <div className={`service-card-image${service.image_url ? '' : ' fallback'}`}>{service.image_url ? <img src={service.image_url} alt="" /> : <Icon name="camera" size={28} />}</div>}<div className="service-card-topline"><div className="service-card-icon"><Icon name="sparkles" size={22} /></div><div className="beauty-service-card-chips">{beautyMode && <><span className="beauty-service-category-chip">{service.category_name || 'Autres'}</span><span className={`beauty-service-booking-chip ${service.online_booking_enabled === false ? 'manual' : 'online'}`}>{service.online_booking_enabled === false ? 'Sur demande' : 'En ligne'}</span></>}<span className={`status-chip ${service.active ? 'active' : 'inactive'}`}>{service.active ? 'Active' : 'Inactive'}</span></div></div><div className="service-card-content"><h3>{service.name}</h3><p>{service.description || 'Aucune description renseignée.'}</p></div><div className="service-card-details"><span><Icon name="calendar" size={16} />{formatDuration(service.duration_minutes)}</span><strong>{currencyFormatter.format(service.price_cents / 100)}</strong></div>{canManage && <div className="service-card-actions"><button className="secondary-button compact-button" type="button" onClick={() => openEditForm(service)}>Modifier</button><button className={`icon-text-button ${service.active ? 'danger' : ''}`} type="button" disabled={busyId === service.id} aria-busy={busyId === service.id} onClick={() => void toggleServiceStatus(service)}>{busyId === service.id ? 'Mise à jour…' : service.active ? 'Désactiver' : 'Réactiver'}</button></div>}</article>)}</div></section>)}</div>
        )}
      </section>
    </div>
  );
}