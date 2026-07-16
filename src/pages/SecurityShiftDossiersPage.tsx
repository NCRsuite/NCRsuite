import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import { generateSecurityShiftDossierPdf, type SecurityDossierInvoice, type SecurityDossierPosition } from '../features/security/shiftDossierPdf';
import {
  formatSecurityDateTime,
  formatSecurityDuration,
  securityPersonName,
  securityShiftMinutes,
  type SecurityEmergencyAlertRecord,
  type SecurityLogbookEntryRecord,
  type SecurityPatrolRecord,
  type SecurityPtiSessionRecord,
  type SecurityShiftDossierReadiness,
  type SecurityShiftRecord
} from '../features/security/types';
import { closeFileWindow, prepareFileWindow, showBlobDownload } from '../lib/browserFiles';
import { supabase } from '../lib/supabase';

type DossierTab = 'to_complete' | 'ready' | 'closed' | 'archived';
type DossierRow = SecurityShiftRecord & { readiness: SecurityShiftDossierReadiness };

const emptyReadiness: SecurityShiftDossierReadiness = {
  ready: false,
  reasons: ['Contrôle indisponible. Actualise la page.'],
  logbook_count: 0,
  has_start: false,
  has_end: false,
  patrol_points: 0,
  completed_patrols: 0,
  active_pti: 0,
  open_emergencies: 0,
  active_presence: 0
};

function dossierBucket(row: DossierRow): DossierTab {
  if (row.dossier_status === 'archived') return 'archived';
  if (row.dossier_status === 'closed') return 'closed';
  return row.readiness.ready ? 'ready' : 'to_complete';
}

function statusLabel(row: DossierRow) {
  const bucket = dossierBucket(row);
  if (bucket === 'archived') return 'Archivé';
  if (bucket === 'closed') return 'Clôturé';
  if (bucket === 'ready') return 'Prêt à clôturer';
  return 'À compléter';
}

export function SecurityShiftDossiersPage() {
  const { organization } = useOrganization();
  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const canReopen = ['owner', 'admin'].includes(organization?.role ?? 'viewer');
  const [rows, setRows] = useState<DossierRow[]>([]);
  const [tab, setTab] = useState<DossierTab>('to_complete');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    if (!organization || !supabase) return;
    const client = supabase;
    setLoading(true);
    setError('');
    const from = new Date();
    from.setDate(from.getDate() - 180);
    const { data, error: shiftError } = await client
      .from('security_shifts')
      .select('id,organization_id,site_id,agent_id,title,starts_at,ends_at,break_minutes,status,notes,actual_minutes,actual_validation_note,completed_at,completed_by,final_invoice_id,dossier_status,dossier_closed_at,dossier_closed_by,dossier_archived_at,dossier_archived_by,dossier_reopened_at,dossier_reopened_by,dossier_note,created_at,security_sites(name,hourly_rate_cents,color_hex,address,postal_code,city,security_clients(company_name)),security_agents(first_name,last_name)')
      .eq('organization_id', organization.id)
      .neq('status', 'canceled')
      .gte('ends_at', from.toISOString())
      .lte('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: false })
      .limit(120);

    if (shiftError) {
      setError(`Chargement impossible : ${shiftError.message}`);
      setLoading(false);
      return;
    }

    const shifts = (data ?? []) as unknown as SecurityShiftRecord[];
    const readiness = await Promise.all(shifts.map(async (shift) => {
      const { data: result, error: readinessError } = await client.rpc('security_shift_dossier_readiness', {
        p_organization_id: organization.id,
        p_shift_id: shift.id
      });
      return readinessError ? emptyReadiness : result as SecurityShiftDossierReadiness;
    }));
    setRows(shifts.map((shift, index) => ({ ...shift, readiness: readiness[index] })));
    setLoading(false);
  }

  useEffect(() => { void load(); }, [organization?.id]);

  const grouped = useMemo(() => ({
    to_complete: rows.filter((row) => dossierBucket(row) === 'to_complete'),
    ready: rows.filter((row) => dossierBucket(row) === 'ready'),
    closed: rows.filter((row) => dossierBucket(row) === 'closed'),
    archived: rows.filter((row) => dossierBucket(row) === 'archived')
  }), [rows]);

  const visible = grouped[tab];

  async function closeDossier(row: DossierRow) {
    if (!organization || !supabase || !canManage) return;
    const note = window.prompt('Note de clôture facultative :', row.dossier_note || '');
    if (note === null) return;
    setBusyId(row.id); setError(''); setSuccess('');
    const { error: closeError } = await supabase.rpc('close_security_shift_dossier', {
      p_organization_id: organization.id,
      p_shift_id: row.id,
      p_note: note
    });
    if (closeError) setError(closeError.message);
    else { setSuccess('Le dossier de vacation est clôturé.'); await load(); setTab('closed'); }
    setBusyId(null);
  }

  async function archiveDossier(row: DossierRow) {
    if (!organization || !supabase || !canReopen || !window.confirm('Archiver définitivement ce dossier de vacation ?')) return;
    setBusyId(row.id); setError(''); setSuccess('');
    const { error: archiveError } = await supabase.rpc('archive_security_shift_dossier', {
      p_organization_id: organization.id,
      p_shift_id: row.id
    });
    if (archiveError) setError(archiveError.message);
    else { setSuccess('Le dossier est archivé.'); await load(); setTab('archived'); }
    setBusyId(null);
  }

  async function reopenDossier(row: DossierRow) {
    if (!organization || !supabase || !canReopen) return;
    const note = window.prompt('Motif de réouverture :');
    if (note === null) return;
    setBusyId(row.id); setError(''); setSuccess('');
    const { error: reopenError } = await supabase.rpc('reopen_security_shift_dossier', {
      p_organization_id: organization.id,
      p_shift_id: row.id,
      p_note: note
    });
    if (reopenError) setError(reopenError.message);
    else { setSuccess('Le dossier est rouvert.'); await load(); setTab('to_complete'); }
    setBusyId(null);
  }

  async function downloadDossier(row: DossierRow) {
    if (!organization || !supabase) return;
    const target = prepareFileWindow('Préparation du dossier', 'NCR Suite rassemble la main courante, les rondes, le PTI, les alertes, le GPS et la facturation.');
    setBusyId(row.id); setError('');
    try {
      const [logbookResult, patrolResult, ptiResult, emergencyResult, positionResult, invoiceResult] = await Promise.all([
        supabase.from('security_logbook_entries').select('id,organization_id,site_id,agent_id,shift_id,occurred_at,category,severity,title,details,status,created_at,security_sites(name,color_hex),security_agents(first_name,last_name),security_shifts(id,starts_at,ends_at,status,title)').eq('organization_id', organization.id).eq('shift_id', row.id).order('occurred_at'),
        supabase.from('security_patrols').select('id,organization_id,site_id,agent_id,shift_id,started_at,completed_at,status,notes,created_at,security_sites(name),security_agents(first_name,last_name),security_patrol_scans(id,organization_id,patrol_id,point_id,scanned_at,status,created_at,security_patrol_points(label,sequence_number))').eq('organization_id', organization.id).eq('shift_id', row.id).order('started_at'),
        supabase.from('security_pti_sessions').select('id,organization_id,agent_id,shift_id,status,check_interval_minutes,activated_at,last_check_in_at,next_check_due_at,triggered_at,trigger_reason,closed_at,created_at,updated_at').eq('organization_id', organization.id).eq('shift_id', row.id).order('activated_at'),
        supabase.from('security_emergency_alerts').select('id,organization_id,agent_id,shift_id,pti_session_id,alert_type,status,latitude,longitude,accuracy_m,message,triggered_at,acknowledged_at,acknowledged_by,resolved_at,resolved_by,resolution_notes,created_at,updated_at').eq('organization_id', organization.id).eq('shift_id', row.id).order('triggered_at'),
        supabase.from('security_agent_positions').select('latitude,longitude,accuracy_m,recorded_at').eq('organization_id', organization.id).eq('shift_id', row.id).order('recorded_at').limit(1500),
        supabase.from('security_invoice_shift_items').select('line_total_cents,security_invoices!security_invoice_shift_items_invoice_fk(invoice_number,status)').eq('organization_id', organization.id).eq('shift_id', row.id).maybeSingle()
      ]);
      const firstError = logbookResult.error || patrolResult.error || ptiResult.error || emergencyResult.error || positionResult.error || invoiceResult.error;
      if (firstError) throw firstError;

      const invoiceRaw = invoiceResult.data as unknown as { line_total_cents: number; security_invoices: { invoice_number: string; status: string } | null } | null;
      const invoice: SecurityDossierInvoice | null = invoiceRaw?.security_invoices ? {
        invoice_number: invoiceRaw.security_invoices.invoice_number,
        status: invoiceRaw.security_invoices.status,
        line_total_cents: invoiceRaw.line_total_cents
      } : null;

      const result = await generateSecurityShiftDossierPdf(organization, {
        shift: row,
        readiness: row.readiness,
        logbook: (logbookResult.data ?? []) as unknown as SecurityLogbookEntryRecord[],
        patrols: (patrolResult.data ?? []) as unknown as SecurityPatrolRecord[],
        ptiSessions: (ptiResult.data ?? []) as SecurityPtiSessionRecord[],
        emergencies: (emergencyResult.data ?? []) as SecurityEmergencyAlertRecord[],
        positions: (positionResult.data ?? []) as SecurityDossierPosition[],
        invoice
      });
      const url = URL.createObjectURL(result.blob);
      showBlobDownload(target, url, result.filename, 'Dossier de vacation prêt');
      window.setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (caught) {
      closeFileWindow(target);
      setError(`PDF impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setBusyId(null); }
  }

  if (!organization || !canManage) return null;

  const tabs: Array<{ key: DossierTab; label: string; count: number }> = [
    { key: 'to_complete', label: 'À compléter', count: grouped.to_complete.length },
    { key: 'ready', label: 'Prêts à clôturer', count: grouped.ready.length },
    { key: 'closed', label: 'Clôturés', count: grouped.closed.length },
    { key: 'archived', label: 'Archivés', count: grouped.archived.length }
  ];

  return <div className="page security-page">
    <header className="page-header"><div><p className="eyebrow">SÉCURITÉ PRIVÉE</p><h1>Dossiers de vacation</h1><p>Contrôle, clôture et archivage de chaque mission dans un dossier PDF unique.</p></div><div className="header-actions"><button className="secondary-button" onClick={() => void load()}><Icon name="activity" size={18}/>Actualiser</button><Link className="primary-button" to="/planning"><Icon name="calendar" size={18}/>Voir le planning</Link></div></header>
    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}

    <section className="security-dossier-summary">
      <article className="stat-card"><span><Icon name="alert" size={22}/></span><div><small>À compléter</small><strong>{loading ? '…' : grouped.to_complete.length}</strong><p>actions bloquantes</p></div></article>
      <article className="stat-card"><span><Icon name="check" size={22}/></span><div><small>Prêts</small><strong>{loading ? '…' : grouped.ready.length}</strong><p>clôture possible</p></div></article>
      <article className="stat-card"><span><Icon name="file" size={22}/></span><div><small>Clôturés</small><strong>{loading ? '…' : grouped.closed.length}</strong><p>encore disponibles</p></div></article>
      <article className="stat-card"><span><Icon name="briefcase" size={22}/></span><div><small>Archivés</small><strong>{loading ? '…' : grouped.archived.length}</strong><p>dossiers figés</p></div></article>
    </section>

    <section className="panel security-dossier-panel">
      <div className="security-dossier-tabs" role="tablist">{tabs.map((item) => <button key={item.key} type="button" className={tab === item.key ? 'active' : ''} onClick={() => setTab(item.key)}>{item.label}<b>{item.count}</b></button>)}</div>
      {loading ? <div className="security-empty">Chargement des dossiers…</div> : visible.length === 0 ? <div className="security-empty"><Icon name="file" size={32}/><strong>Aucun dossier dans cette rubrique</strong><span>Les vacations terminées sont classées automatiquement.</span></div> : <div className="security-dossier-list">{visible.map((row) => {
        const site = row.security_sites?.name || 'Site';
        const agent = row.security_agents ? securityPersonName(row.security_agents.first_name, row.security_agents.last_name) : 'Agent';
        const busy = busyId === row.id;
        return <article className="security-dossier-card" key={row.id}>
          <div className="security-dossier-card-head"><span className="security-record-icon" style={{ background: `${row.security_sites?.color_hex || '#0A84FF'}22`, color: row.security_sites?.color_hex || '#0A84FF' }}><Icon name="shield" size={20}/></span><div><strong>{site}</strong><span>{agent} · {formatSecurityDateTime(row.starts_at)}</span><small>{formatSecurityDuration(row.actual_minutes ?? securityShiftMinutes(row))} réalisée · {row.security_sites?.security_clients?.company_name || 'Client'}</small></div><em className={`security-dossier-status ${dossierBucket(row)}`}>{statusLabel(row)}</em></div>
          <div className="security-dossier-checks"><span className={row.readiness.has_start ? 'ok' : ''}>Prise de poste</span><span className={row.readiness.has_end ? 'ok' : ''}>Fin de poste</span><span className={row.readiness.patrol_points === 0 || row.readiness.completed_patrols > 0 ? 'ok' : ''}>Ronde QR</span><span className={row.readiness.active_pti === 0 ? 'ok' : ''}>PTI fermé</span><span className={row.readiness.open_emergencies === 0 ? 'ok' : ''}>Alertes traitées</span></div>
          {row.readiness.reasons.length > 0 && row.dossier_status === 'open' && <div className="security-dossier-reasons">{row.readiness.reasons.map((reason) => <span key={reason}><Icon name="alert" size={14}/>{reason}</span>)}</div>}
          {row.dossier_note && <p className="security-dossier-note"><strong>Note :</strong> {row.dossier_note}</p>}
          <div className="security-dossier-actions"><button className="secondary-button compact-button" disabled={busy} onClick={() => void downloadDossier(row)}><Icon name="file" size={16}/>PDF complet</button>{dossierBucket(row) === 'ready' && <button className="primary-button compact-button" disabled={busy} onClick={() => void closeDossier(row)}><Icon name="check" size={16}/>Clôturer</button>}{dossierBucket(row) === 'closed' && canReopen && <><button className="secondary-button compact-button" disabled={busy} onClick={() => void reopenDossier(row)}>Rouvrir</button><button className="primary-button compact-button" disabled={busy} onClick={() => void archiveDossier(row)}>Archiver</button></>}{dossierBucket(row) === 'archived' && canReopen && <button className="secondary-button compact-button" disabled={busy} onClick={() => void reopenDossier(row)}>Rouvrir</button>}</div>
        </article>;
      })}</div>}
    </section>
  </div>;
}
