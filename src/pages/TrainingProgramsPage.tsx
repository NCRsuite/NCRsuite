import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { organizationHasFeature } from '../config/planEntitlements';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { modalityLabels, nullableText, type TrainingModality, type TrainingProgramRecord } from '../features/training/types';
import { supabase } from '../lib/supabase';

interface FormState {
  title: string;
  code: string;
  durationHours: string;
  modality: TrainingModality;
  objectives: string;
  description: string;
  siteId: string;
}

const emptyForm: FormState = {
  title: '', code: '', durationHours: '7', modality: 'presentiel', objectives: '', description: '', siteId: ''
};

export function TrainingProgramsPage() {
  const { organization, sites, activeSiteId } = useOrganization();
  const { user, demoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<TrainingProgramRecord[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const formOpen = searchParams.get('new') === '1';

  useEffect(() => {
    if (!organization) return;
    setForm((current) => ({ ...current, siteId: current.siteId || activeSiteId || sites[0]?.id || '' }));
  }, [organization, activeSiteId, sites]);

  useEffect(() => {
    if (!organization) return;
    let active = true;
    const organizationId = organization.id;
    async function load() {
      setLoading(true);
      if (demoMode || !supabase) {
        const stored = localStorage.getItem(`ncr-suite-training-programs-${organizationId}`);
        if (active) { setRows(stored ? JSON.parse(stored) as TrainingProgramRecord[] : []); setLoading(false); }
        return;
      }
      let request = supabase
        .from('training_programs')
        .select('id,organization_id,site_id,title,code,duration_hours,modality,objectives,description,status,created_at')
        .eq('organization_id', organizationId)
        .neq('status', 'archived')
        .order('title');
      if (activeSiteId) request = request.eq('site_id', activeSiteId);
      const { data, error: loadError } = await request;
      if (!active) return;
      if (loadError) setError(`Chargement impossible : ${loadError.message}`);
      else setRows((data ?? []).map((row) => ({ ...row, duration_hours: Number(row.duration_hours) })) as TrainingProgramRecord[]);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [organization, activeSiteId, demoMode]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    if (!needle) return rows;
    return rows.filter((row) => [row.title, row.code, row.objectives, row.description]
      .filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(needle));
  }, [rows, query]);

  async function createProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !user) return;
    const duration = Number(form.durationHours.replace(',', '.'));
    if (form.title.trim().length < 2) { setError('Le titre doit contenir au moins 2 caractères.'); return; }
    if (!Number.isFinite(duration) || duration <= 0) { setError('La durée doit être supérieure à 0.'); return; }
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
      created_by: user.id
    };

    try {
      let created: TrainingProgramRecord;
      if (demoMode || !supabase) {
        created = { id: crypto.randomUUID(), ...payload, status: 'active', created_at: new Date().toISOString() };
        localStorage.setItem(`ncr-suite-training-programs-${organization.id}`, JSON.stringify([...rows, created]));
      } else {
        const { data, error: insertError } = await supabase
          .from('training_programs')
          .insert(payload)
          .select('id,organization_id,site_id,title,code,duration_hours,modality,objectives,description,status,created_at')
          .single();
        if (insertError) throw insertError;
        created = { ...(data as TrainingProgramRecord), duration_hours: Number(data.duration_hours) };
      }
      setRows((current) => [...current, created].sort((a, b) => a.title.localeCompare(b.title, 'fr')));
      setForm({ ...emptyForm, siteId: activeSiteId || sites[0]?.id || '' });
      setSearchParams({}); setSuccess('La formation a bien été créée.');
    } catch (caught) {
      setError(`Création impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
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

  if (!organization) return null;

  return (
    <div className="page training-page">
      <header className="page-header">
        <div><p className="eyebrow">PACK FORMATION</p><h1>Formations</h1><p>Créez votre catalogue avant de planifier les sessions.</p></div>
        <button className="primary-button" type="button" onClick={() => setSearchParams({ new: '1' })}><Icon name="plus" size={18} />Créer une formation</button>
      </header>

      {formOpen && (
        <section className="panel training-form-panel">
          <div className="panel-header"><div><p className="eyebrow">CATALOGUE</p><h2>Nouvelle formation</h2></div><button className="secondary-button compact-button" type="button" onClick={() => setSearchParams({})}>Fermer</button></div>
          <form className="training-form-grid" onSubmit={createProgram}>
            <label className="full-field">Intitulé *<input autoFocus required minLength={2} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ex. Sauveteur Secouriste du Travail" /></label>
            <label>Code interne<input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} placeholder="SST-01" /></label>
            <label>Durée en heures *<input inputMode="decimal" required value={form.durationHours} onChange={(event) => setForm((current) => ({ ...current, durationHours: event.target.value }))} /></label>
            <label>Modalité<select value={form.modality} onChange={(event) => setForm((current) => ({ ...current, modality: event.target.value as TrainingModality }))}><option value="presentiel">Présentiel</option><option value="distanciel">Distanciel</option><option value="hybride">Hybride</option></select></label>
            {organizationHasFeature(organization, 'multi_site') && <label>Établissement<select required value={form.siteId} onChange={(event) => setForm((current) => ({ ...current, siteId: event.target.value }))}><option value="">Sélectionner</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>}
            <label className="full-field">Objectifs<textarea rows={3} value={form.objectives} onChange={(event) => setForm((current) => ({ ...current, objectives: event.target.value }))} placeholder="Compétences ou résultats attendus…" /></label>
            <label className="full-field">Description<textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
            <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={() => setSearchParams({})}>Annuler</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
          </form>
        </section>
      )}

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      <section className="panel training-list-panel">
        <div className="training-toolbar"><div><p className="eyebrow">CATALOGUE ACTIF</p><h2>{rows.length} formation{rows.length > 1 ? 's' : ''}</h2></div><label className="search-field"><span className="sr-only">Rechercher</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Titre, code, objectif…" /></label></div>
        {loading ? <div className="training-empty">Chargement…</div> : filteredRows.length === 0 ? <div className="training-empty"><Icon name="graduation" size={30} /><strong>Aucune formation</strong><span>Créez votre première formation pour pouvoir ouvrir une session.</span></div> : (
          <div className="training-program-grid">
            {filteredRows.map((row) => (
              <article key={row.id} className="training-program-card">
                <div className="training-program-head"><span><Icon name="graduation" size={23} /></span><div><strong>{row.title}</strong><small>{row.code || 'Sans code interne'}</small></div></div>
                <div className="training-program-meta"><span>{row.duration_hours} h</span><span>{modalityLabels[row.modality]}</span></div>
                <p>{row.objectives || row.description || 'Aucun objectif renseigné.'}</p>
                <button className="secondary-button compact-button" type="button" onClick={() => archive(row)}>Archiver</button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
