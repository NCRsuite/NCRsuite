import { useEffect, useMemo, useState } from 'react';
import { APP_VERSION, PWA_CACHE_NAME } from '../config/runtime';
import { supabase } from '../lib/supabase';
import type { BusinessType, Plan } from '../types';
import { Icon } from './Icon';

type CheckStatus = 'ok' | 'warning' | 'error';
type ValidationStatus = 'ready' | 'attention' | 'blocked';
type RunStatus = 'in_progress' | 'ready' | 'blocked';

type OrganizationOption = {
  id: string;
  name: string;
  business_type: BusinessType;
  plan: Plan;
  organization_status: string;
  subscription_status: string;
  owner_email: string | null;
};

type AutomaticCheck = {
  key: string;
  category: string;
  label: string;
  status: CheckStatus;
  detail: string;
  action: string;
};

type ScenarioItem = {
  key: string;
  label: string;
};

type ScenarioStage = {
  key: string;
  label: string;
  items: ScenarioItem[];
};

type ReadinessReport = {
  generated_at: string;
  organization: {
    id: string;
    name: string;
    business_type: BusinessType;
    plan: Plan;
    status: string;
  };
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
  checks: AutomaticCheck[];
  scenarios: ScenarioStage[];
};

type ScenarioResult = {
  key: string;
  completed: boolean;
  note: string;
};

type ValidationRun = {
  id: string;
  organization_id: string | null;
  organization_name: string;
  business_type: BusinessType;
  plan_key: Plan;
  release_version: string;
  status: RunStatus;
  completed_count: number;
  total_count: number;
  final_notes: string | null;
  created_at: string;
  created_by_name: string;
};

const businessLabels: Record<BusinessType, string> = {
  coiffure: 'Coiffure',
  nettoyage: 'Nettoyage',
  securite: 'Sécurité',
  formation: 'Formation',
  restauration: 'Restauration'
};

const planLabels: Record<Plan, string> = {
  decouverte: 'Découverte',
  essentielle: 'Essentielle',
  professionnelle: 'Professionnelle',
  metier: 'Métier'
};

function dateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

function checkLabel(status: CheckStatus) {
  if (status === 'ok') return 'Validé';
  if (status === 'warning') return 'À confirmer';
  return 'Bloquant';
}

function runLabel(status: RunStatus) {
  if (status === 'ready') return 'Recette validée';
  if (status === 'blocked') return 'Blocage détecté';
  return 'Recette en cours';
}

function downloadJson(report: ReadinessReport, results: ScenarioResult[], notes: string) {
  const content = JSON.stringify({
    ...report,
    scenario_results: results,
    final_notes: notes,
    exported_at: new Date().toISOString()
  }, null, 2);
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `recette-client-${report.organization.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AdminCommercialReadinessPanel() {
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [history, setHistory] = useState<ValidationRun[]>([]);
  const [results, setResults] = useState<Record<string, ScenarioResult>>({});
  const [finalNotes, setFinalNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadOrganizations() {
    if (!supabase) return [] as OrganizationOption[];
    const { data, error: requestError } = await supabase.rpc('admin_list_organizations', {
      p_search: null,
      p_plan: null,
      p_status: null
    });
    if (requestError) throw requestError;
    return (Array.isArray(data) ? data : []) as OrganizationOption[];
  }

  async function loadHistory(targetOrganizationId?: string) {
    if (!supabase) return;
    const { data, error: requestError } = await supabase.rpc('platform_commercial_validation_history', {
      p_organization_id: targetOrganizationId || null,
      p_limit: 20
    });
    if (requestError) throw requestError;
    setHistory((Array.isArray(data) ? data : []) as ValidationRun[]);
  }

  async function loadReport(targetOrganizationId: string, resetResults = false) {
    if (!supabase || !targetOrganizationId) {
      setReport(null);
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const [reportResult, historyResult] = await Promise.all([
        supabase.rpc('platform_commercial_readiness_report', {
          p_organization_id: targetOrganizationId
        }),
        supabase.rpc('platform_commercial_validation_history', {
          p_organization_id: targetOrganizationId,
          p_limit: 20
        })
      ]);
      if (reportResult.error) throw reportResult.error;
      if (historyResult.error) throw historyResult.error;
      setReport(reportResult.data as ReadinessReport);
      setHistory((Array.isArray(historyResult.data) ? historyResult.data : []) as ValidationRun[]);
      if (resetResults) {
        setResults({});
        setFinalNotes('');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'La recette client est indisponible.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function initialLoad() {
      setLoading(true);
      setError('');
      try {
        const rows = await loadOrganizations();
        if (!active) return;
        setOrganizations(rows);
        const first = rows.find((organization) => (
          organization.organization_status === 'active' || organization.organization_status === 'trial'
        )) ?? rows[0];
        if (first) {
          setOrganizationId(first.id);
          await loadReport(first.id, true);
        } else {
          await loadHistory();
          setLoading(false);
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'La liste des entreprises est indisponible.');
          setLoading(false);
        }
      }
    }
    void initialLoad();
    return () => { active = false; };
  }, []);

  const allScenarioItems = useMemo(
    () => report?.scenarios.flatMap((stage) => stage.items) ?? [],
    [report]
  );
  const completedCount = allScenarioItems.filter((item) => results[item.key]?.completed).length;
  const allCompleted = allScenarioItems.length > 0 && completedCount === allScenarioItems.length;
  const canFinalize = Boolean(
    report
    && report.summary.blocking === 0
    && allCompleted
    && finalNotes.trim().length >= 10
  );

  function changeOrganization(nextId: string) {
    setOrganizationId(nextId);
    void loadReport(nextId, true);
  }

  function toggleScenario(item: ScenarioItem) {
    setResults((current) => {
      const previous = current[item.key] ?? { key: item.key, completed: false, note: '' };
      return {
        ...current,
        [item.key]: { ...previous, completed: !previous.completed }
      };
    });
    setMessage('');
  }

  function updateScenarioNote(item: ScenarioItem, note: string) {
    setResults((current) => {
      const previous = current[item.key] ?? { key: item.key, completed: false, note: '' };
      return { ...current, [item.key]: { ...previous, note } };
    });
  }

  function serializedResults() {
    return allScenarioItems.map((item) => (
      results[item.key] ?? { key: item.key, completed: false, note: '' }
    ));
  }

  async function storeValidation(finalize: boolean) {
    if (!supabase || !organizationId || !report) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const { data, error: requestError } = await supabase.rpc('store_platform_commercial_validation', {
        p_organization_id: organizationId,
        p_frontend_version: APP_VERSION,
        p_pwa_cache: PWA_CACHE_NAME,
        p_scenario_results: serializedResults(),
        p_final_notes: finalNotes.trim() || null,
        p_finalize: finalize
      });
      if (requestError) throw requestError;
      const stored = data as { status: RunStatus };
      await loadHistory(organizationId);
      setMessage(
        stored.status === 'ready'
          ? 'Recette client clôturée et preuve horodatée enregistrée.'
          : stored.status === 'blocked'
            ? 'Avancement enregistré. Les blocages automatiques restent à corriger.'
            : 'Avancement et observations enregistrés.'
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'La recette n’a pas pu être enregistrée.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-commercial-readiness" aria-labelledby="commercial-readiness-title">
      <header className="panel admin-commercial-readiness-hero">
        <span className="admin-commercial-readiness-icon"><Icon name="clipboard" size={26} /></span>
        <div>
          <p className="eyebrow">RECETTE COMMERCIALE</p>
          <h2 id="commercial-readiness-title">Valider un premier client de bout en bout</h2>
          <p>Contrôlez une entreprise pilote existante et conservez les preuves de chaque essai sans créer de données automatiquement.</p>
        </div>
        <div className="admin-commercial-readiness-actions">
          <label>
            <span>Entreprise pilote</span>
            <select value={organizationId} onChange={(event) => changeOrganization(event.target.value)} disabled={loading || saving}>
              {organizations.length === 0 && <option value="">Aucune entreprise</option>}
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name} · {businessLabels[organization.business_type]} · {planLabels[organization.plan]}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="secondary-button compact" onClick={() => void loadReport(organizationId)} disabled={!organizationId || loading || saving}>
            <Icon name="refresh" size={16} /> {loading ? 'Contrôle…' : 'Actualiser'}
          </button>
        </div>
      </header>

      {error && <div className="error-message" role="alert">{error}</div>}
      {message && <div className="success-message" role="status">{message}</div>}

      {!report && !loading && (
        <div className="panel admin-empty-state">Sélectionnez une entreprise pilote pour commencer la recette.</div>
      )}

      {report && (
        <>
          <section className="admin-commercial-readiness-summary" aria-label="Résumé de la recette">
            <article>
              <small>Entreprise pilote</small>
              <strong>{report.organization.name}</strong>
              <span>{businessLabels[report.organization.business_type]} · {planLabels[report.organization.plan]}</span>
            </article>
            <article className="ok"><small>Contrôles validés</small><strong>{report.summary.passed}/{report.summary.total}</strong><span>analyse automatique</span></article>
            <article className="warning"><small>À confirmer</small><strong>{report.summary.warnings}</strong><span>points non bloquants</span></article>
            <article className="error"><small>Blocages</small><strong>{report.summary.blocking}</strong><span>à corriger avant clôture</span></article>
            <article><small>Scénarios réalisés</small><strong>{completedCount}/{allScenarioItems.length}</strong><span>preuves humaines</span></article>
          </section>

          <section className="admin-commercial-readiness-grid">
            <article className="panel admin-commercial-readiness-auto">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">CONTRÔLES AUTOMATIQUES</p>
                  <h2>État réel de l’entreprise</h2>
                  <p>Analyse du {dateTime(report.generated_at)}.</p>
                </div>
                <button type="button" className="secondary-button compact" onClick={() => downloadJson(report, serializedResults(), finalNotes)}>
                  <Icon name="file" size={16} /> Exporter
                </button>
              </div>
              <div className="admin-commercial-readiness-checks">
                {report.checks.map((check) => (
                  <article key={check.key} className={check.status}>
                    <span><Icon name={check.status === 'ok' ? 'check' : 'alert'} size={17} /></span>
                    <div>
                      <small>{check.category}</small>
                      <strong>{check.label}</strong>
                      <p>{check.detail}</p>
                      {check.status !== 'ok' && <em>{check.action}</em>}
                    </div>
                    <b>{checkLabel(check.status)}</b>
                  </article>
                ))}
              </div>
            </article>

            <aside className="admin-commercial-readiness-progress">
              <article className={`panel ${report.summary.blocking > 0 ? 'blocked' : allCompleted ? 'ready' : ''}`}>
                <p className="eyebrow">AVANCEMENT</p>
                <h2>{allCompleted ? 'Tous les scénarios sont testés' : 'Recette en cours'}</h2>
                <div><span style={{ width: `${allScenarioItems.length ? (completedCount / allScenarioItems.length) * 100 : 0}%` }} /></div>
                <p>{completedCount} scénario(s) confirmé(s) sur {allScenarioItems.length}.</p>
                {report.summary.blocking > 0 && <strong>{report.summary.blocking} blocage(s) automatique(s) empêchent la clôture.</strong>}
              </article>
            </aside>
          </section>

          <section className="admin-commercial-readiness-stages">
            {report.scenarios.map((stage, index) => {
              const stageCompleted = stage.items.filter((item) => results[item.key]?.completed).length;
              return (
                <article key={stage.key} className="panel">
                  <header>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <p className="eyebrow">ÉTAPE DE RECETTE</p>
                      <h2>{stage.label}</h2>
                    </div>
                    <b>{stageCompleted}/{stage.items.length}</b>
                  </header>
                  <div>
                    {stage.items.map((item) => {
                      const state = results[item.key] ?? { key: item.key, completed: false, note: '' };
                      return (
                        <div key={item.key} className={state.completed ? 'completed' : ''}>
                          <label>
                            <input type="checkbox" checked={state.completed} onChange={() => toggleScenario(item)} />
                            <span><Icon name="check" size={15} /></span>
                            <strong>{item.label}</strong>
                          </label>
                          <input
                            type="text"
                            value={state.note}
                            maxLength={1200}
                            onChange={(event) => updateScenarioNote(item, event.target.value)}
                            placeholder="Référence, date ou résultat observé"
                            aria-label={`Preuve pour ${item.label}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </section>

          <section className="panel admin-commercial-readiness-decision">
            <div>
              <p className="eyebrow">DÉCISION</p>
              <h2>Observations finales</h2>
              <p>Indiquez la référence du client test, la date ou les éléments utiles à la preuve de validation.</p>
            </div>
            <textarea
              value={finalNotes}
              onChange={(event) => setFinalNotes(event.target.value)}
              maxLength={4000}
              rows={4}
              placeholder="Exemple : parcours réalisé le 28/07/2026 avec l’entreprise pilote, paiement test et notifications vérifiés."
            />
            <div className="admin-commercial-readiness-decision-actions">
              <button type="button" className="secondary-button" onClick={() => void storeValidation(false)} disabled={saving}>
                <Icon name="file" size={17} /> {saving ? 'Enregistrement…' : 'Enregistrer l’avancement'}
              </button>
              <button type="button" className="primary-button" onClick={() => void storeValidation(true)} disabled={!canFinalize || saving}>
                <Icon name="shield" size={17} /> Clôturer la recette
              </button>
            </div>
            {!canFinalize && (
              <small>
                La clôture exige tous les scénarios, une observation finale et aucun blocage automatique.
              </small>
            )}
          </section>

          <section className="panel admin-commercial-readiness-history">
            <div className="panel-header">
              <div>
                <p className="eyebrow">PREUVES HORODATÉES</p>
                <h2>Historique de l’entreprise pilote</h2>
                <p>Chaque sauvegarde conserve le verdict, l’auteur et l’avancement observé.</p>
              </div>
            </div>
            <div>
              {history.length === 0 && <div className="admin-empty-state">Aucune recette enregistrée pour cette entreprise.</div>}
              {history.map((run) => (
                <article key={run.id} className={run.status}>
                  <span><Icon name={run.status === 'ready' ? 'check' : run.status === 'blocked' ? 'lock' : 'clock'} size={17} /></span>
                  <div>
                    <strong>{runLabel(run.status)}</strong>
                    <small>{dateTime(run.created_at)} · {run.created_by_name}</small>
                  </div>
                  <p><b>{run.completed_count}/{run.total_count}</b> scénarios · V{run.release_version}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
