import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { supabase } from '../lib/supabase';

interface BeautyCrmClientRef {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

interface BeautyClientCrmProps {
  organizationId: string;
  companyId: string;
  client: BeautyCrmClientRef;
  userId: string;
  canManage: boolean;
  publicSlug?: string | null;
  onClose: () => void;
}

type ClientProfileActivity = 'general' | 'hair' | 'barber' | 'nails' | 'lashes' | 'aesthetics';

interface QuestionnaireField {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'textarea' | 'select';
  options?: string[];
}

interface CrmPayload {
  activity_kind: ClientProfileActivity;
  client: BeautyCrmClientRef & {
    notes: string | null;
    birth_date: string | null;
    marketing_opt_in: boolean;
    birthday_consent: boolean;
    loyalty_opt_in: boolean;
    created_at: string;
  };
  summary: {
    visit_count: number;
    total_spent_cents: number;
    last_visit: string | null;
    next_appointment: string | null;
    average_days_between: number | null;
  };
  profile: {
    id?: string;
    technical_notes?: string | null;
    preferences?: string | null;
    contraindications?: string | null;
    custom_fields?: Record<string, unknown>;
    updated_at?: string;
  };
  appointments: Array<{
    id: string;
    starts_at: string;
    ends_at: string;
    status: string;
    amount_cents: number | null;
    staff_name: string;
    service_name: string;
  }>;
  notes: Array<{
    id: string;
    appointment_id: string | null;
    note_type: 'technical' | 'preference' | 'warning' | 'follow_up';
    note: string;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  }>;
  media: Array<{
    id: string;
    appointment_id: string | null;
    media_kind: 'before' | 'after' | 'result' | 'reference';
    storage_path: string;
    caption: string | null;
    captured_at: string;
    created_by: string | null;
  }>;
  consents: Array<{
    id: string;
    consent_type: 'photo_internal' | 'photo_marketing' | 'marketing' | 'birthday';
    granted: boolean;
    source: string;
    recorded_at: string;
    note: string | null;
  }>;
  documents: Array<{
    id: string;
    appointment_id: string | null;
    title: string;
    category: 'questionnaire' | 'consent' | 'technical' | 'reference' | 'other';
    storage_path: string;
    mime_type: string;
    size_bytes: number;
    created_by: string | null;
    created_at: string;
  }>;
  questionnaires: Array<{
    id: string;
    activity_kind: ClientProfileActivity;
    answers: Record<string, string>;
    source: string;
    created_by: string | null;
    created_at: string;
  }>;
}

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
const dateOnly = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

const noteLabels: Record<CrmPayload['notes'][number]['note_type'], string> = {
  technical: 'Technique',
  preference: 'Préférence',
  warning: 'À surveiller',
  follow_up: 'Suivi'
};

const mediaLabels: Record<CrmPayload['media'][number]['media_kind'], string> = {
  before: 'Avant',
  after: 'Après',
  result: 'Résultat',
  reference: 'Référence'
};

const activityLabels: Record<ClientProfileActivity, string> = {
  general: 'Généraliste',
  hair: 'Coiffure',
  barber: 'Barber',
  nails: 'Onglerie',
  lashes: 'Cils',
  aesthetics: 'Esthétique'
};

const questionnaireFields: Record<ClientProfileActivity, QuestionnaireField[]> = {
  general: [
    { key: 'preferred_style', label: 'Style / résultat préféré', placeholder: 'Ce que le client aime habituellement…' },
    { key: 'sensitivities', label: 'Sensibilités signalées', type: 'textarea', placeholder: 'Informations déclarées par le client…' },
    { key: 'products_to_avoid', label: 'Produits / techniques à éviter', type: 'textarea', placeholder: 'Produits, odeurs, textures ou techniques à éviter…' },
    { key: 'next_goal', label: 'Objectif de la prochaine prestation', type: 'textarea', placeholder: 'Résultat souhaité…' }
  ],
  hair: [
    { key: 'hair_texture', label: 'Type / texture déclarée', type: 'select', options: ['', 'Fin', 'Normal', 'Épais', 'Bouclé', 'Frisé / crépu'] },
    { key: 'current_color', label: 'Couleur / état actuel', placeholder: 'Naturel, coloration, mèches…' },
    { key: 'technical_history', label: 'Historique technique récent', type: 'textarea', placeholder: 'Coloration, décoloration, lissage, permanente…' },
    { key: 'scalp_sensitivity', label: 'Sensibilité du cuir chevelu signalée', type: 'textarea', placeholder: 'Information déclarée, sans diagnostic…' },
    { key: 'desired_result', label: 'Résultat recherché', type: 'textarea', placeholder: 'Coupe, couleur, entretien souhaité…' }
  ],
  barber: [
    { key: 'haircut_style', label: 'Coupe habituelle', placeholder: 'Dégradé, classique, crop, longueur…' },
    { key: 'fade_preference', label: 'Préférence de dégradé', type: 'select', options: ['', 'Bas', 'Moyen', 'Haut', 'À définir ensemble'] },
    { key: 'beard_style', label: 'Style de barbe', placeholder: 'Contour, barbe courte, longue…' },
    { key: 'beard_length', label: 'Longueur habituelle', placeholder: 'Sabot / longueur / repère…' },
    { key: 'skin_sensitivity', label: 'Sensibilité cutanée signalée', type: 'textarea', placeholder: 'Réactions ou inconforts déclarés…' }
  ],
  nails: [
    { key: 'nail_shape', label: 'Forme préférée', type: 'select', options: ['', 'Carré', 'Carré arrondi', 'Amande', 'Ovale', 'Coffin', 'Stiletto'] },
    { key: 'nail_length', label: 'Longueur préférée', type: 'select', options: ['', 'Courte', 'Moyenne', 'Longue', 'Très longue'] },
    { key: 'current_product', label: 'Produit / pose actuelle', placeholder: 'Gel, semi-permanent, capsules, naturel…' },
    { key: 'sensitivities', label: 'Sensibilités signalées', type: 'textarea', placeholder: 'Informations déclarées par le client…' },
    { key: 'desired_finish', label: 'Finition / style recherché', type: 'textarea', placeholder: 'Nude, nail art, french, couleur…' }
  ],
  lashes: [
    { key: 'desired_style', label: 'Effet souhaité', type: 'select', options: ['', 'Naturel', 'Cat eye', 'Doll eye', 'Wispy', 'Volume', 'À définir ensemble'] },
    { key: 'curl', label: 'Courbure habituelle', placeholder: 'C, CC, D… si connue' },
    { key: 'length', label: 'Longueur habituelle', placeholder: 'Repère ou préférence…' },
    { key: 'eye_sensitivity', label: 'Sensibilité oculaire signalée', type: 'textarea', placeholder: 'Inconfort ou sensibilité déclarée…' },
    { key: 'previous_reaction', label: 'Réaction antérieure signalée', type: 'textarea', placeholder: 'Information déclarée, sans diagnostic…' }
  ],
  aesthetics: [
    { key: 'skin_feel', label: 'Type / ressenti de peau déclaré', type: 'select', options: ['', 'Sèche', 'Normale', 'Mixte', 'Grasse', 'Sensible', 'À préciser'] },
    { key: 'sensitivity', label: 'Sensibilités signalées', type: 'textarea', placeholder: 'Informations déclarées par le client…' },
    { key: 'recent_care', label: 'Soins / prestations récentes', type: 'textarea', placeholder: 'Soins ou techniques récents…' },
    { key: 'products_to_avoid', label: 'Produits à éviter', type: 'textarea', placeholder: 'Produits ou actifs que le client souhaite éviter…' },
    { key: 'goal', label: 'Objectif de la prestation', type: 'textarea', placeholder: 'Confort, éclat, détente, entretien…' }
  ]
};

const documentCategoryLabels = {
  questionnaire: 'Questionnaire',
  consent: 'Consentement',
  technical: 'Document technique',
  reference: 'Référence',
  other: 'Autre'
} as const;

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  arrived: 'Arrivée',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absent'
};

function nullable(value: string) {
  const next = value.trim();
  return next.length > 0 ? next : null;
}

function imageExtension(file: File) {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

async function normalizePhoto(file: File) {
  if (!['image/heic', 'image/heif'].includes(file.type)) return file;
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Cette photo HEIC ne peut pas être convertie sur cet appareil.'));
      element.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Conversion de la photo impossible.');
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) throw new Error('Conversion de la photo impossible.');
    return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function BeautyClientCrmPanel({
  organizationId,
  companyId,
  client,
  userId,
  canManage,
  publicSlug,
  onClose
}: BeautyClientCrmProps) {
  const [data, setData] = useState<CrmPayload | null>(null);
  const [profile, setProfile] = useState({ technicalNotes: '', preferences: '', contraindications: '' });
  const [noteType, setNoteType] = useState<CrmPayload['notes'][number]['note_type']>('technical');
  const [noteText, setNoteText] = useState('');
  const [mediaKind, setMediaKind] = useState<CrmPayload['media'][number]['media_kind']>('before');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, string>>({});
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentCategory, setDocumentCategory] = useState<CrmPayload['documents'][number]['category']>('other');
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [savingQuestionnaire, setSavingQuestionnaire] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [busyConsent, setBusyConsent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    const db = supabase;
    if (!db) return;
    setLoading(true);
    setError('');
    const { data: payload, error: requestError } = await db.rpc('get_beauty_client_crm', {
      p_organization_id: organizationId,
      p_company_id: companyId,
      p_client_id: client.id
    });
    if (requestError) {
      setError(requestError.message);
      setLoading(false);
      return;
    }
    const next = payload as CrmPayload;
    setData(next);
    setProfile({
      technicalNotes: next.profile?.technical_notes ?? '',
      preferences: next.profile?.preferences ?? '',
      contraindications: next.profile?.contraindications ?? ''
    });
    const latestQuestionnaire = next.questionnaires.find((item) => item.activity_kind === next.activity_kind);
    setQuestionnaireAnswers(latestQuestionnaire?.answers ?? (next.profile?.custom_fields as Record<string, string> | undefined) ?? {});

    const paths = next.media.map((item) => item.storage_path);
    if (paths.length > 0) {
      const entries = await Promise.all(paths.map(async (path) => {
        const { data: signed } = await db.storage.from('beauty-client-media').createSignedUrl(path, 3600);
        return [path, signed?.signedUrl ?? ''] as const;
      }));
      setMediaUrls(Object.fromEntries(entries));
    } else {
      setMediaUrls({});
    }

    const documentPaths = next.documents.map((item) => item.storage_path);
    if (documentPaths.length > 0) {
      const documentEntries = await Promise.all(documentPaths.map(async (path) => {
        const { data: signed } = await db.storage.from('beauty-client-documents').createSignedUrl(path, 3600);
        return [path, signed?.signedUrl ?? ''] as const;
      }));
      setDocumentUrls(Object.fromEntries(documentEntries));
    } else {
      setDocumentUrls({});
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [organizationId, companyId, client.id]);

  const consentMap = useMemo(() => {
    const map = new Map<string, boolean>();
    data?.consents.forEach((item) => {
      if (!map.has(item.consent_type)) map.set(item.consent_type, item.granted);
    });
    if (data && !map.has('marketing')) map.set('marketing', data.client.marketing_opt_in);
    if (data && !map.has('birthday')) map.set('birthday', data.client.birthday_consent);
    return map;
  }, [data]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setSavingProfile(true);
    setError('');
    setSuccess('');
    const { error: saveError } = await supabase.from('beauty_client_profiles').upsert({
      organization_id: organizationId,
      company_id: companyId,
      client_id: client.id,
      technical_notes: nullable(profile.technicalNotes),
      preferences: nullable(profile.preferences),
      contraindications: nullable(profile.contraindications),
      updated_by: userId
    }, { onConflict: 'organization_id,company_id,client_id' });
    if (saveError) setError(saveError.message);
    else {
      setSuccess('Profil technique enregistré.');
      await load();
    }
    setSavingProfile(false);
  }

  async function addNote(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !noteText.trim()) return;
    setAddingNote(true);
    setError('');
    setSuccess('');
    const { error: insertError } = await supabase.from('beauty_client_notes').insert({
      organization_id: organizationId,
      company_id: companyId,
      client_id: client.id,
      note_type: noteType,
      note: noteText.trim(),
      created_by: userId
    });
    if (insertError) setError(insertError.message);
    else {
      setNoteText('');
      setSuccess('Note ajoutée à la fiche.');
      await load();
    }
    setAddingNote(false);
  }

  async function deleteNote(noteId: string) {
    if (!supabase || !canManage || !window.confirm('Supprimer cette note ?')) return;
    setError('');
    const { error: deleteError } = await supabase.from('beauty_client_notes')
      .delete()
      .eq('organization_id', organizationId)
      .eq('company_id', companyId)
      .eq('client_id', client.id)
      .eq('id', noteId);
    if (deleteError) setError(deleteError.message);
    else await load();
  }

  async function recordConsent(type: CrmPayload['consents'][number]['consent_type'], granted: boolean) {
    if (!supabase) return;
    setBusyConsent(type);
    setError('');
    setSuccess('');
    const { error: insertError } = await supabase.from('beauty_client_consents').insert({
      organization_id: organizationId,
      company_id: companyId,
      client_id: client.id,
      consent_type: type,
      granted,
      source: 'professional',
      recorded_by: userId
    });
    if (insertError) setError(insertError.message);
    else {
      setSuccess('Consentement enregistré et horodaté.');
      await load();
    }
    setBusyConsent('');
  }

  async function uploadPhoto(file: File | null) {
    if (!supabase || !file) return;
    setError('');
    setSuccess('');
    if (!file.type.startsWith('image/')) {
      setError('Choisissez une photo.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('La photo ne doit pas dépasser 10 Mo.');
      return;
    }

    setUploadingMedia(true);
    let storagePath = '';
    try {
      const normalized = await normalizePhoto(file);
      storagePath = `${organizationId}/${companyId}/${client.id}/${Date.now()}-${crypto.randomUUID()}.${imageExtension(normalized)}`;
      const { error: uploadError } = await supabase.storage.from('beauty-client-media').upload(storagePath, normalized, {
        contentType: normalized.type,
        cacheControl: '3600',
        upsert: false
      });
      if (uploadError) throw uploadError;

      const { error: metadataError } = await supabase.from('beauty_client_media').insert({
        organization_id: organizationId,
        company_id: companyId,
        client_id: client.id,
        media_kind: mediaKind,
        storage_path: storagePath,
        caption: nullable(mediaCaption),
        created_by: userId
      });
      if (metadataError) {
        await supabase.storage.from('beauty-client-media').remove([storagePath]);
        throw metadataError;
      }

      setMediaCaption('');
      setSuccess('Photo ajoutée au dossier privé.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Import de la photo impossible.');
    } finally {
      setUploadingMedia(false);
    }
  }

  async function deleteMedia(item: CrmPayload['media'][number]) {
    if (!supabase || !canManage || !window.confirm('Supprimer cette photo du dossier ?')) return;
    setError('');
    const { error: deleteError } = await supabase.from('beauty_client_media')
      .delete()
      .eq('organization_id', organizationId)
      .eq('company_id', companyId)
      .eq('client_id', client.id)
      .eq('id', item.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await supabase.storage.from('beauty-client-media').remove([item.storage_path]);
    await load();
  }

  const fullName = [client.first_name, client.last_name].filter(Boolean).join(' ');
  const averageFrequency = data?.summary.average_days_between
    ? `~ tous les ${Math.round(data.summary.average_days_between)} jours`
    : 'Pas encore assez de visites';

  return <div className="beauty-crm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="beauty-crm-panel" role="dialog" aria-modal="true" aria-label={`Fiche client pro ${fullName}`}>
      <header className="beauty-crm-header">
        <div className="beauty-crm-identity">
          <span>{client.first_name.slice(0, 1).toUpperCase()}</span>
          <div><small>FICHE CLIENT PRO</small><h2>{fullName}</h2><p>{client.phone || 'Téléphone non renseigné'}{client.email ? ` · ${client.email}` : ''}</p></div>
        </div>
        <div className="beauty-crm-header-actions">
          {publicSlug && <Link to={`/salon/${publicSlug}#reserver`} target="_blank"><Icon name="calendar" size={15}/> Nouveau RDV</Link>}
          <button type="button" onClick={onClose} aria-label="Fermer">×</button>
        </div>
      </header>

      {error && <div className="error-message beauty-crm-message" role="alert">{error}</div>}
      {success && <div className="success-message beauty-crm-message" role="status">{success}</div>}

      {loading || !data ? <div className="beauty-crm-loading"><span className="spinner"/><p>Chargement du dossier client…</p></div> : <div className="beauty-crm-body">
        <section className="beauty-crm-stats">
          <article><small>Visites terminées</small><strong>{data.summary.visit_count}</strong><span>{averageFrequency}</span></article>
          <article><small>Dernière visite</small><strong>{data.summary.last_visit ? dateOnly.format(new Date(data.summary.last_visit)) : '—'}</strong><span>Historique réel</span></article>
          <article><small>Prochain RDV</small><strong>{data.summary.next_appointment ? dateOnly.format(new Date(data.summary.next_appointment)) : 'Aucun'}</strong><span>{data.summary.next_appointment ? new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' }).format(new Date(data.summary.next_appointment)) : 'À reprogrammer'}</span></article>
          <article><small>CA client</small><strong>{currency.format(data.summary.total_spent_cents / 100)}</strong><span>RDV terminés</span></article>
        </section>

        <section className="beauty-crm-section beauty-crm-profile">
          <div className="beauty-crm-section-head"><div><p className="eyebrow">DOSSIER TECHNIQUE</p><h3>Ce qu’il faut savoir avant la prestation</h3></div><Icon name="sparkles" size={20}/></div>
          <form onSubmit={saveProfile}>
            <label>Notes techniques<textarea rows={3} value={profile.technicalNotes} onChange={(event) => setProfile((current) => ({ ...current, technicalNotes: event.target.value }))} placeholder="Formule, couleur, technique utilisée, tailles, habitudes…"/></label>
            <label>Préférences<textarea rows={3} value={profile.preferences} onChange={(event) => setProfile((current) => ({ ...current, preferences: event.target.value }))} placeholder="Style préféré, finition, confort, habitudes…"/></label>
            <label className="warning">Contre-indications / vigilance<textarea rows={3} value={profile.contraindications} onChange={(event) => setProfile((current) => ({ ...current, contraindications: event.target.value }))} placeholder="Allergies déclarées, sensibilités, éléments à vérifier…"/></label>
            <button className="primary-button" type="submit" disabled={savingProfile}>{savingProfile ? 'Enregistrement…' : 'Enregistrer le dossier technique'}</button>
          </form>
        </section>

        <section className="beauty-crm-section">
          <div className="beauty-crm-section-head"><div><p className="eyebrow">PHOTOS PRIVÉES</p><h3>Avant / après & références</h3></div><Icon name="camera" size={20}/></div>
          <div className="beauty-crm-photo-upload">
            <select value={mediaKind} onChange={(event) => setMediaKind(event.target.value as CrmPayload['media'][number]['media_kind'])}>
              <option value="before">Avant</option><option value="after">Après</option><option value="result">Résultat</option><option value="reference">Référence</option>
            </select>
            <input value={mediaCaption} onChange={(event) => setMediaCaption(event.target.value)} placeholder="Légende facultative"/>
            <label className="primary-button"><Icon name="camera" size={15}/>{uploadingMedia ? 'Import…' : 'Ajouter une photo'}<input type="file" accept="image/*" hidden disabled={uploadingMedia} onChange={(event) => { const file = event.target.files?.[0] ?? null; void uploadPhoto(file); event.currentTarget.value=''; }}/></label>
          </div>
          {data.media.length === 0 ? <div className="beauty-crm-empty">Aucune photo dans le dossier.</div> : <div className="beauty-crm-photo-grid">
            {data.media.map((item) => <figure key={item.id}>
              <div>{mediaUrls[item.storage_path] ? <img src={mediaUrls[item.storage_path]} alt=""/> : <span className="spinner"/>}<em>{mediaLabels[item.media_kind]}</em></div>
              <figcaption><strong>{item.caption || mediaLabels[item.media_kind]}</strong><small>{dateOnly.format(new Date(item.captured_at))}</small></figcaption>
              {canManage && <button type="button" onClick={() => void deleteMedia(item)}>Supprimer</button>}
            </figure>)}
          </div>}
        </section>

        <section className="beauty-crm-section">
          <div className="beauty-crm-section-head"><div><p className="eyebrow">CONSENTEMENTS</p><h3>Des choix clairs et horodatés</h3></div><Icon name="check" size={20}/></div>
          <div className="beauty-crm-consents">
            {([
              ['photo_internal','Photos dans le dossier interne','Autoriser la conservation des photos pour le suivi des prestations.'],
              ['photo_marketing','Utilisation des photos en communication','Autoriser l’utilisation avant/après pour la communication de l’enseigne.'],
              ['marketing','Communications commerciales','Autoriser les messages promotionnels et offres.'],
              ['birthday','Anniversaire','Autoriser l’utilisation de la date d’anniversaire pour les attentions et avantages.']
            ] as const).map(([type,title,description]) => {
              const granted = consentMap.get(type) ?? false;
              return <article key={type}><span className={granted ? 'granted' : ''}><Icon name={granted ? 'check' : 'info'} size={15}/></span><div><strong>{title}</strong><small>{description}</small></div><button type="button" disabled={busyConsent===type} className={granted ? 'active' : ''} onClick={() => void recordConsent(type,!granted)}>{busyConsent===type ? '…' : granted ? 'Oui' : 'Non'}</button></article>;
            })}
          </div>
        </section>

        <section className="beauty-crm-section">
          <div className="beauty-crm-section-head"><div><p className="eyebrow">NOTES & SUIVI</p><h3>Journal interne</h3></div><Icon name="message" size={20}/></div>
          <form className="beauty-crm-note-form" onSubmit={addNote}>
            <select value={noteType} onChange={(event) => setNoteType(event.target.value as CrmPayload['notes'][number]['note_type'])}>
              <option value="technical">Technique</option><option value="preference">Préférence</option><option value="warning">À surveiller</option><option value="follow_up">Suivi</option>
            </select>
            <textarea rows={3} value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Ajouter une information au journal…" required/>
            <button className="secondary-button" type="submit" disabled={addingNote || !noteText.trim()}>{addingNote ? 'Ajout…' : 'Ajouter la note'}</button>
          </form>
          {data.notes.length === 0 ? <div className="beauty-crm-empty">Aucune note de suivi.</div> : <div className="beauty-crm-notes">
            {data.notes.map((item) => <article key={item.id} className={item.note_type}><span>{noteLabels[item.note_type]}</span><div><p>{item.note}</p><small>{dateTime.format(new Date(item.created_at))}</small></div>{canManage && <button type="button" onClick={() => void deleteNote(item.id)}>×</button>}</article>)}
          </div>}
        </section>

        <section className="beauty-crm-section">
          <div className="beauty-crm-section-head"><div><p className="eyebrow">HISTORIQUE</p><h3>Timeline des rendez-vous</h3></div><Icon name="clock" size={20}/></div>
          {data.appointments.length === 0 ? <div className="beauty-crm-empty">Aucun rendez-vous enregistré.</div> : <div className="beauty-crm-timeline">
            {data.appointments.map((appointment) => <article key={appointment.id}>
              <span className={appointment.status}/>
              <div><small>{dateTime.format(new Date(appointment.starts_at))}</small><strong>{appointment.service_name}</strong><p>{appointment.staff_name} · {statusLabels[appointment.status] || appointment.status}</p></div>
              <b>{appointment.amount_cents != null ? currency.format(appointment.amount_cents/100) : '—'}</b>
            </article>)}
          </div>}
        </section>
      </div>}
    </aside>
  </div>;
}
