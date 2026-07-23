import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { organizationHasFeature } from '../config/planEntitlements';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatTrainingMoney,
  modalityLabels,
  nullableText,
  personName,
  trainingProgramCompletion,
  type TrainingModality,
  type TrainingProgramRecord,
  type TrainingProgramTrainerRecord,
  type TrainingTrainerRecord
} from '../features/training/types';
import { generateTrainingProgramPdf } from '../features/training/programPdf';
import { closeFileWindow, prepareFileWindow, showBlobDownload } from '../lib/browserFiles';
import { supabase } from '../lib/supabase';

type FormState = {
  title: string;
  code: string;
  durationHours: string;
  modality: TrainingModality;
  objectives: string;
  description: string;
  audience: string;
  prerequisites: string;
  detailedProgram: string;
  teachingMethods: string;
  trainingResources: string;
  assessmentMethods: string;
  accessibility: string;
  priceExclTax: string;
  vatRate: string;
  defaultCapacity: string;
  defaultLocation: string;
  trainerIds: string[];
  siteId: string;
};

const initialForm = (): FormState => ({
  title: '', code: '', durationHours: '7', modality: 'presentiel', objectives: '', description: '',
  audience: '', prerequisites: 'Aucun prérequis.', detailedProgram: '', teachingMethods: '', trainingResources: '',
  assessmentMethods: '', accessibility: 'Formation accessible aux personnes en situation de handicap après étude des besoins et adaptation des moyens.',
  priceExclTax: '0', vatRate: '0', defaultCapacity: '12', defaultLocation: '', trainerIds: [], siteId: ''
});

const PROGRAM_SELECT = 'id,organization_id,site_id,title,code,duration_hours,modality,objectives,description,audience,prerequisites,detailed_program,teaching_methods,training_resources,assessment_methods,accessibility,price_excl_tax_cents,vat_rate_basis_points,default_capacity,default_location,completion_status,status,created_at,updated_at';

function moneyToCents(value: string) {
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : Number.NaN;
}

function normalizeProgram(row: Partial<TrainingProgramRecord> & Pick<TrainingProgramRecord, 'id' | 'organization_id' | 'title'>): TrainingProgramRecord {
  return {
    id: row.id,
    organization_id: row.organization_id,
    site_id: row.site_id ?? null,
    title: row.title,
    code: row.code ?? null,
    duration_hours: Number(row.duration_hours ?? 7),
    modality: row.modality ?? 'presentiel',
    objectives: row.objectives ?? null,
    description: row.description ?? null,
    audience: row.audience ?? null,
    prerequisites: row.prerequisites ?? null,
    detailed_program: row.detailed_program ?? null,
    teaching_methods: row.teaching_methods ?? null,
    training_resources: row.training_resources ?? null,
    assessment_methods: row.assessment_methods ?? null,
    accessibility: row.accessibility ?? null,
    price_excl_tax_cents: Number(row.price_excl_tax_cents ?? 0),
    vat_rate_basis_points: Number(row.vat_rate_basis_points ?? 0),
    default_capacity: Number(row.default_capacity ?? 12),
    default_location: row.default_location ?? null,
    completion_status: row.completion_status ?? 'draft',
    status: row.status ?? 'active',
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at
  };
}

function formFromProgram(row: TrainingProgramRecord, trainerIds: string[]): FormState {
  return {
    title: row.title,
    code: row.code ?? '',
    durationHours: String(row.duration_hours),
    modality: row.modality,
    objectives: row.objectives ?? '',
    description: row.description ?? '',
    audience: row.audience ?? '',
    prerequisites: row.prerequisites ?? '',
    detailedProgram: row.detailed_program ?? '',
    teachingMethods: row.teaching_methods ?? '',
    trainingResources: row.training_resources ?? '',
    assessmentMethods: row.assessment_methods ?? '',
    accessibility: row.accessibility ?? '',
    priceExclTax: String(row.price_excl_tax_cents / 100).replace('.', ','),
    vatRate: String(row.vat_rate_basis_points / 100).replace('.', ','),
    defaultCapacity: String(row.default_capacity),
    defaultLocation: row.default_location ?? '',
    trainerIds,
    siteId: row.site_id ?? ''
  };
}

export function TrainingProgramsPage() {
  const { organization, sites, activeSiteId } = useOrganization();
  const { user, demoMode } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<TrainingProgramRecord[]>([]);
  const [trainers, setTrainers] = useState<TrainingTrainerRecord[]>([]);
  const [programTrainers, setProgramTrainers] = useState<TrainingProgramTrainerRecord[]>([]);
  const [form, setForm] = useState<FormState>(initialForm());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const editingId = searchParams.get('edit');
  const formOpen = searchParams.get('new') === '1' || Boolean(editingId);

  useEffect(() => {
    if (!organization) return;
    setForm((current) => ({ ...current, siteId: current.siteId || activeSiteId || sites[0]?.id || '' }));
  }, [organization, activeSiteId, sites]);

  useEffect(() => {
    if (!organization) return;
    let active = true;
    const organizationId = organization.id;
    async function load() {
      setLoading(true); setError('');
      if (demoMode || !supabase) {
        const storedPrograms = localStorage.getItem(`ncr-suite-training-programs-${organizationId}`);
        const storedTrainers = localStorage.getItem(`ncr-suite-training-trainers-${organizationId}`);
        const storedLinks = localStorage.getItem(`ncr-suite-training-program-trainers-${organizationId}`);
        if (active) {
          setRows((storedPrograms ? JSON.parse(storedPrograms) as TrainingProgramRecord[] : []).map((row) => normalizeProgram(row)));
          setTrainers(storedTrainers ? JSON.parse(storedTrainers) as TrainingTrainerRecord[] : []);
          setProgramTrainers(storedLinks ? JSON.parse(storedLinks) as TrainingProgramTrainerRecord[] : []);
          setLoading(false);
        }
        return;
      }
      let request = supabase.from('training_programs').select(PROGRAM_SELECT).eq('organization_id', organizationId).neq('status', 'archived').order('title');
      if (activeSiteId) request = request.eq('site_id', activeSiteId);
      const [programResult, trainerResult, linkResult] = await Promise.all([
        request,
        supabase.from('training_trainers').select('id,organization_id,first_name,last_name,email,phone,specialties,notes,status,created_at').eq('organization_id', organizationId).eq('status', 'active').order('last_name'),
        supabase.from('training_program_trainers').select('organization_id,program_id,trainer_id,is_primary,created_at').eq('organization_id', organizationId)
      ]);
      if (!active) return;
      const firstError = programResult.error || trainerResult.error || linkResult.error;
      if (firstError) setError(`Chargement impossible : ${firstError.message}`);
      else {
        setRows((programResult.data ?? []).map((row) => normalizeProgram(row as TrainingProgramRecord)));
        setTrainers((trainerResult.data ?? []) as TrainingTrainerRecord[]);
        setProgramTrainers((linkResult.data ?? []) as TrainingProgramTrainerRecord[]);
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [organization, activeSiteId, demoMode]);

  useEffect(() => {
    if (!formOpen) return;
    if (editingId) {
      const row = rows.find((program) => program.id === editingId);
      if (row) setForm(formFromProgram(row, programTrainers.filter((item) => item.program_id === row.id).map((item) => item.trainer_id)));
      return;
    }
    setForm((current) => ({ ...initialForm(), siteId: current.siteId || activeSiteId || sites[0]?.id || '' }));
  }, [formOpen, editingId, rows, programTrainers, activeSiteId, sites]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    if (!needle) return rows;
    return rows.filter((row) => [row.title, row.code, row.objectives, row.description, row.audience, row.detailed_program]
      .filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(needle));
  }, [rows, query]);

  const trainerById = useMemo(() => new Map(trainers.map((trainer) => [trainer.id, trainer])), [trainers]);
  const stats = useMemo(() => ({
    total: rows.length,
    ready: rows.filter((row) => trainingProgramCompletion(row).ready).length,
    drafts: rows.filter((row) => !trainingProgramCompletion(row).ready).length,
    average: rows.length ? Math.round(rows.reduce((sum, row) => sum + trainingProgramCompletion(row).percent, 0) / rows.length) : 0
  }), [rows]);

  function toggleTrainer(id: string) {
    setForm((current) => ({ ...current, trainerIds: current.trainerIds.includes(id) ? current.trainerIds.filter((value) => value !== id) : [...current.trainerIds, id] }));
  }

  function closeEditor() {
    setSearchParams({}); setError('');
  }

  async function saveProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !user) return;
    const duration = Number(form.durationHours.replace(',', '.'));
    const amount = moneyToCents(form.priceExclTax);
    const vatRate = Number(form.vatRate.replace(',', '.'));
    const capacity = Number(form.defaultCapacity);
    if (form.title.trim().length < 2) { setError('Le titre doit contenir au moins 2 caractères.'); return; }
    if (!Number.isFinite(duration) || duration <= 0) { setError('La durée doit être supérieure à 0.'); return; }
    if (!Number.isFinite(amount) || amount < 0) { setError('Le tarif HT est invalide.'); return; }
    if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) { setError('Le taux de TVA est invalide.'); return; }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) { setError('La capacité doit être comprise entre 1 et 500.'); return; }
    if (organizationHasFeature(organization, 'multi_site') && !form.siteId) { setError('Sélectionne un établissement.'); return; }

    setSaving(true); setError(''); setSuccess('');
    const payload = {
      organization_id: organization.id,
      site_id: organizationHasFeature(organization, 'multi_site') ? form.siteId : null,
      title: form.title.trim(),
      code: nullableText(form.code)?.toUpperCase() ?? null,
      duration_hours: duration,
      modality: form.modality,
      objectives: nullableText(form.objectives),
      description: nullableText(form.description),
      audience: nullableText(form.audience),
      prerequisites: nullableText(form.prerequisites),
      detailed_program: nullableText(form.detailedProgram),
      teaching_methods: nullableText(form.teachingMethods),
      training_resources: nullableText(form.trainingResources),
      assessment_methods: nullableText(form.assessmentMethods),
      accessibility: nullableText(form.accessibility),
      price_excl_tax_cents: amount,
      vat_rate_basis_points: Math.round(vatRate * 100),
      default_capacity: capacity,
      default_location: nullableText(form.defaultLocation),
      created_by: user.id
    };

    try {
      let saved: TrainingProgramRecord;
      let nextLinks: TrainingProgramTrainerRecord[];
      if (demoMode || !supabase) {
        const base = normalizeProgram({
          id: editingId || crypto.randomUUID(), ...payload, completion_status: 'draft', status: 'active', created_at: rows.find((row) => row.id === editingId)?.created_at ?? new Date().toISOString()
        } as TrainingProgramRecord);
        const ready = trainingProgramCompletion(base).percent === 100;
        saved = { ...base, completion_status: ready ? 'ready' : 'draft' };
        const nextRows = editingId ? rows.map((row) => row.id === editingId ? saved : row) : [...rows, saved];
        localStorage.setItem(`ncr-suite-training-programs-${organization.id}`, JSON.stringify(nextRows));
        nextLinks = [
          ...programTrainers.filter((item) => item.program_id !== saved.id),
          ...form.trainerIds.map((trainerId, index) => ({ organization_id: organization.id, program_id: saved.id, trainer_id: trainerId, is_primary: index === 0 }))
        ];
        localStorage.setItem(`ncr-suite-training-program-trainers-${organization.id}`, JSON.stringify(nextLinks));
      } else {
        if (editingId) {
          const { data, error: updateError } = await supabase.from('training_programs').update(payload).eq('organization_id', organization.id).eq('id', editingId).select(PROGRAM_SELECT).single();
          if (updateError) throw updateError;
          saved = normalizeProgram(data as TrainingProgramRecord);
        } else {
          const { data, error: insertError } = await supabase.from('training_programs').insert(payload).select(PROGRAM_SELECT).single();
          if (insertError) throw insertError;
          saved = normalizeProgram(data as TrainingProgramRecord);
        }
        const { error: deleteLinkError } = await supabase.from('training_program_trainers').delete().eq('organization_id', organization.id).eq('program_id', saved.id);
        if (deleteLinkError) throw deleteLinkError;
        if (form.trainerIds.length > 0) {
          const { error: linkError } = await supabase.from('training_program_trainers').insert(form.trainerIds.map((trainerId, index) => ({ organization_id: organization.id, program_id: saved.id, trainer_id: trainerId, is_primary: index === 0, created_by: user.id })));
          if (linkError) throw linkError;
        }
        nextLinks = [
          ...programTrainers.filter((item) => item.program_id !== saved.id),
          ...form.trainerIds.map((trainerId, index) => ({ organization_id: organization.id, program_id: saved.id, trainer_id: trainerId, is_primary: index === 0 }))
        ];
      }
      setRows((current) => (editingId ? current.map((row) => row.id === saved.id ? saved : row) : [...current, saved]).sort((a, b) => a.title.localeCompare(b.title, 'fr')));
      setProgramTrainers(nextLinks);
      closeEditor();
      setSuccess(trainingProgramCompletion(saved).ready ? 'La formation complète est prête à être commercialisée.' : 'La formation est enregistrée en brouillon. Les éléments manquants restent visibles.');
    } catch (caught) {
      setError(`Enregistrement impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setSaving(false); }
  }

  async function archive(row: TrainingProgramRecord) {
    if (!organization || !window.confirm(`Archiver la formation « ${row.title} » ?`)) return;
    try {
      if (demoMode || !supabase) {
        const next = rows.filter((item) => item.id !== row.id);
        localStorage.setItem(`ncr-suite-training-programs-${organization.id}`, JSON.stringify(next));
      } else {
        const { error: updateError } = await supabase.from('training_programs').update({ status: 'archived' }).eq('organization_id', organization.id).eq('id', row.id);
        if (updateError) throw updateError;
      }
      setRows((current) => current.filter((item) => item.id !== row.id));
      setSuccess('La formation a été archivée.');
    } catch (caught) { setError(`Archivage impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
  }


  async function downloadProgramPdf(row: TrainingProgramRecord) {
    if (!organization) return;
    const fileWindow = prepareFileWindow(`Programme ${row.title}`, 'NCR Suite prépare le programme premium…');
    try {
      const linkedTrainers = programTrainers
        .filter((item) => item.program_id === row.id)
        .map((item) => trainerById.get(item.trainer_id))
        .filter(Boolean) as TrainingTrainerRecord[];
      const result = await generateTrainingProgramPdf({ organization, program: row, trainers: linkedTrainers });
      const url = URL.createObjectURL(result.blob);
      showBlobDownload(fileWindow, url, result.filename, 'Programme prêt');
      window.setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (caught) {
      closeFileWindow(fileWindow);
      setError(`PDF impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    }
  }

  if (!organization) return null;

  return (
    <div className="page training-page training-programs-v215">
      <section className="training-program-hero">
        <div className="training-program-hero-copy">
          <span className="training-program-hero-icon"><Icon name="graduation" size={25} /></span>
          <div><p className="eyebrow">FORMATION · CATALOGUE MAÎTRE</p><h1>Formations complètes</h1><p>Crée chaque formation une seule fois, puis réutilise son programme, son tarif, ses formateurs et ses modalités dans les devis, conventions et sessions.</p></div>
        </div>
        <div className="training-program-hero-actions">
          <button className="secondary-button" type="button" onClick={() => navigate('/profil-organisme')}><Icon name="building" size={17} />Profil organisme</button>
          <button className="primary-button" type="button" onClick={() => setSearchParams({ new: '1' })}><Icon name="plus" size={18} />Créer une formation</button>
        </div>
        <div className="training-program-metrics">
          <article><span><Icon name="graduation" size={18} /></span><div><strong>{stats.total}</strong><small>formations</small></div></article>
          <article><span><Icon name="check" size={18} /></span><div><strong>{stats.ready}</strong><small>prêtes</small></div></article>
          <article><span><Icon name="activity" size={18} /></span><div><strong>{stats.drafts}</strong><small>à compléter</small></div></article>
          <article><span><Icon name="chart" size={18} /></span><div><strong>{stats.average}%</strong><small>complétude moyenne</small></div></article>
        </div>
      </section>

      {formOpen && (
        <section className="panel training-program-editor">
          <div className="panel-header"><div><p className="eyebrow">{editingId ? 'MISE À JOUR' : 'NOUVEAU MODÈLE'}</p><h2>{editingId ? 'Modifier la formation' : 'Créer une formation complète'}</h2><p>Les champs essentiels alimenteront automatiquement les documents et le cockpit de session.</p></div><button className="secondary-button compact-button" type="button" onClick={closeEditor}>Fermer</button></div>
          <form className="training-program-complete-form" onSubmit={saveProgram}>
            <fieldset><legend><span>1</span>Identité & organisation</legend><div className="training-form-grid">
              <label className="full-field">Intitulé *<input autoFocus required minLength={2} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex. Sauveteur Secouriste du Travail" /></label>
              <label>Code interne<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="SST-01" /></label>
              <label>Durée en heures *<input inputMode="decimal" required value={form.durationHours} onChange={(event) => setForm({ ...form, durationHours: event.target.value })} /></label>
              <label>Modalité<select value={form.modality} onChange={(event) => setForm({ ...form, modality: event.target.value as TrainingModality })}><option value="presentiel">Présentiel</option><option value="distanciel">Distanciel</option><option value="hybride">Hybride</option></select></label>
              <label>Capacité habituelle<input type="number" min="1" max="500" value={form.defaultCapacity} onChange={(event) => setForm({ ...form, defaultCapacity: event.target.value })} /></label>
              <label className="full-field">Lieu habituel<input value={form.defaultLocation} onChange={(event) => setForm({ ...form, defaultLocation: event.target.value })} placeholder="Adresse, salle ou lien de visioconférence" /></label>
              {organizationHasFeature(organization, 'multi_site') && <label>Établissement<select required value={form.siteId} onChange={(event) => setForm({ ...form, siteId: event.target.value })}><option value="">Sélectionner</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>}
              <label>Tarif HT habituel (€)<input inputMode="decimal" value={form.priceExclTax} onChange={(event) => setForm({ ...form, priceExclTax: event.target.value })} /></label>
              <label>TVA (%)<input inputMode="decimal" value={form.vatRate} onChange={(event) => setForm({ ...form, vatRate: event.target.value })} /></label>
            </div></fieldset>

            <fieldset><legend><span>2</span>Cadre pédagogique</legend><div className="training-form-grid">
              <label className="full-field">Objectifs pédagogiques *<textarea rows={4} value={form.objectives} onChange={(event) => setForm({ ...form, objectives: event.target.value })} placeholder="À l’issue de la formation, le participant sera capable de…" /></label>
              <label className="full-field">Public concerné *<textarea rows={3} value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })} placeholder="Fonctions, profils ou niveaux concernés" /></label>
              <label className="full-field">Prérequis *<textarea rows={3} value={form.prerequisites} onChange={(event) => setForm({ ...form, prerequisites: event.target.value })} /></label>
              <label className="full-field">Description commerciale<textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Résumé clair utilisé dans les propositions" /></label>
            </div></fieldset>

            <fieldset><legend><span>3</span>Programme & moyens</legend><div className="training-form-grid">
              <label className="full-field">Programme détaillé *<textarea rows={8} value={form.detailedProgram} onChange={(event) => setForm({ ...form, detailedProgram: event.target.value })} placeholder={'Module 1 — …\nModule 2 — …\nMise en situation — …'} /></label>
              <label className="full-field">Méthodes pédagogiques *<textarea rows={4} value={form.teachingMethods} onChange={(event) => setForm({ ...form, teachingMethods: event.target.value })} placeholder="Apports, démonstrations, ateliers, mises en situation…" /></label>
              <label className="full-field">Moyens techniques et ressources<textarea rows={4} value={form.trainingResources} onChange={(event) => setForm({ ...form, trainingResources: event.target.value })} placeholder="Salle, matériel, supports remis, plateforme…" /></label>
              <label className="full-field">Modalités d’évaluation *<textarea rows={4} value={form.assessmentMethods} onChange={(event) => setForm({ ...form, assessmentMethods: event.target.value })} placeholder="Positionnement initial, évaluation continue, test final…" /></label>
              <label className="full-field">Accessibilité handicap *<textarea rows={3} value={form.accessibility} onChange={(event) => setForm({ ...form, accessibility: event.target.value })} /></label>
            </div></fieldset>

            <fieldset><legend><span>4</span>Formateurs habilités</legend><div className="training-program-trainer-picker">
              {trainers.length === 0 ? <div className="training-empty compact"><Icon name="briefcase" size={25} /><strong>Aucun formateur actif</strong><span>Crée d’abord les profils formateurs nécessaires.</span><button type="button" className="secondary-button compact-button" onClick={() => navigate('/formateurs?new=1')}>Ajouter un formateur</button></div> : trainers.map((trainer) => <label key={trainer.id} className={form.trainerIds.includes(trainer.id) ? 'selected' : ''}><input type="checkbox" checked={form.trainerIds.includes(trainer.id)} onChange={() => toggleTrainer(trainer.id)} /><span><Icon name="briefcase" size={17} /></span><div><strong>{personName(trainer.first_name, trainer.last_name)}</strong><small>{trainer.specialties.join(' · ') || 'Formateur'}</small></div></label>)}
            </div></fieldset>

            <div className="training-program-form-footer"><div><Icon name="sparkles" size={18} /><p><strong>Enregistrement intelligent</strong><span>La formation devient « prête » lorsque tous les champs pédagogiques obligatoires sont renseignés.</span></p></div><div className="form-actions"><button className="secondary-button" type="button" onClick={closeEditor}>Annuler</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : editingId ? 'Mettre à jour' : 'Créer la formation'}</button></div></div>
          </form>
        </section>
      )}

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      <section className="panel training-program-library">
        <div className="training-toolbar"><div><p className="eyebrow">CATALOGUE ACTIF</p><h2>{rows.length} formation{rows.length > 1 ? 's' : ''}</h2></div><label className="search-field"><span className="sr-only">Rechercher</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Titre, code, public, programme…" /></label></div>
        {loading ? <div className="training-empty">Chargement…</div> : filteredRows.length === 0 ? <div className="training-empty"><Icon name="graduation" size={30} /><strong>Aucune formation</strong><span>Commence par créer le modèle complet de ta première formation.</span></div> : (
          <div className="training-program-v215-grid">
            {filteredRows.map((row) => {
              const completion = trainingProgramCompletion(row);
              const linkedTrainers = programTrainers.filter((item) => item.program_id === row.id).map((item) => trainerById.get(item.trainer_id)).filter(Boolean) as TrainingTrainerRecord[];
              return <article key={row.id} className={`training-program-v215-card ${completion.ready ? 'ready' : 'draft'}`}>
                <header><span><Icon name="graduation" size={22} /></span><div><small>{row.code || 'FORMATION'}</small><strong>{row.title}</strong></div><em>{completion.ready ? 'Prête' : 'À compléter'}</em></header>
                <div className="training-program-v215-progress"><span><i style={{ width: `${completion.percent}%` }} /></span><b>{completion.percent}%</b></div>
                <p>{row.description || row.objectives || 'Ajoute une description et les objectifs pédagogiques.'}</p>
                <div className="training-program-v215-facts"><span>{row.duration_hours} h</span><span>{modalityLabels[row.modality]}</span><span>{row.default_capacity} places</span><span>{formatTrainingMoney(row.price_excl_tax_cents)} HT</span></div>
                <div className="training-program-v215-trainers"><Icon name="briefcase" size={15} /><span>{linkedTrainers.length ? linkedTrainers.map((trainer) => personName(trainer.first_name, trainer.last_name)).join(', ') : 'Aucun formateur associé'}</span></div>
                <footer><button className="secondary-button compact-button" type="button" onClick={() => setSearchParams({ edit: row.id })}>Modifier</button><button className="secondary-button compact-button" type="button" disabled={!completion.ready} title={!completion.ready ? 'Complète la fiche avant de générer le programme.' : undefined} onClick={() => void downloadProgramPdf(row)}><Icon name="file" size={15} />Programme PDF</button><button className="primary-button compact-button" type="button" disabled={!completion.ready} title={!completion.ready ? 'Complète la fiche avant de créer une proposition.' : undefined} onClick={() => navigate(`/commercial?new=1&program=${encodeURIComponent(row.id)}`)}>Créer une proposition</button><button className="danger-text-button" type="button" onClick={() => void archive(row)}>Archiver</button></footer>
              </article>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
