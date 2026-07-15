import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatDateTime,
  personName,
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
  const values = [item.content_rating, item.trainer_rating, item.organization_rating, item.objectives_rating]
    .filter((value): value is number => typeof value === 'number');
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState({ enabled: true, delayHours: '0', intro: '' });

  const canManage = ['owner', 'admin', 'manager', 'employee'].includes(organization?.role ?? 'viewer');
  const canConfigure = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');

  useEffect(() => {
    if (!organization) return;
    setSettings({
      enabled: organization.training_satisfaction_enabled ?? true,
      delayHours: String(organization.training_satisfaction_delay_hours ?? 0),
      intro: organization.training_satisfaction_intro ?? ''
    });
  }, [organization?.id, organization?.training_satisfaction_enabled, organization?.training_satisfaction_delay_hours, organization?.training_satisfaction_intro]);

  async function loadData() {
    if (!organization) return;
    setLoading(true); setError('');
    if (demoMode || !supabase) {
      setSessions([]); setTrainees([]); setSurveys([]); setSummary(EMPTY_SUMMARY); setLoading(false); return;
    }

    let sessionQuery = supabase
      .from('training_sessions')
      .select('id,organization_id,site_id,program_id,trainer_id,title,starts_at,ends_at,capacity,location,modality,status,notes,created_at')
      .eq('organization_id', organization.id)
      .order('starts_at', { ascending: false });
    let surveyQuery = supabase
      .from('training_satisfaction_surveys')
      .select('id,organization_id,site_id,session_id,trainee_id,public_token,status,scheduled_for,emailed_at,completed_at,content_rating,trainer_rating,organization_rating,objectives_rating,recommend,comment,improvement,created_at,updated_at')
      .eq('organization_id', organization.id)
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
      supabase.rpc('training_satisfaction_summary', {
        p_organization_id: organization.id,
        p_site_id: activeSiteId,
        p_session_id: sessionId || null
      })
    ]);
    const firstError = sessionsResult.error || traineesResult.error || surveysResult.error || summaryResult.error;
    if (firstError) setError(`Chargement impossible : ${firstError.message}`);
    else {
      setSessions((sessionsResult.data ?? []) as TrainingSessionRecord[]);
      setTrainees((traineesResult.data ?? []) as TrainingTraineeRecord[]);
      setSurveys((surveysResult.data ?? []) as TrainingSatisfactionRecord[]);
      setSummary({ ...EMPTY_SUMMARY, ...((summaryResult.data ?? {}) as Partial<TrainingSatisfactionSummary>) });
    }
    setLoading(false);
  }

  useEffect(() => { void loadData(); }, [organization?.id, activeSiteId, sessionId, demoMode]);

  const sessionMap = useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions]);
  const traineeMap = useMemo(() => new Map(trainees.map((trainee) => [trainee.id, trainee])), [trainees]);
  const completedSessions = useMemo(() => sessions.filter((session) => session.status === 'completed'), [sessions]);

  async function saveSettings() {
    if (!organization || !supabase) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const delay = Number(settings.delayHours);
      const { error: rpcError } = await supabase.rpc('update_training_satisfaction_settings', {
        p_organization_id: organization.id,
        p_enabled: settings.enabled,
        p_delay_hours: Number.isFinite(delay) ? delay : 0,
        p_intro: settings.intro
      });
      if (rpcError) throw rpcError;
      refreshOrganizations();
      setSuccess('Les réglages des questionnaires ont été enregistrés.');
    } catch (caught) {
      setError(`Enregistrement impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setSaving(false); }
  }

  async function queueSession() {
    if (!organization || !sessionId || !supabase) return;
    setQueueing(true); setError(''); setSuccess('');
    try {
      const { data, error: rpcError } = await supabase.rpc('queue_training_session_satisfaction', {
        p_organization_id: organization.id,
        p_session_id: sessionId,
        p_send_email: true,
        p_force: true
      });
      if (rpcError) throw rpcError;
      const result = (data ?? {}) as { queued?: number; without_email?: number };
      setSuccess(`${result.queued ?? 0} questionnaire(s) mis en file.${result.without_email ? ` ${result.without_email} stagiaire(s) sans adresse e-mail.` : ''}`);
      await loadData();
    } catch (caught) {
      setError(`Envoi impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setQueueing(false); }
  }

  if (!organization) return null;

  return (
    <div className="page training-page training-evaluations-page">
      <header className="page-header">
        <div><p className="eyebrow">QUALITÉ FORMATION</p><h1>Évaluations & satisfaction</h1><p>Envoyez un questionnaire aux stagiaires et suivez les retours de chaque session.</p></div>
      </header>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      <section className="panel evaluation-settings-panel">
        <div className="panel-header"><div><p className="eyebrow">AUTOMATISATION</p><h2>Questionnaire de fin de session</h2><p>L’envoi est déclenché lorsqu’une session passe au statut Terminée.</p></div><span className={`evaluation-automation-status ${settings.enabled ? 'active' : ''}`}>{settings.enabled ? 'Actif' : 'Désactivé'}</span></div>
        <div className="evaluation-settings-grid">
          <label className="toggle-card"><input type="checkbox" checked={settings.enabled} disabled={!canConfigure} onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))} /><span><strong>Envoi automatique</strong><small>Un lien individuel est envoyé à chaque stagiaire disposant d’un e-mail.</small></span></label>
          <label>Délai après la fin de session<select value={settings.delayHours} disabled={!canConfigure} onChange={(event) => setSettings((current) => ({ ...current, delayHours: event.target.value }))}><option value="0">Immédiatement</option><option value="1">Après 1 heure</option><option value="6">Après 6 heures</option><option value="24">Après 24 heures</option><option value="48">Après 48 heures</option></select></label>
          <label className="full-field">Message d’introduction facultatif<textarea rows={3} maxLength={1200} value={settings.intro} disabled={!canConfigure} placeholder="Merci de prendre quelques instants pour évaluer votre formation…" onChange={(event) => setSettings((current) => ({ ...current, intro: event.target.value }))} /></label>
        </div>
        {canConfigure && <div className="form-actions"><button className="primary-button" type="button" onClick={saveSettings} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer les réglages'}</button></div>}
      </section>

      <section className="panel evaluation-filter-panel">
        <div className="evaluation-filter-grid">
          <label>Session<select value={sessionId} onChange={(event) => { const value = event.target.value; setSessionId(value); setSearchParams(value ? { session: value } : {}); }}><option value="">Toutes les sessions</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.title} · {formatDateTime(session.starts_at)}</option>)}</select></label>
          <div className="evaluation-send-control"><span>Relance manuelle</span><button className="secondary-button" type="button" disabled={!canManage || !sessionId || !completedSessions.some((session) => session.id === sessionId) || queueing} onClick={queueSession}><Icon name="file" size={18} />{queueing ? 'Mise en file…' : 'Envoyer / relancer'}</button><small>Sélectionne une session terminée.</small></div>
        </div>
      </section>

      <section className="evaluation-stats-grid">
        <article><span className="evaluation-stat-icon"><Icon name="clipboard" size={20} /></span><div><strong>{summary.total ?? 0}</strong><small>questionnaires créés</small></div></article>
        <article><span className="evaluation-stat-icon completed"><Icon name="check" size={20} /></span><div><strong>{summary.response_rate ?? 0} %</strong><small>taux de réponse</small></div></article>
        <article><span className="evaluation-stat-icon score"><Icon name="chart" size={20} /></span><div><strong>{scoreLabel(summary.average_rating)}</strong><small>note moyenne</small></div></article>
        <article><span className="evaluation-stat-icon recommend"><Icon name="users" size={20} /></span><div><strong>{summary.recommendation_rate ?? 0} %</strong><small>recommanderaient la formation</small></div></article>
      </section>

      <section className="panel training-list-panel evaluation-responses-panel">
        <div className="panel-header"><div><p className="eyebrow">RÉPONSES</p><h2>{summary.completed ?? 0} retour{(summary.completed ?? 0) > 1 ? 's' : ''} reçu{(summary.completed ?? 0) > 1 ? 's' : ''}</h2></div><span className="attendance-count">{summary.pending ?? 0} en attente</span></div>
        {loading ? <div className="training-empty">Chargement…</div> : surveys.length === 0 ? <div className="training-empty"><Icon name="chart" size={30} /><strong>Aucune évaluation</strong><span>Termine une session ou utilise le bouton de relance pour créer les questionnaires.</span></div> : (
          <div className="evaluation-response-list">
            {surveys.map((survey) => {
              const trainee = traineeMap.get(survey.trainee_id);
              const session = sessionMap.get(survey.session_id);
              const average = responseAverage(survey);
              return (
                <article key={survey.id} className={`evaluation-response-card status-${survey.status}`}>
                  <div className="evaluation-response-avatar">{(trainee?.first_name?.[0] ?? 'S').toUpperCase()}</div>
                  <div className="evaluation-response-main">
                    <div><strong>{trainee ? personName(trainee.first_name, trainee.last_name) : 'Stagiaire'}</strong><span>{session?.title ?? 'Session'} · {survey.completed_at ? `Répondu le ${formatDateTime(survey.completed_at)}` : survey.emailed_at ? 'Questionnaire envoyé' : 'En attente d’envoi'}</span></div>
                    {survey.status === 'completed' ? <><div className="evaluation-score-row"><span>Contenu <b>{survey.content_rating}/5</b></span><span>Formateur <b>{survey.trainer_rating}/5</b></span><span>Organisation <b>{survey.organization_rating}/5</b></span><span>Objectifs <b>{survey.objectives_rating}/5</b></span></div>{survey.comment && <p><strong>Commentaire :</strong> {survey.comment}</p>}{survey.improvement && <p><strong>Amélioration :</strong> {survey.improvement}</p>}</> : <p className="evaluation-pending-copy">Le lien individuel reste disponible tant que le questionnaire n’est pas complété.</p>}
                  </div>
                  <div className="evaluation-response-result"><strong>{average == null ? '—' : average.toFixed(1)}</strong><span>{survey.status === 'completed' ? '/ 5' : survey.status === 'sent' ? 'Envoyé' : 'En attente'}</span>{survey.status === 'completed' && <small>{survey.recommend ? 'Recommande' : 'Ne recommande pas'}</small>}</div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
