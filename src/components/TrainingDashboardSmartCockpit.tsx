import { Link } from 'react-router-dom';
import type { TrainingQualityDashboard, TrainingQualityIssue } from '../features/training/qualityDashboard';
import type { TrainingSessionRecord } from '../features/training/types';
import type { IconName } from '../types';
import { Icon } from './Icon';

type SmartTone = 'critical' | 'ready' | 'warning' | 'active' | 'healthy';

type SmartPriority = {
  tone: SmartTone;
  eyebrow: string;
  title: string;
  detail: string;
  actionLabel: string;
  actionPath: string;
  issueId?: string;
};

type Props = {
  dashboard: TrainingQualityDashboard;
  sessions: TrainingSessionRecord[];
  canManage: boolean;
  loading: boolean;
};

const DAY_MS = 86_400_000;
const ISSUE_RANK: Record<TrainingQualityIssue['severity'], number> = {
  critical: 0,
  ready: 1,
  warning: 2,
  info: 3
};

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function rankedIssues(issues: TrainingQualityIssue[]) {
  return [...issues].sort((a, b) => {
    const severityDelta = ISSUE_RANK[a.severity] - ISSUE_RANK[b.severity];
    if (severityDelta !== 0) return severityDelta;
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  });
}

function openSessions(sessions: TrainingSessionRecord[]) {
  return sessions
    .filter((session) => session.status !== 'completed' && session.status !== 'canceled')
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

function sessionFocusPath(session: TrainingSessionRecord, now: Date) {
  const start = new Date(session.starts_at).getTime();
  const end = new Date(session.ends_at).getTime();
  const view = start <= now.getTime() && end > now.getTime() ? 'current' : 'planned';
  return `/sessions?view=${view}&focus=${encodeURIComponent(session.id)}`;
}

function relativeDateLabel(value: string, now: Date) {
  const target = startOfDay(new Date(value));
  const today = startOfDay(now);
  const dayDelta = Math.round((target.getTime() - today.getTime()) / DAY_MS);
  if (dayDelta === 0) return "Aujourd’hui";
  if (dayDelta === 1) return 'Demain';
  if (dayDelta > 1 && dayDelta <= 7) return `Dans ${dayDelta} jours`;
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }).format(target);
}

function sessionTimeLabel(session: TrainingSessionRecord) {
  const format = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${format.format(new Date(session.starts_at))} → ${format.format(new Date(session.ends_at))}`;
}

function priorityFromIssue(issue: TrainingQualityIssue): SmartPriority {
  if (issue.severity === 'critical') {
    return {
      tone: 'critical',
      eyebrow: 'PRIORITÉ IMMÉDIATE',
      title: issue.title,
      detail: `${issue.sessionTitle} · ${issue.detail}`,
      actionLabel: issue.actionLabel,
      actionPath: issue.actionPath,
      issueId: issue.id
    };
  }
  if (issue.severity === 'ready') {
    return {
      tone: 'ready',
      eyebrow: 'ACTION RAPIDE',
      title: issue.title,
      detail: `${issue.sessionTitle} · ${issue.detail}`,
      actionLabel: issue.actionLabel,
      actionPath: issue.actionPath,
      issueId: issue.id
    };
  }
  if (issue.severity === 'warning') {
    return {
      tone: 'warning',
      eyebrow: 'À VÉRIFIER',
      title: issue.title,
      detail: `${issue.sessionTitle} · ${issue.detail}`,
      actionLabel: issue.actionLabel,
      actionPath: issue.actionPath,
      issueId: issue.id
    };
  }
  return {
    tone: 'active',
    eyebrow: 'À SUIVRE',
    title: issue.title,
    detail: `${issue.sessionTitle} · ${issue.detail}`,
    actionLabel: issue.actionLabel,
    actionPath: issue.actionPath,
    issueId: issue.id
  };
}

function buildPriority(dashboard: TrainingQualityDashboard, sessions: TrainingSessionRecord[], now: Date) {
  const issues = rankedIssues(dashboard.issues);
  if (issues[0]) return priorityFromIssue(issues[0]);

  const open = openSessions(sessions);
  const current = open.find((session) => {
    const start = new Date(session.starts_at).getTime();
    const end = new Date(session.ends_at).getTime();
    return start <= now.getTime() && end > now.getTime();
  });
  if (current) {
    return {
      tone: 'active' as const,
      eyebrow: 'EN COURS MAINTENANT',
      title: current.title,
      detail: `${sessionTimeLabel(current)}${current.location ? ` · ${current.location}` : ''}`,
      actionLabel: 'Ouvrir la session',
      actionPath: sessionFocusPath(current, now)
    };
  }

  const next = open.find((session) => new Date(session.starts_at).getTime() > now.getTime());
  if (next) {
    return {
      tone: 'healthy' as const,
      eyebrow: 'TOUT EST SOUS CONTRÔLE',
      title: `Prochaine échéance · ${relativeDateLabel(next.starts_at, now)}`,
      detail: `${next.title} · ${sessionTimeLabel(next)}${next.location ? ` · ${next.location}` : ''}`,
      actionLabel: 'Voir la session',
      actionPath: sessionFocusPath(next, now)
    };
  }

  return {
    tone: 'healthy' as const,
    eyebrow: 'TOUT EST SOUS CONTRÔLE',
    title: 'Aucune action prioritaire actuellement',
    detail: 'Aucun blocage, aucune vigilance et aucune session ouverte ne nécessitent une action immédiate.',
    actionLabel: 'Voir les sessions',
    actionPath: '/sessions'
  };
}

function nextRelevantSession(sessions: TrainingSessionRecord[], now: Date) {
  const open = openSessions(sessions);
  const current = open.find((session) => {
    const start = new Date(session.starts_at).getTime();
    const end = new Date(session.ends_at).getTime();
    return start <= now.getTime() && end > now.getTime();
  });
  return current ?? open.find((session) => new Date(session.starts_at).getTime() > now.getTime()) ?? null;
}

export function TrainingDashboardSmartCockpit({ dashboard, sessions, canManage, loading }: Props) {
  const now = new Date();
  const issues = rankedIssues(dashboard.issues);
  const priority = buildPriority(dashboard, sessions, now);
  const secondaryIssues = issues.filter((issue) => issue.id !== priority.issueId).slice(0, 3);
  const nextSession = nextRelevantSession(sessions, now);

  const shortcuts: Array<{ label: string; path: string; icon: IconName }> = canManage
    ? [
        { label: 'Créer une session', path: '/sessions?new=1', icon: 'calendar' },
        { label: 'Stagiaires', path: '/stagiaires', icon: 'users' },
        { label: 'Documents', path: '/documents', icon: 'file' },
        { label: 'Dossiers', path: '/dossiers-formation', icon: 'briefcase' }
      ]
    : [
        { label: 'Sessions', path: '/sessions', icon: 'calendar' },
        { label: 'Documents', path: '/documents', icon: 'file' },
        { label: 'Dossiers', path: '/dossiers-formation', icon: 'briefcase' }
      ];

  if (loading) {
    return (
      <section className="ncr-smart-cockpit is-loading" aria-label="Cockpit intelligent en cours d’analyse" aria-busy="true">
        <article className="ncr-smart-priority ncr-smart-skeleton"><i /><i /><i /><i /></article>
        <aside className="ncr-smart-side"><article className="ncr-smart-next ncr-smart-skeleton"><i /><i /><i /></article><article className="ncr-smart-shortcuts ncr-smart-skeleton"><i /><i /><i /></article></aside>
      </section>
    );
  }

  return (
    <section className={`ncr-smart-cockpit tone-${priority.tone}`} aria-label="Cockpit intelligent" aria-live="polite">
      <article className={`ncr-smart-priority tone-${priority.tone}`}>
        <div className="ncr-smart-priority-copy">
          <div className="ncr-smart-kicker">
            <span className="ncr-smart-kicker-icon"><Icon name="sparkles" size={17} /></span>
            <div><p className="eyebrow">SMART COCKPIT</p><small>Priorisation automatique à partir de vos données</small></div>
          </div>

          <div className="ncr-smart-priority-heading">
            <span className="ncr-smart-tone-dot" aria-hidden="true" />
            <p>{priority.eyebrow}</p>
          </div>
          <h2>{priority.title}</h2>
          <p className="ncr-smart-priority-detail">{priority.detail}</p>

          <div className="ncr-smart-priority-footer">
            <Link className="ncr-smart-primary-action" to={priority.actionPath}>{priority.actionLabel}<Icon name="chevronRight" size={16} /></Link>
            <span className="ncr-smart-healthline">
              <b>{dashboard.criticalCount}</b> bloquant{dashboard.criticalCount > 1 ? 's' : ''}
              <i aria-hidden="true" />
              <b>{dashboard.warningCount}</b> vigilance{dashboard.warningCount > 1 ? 's' : ''}
              <i aria-hidden="true" />
              <b>{dashboard.metrics.readyToCloseSessions}</b> prêt{dashboard.metrics.readyToCloseSessions > 1 ? 'es' : 'e'} à clôturer
            </span>
          </div>
        </div>

        <div className="ncr-smart-todo">
          <div className="ncr-smart-todo-head"><div><p className="eyebrow">À FAIRE ENSUITE</p><strong>{secondaryIssues.length > 0 ? `${secondaryIssues.length} action${secondaryIssues.length > 1 ? 's' : ''} utile${secondaryIssues.length > 1 ? 's' : ''}` : 'Rien d’urgent'}</strong></div><Icon name="activity" size={19} /></div>
          {secondaryIssues.length > 0 ? (
            <div className="ncr-smart-todo-list">
              {secondaryIssues.map((issue) => (
                <Link key={issue.id} className={`ncr-smart-todo-item ${issue.severity}`} to={issue.actionPath}>
                  <span><Icon name={issue.severity === 'critical' || issue.severity === 'warning' ? 'alert' : issue.severity === 'ready' ? 'check' : 'activity'} size={16} /></span>
                  <div><strong>{issue.title}</strong><small>{issue.sessionTitle}</small></div>
                  <Icon name="chevronRight" size={15} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="ncr-smart-clear-state"><span><Icon name="check" size={18} /></span><div><strong>File d’actions claire</strong><small>Le dashboard ne détecte pas d’autre priorité à traiter.</small></div></div>
          )}
        </div>
      </article>

      <aside className="ncr-smart-side">
        <article className="ncr-smart-next">
          <div className="ncr-smart-card-head"><div><p className="eyebrow">PROCHAINE ACTIVITÉ</p><strong>{nextSession ? relativeDateLabel(nextSession.starts_at, now) : 'Aucune échéance'}</strong></div><span><Icon name="calendar" size={19} /></span></div>
          {nextSession ? (
            <>
              <h3>{nextSession.title}</h3>
              <p>{sessionTimeLabel(nextSession)}</p>
              {nextSession.location && <small>{nextSession.location}</small>}
              <Link to={sessionFocusPath(nextSession, now)}>Ouvrir<Icon name="chevronRight" size={15} /></Link>
            </>
          ) : (
            <><h3>Planning dégagé</h3><p>Aucune session ouverte ou planifiée à venir.</p><Link to="/sessions">Voir le planning<Icon name="chevronRight" size={15} /></Link></>
          )}
        </article>

        <article className="ncr-smart-shortcuts">
          <div className="ncr-smart-card-head"><div><p className="eyebrow">RACCOURCIS</p><strong>Accès rapide</strong></div><span><Icon name="sparkles" size={18} /></span></div>
          <div className="ncr-smart-shortcut-grid">
            {shortcuts.map((shortcut) => <Link key={shortcut.path} to={shortcut.path}><span><Icon name={shortcut.icon} size={17} /></span>{shortcut.label}</Link>)}
          </div>
        </article>
      </aside>
    </section>
  );
}
