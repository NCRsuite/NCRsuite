import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  clientExportBaseName,
  companyCsvDatasets,
  companyExportBaseName,
  makeCsvExport,
  makeJsonExport,
  type BeautyClientDataExport,
  type BeautyCompanyDataExport,
  type BeautyCsvDatasetKey
} from '../features/beauty/dataExport';
import { useBeautyEnseigneContext } from '../hooks/useBeautyEnseigneContext';
import { useConfirmDialog } from '../contexts/ConfirmDialogContext';
import {
  closeFileWindow,
  prepareFileWindow,
  showDataBlobDownload
} from '../lib/browserFiles';
import { supabase } from '../lib/supabase';
import '../beautyDataPrivacy.css';

interface ClientOption {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
}

interface ClientMediaFile {
  id: string;
  storage_path: string;
  media_kind: string;
  caption: string | null;
  created_at: string;
}

interface ClientDocumentFile {
  id: string;
  storage_path: string;
  title: string;
  category: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

interface ErasurePreview {
  client: {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    status: string;
  };
  blocked: boolean;
  future_appointments: number;
  counts: {
    appointments: number;
    notes: number;
    profiles: number;
    questionnaires: number;
    consents: number;
    media: number;
    documents: number;
    waitlist: number;
    reviews: number;
    portal_accounts: number;
    portal_invitations: number;
  };
  media_paths: string[];
  document_paths: string[];
}

const dateOnly = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

function fullName(client: Pick<ClientOption, 'first_name' | 'last_name'>) {
  return [client.first_name, client.last_name].filter(Boolean).join(' ');
}

function fileNameFromPath(path: string, fallback: string) {
  const last = path.split('/').filter(Boolean).pop();
  return last || fallback;
}

function revokeLater(url: string) {
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

export function BeautyDataPrivacyPage() {
  const { organization } = useOrganization();
  const { demoMode } = useAuth();
  const {
    beautyMode,
    selectedEnseigne,
    selectedEnseigneId,
    loading: enseigneLoading
  } = useBeautyEnseigneContext();

  const { confirm } = useConfirmDialog();

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientQuery, setClientQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientMedia, setClientMedia] = useState<ClientMediaFile[]>([]);
  const [clientDocuments, setClientDocuments] = useState<ClientDocumentFile[]>([]);
  const [companyExport, setCompanyExport] = useState<BeautyCompanyDataExport | null>(null);
  const [preparingCompanyExport, setPreparingCompanyExport] = useState(false);
  const [exportingClient, setExportingClient] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState('');
  const [erasurePreview, setErasurePreview] = useState<ErasurePreview | null>(null);
  const [preparingErasure, setPreparingErasure] = useState(false);
  const [erasureReason, setErasureReason] = useState('');
  const [erasureConfirm, setErasureConfirm] = useState('');
  const [erasing, setErasing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const role = organization?.role ?? 'viewer';
  const canView = ['owner', 'admin', 'manager'].includes(role);
  const canErase = ['owner', 'admin'].includes(role);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const filteredClients = useMemo(() => {
    const needle = clientQuery.trim().toLocaleLowerCase('fr');
    if (!needle) return clients;
    return clients.filter((client) => {
      const haystack = [
        client.first_name,
        client.last_name,
        client.email,
        client.phone
      ].filter(Boolean).join(' ').toLocaleLowerCase('fr');
      return haystack.includes(needle);
    });
  }, [clients, clientQuery]);

  async function loadClients() {
    if (!organization || !selectedEnseigneId || !canView || demoMode || !supabase) {
      setClients([]);
      return;
    }

    const { data, error: requestError } = await supabase
      .from('clients')
      .select('id,first_name,last_name,email,phone,status,created_at')
      .eq('organization_id', organization.id)
      .eq('company_id', selectedEnseigneId)
      .order('created_at', { ascending: false });

    if (requestError) {
      setError(requestError.message);
      setClients([]);
      return;
    }

    setClients(
      ((data ?? []) as ClientOption[])
        .filter((client) => client.first_name !== 'Client supprimé')
    );
  }

  async function loadSelectedClientFiles(clientId: string) {
    if (!organization || !selectedEnseigneId || !supabase || !clientId) {
      setClientMedia([]);
      setClientDocuments([]);
      return;
    }

    const [mediaResult, documentsResult] = await Promise.all([
      supabase
        .from('beauty_client_media')
        .select('id,storage_path,media_kind,caption,created_at')
        .eq('organization_id', organization.id)
        .eq('company_id', selectedEnseigneId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
      supabase
        .from('beauty_client_documents')
        .select('id,storage_path,title,category,mime_type,size_bytes,created_at')
        .eq('organization_id', organization.id)
        .eq('company_id', selectedEnseigneId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
    ]);

    if (mediaResult.error || documentsResult.error) {
      setError(mediaResult.error?.message || documentsResult.error?.message || 'Chargement des fichiers impossible.');
      return;
    }

    setClientMedia((mediaResult.data ?? []) as ClientMediaFile[]);
    setClientDocuments((documentsResult.data ?? []) as ClientDocumentFile[]);
  }

  useEffect(() => {
    setCompanyExport(null);
    setSelectedClientId('');
    setClientQuery('');
    setClientMedia([]);
    setClientDocuments([]);
    setErasurePreview(null);
    setErasureReason('');
    setErasureConfirm('');
    setError('');
    setSuccess('');
    void loadClients();
  }, [organization?.id, selectedEnseigneId, canView, demoMode]);

  useEffect(() => {
    setErasurePreview(null);
    setErasureReason('');
    setErasureConfirm('');
    setError('');
    if (selectedClientId) void loadSelectedClientFiles(selectedClientId);
    else {
      setClientMedia([]);
      setClientDocuments([]);
    }
  }, [selectedClientId]);

  async function prepareCompanyExport() {
    if (!organization || !selectedEnseigneId || !supabase) return;
    setPreparingCompanyExport(true);
    setError('');
    setSuccess('');

    const { data, error: requestError } = await supabase.rpc('beauty_company_data_export', {
      p_organization_id: organization.id,
      p_company_id: selectedEnseigneId
    });

    if (requestError) {
      setError(requestError.message);
      setCompanyExport(null);
    } else {
      setCompanyExport(data as BeautyCompanyDataExport);
      setSuccess('Export complet préparé. Choisissez maintenant le format à télécharger.');
    }
    setPreparingCompanyExport(false);
  }

  function downloadBlob(blob: Blob, filename: string, title: string) {
    const target = prepareFileWindow('Préparation du fichier', 'NCR Suite prépare le téléchargement.');
    const url = URL.createObjectURL(blob);
    showDataBlobDownload(target, url, filename, title);
    revokeLater(url);
  }

  function downloadCompanyJson() {
    if (!companyExport || !selectedEnseigne) return;
    const result = makeJsonExport(
      companyExport,
      companyExportBaseName(selectedEnseigne.name, 'export-complet')
    );
    downloadBlob(result.blob, result.filename, 'Export complet prêt');
  }

  function downloadCompanyCsv(key: BeautyCsvDatasetKey) {
    if (!companyExport || !selectedEnseigne) return;
    const dataset = companyCsvDatasets(companyExport).find((item) => item.key === key);
    if (!dataset) return;
    const result = makeCsvExport(
      dataset.rows,
      companyExportBaseName(selectedEnseigne.name, dataset.filenameSuffix)
    );
    downloadBlob(result.blob, result.filename, `${dataset.label} prêt`);
  }

  async function exportSelectedClient() {
    if (!organization || !selectedEnseigneId || !selectedClient || !supabase) return;
    setExportingClient(true);
    setError('');
    setSuccess('');

    const target = prepareFileWindow(
      'Préparation de la portabilité',
      'NCR Suite rassemble les données personnelles de cette cliente.'
    );

    const { data, error: requestError } = await supabase.rpc('beauty_client_data_export', {
      p_organization_id: organization.id,
      p_company_id: selectedEnseigneId,
      p_client_id: selectedClient.id
    });

    if (requestError) {
      closeFileWindow(target);
      setError(requestError.message);
      setExportingClient(false);
      return;
    }

    const payload = data as BeautyClientDataExport;
    const result = makeJsonExport(payload, clientExportBaseName(fullName(selectedClient)));
    const url = URL.createObjectURL(result.blob);
    showDataBlobDownload(target, url, result.filename, 'Portabilité RGPD prête');
    revokeLater(url);
    setSuccess('Export individuel généré et tracé dans l’historique.');
    setExportingClient(false);
  }

  async function downloadPrivateFile(
    bucket: 'beauty-client-media' | 'beauty-client-documents',
    path: string,
    preferredName: string,
    fileId: string
  ) {
    if (!supabase) return;
    setDownloadingFileId(fileId);
    setError('');
    const target = prepareFileWindow('Préparation du fichier', 'Téléchargement sécurisé du dossier privé.');
    const { data, error: requestError } = await supabase.storage.from(bucket).download(path);
    if (requestError || !data) {
      closeFileWindow(target);
      setError(requestError?.message || 'Fichier introuvable.');
      setDownloadingFileId('');
      return;
    }

    const url = URL.createObjectURL(data);
    showDataBlobDownload(target, url, preferredName, 'Fichier privé prêt');
    revokeLater(url);
    setDownloadingFileId('');
  }

  async function prepareErasure() {
    if (!organization || !selectedEnseigneId || !selectedClient || !supabase || !canErase) return;
    setPreparingErasure(true);
    setError('');
    setSuccess('');

    const { data, error: requestError } = await supabase.rpc('beauty_client_erasure_preview', {
      p_organization_id: organization.id,
      p_company_id: selectedEnseigneId,
      p_client_id: selectedClient.id
    });

    if (requestError) {
      setError(requestError.message);
      setErasurePreview(null);
    } else {
      setErasurePreview(data as ErasurePreview);
    }
    setPreparingErasure(false);
  }

  async function removeStoragePaths(
    bucket: 'beauty-client-media' | 'beauty-client-documents',
    paths: string[]
  ) {
    for (let index = 0; index < paths.length; index += 100) {
      const chunk = paths.slice(index, index + 100);
      if (chunk.length === 0) continue;
      const { error: requestError } = await supabase!.storage.from(bucket).remove(chunk);
      if (requestError) throw requestError;
    }
  }

  async function executeErasure() {
    if (
      !organization
      || !selectedEnseigneId
      || !selectedClient
      || !erasurePreview
      || !supabase
      || !canErase
    ) return;

    if (erasurePreview.blocked) {
      setError('L’effacement est bloqué tant que des rendez-vous futurs actifs existent.');
      return;
    }
    if (erasureReason.trim().length < 5) {
      setError('Indiquez un motif d’effacement suffisamment explicite.');
      return;
    }
    if (erasureConfirm.trim().toUpperCase() !== 'EFFACER') {
      setError('Saisissez exactement EFFACER pour confirmer.');
      return;
    }

    const decision = await confirm({
      title: `Effacer et anonymiser ${fullName(selectedClient)} ?`,
      message: 'Cette action supprime le dossier privé, retire les fichiers, désactive les usages marketing et anonymise la fiche. Les rendez-vous historiques nécessaires au suivi d’activité restent conservés sans identité.\n\nCette opération est volontairement protégée par la saisie EFFACER déjà effectuée.',
      confirmLabel: 'Effacer définitivement',
      tone: 'danger'
    });
    if (!decision.confirmed) return;

    setErasing(true);
    setError('');
    setSuccess('');

    try {
      await removeStoragePaths('beauty-client-media', erasurePreview.media_paths);
      await removeStoragePaths('beauty-client-documents', erasurePreview.document_paths);

      const { error: requestError } = await supabase.rpc('beauty_anonymize_client', {
        p_organization_id: organization.id,
        p_company_id: selectedEnseigneId,
        p_client_id: selectedClient.id,
        p_reason: erasureReason.trim()
      });
      if (requestError) throw requestError;

      setSuccess('Effacement terminé : identité anonymisée, dossier privé supprimé et action tracée.');
      setSelectedClientId('');
      setErasurePreview(null);
      setErasureReason('');
      setErasureConfirm('');
      await loadClients();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Une erreur inconnue est survenue.';
      setError(`Effacement incomplet : ${message}. Vous pouvez relancer la préparation pour vérifier l’état restant.`);
    } finally {
      setErasing(false);
    }
  }

  if (!organization) return null;
  if (!beautyMode) {
    return <div className="page"><div className="info-message page-message">Les exports et outils RGPD sont disponibles dans l’environnement Coiffure & beauté Métier.</div></div>;
  }
  if (!canView) {
    return <div className="page"><div className="error-message page-message">Cette rubrique est réservée aux propriétaires, administrateurs et responsables autorisés.</div></div>;
  }

  return <div className="page beauty-data-privacy-page">
    <header className="page-header beauty-data-privacy-header">
      <div>
        <p className="eyebrow">DONNÉES · EXPORTS · RGPD</p>
        <h1>Données & RGPD</h1>
        <p>{selectedEnseigne
          ? `Exports, portabilité et effacement contrôlé pour ${selectedEnseigne.name}. Aucun mélange avec les autres enseignes.`
          : 'Sélectionnez une enseigne Beauty.'}</p>
      </div>
      <Link className="secondary-button" to="/historique"><Icon name="activity" size={16}/> Voir la traçabilité</Link>
    </header>

    {demoMode && <div className="info-message page-message">Les exports RGPD utilisent les données réelles Supabase et ne sont pas simulés en mode démonstration.</div>}
    {!selectedEnseigneId && !enseigneLoading && <div className="info-message page-message">Aucune enseigne Beauty sélectionnée.</div>}
    {error && <div className="error-message page-message" role="alert">{error}</div>}
    {success && <div className="success-message page-message" role="status">{success}</div>}

    <section className="panel beauty-data-export-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">SAUVEGARDE & EXPORT</p>
          <h2>Export complet de l’enseigne</h2>
          <small>Clients, rendez-vous, prestations, consentements, fidélité, CRM, avis, parrainage et manifestes des fichiers privés.</small>
        </div>
        <button
          type="button"
          className="primary-button"
          disabled={preparingCompanyExport || !selectedEnseigneId || demoMode}
          onClick={() => void prepareCompanyExport()}
        >
          <Icon name="file" size={16}/>{preparingCompanyExport ? 'Préparation…' : companyExport ? 'Actualiser l’export' : 'Préparer les exports'}
        </button>
      </div>

      {!companyExport ? <div className="beauty-data-empty">
        <Icon name="file" size={22}/>
        <div><strong>Aucun export préparé</strong><span>L’export est généré à la demande et son accès est tracé.</span></div>
      </div> : <div className="beauty-data-export-grid">
        <button type="button" className="beauty-data-export-card primary" onClick={downloadCompanyJson}>
          <Icon name="file" size={18}/>
          <div><strong>JSON complet</strong><span>Archive structurée de toutes les données Beauty de l’enseigne.</span></div>
        </button>
        {companyCsvDatasets(companyExport).map((dataset) => <button
          type="button"
          key={dataset.key}
          className="beauty-data-export-card"
          onClick={() => downloadCompanyCsv(dataset.key)}
        >
          <Icon name="file" size={17}/>
          <div><strong>CSV · {dataset.label}</strong><span>{dataset.rows.length} ligne{dataset.rows.length > 1 ? 's' : ''}</span></div>
        </button>)}
      </div>}
    </section>

    <section className="panel beauty-data-client-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">DROIT D’ACCÈS & PORTABILITÉ</p>
          <h2>Exporter une cliente</h2>
          <small>Choisissez une fiche pour générer un fichier JSON lisible par machine avec l’ensemble des données qui lui sont rattachées.</small>
        </div>
      </div>

      <div className="beauty-data-client-selector">
        <label>
          <span>Rechercher une cliente</span>
          <input
            value={clientQuery}
            onChange={(event) => setClientQuery(event.target.value)}
            placeholder="Nom, e-mail ou téléphone…"
          />
        </label>
        <select
          value={selectedClientId}
          onChange={(event) => setSelectedClientId(event.target.value)}
        >
          <option value="">Sélectionner une fiche…</option>
          {filteredClients.map((client) => <option key={client.id} value={client.id}>
            {fullName(client)}{client.email ? ` · ${client.email}` : ''}{client.status === 'archived' ? ' · archivée' : ''}
          </option>)}
        </select>
      </div>

      {selectedClient && <div className="beauty-data-selected-client">
        <div className="beauty-data-client-identity">
          <span>{selectedClient.first_name.slice(0,1).toUpperCase()}</span>
          <div>
            <strong>{fullName(selectedClient)}</strong>
            <small>{selectedClient.email || 'E-mail non renseigné'} · {selectedClient.phone || 'Téléphone non renseigné'}</small>
            <em>Fiche créée le {dateOnly.format(new Date(selectedClient.created_at))}</em>
          </div>
        </div>
        <button type="button" className="primary-button" disabled={exportingClient} onClick={() => void exportSelectedClient()}>
          <Icon name="file" size={16}/>{exportingClient ? 'Export…' : 'Exporter la portabilité'}
        </button>
      </div>}

      {selectedClient && (clientMedia.length > 0 || clientDocuments.length > 0) && <div className="beauty-data-private-files">
        <div className="beauty-data-subhead"><strong>Fichiers privés associés</strong><span>À télécharger séparément de l’export JSON.</span></div>
        <div className="beauty-data-files-list">
          {clientMedia.map((item) => <article key={item.id}>
            <span><Icon name="eye" size={15}/></span>
            <div><strong>{item.caption || `Photo ${item.media_kind}`}</strong><small>{dateOnly.format(new Date(item.created_at))}</small></div>
            <button
              type="button"
              className="secondary-button compact-button"
              disabled={downloadingFileId === item.id}
              onClick={() => void downloadPrivateFile(
                'beauty-client-media',
                item.storage_path,
                fileNameFromPath(item.storage_path, `photo-${item.id}.jpg`),
                item.id
              )}
            >{downloadingFileId === item.id ? '…' : 'Télécharger'}</button>
          </article>)}
          {clientDocuments.map((item) => <article key={item.id}>
            <span><Icon name="file" size={15}/></span>
            <div><strong>{item.title}</strong><small>{item.category} · {dateOnly.format(new Date(item.created_at))}</small></div>
            <button
              type="button"
              className="secondary-button compact-button"
              disabled={downloadingFileId === item.id}
              onClick={() => void downloadPrivateFile(
                'beauty-client-documents',
                item.storage_path,
                item.title || fileNameFromPath(item.storage_path, `document-${item.id}`),
                item.id
              )}
            >{downloadingFileId === item.id ? '…' : 'Télécharger'}</button>
          </article>)}
        </div>
      </div>}
    </section>

    <section className="panel beauty-data-erasure-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">EFFACEMENT RGPD</p>
          <h2>Anonymiser une fiche</h2>
          <small>Action destructive distincte de l’archivage classique. Les rendez-vous historiques sont conservés sans identité pour préserver l’historique d’activité.</small>
        </div>
        {canErase && <button
          type="button"
          className="secondary-button compact-button"
          disabled={!selectedClient || preparingErasure || demoMode}
          onClick={() => void prepareErasure()}
        >
          <Icon name="shield" size={14}/>{preparingErasure ? 'Analyse…' : 'Préparer l’effacement'}
        </button>}
      </div>

      {!canErase ? <div className="beauty-data-restricted">
        <Icon name="lock" size={17}/>
        <div><strong>Effacement réservé au propriétaire et aux administrateurs</strong><span>Un Responsable peut exporter les données mais ne peut pas anonymiser définitivement une identité.</span></div>
      </div> : !selectedClient ? <div className="beauty-data-empty">
        <Icon name="users" size={21}/>
        <div><strong>Sélectionnez d’abord une cliente</strong><span>Utilisez le sélecteur de la section Portabilité ci-dessus.</span></div>
      </div> : !erasurePreview ? <div className="beauty-data-erasure-intro">
        <Icon name="alert" size={18}/>
        <p>« Archiver » masque simplement une fiche. L’effacement RGPD supprime le dossier privé et anonymise les données d’identité. Préparez d’abord l’action pour voir précisément ce qui est concerné.</p>
      </div> : <>
        <div className={`beauty-data-erasure-summary${erasurePreview.blocked ? ' blocked' : ''}`}>
          <div>
            <strong>{erasurePreview.blocked ? 'Effacement actuellement bloqué' : 'Effacement techniquement possible'}</strong>
            <span>{erasurePreview.blocked
              ? `${erasurePreview.future_appointments} rendez-vous futur(s) actif(s) doivent être annulés ou traités avant l’effacement.`
              : 'Aucun rendez-vous futur actif ne bloque la procédure.'}</span>
          </div>
          <Icon name={erasurePreview.blocked ? 'alert' : 'check'} size={20}/>
        </div>

        <div className="beauty-data-erasure-counts">
          <article><span>RDV conservés anonymisés</span><strong>{erasurePreview.counts.appointments}</strong></article>
          <article><span>Notes à supprimer</span><strong>{erasurePreview.counts.notes}</strong></article>
          <article><span>Questionnaires</span><strong>{erasurePreview.counts.questionnaires}</strong></article>
          <article><span>Photos</span><strong>{erasurePreview.counts.media}</strong></article>
          <article><span>Documents</span><strong>{erasurePreview.counts.documents}</strong></article>
          <article><span>Liste d’attente</span><strong>{erasurePreview.counts.waitlist}</strong></article>
          <article><span>Comptes espace client</span><strong>{erasurePreview.counts.portal_accounts}</strong></article>
          <article><span>Consentements conservés anonymisés</span><strong>{erasurePreview.counts.consents}</strong></article>
        </div>

        {!erasurePreview.blocked && <div className="beauty-data-erasure-form">
          <label className="wide">
            Motif de l’effacement
            <textarea
              rows={3}
              value={erasureReason}
              onChange={(event) => setErasureReason(event.target.value)}
              placeholder="Ex. : demande d’effacement reçue de la cliente le …"
            />
          </label>
          <label>
            Confirmation
            <input
              value={erasureConfirm}
              onChange={(event) => setErasureConfirm(event.target.value)}
              placeholder="Saisissez EFFACER"
            />
          </label>
          <button
            type="button"
            className="danger-button"
            disabled={erasing || erasureConfirm.trim().toUpperCase() !== 'EFFACER' || erasureReason.trim().length < 5}
            onClick={() => void executeErasure()}
          >
            <Icon name="alert" size={15}/>{erasing ? 'Effacement…' : 'Effacer et anonymiser'}
          </button>
        </div>}
      </>}
    </section>

    <section className="beauty-data-privacy-note">
      <Icon name="info" size={14}/>
      <p>Ces outils facilitent l’accès, la portabilité, l’anonymisation et la traçabilité des données dans NCR Suite. La durée de conservation et les obligations légales applicables restent à définir selon l’activité et les justificatifs que l’entreprise doit conserver.</p>
    </section>
  </div>;
}
