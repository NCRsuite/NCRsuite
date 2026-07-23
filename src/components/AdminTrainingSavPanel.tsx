import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { supabase } from '../lib/supabase';
import type { Plan } from '../types';

type SavOrganization = {
  organization_id: string;
  name: string;
  slug: string;
  plan: Plan;
  status: string;
  owner_email: string | null;
  sessions_total: number;
  sessions_attention: number;
  open_issues: number;
  initial_missing: number;
  final_missing: number;
  attestation_missing: number;
  document_jobs_pending: number;
  document_jobs_failed: number;
  email_failed: number;
  last_training_activity_at: string | null;
};

type SavOverview = {
  generated_at: string;
  summary: {
    organizations_total: number;
    organizations_with_issues: number;
    sessions_attention: number;
    document_jobs_failed: number;
    document_jobs_pending: number;
    email_failed: number;
    initial_missing: number;
    final_missing: number;
    attestation_missing: number;
  };
  organizations: SavOrganization[];
};

type SavReportSummary = {
  sessions_total: number;
  sessions_attention: number;
  initial_missing: number;
  final_missing: number;
  attestation_missing: number;
  document_jobs_failed: number;
  document_jobs_pending: number;
  email_failed: number;
};

type SavIssueCounts = {
  initial_missing: number;
  final_missing: number;
  attestation_missing: number;
  document_jobs_failed: number;
  email_failed: number;
};

type SavSession = {
  session_id: string;
  title: string;
  status: string;
  starts_at: string;
  ends_at: string;
  trainer_missing: boolean;
  program_not_ready: boolean;
  enrollment_count: number;
  initial_missing: number;
  final_missing: number;
  attestation_missing: number;
  document_jobs_pending: number;
  document_jobs_failed: number;
  email_failed: number;
  updated_at: string;
};

type SavJob = {
  job_id: string;
  session_id: string;
  session_title: string;
  trainee_name: string;
  document_kind: 'convocation' | 'attestation';
  status: string;
  attempts: number;
  generation_version: number;
  last_error: string | null;
  scheduled_for: string;
  updated_at: string;
};

type SavEmail = {
  email_id: string;
  template_key: string;
  recipient_email: string;
  recipient_name: string | null;
  status: string;
  attempts: number;
  last_error: string | null;
  updated_at: string;
  session_id: string | null;
};

type SavReport = {
  generated_at: string;
  organization: { id: string; name: string; slug: string; plan: Plan; status: string };
  summary: SavReportSummary;
  sessions: SavSession[];
  document_jobs: SavJob[];
  failed_emails: SavEmail[];
};

const emptyOverview: SavOverview = {
  generated_at: '',
  summary: {
    organizations_total: 0,
    organizations_with_issues: 0,
    sessions_attention: 0,
    document_jobs_failed: 0,
    document_jobs_pending: 0,
    email_failed: 0,
    initial_missing: 0,
    final_missing: 0,
    attestation_missing: 0
  },
  organizations: []
};

const planLabels: Record<Plan, string> = {
  decouverte: 'Découverte',
  essentielle: 'Essentielle',
  professionnelle: 'Professionnelle',
  metier: 'Métier'
};

const sessionStatusLabels: Record<string, string> = {
  draft: 'Brouillon',
  scheduled: 'Planifiée',
  in_progress: 'En cours',
  completed: 'Clôturée',
  canceled: 'Annulée'
};

const documentKindLabels: Record<SavJob['document_kind'], string> = {
  convocation: 'Convocation',
  attestation: 'Attestation'
};

function dateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function issueTotal(row: SavIssueCounts) {
  return row.initial_missing + row.final_missing + row.attestation_missing + row.document_jobs_failed + row.email_failed;
}

function toneForIssues(count: number) {
  if (count === 0) return 'ok';
  if (count <= 3) return 'warning';
  return 'error';
}

function templateLabel(value: string) {
  if (value === 'training_convocation') return 'Convocation';
  if (value === 'training_attestation') return 'Attestation';
  if (value === 'training_satisfaction_request') return 'Évaluation';
  if (value === 'training_commercial_document') return 'Document commercial';
  return value;
}

export function AdminTrainingSavPanel() {
  const [overview, setOverview] = useState<SavOverview>(emptyOverview);
  const [selectedId, setSelectedId] = useState('');
  const [report, setReport] = useState<SavReport | null>(null);
  const [search, setSearch] = useState('');
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadOverview(preserveSelected = true) {
    if (!supabase) return;
    setLoadingOverview(true);
    setError('');
    const { data, error: requestError } = await supabase.rpc('admin_training_sav_overview');
    if (requestError) {
      setError(requestError.message);
    } else {
      const next = (data ?? emptyOverview) as SavOverview;
      setOverview(next);
      if (!preserveSelected || !selectedId || !next.organizations.some((item) => item.organization_id === selectedId)) {
        const firstWithIssue = next.organizations.find((item) => item.open_issues > 0);
        setSelectedId(firstWithIssue?.organization_id ?? next.organizations[0]?.organization_id ?? '');
      }
    }
    setLoadingOverview(false);
  }

  async function loadReport(organizationId = selectedId) {
    if (!supabase || !organizationId) return;
    setLoadingReport(true);
    setError('');
    const { data, error: requestError } = await supabase.rpc('admin_training_sav_organization_report', { p_organization_id: organizationId });
    if (requestError) setError(requestError.message);
    else setReport(data as SavReport);
    setLoadingReport(false);
  }

  useEffect(() => { void loadOverview(false); }, []);
  useEffect(() => { if (selectedId) void loadReport(selectedId); }, [selectedId]);

  const visibleOrganizations = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return overview.organizations;
    return overview.organizations.filter((organization) => [
      organization.name,
      organization.slug,
      organization.owner_email ?? '',
      planLabels[organization.plan]
    ].some((value) => value.toLowerCase().includes(needle)));
  }, [overview.organizations, search]);

  const selectedOrganization = overview.organizations.find((item) => item.organization_id === selectedId) ?? null;
  const sessionsWithIssues = (report?.sessions ?? []).filter((session) => issueTotal(session) > 0 || session.trainer_missing || session.program_not_ready || session.document_jobs_pending > 0);

  async function refreshAll() {
    await loadOverview(true);
    if (selectedId) await loadReport(selectedId);
  }

  async function repairSession(session: SavSession, mode: 'all' | 'initial' | 'final' | 'attestations' | 'emails' | 'dossier') {
    if (!supabase || !report) return;
    setBusyAction(`${mode}-${session.session_id}`);
    setError('');
    setMessage('');
    const { data, error: requestError } = await supabase.rpc('admin_training_sav_repair_session', {
      p_organization_id: report.organization.id,
      p_session_id: session.session_id,
      p_mode: mode
    });
    if (requestError) setError(requestError.message);
    else {
      const result = (data ?? {}) as Record<string, unknown>;
      setMessage(`Session réparée : ${Number(result.initial_queued ?? 0)} initiale(s), ${Number(result.final_queued ?? 0)} finale(s), ${Number(result.attestations_queued ?? 0)} attestation(s), ${Number(result.emails_retried ?? 0)} e-mail(s) relancé(s).`);
      await refreshAll();
    }
    setBusyAction('');
  }

  async function retryJob(job: SavJob) {
    if (!supabase) return;
    setBusyAction(`job-${job.job_id}`);
    setError('');
    setMessage('');
    const { error: requestError } = await supabase.rpc('admin_training_sav_retry_document_job', { p_job_id: job.job_id });
    if (requestError) setError(requestError.message);
    else {
      setMessage(`${documentKindLabels[job.document_kind]} remise en file pour ${job.trainee_name || 'le stagiaire'}.`);
      await refreshAll();
    }
    setBusyAction('');
  }

  async function retryOrganizationEmails() {
    if (!supabase || !selectedId) return;
    setBusyAction('org-emails');
    setError('');
    setMessage('');
    const { data, error: requestError } = await supabase.rpc('admin_training_sav_retry_training_emails', {
      p_organization_id: selectedId,
      p_session_id: null
    });
    if (requestError) setError(requestError.message);
    else {
      const retried = Number(((data ?? {}) as Record<string, unknown>).retried ?? 0);
      setMessage(`${retried} e-mail(s) Formation remis en file.`);
      await refreshAll();
    }
    setBusyAction('');
  }

  return (
    <section className="admin-training-sav-layout">
      <header className="panel admin-training-sav-hero">
        <div>
          <p className="eyebrow">SAV FORMATION</p>
          <h2>Automatisations Formation sous contrôle NCR.</h2>
          <p>Diagnostic super admin des convocations, évaluations, attestations, e-mails et dossiers de session.</p>
        </div>
        <button type="button" className="secondary-button compact" onClick={() => void refreshAll()} disabled={loadingOverview || loadingReport}>
          <Icon name="activity" size={16} /> {loadingOverview || loadingReport ? 'Analyse…' : 'Actualiser'}
        </button>
      </header>

      {error && <div className="error-message" role="alert">{error}</div>}
      {message && <div className="success-message" role="status">{message}</div>}

      <section className="admin-training-sav-metrics">
        <article><span><Icon name="building" size={20} /></span><div><small>Entreprises Formation</small><strong>{overview.summary.organizations_total}</strong><em>{overview.summary.organizations_with_issues} avec point SAV</em></div></article>
        <article><span><Icon name="calendar" size={20} /></span><div><small>Sessions à vérifier</small><strong>{overview.summary.sessions_attention}</strong><em>sur le parc Formation</em></div></article>
        <article><span><Icon name="file" size={20} /></span><div><small>Jobs documents</small><strong>{overview.summary.document_jobs_failed}</strong><em>{overview.summary.document_jobs_pending} en attente</em></div></article>
        <article><span><Icon name="message" size={20} /></span><div><small>E-mails échoués</small><strong>{overview.summary.email_failed}</strong><em>Brevo ou file e-mail</em></div></article>
        <article><span><Icon name="clipboard" size={20} /></span><div><small>Évaluations manquantes</small><strong>{overview.summary.initial_missing + overview.summary.final_missing}</strong><em>{overview.summary.initial_missing} initiale(s)</em></div></article>
        <article><span><Icon name="graduation" size={20} /></span><div><small>Attestations</small><strong>{overview.summary.attestation_missing}</strong><em>document(s) manquant(s)</em></div></article>
      </section>

      <div className="admin-training-sav-workspace">
        <aside className="panel admin-training-sav-organizations">
          <div className="panel-header"><div><p className="eyebrow">ENTREPRISES</p><h2>Organismes de formation</h2><p>Les clients ne voient pas cette console.</p></div></div>
          <label className="admin-search-field"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, e-mail, formule…" /></label>
          <div className="admin-training-sav-org-list">
            {loadingOverview && <div className="admin-empty-state">Chargement des organismes…</div>}
            {!loadingOverview && visibleOrganizations.length === 0 && <div className="admin-empty-state">Aucun organisme Formation trouvé.</div>}
            {visibleOrganizations.map((organization) => {
              const tone = toneForIssues(organization.open_issues);
              return (
                <button key={organization.organization_id} type="button" className={selectedId === organization.organization_id ? 'selected' : ''} onClick={() => setSelectedId(organization.organization_id)}>
                  <span className="admin-company-avatar">{organization.name.slice(0, 1).toUpperCase()}</span>
                  <span><strong>{organization.name}</strong><small>{planLabels[organization.plan]} · {organization.owner_email || organization.slug}</small></span>
                  <em className={tone}>{organization.open_issues}</em>
                </button>
              );
            })}
          </div>
        </aside>

        <article className="panel admin-training-sav-detail">
          {!selectedOrganization || !report ? (
            <div className="admin-editor-empty"><span><Icon name="graduation" size={30} /></span><h2>{loadingReport ? 'Analyse Formation…' : 'Sélectionne un organisme'}</h2><p>Les sessions et automatisations à traiter apparaîtront ici.</p></div>
          ) : (
            <>
              <header className="admin-training-sav-detail-head">
                <div className="admin-editor-company">
                  <span className="admin-company-avatar large">{report.organization.name.slice(0, 1).toUpperCase()}</span>
                  <div><p className="eyebrow">DOSSIER SAV</p><h2>{report.organization.name}</h2><small>{planLabels[report.organization.plan]} · généré le {dateTime(report.generated_at)}</small></div>
                </div>
                <div className="admin-training-sav-actions">
                  <button type="button" className="secondary-button compact" onClick={() => void retryOrganizationEmails()} disabled={busyAction === 'org-emails' || report.summary.email_failed === 0}><Icon name="message" size={16} />{busyAction === 'org-emails' ? 'Relance…' : 'Relancer e-mails'}</button>
                </div>
              </header>

              <div className="admin-training-sav-summary">
                <article><small>Sessions</small><strong>{report.summary.sessions_attention}/{report.summary.sessions_total}</strong><span>à contrôler</span></article>
                <article><small>Évaluations</small><strong>{report.summary.initial_missing + report.summary.final_missing}</strong><span>manquantes</span></article>
                <article><small>Attestations</small><strong>{report.summary.attestation_missing}</strong><span>à générer</span></article>
                <article><small>Documents</small><strong>{report.summary.document_jobs_failed}</strong><span>job(s) échoué(s)</span></article>
                <article><small>E-mails</small><strong>{report.summary.email_failed}</strong><span>à relancer</span></article>
              </div>

              <section className="admin-training-sav-section">
                <div className="panel-header"><div><p className="eyebrow">SESSIONS</p><h2>Corrections guidées</h2></div></div>
                <div className="admin-training-sav-session-list">
                  {sessionsWithIssues.length === 0 && <div className="admin-positive-empty"><Icon name="check" size={22} /><div><strong>Aucun point SAV détecté</strong><small>Les automatisations Formation de cet organisme sont cohérentes.</small></div></div>}
                  {sessionsWithIssues.map((session) => {
                    const total = issueTotal(session);
                    return (
                      <article key={session.session_id} className={toneForIssues(total)}>
                        <div className="admin-training-sav-session-main">
                          <div><strong>{session.title}</strong><span>{sessionStatusLabels[session.status] ?? session.status} · {session.enrollment_count} stagiaire(s) · {dateTime(session.starts_at)}</span></div>
                          <div className="admin-training-sav-flags">
                            {session.trainer_missing && <span>Formateur manquant</span>}
                            {session.program_not_ready && <span>Formation incomplète</span>}
                            {session.initial_missing > 0 && <span>{session.initial_missing} initiale(s)</span>}
                            {session.final_missing > 0 && <span>{session.final_missing} finale(s)</span>}
                            {session.attestation_missing > 0 && <span>{session.attestation_missing} attestation(s)</span>}
                            {session.document_jobs_failed > 0 && <span>{session.document_jobs_failed} job(s) échoué(s)</span>}
                            {session.email_failed > 0 && <span>{session.email_failed} e-mail(s)</span>}
                            {session.document_jobs_pending > 0 && <span>{session.document_jobs_pending} en attente</span>}
                          </div>
                        </div>
                        <div className="admin-training-sav-session-actions">
                          <button type="button" className="primary-button compact" disabled={Boolean(busyAction)} onClick={() => void repairSession(session, 'all')}>{busyAction === `all-${session.session_id}` ? 'Réparation…' : 'Réparer'}</button>
                          <button type="button" className="secondary-button compact" disabled={Boolean(busyAction) || session.email_failed === 0} onClick={() => void repairSession(session, 'emails')}>E-mails</button>
                          <button type="button" className="secondary-button compact" disabled={Boolean(busyAction) || session.status !== 'completed'} onClick={() => void repairSession(session, 'dossier')}>Dossier</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="admin-training-sav-section two-columns">
                <div>
                  <div className="panel-header"><div><p className="eyebrow">DOCUMENTS</p><h2>Jobs à traiter</h2></div></div>
                  <div className="admin-training-sav-job-list">
                    {report.document_jobs.length === 0 && <div className="admin-empty-state">Aucun job document en erreur ou attente.</div>}
                    {report.document_jobs.map((job) => (
                      <article key={job.job_id} className={job.status === 'failed' ? 'error' : 'warning'}>
                        <div><strong>{documentKindLabels[job.document_kind]} · {job.trainee_name || 'Stagiaire'}</strong><span>{job.session_title} · tentative {job.attempts}</span>{job.last_error && <small>{job.last_error}</small>}</div>
                        <button type="button" className="secondary-button compact" disabled={Boolean(busyAction) || job.status !== 'failed'} onClick={() => void retryJob(job)}>{busyAction === `job-${job.job_id}` ? 'Relance…' : 'Relancer'}</button>
                      </article>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="panel-header"><div><p className="eyebrow">E-MAILS</p><h2>Échecs Brevo/file</h2></div></div>
                  <div className="admin-training-sav-email-list">
                    {report.failed_emails.length === 0 && <div className="admin-empty-state">Aucun e-mail Formation échoué.</div>}
                    {report.failed_emails.map((email) => (
                      <article key={email.email_id}>
                        <strong>{templateLabel(email.template_key)}</strong>
                        <span>{email.recipient_name || email.recipient_email} · tentative {email.attempts}</span>
                        {email.last_error && <small>{email.last_error}</small>}
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}
        </article>
      </div>
    </section>
  );
}
