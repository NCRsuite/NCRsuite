import { useEffect, useMemo, useState } from 'react';
import { APP_VERSION, PWA_CACHE_NAME } from '../config/runtime';
import { supabase } from '../lib/supabase';
import { Icon } from './Icon';

type ValidationStatus = 'ready' | 'attention' | 'blocked';
type CheckStatus = 'ok' | 'warning' | 'error';

type ValidationDiagnostics = {
  rls_disabled_tables?: string[];
  insecure_security_definer_functions?: string[];
  unexpected_anon_functions?: string[];
  sealed_by_rls_tables?: string[];
  current_failed_jobs?: number;
  current_stalled_jobs?: number;
  superseded_failed_jobs?: number;
};

type ValidationCheck = {
  key: string;
  category: string;
  label: string;
  status: CheckStatus;
  detail: string;
  action: string;
  diagnostics?: ValidationDiagnostics;
};

type ManualCheck = {
  key: string;
  label: string;
  completed?: boolean;
};

type ProductionValidationReport = {
  generated_at: string;
  release_version: string;
  frontend_version: string;
  pwa_cache: string;
  status: ValidationStatus;
  summary: {
    total: number;
    passed: number;
    warnings: number;
    blocking: number;
  };
  checks: ValidationCheck[];
  domains: Array<{ business_type: string; organizations: number }>;
  manual_checklist: ManualCheck[];
};

type ProductionValidationRun = {
  id: string;
  release_version: string;
  frontend_version: string;
  pwa_cache: string;
  status: ValidationStatus;
  total_checks: number;
  passed_checks: number;
  warning_checks: number;
  blocking_checks: number;
  created_at: string;
  created_by_name: string;
  report: ProductionValidationReport;
};

type AccessSecurityReport = {
  rls_disabled_tables?: string[];
  insecure_security_definer_functions?: string[];
  unexpected_anon_functions?: string[];
};

type SecurityIssueGroup = {
  label: string;
  values: string[];
};

function dateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function statusLabel(status: ValidationStatus) {
  if (status === 'ready') return 'Prête pour la production';
  if (status === 'attention') return 'Vérifications à terminer';
  return 'Mise en production bloquée';
}

function checkStatusLabel(status: CheckStatus) {
  if (status === 'ok') return 'Validé';
  if (status === 'warning') return 'À surveiller';
  return 'Bloquant';
}

function downloadText(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function reportFilename(extension: 'json' | 'csv') {
  return `validation-production-v${APP_VERSION}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

function isMissingCorrectedValidator(error: { code?: string } | null | undefined) {
  return error?.code === 'PGRST202' || error?.code === '42883';
}

function securityGroups(report: AccessSecurityReport | null, check?: ValidationCheck): SecurityIssueGroup[] {
  const diagnostics = check?.diagnostics;
  const groups: SecurityIssueGroup[] = [
    {
      label: 'Table(s) métier sans RLS',
      values: diagnostics?.rls_disabled_tables ?? report?.rls_disabled_tables ?? []
    },
    {
      label: 'Fonction(s) SECURITY DEFINER sans search_path sécurisé',
      values: diagnostics?.insecure_security_definer_functions ?? report?.insecure_security_definer_functions ?? []
    },
    {
      label: 'Fonction(s) accessible(s) au rôle anon hors liste autorisée',
      values: diagnostics?.unexpected_anon_functions ?? report?.unexpected_anon_functions ?? []
    }
  ];
  return groups.filter((group) => group.values.length > 0);
}

export function AdminProductionValidationPanel() {
  const [report, setReport] = useState<ProductionValidationReport | null>(null);
  const [history, setHistory] = useState<ProductionValidationRun[]>([]);
  const [securityReport, setSecurityReport] = useState<AccessSecurityReport | null>(null);
  const [manualChecks, setManualChecks] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function requestValidationReport(store: boolean, checks: string[]) {
    if (!supabase) throw new Error('Supabase indisponible.');

    const parameters = {
      p_frontend_version: APP_VERSION,
      p_pwa_cache: PWA_CACHE_NAME,
      p_store: store,
      p_manual_checks: checks
    };

    const corrected = await supabase.rpc('platform_production_validation_report_corrected', parameters);
    if (!corrected.error) return corrected.data as ProductionValidationReport;
    if (!isMissingCorrectedValidator(corrected.error)) throw corrected.error;

    // Compatibilité de déploiement : tant que la migration 151 n'est pas encore
    // appliquée, l'écran reste utilisable avec le validateur historique.
    const legacy = await supabase.rpc('platform_production_validation_report', parameters);
    if (legacy.error) throw legacy.error;
    return legacy.data as ProductionValidationReport;
  }

  async function loadHistory() {
    if (!supabase) return;
    const { data, error: requestError } = await supabase.rpc('platform_production_validation_history', { p_limit: 12 });
    if (requestError) throw requestError;
    setHistory((Array.isArray(data) ? data : []) as ProductionValidationRun[]);
  }

  async function load(resetManual = false) {
    if (!supabase) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const [validation, historyResult, securityResult] = await Promise.all([
        requestValidationReport(false, []),
        supabase.rpc('platform_production_validation_history', { p_limit: 12 }),
        supabase.rpc('platform_access_security_report')
      ]);
      if (historyResult.error) throw historyResult.error;
      setReport(validation);
      setHistory((Array.isArray(historyResult.data) ? historyResult.data : []) as ProductionValidationRun[]);
      setSecurityReport(securityResult.error ? null : securityResult.data as AccessSecurityReport);
      if (resetManual) setManualChecks(new Set());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'La validation finale est indisponible.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(true);
  }, []);

  const manualTotal = report?.manual_checklist.length ?? 0;
  const manualComplete = manualTotal > 0 && manualChecks.size === manualTotal;
  const displayedStatus = useMemo<ValidationStatus>(() => {
    if (!report) return 'attention';
    if (report.status === 'blocked') return 'blocked';
    if (report.status === 'attention' || !manualComplete) return 'attention';
    return 'ready';
  }, [manualComplete, report]);

  function toggleManualCheck(key: string) {
    setManualChecks((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setMessage('');
  }

  function exportReport(format: 'json' | 'csv') {
    if (!report) return;
    const exportedReport = {
      ...report,
      status: displayedStatus,
      manual_checklist: report.manual_checklist.map((item) => ({
        ...item,
        completed: manualChecks.has(item.key)
      }))
    };
    if (format === 'json') {
      downloadText(reportFilename('json'), JSON.stringify(exportedReport, null, 2), 'application/json;charset=utf-8');
      return;
    }
    const rows = [
      ['type', 'categorie', 'controle', 'statut', 'detail', 'action'],
      ...report.checks.map((check) => [
        'automatique', check.category, check.label, checkStatusLabel(check.status), check.detail, check.action
      ]),
      ...report.manual_checklist.map((check) => [
        'manuel', 'Mise en production', check.label, manualChecks.has(check.key) ? 'Validé' : 'À confirmer', '', ''
      ])
    ];
    downloadText(
      reportFilename('csv'),
      `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\n')}\n`,
      'text/csv;charset=utf-8'
    );
  }

  function exportHistory() {
    const rows = [
      ['date', 'version', 'verdict', 'valides', 'avertissements', 'bloquants', 'enregistre_par'],
      ...history.map((run) => [
        dateTime(run.created_at),
        run.release_version,
        statusLabel(run.status),
        run.passed_checks,
        run.warning_checks,
        run.blocking_checks,
        run.created_by_name
      ])
    ];
    downloadText(
      `historique-validations-production-${new Date().toISOString().slice(0, 10)}.csv`,
      `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\n')}\n`,
      'text/csv;charset=utf-8'
    );
  }

  async function storeValidation() {
    if (!supabase || !report || !manualComplete) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const storedReport = await requestValidationReport(true, Array.from(manualChecks));
      setReport(storedReport);
      await loadHistory();
      setMessage(
        storedReport.status === 'ready'
          ? 'Validation finale enregistrée : NCR Suite est prête pour la production.'
          : 'Contrôle enregistré. Les points signalés doivent être corrigés avant la validation finale.'
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Le contrôle n’a pas pu être enregistré.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-production-validation" aria-labelledby="production-validation-title">
      <header className={`panel admin-production-validation-hero ${displayedStatus}`}>
        <span className="admin-production-validation-icon">
          <Icon name={displayedStatus === 'ready' ? 'check' : displayedStatus === 'blocked' ? 'lock' : 'shield'} size={25} />
        </span>
        <div>
          <p className="eyebrow">VALIDATION PRODUCTION FINALE</p>
          <h2 id="production-validation-title">{statusLabel(displayedStatus)}</h2>
          <p>Contrôles automatiques, confirmations humaines et preuve horodatée de la décision de mise en production.</p>
        </div>
        <div className="admin-production-validation-actions">
          <button type="button" className="secondary-button compact" onClick={() => void load(true)} disabled={loading || saving}>
            <Icon name="refresh" size={16} /> {loading ? 'Contrôle…' : 'Relancer'}
          </button>
          <button type="button" className="secondary-button compact" onClick={() => exportReport('json')} disabled={!report}>
            <Icon name="file" size={16} /> JSON
          </button>
          <button type="button" className="secondary-button compact" onClick={() => exportReport('csv')} disabled={!report}>
            <Icon name="file" size={16} /> CSV
          </button>
        </div>
      </header>

      {error && <div className="error-message" role="alert">{error}</div>}
      {message && <div className="success-message" role="status">{message}</div>}

      {loading && !report ? (
        <div className="panel admin-empty-state">Contrôle final de NCR Suite en cours…</div>
      ) : report && (
        <>
          <section className="admin-production-validation-metrics" aria-label="Résumé du contrôle">
            <article><small>Contrôles automatiques</small><strong>{report.summary.total}</strong><span>tous domaines</span></article>
            <article className="ok"><small>Validés</small><strong>{report.summary.passed}</strong><span>sans anomalie</span></article>
            <article className="warning"><small>Avertissements</small><strong>{report.summary.warnings}</strong><span>à examiner</span></article>
            <article className="error"><small>Bloquants</small><strong>{report.summary.blocking}</strong><span>à corriger</span></article>
            <article><small>Contrôles manuels</small><strong>{manualChecks.size}/{manualTotal}</strong><span>confirmés</span></article>
          </section>

          <section className="admin-production-validation-grid">
            <article className="panel admin-production-validation-checks">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">CONTRÔLES AUTOMATIQUES</p>
                  <h2>État réel de la plateforme</h2>
                  <p>Analyse générée le {dateTime(report.generated_at)}.</p>
                </div>
              </div>
              <div className="admin-production-validation-check-list">
                {report.checks.map((check) => {
                  const issueGroups = check.key === 'access_security' && check.status !== 'ok'
                    ? securityGroups(securityReport, check)
                    : [];
                  return (
                    <article key={check.key} className={check.status}>
                      <span><Icon name={check.status === 'ok' ? 'check' : 'alert'} size={17} /></span>
                      <div>
                        <small>{check.category}</small>
                        <strong>{check.label}</strong>
                        <p>{check.detail}</p>
                        {issueGroups.length > 0 && (
                          <div className="admin-production-validation-diagnostics" role="note" aria-label="Détail des anomalies de sécurité">
                            <strong>Détail exact détecté</strong>
                            {issueGroups.map((group) => (
                              <div key={group.label}>
                                <small>{group.label}</small>
                                <ul>
                                  {group.values.map((value) => <li key={`${group.label}-${value}`}><code>{value}</code></li>)}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                        {check.status !== 'ok' && <em>{check.action}</em>}
                      </div>
                      <b>{checkStatusLabel(check.status)}</b>
                    </article>
                  );
                })}
              </div>
            </article>

            <article className="panel admin-production-validation-manual">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">CONFIRMATION HUMAINE</p>
                  <h2>Liste avant ouverture</h2>
                  <p>Chaque point doit avoir été réellement testé.</p>
                </div>
              </div>
              <div className="admin-production-validation-manual-list">
                {report.manual_checklist.map((check) => (
                  <label key={check.key} className={manualChecks.has(check.key) ? 'completed' : ''}>
                    <input
                      type="checkbox"
                      checked={manualChecks.has(check.key)}
                      onChange={() => toggleManualCheck(check.key)}
                    />
                    <span><Icon name="check" size={15} /></span>
                    <strong>{check.label}</strong>
                  </label>
                ))}
              </div>
              <div className="admin-production-validation-progress">
                <div><span style={{ width: `${manualTotal ? (manualChecks.size / manualTotal) * 100 : 0}%` }} /></div>
                <small>{manualComplete ? 'Tous les contrôles manuels sont confirmés.' : `${manualTotal - manualChecks.size} confirmation(s) restante(s).`}</small>
              </div>
              <button
                type="button"
                className="primary-button"
                disabled={!manualComplete || saving}
                onClick={() => void storeValidation()}
              >
                <Icon name="shield" size={17} /> {saving ? 'Enregistrement…' : 'Enregistrer ce contrôle'}
              </button>
            </article>
          </section>

          <section className="panel admin-production-validation-history">
            <div className="panel-header">
              <div>
                <p className="eyebrow">PREUVES DE VALIDATION</p>
                <h2>Historique horodaté</h2>
                <p>Les verdicts enregistrés restent disponibles pour le suivi de production.</p>
              </div>
              <button type="button" className="secondary-button compact" onClick={exportHistory} disabled={history.length === 0}>
                <Icon name="file" size={16} /> Exporter l’historique
              </button>
            </div>
            <div className="admin-production-validation-history-list">
              {history.length === 0 && <div className="admin-empty-state">Aucun contrôle final enregistré.</div>}
              {history.map((run) => (
                <article key={run.id} className={run.status}>
                  <span><Icon name={run.status === 'ready' ? 'check' : run.status === 'blocked' ? 'lock' : 'alert'} size={17} /></span>
                  <div>
                    <strong>V{run.release_version} · {statusLabel(run.status)}</strong>
                    <small>{dateTime(run.created_at)} · {run.created_by_name}</small>
                  </div>
                  <p><b>{run.passed_checks}</b> validé(s) · <b>{run.warning_checks}</b> avertissement(s) · <b>{run.blocking_checks}</b> bloquant(s)</p>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
