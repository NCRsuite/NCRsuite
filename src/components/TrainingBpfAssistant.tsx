import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import {
  trainingBpfDeliveryModeLabels,
  trainingBpfRevenueLabels,
  trainingBpfTraineeLabels,
  type TrainingBpfCalculation,
  type TrainingBpfDeliveryMode,
  type TrainingBpfRegulatoryScope,
  type TrainingBpfReportRecord,
  type TrainingBpfRevenueCategory,
  type TrainingBpfTraineeType
} from '../features/training/bpf';
import {
  formatTrainingMoney,
  personName,
  type TrainingCommercialDocumentRecord,
  type TrainingEnrollmentRecord,
  type TrainingInvoiceRecord,
  type TrainingProgramRecord,
  type TrainingSessionRecord,
  type TrainingTraineeRecord
} from '../features/training/types';

export type TrainingBpfAssistantStep = 'identity' | 'sessions' | 'trainees' | 'revenue' | 'checks' | 'ready';

interface Props {
  organizationName: string;
  ndaNumber?: string | null;
  siret?: string | null;
  report: TrainingBpfReportRecord;
  calculation: TrainingBpfCalculation;
  sessions: TrainingSessionRecord[];
  programs: TrainingProgramRecord[];
  enrollments: TrainingEnrollmentRecord[];
  trainees: TrainingTraineeRecord[];
  invoices: TrainingInvoiceRecord[];
  documents: TrainingCommercialDocumentRecord[];
  locked: boolean;
  busyId: string;
  onOpenExpert: (tab: 'overview' | 'financial' | 'pedagogical' | 'sources') => void;
  onSessionScope: (sessionId: string, scope: TrainingBpfRegulatoryScope) => Promise<void>;
  onSessionDelivery: (sessionId: string, mode: TrainingBpfDeliveryMode) => Promise<void>;
  onEnrollmentType: (sessionId: string, traineeId: string, type: TrainingBpfTraineeType) => Promise<void>;
  onSessionEnrollmentType: (sessionId: string, type: TrainingBpfTraineeType) => Promise<void>;
  onInvoiceCategory: (invoiceId: string, category: TrainingBpfRevenueCategory) => Promise<void>;
  onInvoiceIncluded: (invoiceId: string, included: boolean) => Promise<void>;
  onDocumentCategory: (documentId: string, category: TrainingBpfRevenueCategory) => Promise<void>;
  onDocumentIncluded: (documentId: string, included: boolean) => Promise<void>;
  onRefresh: () => Promise<void>;
  onExportPdf: () => Promise<void>;
  onExportCsv: () => void;
  onMarkReviewed: () => Promise<void>;
  onLock: () => Promise<void>;
}

const scopeChoices: Array<{ value: TrainingBpfRegulatoryScope; title: string; text: string; tone: string }> = [
  { value: 'professional_continuing', title: 'Formation professionnelle', text: 'SST, bureautique, management, perfectionnement… activité entrant dans le champ de la formation professionnelle.', tone: 'green' },
  { value: 'apprenticeship', title: 'Apprentissage', text: 'Action suivie dans le cadre d’un contrat d’apprentissage.', tone: 'blue' },
  { value: 'initial_education', title: 'Formation initiale', text: 'Ex. BTS scolaire / cursus initial. NCR conserve l’activité mais l’exclut du BPF.', tone: 'sand' },
  { value: 'out_of_scope', title: 'Hors champ BPF', text: 'Prestation qui ne relève pas de l’activité de formation professionnelle à déclarer.', tone: 'grey' }
];

const quickRevenueChoices: Array<{ value: TrainingBpfRevenueCategory; title: string; text: string }> = [
  { value: 'companies', title: 'Une entreprise', text: 'Elle finance la formation de ses salariés.' },
  { value: 'training_organizations', title: 'Un autre organisme de formation', text: 'Sous-traitance / prestation réalisée pour un centre de formation.' },
  { value: 'individuals', title: 'Un particulier', text: 'La personne paie elle-même sa formation.' },
  { value: 'cpf', title: 'CPF', text: 'Financement via le Compte personnel de formation.' },
  { value: 'france_travail', title: 'France Travail', text: 'Financement porté par France Travail.' },
  { value: 'apprenticeship', title: 'Apprentissage', text: 'Produit lié à des contrats d’apprentissage.' }
];

function sessionLabel(session: TrainingSessionRecord, programById: Map<string, TrainingProgramRecord>) {
  const program = programById.get(session.program_id);
  return program?.title && program.title !== session.title ? `${session.title} · ${program.title}` : session.title;
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function TrainingBpfAssistant(props: Props) {
  const {
    organizationName, ndaNumber, siret, report, calculation, sessions, programs, enrollments, trainees, invoices, documents,
    locked, busyId, onOpenExpert, onSessionScope, onSessionDelivery, onEnrollmentType, onSessionEnrollmentType,
    onInvoiceCategory, onInvoiceIncluded, onDocumentCategory, onDocumentIncluded, onRefresh, onExportPdf, onExportCsv, onMarkReviewed, onLock
  } = props;
  const [step, setStep] = useState<TrainingBpfAssistantStep>('identity');
  const [showAllRevenueCategories, setShowAllRevenueCategories] = useState(false);
  const programById = useMemo(() => new Map(programs.map((row) => [row.id, row])), [programs]);
  const traineeById = useMemo(() => new Map(trainees.map((row) => [row.id, row])), [trainees]);
  const eligibleSessionIds = useMemo(() => new Set(sessions.filter((row) => ['professional_continuing', 'apprenticeship'].includes(row.bpf_regulatory_scope ?? 'review_required')).map((row) => row.id)), [sessions]);
  const pendingSessions = useMemo(() => sessions.filter((row) => (row.bpf_regulatory_scope ?? 'review_required') === 'review_required'), [sessions]);
  const eligibleSessions = useMemo(() => sessions.filter((row) => eligibleSessionIds.has(row.id)), [sessions, eligibleSessionIds]);
  const pendingEnrollments = useMemo(() => enrollments.filter((row) => eligibleSessionIds.has(row.session_id) && row.status !== 'canceled' && !row.bpf_trainee_type), [enrollments, eligibleSessionIds]);
  const pendingInvoices = useMemo(() => invoices.filter((row) => row.bpf_included !== false && !row.bpf_revenue_category), [invoices]);
  const pendingDocuments = useMemo(() => documents.filter((row) => row.bpf_included === true && !row.bpf_revenue_category), [documents]);
  const identityIssues = useMemo(() => {
    const list: string[] = [];
    if (!ndaNumber) list.push('NDA de l’organisme');
    if (!siret) list.push('SIRET');
    if (!report.legal_form) list.push('forme juridique');
    if (!report.naf_code) list.push('code NAF');
    if (!report.executive_name) list.push('nom du dirigeant');
    return list;
  }, [ndaNumber, siret, report.legal_form, report.naf_code, report.executive_name]);

  const stepStatus = useMemo(() => ({
    identity: identityIssues.length === 0,
    sessions: pendingSessions.length === 0,
    trainees: pendingEnrollments.length === 0,
    revenue: pendingInvoices.length === 0 && pendingDocuments.length === 0 && calculation.sources.unreviewed_revenue_documents === 0,
    checks: calculation.quality.critical_count === 0,
    ready: calculation.quality.ready
  }), [identityIssues.length, pendingSessions.length, pendingEnrollments.length, pendingInvoices.length, pendingDocuments.length, calculation.sources.unreviewed_revenue_documents, calculation.quality.critical_count, calculation.quality.ready]);

  const steps: Array<{ key: TrainingBpfAssistantStep; title: string; hint: string }> = [
    { key: 'identity', title: 'Mon organisme', hint: identityIssues.length ? `${identityIssues.length} info(s) à compléter` : 'Informations prêtes' },
    { key: 'sessions', title: 'Mes formations', hint: pendingSessions.length ? `${pendingSessions.length} à qualifier` : `${sessions.length} session(s) vérifiée(s)` },
    { key: 'trainees', title: 'Mes stagiaires', hint: pendingEnrollments.length ? `${pendingEnrollments.length} à classer` : 'Catégories vérifiées' },
    { key: 'revenue', title: 'Mes recettes', hint: pendingInvoices.length + pendingDocuments.length ? `${pendingInvoices.length + pendingDocuments.length} à classer` : 'Recettes vérifiées' },
    { key: 'checks', title: 'Contrôle NCR', hint: calculation.quality.critical_count ? `${calculation.quality.critical_count} blocage(s)` : `${calculation.quality.warning_count} vigilance(s)` },
    { key: 'ready', title: 'Prêt à déclarer', hint: calculation.quality.ready ? 'BPF prêt' : 'Encore quelques vérifications' }
  ];

  useEffect(() => {
    if (step === 'identity' && stepStatus.identity) {
      if (!stepStatus.sessions) setStep('sessions');
      else if (!stepStatus.trainees) setStep('trainees');
      else if (!stepStatus.revenue) setStep('revenue');
      else if (!stepStatus.checks) setStep('checks');
      else setStep('ready');
    }
  }, [report.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentPendingSession = pendingSessions[0];
  const currentPendingEnrollment = pendingEnrollments[0];
  const currentEnrollmentSession = currentPendingEnrollment ? sessions.find((row) => row.id === currentPendingEnrollment.session_id) : undefined;
  const currentTrainee = currentPendingEnrollment ? traineeById.get(currentPendingEnrollment.trainee_id) : undefined;
  const currentPendingInvoice = pendingInvoices[0];
  const currentPendingDocument = pendingDocuments[0];

  const doneCount = steps.slice(0, 5).filter((item) => stepStatus[item.key]).length;
  const progress = Math.round(doneCount / 5 * 100);

  function nextStep(from: TrainingBpfAssistantStep) {
    const index = steps.findIndex((row) => row.key === from);
    const next = steps[index + 1]?.key ?? 'ready';
    setStep(next);
  }

  return <div className="training-bpf-assistant">
    <section className={`training-bpf-assistant-hero ${calculation.quality.ready ? 'ready' : ''}`}>
      <div className="training-bpf-assistant-hero-icon"><Icon name={calculation.quality.ready ? 'check' : 'sparkles'} size={25} /></div>
      <div className="training-bpf-assistant-hero-copy">
        <p className="eyebrow">ASSISTANT BPF · MODE GUIDÉ</p>
        <h2>{calculation.quality.ready ? 'Ton BPF est prêt à être déclaré' : `Préparons ton BPF ${report.reporting_year}`}</h2>
        <p>NCR reprend tes sessions, tes stagiaires et tes factures. Tu réponds uniquement aux questions qui manquent ; les cadres administratifs sont calculés derrière.</p>
      </div>
      <div className="training-bpf-assistant-progress"><strong>{progress}%</strong><span>{doneCount}/5 étapes vérifiées</span><i><b style={{ width: `${progress}%` }} /></i></div>
    </section>

    <nav className="training-bpf-assistant-steps" aria-label="Étapes de préparation du BPF">
      {steps.map((item, index) => <button key={item.key} type="button" className={`${step === item.key ? 'active' : ''} ${stepStatus[item.key] ? 'done' : ''}`} onClick={() => setStep(item.key)}>
        <span>{stepStatus[item.key] ? <Icon name="check" size={15} /> : index + 1}</span>
        <div><strong>{item.title}</strong><small>{item.hint}</small></div>
      </button>)}
    </nav>

    {step === 'identity' && <section className="training-bpf-assistant-card">
      <header><span><Icon name="building" size={22} /></span><div><p className="eyebrow">ÉTAPE 1</p><h3>Vérifions ton organisme</h3><p>Ces informations servent à identifier le déclarant. NCR ne te demande pas de les ressaisir si elles existent déjà.</p></div></header>
      <div className="training-bpf-assistant-identity-grid">
        <div className={ndaNumber ? 'ok' : 'missing'}><small>NDA</small><strong>{ndaNumber || 'À compléter'}</strong></div>
        <div className={siret ? 'ok' : 'missing'}><small>SIRET</small><strong>{siret || 'À compléter'}</strong></div>
        <div className={report.legal_form ? 'ok' : 'missing'}><small>Forme juridique</small><strong>{report.legal_form || 'À compléter'}</strong></div>
        <div className={report.naf_code ? 'ok' : 'missing'}><small>Code NAF</small><strong>{report.naf_code || 'À compléter'}</strong></div>
        <div className={report.executive_name ? 'ok' : 'missing'}><small>Dirigeant</small><strong>{report.executive_name || 'À compléter'}</strong></div>
        <div className="ok"><small>Organisme</small><strong>{organizationName}</strong></div>
      </div>
      <footer>
        {identityIssues.length ? <><p><Icon name="alert" size={16} /> Il manque : {identityIssues.join(', ')}.</p><button className="primary-button" type="button" onClick={() => onOpenExpert('financial')}>Compléter mes informations</button></> : <><p className="success"><Icon name="check" size={16} /> Les informations du déclarant sont complètes.</p><button className="primary-button" type="button" onClick={() => nextStep('identity')}>Continuer</button></>}
      </footer>
    </section>}

    {step === 'sessions' && <section className="training-bpf-assistant-card">
      <header><span><Icon name="calendar" size={22} /></span><div><p className="eyebrow">ÉTAPE 2</p><h3>Quelles formations entrent dans ton BPF ?</h3><p>NCR garde toutes tes activités, mais seules celles relevant du BPF sont intégrées au calcul.</p></div></header>
      {currentPendingSession ? <div className="training-bpf-assistant-question">
        <div className="training-bpf-assistant-question-head"><small>SESSION {sessions.length - pendingSessions.length + 1} / {sessions.length}</small><h4>{sessionLabel(currentPendingSession, programById)}</h4><p>{shortDate(currentPendingSession.starts_at)} → {shortDate(currentPendingSession.ends_at)}</p></div>
        <strong className="training-bpf-assistant-question-title">Dans quel cadre cette session a-t-elle été réalisée ?</strong>
        <div className="training-bpf-assistant-choice-grid scope">
          {scopeChoices.map((choice) => <button key={choice.value} type="button" className={choice.tone} disabled={locked || busyId === `scope-${currentPendingSession.id}`} onClick={() => void onSessionScope(currentPendingSession.id, choice.value)}><strong>{choice.title}</strong><span>{choice.text}</span><Icon name="chevronRight" size={17} /></button>)}
        </div>
        <div className="training-bpf-assistant-tip"><Icon name="info" size={17} /><span><strong>Exemple :</strong> un BTS en formation initiale reste dans ton planning et ta facturation NCR, mais il est exclu du BPF. Une formation SST professionnelle reste dans le BPF.</span></div>
      </div> : <div className="training-bpf-assistant-complete">
        <Icon name="check" size={28} /><h4>Toutes les sessions sont qualifiées</h4><p>{eligibleSessions.length} session(s) retenue(s) dans le champ BPF · {sessions.length - eligibleSessions.length} hors champ / formation initiale.</p>
        {eligibleSessions.length > 0 && <div className="training-bpf-assistant-delivery-list"><strong>Vérifie qui a porté chaque formation</strong>{eligibleSessions.slice(0, 8).map((session) => <label key={session.id}><span>{sessionLabel(session, programById)}</span><select value={session.bpf_delivery_mode ?? 'direct'} disabled={locked || busyId === `session-${session.id}`} onChange={(event) => void onSessionDelivery(session.id, event.target.value as TrainingBpfDeliveryMode)}>{Object.entries(trainingBpfDeliveryModeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>)}</div>}
        <button className="primary-button" type="button" onClick={() => nextStep('sessions')}>Continuer vers les stagiaires</button>
      </div>}
    </section>}

    {step === 'trainees' && <section className="training-bpf-assistant-card">
      <header><span><Icon name="users" size={22} /></span><div><p className="eyebrow">ÉTAPE 3</p><h3>Qui a été formé ?</h3><p>Cette information permet à NCR de répartir automatiquement les stagiaires dans les bonnes rubriques pédagogiques.</p></div></header>
      {currentPendingEnrollment && currentEnrollmentSession ? <div className="training-bpf-assistant-question">
        <div className="training-bpf-assistant-question-head"><small>{pendingEnrollments.length} PERSONNE(S) À CLASSER</small><h4>{currentTrainee ? personName(currentTrainee.first_name, currentTrainee.last_name) : 'Stagiaire'}</h4><p>{currentEnrollmentSession.title}</p></div>
        <strong className="training-bpf-assistant-question-title">Quelle était la situation de ce stagiaire ?</strong>
        <div className="training-bpf-assistant-choice-grid trainee">
          {(Object.entries(trainingBpfTraineeLabels) as Array<[TrainingBpfTraineeType, string]>).map(([key, label]) => <button key={key} type="button" disabled={locked || busyId.startsWith('enrollment-')} onClick={() => void onEnrollmentType(currentPendingEnrollment.session_id, currentPendingEnrollment.trainee_id, key)}><strong>{label}</strong><Icon name="chevronRight" size={16} /></button>)}
        </div>
        <div className="training-bpf-assistant-bulk"><span>Tous les stagiaires de <strong>{currentEnrollmentSession.title}</strong> ont le même statut ?</span><select defaultValue="" onChange={(event) => { const value = event.target.value as TrainingBpfTraineeType | ''; if (value) void onSessionEnrollmentType(currentEnrollmentSession.id, value); event.currentTarget.value = ''; }}><option value="">Classer toute la session…</option>{(Object.entries(trainingBpfTraineeLabels) as Array<[TrainingBpfTraineeType, string]>).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      </div> : <div className="training-bpf-assistant-complete"><Icon name="check" size={28} /><h4>Les stagiaires sont classés</h4><p>{enrollments.filter((row) => eligibleSessionIds.has(row.session_id) && row.status !== 'canceled').length} participation(s) analysée(s).</p><button className="primary-button" type="button" onClick={() => nextStep('trainees')}>Continuer vers les recettes</button></div>}
    </section>}

    {step === 'revenue' && <section className="training-bpf-assistant-card">
      <header><span><Icon name="creditCard" size={22} /></span><div><p className="eyebrow">ÉTAPE 4</p><h3>Qui t’a payé ?</h3><p>NCR utilise tes factures émises et te demande seulement de préciser l’origine des recettes lorsqu’elle n’est pas déjà connue.</p></div></header>
      {currentPendingInvoice ? <div className="training-bpf-assistant-question">
        <div className="training-bpf-assistant-question-head"><small>{pendingInvoices.length + pendingDocuments.length} RECETTE(S) À CLASSER</small><h4>{currentPendingInvoice.invoice_number || 'Facture'} · {currentPendingInvoice.title}</h4><p>{currentPendingInvoice.buyer_snapshot?.name || 'Payeur'} · {formatTrainingMoney(currentPendingInvoice.subtotal_cents)} HT</p></div>
        <strong className="training-bpf-assistant-question-title">Qui a financé cette prestation ?</strong>
        <div className="training-bpf-assistant-choice-grid revenue">
          {(showAllRevenueCategories ? Object.entries(trainingBpfRevenueLabels).map(([value, label]) => ({ value: value as TrainingBpfRevenueCategory, title: label.replace(/^C\d+[a-z]? · /, ''), text: label })) : quickRevenueChoices).map((choice) => <button key={choice.value} type="button" disabled={locked || busyId === `invoice-category-${currentPendingInvoice.id}`} onClick={() => void onInvoiceCategory(currentPendingInvoice.id, choice.value)}><strong>{choice.title}</strong><span>{choice.text}</span><Icon name="chevronRight" size={16} /></button>)}
        </div>
        <div className="training-bpf-assistant-inline-actions"><button className="text-button" type="button" onClick={() => setShowAllRevenueCategories((value) => !value)}>{showAllRevenueCategories ? 'Voir les choix les plus fréquents' : 'Je ne trouve pas mon cas · voir toutes les catégories'}</button><button className="text-button danger" type="button" onClick={() => void onInvoiceIncluded(currentPendingInvoice.id, false)}>Cette facture est hors BPF</button></div>
      </div> : currentPendingDocument ? <div className="training-bpf-assistant-question">
        <div className="training-bpf-assistant-question-head"><small>{pendingDocuments.length} PRODUIT(S) À CLASSER</small><h4>{currentPendingDocument.reference} · {currentPendingDocument.title}</h4><p>{formatTrainingMoney(currentPendingDocument.amount_excl_tax_cents)} HT · document commercial</p></div>
        <strong className="training-bpf-assistant-question-title">Qui a financé cette prestation ?</strong>
        <div className="training-bpf-assistant-choice-grid revenue">
          {(showAllRevenueCategories ? Object.entries(trainingBpfRevenueLabels).map(([value, label]) => ({ value: value as TrainingBpfRevenueCategory, title: label.replace(/^C\d+[a-z]? · /, ''), text: label })) : quickRevenueChoices).map((choice) => <button key={choice.value} type="button" disabled={locked || busyId === `document-category-${currentPendingDocument.id}`} onClick={() => void onDocumentCategory(currentPendingDocument.id, choice.value)}><strong>{choice.title}</strong><span>{choice.text}</span><Icon name="chevronRight" size={16} /></button>)}
        </div>
        <div className="training-bpf-assistant-inline-actions"><button className="text-button" type="button" onClick={() => setShowAllRevenueCategories((value) => !value)}>{showAllRevenueCategories ? 'Voir les choix les plus fréquents' : 'Je ne trouve pas mon cas · voir toutes les catégories'}</button><button className="text-button danger" type="button" onClick={() => void onDocumentIncluded(currentPendingDocument.id, false)}>Ce produit est hors BPF</button></div>
      </div> : <div className="training-bpf-assistant-complete"><Icon name="check" size={28} /><h4>Les recettes sont classées</h4><p>{formatTrainingMoney(calculation.financial.total_products_cents)} HT retenus pour l’exercice.</p><button className="primary-button" type="button" onClick={() => nextStep('revenue')}>Lancer le contrôle NCR</button></div>}
    </section>}

    {step === 'checks' && <section className="training-bpf-assistant-card">
      <header><span><Icon name="shield" size={22} /></span><div><p className="eyebrow">ÉTAPE 5</p><h3>NCR contrôle la cohérence</h3><p>On vérifie les informations manquantes, les incohérences pédagogiques et les recettes avant de considérer le BPF comme prêt.</p></div></header>
      <div className={`training-bpf-assistant-check-score ${calculation.quality.ready ? 'ready' : ''}`}><strong>{calculation.quality.completeness_percent}%</strong><div><b>{calculation.quality.critical_count ? `${calculation.quality.critical_count} point(s) bloquant(s)` : 'Aucun blocage détecté'}</b><span>{calculation.quality.warning_count} point(s) de vigilance</span></div><button className="secondary-button" type="button" onClick={() => void onRefresh()}><Icon name="refresh" size={16} />Recontrôler</button></div>
      {calculation.quality.warnings.length ? <div className="training-bpf-assistant-warning-list">{calculation.quality.warnings.slice(0, 10).map((warning, index) => <button key={`${warning.code}-${warning.entity_id}-${index}`} type="button" onClick={() => onOpenExpert(warning.entity_type === 'report' || warning.entity_type === 'organization' ? 'financial' : warning.entity_type === 'invoice' ? 'sources' : 'sources')}><span className={warning.severity}><Icon name={warning.severity === 'critical' ? 'alert' : 'info'} size={17} /></span><div><strong>{warning.label}</strong><small>{warning.severity === 'critical' ? 'À corriger avant validation' : 'À vérifier'}</small></div><Icon name="chevronRight" size={17} /></button>)}</div> : <div className="training-bpf-assistant-complete compact"><Icon name="check" size={26} /><h4>Aucune anomalie détectée</h4><p>Les données connues de NCR sont cohérentes pour cet exercice.</p></div>}
      <footer><button className="secondary-button" type="button" onClick={() => onOpenExpert('sources')}>Voir les données détaillées</button><button className="primary-button" type="button" disabled={!calculation.quality.ready} onClick={() => setStep('ready')}>Voir mon BPF préparé</button></footer>
    </section>}

    {step === 'ready' && <section className={`training-bpf-assistant-card training-bpf-assistant-ready ${calculation.quality.ready ? 'is-ready' : 'not-ready'}`}>
      <header><span><Icon name={calculation.quality.ready ? 'check' : 'alert'} size={25} /></span><div><p className="eyebrow">SYNTHÈSE</p><h3>{calculation.quality.ready ? 'Ton BPF est prêt à être reporté' : 'Ton BPF n’est pas encore prêt'}</h3><p>{calculation.quality.ready ? 'NCR a consolidé les données disponibles. Tu peux conserver ton dossier préparatoire puis reporter les montants sur Mon Activité Formation.' : 'Termine les points bloquants ci-dessous avant de figer ton exercice.'}</p></div></header>
      <div className="training-bpf-assistant-summary-grid">
        <article><small>Sessions BPF</small><strong>{calculation.sources.completed_sessions}</strong><span>{calculation.sources.excluded_sessions ?? 0} hors champ</span></article>
        <article><small>Stagiaires</small><strong>{calculation.trainees.total.count}</strong><span>{new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(calculation.trainees.total.hours)} h-stagiaires</span></article>
        <article><small>Produits retenus</small><strong>{formatTrainingMoney(calculation.financial.total_products_cents)}</strong><span>HT</span></article>
        <article><small>Sous-traitance reçue</small><strong>{calculation.trainees.subcontracted_for_other.count}</strong><span>stagiaires cadre G</span></article>
      </div>
      {!calculation.quality.ready && <div className="training-bpf-assistant-blocked"><Icon name="alert" size={18} /><span>{calculation.quality.critical_count} correction(s) bloquante(s) restent à effectuer.</span><button className="text-button" type="button" onClick={() => setStep('checks')}>Voir les contrôles</button></div>}
      {calculation.quality.ready && <div className="training-bpf-assistant-maf"><span><Icon name="info" size={18} /></span><div><strong>Dernière étape : la télédéclaration officielle</strong><p>NCR prépare et contrôle tes données ; la déclaration officielle reste à saisir sur Mon Activité Formation. Garde le PDF préparatoire à côté de toi pour reporter les cadres.</p></div></div>}
      <div className="training-bpf-assistant-final-actions"><button className="secondary-button" type="button" onClick={() => void onExportPdf()}><Icon name="file" size={17} />Télécharger le dossier PDF</button><button className="secondary-button" type="button" onClick={onExportCsv}><Icon name="chart" size={17} />Exporter CSV</button>{report.status === 'draft' && <button className="secondary-button" type="button" onClick={() => void onMarkReviewed()} disabled={!calculation.quality.ready}>Marquer comme vérifié</button>}{report.status === 'reviewed' && <button className="primary-button" type="button" onClick={() => void onLock()} disabled={!calculation.quality.ready || locked}><Icon name="lock" size={17} />Verrouiller mon BPF</button>}</div>
    </section>}
  </div>;
}
