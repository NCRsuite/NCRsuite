import type {
  TrainingAttendanceRecord,
  TrainingDocumentRecord,
  TrainingEnrollmentRecord,
  TrainingSatisfactionRecord,
  TrainingSessionRecord
} from './types';

export type TrainingQualityPeriod = 30 | 90 | 365;
export type TrainingQualitySeverity = 'critical' | 'warning' | 'ready' | 'info';
export type TrainingQualityIssueKind = 'trainer' | 'enrollment' | 'attendance' | 'convocation' | 'attestation' | 'evaluation' | 'closure';

export interface TrainingQualityIssue {
  id: string;
  sessionId: string;
  sessionTitle: string;
  severity: TrainingQualitySeverity;
  kind: TrainingQualityIssueKind;
  title: string;
  detail: string;
  actionLabel: string;
  actionPath: string;
  startsAt: string;
  endsAt: string;
}

export interface TrainingQualityTrendPoint {
  key: string;
  label: string;
  sessions: number;
  trainees: number;
}

export interface TrainingQualityMetrics {
  plannedSessions: number;
  inProgressSessions: number;
  readyToCloseSessions: number;
  closedSessions: number;
  trainedTrainees: number;
  attendanceRate: number | null;
  documentCompletionRate: number | null;
  satisfactionAverage: number | null;
  satisfactionResponseRate: number | null;
}

export interface TrainingQualityDashboard {
  metrics: TrainingQualityMetrics;
  issues: TrainingQualityIssue[];
  trend: TrainingQualityTrendPoint[];
  periodStart: Date;
  periodEnd: Date;
  criticalCount: number;
  warningCount: number;
  readyCount: number;
}

interface BuildTrainingQualityInput {
  sessions: TrainingSessionRecord[];
  enrollments: TrainingEnrollmentRecord[];
  documents: TrainingDocumentRecord[];
  attendance: TrainingAttendanceRecord[];
  satisfaction: TrainingSatisfactionRecord[];
  periodDays: TrainingQualityPeriod;
  digitalAttendanceEnabled: boolean;
  satisfactionEnabled: boolean;
  now?: Date;
}

const DAY_MS = 86_400_000;

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
}

function inclusiveSessionDays(session: TrainingSessionRecord) {
  const start = startOfDay(new Date(session.starts_at));
  const end = startOfDay(new Date(session.ends_at));
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1);
}

function isActiveEnrollment(enrollment: TrainingEnrollmentRecord) {
  return enrollment.status !== 'canceled';
}

function isFinalAttendance(record: TrainingAttendanceRecord) {
  return record.status === 'present' || record.status === 'absent' || record.status === 'excused';
}

function sessionViewPath(session: TrainingSessionRecord, close = false) {
  const view = session.status === 'completed'
    ? 'closed'
    : session.status === 'canceled'
      ? 'canceled'
      : new Date(session.starts_at).getTime() <= Date.now()
        ? 'current'
        : 'planned';
  return `/sessions?view=${view}&focus=${encodeURIComponent(session.id)}${close ? '&close=1' : ''}`;
}

function satisfactionScore(record: TrainingSatisfactionRecord) {
  const values = [record.content_rating, record.trainer_rating, record.organization_rating, record.objectives_rating]
    .filter((value): value is number => typeof value === 'number');
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function coverageForCategory(documents: TrainingDocumentRecord[], category: 'convocation' | 'attestation', expected: number) {
  if (expected <= 0) return 0;
  const traineeIds = new Set(
    documents
      .filter((document) => document.category === category && document.status !== 'archived' && document.trainee_id)
      .map((document) => document.trainee_id as string)
  );
  return Math.min(expected, traineeIds.size);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function addIssue(issues: TrainingQualityIssue[], issue: Omit<TrainingQualityIssue, 'id'>) {
  issues.push({ ...issue, id: `${issue.kind}-${issue.sessionId}-${issues.length}` });
}

export function buildTrainingQualityDashboard({
  sessions,
  enrollments,
  documents,
  attendance,
  satisfaction,
  periodDays,
  digitalAttendanceEnabled,
  satisfactionEnabled,
  now = new Date()
}: BuildTrainingQualityInput): TrainingQualityDashboard {
  const periodEnd = endOfDay(now);
  const periodStart = startOfDay(new Date(now.getTime() - (periodDays - 1) * DAY_MS));
  const nextThirtyDays = new Date(now.getTime() + 30 * DAY_MS);
  const nextFourteenDays = new Date(now.getTime() + 14 * DAY_MS);

  const enrollmentsBySession = new Map<string, TrainingEnrollmentRecord[]>();
  for (const enrollment of enrollments.filter(isActiveEnrollment)) {
    const rows = enrollmentsBySession.get(enrollment.session_id) ?? [];
    rows.push(enrollment);
    enrollmentsBySession.set(enrollment.session_id, rows);
  }

  const documentsBySession = new Map<string, TrainingDocumentRecord[]>();
  for (const document of documents.filter((row) => row.status !== 'archived' && row.session_id)) {
    const rows = documentsBySession.get(document.session_id as string) ?? [];
    rows.push(document);
    documentsBySession.set(document.session_id as string, rows);
  }

  const attendanceBySession = new Map<string, TrainingAttendanceRecord[]>();
  for (const row of attendance) {
    const rows = attendanceBySession.get(row.session_id) ?? [];
    rows.push(row);
    attendanceBySession.set(row.session_id, rows);
  }

  const satisfactionBySession = new Map<string, TrainingSatisfactionRecord[]>();
  for (const row of satisfaction) {
    const rows = satisfactionBySession.get(row.session_id) ?? [];
    rows.push(row);
    satisfactionBySession.set(row.session_id, rows);
  }

  const plannedSessions = sessions.filter((session) =>
    session.status !== 'completed'
    && session.status !== 'canceled'
    && new Date(session.starts_at).getTime() > now.getTime()
    && new Date(session.starts_at).getTime() <= nextThirtyDays.getTime()
  );
  const inProgressSessions = sessions.filter((session) =>
    session.status !== 'completed'
    && session.status !== 'canceled'
    && new Date(session.starts_at).getTime() <= now.getTime()
    && new Date(session.ends_at).getTime() > now.getTime()
  );
  const endedOpenSessions = sessions.filter((session) =>
    session.status !== 'completed'
    && session.status !== 'canceled'
    && new Date(session.ends_at).getTime() <= now.getTime()
  );
  const closedInPeriod = sessions.filter((session) => {
    if (session.status !== 'completed') return false;
    const completedAt = new Date(session.closed_at || session.ends_at);
    return completedAt >= periodStart && completedAt <= periodEnd;
  });

  const issues: TrainingQualityIssue[] = [];
  let readyToCloseSessions = 0;

  for (const session of sessions) {
    if (session.status === 'canceled') continue;
    const startsAt = new Date(session.starts_at);
    const endsAt = new Date(session.ends_at);
    const activeEnrollments = enrollmentsBySession.get(session.id) ?? [];
    const sessionDocuments = documentsBySession.get(session.id) ?? [];
    const sessionAttendance = attendanceBySession.get(session.id) ?? [];
    const sessionSurveys = satisfactionBySession.get(session.id) ?? [];
    const enrollmentCount = activeEnrollments.length;
    const expectedAttendance = digitalAttendanceEnabled ? enrollmentCount * inclusiveSessionDays(session) * 2 : 0;
    const completedAttendance = sessionAttendance.filter(isFinalAttendance).length;
    const missingAttendance = Math.max(0, expectedAttendance - completedAttendance);
    const convocationCount = coverageForCategory(sessionDocuments, 'convocation', enrollmentCount);
    const attestationCount = coverageForCategory(sessionDocuments, 'attestation', enrollmentCount);

    const isUpcomingSoon = session.status !== 'completed' && startsAt > now && startsAt <= nextFourteenDays;
    const isCurrent = session.status !== 'completed' && startsAt <= now && endsAt > now;
    const isEndedOpen = session.status !== 'completed' && endsAt <= now;
    const isRecentlyClosed = session.status === 'completed'
      && new Date(session.closed_at || session.ends_at) >= periodStart
      && new Date(session.closed_at || session.ends_at) <= periodEnd;

    if (isUpcomingSoon) {
      if (!session.trainer_id) {
        addIssue(issues, {
          sessionId: session.id, sessionTitle: session.title, severity: 'critical', kind: 'trainer',
          title: 'Formateur non affecté', detail: `La session commence le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(startsAt)}.`,
          actionLabel: 'Ouvrir la session', actionPath: sessionViewPath(session), startsAt: session.starts_at, endsAt: session.ends_at
        });
      }
      if (enrollmentCount === 0) {
        addIssue(issues, {
          sessionId: session.id, sessionTitle: session.title, severity: 'warning', kind: 'enrollment',
          title: 'Aucun stagiaire inscrit', detail: 'La session approche mais sa liste de participants est vide.',
          actionLabel: 'Ajouter les stagiaires', actionPath: sessionViewPath(session), startsAt: session.starts_at, endsAt: session.ends_at
        });
      } else if (convocationCount < enrollmentCount) {
        addIssue(issues, {
          sessionId: session.id, sessionTitle: session.title, severity: 'warning', kind: 'convocation',
          title: 'Convocations incomplètes', detail: `${enrollmentCount - convocationCount} convocation${enrollmentCount - convocationCount > 1 ? 's' : ''} individualisée${enrollmentCount - convocationCount > 1 ? 's' : ''} manque${enrollmentCount - convocationCount > 1 ? 'nt' : ''}.`,
          actionLabel: 'Voir les convocations', actionPath: `/documents?session=${encodeURIComponent(session.id)}&category=convocation`, startsAt: session.starts_at, endsAt: session.ends_at
        });
      }
    }

    if (isCurrent && digitalAttendanceEnabled && missingAttendance > 0) {
      addIssue(issues, {
        sessionId: session.id, sessionTitle: session.title, severity: 'warning', kind: 'attendance',
        title: 'Émargements en cours', detail: `${missingAttendance} créneau${missingAttendance > 1 ? 'x' : ''} reste${missingAttendance > 1 ? 'nt' : ''} à compléter.`,
        actionLabel: 'Ouvrir l’émargement', actionPath: `/emargements?session=${encodeURIComponent(session.id)}`, startsAt: session.starts_at, endsAt: session.ends_at
      });
    }

    if (isEndedOpen) {
      let blockers = 0;
      if (!session.trainer_id) {
        blockers += 1;
        addIssue(issues, {
          sessionId: session.id, sessionTitle: session.title, severity: 'critical', kind: 'trainer',
          title: 'Clôture bloquée · formateur', detail: 'Aucun formateur n’est affecté à cette session terminée.',
          actionLabel: 'Corriger la session', actionPath: sessionViewPath(session), startsAt: session.starts_at, endsAt: session.ends_at
        });
      }
      if (enrollmentCount === 0) {
        blockers += 1;
        addIssue(issues, {
          sessionId: session.id, sessionTitle: session.title, severity: 'critical', kind: 'enrollment',
          title: 'Clôture bloquée · participants', detail: 'La session terminée ne contient aucun stagiaire actif.',
          actionLabel: 'Corriger la session', actionPath: sessionViewPath(session), startsAt: session.starts_at, endsAt: session.ends_at
        });
      }
      if (digitalAttendanceEnabled && missingAttendance > 0) {
        blockers += 1;
        addIssue(issues, {
          sessionId: session.id, sessionTitle: session.title, severity: 'critical', kind: 'attendance',
          title: 'Clôture bloquée · émargements', detail: `${missingAttendance} créneau${missingAttendance > 1 ? 'x' : ''} d’émargement manque${missingAttendance > 1 ? 'nt' : ''}.`,
          actionLabel: 'Compléter les signatures', actionPath: `/emargements?session=${encodeURIComponent(session.id)}`, startsAt: session.starts_at, endsAt: session.ends_at
        });
      }
      if (blockers === 0) {
        readyToCloseSessions += 1;
        addIssue(issues, {
          sessionId: session.id, sessionTitle: session.title, severity: 'ready', kind: 'closure',
          title: 'Session prête à clôturer', detail: 'Les contrôles obligatoires sont complets.',
          actionLabel: 'Contrôler et clôturer', actionPath: sessionViewPath(session, true), startsAt: session.starts_at, endsAt: session.ends_at
        });
      }
    }

    if (isRecentlyClosed && enrollmentCount > 0 && attestationCount < enrollmentCount) {
      addIssue(issues, {
        sessionId: session.id, sessionTitle: session.title, severity: 'critical', kind: 'attestation',
        title: 'Attestations manquantes', detail: `${enrollmentCount - attestationCount} attestation${enrollmentCount - attestationCount > 1 ? 's' : ''} reste${enrollmentCount - attestationCount > 1 ? 'nt' : ''} à générer ou classer.`,
        actionLabel: 'Voir les attestations', actionPath: `/documents?session=${encodeURIComponent(session.id)}&category=attestation`, startsAt: session.starts_at, endsAt: session.ends_at
      });
    }

    if (isRecentlyClosed && satisfactionEnabled && enrollmentCount > 0) {
      const completedSurveys = sessionSurveys.filter((survey) => survey.status === 'completed').length;
      if (sessionSurveys.length < enrollmentCount && now.getTime() - endsAt.getTime() > DAY_MS) {
        addIssue(issues, {
          sessionId: session.id, sessionTitle: session.title, severity: 'warning', kind: 'evaluation',
          title: 'Questionnaires non envoyés', detail: `${enrollmentCount - sessionSurveys.length} questionnaire${enrollmentCount - sessionSurveys.length > 1 ? 's' : ''} manque${enrollmentCount - sessionSurveys.length > 1 ? 'nt' : ''}.`,
          actionLabel: 'Gérer les évaluations', actionPath: `/evaluations?session=${encodeURIComponent(session.id)}`, startsAt: session.starts_at, endsAt: session.ends_at
        });
      } else if (sessionSurveys.length > 0 && completedSurveys < sessionSurveys.length) {
        addIssue(issues, {
          sessionId: session.id, sessionTitle: session.title, severity: 'info', kind: 'evaluation',
          title: 'Réponses de satisfaction en attente', detail: `${sessionSurveys.length - completedSurveys} stagiaire${sessionSurveys.length - completedSurveys > 1 ? 's n’ont' : ' n’a'} pas encore répondu.`,
          actionLabel: 'Suivre les réponses', actionPath: `/evaluations?session=${encodeURIComponent(session.id)}`, startsAt: session.starts_at, endsAt: session.ends_at
        });
      }
    }
  }

  const closedSessionIds = new Set(closedInPeriod.map((session) => session.id));
  const trainedTraineeIds = new Set(
    enrollments
      .filter((enrollment) => closedSessionIds.has(enrollment.session_id) && isActiveEnrollment(enrollment))
      .map((enrollment) => enrollment.trainee_id)
  );

  const periodAttendance = attendance.filter((row) => closedSessionIds.has(row.session_id) && isFinalAttendance(row));
  const presentAttendance = periodAttendance.filter((row) => row.status === 'present').length;
  const attendanceRate = periodAttendance.length > 0 ? Math.round((presentAttendance / periodAttendance.length) * 1000) / 10 : null;

  const periodSurveys = satisfactionEnabled ? satisfaction.filter((row) => closedSessionIds.has(row.session_id)) : [];
  const completedPeriodSurveys = periodSurveys.filter((row) => row.status === 'completed');
  const scores = completedPeriodSurveys.map(satisfactionScore).filter((value): value is number => value != null);
  const satisfactionAverage = scores.length > 0 ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10 : null;
  const satisfactionResponseRate = periodSurveys.length > 0 ? Math.round((completedPeriodSurveys.length / periodSurveys.length) * 1000) / 10 : null;

  let expectedDocuments = 0;
  let availableDocuments = 0;
  for (const session of sessions) {
    if (session.status === 'canceled' || session.status === 'draft') continue;
    const startsAt = new Date(session.starts_at);
    const completedAt = new Date(session.closed_at || session.ends_at);
    const activeEnrollments = enrollmentsBySession.get(session.id) ?? [];
    if (activeEnrollments.length === 0) continue;
    const sessionDocuments = documentsBySession.get(session.id) ?? [];

    const inOperationalWindow = startsAt >= periodStart && startsAt <= nextThirtyDays;
    if (inOperationalWindow) {
      expectedDocuments += activeEnrollments.length;
      availableDocuments += coverageForCategory(sessionDocuments, 'convocation', activeEnrollments.length);
    }
    if (session.status === 'completed' && completedAt >= periodStart && completedAt <= periodEnd) {
      expectedDocuments += activeEnrollments.length;
      availableDocuments += coverageForCategory(sessionDocuments, 'attestation', activeEnrollments.length);
    }
  }
  const documentCompletionRate = expectedDocuments > 0 ? Math.round((availableDocuments / expectedDocuments) * 1000) / 10 : null;

  const trend: TrainingQualityTrendPoint[] = [];
  const monthStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  for (let index = 0; index < 6; index += 1) {
    const start = new Date(monthStart.getFullYear(), monthStart.getMonth() + index, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const monthSessions = sessions.filter((session) => {
      if (session.status !== 'completed') return false;
      const completedAt = new Date(session.closed_at || session.ends_at);
      return completedAt >= start && completedAt < end;
    });
    const monthSessionIds = new Set(monthSessions.map((session) => session.id));
    const monthTrainees = new Set(
      enrollments
        .filter((enrollment) => monthSessionIds.has(enrollment.session_id) && isActiveEnrollment(enrollment))
        .map((enrollment) => enrollment.trainee_id)
    );
    trend.push({
      key: monthKey(start),
      label: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(start).replace('.', ''),
      sessions: monthSessions.length,
      trainees: monthTrainees.size
    });
  }

  const severityOrder: Record<TrainingQualitySeverity, number> = { critical: 0, warning: 1, ready: 2, info: 3 };
  issues.sort((left, right) => {
    const severityDiff = severityOrder[left.severity] - severityOrder[right.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
  });

  return {
    metrics: {
      plannedSessions: plannedSessions.length,
      inProgressSessions: inProgressSessions.length,
      readyToCloseSessions,
      closedSessions: closedInPeriod.length,
      trainedTrainees: trainedTraineeIds.size,
      attendanceRate,
      documentCompletionRate,
      satisfactionAverage,
      satisfactionResponseRate
    },
    issues,
    trend,
    periodStart,
    periodEnd,
    criticalCount: issues.filter((issue) => issue.severity === 'critical').length,
    warningCount: issues.filter((issue) => issue.severity === 'warning').length,
    readyCount: issues.filter((issue) => issue.severity === 'ready').length
  };
}

export function qualityPeriodLabel(periodDays: TrainingQualityPeriod) {
  if (periodDays === 30) return '30 derniers jours';
  if (periodDays === 90) return '90 derniers jours';
  return '12 derniers mois';
}
