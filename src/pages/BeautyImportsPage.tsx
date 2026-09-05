import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useBeautyEnseigneContext } from '../hooks/useBeautyEnseigneContext';
import {
  appointmentMappingFields,
  autoMapHeaders,
  clientMappingFields,
  durationToMinutes,
  eurosToCents,
  normalizeAppointmentDateTime,
  normalizeBirthDate,
  parseDelimitedText,
  sourceLabel,
  splitFullName,
  type BeautyImportKind,
  type BeautyImportSource,
  type MappingField
} from '../features/beauty/importCsv';
import { supabase } from '../lib/supabase';
import '../beautyImports.css';

type NameOrder = 'first_last' | 'last_first';

interface ClientPreviewItem {
  line: number;
  status: 'ready' | 'duplicate' | 'duplicate_file' | 'possible_duplicate' | 'conflict' | 'invalid';
  reason: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  external_id: string | null;
  matched_client: {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    birth_date?: string | null;
  } | null;
}

interface ClientPreview {
  total_rows: number;
  ready_rows: number;
  duplicate_rows: number;
  possible_duplicate_rows: number;
  conflict_rows: number;
  invalid_rows: number;
  items: ClientPreviewItem[];
}

interface AppointmentPreviewItem {
  line: number;
  status: 'ready' | 'duplicate' | 'unresolved' | 'conflict' | 'invalid';
  reason: string;
  client_name: string;
  service_name: string | null;
  staff_name: string | null;
  site_name: string | null;
  starts_at: string | null;
  duration_minutes: number | null;
  amount_cents: number | null;
  appointment_status: string | null;
}

interface AppointmentPreview {
  total_rows: number;
  ready_rows: number;
  duplicate_rows: number;
  unresolved_rows: number;
  conflict_rows: number;
  invalid_rows: number;
  items: AppointmentPreviewItem[];
}

interface ImportJob {
  id: string;
  import_scope: string | null;
  source_provider: BeautyImportSource | null;
  file_name: string | null;
  status: string;
  total_rows: number;
  inserted_rows: number;
  merged_rows?: number;
  skipped_rows: number;
  error_rows: number;
  errors: Array<{ line?: number; message?: string }>;
  metadata?: { merged?: number; [key: string]: unknown };
  created_at: string;
  completed_at: string | null;
}

interface ImportResult {
  job_id: string;
  status: string;
  total_rows: number;
  inserted_rows: number;
  merged_rows?: number;
  skipped_rows: number;
  error_rows: number;
  errors: Array<{ line?: number; message?: string }>;
}

interface DuplicateClientSummary {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  appointment_count: number;
  completed_count: number;
  spent_cents: number;
  data_score: number;
  created_at: string;
}

interface DuplicateCandidate {
  client_a: DuplicateClientSummary;
  client_b: DuplicateClientSummary;
  email_match: boolean;
  phone_match: boolean;
  name_match: boolean;
  birth_match: boolean;
  match_score: number;
  strength: 'strong' | 'review';
  recommended_keep_id: string;
}

interface DuplicateCandidatesPayload {
  candidate_count: number;
  items: DuplicateCandidate[];
}

interface MergeClientsResult {
  kept_client_id: string;
  merged_client_id: string;
  appointments_moved: number;
  notes_moved: number;
  media_moved: number;
  documents_moved: number;
  consents_moved: number;
  questionnaires_moved: number;
  waitlist_moved: number;
  reviews_moved: number;
  loyalty_rows_moved: number;
  rewards_moved: number;
  portal_accounts_moved: number;
}

const sourceOptions: Array<{ key: BeautyImportSource; label: string; description: string }> = [
  { key: 'planity', label: 'Planity', description: 'Importer un export CSV Planity' },
  { key: 'booksy', label: 'Booksy', description: 'Importer un export CSV Booksy' },
  { key: 'treatwell', label: 'Treatwell', description: 'Importer un export CSV Treatwell' },
  { key: 'csv', label: 'CSV', description: 'Fichier CSV provenant d’un autre logiciel' }
];

const statusLabels: Record<string, string> = {
  ready: 'Prêt',
  duplicate: 'Doublon',
  duplicate_file: 'Doublon fichier',
  possible_duplicate: 'À vérifier',
  conflict: 'Conflit',
  invalid: 'Invalide',
  unresolved: 'Non résolu',
  completed: 'Terminé',
  completed_with_errors: 'Terminé avec erreurs',
  failed: 'Échec',
  processing: 'En cours'
};

function fullName(first: string | null | undefined, last: string | null | undefined) {
  return [first, last].filter(Boolean).join(' ') || 'Client';
}

function getMapped(row: Record<string, string>, mapping: Record<string, string>, key: string) {
  const header = mapping[key];
  return header ? (row[header] ?? '').trim() : '';
}

function prettyDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function jobDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

export function BeautyImportsPage() {
  const { organization } = useOrganization();
  const { demoMode } = useAuth();
  const { beautyMode, selectedEnseigne, selectedEnseigneId, loading: enseigneLoading } = useBeautyEnseigneContext();

  const [source, setSource] = useState<BeautyImportSource>('planity');
  const [kind, setKind] = useState<BeautyImportKind>('clients');
  const [nameOrder, setNameOrder] = useState<NameOrder>('first_last');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Array<Record<string, string>>>([]);
  const [delimiter, setDelimiter] = useState('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [clientPreview, setClientPreview] = useState<ClientPreview | null>(null);
  const [appointmentPreview, setAppointmentPreview] = useState<AppointmentPreview | null>(null);
  const [forceLines, setForceLines] = useState<Set<number>>(new Set());
  const [mergeTargets, setMergeTargets] = useState<Map<number, string>>(new Map());
  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateCandidatesPayload | null>(null);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);
  const [mergingPairKey, setMergingPairKey] = useState('');
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const fields = kind === 'clients' ? clientMappingFields : appointmentMappingFields;

  useEffect(() => {
    setFileName('');
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setClientPreview(null);
    setAppointmentPreview(null);
    setForceLines(new Set());
    setMergeTargets(new Map());
    setDuplicateCandidates(null);
    setMergingPairKey('');
    setError('');
    setSuccess('');
  }, [selectedEnseigneId, kind]);

  async function loadJobs() {
    if (!organization || !selectedEnseigneId || !canManage || demoMode || !supabase) {
      setJobs([]);
      return;
    }
    setLoadingJobs(true);
    const { data, error: requestError } = await supabase.rpc('beauty_list_import_jobs', {
      p_organization_id: organization.id,
      p_company_id: selectedEnseigneId
    });
    if (!requestError) setJobs(Array.isArray(data) ? data as ImportJob[] : []);
    setLoadingJobs(false);
  }

  useEffect(() => {
    void loadJobs();
  }, [organization?.id, selectedEnseigneId, canManage, demoMode]);

  async function scanExistingDuplicates() {
    if (!organization || !selectedEnseigneId || !canManage || demoMode || !supabase) {
      setDuplicateCandidates(null);
      return;
    }

    setLoadingDuplicates(true);
    setError('');
    const { data, error: requestError } = await supabase.rpc('beauty_client_duplicate_candidates', {
      p_organization_id: organization.id,
      p_company_id: selectedEnseigneId
    });

    if (requestError) {
      setError(requestError.message);
      setDuplicateCandidates(null);
    } else {
      setDuplicateCandidates((data ?? { candidate_count: 0, items: [] }) as DuplicateCandidatesPayload);
    }
    setLoadingDuplicates(false);
  }

  async function mergeExistingPair(candidate: DuplicateCandidate, keepId: string) {
    if (!organization || !selectedEnseigneId || !supabase) return;
    const keep = candidate.client_a.id === keepId ? candidate.client_a : candidate.client_b;
    const merge = candidate.client_a.id === keepId ? candidate.client_b : candidate.client_a;
    const pairKey = [candidate.client_a.id, candidate.client_b.id].sort().join(':');

    const accepted = window.confirm(
      `Fusionner définitivement « ${fullName(merge.first_name, merge.last_name)} » dans « ${fullName(keep.first_name, keep.last_name)} » ?\n\nLa fiche conservée garde ses coordonnées déjà renseignées. Les rendez-vous, notes, médias, documents, consentements, fidélité et autres historiques de l’ancienne fiche seront rattachés à la fiche conservée.\n\nL’ancienne fiche sera ensuite supprimée.`
    );
    if (!accepted) return;

    setMergingPairKey(pairKey);
    setError('');
    setSuccess('');

    const { data, error: requestError } = await supabase.rpc('beauty_merge_clients', {
      p_organization_id: organization.id,
      p_company_id: selectedEnseigneId,
      p_keep_client_id: keep.id,
      p_merge_client_id: merge.id
    });

    if (requestError) {
      setError(requestError.message);
    } else {
      const result = data as MergeClientsResult;
      setSuccess(
        `Fusion terminée : ${fullName(merge.first_name, merge.last_name)} a été regroupé dans ${fullName(keep.first_name, keep.last_name)} · ${result.appointments_moved} RDV déplacé${result.appointments_moved > 1 ? 's' : ''}.`
      );
      setClientPreview(null);
      setAppointmentPreview(null);
      setForceLines(new Set());
      setMergeTargets(new Map());
      await scanExistingDuplicates();
    }
    setMergingPairKey('');
  }

  function clearPreview() {
    setClientPreview(null);
    setAppointmentPreview(null);
    setForceLines(new Set());
    setMergeTargets(new Map());
    setSuccess('');
  }

  async function handleFile(file: File | null) {
    clearPreview();
    setError('');
    if (!file) return;

    if (!/\.(csv|txt)$/i.test(file.name)) {
      setError('Utilisez un export CSV ou TXT. Si votre logiciel fournit un fichier Excel, exportez-le d’abord au format CSV.');
      return;
    }

    try {
      const parsed = parseDelimitedText(await file.text());
      if (parsed.rows.length > 5000) {
        setError('Le fichier contient plus de 5 000 lignes. Découpez-le en plusieurs imports.');
        return;
      }
      setFileName(file.name);
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);
      setDelimiter(parsed.delimiter);
      setMapping(autoMapHeaders(parsed.headers, fields));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de lire le fichier.');
    }
  }

  function mappedClientRows(includeForce = false) {
    return rawRows.map((row, index) => {
      let firstName = getMapped(row, mapping, 'first_name');
      let lastName = getMapped(row, mapping, 'last_name');
      const full = getMapped(row, mapping, 'full_name');
      if ((!firstName || !lastName) && full) {
        const split = splitFullName(full, nameOrder);
        if (!firstName) firstName = split.firstName;
        if (!lastName) lastName = split.lastName;
      }

      return {
        external_id: getMapped(row, mapping, 'external_id') || null,
        first_name: firstName,
        last_name: lastName || null,
        email: getMapped(row, mapping, 'email') || null,
        phone: getMapped(row, mapping, 'phone') || null,
        birth_date: normalizeBirthDate(getMapped(row, mapping, 'birth_date')) || null,
        notes: getMapped(row, mapping, 'notes') || null,
        force_import: includeForce && forceLines.has(index + 2),
        merge_target_id: includeForce ? (mergeTargets.get(index + 2) ?? null) : null
      };
    });
  }

  function mappedAppointmentRows() {
    return rawRows.map((row) => {
      let firstName = getMapped(row, mapping, 'client_first_name');
      let lastName = getMapped(row, mapping, 'client_last_name');
      const full = getMapped(row, mapping, 'client_full_name');
      if ((!firstName || !lastName) && full) {
        const split = splitFullName(full, nameOrder);
        if (!firstName) firstName = split.firstName;
        if (!lastName) lastName = split.lastName;
      }

      return {
        external_id: getMapped(row, mapping, 'external_id') || null,
        client_first_name: firstName || null,
        client_last_name: lastName || null,
        client_email: getMapped(row, mapping, 'client_email') || null,
        client_phone: getMapped(row, mapping, 'client_phone') || null,
        service_name: getMapped(row, mapping, 'service_name') || null,
        staff_name: getMapped(row, mapping, 'staff_name') || null,
        site_name: getMapped(row, mapping, 'site_name') || null,
        starts_at: normalizeAppointmentDateTime(
          getMapped(row, mapping, 'starts_at'),
          getMapped(row, mapping, 'appointment_date'),
          getMapped(row, mapping, 'appointment_time')
        ) || null,
        duration_minutes: durationToMinutes(getMapped(row, mapping, 'duration_minutes')) || null,
        amount_cents: getMapped(row, mapping, 'amount_euros')
          ? String(eurosToCents(getMapped(row, mapping, 'amount_euros')))
          : null,
        status: getMapped(row, mapping, 'status') || null,
        notes: getMapped(row, mapping, 'notes') || null
      };
    });
  }

  const mappingIssue = useMemo(() => {
    if (headers.length === 0) return '';
    if (kind === 'clients') {
      if (!mapping.first_name && !mapping.full_name) return 'Associez au minimum une colonne Prénom ou Nom complet.';
      return '';
    }
    if (!mapping.service_name) return 'Associez la colonne Prestation.';
    if (!mapping.starts_at && !(mapping.appointment_date && mapping.appointment_time)) {
      return 'Associez Date + heure, ou bien les colonnes Date du RDV et Heure du RDV.';
    }
    if (!mapping.client_email && !mapping.client_phone && !mapping.client_full_name && !mapping.client_first_name) {
      return 'Associez au moins une information permettant d’identifier le client.';
    }
    return '';
  }, [headers, kind, mapping]);

  async function runPreview() {
    if (!organization || !selectedEnseigneId || !supabase || mappingIssue) return;
    setLoadingPreview(true);
    setError('');
    setSuccess('');
    setForceLines(new Set());
    setMergeTargets(new Map());

    const functionName = kind === 'clients'
      ? 'beauty_preview_client_import'
      : 'beauty_preview_appointment_import';

    const rows = kind === 'clients' ? mappedClientRows(false) : mappedAppointmentRows();
    const { data, error: requestError } = await supabase.rpc(functionName, {
      p_organization_id: organization.id,
      p_company_id: selectedEnseigneId,
      p_source_provider: source,
      p_rows: rows
    });

    if (requestError) {
      setError(requestError.message);
    } else if (kind === 'clients') {
      setClientPreview(data as ClientPreview);
      setAppointmentPreview(null);
    } else {
      setAppointmentPreview(data as AppointmentPreview);
      setClientPreview(null);
    }
    setLoadingPreview(false);
  }

  async function runImport() {
    if (!organization || !selectedEnseigneId || !supabase || !fileName) return;

    const preview = kind === 'clients' ? clientPreview : appointmentPreview;
    if (!preview) return;

    const forced = kind === 'clients' ? forceLines.size : 0;
    const merged = kind === 'clients' ? mergeTargets.size : 0;
    const ready = preview.ready_rows + forced;
    const actionable = ready + merged;
    if (actionable <= 0) {
      setError('Aucune ligne prête à créer ou à compléter.');
      return;
    }

    const accepted = window.confirm(
      kind === 'clients'
        ? `Valider l’import dans « ${selectedEnseigne?.name ?? 'cette enseigne'} » ?\n\n${ready} fiche${ready > 1 ? 's' : ''} à créer · ${merged} fiche${merged > 1 ? 's' : ''} existante${merged > 1 ? 's' : ''} à compléter.\n\nLes lignes laissées sur « Ignorer » et les conflits resteront inchangés.`
        : `Importer maintenant ${ready} ligne${ready > 1 ? 's' : ''} dans « ${selectedEnseigne?.name ?? 'cette enseigne'} » ?\n\nLes doublons sûrs seront ignorés et les lignes en conflit resteront non importées.`
    );
    if (!accepted) return;

    setImporting(true);
    setError('');
    setSuccess('');

    const functionName = kind === 'clients' ? 'beauty_import_clients' : 'beauty_import_appointments';
    const rows = kind === 'clients' ? mappedClientRows(true) : mappedAppointmentRows();
    const { data, error: requestError } = await supabase.rpc(functionName, {
      p_organization_id: organization.id,
      p_company_id: selectedEnseigneId,
      p_source_provider: source,
      p_file_name: fileName,
      p_rows: rows
    });

    if (requestError) {
      setError(requestError.message);
    } else {
      const result = data as ImportResult;
      setSuccess(
        kind === 'clients'
          ? `Import terminé : ${result.inserted_rows} créée${result.inserted_rows > 1 ? 's' : ''}, ${result.merged_rows ?? 0} complétée${(result.merged_rows ?? 0) > 1 ? 's' : ''}, ${result.skipped_rows} ignorée${result.skipped_rows > 1 ? 's' : ''}, ${result.error_rows} erreur${result.error_rows > 1 ? 's' : ''}.`
          : `Import terminé : ${result.inserted_rows} ajoutée${result.inserted_rows > 1 ? 's' : ''}, ${result.skipped_rows} ignorée${result.skipped_rows > 1 ? 's' : ''}, ${result.error_rows} erreur${result.error_rows > 1 ? 's' : ''}.`
      );
      await loadJobs();
      await runPreview();
    }
    setImporting(false);
  }

  function chooseClientResolution(line: number, action: 'ignore' | 'merge' | 'create', targetId?: string) {
    setForceLines((current) => {
      const next = new Set(current);
      if (action === 'create') next.add(line);
      else next.delete(line);
      return next;
    });
    setMergeTargets((current) => {
      const next = new Map(current);
      if (action === 'merge' && targetId) next.set(line, targetId);
      else next.delete(line);
      return next;
    });
  }

  if (!organization) return null;
  if (!beautyMode) return <div className="page"><div className="info-message page-message">Les imports avancés sont disponibles dans l’environnement Coiffure & beauté Métier.</div></div>;
  if (!canManage) return <div className="page"><div className="error-message page-message">Les imports sont réservés aux propriétaires, administrateurs et responsables autorisés.</div></div>;

  const preview = kind === 'clients' ? clientPreview : appointmentPreview;
  const readyCount = preview?.ready_rows ?? 0;
  const clientCreateCount = (clientPreview?.ready_rows ?? 0) + forceLines.size;
  const clientMergeCount = mergeTargets.size;
  const clientActionCount = clientCreateCount + clientMergeCount;

  return <div className="page beauty-imports-page">
    <header className="page-header beauty-imports-header">
      <div>
        <p className="eyebrow">MIGRATION DE DONNÉES</p>
        <h1>Imports & dédoublonnage</h1>
        <p>{selectedEnseigne
          ? `Importez vos données dans ${selectedEnseigne.name}, sans mélanger les autres enseignes.`
          : 'Sélectionnez une enseigne Beauty.'}</p>
      </div>
    </header>

    {demoMode && <div className="info-message page-message">Les imports utilisent les données réelles Supabase et sont désactivés en mode démonstration.</div>}
    {!selectedEnseigneId && !enseigneLoading && <div className="info-message page-message">Aucune enseigne Beauty sélectionnée.</div>}
    {error && <div className="error-message page-message" role="alert">{error}</div>}
    {success && <div className="success-message page-message">{success}</div>}

    <section className="panel beauty-import-safety">
      <span><Icon name="shield" size={19}/></span>
      <div>
        <strong>Import sécurisé par défaut</strong>
        <p>Les doublons sont contrôlés avant import. Vous pouvez compléter une fiche existante sans écraser ses données, créer une nouvelle fiche uniquement lorsqu’il n’y a pas de doublon e-mail/téléphone, et les conflits restent bloqués. Les consentements marketing ne sont jamais activés automatiquement.</p>
      </div>
    </section>

    <section className="panel beauty-import-source-panel">
      <div className="panel-header">
        <div><p className="eyebrow">1 · SOURCE</p><h2>D’où viennent les données ?</h2></div>
      </div>
      <div className="beauty-import-source-grid">
        {sourceOptions.map((option) => <button
          type="button"
          key={option.key}
          className={source === option.key ? 'active' : ''}
          onClick={() => { setSource(option.key); clearPreview(); }}
        >
          <span>{option.label.slice(0, 1)}</span>
          <div><strong>{option.label}</strong><small>{option.description}</small></div>
          {source === option.key && <Icon name="check" size={15}/>}
        </button>)}
      </div>
    </section>

    <section className="panel beauty-import-file-panel">
      <div className="panel-header">
        <div><p className="eyebrow">2 · CONTENU</p><h2>Que voulez-vous importer ?</h2></div>
      </div>

      <div className="beauty-import-kind-tabs">
        <button type="button" className={kind === 'clients' ? 'active' : ''} onClick={() => setKind('clients')}>
          <Icon name="users" size={16}/> Clients
        </button>
        <button type="button" className={kind === 'appointments' ? 'active' : ''} onClick={() => setKind('appointments')}>
          <Icon name="calendar" size={16}/> Rendez-vous
        </button>
      </div>

      <label className="beauty-import-dropzone">
        <Icon name="file" size={28}/>
        <strong>{fileName || `Choisir un export CSV ${sourceLabel(source)}`}</strong>
        <span>{fileName ? `${rawRows.length} ligne${rawRows.length > 1 ? 's' : ''} · séparateur ${delimiter === '\t' ? 'tabulation' : delimiter}` : 'CSV ou TXT · maximum 5 000 lignes par import'}</span>
        <input
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          disabled={demoMode || !selectedEnseigneId}
          onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
        />
      </label>
    </section>

    {headers.length > 0 && <section className="panel beauty-import-mapping-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">3 · CORRESPONDANCE</p>
          <h2>Vérifiez les colonnes</h2>
          <small>NCR Suite propose une correspondance automatique. Modifiez seulement ce qui ne correspond pas à votre fichier.</small>
        </div>
      </div>

      <div className="beauty-import-mapping-grid">
        {fields.map((field: MappingField) => <label key={field.key}>
          <span>{field.label}{field.required ? ' *' : ''}</span>
          <select
            value={mapping[field.key] ?? ''}
            onChange={(event) => {
              setMapping((current) => ({ ...current, [field.key]: event.target.value }));
              clearPreview();
            }}
          >
            <option value="">Non mappé</option>
            {headers.map((header) => <option value={header} key={header}>{header}</option>)}
          </select>
        </label>)}
      </div>

      {(mapping.full_name || mapping.client_full_name) && <div className="beauty-import-name-order">
        <span>Format du nom complet :</span>
        <button type="button" className={nameOrder === 'first_last' ? 'active' : ''} onClick={() => { setNameOrder('first_last'); clearPreview(); }}>Prénom Nom</button>
        <button type="button" className={nameOrder === 'last_first' ? 'active' : ''} onClick={() => { setNameOrder('last_first'); clearPreview(); }}>Nom Prénom</button>
      </div>}

      {mappingIssue && <div className="beauty-import-inline-warning"><Icon name="alert" size={14}/>{mappingIssue}</div>}

      <div className="beauty-import-actions">
        <button type="button" className="primary-button" disabled={Boolean(mappingIssue) || loadingPreview} onClick={() => void runPreview()}>
          <Icon name="eye" size={16}/>{loadingPreview ? 'Analyse…' : 'Prévisualiser l’import'}
        </button>
      </div>
    </section>}

    {clientPreview && <section className="panel beauty-import-preview-panel">
      <div className="panel-header">
        <div><p className="eyebrow">4 · PRÉFLIGHT CLIENTS</p><h2>Avant l’import</h2><small>Aucune donnée n’a encore été modifiée.</small></div>
      </div>

      <div className="beauty-import-preview-kpis">
        <div className="ready"><span>Prêtes</span><strong>{clientPreview.ready_rows}</strong></div>
        <div><span>Doublons</span><strong>{clientPreview.duplicate_rows}</strong></div>
        <div className="warning"><span>À vérifier</span><strong>{clientPreview.possible_duplicate_rows}</strong></div>
        <div className="danger"><span>Conflits / invalides</span><strong>{clientPreview.conflict_rows + clientPreview.invalid_rows}</strong></div>
      </div>

      <div className="beauty-import-preview-list">
        {clientPreview.items.slice(0, 200).map((item) => <article key={item.line} className={`status-${item.status}`}>
          <span className="beauty-import-line">L{item.line}</span>
          <div className="beauty-import-preview-main">
            <div><strong>{fullName(item.first_name, item.last_name)}</strong><em>{statusLabels[item.status] ?? item.status}</em></div>
            <small>{[item.email, item.phone].filter(Boolean).join(' · ') || 'Aucun contact'}</small>
            <p>{item.reason}</p>
            {item.matched_client && <span className="beauty-import-existing">Existant : {fullName(item.matched_client.first_name, item.matched_client.last_name)} · {item.matched_client.email || item.matched_client.phone || 'sans contact'}</span>}
          </div>
          {item.matched_client && ['duplicate', 'possible_duplicate'].includes(item.status) && <div className="beauty-import-resolution">
            <button
              type="button"
              className={!mergeTargets.has(item.line) && !forceLines.has(item.line) ? 'active' : ''}
              onClick={() => chooseClientResolution(item.line, 'ignore')}
            >Ignorer</button>
            <button
              type="button"
              className={mergeTargets.has(item.line) ? 'active merge' : 'merge'}
              onClick={() => chooseClientResolution(item.line, 'merge', item.matched_client!.id)}
            >Compléter l’existante</button>
            {item.status === 'possible_duplicate' && <button
              type="button"
              className={forceLines.has(item.line) ? 'active create' : 'create'}
              onClick={() => chooseClientResolution(item.line, 'create')}
            >Créer nouvelle</button>}
          </div>}
        </article>)}
      </div>
      {clientPreview.items.length > 200 && <p className="beauty-import-limit-note">Aperçu limité aux 200 premières lignes. Les {clientPreview.total_rows} lignes seront contrôlées côté serveur.</p>}

      <div className="beauty-import-final-action">
        <div>
          <strong>{clientCreateCount} à créer · {clientMergeCount} à compléter</strong>
          <small>Les fiches complétées conservent toujours leurs données NCR Suite existantes.</small>
        </div>
        <button type="button" className="primary-button" disabled={importing || clientActionCount === 0} onClick={() => void runImport()}>
          <Icon name="check" size={16}/>{importing ? 'Import en cours…' : 'Valider les décisions'}
        </button>
      </div>
    </section>}

    {appointmentPreview && <section className="panel beauty-import-preview-panel">
      <div className="panel-header">
        <div><p className="eyebrow">4 · PRÉFLIGHT RENDEZ-VOUS</p><h2>Correspondances historiques</h2><small>Les lignes non résolues ne seront pas créées.</small></div>
      </div>

      <div className="beauty-import-preview-kpis">
        <div className="ready"><span>Prêts</span><strong>{appointmentPreview.ready_rows}</strong></div>
        <div><span>Doublons</span><strong>{appointmentPreview.duplicate_rows}</strong></div>
        <div className="warning"><span>Non résolus</span><strong>{appointmentPreview.unresolved_rows}</strong></div>
        <div className="danger"><span>Conflits / invalides</span><strong>{appointmentPreview.conflict_rows + appointmentPreview.invalid_rows}</strong></div>
      </div>

      <div className="beauty-import-preview-list">
        {appointmentPreview.items.slice(0, 200).map((item) => <article key={item.line} className={`status-${item.status}`}>
          <span className="beauty-import-line">L{item.line}</span>
          <div className="beauty-import-preview-main">
            <div><strong>{item.client_name || 'Client non identifié'}</strong><em>{statusLabels[item.status] ?? item.status}</em></div>
            <small>{item.service_name || 'Prestation inconnue'} · {item.staff_name || 'Collaborateur à résoudre'} · {item.site_name || 'Établissement automatique'}</small>
            <p>{prettyDate(item.starts_at)} · {item.duration_minutes ?? '—'} min · {item.amount_cents === null ? '—' : (item.amount_cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
            <span className="beauty-import-existing">{item.reason}</span>
          </div>
        </article>)}
      </div>

      <div className="beauty-import-history-note">
        <Icon name="info" size={14}/>
        <span>Les rendez-vous importés conservent leur historique pour le CRM, les statistiques et la comptabilité, mais ne déclenchent ni notification, ni e-mail, ni crédit fidélité, ni consommation de stock rétroactive.</span>
      </div>

      <div className="beauty-import-final-action">
        <div><strong>{readyCount} rendez-vous à créer</strong><small>Les doublons sont ignorés et les conflits restent hors import.</small></div>
        <button type="button" className="primary-button" disabled={importing || readyCount === 0} onClick={() => void runImport()}>
          <Icon name="check" size={16}/>{importing ? 'Import en cours…' : 'Lancer l’import'}
        </button>
      </div>
    </section>}

    <section className="panel beauty-import-dedupe-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">DÉDOUBLONNAGE DE LA BASE</p>
          <h2>Doublons déjà présents</h2>
          <small>NCR Suite recherche les fiches qui partagent le même e-mail, le même téléphone ou exactement le même prénom + nom. Aucune fusion n’est automatique.</small>
        </div>
        <button
          type="button"
          className="secondary-button compact-button"
          disabled={loadingDuplicates || demoMode || !selectedEnseigneId}
          onClick={() => void scanExistingDuplicates()}
        >
          <Icon name="search" size={14}/>{loadingDuplicates ? 'Analyse…' : duplicateCandidates ? 'Réanalyser' : 'Analyser la base'}
        </button>
      </div>

      {!duplicateCandidates ? <div className="beauty-import-dedupe-empty">
        <Icon name="users" size={22}/>
        <div><strong>Analyse à la demande</strong><span>L’outil ne modifie rien tant que vous ne validez pas explicitement une fusion.</span></div>
      </div> : duplicateCandidates.items.length === 0 ? <div className="beauty-import-dedupe-clean">
        <Icon name="check" size={18}/>
        <div><strong>Aucun doublon détecté</strong><span>Aucune paire de clientes actives ne partage actuellement un signal de doublon dans cette enseigne.</span></div>
      </div> : <>
        <div className="beauty-import-dedupe-summary">
          <strong>{duplicateCandidates.candidate_count} paire{duplicateCandidates.candidate_count > 1 ? 's' : ''} à vérifier</strong>
          <span>Les correspondances e-mail/téléphone sont signalées comme fortes. Un même nom seul nécessite davantage de vigilance.</span>
        </div>

        <div className="beauty-import-dedupe-list">
          {duplicateCandidates.items.map((candidate) => {
            const pairKey = [candidate.client_a.id, candidate.client_b.id].sort().join(':');
            const busy = mergingPairKey === pairKey;
            const clientCard = (client: DuplicateClientSummary) => <div className={`beauty-import-dedupe-client${candidate.recommended_keep_id === client.id ? ' recommended' : ''}`}>
              <div className="beauty-import-dedupe-client-head">
                <strong>{fullName(client.first_name, client.last_name)}</strong>
                {candidate.recommended_keep_id === client.id && <em>Recommandée</em>}
              </div>
              <span>{client.email || 'E-mail non renseigné'}</span>
              <span>{client.phone || 'Téléphone non renseigné'}</span>
              <div className="beauty-import-dedupe-metrics">
                <small><b>{client.appointment_count}</b> RDV</small>
                <small><b>{client.completed_count}</b> terminés</small>
                <small><b>{(client.spent_cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</b> réalisé</small>
              </div>
              <button
                type="button"
                className={candidate.recommended_keep_id === client.id ? 'primary-button compact-button' : 'secondary-button compact-button'}
                disabled={busy}
                onClick={() => void mergeExistingPair(candidate, client.id)}
              >
                {busy ? 'Fusion…' : 'Conserver cette fiche'}
              </button>
            </div>;

            return <article key={pairKey} className={`beauty-import-dedupe-pair ${candidate.strength}`}>
              <div className="beauty-import-dedupe-signals">
                <span className={candidate.strength === 'strong' ? 'strong' : 'review'}>{candidate.strength === 'strong' ? 'Correspondance forte' : 'À vérifier'}</span>
                {candidate.email_match && <span>E-mail identique</span>}
                {candidate.phone_match && <span>Téléphone identique</span>}
                {candidate.name_match && <span>Nom identique</span>}
                {candidate.birth_match && <span>Naissance identique</span>}
              </div>
              <div className="beauty-import-dedupe-clients">
                {clientCard(candidate.client_a)}
                <div className="beauty-import-dedupe-versus"><Icon name="refresh" size={15}/><span>fusionner</span></div>
                {clientCard(candidate.client_b)}
              </div>
            </article>;
          })}
        </div>

        <div className="beauty-import-history-note">
          <Icon name="shield" size={14}/>
          <span>La fusion déplace l’historique complet vers la fiche conservée. Les coordonnées déjà présentes sur la fiche conservée ont priorité. Les cas de parrainage ambigus sont bloqués automatiquement par la base.</span>
        </div>
      </>}
    </section>

    <section className="panel beauty-import-jobs-panel">
      <div className="panel-header">
        <div><p className="eyebrow">HISTORIQUE</p><h2>Imports de l’enseigne</h2><small>Les autres enseignes restent invisibles dans cet historique.</small></div>
        <button type="button" className="secondary-button compact-button" onClick={() => void loadJobs()} disabled={loadingJobs}><Icon name="refresh" size={14}/> Actualiser</button>
      </div>

      {loadingJobs ? <div className="list-state">Chargement de l’historique…</div> : jobs.length === 0 ? <div className="list-state">Aucun import Beauty pour cette enseigne.</div> : <div className="beauty-import-jobs">
        {jobs.map((job) => <article key={job.id}>
          <span className="beauty-import-job-icon"><Icon name={job.import_scope === 'beauty_appointments' ? 'calendar' : 'users'} size={16}/></span>
          <div>
            <strong>{job.import_scope === 'beauty_appointments' ? 'Rendez-vous' : 'Clients'} · {sourceLabel(job.source_provider ?? 'csv')}</strong>
            <small>{job.file_name || 'Fichier sans nom'} · {jobDate(job.created_at)}</small>
          </div>
          <div className="beauty-import-job-counts">
            <span>{job.inserted_rows} ajoutés</span>
            {(job.metadata?.merged ?? 0) > 0 && <span className="merged">{job.metadata?.merged} complétés</span>}
            <span>{job.skipped_rows} ignorés</span>
            {job.error_rows > 0 && <span className="error">{job.error_rows} erreurs</span>}
          </div>
          <em className={`status-${job.status}`}>{statusLabels[job.status] ?? job.status}</em>
        </article>)}
      </div>}
    </section>
  </div>;
}
