import { useEffect, useMemo, useState } from 'react';
import { APP_VERSION, PWA_CACHE_NAME } from '../config/runtime';
import { supabase } from '../lib/supabase';
import { Icon } from './Icon';

type HealthStatus = 'ok' | 'warning' | 'error';

type HealthCheck = {
  key: string;
  label: string;
  status: HealthStatus;
  detail: string;
};

type RuntimeErrorRow = {
  id: string;
  organization_id: string | null;
  organization_name: string | null;
  source: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  pathname: string | null;
  app_version: string | null;
  pwa_cache: string | null;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
};

type VersionRow = {
  app_version: string;
  pwa_cache: string;
  clients: number;
  last_seen_at: string;
};

type HealthReport = {
  generated_at: string;
  window_hours: number;
  release: {
    database_version?: string;
    expected_frontend_version?: string;
    expected_pwa_cache?: string;
    installed_at?: string;
  };
  summary: {
    runtime_open: number;
    runtime_critical: number;
    runtime_organizations: number;
    active_clients: number;
    outdated_clients: number;
    email_failed: number;
    email_stalled: number;
    push_failed: number;
    push_stalled: number;
    urgent_support: number;
  };
  checks: HealthCheck[];
  required_objects: Array<{ object: string; status: HealthStatus; detail: string }>;
  recent_errors: RuntimeErrorRow[];
  versions: VersionRow[];
  access_security?: {
    summary?: Record<string, number>;
  };
};

type ReleaseReadinessReport = {
  generated_at: string;
  ready: boolean;
  summary: {
    active_organizations: number;
    organizations_without_owner: number;
    unknown_organization_modules: number;
    duplicate_training_modules: number;
    old_training_module_requests: number;
  };
  checks: HealthCheck[];
  domains: Array<{ business_type: string; organizations: number }>;
};

function dateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function severityLabel(value: RuntimeErrorRow['severity']) {
  return value === 'critical' ? 'Critique' : value === 'error' ? 'Erreur' : value === 'warning' ? 'Avertissement' : 'Information';
}

function sourceLabel(value: string) {
  if (value === 'react') return 'Interface React';
  if (value === 'promise') return 'Promesse asynchrone';
  if (value === 'window') return 'Navigateur';
  if (value === 'network') return 'Réseau';
  if (value === 'service_worker') return 'PWA';
  if (value === 'release') return 'Version';
  return 'Application';
}

export function AdminMonitoringPanel() {
  const [hours, setHours] = useState(24);
  const [report, setReport] = useState<HealthReport | null>(null);
  const [readiness, setReadiness] = useState<ReleaseReadinessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    if (!supabase) return;
    setLoading(true);
    setError('');
    const [healthResult, readinessResult] = await Promise.all([
      supabase.rpc('platform_global_health_report', { p_hours: hours }),
      supabase.rpc('platform_release_readiness_report')
    ]);
    if (healthResult.error) setError(healthResult.error.message);
    else setReport(healthResult.data as HealthReport);
    if (readinessResult.error) setError(readinessResult.error.message);
    else setReadiness(readinessResult.data as ReleaseReadinessReport);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [hours]);

  const visibleErrors = useMemo(() => {
    const rows = report?.recent_errors ?? [];
    return showResolved ? rows : rows.filter((row) => !row.resolved_at);
  }, [report, showResolved]);

  const globalStatus = useMemo<HealthStatus>(() => {
    if (!report) return 'warning';
    if (readiness && !readiness.ready) return 'error';
    if (report.checks.some((check) => check.status === 'error')) return 'error';
    if (report.checks.some((check) => check.status === 'warning')) return 'warning';
    return 'ok';
  }, [readiness, report]);

  async function resolveRuntimeError(row: RuntimeErrorRow) {
    if (!supabase) return;
    const note = window.prompt('Note de résolution interne (facultative) :', row.resolution_note ?? '') ?? '';
    setResolving(row.id);
    setError('');
    setMessage('');
    const { error: requestError } = await supabase.rpc('admin_resolve_runtime_error', {
      p_error_id: row.id,
      p_resolution_note: note,
      p_resolved: true
    });
    if (requestError) setError(requestError.message);
    else {
      setMessage('L’erreur a été marquée comme résolue. Une nouvelle occurrence créera une nouvelle alerte.');
      await load();
    }
    setResolving('');
  }

  return (
    <section className="admin-monitoring-layout">
      <header className="panel admin-monitoring-hero">
        <div className={`admin-monitoring-orb ${globalStatus}`}><Icon name={globalStatus === 'ok' ? 'check' : 'activity'} size={28} /></div>
        <div className="admin-monitoring-hero-copy">
          <p className="eyebrow">SURVEILLANCE GLOBALE</p>
          <h2>{globalStatus === 'ok' ? 'Plateforme opérationnelle' : globalStatus === 'warning' ? 'Points à surveiller' : 'Action technique requise'}</h2>
          <p>Versions, erreurs interface, files d’envoi, sécurité des accès et objets critiques sont contrôlés depuis un seul écran.</p>
        </div>
        <div className="admin-monitoring-actions">
          <label>Période
            <select value={hours} onChange={(event) => setHours(Number(event.target.value))}>
              <option value={24}>24 heures</option>
              <option value={72}>3 jours</option>
              <option value={168}>7 jours</option>
              <option value={720}>30 jours</option>
            </select>
          </label>
          <button type="button" className="secondary-button compact" onClick={() => void load()} disabled={loading}><Icon name="activity" size={16} /> {loading ? 'Analyse…' : 'Relancer'}</button>
        </div>
      </header>

      {error && <div className="error-message" role="alert">{error}</div>}
      {message && <div className="success-message" role="status">{message}</div>}

      {loading && !report ? <div className="panel admin-empty-state">Analyse de la plateforme en cours…</div> : report && <>
        <section className="admin-monitoring-metrics">
          <article><span><Icon name="monitor" size={20} /></span><div><small>Sessions actives</small><strong>{report.summary.active_clients}</strong><em>{report.summary.outdated_clients} ancienne(s)</em></div></article>
          <article><span><Icon name="alert" size={20} /></span><div><small>Erreurs ouvertes</small><strong>{report.summary.runtime_open}</strong><em>{report.summary.runtime_critical} critique(s)</em></div></article>
          <article><span><Icon name="building" size={20} /></span><div><small>Entreprises touchées</small><strong>{report.summary.runtime_organizations}</strong><em>sur la période</em></div></article>
          <article><span><Icon name="message" size={20} /></span><div><small>E-mails</small><strong>{report.summary.email_failed}</strong><em>{report.summary.email_stalled} bloqué(s)</em></div></article>
          <article><span><Icon name="bell" size={20} /></span><div><small>Push</small><strong>{report.summary.push_failed}</strong><em>{report.summary.push_stalled} bloquée(s)</em></div></article>
          <article><span><Icon name="headset" size={20} /></span><div><small>Support urgent</small><strong>{report.summary.urgent_support}</strong><em>ticket(s) ouvert(s)</em></div></article>
        </section>

        <section className="admin-monitoring-grid">
          <article className="panel admin-monitoring-checks">
            <div className="panel-header"><div><p className="eyebrow">ÉTAT DE SANTÉ</p><h2>Contrôles automatiques</h2><p>Généré le {dateTime(report.generated_at)}.</p></div></div>
            <div className="admin-monitoring-check-list">
              {report.checks.map((check) => <div key={check.key} className={check.status}>
                <span><Icon name={check.status === 'ok' ? 'check' : 'alert'} size={17} /></span>
                <div><strong>{check.label}</strong><small>{check.detail}</small></div>
                <em>{check.status === 'ok' ? 'OK' : check.status === 'warning' ? 'Surveillance' : 'Action'}</em>
              </div>)}
            </div>
          </article>

          <article className="panel admin-monitoring-release">
            <div className="panel-header"><div><p className="eyebrow">INTÉGRITÉ DE VERSION</p><h2>Release active</h2></div></div>
            <div className="admin-monitoring-version-card">
              <span><Icon name="shield" size={22} /></span>
              <div><small>Frontend attendu</small><strong>V{report.release.expected_frontend_version ?? '—'}</strong><em>Ouvert ici : V{APP_VERSION}</em></div>
            </div>
            <div className="admin-monitoring-version-card">
              <span><Icon name="file" size={22} /></span>
              <div><small>Schéma base</small><strong>V{report.release.database_version ?? '—'}</strong><em>Migration installée le {dateTime(report.release.installed_at)}</em></div>
            </div>
            <div className="admin-monitoring-cache"><small>Cache PWA attendu</small><code>{report.release.expected_pwa_cache ?? '—'}</code><small>Cache du build : {PWA_CACHE_NAME}</small></div>
            <div className="admin-monitoring-version-list">
              <strong>Versions vues sur 24 h</strong>
              {report.versions.length === 0 && <small>Aucune session récente recensée.</small>}
              {report.versions.map((version) => <div key={`${version.app_version}-${version.pwa_cache}`}><span>V{version.app_version}</span><b>{version.clients} session(s)</b><small>{dateTime(version.last_seen_at)}</small></div>)}
            </div>
          </article>
        </section>

        {readiness && (
          <section className="admin-monitoring-grid admin-release-readiness">
            <article className="panel admin-monitoring-checks">
              <div className="panel-header"><div><p className="eyebrow">PRÉPARATION V2.20</p><h2>{readiness.ready ? 'Socle cohérent' : 'Corrections requises'}</h2><p>Contrôle transversal généré le {dateTime(readiness.generated_at)}.</p></div></div>
              <div className="admin-monitoring-check-list">
                {readiness.checks.map((check) => <div key={check.key} className={check.status}>
                  <span><Icon name={check.status === 'ok' ? 'check' : 'alert'} size={17} /></span>
                  <div><strong>{check.label}</strong><small>{check.detail}</small></div>
                  <em>{check.status === 'ok' ? 'OK' : check.status === 'warning' ? 'Surveillance' : 'Action'}</em>
                </div>)}
              </div>
            </article>
            <article className="panel admin-monitoring-release">
              <div className="panel-header"><div><p className="eyebrow">MULTI-MÉTIERS</p><h2>Espaces actifs</h2></div></div>
              <div className="admin-monitoring-object-grid">
                {readiness.domains.map((domain) => (
                  <article key={domain.business_type} className="ok">
                    <span><Icon name="building" size={17} /></span>
                    <div><strong>{domain.business_type}</strong><small>{domain.organizations} entreprise(s)</small></div>
                  </article>
                ))}
              </div>
              <div className="admin-monitoring-cache">
                <small>Demandes Formation de plus de 7 jours</small>
                <strong>{readiness.summary.old_training_module_requests}</strong>
                <small>Les avertissements n’interrompent pas l’application, mais doivent être traités depuis Abonnements.</small>
              </div>
            </article>
          </section>
        )}

        <section className="panel admin-monitoring-errors">
          <div className="panel-header admin-monitoring-errors-head">
            <div><p className="eyebrow">ERREURS RUNTIME</p><h2>Incidents remontés par les navigateurs</h2><p>Les occurrences identiques sont regroupées pour éviter le bruit.</p></div>
            <label className="admin-monitoring-toggle"><input type="checkbox" checked={showResolved} onChange={(event) => setShowResolved(event.target.checked)} /><span>Afficher les résolues</span></label>
          </div>
          <div className="admin-monitoring-error-list">
            {visibleErrors.length === 0 && <div className="admin-empty-state">Aucune erreur {showResolved ? 'sur la période' : 'ouverte'}.</div>}
            {visibleErrors.map((row) => <article key={row.id} className={`${row.severity}${row.resolved_at ? ' resolved' : ''}`}>
              <div className="admin-monitoring-error-severity"><Icon name={row.resolved_at ? 'check' : 'alert'} size={19} /><span>{severityLabel(row.severity)}</span></div>
              <div className="admin-monitoring-error-copy">
                <div><strong>{row.message}</strong><span>{row.organization_name || 'Plateforme NCR'} · {sourceLabel(row.source)}</span></div>
                <p>{row.pathname || '/'} · V{row.app_version || 'inconnue'} · {row.occurrences} occurrence(s)</p>
                <small>Première : {dateTime(row.first_seen_at)} · Dernière : {dateTime(row.last_seen_at)}</small>
                {row.resolution_note && <em>Résolution : {row.resolution_note}</em>}
              </div>
              {!row.resolved_at && <button type="button" className="secondary-button compact" disabled={resolving === row.id} onClick={() => void resolveRuntimeError(row)}>{resolving === row.id ? 'Traitement…' : 'Marquer résolue'}</button>}
            </article>)}
          </div>
        </section>

        <section className="panel admin-monitoring-objects">
          <div className="panel-header"><div><p className="eyebrow">SOCLE TECHNIQUE</p><h2>Objets critiques attendus</h2><p>Ce contrôle repère une migration majeure absente ou incomplète.</p></div></div>
          <div className="admin-monitoring-object-grid">
            {report.required_objects.map((item) => <article key={item.object} className={item.status}><span><Icon name={item.status === 'ok' ? 'check' : 'close'} size={17} /></span><div><strong>{item.object}</strong><small>{item.detail}</small></div></article>)}
          </div>
        </section>
      </>}
    </section>
  );
}
