import { useEffect, useMemo, useState } from 'react';
import { businessPacks } from '../config/businessPacks';
import { supabase } from '../lib/supabase';
import type { BusinessType, Plan } from '../types';
import { Icon } from './Icon';

type AdminOrganizationOption = {
  id: string;
  name: string;
  slug: string;
  business_type: BusinessType;
  plan: Plan;
  organization_status: string;
  owner_email: string | null;
  health: 'healthy' | 'attention' | 'critical';
};

type DiagnosticCheck = {
  key: string;
  label: string;
  status: 'ok' | 'warning' | 'error';
  detail: string;
};


type AccessSecurityReport = {
  generated_at: string;
  summary: {
    rls_disabled: number;
    policyless: number;
    insecure_security_definer: number;
    unexpected_anon_functions: number;
  };
  rls_disabled_tables: string[];
  policyless_tables: string[];
  insecure_security_definer_functions: string[];
  unexpected_anon_functions: string[];
};

type DiagnosticPayload = {
  organization: {
    id: string;
    name: string;
    slug: string;
    business_type: BusinessType;
    plan: Plan;
    status: string;
    created_at: string;
    last_activity_at: string | null;
  };
  summary: {
    members: number;
    member_limit: number;
    modules: number;
    documents_bytes: number;
    open_tickets: number;
    email_failed: number;
    push_failed: number;
    setup_progress: number;
  };
  checks: DiagnosticCheck[];
  setup: { progress: number; completed_steps: number; total_steps: number };
  last_import: { import_type: string; status: string; inserted_rows: number; error_rows: number; created_at: string } | null;
};

function bytesLabel(value: number) {
  if (!value) return '0 Mo';
  const mb = value / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} Go` : `${mb.toFixed(mb < 10 ? 1 : 0)} Mo`;
}

function dateLabel(value: string | null) {
  if (!value) return 'Aucune activité';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function planLabel(plan: Plan) {
  return plan === 'decouverte' ? 'Découverte' : plan === 'essentielle' ? 'Essentielle' : plan === 'professionnelle' ? 'Professionnelle' : 'Métier';
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AdminDiagnosticsPanel({ onOpenSupport }: { onOpenSupport: () => void }) {
  const [organizations, setOrganizations] = useState<AdminOrganizationOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [diagnostic, setDiagnostic] = useState<DiagnosticPayload | null>(null);
  const [accessAudit, setAccessAudit] = useState<AccessSecurityReport | null>(null);
  const [search, setSearch] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDiagnostic, setLoadingDiagnostic] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  async function loadAccessAudit() {
    if (!supabase) return;
    const { data } = await supabase.rpc('platform_access_security_report');
    if (data) setAccessAudit(data as AccessSecurityReport);
  }

  async function loadOrganizations() {
    if (!supabase) return;
    setLoadingList(true);
    setError('');
    const { data, error: requestError } = await supabase.rpc('admin_list_organizations', {
      p_search: null,
      p_plan: null,
      p_status: null
    });
    if (requestError) setError(requestError.message);
    else {
      const rows = (Array.isArray(data) ? data : []) as AdminOrganizationOption[];
      setOrganizations(rows);
      setSelectedId((current) => current && rows.some((row) => row.id === current) ? current : rows[0]?.id ?? '');
    }
    setLoadingList(false);
  }

  async function loadDiagnostic(organizationId = selectedId) {
    if (!supabase || !organizationId) return;
    setLoadingDiagnostic(true);
    setError('');
    const { data, error: requestError } = await supabase.rpc('admin_organization_diagnostics', { p_organization_id: organizationId });
    if (requestError) setError(requestError.message);
    else setDiagnostic(data as DiagnosticPayload);
    setLoadingDiagnostic(false);
  }

  useEffect(() => { void loadOrganizations(); void loadAccessAudit(); }, []);
  useEffect(() => { if (selectedId) void loadDiagnostic(selectedId); }, [selectedId]);

  const visibleOrganizations = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return organizations;
    return organizations.filter((organization) => [organization.name, organization.slug, organization.owner_email ?? '', businessPacks[organization.business_type].label].some((value) => value.toLowerCase().includes(needle)));
  }, [organizations, search]);

  const selected = organizations.find((organization) => organization.id === selectedId) ?? null;
  const issueCount = diagnostic?.checks.filter((check) => check.status !== 'ok').length ?? 0;

  async function exportSnapshot() {
    if (!supabase || !selectedId || !diagnostic) return;
    setExporting(true);
    setError('');
    const { data, error: requestError } = await supabase.rpc('admin_export_organization_snapshot', { p_organization_id: selectedId });
    if (requestError) setError(requestError.message);
    else downloadJson(`diagnostic-${diagnostic.organization.slug}-${new Date().toISOString().slice(0, 10)}.json`, data);
    setExporting(false);
  }

  return (
    <section className="admin-diagnostics-layout">
      <aside className="panel admin-diagnostics-organizations">
        <div className="panel-header">
          <div><p className="eyebrow">DIAGNOSTIC</p><h2>Entreprises</h2><p>Sélectionne un espace pour vérifier sa configuration sans ouvrir ses données métier.</p></div>
        </div>
        <label className="admin-search-field"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Entreprise, domaine, e-mail…" /></label>
        <div className="admin-diagnostic-org-list">
          {loadingList && <div className="admin-empty-state">Chargement des entreprises…</div>}
          {!loadingList && visibleOrganizations.length === 0 && <div className="admin-empty-state">Aucune entreprise trouvée.</div>}
          {visibleOrganizations.map((organization) => (
            <button type="button" key={organization.id} className={selectedId === organization.id ? 'selected' : ''} onClick={() => setSelectedId(organization.id)}>
              <span className="admin-company-avatar">{organization.name.slice(0, 1).toUpperCase()}</span>
              <span><strong>{organization.name}</strong><small>{businessPacks[organization.business_type].label} · {planLabel(organization.plan)}</small></span>
              <i className={`admin-diagnostic-dot ${organization.health}`} />
            </button>
          ))}
        </div>
      </aside>

      <article className="panel admin-diagnostic-detail">
        {!selected || !diagnostic ? (
          <div className="admin-editor-empty"><span><Icon name="monitor" size={30} /></span><h2>{loadingDiagnostic ? 'Analyse en cours…' : 'Sélectionne une entreprise'}</h2><p>Les files techniques, quotas et réglages seront contrôlés ici.</p></div>
        ) : (
          <>
            <header className="admin-diagnostic-header">
              <div className="admin-editor-company">
                <span className="admin-company-avatar large">{selected.name.slice(0, 1).toUpperCase()}</span>
                <div><p className="eyebrow">SANTÉ DE L’ESPACE</p><h2>{selected.name}</h2><small>{businessPacks[selected.business_type].label} · {planLabel(selected.plan)} · {selected.owner_email || selected.slug}</small></div>
              </div>
              <div className="admin-diagnostic-header-actions">
                <button type="button" className="secondary-button compact" onClick={() => void loadDiagnostic()} disabled={loadingDiagnostic}><Icon name="activity" size={16} /> {loadingDiagnostic ? 'Analyse…' : 'Relancer'}</button>
                <button type="button" className="secondary-button compact" onClick={() => void exportSnapshot()} disabled={exporting}><Icon name="file" size={16} /> {exporting ? 'Export…' : 'Exporter'}</button>
              </div>
            </header>

            <div className="admin-diagnostic-score">
              <div className={`admin-diagnostic-score-icon ${issueCount === 0 ? 'ok' : issueCount <= 2 ? 'warning' : 'error'}`}><Icon name={issueCount === 0 ? 'check' : 'alert'} size={24} /></div>
              <div><strong>{issueCount === 0 ? 'Aucune anomalie détectée' : `${issueCount} point(s) à vérifier`}</strong><span>Dernière activité : {dateLabel(diagnostic.organization.last_activity_at)}</span></div>
              <button type="button" className="primary-button compact" onClick={onOpenSupport}><Icon name="headset" size={16} /> Ouvrir le support</button>
            </div>

            <div className="admin-diagnostic-metrics">
              <article><small>Utilisateurs</small><strong>{diagnostic.summary.members} / {diagnostic.summary.member_limit}</strong><span>accès actifs</span></article>
              <article><small>Mise en service</small><strong>{diagnostic.summary.setup_progress}%</strong><span>checklist métier</span></article>
              <article><small>Modules actifs</small><strong>{diagnostic.summary.modules}</strong><span>dans cet espace</span></article>
              <article><small>Documents</small><strong>{bytesLabel(diagnostic.summary.documents_bytes)}</strong><span>stockage recensé</span></article>
              <article><small>Support</small><strong>{diagnostic.summary.open_tickets}</strong><span>ticket(s) ouvert(s)</span></article>
              <article><small>Échecs techniques</small><strong>{diagnostic.summary.email_failed + diagnostic.summary.push_failed}</strong><span>e-mails + push</span></article>
            </div>

            <div className="admin-diagnostic-checks">
              {diagnostic.checks.map((check) => (
                <article key={check.key} className={check.status}>
                  <span><Icon name={check.status === 'ok' ? 'check' : check.status === 'warning' ? 'alert' : 'close'} size={18} /></span>
                  <div><strong>{check.label}</strong><small>{check.detail}</small></div>
                  <em>{check.status === 'ok' ? 'Opérationnel' : check.status === 'warning' ? 'À surveiller' : 'Action requise'}</em>
                </article>
              ))}
            </div>

            <div className="admin-diagnostic-footer-grid">
              <article className="admin-diagnostic-mini-card">
                <span><Icon name="clipboard" size={20} /></span>
                <div><small>Dernier import</small><strong>{diagnostic.last_import ? diagnostic.last_import.import_type : 'Aucun import'}</strong><p>{diagnostic.last_import ? `${diagnostic.last_import.inserted_rows} importée(s) · ${diagnostic.last_import.error_rows} erreur(s)` : 'Le centre de démarrage n’a pas encore été utilisé.'}</p></div>
              </article>
              <article className="admin-diagnostic-mini-card">
                <span><Icon name="shield" size={20} /></span>
                <div><small>Instantané support</small><strong>Export sans secrets sensibles</strong><p>Le fichier JSON exclut les identifiants bancaires et les références privées des prestataires.</p></div>
              </article>
              <article className={`admin-diagnostic-mini-card access-audit ${accessAudit && Object.values(accessAudit.summary).some((value) => value > 0) ? 'warning' : 'ok'}`}>
                <span><Icon name={accessAudit && Object.values(accessAudit.summary).some((value) => value > 0) ? 'alert' : 'shield'} size={20} /></span>
                <div>
                  <small>Sécurité des accès</small>
                  <strong>{!accessAudit ? 'Analyse indisponible' : Object.values(accessAudit.summary).every((value) => value === 0) ? 'RLS et fonctions publiques conformes' : 'Anomalies techniques détectées'}</strong>
                  <p>{!accessAudit ? 'Exécute la migration 058 pour activer le rapport.' : `${accessAudit.summary.rls_disabled} table(s) sans RLS · ${accessAudit.summary.policyless} sans politique · ${accessAudit.summary.unexpected_anon_functions} fonction(s) anon inattendue(s).`}</p>
                </div>
              </article>
            </div>
          </>
        )}
      </article>
    </section>
  );
}
