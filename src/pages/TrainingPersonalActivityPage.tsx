import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

type EmploymentMode = 'salaried' | 'subcontractor';
type RegulatoryScope = 'review_required' | 'professional_continuing' | 'apprenticeship' | 'initial_education' | 'out_of_scope';
type InterventionStatus = 'planned' | 'completed' | 'canceled';
type SubcontractorPricingMode = 'fixed' | 'hourly';

interface PersonalIntervention {
  id: string;
  reporting_organization_id: string;
  user_id: string;
  series_id: string | null;
  center_name: string;
  activity_title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  employment_mode: EmploymentMode;
  regulatory_scope: RegulatoryScope;
  status: InterventionStatus;
  hourly_rate_cents: number | null;
  amount_excl_tax_cents: number | null;
  invoice_reference: string | null;
  invoice_date: string | null;
  trainee_count: number;
  trainee_hours: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type ActivityForm = {
  centerName: string;
  activityTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  employmentMode: EmploymentMode;
  regulatoryScope: RegulatoryScope;
  status: InterventionStatus;
  repeatWeekly: boolean;
  repeatUntil: string;
  weekdays: number[];
  subcontractorPricingMode: SubcontractorPricingMode;
  hourlyRate: string;
  amount: string;
  invoiceReference: string;
  invoiceDate: string;
  traineeCount: string;
  traineeHours: string;
  notes: string;
};

const employmentLabels: Record<EmploymentMode, string> = {
  salaried: 'Salarié / rémunéré à l’heure',
  subcontractor: 'Sous-traitance facturée via mon organisme'
};

const scopeLabels: Record<RegulatoryScope, string> = {
  review_required: 'À qualifier / je ne sais pas encore',
  professional_continuing: 'Formation professionnelle continue (adultes / salariés)',
  apprenticeship: 'Apprentissage (CFA / contrat d’apprentissage)',
  initial_education: 'Formation initiale / scolaire (dont BTS hors apprentissage)',
  out_of_scope: 'Hors champ BPF'
};

const scopeHelp: Record<RegulatoryScope, string> = {
  review_required: 'Choisis cette option si le statut du public n’est pas encore certain. Tu pourras qualifier l’intervention plus tard.',
  professional_continuing: 'À utiliser pour une action relevant de la formation professionnelle continue, par exemple auprès d’adultes, salariés ou demandeurs d’emploi.',
  apprenticeship: 'À choisir uniquement lorsque les apprenants suivent la formation sous contrat d’apprentissage. Un BTS MCO n’est pas automatiquement de l’apprentissage.',
  initial_education: 'À utiliser pour une formation scolaire ou initiale, par exemple un BTS MCO lorsque les étudiants ne sont pas sous contrat d’apprentissage.',
  out_of_scope: 'L’activité reste suivie dans ton planning mais elle est explicitement exclue du périmètre BPF.'
};

const statusLabels: Record<InterventionStatus, string> = {
  planned: 'Planifiée',
  completed: 'Terminée',
  canceled: 'Annulée'
};

const weekdays = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 0, label: 'Dim' }
];

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initialForm(): ActivityForm {
  const today = new Date();
  return {
    centerName: '',
    activityTitle: '',
    date: dateInputValue(today),
    startTime: '09:00',
    endTime: '17:00',
    location: '',
    employmentMode: 'salaried',
    regulatoryScope: 'review_required',
    status: 'planned',
    repeatWeekly: false,
    repeatUntil: dateInputValue(today),
    weekdays: [today.getDay()],
    subcontractorPricingMode: 'fixed',
    hourlyRate: '',
    amount: '',
    invoiceReference: '',
    invoiceDate: '',
    traineeCount: '0',
    traineeHours: '0',
    notes: ''
  };
}

function moneyToCents(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : Number.NaN;
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function displayDateTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function displayMoney(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function durationHours(startsAt: string, endsAt: string) {
  return Math.max(0, (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 3_600_000);
}

function buildOccurrenceDates(form: ActivityForm) {
  if (!form.repeatWeekly) return [form.date];
  const start = new Date(`${form.date}T12:00:00`);
  const end = new Date(`${form.repeatUntil}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  const selected = new Set(form.weekdays.length ? form.weekdays : [start.getDay()]);
  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && dates.length <= 366) {
    if (selected.has(cursor.getDay())) dates.push(dateInputValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function TrainingPersonalActivityPage() {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const [rows, setRows] = useState<PersonalIntervention[]>([]);
  const [form, setForm] = useState<ActivityForm>(initialForm);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');

  async function load() {
    if (!organization || !user || !supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase
      .from('training_personal_interventions')
      .select('id,reporting_organization_id,user_id,series_id,center_name,activity_title,starts_at,ends_at,location,employment_mode,regulatory_scope,status,hourly_rate_cents,amount_excl_tax_cents,invoice_reference,invoice_date,trainee_count,trainee_hours,notes,created_at,updated_at')
      .eq('reporting_organization_id', organization.id)
      .eq('user_id', user.id)
      .order('starts_at', { ascending: false });
    if (loadError) setError(`Chargement impossible : ${loadError.message}`);
    else setRows((data ?? []).map((row) => ({ ...row, trainee_hours: Number(row.trainee_hours) || 0 })) as PersonalIntervention[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [organization?.id, user?.id]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    if (!needle) return rows;
    return rows.filter((row) => [row.center_name, row.activity_title, row.location, employmentLabels[row.employment_mode], scopeLabels[row.regulatory_scope]]
      .filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(needle));
  }, [rows, query]);

  const completedHours = useMemo(() => rows
    .filter((row) => row.status === 'completed')
    .reduce((total, row) => total + durationHours(row.starts_at, row.ends_at), 0), [rows]);

  const estimatedSalariedPayCents = useMemo(() => rows
    .filter((row) => row.status !== 'canceled' && row.employment_mode === 'salaried' && row.hourly_rate_cents !== null)
    .reduce((total, row) => total + Math.round(durationHours(row.starts_at, row.ends_at) * (row.hourly_rate_cents ?? 0)), 0), [rows]);

  const previewOccurrenceCount = useMemo(() => buildOccurrenceDates(form).length, [form]);
  const previewHours = useMemo(() => {
    const startsAt = new Date(`${form.date}T${form.startTime}:00`);
    const endsAt = new Date(`${form.date}T${form.endTime}:00`);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) return 0;
    return durationHours(startsAt.toISOString(), endsAt.toISOString());
  }, [form.date, form.startTime, form.endTime]);
  const previewHourlyRateCents = useMemo(() => moneyToCents(form.hourlyRate), [form.hourlyRate]);
  const previewUnitAmountCents = typeof previewHourlyRateCents === 'number' && Number.isFinite(previewHourlyRateCents) && previewHours > 0
    ? Math.round(previewHours * previewHourlyRateCents)
    : null;
  const previewSeriesAmountCents = previewUnitAmountCents !== null && previewOccurrenceCount > 0
    ? previewUnitAmountCents * previewOccurrenceCount
    : null;

  function toggleWeekday(value: number) {
    setForm((current) => ({
      ...current,
      weekdays: current.weekdays.includes(value) ? current.weekdays.filter((day) => day !== value) : [...current.weekdays, value]
    }));
  }

  async function createIntervention(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !user || !supabase) return;
    if (!form.centerName.trim() || !form.activityTitle.trim()) {
      setError('Le centre et l’activité sont obligatoires.');
      return;
    }
    const occurrenceDates = buildOccurrenceDates(form);
    if (occurrenceDates.length === 0) {
      setError('Vérifie les dates et les jours de récurrence.');
      return;
    }
    if (occurrenceDates.length > 366) {
      setError('La série est trop longue. Limite-la à 366 interventions maximum.');
      return;
    }
    if (previewHours <= 0) {
      setError('L’heure de fin doit être postérieure à l’heure de début.');
      return;
    }

    const hourlyPricing = form.employmentMode === 'salaried'
      || (form.employmentMode === 'subcontractor' && form.subcontractorPricingMode === 'hourly');
    const hourlyRateCents = hourlyPricing ? moneyToCents(form.hourlyRate) : null;
    if (Number.isNaN(hourlyRateCents)) {
      setError('Le tarif horaire doit être un nombre positif.');
      return;
    }
    if (form.employmentMode === 'subcontractor' && form.subcontractorPricingMode === 'hourly' && hourlyRateCents === null) {
      setError('Renseigne le tarif horaire HT de la sous-traitance.');
      return;
    }

    const fixedAmountCents = form.employmentMode === 'subcontractor' && form.subcontractorPricingMode === 'fixed'
      ? moneyToCents(form.amount)
      : null;
    if (Number.isNaN(fixedAmountCents)) {
      setError('Le montant HT doit être un nombre positif.');
      return;
    }

    const traineeCount = form.employmentMode === 'subcontractor' ? Number(form.traineeCount || 0) : 0;
    const traineeHours = form.employmentMode === 'subcontractor' ? Number(String(form.traineeHours || '0').replace(',', '.')) : 0;
    if (!Number.isInteger(traineeCount) || traineeCount < 0 || !Number.isFinite(traineeHours) || traineeHours < 0) {
      setError('Les données stagiaires doivent être positives.');
      return;
    }

    const seriesId = form.repeatWeekly && occurrenceDates.length > 1 ? crypto.randomUUID() : null;
    const payloads = occurrenceDates.map((date) => {
      const startsAt = new Date(`${date}T${form.startTime}:00`);
      const endsAt = new Date(`${date}T${form.endTime}:00`);
      const hours = durationHours(startsAt.toISOString(), endsAt.toISOString());
      const amountCents = form.employmentMode !== 'subcontractor'
        ? null
        : form.subcontractorPricingMode === 'hourly' && hourlyRateCents !== null
          ? Math.round(hours * hourlyRateCents)
          : fixedAmountCents;
      return {
        reporting_organization_id: organization.id,
        user_id: user.id,
        series_id: seriesId,
        center_name: form.centerName.trim(),
        activity_title: form.activityTitle.trim(),
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        location: nullable(form.location),
        employment_mode: form.employmentMode,
        regulatory_scope: form.regulatoryScope,
        status: form.status,
        hourly_rate_cents: hourlyRateCents,
        amount_excl_tax_cents: amountCents,
        invoice_reference: form.employmentMode === 'subcontractor' ? nullable(form.invoiceReference) : null,
        invoice_date: form.employmentMode === 'subcontractor' ? (form.invoiceDate || null) : null,
        trainee_count: traineeCount,
        trainee_hours: traineeHours,
        notes: nullable(form.notes)
      };
    });

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { error: insertError } = await supabase.from('training_personal_interventions').insert(payloads);
      if (insertError) throw insertError;
      setSuccess(payloads.length > 1 ? `${payloads.length} interventions ont été ajoutées à ton planning.` : 'L’intervention a été ajoutée à ton planning.');
      setForm(initialForm());
      setFormOpen(false);
      await load();
    } catch (caught) {
      setError(`Création impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(row: PersonalIntervention, status: InterventionStatus) {
    if (!organization || !user || !supabase) return;
    setBusyId(row.id);
    setError('');
    setSuccess('');
    const { error: updateError } = await supabase
      .from('training_personal_interventions')
      .update({ status })
      .eq('id', row.id)
      .eq('reporting_organization_id', organization.id)
      .eq('user_id', user.id);
    if (updateError) setError(`Modification impossible : ${updateError.message}`);
    else {
      setSuccess(status === 'completed' ? 'Intervention marquée comme terminée.' : 'Statut mis à jour.');
      await load();
    }
    setBusyId('');
  }

  async function remove(row: PersonalIntervention, wholeSeries = false) {
    if (!organization || !user || !supabase) return;
    const label = wholeSeries ? 'toute cette série d’interventions' : 'cette intervention';
    if (!window.confirm(`Supprimer définitivement ${label} ?`)) return;
    setBusyId(row.id);
    setError('');
    let request = supabase
      .from('training_personal_interventions')
      .delete()
      .eq('reporting_organization_id', organization.id)
      .eq('user_id', user.id);
    request = wholeSeries && row.series_id ? request.eq('series_id', row.series_id) : request.eq('id', row.id);
    const { error: deleteError } = await request;
    if (deleteError) setError(`Suppression impossible : ${deleteError.message}`);
    else {
      setSuccess(wholeSeries ? 'La série a été supprimée.' : 'L’intervention a été supprimée.');
      await load();
    }
    setBusyId('');
  }

  if (!organization || organization.business_type !== 'formation') return null;

  return (
    <div className="page training-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">MON ACTIVITÉ DE FORMATEUR</p>
          <h1>Mes interventions externes</h1>
          <p>Ajoute les heures réalisées pour des centres qui n’utilisent pas NCR Suite, sans créer de fausse session dans {organization.public_name || organization.name}.</p>
        </div>
        <div className="page-header-actions">
          <Link className="secondary-button" to="/mon-planning"><Icon name="calendar" size={18} />Mon planning</Link>
          <button className="primary-button" type="button" onClick={() => setFormOpen((value) => !value)}><Icon name="plus" size={18} />Ajouter une intervention</button>
        </div>
      </header>

      <div className="training-kpi-grid">
        <article className="panel"><span className="training-record-icon"><Icon name="calendar" size={20} /></span><div><small>Interventions</small><strong>{rows.length}</strong></div></article>
        <article className="panel"><span className="training-record-icon"><Icon name="check" size={20} /></span><div><small>Heures terminées</small><strong>{new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(completedHours)} h</strong></div></article>
        <article className="panel"><span className="training-record-icon"><Icon name="briefcase" size={20} /></span><div><small>Sous-traitances</small><strong>{rows.filter((row) => row.employment_mode === 'subcontractor').length}</strong></div></article>
        <article className="panel"><span className="training-record-icon"><Icon name="activity" size={20} /></span><div><small>Rémunération estimée</small><strong>{displayMoney(estimatedSalariedPayCents)}</strong><small>Activités salariées non annulées</small></div></article>
      </div>

      {formOpen && (
        <section className="panel training-form-panel">
          <div className="panel-header"><div><p className="eyebrow">NOUVELLE INTERVENTION</p><h2>Ajouter une activité extérieure</h2><p>Une activité salariée reste dans ton planning mais n’alimente jamais le BPF de ton organisme.</p></div><button className="secondary-button compact-button" type="button" onClick={() => setFormOpen(false)}>Fermer</button></div>
          <form className="training-form-grid" onSubmit={createIntervention}>
            <label>Centre / établissement *<input required value={form.centerName} onChange={(event) => setForm((current) => ({ ...current, centerName: event.target.value }))} placeholder="Ex. Centre de formation X" /></label>
            <label>Activité / cours *<input required value={form.activityTitle} onChange={(event) => setForm((current) => ({ ...current, activityTitle: event.target.value }))} placeholder="Ex. BTS MCO · ADOC" /></label>
            <label>Date *<input type="date" required value={form.date} onChange={(event) => { const value = event.target.value; const day = value ? new Date(`${value}T12:00:00`).getDay() : 1; setForm((current) => ({ ...current, date: value, repeatUntil: current.repeatWeekly && current.repeatUntil < value ? value : current.repeatUntil, weekdays: current.repeatWeekly ? current.weekdays : [day] })); }} /></label>
            <label>Lieu<input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="Ex. Fréjus" /></label>
            <label>Début *<input type="time" required value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} /></label>
            <label>Fin *<input type="time" required value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} /></label>
            <label>Situation<select value={form.employmentMode} onChange={(event) => setForm((current) => ({ ...current, employmentMode: event.target.value as EmploymentMode }))}><option value="salaried">Salarié / rémunéré à l’heure</option><option value="subcontractor">Sous-traitance facturée via mon organisme</option></select></label>
            <label className="full-field">{form.employmentMode === 'salaried' ? 'Nature de l’activité' : 'Nature BPF'}<select value={form.regulatoryScope} onChange={(event) => setForm((current) => ({ ...current, regulatoryScope: event.target.value as RegulatoryScope }))}>{Object.entries(scopeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small>{scopeHelp[form.regulatoryScope]}{form.employmentMode === 'salaried' ? ` Cette qualification reste informative pour ton suivi personnel et n’alimente pas le BPF de ${organization.public_name || organization.name}.` : ''}</small></label>
            <label>Statut<select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as InterventionStatus }))}><option value="planned">Planifiée</option><option value="completed">Terminée</option><option value="canceled">Annulée</option></select></label>
            {form.employmentMode === 'salaried' && <label>Tarif horaire convenu (€ / h)<input inputMode="decimal" value={form.hourlyRate} onChange={(event) => setForm((current) => ({ ...current, hourlyRate: event.target.value }))} placeholder="Ex. 35,00" /><small>Suivi personnel uniquement : ce montant n’entre ni dans le CA ni dans le BPF de {organization.public_name || organization.name}.</small>{previewUnitAmountCents !== null && <small><strong>Estimation :</strong> {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(previewHours)} h × {displayMoney(previewHourlyRateCents as number)} = {displayMoney(previewUnitAmountCents)}{form.repeatWeekly && previewOccurrenceCount > 1 && previewSeriesAmountCents !== null ? ` par intervention · ${previewOccurrenceCount} interventions = ${displayMoney(previewSeriesAmountCents)} sur la série` : ''}.</small>}</label>}
            <label className="full-field"><span><input type="checkbox" checked={form.repeatWeekly} onChange={(event) => setForm((current) => ({ ...current, repeatWeekly: event.target.checked, repeatUntil: event.target.checked && current.repeatUntil < current.date ? current.date : current.repeatUntil }))} /> Répéter chaque semaine</span></label>
            {form.repeatWeekly && <><label>Jusqu’au *<input type="date" required min={form.date} value={form.repeatUntil} onChange={(event) => setForm((current) => ({ ...current, repeatUntil: event.target.value }))} /></label><fieldset><legend>Jours</legend><div className="training-checkbox-grid">{weekdays.map((day) => <label key={day.value}><input type="checkbox" checked={form.weekdays.includes(day.value)} onChange={() => toggleWeekday(day.value)} />{day.label}</label>)}</div></fieldset></>}

            {form.employmentMode === 'subcontractor' && <>
              <label>Mode de tarification<select value={form.subcontractorPricingMode} onChange={(event) => setForm((current) => ({ ...current, subcontractorPricingMode: event.target.value as SubcontractorPricingMode }))}><option value="fixed">Forfait / montant par intervention</option><option value="hourly">Tarif horaire</option></select></label>
              {form.subcontractorPricingMode === 'hourly'
                ? <label>Tarif horaire HT (€ / h) *<input required inputMode="decimal" value={form.hourlyRate} onChange={(event) => setForm((current) => ({ ...current, hourlyRate: event.target.value }))} placeholder="Ex. 35,00" /><small>Le montant HT de chaque intervention est calculé automatiquement d’après sa durée.</small>{previewUnitAmountCents !== null && <small><strong>Calcul :</strong> {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(previewHours)} h × {displayMoney(previewHourlyRateCents as number)} = {displayMoney(previewUnitAmountCents)} HT{form.repeatWeekly && previewOccurrenceCount > 1 && previewSeriesAmountCents !== null ? ` par intervention · total prévisionnel de la série : ${displayMoney(previewSeriesAmountCents)} HT` : ''}.</small>}</label>
                : <label>Montant HT par intervention<input inputMode="decimal" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Ex. 500,00" /></label>}
              <label>Référence facture<input value={form.invoiceReference} onChange={(event) => setForm((current) => ({ ...current, invoiceReference: event.target.value }))} placeholder="Ex. FAC-2026-018" /></label>
              <label>Date de facture<input type="date" value={form.invoiceDate} onChange={(event) => setForm((current) => ({ ...current, invoiceDate: event.target.value }))} /></label>
              <label>Nombre de stagiaires<input type="number" min={0} value={form.traineeCount} onChange={(event) => setForm((current) => ({ ...current, traineeCount: event.target.value }))} /></label>
              <label>Heures-stagiaires<input inputMode="decimal" value={form.traineeHours} onChange={(event) => setForm((current) => ({ ...current, traineeHours: event.target.value }))} placeholder="Ex. 48" /></label>
            </>}
            <label className="full-field">Notes<textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Classe, matière, bon de commande, précision utile…" /></label>
            <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={() => setFormOpen(false)}>Annuler</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : form.repeatWeekly ? 'Créer la série' : 'Ajouter au planning'}</button></div>
          </form>
        </section>
      )}

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      <section className="panel training-list-panel">
        <div className="training-toolbar"><div><p className="eyebrow">ACTIVITÉ PERSONNELLE</p><h2>{rows.length} intervention{rows.length > 1 ? 's' : ''}</h2></div><label className="search-field"><span className="sr-only">Rechercher</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Centre, cours, lieu…" /></label></div>
        {loading ? <div className="training-empty">Chargement…</div> : filteredRows.length === 0 ? <div className="training-empty"><Icon name="calendar" size={30} /><strong>Aucune intervention extérieure</strong><span>Ajoute tes heures pour un centre externe. Tes sessions {organization.public_name || organization.name} restent gérées dans Sessions.</span></div> : (
          <div className="training-card-list">
            {filteredRows.map((row) => {
              const bpfEligible = row.employment_mode === 'subcontractor' && ['professional_continuing', 'apprenticeship'].includes(row.regulatory_scope);
              const hours = durationHours(row.starts_at, row.ends_at);
              const hourlyAmountCents = row.hourly_rate_cents !== null ? Math.round(hours * row.hourly_rate_cents) : null;
              return <article key={row.id} className="training-record-card">
                <span className="training-record-icon"><Icon name={row.employment_mode === 'salaried' ? 'calendar' : 'briefcase'} size={21} /></span>
                <div className="training-record-main">
                  <strong>{row.activity_title}</strong>
                  <span>{row.center_name} · {displayDateTime(row.starts_at)} → {new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' }).format(new Date(row.ends_at))}</span>
                  <small>{employmentLabels[row.employment_mode]} · {scopeLabels[row.regulatory_scope]}{row.location ? ` · ${row.location}` : ''}</small>
                  {row.employment_mode === 'salaried' && row.hourly_rate_cents !== null && <small>Tarif horaire : {displayMoney(row.hourly_rate_cents)} / h · estimation {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(hours)} h = {displayMoney(hourlyAmountCents ?? 0)}</small>}
                  {row.employment_mode === 'subcontractor' && row.hourly_rate_cents !== null && <small>Tarif horaire HT : {displayMoney(row.hourly_rate_cents)} / h · {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(hours)} h = {displayMoney(row.amount_excl_tax_cents ?? hourlyAmountCents ?? 0)} HT</small>}
                  {row.employment_mode === 'subcontractor' && row.hourly_rate_cents === null && row.amount_excl_tax_cents !== null && <small>Montant HT : {displayMoney(row.amount_excl_tax_cents)}</small>}
                  <small>{row.employment_mode === 'salaried' ? `Planning uniquement · hors BPF ${organization.public_name || organization.name}` : bpfEligible ? 'Consolidation BPF possible une fois terminée' : 'Sous-traitance hors BPF tant que la nature n’est pas éligible'}</small>
                </div>
                <span className={`training-status-pill ${row.status}`}>{statusLabels[row.status]}</span>
                <div className="training-record-actions">
                  {row.status === 'planned' && <button className="secondary-button compact-button" type="button" disabled={busyId === row.id} onClick={() => void setStatus(row, 'completed')}>Terminée</button>}
                  {row.status !== 'canceled' && <button className="secondary-button compact-button" type="button" disabled={busyId === row.id} onClick={() => void setStatus(row, 'canceled')}>Annuler</button>}
                  <button className="secondary-button compact-button" type="button" disabled={busyId === row.id} onClick={() => void remove(row)}>Supprimer</button>
                  {row.series_id && <button className="secondary-button compact-button" type="button" disabled={busyId === row.id} onClick={() => void remove(row, true)}>Supprimer la série</button>}
                </div>
              </article>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}