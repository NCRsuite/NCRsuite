import { useEffect, useMemo, useState } from 'react';
import type { TrainingSessionRecord } from '../features/training/types';
import { Icon } from './Icon';

type Props = {
  sessions: TrainingSessionRecord[];
  loading: boolean;
};

function startOfLocalDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfLocalDay(value: Date) {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function TrainingDashboardClock({ sessions, loading }: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let intervalId: number | undefined;
    const delay = 60_000 - (Date.now() % 60_000) + 25;
    const timeoutId = window.setTimeout(() => {
      setNow(new Date());
      intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, []);

  const timeLabel = useMemo(() => new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(now), [now]);

  const dateLabel = useMemo(() => new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(now), [now]);

  const todaySessionCount = useMemo(() => {
    if (loading) return 0;
    const dayStart = startOfLocalDay(now).getTime();
    const dayEnd = endOfLocalDay(now).getTime();
    return sessions.filter((session) => {
      if (session.status === 'canceled') return false;
      const startsAt = new Date(session.starts_at).getTime();
      const endsAt = new Date(session.ends_at).getTime();
      return startsAt <= dayEnd && endsAt >= dayStart;
    }).length;
  }, [sessions, loading, now]);

  return (
    <aside className="ncr-dashboard-clock" aria-label="Date et heure actuelles">
      <div className="ncr-dashboard-clock-time-row">
        <span className="ncr-dashboard-clock-icon" aria-hidden="true"><Icon name="activity" size={17} /></span>
        <time className="ncr-dashboard-clock-time" dateTime={now.toISOString()}>{timeLabel}</time>
      </div>
      <p className="ncr-dashboard-clock-date">{dateLabel}</p>
      {todaySessionCount > 0 && (
        <p className="ncr-dashboard-clock-session">
          <span aria-hidden="true"><Icon name="calendar" size={13} /></span>
          {todaySessionCount} session{todaySessionCount > 1 ? 's' : ''} planifiée{todaySessionCount > 1 ? 's' : ''} aujourd’hui
        </p>
      )}
    </aside>
  );
}
