import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { businessPacks } from '../config/businessPacks';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import type { BusinessType, IconName } from '../types';

type LaunchStep = {
  key: string;
  label: string;
  description: string;
  completed: boolean;
  path: string;
  icon: IconName;
  manual?: boolean;
};

type LaunchOverview = {
  organization_id: string;
  business_type: BusinessType;
  onboarding_status: string;
  progress: number;
  completed_steps: number;
  total_steps: number;
  import_count: number;
  steps: LaunchStep[];
};

type ImportJob = {
  id: string;
  import_type: string;
  file_name: string | null;
  status: 'processing' | 'completed' | 'completed_with_errors' | 'failed';
  total_rows: number;
  inserted_rows: number;
  skipped_rows: number;
  error_rows: number;
  errors: Array<{ line?: number; message?: string }>;
  created_at: string;
  completed_at: string | null;
};

type ImportResult = {
  job_id: string;
  status: ImportJob['status'];
  total_rows: number;
  inserted_rows: number;
  skipped_rows: number;
  error_rows: number;
  errors: Array<{ line?: number; message?: string }>;
};

type ImportDefinition = {
  key: string;
  label: string;
  description: string;
  headers: string[];
  example: Record<string, string | number>;
};

const importsByBusiness: Record<BusinessType, ImportDefinition[]> = {
  coiffure: [
    { key: 'coiffure_clients', label: 'Clients', description: 'Coordonnées et notes clients.', headers: ['first_name','last_name','email','phone','notes'], example: { first_name: 'Camille', last_name: 'Martin', email: 'camille@example.fr', phone: '0600000000', notes: 'Cliente régulière' } },
    { key: 'coiffure_staff', label: 'Collaborateurs', description: 'Équipe du salon et couleur planning.', headers: ['display_name','email','phone','color'], example: { display_name: 'Lina', email: 'lina@example.fr', phone: '0600000000', color: '#C46A45' } },
    { key: 'coiffure_services', label: 'Prestations', description: 'Durée et prix des prestations.', headers: ['name','description','duration_minutes','price_euros'], example: { name: 'Coupe femme', description: 'Shampoing, coupe et coiffage', duration_minutes: 45, price_euros: '42,00' } }
  ],
  formation: [
    { key: 'training_trainees', label: 'Stagiaires', description: 'Identité, entreprise et coordonnées.', headers: ['first_name','last_name','email','phone','company','notes'], example: { first_name: 'Enzo', last_name: 'Dumas', email: 'enzo@example.fr', phone: '0600000000', company: 'Entreprise Exemple', notes: '' } },
    { key: 'training_trainers', label: 'Formateurs', description: 'Formateurs et spécialités séparées par ;', headers: ['first_name','last_name','email','phone','specialties','notes'], example: { first_name: 'Sarah', last_name: 'Durand', email: 'sarah@example.fr', phone: '0600000000', specialties: 'SST;Bureautique', notes: '' } },
    { key: 'training_programs', label: 'Programmes', description: 'Catalogue initial de formations.', headers: ['title','code','duration_hours','modality','objectives','description'], example: { title: 'Acteur SST', code: 'SST-01', duration_hours: 14, modality: 'presentiel', objectives: 'Intervenir face à un accident', description: 'Formation initiale SST' } }
  ],
  securite: [
    { key: 'security_clients', label: 'Clients', description: 'Entreprises clientes et facturation.', headers: ['company_name','contact_name','email','phone','billing_address','postal_code','city','siret','notes'], example: { company_name: 'Centre commercial Azur', contact_name: 'Mme Martin', email: 'contact@example.fr', phone: '0494000000', billing_address: '1 avenue Exemple', postal_code: '83600', city: 'Fréjus', siret: '12345678900000', notes: '' } },
    { key: 'security_agents', label: 'Agents', description: 'Agents, contrats et volumes horaires.', headers: ['first_name','last_name','employee_number','email','phone','contract_type','weekly_hours','notes'], example: { first_name: 'Nassim', last_name: 'Benali', employee_number: 'AG-001', email: 'nassim@example.fr', phone: '0600000000', contract_type: 'cdi', weekly_hours: 35, notes: '' } },
    { key: 'security_sites', label: 'Sites', description: 'À importer après les clients.', headers: ['client_company','name','code','address','postal_code','city','contact_name','contact_phone','hourly_rate_euros'], example: { client_company: 'Centre commercial Azur', name: 'Galerie principale', code: 'AZUR-01', address: '1 avenue Exemple', postal_code: '83600', city: 'Fréjus', contact_name: 'PC sécurité', contact_phone: '0494000000', hourly_rate_euros: '24,50' } }
  ],
  nettoyage: [
    { key: 'cleaning_clients', label: 'Clients', description: 'Entreprises clientes et contacts.', headers: ['company_name','contact_name','email','phone','billing_address','postal_code','city','notes'], example: { company_name: 'Résidence Horizon', contact_name: 'Syndic Exemple', email: 'syndic@example.fr', phone: '0494000000', billing_address: '10 rue Exemple', postal_code: '83700', city: 'Saint-Raphaël', notes: '' } },
    { key: 'cleaning_agents', label: 'Agents', description: 'Agents, contrats et compétences séparées par ;', headers: ['first_name','last_name','employee_number','email','phone','contract_type','weekly_hours','skills'], example: { first_name: 'Léa', last_name: 'Robert', employee_number: 'NET-001', email: 'lea@example.fr', phone: '0600000000', contract_type: 'cdi', weekly_hours: 35, skills: 'Vitres;Monobrosse' } },
    { key: 'cleaning_sites', label: 'Sites et chantiers', description: 'À importer après les clients.', headers: ['client_company','name','code','address','postal_code','city','contact_name','contact_phone','billing_mode','service_rate_euros','instructions','access_details','expected_frequency'], example: { client_company: 'Résidence Horizon', name: 'Parties communes', code: 'HOR-01', address: '10 rue Exemple', postal_code: '83700', city: 'Saint-Raphaël', contact_name: 'Gardien', contact_phone: '0600000000', billing_mode: 'hourly', service_rate_euros: '28,00', instructions: 'Nettoyer halls et escaliers', access_details: 'Badge gardien', expected_frequency: '3 passages/semaine' } }
  ],
  restauration: [
    { key: 'restaurant_employees', label: 'Employés', description: 'Équipe et postes du restaurant.', headers: ['first_name','last_name','role_code','email','phone','weekly_hours'], example: { first_name: 'Emma', last_name: 'Petit', role_code: 'server', email: 'emma@example.fr', phone: '0600000000', weekly_hours: 35 } },
    { key: 'restaurant_suppliers', label: 'Fournisseurs', description: 'Fournisseurs et contacts commerciaux.', headers: ['name','contact_name','email','phone','notes'], example: { name: 'Primeur du Sud', contact_name: 'M. Rossi', email: 'commande@example.fr', phone: '0494000000', notes: 'Livraison mardi et vendredi' } },
    { key: 'restaurant_stock', label: 'Stock initial', description: 'À importer après les fournisseurs.', headers: ['supplier_name','name','category','unit','quantity','minimum_quantity','unit_cost_euros'], example: { supplier_name: 'Primeur du Sud', name: 'Tomates', category: 'Légumes', unit: 'kg', quantity: '15,5', minimum_quantity: 5, unit_cost_euros: '2,40' } },
    { key: 'restaurant_menu', label: 'Carte du restaurant', description: 'Catégories créées automatiquement.', headers: ['category','name','description','price_euros','allergens','vegetarian','vegan'], example: { category: 'Plats', name: 'Risotto aux légumes', description: 'Risotto crémeux aux légumes de saison', price_euros: '18,90', allergens: 'Milk;Celery', vegetarian: 'oui', vegan: 'non' } }
  ]
};

const headerAliases: Record<string, string> = {
  prenom: 'first_name', prénom: 'first_name', nom: 'last_name', telephone: 'phone', téléphone: 'phone', mail: 'email', courriel: 'email',
  entreprise: 'company_name', societe: 'company_name', société: 'company_name', contact: 'contact_name', ville: 'city', adresse: 'billing_address',
  code_postal: 'postal_code', cp: 'postal_code', commentaire: 'notes', commentaires: 'notes', duree: 'duration_minutes', durée: 'duration_minutes',
  prix: 'price_euros', tarif: 'price_euros', heures: 'weekly_hours', matricule: 'employee_number', poste: 'role_code', categorie: 'category', catégorie: 'category'
};

function normalizeHeader(value: string) {
  const normalized = value
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return headerAliases[normalized] ?? normalized;
}

function parseCsvLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      values.push(current.trim());
      current = '';
    } else current += char;
  }
  values.push(current.trim());
  return values;
}

function parseCsv(content: string) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) throw new Error('Le fichier doit contenir une ligne d’en-têtes et au moins une ligne de données.');
  const delimiter = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line, delimiter);
    return headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = values[index] ?? '';
      return record;
    }, {});
  }).filter((row) => Object.values(row).some((value) => value.trim().length > 0));
  return { headers, rows };
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadText(filename: string, content: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dateLabel(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function SaasLaunchCenterPage() {
  const { organization } = useOrganization();
  const [overview, setOverview] = useState<LaunchOverview | null>(null);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [savingTest, setSavingTest] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);

  const canImport = ['owner','admin'].includes(organization?.role ?? 'viewer');
  const canManage = ['owner','admin','manager'].includes(organization?.role ?? 'viewer');
  const definitions = useMemo(() => organization ? importsByBusiness[organization.business_type] : [], [organization?.business_type]);
  const definition = useMemo(() => definitions.find((item) => item.key === selectedType) ?? definitions[0], [definitions, selectedType]);
  const pack = organization ? businessPacks[organization.business_type] : null;

  async function load() {
    if (!organization || !supabase) return;
    setLoading(true);
    setError('');
    const [overviewResult, jobsResult] = await Promise.all([
      supabase.rpc('get_organization_launch_center', { p_organization_id: organization.id }),
      supabase.rpc('list_organization_import_jobs', { p_organization_id: organization.id })
    ]);
    if (overviewResult.error) setError(overviewResult.error.message);
    else setOverview(overviewResult.data as LaunchOverview);
    if (jobsResult.error) setError((current) => current || jobsResult.error.message);
    else setJobs((Array.isArray(jobsResult.data) ? jobsResult.data : []) as ImportJob[]);
    setLoading(false);
  }

  useEffect(() => {
    setSelectedType(definitions[0]?.key ?? '');
    setSelectedFile(null);
    setPreviewRows([]);
    setPreviewHeaders([]);
    setLastResult(null);
    void load();
  }, [organization?.id]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setPreviewRows([]);
    setPreviewHeaders([]);
    setLastResult(null);
    setError('');
    if (!file) return;
    try {
      const parsed = parseCsv(await file.text());
      if (parsed.rows.length > 1000) throw new Error('Un import est limité à 1 000 lignes. Découpe le fichier en plusieurs imports.');
      setPreviewRows(parsed.rows);
      setPreviewHeaders(parsed.headers);
    } catch (cause) {
      setSelectedFile(null);
      setError(cause instanceof Error ? cause.message : 'Impossible de lire ce fichier.');
    }
  }

  function downloadTemplate() {
    if (!definition) return;
    const firstLine = definition.headers.map(csvEscape).join(';');
    const secondLine = definition.headers.map((header) => csvEscape(definition.example[header] ?? '')).join(';');
    downloadText(`modele-${definition.key}.csv`, `\uFEFF${firstLine}\n${secondLine}\n`);
  }

  async function runImport() {
    if (!organization || !supabase || !definition || !selectedFile || previewRows.length === 0 || !canImport) return;
    const missingHeaders = definition.headers.filter((header) => !previewHeaders.includes(header));
    if (missingHeaders.length > 0) {
      setError(`Colonnes manquantes : ${missingHeaders.join(', ')}. Télécharge le modèle pour conserver le bon format.`);
      return;
    }
    setImporting(true);
    setError('');
    setMessage('');
    const { data, error: requestError } = await supabase.rpc('import_organization_records', {
      p_organization_id: organization.id,
      p_import_type: definition.key,
      p_file_name: selectedFile.name,
      p_rows: previewRows
    });
    if (requestError) setError(requestError.message);
    else {
      const result = data as ImportResult;
      setLastResult(result);
      setMessage(`${result.inserted_rows} ligne(s) importée(s), ${result.skipped_rows} doublon(s) ignoré(s), ${result.error_rows} erreur(s).`);
      setSelectedFile(null);
      setPreviewRows([]);
      setPreviewHeaders([]);
      await load();
    }
    setImporting(false);
  }

  async function toggleLaunchTest() {
    if (!organization || !supabase || !canManage) return;
    const current = overview?.steps.find((step) => step.key === 'launch_test')?.completed ?? false;
    setSavingTest(true);
    setError('');
    const { data, error: requestError } = await supabase.rpc('set_organization_launch_test', {
      p_organization_id: organization.id,
      p_completed: !current
    });
    if (requestError) setError(requestError.message);
    else {
      setOverview(data as LaunchOverview);
      setMessage(!current ? 'Le test de mise en service est validé.' : 'Le test de mise en service a été rouvert.');
    }
    setSavingTest(false);
  }

  if (!organization || !pack) return null;

  const launchTest = overview?.steps.find((step) => step.key === 'launch_test');

  return (
    <div className="page-container launch-center-page">
      <section className="launch-center-hero">
        <div className="launch-center-hero-copy">
          <span className="launch-center-kicker"><Icon name="sparkles" size={16} /> CENTRE DE DÉMARRAGE</span>
          <h1>Prépare {organization.name} avant la mise en service.</h1>
          <p>Une vue unique pour compléter les réglages, importer les données existantes et vérifier le parcours {pack.label.toLowerCase()}.</p>
        </div>
        <div className="launch-progress-card">
          <div className="launch-progress-ring" style={{ '--launch-progress': `${overview?.progress ?? 0}%` } as React.CSSProperties}>
            <span>{overview?.progress ?? 0}%</span>
          </div>
          <div><small>Progression</small><strong>{overview?.completed_steps ?? 0} / {overview?.total_steps ?? 0} étapes</strong><span>{(overview?.progress ?? 0) >= 100 ? 'Espace prêt à être utilisé' : 'Continue la configuration'}</span></div>
        </div>
      </section>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}

      <section className="launch-center-layout">
        <article className="panel launch-checklist-panel">
          <header className="panel-header">
            <div><p className="eyebrow">CHECKLIST MÉTIER</p><h2>Les étapes essentielles</h2><p>La progression se met à jour automatiquement avec les vraies données de l’entreprise.</p></div>
            <button className="secondary-button compact" type="button" onClick={() => void load()} disabled={loading}>Actualiser</button>
          </header>

          <div className="launch-checklist">
            {loading && <div className="admin-empty-state">Analyse de la configuration…</div>}
            {!loading && overview?.steps.map((step, index) => (
              <article key={step.key} className={`launch-step${step.completed ? ' completed' : ''}`}>
                <span className="launch-step-number">{step.completed ? <Icon name="check" size={18} /> : index + 1}</span>
                <span className="launch-step-icon"><Icon name={step.icon} size={20} /></span>
                <div><strong>{step.label}</strong><p>{step.description}</p></div>
                {step.manual ? (
                  <button type="button" onClick={() => void toggleLaunchTest()} disabled={!canManage || savingTest} className={step.completed ? 'secondary-button compact' : 'primary-button compact'}>
                    {savingTest ? 'Enregistrement…' : step.completed ? 'Rouvrir le test' : 'Valider le test'}
                  </button>
                ) : (
                  <Link to={step.path} className={step.completed ? 'launch-step-link done' : 'launch-step-link'}>{step.completed ? 'Vérifier' : 'Configurer'} <Icon name="chevronRight" size={16} /></Link>
                )}
              </article>
            ))}
          </div>

          {launchTest && !launchTest.completed && (
            <div className="launch-test-callout">
              <span><Icon name="shield" size={22} /></span>
              <div><strong>Dernière étape : réalise un test réel.</strong><p>Crée une donnée, vérifie le planning, contrôle les documents et teste le parcours terrain ou public correspondant au métier.</p></div>
            </div>
          )}
        </article>

        <aside className="panel launch-import-panel">
          <div className="panel-header">
            <div><p className="eyebrow">IMPORT GUIDÉ</p><h2>Reprends tes données existantes</h2><p>Utilise un fichier CSV exporté depuis Excel. Les doublons sont ignorés et chaque erreur est détaillée.</p></div>
          </div>

          {!canImport && <div className="info-message">Seuls le propriétaire et les administrateurs peuvent lancer un import.</div>}

          <div className="launch-import-types">
            {definitions.map((item) => (
              <button type="button" key={item.key} className={definition?.key === item.key ? 'active' : ''} onClick={() => { setSelectedType(item.key); setSelectedFile(null); setPreviewRows([]); setPreviewHeaders([]); setLastResult(null); }}>
                <span><Icon name="file" size={18} /></span><div><strong>{item.label}</strong><small>{item.description}</small></div><Icon name="chevronRight" size={16} />
              </button>
            ))}
          </div>

          {definition && (
            <div className="launch-import-workflow">
              <div className="launch-import-template">
                <div><strong>1. Télécharge le modèle</strong><small>{definition.headers.length} colonnes attendues · séparateur ;</small></div>
                <button type="button" className="secondary-button compact" onClick={downloadTemplate}><Icon name="file" size={16} /> Modèle CSV</button>
              </div>
              <label className={`launch-file-drop${selectedFile ? ' selected' : ''}`}>
                <input type="file" accept=".csv,text/csv" onChange={handleFile} disabled={!canImport || importing} />
                <span><Icon name="clipboard" size={26} /></span>
                <strong>{selectedFile ? selectedFile.name : '2. Choisis ton fichier CSV'}</strong>
                <small>{selectedFile ? `${previewRows.length} ligne(s) détectée(s)` : 'Fichier CSV exporté depuis Excel · 1 000 lignes maximum'}</small>
              </label>

              {previewRows.length > 0 && (
                <div className="launch-import-preview">
                  <div className="launch-import-preview-head"><strong>Aperçu avant import</strong><span>{previewRows.length} ligne(s)</span></div>
                  <div className="launch-import-table-wrap">
                    <table><thead><tr>{definition.headers.slice(0, 5).map((header) => <th key={header}>{header}</th>)}</tr></thead>
                      <tbody>{previewRows.slice(0, 4).map((row, rowIndex) => <tr key={rowIndex}>{definition.headers.slice(0, 5).map((header) => <td key={header}>{row[header] || '—'}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                  <button type="button" className="primary-button full" onClick={() => void runImport()} disabled={importing || !canImport}>{importing ? 'Import en cours…' : `Importer ${previewRows.length} ligne(s)`}</button>
                </div>
              )}

              {lastResult && lastResult.error_rows > 0 && (
                <div className="launch-import-errors">
                  <strong>{lastResult.error_rows} ligne(s) à corriger</strong>
                  {lastResult.errors.slice(0, 5).map((item, index) => <p key={index}>Ligne {item.line ?? '—'} · {item.message ?? 'Erreur inconnue'}</p>)}
                </div>
              )}
            </div>
          )}
        </aside>
      </section>

      <section className="panel launch-history-panel">
        <div className="panel-header"><div><p className="eyebrow">TRAÇABILITÉ</p><h2>Historique des imports</h2></div><span className="launch-history-count">{jobs.length} opération(s)</span></div>
        {jobs.length === 0 ? <div className="admin-empty-state">Aucun import n’a encore été effectué.</div> : (
          <div className="launch-history-list">
            {jobs.slice(0, 12).map((job) => (
              <article key={job.id}>
                <span className={`launch-import-status ${job.status}`}><Icon name={job.status === 'completed' ? 'check' : job.status === 'failed' ? 'alert' : 'activity'} size={17} /></span>
                <div><strong>{definitions.find((item) => item.key === job.import_type)?.label ?? job.import_type}</strong><small>{job.file_name || 'Fichier sans nom'} · {dateLabel(job.completed_at ?? job.created_at)}</small></div>
                <dl><div><dt>Importées</dt><dd>{job.inserted_rows}</dd></div><div><dt>Doublons</dt><dd>{job.skipped_rows}</dd></div><div><dt>Erreurs</dt><dd>{job.error_rows}</dd></div></dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
