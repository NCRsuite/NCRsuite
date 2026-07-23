import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { StatCard } from '../components/StatCard';
import { organizationHasFeature } from '../config/planEntitlements';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  buildTrainingQualityDashboard,
  qualityPeriodLabel,
  type TrainingQualityIssue,
  type TrainingQualityPeriod,
  type TrainingQualitySeverity
} from '../features/training/qualityDashboard';
import { generateTrainingQualityCsv } from '../features/training/qualityCsv';
import type {
  TrainingAttendanceRecord,
  TrainingDocumentRecord,
  TrainingEnrollmentRecord,
  TrainingSatisfactionRecord,
  TrainingSessionRecord
} from '../features/training/types';
import { closeFileWindow, navigateFileWindow, prepareFileWindow, showBlobDownload } from '../lib/browserFiles';
import { supabase } from '../lib/supabase';

type IssueFilter = 'all' | TrainingQualitySeverity;

function percentValue(value: number | null) {
  return value == null ? '—' : `${value.toLocaleString('fr-FR')} %`;
}

function severityLabel(issue: TrainingQualityIssue) {
  if (issue.severity === 'critical') return 'Bloquant';
  if (issue.severity === 'warning') return 'À vérifier';
  if (issue.severity === 'ready') return 'Prêt';
  return 'Information';
}

function dateRangeLabel(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const formatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  if (start.toDateString() === end.toDateString()) return formatter.format(start);
  return `${formatter.format(start)} → ${formatter.format(end)}`;
}

export function TrainingDashboardPage() {
  const { organization, activeSiteId, activeSite } = useOrganization();
  const { demoMode } = useAuth();
  const [sessions, setSessions] = useState<TrainingSessionRecord[]>([]);
  const [enrollments, setEnrollments] = useState<TrainingEnrollmentRecord[]>([]);
  const [documents, setDocuments] = useState<TrainingDocumentRecord[]>([]);
  const [attendance, setAttendance] = useState<TrainingAttendanceRecord[]>([]);
  const [satisfaction, setSatisfaction] = useState<TrainingSatisfactionRecord[]>([]);
  const [periodDays, setPeriodDays] = useState<TrainingQualityPeriod>(90);
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('all');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'pdf' | 'csv' | ''>('');
  const [error, setError] = useState('');

  const digitalAttendanceEnabled = Boolean(organization && organizationHasFeature(organization, 'training_digital_attendance'));
  const satisfactionEnabled = Boolean(organization && organizationHasFeature(organization, 'training_satisfaction'));

  useEffect(() => {
    if (!organization) return;
    let active = true;
    const organizationId = organization.id;

    async function load() {
      setLoading(true);
      setError('');

      if (demoMode || !supabase) {
        const get = <T,>(key: string): T => {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw) as T : [] as T;
        };
        if (active) {
          setSessions(get<TrainingSessionRecord[]>(`ncr-suite-training-sessions-${organizationId}`).filter((session) => !activeSiteId || session.site_id === activeSiteId));
          setEnrollments(get<TrainingEnrollmentRecord[]>(`ncr-suite-training-enrollments-${organizationId}`));
          setDocuments(get<TrainingDocumentRecord[]>(`ncr-suite-training-documents-${organizationId}`).filter((document) => !activeSiteId || document.site_id === activeSiteId));
          setAttendance(digitalAttendanceEnabled ? get<TrainingAttendanceRecord[]>(`ncr-suite-training-attendance-${organizationId}`).filter((row) => !activeSiteId || row.site_id === activeSiteId) : []);
          setSatisfaction(satisfactionEnabled ? get<TrainingSatisfactionRecord[]>(`ncr-suite-training-satisfaction-${organizationId}`).filter((row) => !activeSiteId || row.site_id === activeSiteId) : []);
          setLoading(false);
        }
        return;
      }

      let sessionsQuery = supabase
        .from('training_sessions')
        .select('id,organization_id,site_id,program_id,trainer_id,title,starts_at,ends_at,capacity,location,modality,status,notes,closed_at,closed_by,closure_notes,reopened_at,reopened_by,created_at')
        .eq('organization_id', organizationId)
        .order('starts_at', { ascending: false });
      let documentsQuery = supabase
        .from('training_documents')
        .select('id,organization_id,site_id,session_id,program_id,trainee_id,title,category,storage_path,mime_type,size_bytes,visibility,status,notes,generated_automatically,automation_key,generated_at,emailed_at,created_at')
        .eq('organization_id', organizationId)
        .neq('status', 'archived');
      if (activeSiteId) {
        sessionsQuery = sessionsQuery.eq('site_id', activeSiteId);
        documentsQuery = documentsQuery.eq('site_id', activeSiteId);
      }

      const sessionsResultPromise = sessionsQuery;
      const enrollmentsResultPromise = supabase
        .from('training_session_enrollments')
        .select('organization_id,session_id,trainee_id,status')
        .eq('organization_id', organizationId);
      const documentsResultPromise = documentsQuery;
      const attendanceResultPromise = digitalAttendanceEnabled
        ? (() => {
            let query = supabase
              .from('training_attendance')
              .select('id,organization_id,site_id,session_id,trainee_id,attendance_date,period,status,signature_path,signatory_name,signed_at,notes,created_at,updated_at')
              .eq('organization_id', organizationId);
            if (activeSiteId) query = query.eq('site_id', activeSiteId);
            return query;
          })()
        : Promise.resolve({ data: [], error: null });
      const satisfactionResultPromise = satisfactionEnabled
        ? (() => {
            let query = supabase
              .from('training_satisfaction_surveys')
              .select('id,organization_id,site_id,session_id,trainee_id,public_token,status,scheduled_for,emailed_at,completed_at,content_rating,trainer_rating,organization_rating,objectives_rating,recommend,comment,improvement,created_at,updated_at')
              .eq('organization_id', organizationId);
            if (activeSiteId) query = query.eq('site_id', activeSiteId);
            return query;
          })()
        : Promise.resolve({ data: [], error: null });

      const [sessionsResult, enrollmentsResult, documentsResult, attendanceResult, satisfactionResult] = await Promise.all([
        sessionsResultPromise,
        enrollmentsResultPromise,
        documentsResultPromise,
        attendanceResultPromise,
        satisfactionResultPromise
      ]);
      if (!active) return;

      const firstError = sessionsResult.error || enrollmentsResult.error || documentsResult.error || attendanceResult.error || satisfactionResult.error;
      if (firstError) {
        setError(`Pilotage indisponible : ${firstError.message}`);
      } else {
        setSessions((sessionsResult.data ?? []) as TrainingSessionRecord[]);
        setEnrollments((enrollmentsResult.data ?? []) as TrainingEnrollmentRecord[]);
        setDocuments((documentsResult.data ?? []).map((row) => ({ ...row, size_bytes: row.size_bytes ? Number(row.size_bytes) : null })) as TrainingDocumentRecord[]);
        setAttendance((attendanceResult.data ?? []) as TrainingAttendanceRecord[]);
        setSatisfaction((satisfactionResult.data ?? []) as TrainingSatisfactionRecord[]);
      }
      setLoading(false);
    }

    void load();
    return () => { active = false; };
  }, [organization?.id, activeSiteId, demoMode, digitalAttendanceEnabled, satisfactionEnabled]);

  const dashboard = useMemo(() => buildTrainingQualityDashboard({
    sessions,
    enrollments,
    documents,
    attendance,
    satisfaction,
    periodDays,
    digitalAttendanceEnabled,
    satisfactionEnabled
  }), [sessions, enrollments, documents, attendance, satisfaction, periodDays, digitalAttendanceEnabled, satisfactionEnabled]);

  const filteredIssues = useMemo(() => issueFilter === 'all'
    ? dashboard.issues
    : dashboard.issues.filter((issue) => issue.severity === issueFilter), [dashboard.issues, issueFilter]);
  const maxTrendValue = Math.max(1, ...dashboard.trend.flatMap((point) => [point.sessions, point.trainees]));

  async function exportPdf() {
    if (!organization) return;
    const fileWindow = prepareFileWindow('Rapport de pilotage Formation', 'NCR Suite prépare le rapport qualité…');
    setExporting('pdf'); setError('');
    try {
      const { generateTrainingQualityReportPdf } = await import('../features/training/qualityReportPdf');
      const result = await generateTrainingQualityReportPdf({ organization, site: activeSite, dashboard, periodDays });
      const buffer = result.bytes.buffer.slice(result.bytes.byteOffset, result.bytes.byteOffset + result.bytes.byteLength) as ArrayBuffer;
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
      showBlobDownload(fileWindow, url, result.filename, 'Rapport de pilotage prêt');
      window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
    } catch (caught) {
      closeFileWindow(fileWindow);
      setError(`Export PDF impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setExporting(''); }
  }

  function exportCsv() {
    if (!organization) return;
    setExporting('csv'); setError('');
    try {
      const result = generateTrainingQualityCsv(organization, activeSite, dashboard, periodDays);
      const url = URL.createObjectURL(new Blob([result.content], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (caught) {
      setError(`Export CSV impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setExporting(''); }
  }

  if (!organization) return null;

  return (
    <div className="page training-dashboard-page training-quality-dashboard">
      <header className="page-header training-quality-header">
        <div>
          <p className="eyebrow">PILOTAGE & CONTRÔLE QUALITÉ</p>
          <h1>Bonjour, bienvenue sur {organization.name}.</h1>
          <p>{activeSite ? `Suivi opérationnel de l’établissement ${activeSite.name}.` : 'Visualise immédiatement ce qui est prêt, incomplet ou bloquant.'}</p>
        </div>
        <div className="header-actions training-quality-actions">
          <label className="training-quality-period">Période<select value={periodDays} onChange={(event) => setPeriodDays(Number(event.target.value) as TrainingQualityPeriod)}><option value="30">30 jours</option><option value="90">90 jours</option><option value="365">12 mois</option></select></label>
          <button className="secondary-button" type="button" disabled={Boolean(exporting) || loading} onClick={exportCsv}><Icon name="file" size={17} />{exporting === 'csv' ? 'Export…' : 'CSV'}</button>
          <button className="secondary-button" type="button" disabled={Boolean(exporting) || loading} onClick={() => void exportPdf()}><Icon name="file" size={17} />{exporting === 'pdf' ? 'Préparation…' : 'Rapport PDF'}</button>
          <Link className="primary-button" to="/sessions?new=1"><Icon name="calendar" size={18} />Créer une session</Link>
        </div>
      </header>

      {error && <div className="error-message page-message" role="alert">{error}</div>}

      <section className="training-quality-overview" aria-label="État des sessions">
        <article className="training-quality-overview-card planned"><span><Icon name="calendar" size={20} /></span><div><strong>{loading ? '…' : dashboard.metrics.plannedSessions}</strong><small>Planifiées à 30 jours</small></div><Link to="/sessions?view=planned">Voir</Link></article>
        <article className="training-quality-overview-card current"><span><Icon name="activity" size={20} /></span><div><strong>{loading ? '…' : dashboard.metrics.inProgressSessions}</strong><small>En cours maintenant</small></div><Link to="/sessions?view=current">Voir</Link></article>
        <article className="training-quality-overview-card ready"><span><Icon name="check" size={20} /></span><div><strong>{loading ? '…' : dashboard.metrics.readyToCloseSessions}</strong><small>Prêtes à clôturer</small></div><Link to="/dossiers-formation?tab=to_close">Traiter</Link></article>
        <article className="training-quality-overview-card closed"><span><Icon name="lock" size={20} /></span><div><strong>{loading ? '…' : dashboard.metrics.closedSessions}</strong><small>Clôturées · {qualityPeriodLabel(periodDays)}</small></div><Link to="/dossiers-formation?tab=closed">Voir</Link></article>
      </section>

      <section className="stats-grid training-quality-stats">
        <StatCard label="Stagiaires formés" value={loading ? '…' : String(dashboard.metrics.trainedTrainees)} detail={qualityPeriodLabel(periodDays)} icon="users" />
        <StatCard label="Taux de présence" value={loading ? '…' : percentValue(dashboard.metrics.attendanceRate)} detail={digitalAttendanceEnabled ? 'émargements finalisés' : 'selon les données disponibles'} icon="signature" />
        <StatCard label="Documents complets" value={loading ? '…' : percentValue(dashboard.metrics.documentCompletionRate)} detail="convocations et attestations" icon="file" />
        <StatCard label="Satisfaction" value={loading ? '…' : dashboard.metrics.satisfactionAverage == null ? '—' : `${dashboard.metrics.satisfactionAverage.toLocaleString('fr-FR')} / 5`} detail={satisfactionEnabled ? `${percentValue(dashboard.metrics.satisfactionResponseRate)} de réponses` : 'disponible avec Professionnelle'} icon="chart" />
      </section>

      <section className="training-quality-grid">
        <article className="panel training-quality-alerts-panel">
          <div className="panel-header training-quality-panel-header">
            <div><p className="eyebrow">PLAN D’ACTION</p><h2>Points à traiter</h2><p>Chaque alerte ouvre directement la session ou le document concerné.</p></div>
            <span className={`training-quality-health ${dashboard.criticalCount > 0 ? 'critical' : dashboard.warningCount > 0 ? 'warning' : 'healthy'}`}>
              {dashboard.criticalCount > 0 ? `${dashboard.criticalCount} bloquant${dashboard.criticalCount > 1 ? 's' : ''}` : dashboard.warningCount > 0 ? `${dashboard.warningCount} vigilance${dashboard.warningCount > 1 ? 's' : ''}` : 'Tout est au point'}
            </span>
          </div>

          <div className="training-quality-filter-tabs" role="tablist" aria-label="Filtrer les alertes">
            {([
              ['all', 'Tous', dashboard.issues.length],
              ['critical', 'Bloquants', dashboard.criticalCount],
              ['warning', 'À vérifier', dashboard.warningCount],
              ['ready', 'Prêts', dashboard.readyCount]
            ] as [IssueFilter, string, number][]).map(([value, label, count]) => (
              <button key={value} type="button" className={issueFilter === value ? 'active' : ''} onClick={() => setIssueFilter(value)}>{label}<b>{count}</b></button>
            ))}
          </div>

          {loading ? <div className="training-empty">Analyse des sessions…</div> : filteredIssues.length === 0 ? (
            <div className="training-quality-empty"><span><Icon name="check" size={26} /></span><div><strong>Aucun point à traiter dans cette rubrique</strong><p>Les contrôles sont à jour pour la période sélectionnée.</p></div></div>
          ) : (
            <div className="training-quality-issue-list">
              {filteredIssues.map((issue) => (
                <article key={issue.id} className={`training-quality-issue ${issue.severity}`}>
                  <span className="training-quality-issue-icon"><Icon name={issue.severity === 'critical' || issue.severity === 'warning' ? 'alert' : issue.severity === 'ready' ? 'check' : 'activity'} size={19} /></span>
                  <div className="training-quality-issue-main">
                    <div><strong>{issue.title}</strong><span>{severityLabel(issue)}</span></div>
                    <p>{issue.sessionTitle}</p>
                    <small>{issue.detail} · {dateRangeLabel(issue.startsAt, issue.endsAt)}</small>
                  </div>
                  <Link className="secondary-button compact-button" to={issue.actionPath}>{issue.actionLabel}<Icon name="chevronRight" size={15} /></Link>
                </article>
              ))}
            </div>
          )}
        </article>

        <aside className="training-quality-side">
          <article className="panel training-quality-trend-panel">
            <div className="panel-header"><div><p className="eyebrow">ACTIVITÉ</p><h2>Six derniers mois</h2><p>Sessions clôturées et stagiaires formés.</p></div></div>
            <div className="training-quality-chart" aria-label="Activité des six derniers mois">
              {dashboard.trend.map((point) => (
                <div key={point.key} className="training-quality-chart-group">
                  <div className="training-quality-chart-bars">
                    <span className="sessions" style={{ height: `${point.sessions === 0 ? 0 : Math.max(3, (point.sessions / maxTrendValue) * 100)}%` }} title={`${point.sessions} session(s)`} />
                    <span className="trainees" style={{ height: `${point.trainees === 0 ? 0 : Math.max(3, (point.trainees / maxTrendValue) * 100)}%` }} title={`${point.trainees} stagiaire(s)`} />
                  </div>
                  <small>{point.label}</small>
                </div>
              ))}
            </div>
            <div className="training-quality-chart-legend"><span><i className="sessions" />Sessions</span><span><i className="trainees" />Stagiaires</span></div>
          </article>

          <article className="panel training-quality-score-panel">
            <div><span><Icon name="shield" size={23} /></span><p className="eyebrow">SYNTHÈSE QUALITÉ</p></div>
            <h2>{dashboard.criticalCount === 0 && dashboard.warningCount === 0 ? 'Dossier maîtrisé' : dashboard.criticalCount > 0 ? 'Actions prioritaires requises' : 'Quelques vérifications à faire'}</h2>
            <p>{dashboard.criticalCount > 0
              ? `${dashboard.criticalCount} point${dashboard.criticalCount > 1 ? 's bloquent' : ' bloque'} actuellement la clôture ou la conformité d’une session.`
              : dashboard.warningCount > 0
                ? `${dashboard.warningCount} point${dashboard.warningCount > 1 ? 's méritent' : ' mérite'} une vérification avant la prochaine échéance.`
                : 'Aucune anomalie bloquante ou vigilance détectée dans les sessions analysées.'}</p>
            <div className="training-quality-score-lines">
              <span><strong>{dashboard.metrics.documentCompletionRate == null ? '—' : `${dashboard.metrics.documentCompletionRate} %`}</strong><small>Couverture documentaire</small></span>
              {satisfactionEnabled && <span><strong>{dashboard.metrics.satisfactionResponseRate == null ? '—' : `${dashboard.metrics.satisfactionResponseRate} %`}</strong><small>Réponses satisfaction</small></span>}
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
