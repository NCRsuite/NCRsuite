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
  skipped_rows: number;
  error_rows: number;
  errors: Array<{ line?: number; message?: string }>;
  created_at: string;
  completed_at: string | null;
}

interface ImportResult {
  job_id: string;
  status: string;
  total_rows: number;
  inserted_rows: number;
  skipped_rows: number;
  error_rows: number;
  errors: Array<{ line?: number; message?: string }>;
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

  function clearPreview() {
    setClientPreview(null);
    setAppointmentPreview(null);
    setForceLines(new Set());
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
        force_import: includeForce && forceLines.has(index + 2)
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
        amount_cents: String(eurosToCents(getMapped(row, mapping, 'amount_euros'))),
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
    const ready = preview.ready_rows + forced;
    if (ready <= 0) {
      setError('Aucune ligne prête à importer.');
      return;
    }

    const accepted = window.confirm(
      `Importer maintenant ${ready} ligne${ready > 1 ? 's' : ''} dans « ${selectedEnseigne?.name ?? 'cette enseigne'} » ?\n\nLes doublons sûrs seront ignorés et les lignes en conflit resteront non importées.`
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
        `Import terminé : ${result.inserted_rows} ajoutée${result.inserted_rows > 1 ? 's' : ''}, ${result.skipped_rows} ignorée${result.skipped_rows > 1 ? 's' : ''}, ${result.error_rows} erreur${result.error_rows > 1 ? 's' : ''}.`
      );
      await loadJobs();
      await runPreview();
    }
    setImporting(false);
  }

  function toggleForce(line: number) {
    setForceLines((current) => {
      const next = new Set(current);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  }

  if (!organization) return null;
  if (!beautyMode) return <div className="page"><div className="info-message page-message">Les imports avancés sont disponibles dans l’environnement Coiffure & beauté Métier.</div></div>;
  if (!canManage) return <div className="page"><div className="error-message page-message">Les imports sont réservés aux propriétaires, administrateurs et responsables autorisés.</div></div>;

  const preview = kind === 'clients' ? clientPreview : appointmentPreview;
  const readyCount = preview?.ready_rows ?? 0;

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
        <p>Les doublons e-mail/téléphone sont ignorés, les conflits sont bloqués et les consentements marketing ne sont jamais activés automatiquement par un fichier importé.</p>
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
          {item.status === 'possible_duplicate' && <label className="beauty-import-force">
            <input type="checkbox" checked={forceLines.has(item.line)} onChange={() => toggleForce(item.line)}/>
            Importer quand même
          </label>}
        </article>)}
      </div>
      {clientPreview.items.length > 200 && <p className="beauty-import-limit-note">Aperçu limité aux 200 premières lignes. Les {clientPreview.total_rows} lignes seront contrôlées côté serveur.</p>}

      <div className="beauty-import-final-action">
        <div><strong>{clientPreview.ready_rows + forceLines.size} cliente{clientPreview.ready_rows + forceLines.size > 1 ? 's' : ''} à créer</strong><small>Les doublons sûrs seront ignorés.</small></div>
        <button type="button" className="primary-button" disabled={importing || clientPreview.ready_rows + forceLines.size === 0} onClick={() => void runImport()}>
          <Icon name="check" size={16}/>{importing ? 'Import en cours…' : 'Lancer l’import'}
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
            <span>{job.skipped_rows} ignorés</span>
            {job.error_rows > 0 && <span className="error">{job.error_rows} erreurs</span>}
          </div>
          <em className={`status-${job.status}`}>{statusLabels[job.status] ?? job.status}</em>
        </article>)}
      </div>}
    </section>
  </div>;
}
