import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

interface StaffRecord {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  color: string | null;
  created_at: string;
  site_id: string | null;
}

interface ServiceOption {
  id: string;
  name: string;
  active: boolean;
}

interface StaffServiceRecord {
  staff_id: string;
  service_id: string;
}

interface WorkingHourRecord {
  staff_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

interface BreakRecord {
  staff_id: string;
  weekday: number;
  label: string;
  start_time: string;
  end_time: string;
}

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
  breakEnabled: boolean;
  breakStart: string;
  breakEnd: string;
}

interface StaffFormState {
  displayName: string;
  email: string;
  phone: string;
  color: string;
  siteId: string;
  serviceIds: string[];
  schedule: Record<number, DaySchedule>;
}

type StatusFilter = 'all' | 'active' | 'inactive';

const days = [
  { value: 0, label: 'Lundi', short: 'Lun.' },
  { value: 1, label: 'Mardi', short: 'Mar.' },
  { value: 2, label: 'Mercredi', short: 'Mer.' },
  { value: 3, label: 'Jeudi', short: 'Jeu.' },
  { value: 4, label: 'Vendredi', short: 'Ven.' },
  { value: 5, label: 'Samedi', short: 'Sam.' },
  { value: 6, label: 'Dimanche', short: 'Dim.' }
];

function createDefaultSchedule(): Record<number, DaySchedule> {
  return Object.fromEntries(days.map((day) => [
    day.value,
    {
      enabled: day.value <= 4,
      start: '09:00',
      end: '18:00',
      breakEnabled: day.value <= 4,
      breakStart: '12:30',
      breakEnd: '13:30'
    }
  ])) as Record<number, DaySchedule>;
}

function createEmptyForm(siteId = ''): StaffFormState {
  return {
    displayName: '',
    email: '',
    phone: '',
    color: '#0a84ff',
    siteId,
    serviceIds: [],
    schedule: createDefaultSchedule()
  };
}

function trimTime(value: string) {
  return value.slice(0, 5);
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'NC';
}

function normalizeNullable(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function StaffPage() {
  const { organization, sites, activeSite, activeSiteId } = useOrganization();
  const { demoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [staffServices, setStaffServices] = useState<StaffServiceRecord[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHourRecord[]>([]);
  const [breaks, setBreaks] = useState<BreakRecord[]>([]);
  const [form, setForm] = useState<StaffFormState>(createEmptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const formOpen = searchParams.get('new') === '1' || editingId !== null;

  const loadStaffData = useCallback(async () => {
    if (!organization) return;
    const organizationId = organization.id;
    setLoading(true);
    setError('');

    try {
      if (demoMode || !supabase) {
        const storedStaff = localStorage.getItem(`ncr-suite-demo-staff-${organizationId}`);
        const storedAssignments = localStorage.getItem(`ncr-suite-demo-staff-services-${organizationId}`);
        const storedHours = localStorage.getItem(`ncr-suite-demo-staff-hours-${organizationId}`);
        const storedBreaks = localStorage.getItem(`ncr-suite-demo-staff-breaks-${organizationId}`);
        const storedServices = localStorage.getItem(`ncr-suite-demo-services-${organizationId}`);
        setStaff(storedStaff ? JSON.parse(storedStaff) as StaffRecord[] : []);
        setStaffServices(storedAssignments ? JSON.parse(storedAssignments) as StaffServiceRecord[] : []);
        setWorkingHours(storedHours ? JSON.parse(storedHours) as WorkingHourRecord[] : []);
        setBreaks(storedBreaks ? JSON.parse(storedBreaks) as BreakRecord[] : []);
        const demoServices = storedServices ? JSON.parse(storedServices) as ServiceOption[] : [];
        setServices(demoServices.filter((service) => service.active));
        return;
      }

      let staffQuery = supabase
        .from('staff')
        .select('id,display_name,email,phone,active,color,created_at,site_id')
        .eq('organization_id', organizationId)
        .order('active', { ascending: false })
        .order('display_name', { ascending: true });
      if (organization.plan === 'metier' && activeSiteId) staffQuery = staffQuery.eq('site_id', activeSiteId);

      const [staffResult, servicesResult, assignmentsResult, hoursResult, breaksResult] = await Promise.all([
        staffQuery,
        supabase
          .from('services')
          .select('id,name,active')
          .eq('organization_id', organizationId)
          .eq('active', true)
          .order('name', { ascending: true }),
        supabase
          .from('staff_services')
          .select('staff_id,service_id')
          .eq('organization_id', organizationId),
        supabase
          .from('staff_working_hours')
          .select('staff_id,weekday,start_time,end_time')
          .eq('organization_id', organizationId)
          .order('weekday', { ascending: true }),
        supabase
          .from('staff_breaks')
          .select('staff_id,weekday,label,start_time,end_time')
          .eq('organization_id', organizationId)
          .order('weekday', { ascending: true })
      ]);

      const firstError = [staffResult.error, servicesResult.error, assignmentsResult.error, hoursResult.error, breaksResult.error].find(Boolean);
      if (firstError) throw firstError;

      setStaff((staffResult.data ?? []) as StaffRecord[]);
      setServices((servicesResult.data ?? []) as ServiceOption[]);
      setStaffServices((assignmentsResult.data ?? []) as StaffServiceRecord[]);
      setWorkingHours((hoursResult.data ?? []) as WorkingHourRecord[]);
      setBreaks((breaksResult.data ?? []) as BreakRecord[]);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Une erreur inconnue est survenue.';
      setError(`Impossible de charger les collaborateurs : ${message}`);
    } finally {
      setLoading(false);
    }
  }, [organization, demoMode, activeSiteId]);

  useEffect(() => {
    loadStaffData();
  }, [loadStaffData]);

  const serviceById = useMemo(
    () => new Map(services.map((service) => [service.id, service])),
    [services]
  );

  const filteredStaff = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    return staff.filter((member) => {
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && member.active)
        || (statusFilter === 'inactive' && !member.active);
      const assignedNames = staffServices
        .filter((assignment) => assignment.staff_id === member.id)
        .map((assignment) => serviceById.get(assignment.service_id)?.name ?? '')
        .join(' ');
      const matchesQuery = !needle
        || [member.display_name, member.email, member.phone, assignedNames]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('fr')
          .includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [staff, query, statusFilter, staffServices, serviceById]);

  const activeStaff = staff.filter((member) => member.active);
  const activeCount = activeStaff.length;
  const totalWorkingDays = activeStaff.reduce(
    (total, member) => total + workingHours.filter((row) => row.staff_id === member.id).length,
    0
  );
  const assignedActiveCount = activeStaff.filter((member) =>
    staffServices.some((assignment) => assignment.staff_id === member.id)
  ).length;

  function openCreateForm() {
    if (!canManage) return;
    setEditingId(null);
    setForm(createEmptyForm(activeSiteId ?? sites.find((site) => site.is_primary)?.id ?? sites[0]?.id ?? ''));
    setError('');
    setSuccess('');
    setSearchParams({ new: '1' });
  }

  function openEditForm(member: StaffRecord) {
    if (!canManage) return;
    const schedule = createDefaultSchedule();
    days.forEach((day) => {
      schedule[day.value] = {
        enabled: false,
        start: '09:00',
        end: '18:00',
        breakEnabled: false,
        breakStart: '12:30',
        breakEnd: '13:30'
      };
    });

    workingHours
      .filter((row) => row.staff_id === member.id)
      .forEach((row) => {
        const dayBreak = breaks.find((item) => item.staff_id === member.id && item.weekday === row.weekday);
        schedule[row.weekday] = {
          enabled: true,
          start: trimTime(row.start_time),
          end: trimTime(row.end_time),
          breakEnabled: Boolean(dayBreak),
          breakStart: dayBreak ? trimTime(dayBreak.start_time) : '12:30',
          breakEnd: dayBreak ? trimTime(dayBreak.end_time) : '13:30'
        };
      });

    setForm({
      displayName: member.display_name,
      email: member.email ?? '',
      phone: member.phone ?? '',
      color: member.color ?? '#0a84ff',
      siteId: member.site_id ?? activeSiteId ?? sites.find((site) => site.is_primary)?.id ?? '',
      serviceIds: staffServices
        .filter((assignment) => assignment.staff_id === member.id)
        .map((assignment) => assignment.service_id),
      schedule
    });
    setEditingId(member.id);
    setSearchParams({});
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeForm() {
    setEditingId(null);
    setForm(createEmptyForm(activeSiteId ?? sites.find((site) => site.is_primary)?.id ?? sites[0]?.id ?? ''));
    setError('');
    setSearchParams({});
  }

  function updateScheduleDay(weekday: number, patch: Partial<DaySchedule>) {
    setForm((current) => ({
      ...current,
      schedule: {
        ...current.schedule,
        [weekday]: { ...current.schedule[weekday], ...patch }
      }
    }));
  }

  function toggleService(serviceId: string) {
    setForm((current) => ({
      ...current,
      serviceIds: current.serviceIds.includes(serviceId)
        ? current.serviceIds.filter((id) => id !== serviceId)
        : [...current.serviceIds, serviceId]
    }));
  }

  async function handleSaveStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !canManage) return;

    const displayName = form.displayName.trim();
    const enabledDays = days.filter((day) => form.schedule[day.value].enabled);

    if (organization.plan === 'metier' && !form.siteId) {
      setError('Sélectionnez l’établissement du collaborateur.');
      return;
    }
    if (displayName.length < 2) {
      setError('Le nom du collaborateur doit contenir au moins 2 caractères.');
      return;
    }
    if (enabledDays.length === 0) {
      setError('Activez au moins un jour de travail.');
      return;
    }

    for (const day of enabledDays) {
      const schedule = form.schedule[day.value];
      if (schedule.end <= schedule.start) {
        setError(`Les horaires du ${day.label.toLocaleLowerCase('fr')} sont invalides.`);
        return;
      }
      if (schedule.breakEnabled && (
        schedule.breakEnd <= schedule.breakStart
        || schedule.breakStart < schedule.start
        || schedule.breakEnd > schedule.end
      )) {
        setError(`La pause du ${day.label.toLocaleLowerCase('fr')} doit être comprise dans les horaires de travail.`);
        return;
      }
    }

    const hoursPayload = enabledDays.map((day) => ({
      weekday: day.value,
      start_time: form.schedule[day.value].start,
      end_time: form.schedule[day.value].end
    }));
    const breaksPayload = enabledDays
      .filter((day) => form.schedule[day.value].breakEnabled)
      .map((day) => ({
        weekday: day.value,
        label: 'Pause',
        start_time: form.schedule[day.value].breakStart,
        end_time: form.schedule[day.value].breakEnd
      }));

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (demoMode || !supabase) {
        const staffId = editingId ?? crypto.randomUUID();
        const existing = staff.find((member) => member.id === staffId);
        const savedMember: StaffRecord = {
          id: staffId,
          display_name: displayName,
          email: normalizeNullable(form.email),
          phone: normalizeNullable(form.phone),
          color: form.color,
          active: existing?.active ?? true,
          created_at: existing?.created_at ?? new Date().toISOString(),
          site_id: organization.plan === 'metier' ? form.siteId || null : null
        };
        const nextStaff = existing
          ? staff.map((member) => member.id === staffId ? savedMember : member)
          : [savedMember, ...staff];
        const nextAssignments = [
          ...staffServices.filter((assignment) => assignment.staff_id !== staffId),
          ...form.serviceIds.map((serviceId) => ({ staff_id: staffId, service_id: serviceId }))
        ];
        const nextHours = [
          ...workingHours.filter((row) => row.staff_id !== staffId),
          ...hoursPayload.map((row) => ({ staff_id: staffId, ...row }))
        ];
        const nextBreaks = [
          ...breaks.filter((row) => row.staff_id !== staffId),
          ...breaksPayload.map((row) => ({ staff_id: staffId, ...row }))
        ];
        localStorage.setItem(`ncr-suite-demo-staff-${organization.id}`, JSON.stringify(nextStaff));
        localStorage.setItem(`ncr-suite-demo-staff-services-${organization.id}`, JSON.stringify(nextAssignments));
        localStorage.setItem(`ncr-suite-demo-staff-hours-${organization.id}`, JSON.stringify(nextHours));
        localStorage.setItem(`ncr-suite-demo-staff-breaks-${organization.id}`, JSON.stringify(nextBreaks));
        setStaff(nextStaff);
        setStaffServices(nextAssignments);
        setWorkingHours(nextHours);
        setBreaks(nextBreaks);
      } else {
        const { error: saveError } = await supabase.rpc(organization.plan === 'metier' ? 'save_staff_configuration_v2' : 'save_staff_configuration', {
          p_organization_id: organization.id,
          p_staff_id: editingId,
          ...(organization.plan === 'metier' ? { p_site_id: form.siteId } : {}),
          p_display_name: displayName,
          p_email: normalizeNullable(form.email),
          p_phone: normalizeNullable(form.phone),
          p_color: form.color,
          p_service_ids: form.serviceIds,
          p_working_hours: hoursPayload,
          p_breaks: breaksPayload
        });
        if (saveError) throw saveError;
        await loadStaffData();
      }

      setSuccess(editingId ? 'Le collaborateur a bien été mis à jour.' : 'Le collaborateur a bien été ajouté.');
      setEditingId(null);
      setForm(createEmptyForm(activeSiteId ?? sites.find((site) => site.is_primary)?.id ?? sites[0]?.id ?? ''));
      setSearchParams({});
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Une erreur inconnue est survenue.';
      setError(`${editingId ? 'Modification' : 'Création'} impossible : ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStaffStatus(member: StaffRecord) {
    if (!organization || !canManage) return;
    const nextActive = !member.active;
    const action = nextActive ? 'réactiver' : 'désactiver';
    if (!window.confirm(`Voulez-vous ${action} « ${member.display_name} » ?`)) return;

    setBusyId(member.id);
    setError('');
    setSuccess('');

    try {
      if (demoMode || !supabase) {
        const next = staff.map((row) => row.id === member.id ? { ...row, active: nextActive } : row);
        localStorage.setItem(`ncr-suite-demo-staff-${organization.id}`, JSON.stringify(next));
      } else {
        const { error: updateError } = await supabase
          .from('staff')
          .update({ active: nextActive })
          .eq('organization_id', organization.id)
          .eq('id', member.id);
        if (updateError) throw updateError;
      }
      setStaff((current) => current.map((row) => row.id === member.id ? { ...row, active: nextActive } : row));
      setSuccess(nextActive ? 'Le collaborateur est de nouveau actif.' : 'Le collaborateur a été désactivé.');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Une erreur inconnue est survenue.';
      setError(`Mise à jour impossible : ${message}`);
    } finally {
      setBusyId(null);
    }
  }

  if (!organization) return null;

  return (
    <div className="page staff-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">ÉQUIPE & DISPONIBILITÉS</p>
          <h1>Collaborateurs</h1>
          <p>Configurez l’équipe, les prestations réalisées et les horaires de {activeSite ? activeSite.name : organization.name}.</p>
        </div>
        {canManage && (
          <button className="primary-button" type="button" onClick={openCreateForm}>
            <Icon name="briefcase" size={18} />Ajouter un collaborateur
          </button>
        )}
      </header>

      {!canManage && (
        <div className="info-message page-message" role="status">
          Votre rôle permet de consulter l’équipe, mais pas de la modifier.
        </div>
      )}

      {formOpen && canManage && (
        <section className="panel staff-form-panel" aria-labelledby="staff-form-title">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{editingId ? 'MODIFICATION' : 'NOUVEAU COLLABORATEUR'}</p>
              <h2 id="staff-form-title">{editingId ? 'Modifier le collaborateur' : 'Ajouter un collaborateur'}</h2>
            </div>
            <button className="secondary-button compact-button" type="button" onClick={closeForm}>Fermer</button>
          </div>

          <form className="staff-form" onSubmit={handleSaveStaff}>
            {organization.plan === 'metier' && (
              <label className="staff-site-field full-field">
                Établissement <span aria-hidden="true">*</span>
                <select required value={form.siteId} onChange={(event) => setForm((current) => ({ ...current, siteId: event.target.value }))}>
                  <option value="">Sélectionner un établissement</option>
                  {sites.map((site) => <option key={site.id} value={site.id}>{site.name}{site.is_primary ? ' · Principal' : ''}</option>)}
                </select>
                <small>Le collaborateur et ses disponibilités seront rattachés à ce site.</small>
              </label>
            )}
            <label className="staff-name-field">
              Nom affiché <span aria-hidden="true">*</span>
              <input
                autoFocus
                required
                minLength={2}
                value={form.displayName}
                onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                placeholder="Ex. Camille Martin"
              />
            </label>
            <label>
              Adresse e-mail
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="camille@exemple.fr"
              />
            </label>
            <label>
              Téléphone
              <input
                inputMode="tel"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="06 00 00 00 00"
              />
            </label>
            <label className="color-field">
              Couleur du planning
              <span className="color-input-wrap">
                <input
                  type="color"
                  value={form.color}
                  onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
                  aria-label="Couleur du collaborateur"
                />
                <code>{form.color.toUpperCase()}</code>
              </span>
            </label>

            <fieldset className="staff-services-field full-field">
              <legend>Prestations réalisées</legend>
              {services.length === 0 ? (
                <div className="inline-empty-state">
                  Aucune prestation active. Créez d’abord une prestation dans le catalogue.
                </div>
              ) : (
                <div className="service-selector-grid">
                  {services.map((service) => {
                    const selected = form.serviceIds.includes(service.id);
                    return (
                      <label key={service.id} className={`service-choice${selected ? ' selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleService(service.id)}
                        />
                        <span><Icon name="sparkles" size={17} /></span>
                        <strong>{service.name}</strong>
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>

            <fieldset className="schedule-field full-field">
              <legend>Horaires habituels</legend>
              <div className="schedule-heading">
                <div>
                  <p>Ces disponibilités serviront ensuite au calcul automatique des créneaux de réservation.</p>
                </div>
                <button
                  className="text-mini-button"
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, schedule: createDefaultSchedule() }))}
                >
                  Réinitialiser
                </button>
              </div>

              <div className="schedule-grid">
                {days.map((day) => {
                  const schedule = form.schedule[day.value];
                  return (
                    <article key={day.value} className={`schedule-row${schedule.enabled ? ' enabled' : ''}`}>
                      <label className="day-toggle">
                        <input
                          type="checkbox"
                          checked={schedule.enabled}
                          onChange={(event) => updateScheduleDay(day.value, { enabled: event.target.checked })}
                        />
                        <strong>{day.label}</strong>
                      </label>

                      {schedule.enabled ? (
                        <>
                          <div className="time-range">
                            <label>
                              Début
                              <input
                                type="time"
                                value={schedule.start}
                                onChange={(event) => updateScheduleDay(day.value, { start: event.target.value })}
                              />
                            </label>
                            <span>→</span>
                            <label>
                              Fin
                              <input
                                type="time"
                                value={schedule.end}
                                onChange={(event) => updateScheduleDay(day.value, { end: event.target.value })}
                              />
                            </label>
                          </div>

                          <div className="break-editor">
                            <label className="break-toggle">
                              <input
                                type="checkbox"
                                checked={schedule.breakEnabled}
                                onChange={(event) => updateScheduleDay(day.value, { breakEnabled: event.target.checked })}
                              />
                              Pause
                            </label>
                            {schedule.breakEnabled && (
                              <div className="break-times">
                                <input
                                  type="time"
                                  value={schedule.breakStart}
                                  aria-label={`Début de la pause du ${day.label}`}
                                  onChange={(event) => updateScheduleDay(day.value, { breakStart: event.target.value })}
                                />
                                <span>→</span>
                                <input
                                  type="time"
                                  value={schedule.breakEnd}
                                  aria-label={`Fin de la pause du ${day.label}`}
                                  onChange={(event) => updateScheduleDay(day.value, { breakEnd: event.target.value })}
                                />
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <span className="closed-day">Non travaillé</span>
                      )}
                    </article>
                  );
                })}
              </div>
            </fieldset>

            <div className="form-actions full-field">
              <button className="secondary-button" type="button" onClick={closeForm}>Annuler</button>
              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Ajouter le collaborateur'}
              </button>
            </div>
          </form>
        </section>
      )}

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      <section className="staff-summary-grid" aria-label="Résumé de l’équipe">
        <article className="panel staff-summary-card">
          <span>Collaborateurs actifs</span>
          <strong>{activeCount}</strong>
          <small>disponible{activeCount > 1 ? 's' : ''} dans le planning</small>
        </article>
        <article className="panel staff-summary-card">
          <span>Jours ouverts cumulés</span>
          <strong>{totalWorkingDays}</strong>
          <small>jours configurés par semaine</small>
        </article>
        <article className="panel staff-summary-card">
          <span>Équipe opérationnelle</span>
          <strong>{assignedActiveCount}/{activeCount || 0}</strong>
          <small>avec au moins une prestation attribuée</small>
        </article>
      </section>

      <section className="panel staff-list-panel">
        <div className="staff-toolbar">
          <div>
            <p className="eyebrow">ÉQUIPE</p>
            <h2>{staff.length} collaborateur{staff.length > 1 ? 's' : ''}</h2>
          </div>
          <div className="staff-filters">
            <label className="search-field">
              <span className="sr-only">Rechercher un collaborateur</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nom, contact ou prestation"
              />
            </label>
            <label className="status-filter">
              <span className="sr-only">Filtrer les collaborateurs par statut</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
                <option value="all">Tous</option>
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="list-state">Chargement de l’équipe…</div>
        ) : filteredStaff.length === 0 ? (
          <div className="list-state empty-staff-state">
            <div className="empty-icon"><Icon name="briefcase" size={30} /></div>
            <h3>{staff.length === 0 ? 'Aucun collaborateur pour le moment' : 'Aucun résultat'}</h3>
            <p>{staff.length === 0 ? 'Ajoutez l’équipe et ses horaires avant de construire le planning des rendez-vous.' : 'Modifiez votre recherche ou le filtre sélectionné.'}</p>
            {staff.length === 0 && canManage && (
              <button className="primary-button" type="button" onClick={openCreateForm}>Ajouter le premier collaborateur</button>
            )}
          </div>
        ) : (
          <div className="staff-grid">
            {filteredStaff.map((member) => {
              const assignments = staffServices
                .filter((assignment) => assignment.staff_id === member.id)
                .map((assignment) => serviceById.get(assignment.service_id))
                .filter((service): service is ServiceOption => Boolean(service));
              const memberHours = workingHours
                .filter((row) => row.staff_id === member.id)
                .sort((a, b) => a.weekday - b.weekday);

              return (
                <article key={member.id} className={`staff-card${member.active ? '' : ' inactive'}`}>
                  <div className="staff-card-header">
                    <div className="staff-avatar" style={{ background: member.color ?? '#0a84ff' }}>
                      {initials(member.display_name)}
                    </div>
                    <span className={`status-chip ${member.active ? 'active' : 'inactive'}`}>
                      {member.active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>

                  <div className="staff-card-identity">
                    <h3>{member.display_name}</h3>
                    {organization.plan === 'metier' && <span className="staff-site-badge">{sites.find((site) => site.id === member.site_id)?.name ?? 'Site non attribué'}</span>}
                    <p>{member.email || member.phone || 'Aucun contact renseigné'}</p>
                    {member.email && member.phone && <small>{member.phone}</small>}
                  </div>

                  <div className="staff-card-section">
                    <span className="staff-section-label">Prestations</span>
                    <div className="mini-chip-list">
                      {assignments.length > 0 ? assignments.slice(0, 3).map((service) => (
                        <span key={service.id}>{service.name}</span>
                      )) : <em>Aucune prestation attribuée</em>}
                      {assignments.length > 3 && <span>+{assignments.length - 3}</span>}
                    </div>
                  </div>

                  <div className="staff-card-section schedule-preview">
                    <span className="staff-section-label">Disponibilités hebdomadaires</span>
                    {memberHours.length > 0 ? (
                      <div className="schedule-preview-list">
                        {memberHours.slice(0, 4).map((row) => (
                          <div key={row.weekday}>
                            <span>{days.find((day) => day.value === row.weekday)?.short}</span>
                            <strong>{trimTime(row.start_time)} – {trimTime(row.end_time)}</strong>
                          </div>
                        ))}
                        {memberHours.length > 4 && <small>+ {memberHours.length - 4} autre{memberHours.length - 4 > 1 ? 's' : ''} jour{memberHours.length - 4 > 1 ? 's' : ''}</small>}
                      </div>
                    ) : <em>Aucun horaire configuré</em>}
                  </div>

                  {canManage && (
                    <div className="staff-card-actions">
                      <button className="secondary-button" type="button" onClick={() => openEditForm(member)}>
                        Modifier
                      </button>
                      <button
                        className={`icon-text-button${member.active ? ' danger' : ''}`}
                        type="button"
                        disabled={busyId === member.id}
                        onClick={() => toggleStaffStatus(member)}
                      >
                        {busyId === member.id ? 'Patientez…' : member.active ? 'Désactiver' : 'Réactiver'}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
