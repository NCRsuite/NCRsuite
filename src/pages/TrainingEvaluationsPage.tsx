import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatDateTime,
  personName,
  type TrainingEvaluationType,
  type TrainingSessionRecord,
  type TrainingSatisfactionRecord,
  type TrainingSatisfactionSummary,
  type TrainingTraineeRecord
} from '../features/training/types';
import { supabase } from '../lib/supabase';

const EMPTY_SUMMARY: TrainingSatisfactionSummary = {
  total: 0,
  completed: 0,
  pending: 0,
  response_rate: 0,
  average_rating: null,
  recommendation_rate: 0
};

function scoreLabel(value: number | null) {
  return value == null ? '—' : `${Number(value).toFixed(1)} / 5`;
}

function responseAverage(item: TrainingSatisfactionRecord) {
  if (item.evaluation_type === 'initial') return item.initial_level;
  const values = [item.content_rating, item.trainer_rating, item.organization_rating, item.objectives_rating]
    .filter((value): value is number => typeof value === 'number');
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function evaluationLabel(type: TrainingEvaluationType) {
  return type === 'initial' ? 'Évaluation initiale' : 'Évaluation finale';
}

export function TrainingEvaluationsPage() {
  const { organization, activeSiteId, refreshOrganizations } = useOrganization();
  const [searchParams, setSearchParams] = useSearchParams();
  const { demoMode } = useAuth();
  const [sessions, setSessions] = useState<TrainingSessionRecord[]>([]);
  const [trainees, setTrainees] = useState<TrainingTraineeRecord[]>([]);
  const [surveys, setSurveys] = useState<TrainingSatisfactionRecord[]>([]);
  const [summary, setSummary] = useState<TrainingSatisfactionSummary>(EMPTY_SUMMARY);
  const [sessionId, setSessionId] = useState(() => searchParams.get('session') ?? '');
  const [evaluationType, setEvaluationType] = useState<TrainingEvaluationType>(() => searchParams.get('type') === 'initial' ? 'initial' : 'final');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState({
    initialEnabled: true,
    initialLeadHours: '24',
    initialIntro: '',
    finalEnabled: true,
    finalDelayHours: '0',
    finalIntro: '',
    reminderEnabled: true,
    reminderDelayHours: '24',
    reminderMaxCount: '2',
    attestationAutoSend: true,
    attestationRequiresFinal: true
  });

  const canManage = ['owner', 'admin', 'manager', 'employee'].includes(organization?.role ?? 'viewer');
  const canConfigure = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');

  useEffect(() => {
    if (!organization) return;
    setSettings({
      initialEnabled: organization.training_initial_evaluation_enabled ?? true,
      initialLeadHours: String(organization.training_initial_evaluation_lead_hours ?? 24),
      initialIntro: organization.training_initial_evaluation_intro ?? '',
      finalEnabled: organization.training_satisfaction_enabled ?? true,
      finalDelayHours: String(organization.training_satisfaction_delay_hours ?? 0),
      finalIntro: organization.training_satisfaction_intro ?? '',
      reminderEnabled: organization.training_evaluation_reminder_enabled ?? true,
      reminderDelayHours: String(organization.training_evaluation_reminder_delay_hours ?? 24),
      reminderMaxCount: String(organization.training_evaluation_reminder_max_count ?? 2),
      attestationAutoSend: organization.training_attestation_auto_send ?? true,
      attestationRequiresFinal: organization.training_attestation_requires_final_evaluation ?? true
    });
  }, [organization]);

  async function loadData() {
    if (!organization) return;
    setLoading(true); setError('');
    if (demoMode || !supabase) {
      setSessions([]); setTrainees([]); setSurveys([]); setSummary(EMPTY_SUMMARY); setLoading(false); return;
    }

    let sessionQuery = supabase
      .from('training_sessions')
      .select('id,organization_id,site_id,program_id,trainer_id,title,starts_at,ends_at,capacity,location,modality,status,notes,closed_at,delivery_completed_at,closure_automation_started_at,training_dossier_finalized_at,training_dossier_auto_completed,created_at')
      .eq('organization_id', organization.id)
      .order('starts_at', { ascending: false });
    let surveyQuery = supabase
      .from('training_satisfaction_surveys')
      .select('id,organization_id,site_id,session_id,trainee_id,public_token,evaluation_type,status,scheduled_for,emailed_at,completed_at,content_rating,trainer_rating,organization_rating,objectives_rating,recommend,comment,improvement,initial_level,initial_expectations,initial_objectives,initial_needs,reminder_count,last_reminded_at,created_at,updated_at')
      .eq('organization_id', organization.id)
      .eq('evaluation_type', evaluationType)
      .order('created_at', { ascending: false });
    if (activeSiteId) {
      sessionQuery = sessionQuery.eq('site_id', activeSiteId);
      surveyQuery = surveyQuery.eq('site_id', activeSiteId);
    }
    if (sessionId) surveyQuery = surveyQuery.eq('session_id', sessionId);

    const [sessionsResult, traineesResult, surveysResult, summaryResult] = await Promise.all([
      sessionQuery,
      supabase.from('training_trainees').select('id,organization_id,first_name,last_name,email,phone,company,notes,status,created_at').eq('organization_id', organization.id),
      surveyQuery,
      supabase.rpc('training_evaluation_summary', {
        p_organization_id: organization.id,
        p_site_id: activeSiteId,
        p_session_id: sessionId || null,
        p_evaluation_type: evaluationType
      })
    ]);
    const firstError = sessionsResult.error || traineesResult.error || surveysResult.error || summaryResult.error;
    if (firstError) setError(`Chargement impossible : ${firstError.message}`);
    else {
      setSessions((sessionsResult.data ?? []) as TrainingSessionRecord[]);
      setTrainees((traineesResult.data ?? []) as TrainingTraineeRecord[]);
      setSurveys((surveysResult.data ?? []).map((row) => ({ ...row, reminder_count: Number(row.reminder_count ?? 0) })) as TrainingSatisfactionRecord[]);
      setSummary({ ...EMPTY_SUMMARY, ...((summaryResult.data ?? {}) as Partial<TrainingSatisfactionSummary>) });
    }
    setLoading(false);
  }

  useEffect(() => { void loadData(); }, [organization?.id, activeSiteId, sessionId, evaluationType, demoMode]);

  const sessionMap = useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions]);
  const traineeMap = useMemo(() => new Map(trainees.map((trainee) => [trainee.id, trainee])), [trainees]);
  const eligibleSession = useMemo(() => {
    const selected = sessions.find((session) => session.id === sessionId);
    if (!selected) return false;
    return evaluationType === 'initial' ? ['scheduled', 'in_progress'].includes(selected.status) : selected.status === 'completed';
  }, [sessions, sessionId, evaluationType]);

  function updateFilters(nextSession: string, nextType: TrainingEvaluationType) {
    setSessionId(nextSession);
    setEvaluationType(nextType);
    const next = new URLSearchParams();
    if (nextSession) next.set('session', nextSession);
    next.set('type', nextType);
    setSearchParams(next);
  }

  async function saveSettings() {
    if (!organization || !supabase) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const { error: rpcError } = await supabase.rpc('update_training_evaluation_settings', {
        p_organization_id: organization.id,
        p_initial_enabled: settings.initialEnabled,
        p_initial_lead_hours: Number(settings.initialLeadHours),
        p_initial_intro: settings.initialIntro,
        p_final_enabled: settings.finalEnabled,
        p_final_delay_hours: Number(settings.finalDelayHours),
        p_final_intro: settings.finalIntro,
        p_reminder_enabled: settings.reminderEnabled,
        p_reminder_delay_hours: Number(settings.reminderDelayHours),
        p_reminder_max_count: Number(settings.reminderMaxCount),
        p_attestation_auto_send: settings.attestationAutoSend,
        p_attestation_requires_final: settings.attestationRequiresFinal
      });
      if (rpcError) throw rpcError;
      refreshOrganizations();
      setSuccess('Le parcours d’évaluation et d’attestation a été enregistré.');
    } catch (caught) {
      setError(`Enregistrement impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setSaving(false); }
  }

  async function queueSession() {
    if (!organization || !sessionId || !supabase) return;
    setQueueing(true); setError(''); setSuccess('');
    try {
      const { data, error: rpcError } = await supabase.rpc('queue_training_session_evaluation', {
        p_organization_id: organization.id,
        p_session_id: sessionId,
        p_evaluation_type: evaluationType,
        p_send_email: true,
        p_force: true
      });
      if (rpcError) throw rpcError;
      const result = (data ?? {}) as { queued?: number; already_completed?: number; without_email?: number };
      setSuccess(`${result.queued ?? 0} envoi(s) ou relance(s) placé(s) dans Brevo.${result.already_completed ? ` ${result.already_completed} réponse(s) déjà complète(s).` : ''}${result.without_email ? ` ${result.without_email} stagiaire(s) sans adresse e-mail.` : ''}`);
      await loadData();
    } catch (caught) {
      setError(`Envoi impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setQueueing(false); }
  }

  async function copyLink(survey: TrainingSatisfactionRecord) {
    const url = `${window.location.origin}/evaluation/${survey.public_token}`;
    try {
      await navigator.clipboard.writeText(url);
      setSuccess('Le lien individuel a été copié.');
    } catch {
      window.prompt('Copie ce lien individuel :', url);
    }
  }

  if (!organization) return null;

  return (
    <div className="page training-page training-evaluations-page training-evaluations-v2152">
      <header className="page-header training-evaluation-page-header">
        <div><p className="eyebrow">PARCOURS QUALITÉ AUTOMATISÉ</p><h1>Évaluations début & fin</h1><p>Préparez la session, recueillez les retours, relancez automatiquement et déclenchez les attestations.</p></div>
        <div className="training-evaluation-header-badge"><Icon name="sparkles" size={19} /><span><strong>Brevo connecté</strong><small>Envois et relances automatiques</small></span></div>
      </header>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      <section className="training-evaluation-mode-switch" aria-label="Type d’évaluation">
        <button type="button" className={evaluationType === 'initial' ? 'active' : ''} onClick={() => updateFilters(sessionId, 'initial')}><span><Icon name="activity" size={18} /></span><div><strong>Début de session</strong><small>Attentes, niveau et besoins</small></div></button>
        <button type="button" className={evaluationType === 'final' ? 'active' : ''} onClick={() => updateFilters(sessionId, 'final')}><span><Icon name="chart" size={18} /></span><div><strong>Fin de session</strong><small>Satisfaction et objectifs atteints</small></div></button>
      </section>

      <section className="panel evaluation-settings-panel evaluation-automation-workspace">
        <div className="panel-header"><div><p className="eyebrow">AUTOMATISATION</p><h2>Un parcours réglé une seule fois</h2><p>La validation envoie l’évaluation initiale. La fin de session envoie l’évaluation finale puis l’attestation.</p></div><span className={`evaluation-automation-status ${(settings.initialEnabled || settings.finalEnabled) ? 'active' : ''}`}>{(settings.initialEnabled || settings.finalEnabled) ? 'Actif' : 'Désactivé'}</span></div>
        <div className="training-evaluation-settings-columns">
          <article>
            <div className="training-evaluation-settings-title"><span><Icon name="activity" size={18} /></span><div><strong>Évaluation initiale</strong><small>Envoyée avant le démarrage</small></div></div>
            <label className="toggle-card"><input type="checkbox" checked={settings.initialEnabled} disabled={!canConfigure} onChange={(event) => setSettings((current) => ({ ...current, initialEnabled: event.target.checked }))} /><span><strong>Activer l’envoi</strong><small>Un lien personnel est créé dès la validation de la session.</small></span></label>
            <label>Délai avant la session<select value={settings.initialLeadHours} disabled={!canConfigure} onChange={(event) => setSettings((current) => ({ ...current, initialLeadHours: event.target.value }))}><option value="0">Au moment du démarrage</option><option value="2">2 heures avant</option><option value="24">24 heures avant</option><option value="48">48 heures avant</option><option value="72">3 jours avant</option><option value="168">7 jours avant</option></select></label>
            <label>Message d’introduction<textarea rows={3} maxLength={1200} value={settings.initialIntro} disabled={!canConfigure} placeholder="Aidez-nous à préparer une session adaptée à vos besoins…" onChange={(event) => setSettings((current) => ({ ...current, initialIntro: event.target.value }))} /></label>
          </article>
          <article>
            <div className="training-evaluation-settings-title"><span><Icon name="chart" size={18} /></span><div><strong>Évaluation finale</strong><small>Déclenchée à la fin</small></div></div>
            <label className="toggle-card"><input type="checkbox" checked={settings.finalEnabled} disabled={!canConfigure} onChange={(event) => setSettings((current) => ({ ...current, finalEnabled: event.target.checked }))} /><span><strong>Activer l’envoi</strong><small>Le questionnaire part lorsque la session est terminée.</small></span></label>
            <label>Délai après la session<select value={settings.finalDelayHours} disabled={!canConfigure} onChange={(event) => setSettings((current) => ({ ...current, finalDelayHours: event.target.value }))}><option value="0">Immédiatement</option><option value="1">Après 1 heure</option><option value="6">Après 6 heures</option><option value="24">Après 24 heures</option><option value="48">Après 48 heures</option></select></label>
            <label>Message d’introduction<textarea rows={3} maxLength={1200} value={settings.finalIntro} disabled={!canConfigure} placeholder="Merci de prendre quelques instants pour évaluer votre formation…" onChange={(event) => setSettings((current) => ({ ...current, finalIntro: event.target.value }))} /></label>
          </article>
          <article className="training-evaluation-settings-wide">
            <div className="training-evaluation-settings-title"><span><Icon name="refresh" size={18} /></span><div><strong>Relances & attestations</strong><small>Clôture sans tâches répétitives</small></div></div>
            <div className="training-evaluation-settings-inline">
              <label className="toggle-card"><input type="checkbox" checked={settings.reminderEnabled} disabled={!canConfigure} onChange={(event) => setSettings((current) => ({ ...current, reminderEnabled: event.target.checked }))} /><span><strong>Relances automatiques</strong><small>Brevo relance uniquement les questionnaires sans réponse.</small></span></label>
              <label>Délai entre les relances<select value={settings.reminderDelayHours} disabled={!canConfigure || !settings.reminderEnabled} onChange={(event) => setSettings((current) => ({ ...current, reminderDelayHours: event.target.value }))}><option value="12">12 heures</option><option value="24">24 heures</option><option value="48">48 heures</option><option value="72">3 jours</option><option value="168">7 jours</option></select></label>
              <label>Nombre maximal<select value={settings.reminderMaxCount} disabled={!canConfigure || !settings.reminderEnabled} onChange={(event) => setSettings((current) => ({ ...current, reminderMaxCount: event.target.value }))}><option value="0">Aucune</option><option value="1">1 relance</option><option value="2">2 relances</option><option value="3">3 relances</option></select></label>
              <label className="toggle-card"><input type="checkbox" checked={settings.attestationAutoSend} disabled={!canConfigure} onChange={(event) => setSettings((current) => ({ ...current, attestationAutoSend: event.target.checked }))} /><span><strong>Attestation automatique</strong><small>Générée et envoyée par Brevo après la clôture.</small></span></label>
              <label className="toggle-card"><input type="checkbox" checked={settings.attestationRequiresFinal} disabled={!canConfigure || !settings.attestationAutoSend} onChange={(event) => setSettings((current) => ({ ...current, attestationRequiresFinal: event.target.checked }))} /><span><strong>Après réponse finale</strong><small>L’attestation part dès que le stagiaire valide son évaluation de fin.</small></span></label>
            </div>
          </article>
        </div>
        {canConfigure && <div className="form-actions"><button className="primary-button" type="button" onClick={saveSettings} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer l’automatisation'}</button></div>}
      </section>

      <section className="panel evaluation-filter-panel">
        <div className="evaluation-filter-grid">
          <label>Session<select value={sessionId} onChange={(event) => updateFilters(event.target.value, evaluationType)}><option value="">Toutes les sessions</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.title} · {formatDateTime(session.starts_at)}</option>)}</select></label>
          <div className="evaluation-send-control"><span>Envoi ou relance manuelle</span><button className="secondary-button" type="button" disabled={!canManage || !sessionId || !eligibleSession || queueing} onClick={queueSession}><Icon name="refresh" size={18} />{queueing ? 'Mise en file…' : `Envoyer ${evaluationType === 'initial' ? 'le début' : 'la fin'}`}</button><small>{sessionId && !eligibleSession ? (evaluationType === 'initial' ? 'La session doit être validée et non terminée.' : 'La session doit être terminée.') : 'Les réponses déjà complétées ne sont jamais réinitialisées.'}</small></div>
        </div>
      </section>

      <section className="evaluation-stats-grid">
        <article><span className="evaluation-stat-icon"><Icon name="clipboard" size={20} /></span><div><strong>{summary.total ?? 0}</strong><small>{evaluationLabel(evaluationType).toLowerCase()} créée{(summary.total ?? 0) > 1 ? 's' : ''}</small></div></article>
        <article><span className="evaluation-stat-icon completed"><Icon name="check" size={20} /></span><div><strong>{summary.response_rate ?? 0} %</strong><small>taux de réponse</small></div></article>
        <article><span className="evaluation-stat-icon score"><Icon name="chart" size={20} /></span><div><strong>{scoreLabel(summary.average_rating)}</strong><small>{evaluationType === 'initial' ? 'niveau moyen déclaré' : 'note moyenne'}</small></div></article>
        <article><span className="evaluation-stat-icon recommend"><Icon name={evaluationType === 'initial' ? 'activity' : 'users'} size={20} /></span><div><strong>{evaluationType === 'initial' ? `${summary.completed ?? 0}/${summary.total ?? 0}` : `${summary.recommendation_rate ?? 0} %`}</strong><small>{evaluationType === 'initial' ? 'profils préparés' : 'recommanderaient la formation'}</small></div></article>
      </section>

      <section className="panel training-list-panel evaluation-responses-panel">
        <div className="panel-header"><div><p className="eyebrow">SUIVI INDIVIDUEL</p><h2>{summary.completed ?? 0} réponse{(summary.completed ?? 0) > 1 ? 's' : ''} reçue{(summary.completed ?? 0) > 1 ? 's' : ''}</h2></div><span className="attendance-count">{summary.pending ?? 0} en attente</span></div>
        {loading ? <div className="training-empty">Chargement…</div> : surveys.length === 0 ? <div className="training-empty"><Icon name="chart" size={30} /><strong>Aucune évaluation</strong><span>Valide une session ou termine-la pour lancer automatiquement les questionnaires.</span></div> : (
          <div className="evaluation-response-list">
            {surveys.map((survey) => {
              const trainee = traineeMap.get(survey.trainee_id);
              const session = sessionMap.get(survey.session_id);
              const average = responseAverage(survey);
              return (
                <article key={survey.id} className={`evaluation-response-card status-${survey.status} type-${survey.evaluation_type}`}>
                  <div className="evaluation-response-avatar">{(trainee?.first_name?.[0] ?? 'S').toUpperCase()}</div>
                  <div className="evaluation-response-main">
                    <div><strong>{trainee ? personName(trainee.first_name, trainee.last_name) : 'Stagiaire'}</strong><span>{session?.title ?? 'Session'} · {survey.completed_at ? `Répondu le ${formatDateTime(survey.completed_at)}` : survey.emailed_at ? `Envoyé${survey.reminder_count ? ` · ${survey.reminder_count} relance${survey.reminder_count > 1 ? 's' : ''}` : ''}` : `Programmé le ${formatDateTime(survey.scheduled_for)}`}</span></div>
                    {survey.status === 'completed' ? survey.evaluation_type === 'initial' ? <>
                      <div className="evaluation-score-row"><span>Niveau déclaré <b>{survey.initial_level}/5</b></span></div>
                      {survey.initial_expectations && <p><strong>Attentes :</strong> {survey.initial_expectations}</p>}
                      {survey.initial_objectives && <p><strong>Objectif :</strong> {survey.initial_objectives}</p>}
                      {survey.initial_needs && <p><strong>Besoin particulier :</strong> {survey.initial_needs}</p>}
                    </> : <>
                      <div className="evaluation-score-row"><span>Contenu <b>{survey.content_rating}/5</b></span><span>Formateur <b>{survey.trainer_rating}/5</b></span><span>Organisation <b>{survey.organization_rating}/5</b></span><span>Objectifs <b>{survey.objectives_rating}/5</b></span></div>
                      {survey.comment && <p><strong>Commentaire :</strong> {survey.comment}</p>}{survey.improvement && <p><strong>Amélioration :</strong> {survey.improvement}</p>}
                    </> : <div className="evaluation-pending-actions"><p className="evaluation-pending-copy">Le lien individuel reste disponible tant que l’évaluation n’est pas complétée.</p><button type="button" onClick={() => void copyLink(survey)}><Icon name="file" size={14} />Copier le lien</button></div>}
                  </div>
                  <div className="evaluation-response-result"><strong>{average == null ? '—' : Number(average).toFixed(1)}</strong><span>{survey.status === 'completed' ? '/ 5' : survey.status === 'sent' ? 'Envoyé' : 'Planifié'}</span>{survey.evaluation_type === 'final' && survey.status === 'completed' && <small>{survey.recommend ? 'Recommande' : 'Ne recommande pas'}</small>}</div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
