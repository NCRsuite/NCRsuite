import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { nullableText, personName, type TrainingBpfTrainerRelationship, type TrainingTrainerRecord } from '../features/training/types';
import { supabase } from '../lib/supabase';

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialties: string;
  notes: string;
  bpfRelationship: TrainingBpfTrainerRelationship;
}

const emptyForm: FormState = { firstName: '', lastName: '', email: '', phone: '', specialties: '', notes: '', bpfRelationship: 'internal' };

export function TrainingTrainersPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<TrainingTrainerRecord[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const formOpen = canManage && searchParams.get('new') === '1';

  useEffect(() => {
    if (!organization) return;
    let active = true;
    const organizationId = organization.id;
    async function load() {
      setLoading(true);
      if (demoMode || !supabase) {
        const stored = localStorage.getItem(`ncr-suite-training-trainers-${organizationId}`);
        if (active) { setRows(stored ? JSON.parse(stored) as TrainingTrainerRecord[] : []); setLoading(false); }
        return;
      }
      const { data, error: loadError } = await supabase
        .from('training_trainers')
        .select('id,organization_id,first_name,last_name,email,phone,specialties,notes,bpf_relationship,status,created_at')
        .eq('organization_id', organizationId)
        .neq('status', 'archived')
        .order('last_name')
        .order('first_name');
      if (!active) return;
      if (loadError) setError(`Chargement impossible : ${loadError.message}`);
      else setRows((data ?? []) as TrainingTrainerRecord[]);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [organization, demoMode]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    if (!needle) return rows;
    return rows.filter((row) => [row.first_name, row.last_name, row.email, ...(row.specialties ?? [])]
      .filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(needle));
  }, [rows, query]);

  async function createTrainer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || !user || !canManage) return;
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('Le prénom et le nom sont obligatoires.'); return; }
    setSaving(true); setError(''); setSuccess('');
    const specialties = form.specialties.split(',').map((value) => value.trim()).filter(Boolean).slice(0, 20);
    const payload = {
      organization_id: organization.id,
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      email: nullableText(form.email)?.toLowerCase() ?? null,
      phone: nullableText(form.phone),
      specialties,
      notes: nullableText(form.notes),
      bpf_relationship: form.bpfRelationship,
      created_by: user.id
    };
    try {
      let created: TrainingTrainerRecord;
      if (demoMode || !supabase) {
        created = { id: crypto.randomUUID(), ...payload, status: 'active', created_at: new Date().toISOString() };
        localStorage.setItem(`ncr-suite-training-trainers-${organization.id}`, JSON.stringify([...rows, created]));
      } else {
        const { data, error: insertError } = await supabase
          .from('training_trainers')
          .insert(payload)
          .select('id,organization_id,first_name,last_name,email,phone,specialties,notes,bpf_relationship,status,created_at')
          .single();
        if (insertError) throw insertError;
        created = data as TrainingTrainerRecord;
      }
      setRows((current) => [...current, created].sort((a, b) => personName(a.last_name, a.first_name).localeCompare(personName(b.last_name, b.first_name), 'fr')));
      setForm(emptyForm); setSearchParams({}); setSuccess('Le formateur a bien été ajouté.');
    } catch (caught) {
      setError(`Création impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setSaving(false); }
  }

  async function updateBpfRelationship(row: TrainingTrainerRecord, relationship: TrainingBpfTrainerRelationship) {
    if (!organization || !canManage) return;
    setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const next = rows.map((item) => item.id === row.id ? { ...item, bpf_relationship: relationship } : item);
        localStorage.setItem(`ncr-suite-training-trainers-${organization.id}`, JSON.stringify(next));
        setRows(next);
      } else {
        const { error: updateError } = await supabase.from('training_trainers').update({ bpf_relationship: relationship }).eq('organization_id', organization.id).eq('id', row.id);
        if (updateError) throw updateError;
        setRows((current) => current.map((item) => item.id === row.id ? { ...item, bpf_relationship: relationship } : item));
      }
      setSuccess(relationship === 'external' ? 'Le formateur est identifié comme intervenant externe / sous-traitant.' : 'Le formateur est identifié comme intervenant interne.');
    } catch (caught) {
      setError(`Mise à jour impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    }
  }

  async function archive(row: TrainingTrainerRecord) {
    if (!organization || !canManage || !window.confirm(`Archiver ${personName(row.first_name, row.last_name)} ?`)) return;
    try {
      if (demoMode || !supabase) {
        const next = rows.filter((item) => item.id !== row.id);
        localStorage.setItem(`ncr-suite-training-trainers-${organization.id}`, JSON.stringify(next));
      } else {
        const { error: updateError } = await supabase.from('training_trainers').update({ status: 'archived' }).eq('organization_id', organization.id).eq('id', row.id);
        if (updateError) throw updateError;
      }
      setRows((current) => current.filter((item) => item.id !== row.id));
      setSuccess('Le formateur a été archivé.');
    } catch (caught) { setError(`Archivage impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
  }

  if (!organization) return null;

  return (
    <div className="page training-page">
      <header className="page-header">
        <div><p className="eyebrow">PACK FORMATION</p><h1>Formateurs</h1><p>Gérez les intervenants et leurs domaines de spécialité.</p></div>
        {canManage && <button className="primary-button" type="button" onClick={() => setSearchParams({ new: '1' })}><Icon name="plus" size={18} />Ajouter un formateur</button>}
      </header>

      {formOpen && (
        <section className="panel training-form-panel">
          <div className="panel-header"><div><p className="eyebrow">NOUVEL INTERVENANT</p><h2>Ajouter un formateur</h2></div><button className="secondary-button compact-button" type="button" onClick={() => { setSearchParams({}); setForm(emptyForm); }}>Fermer</button></div>
          <form className="training-form-grid" onSubmit={createTrainer}>
            <label>Prénom *<input autoFocus required value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} /></label>
            <label>Nom *<input required value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} /></label>
            <label>Adresse e-mail<input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
            <label>Téléphone<input inputMode="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
            <label className="full-field">Spécialités<input value={form.specialties} onChange={(event) => setForm((current) => ({ ...current, specialties: event.target.value }))} placeholder="SST, bureautique, communication… séparées par des virgules" /></label>
            <label>Lien avec l'organisme<select value={form.bpfRelationship} onChange={(event) => setForm((current) => ({ ...current, bpfRelationship: event.target.value as TrainingBpfTrainerRelationship }))}><option value="internal">Interne / salarié</option><option value="external">Externe / sous-traitant</option></select></label>
            <div className="training-form-hint"><strong>Impact BPF</strong><span>Un formateur externe pourra retrouver les sessions qui lui sont attribuées dans « Mon BPF » de son espace formateur.</span></div>
            <label className="full-field">Notes internes<textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
            <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={() => setSearchParams({})}>Annuler</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
          </form>
        </section>
      )}

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      <section className="panel training-list-panel">
        <div className="training-toolbar"><div><p className="eyebrow">ÉQUIPE PÉDAGOGIQUE</p><h2>{rows.length} formateur{rows.length > 1 ? 's' : ''}</h2></div><label className="search-field"><span className="sr-only">Rechercher</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom, e-mail, spécialité…" /></label></div>
        {loading ? <div className="training-empty">Chargement…</div> : filteredRows.length === 0 ? <div className="training-empty"><Icon name="briefcase" size={30} /><strong>Aucun formateur</strong><span>Ajoutez un intervenant avant de planifier vos sessions.</span></div> : (
          <div className="training-card-list">
            {filteredRows.map((row) => (
              <article key={row.id} className="training-record-card">
                <span className="training-record-icon"><Icon name="briefcase" size={21} /></span>
                <div className="training-record-main"><strong>{personName(row.first_name, row.last_name)}</strong><span>{[row.email, row.phone].filter(Boolean).join(' · ') || 'Aucune coordonnée'}</span>{row.specialties.length > 0 && <div className="training-tags">{row.specialties.slice(0, 4).map((specialty) => <em key={specialty}>{specialty}</em>)}</div>}</div>
                {canManage ? <label className="training-trainer-bpf-relationship"><span>Lien BPF</span><select value={row.bpf_relationship ?? 'internal'} onChange={(event) => void updateBpfRelationship(row, event.target.value as TrainingBpfTrainerRelationship)}><option value="internal">Interne</option><option value="external">Externe / sous-traitant</option></select></label> : <span className={`training-status-pill ${row.bpf_relationship === 'external' ? 'warning' : 'active'}`}>{row.bpf_relationship === 'external' ? 'Externe' : 'Interne'}</span>}
                {canManage && <button className="secondary-button compact-button" type="button" onClick={() => archive(row)}>Archiver</button>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
