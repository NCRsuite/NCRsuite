import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PremiumSkeleton } from '../components/PremiumSkeleton';
import { StatCard } from '../components/StatCard';
import { organizationHasFeature } from '../config/planEntitlements';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatSecurityDateTime,
  formatSecurityDuration,
  formatSecurityMoney,
  monthRange,
  securityPersonName,
  securityShiftMinutes,
  type SecurityAgentRecord,
  type SecurityAlertRecord,
  type SecurityLogbookEntryRecord,
  type SecurityPatrolRecord,
  type SecurityShiftRecord,
  type SecuritySiteRecord
} from '../features/security/types';
import { supabase } from '../lib/supabase';
import { readJsonStorage } from '../lib/safeStorage';
import { loadSecurityLogbookPhotoMap, MAX_SECURITY_LOGBOOK_PHOTOS, prepareSecurityLogbookPhoto, uploadSecurityLogbookPhotos, type SecurityLogbookPhotoRecord } from '../features/security/logbookPhoto';
import { securityLogbookTextPresets, securityQuickLogbookPresets } from '../features/security/logbookPresets';

function readableActionError(error: unknown, fallback = 'Action impossible.') {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '').trim();
    if (message) return message;
  }
  if (typeof error === 'string' && error.trim()) return error.trim();
  return fallback;
}

function readableGpsError(error: unknown) {
  const geoError = error as Partial<GeolocationPositionError> | null;
  if (geoError?.code === 1) return 'autorisation GPS refusée dans les réglages de l’iPhone';
  if (geoError?.code === 2) return 'position temporairement indisponible';
  if (geoError?.code === 3) return 'délai de localisation dépassé';
  return readableActionError(error, 'autorisation ou signal indisponible');
}

export function SecurityDashboardPage() {
  const { organization } = useOrganization();
  const { demoMode } = useAuth();
  const isAgent = organization?.role === 'employee';
  const essentialEnabled = Boolean(organization && organizationHasFeature(organization, 'security_agent_portal'));
  const qrEnabled = Boolean(organization && organizationHasFeature(organization, 'security_qr_patrols'));
  const logbookEnabled = Boolean(organization && organizationHasFeature(organization, 'security_smart_logbook'));
  const instructionsEnabled = Boolean(organization && organizationHasFeature(organization, 'security_site_instructions'));
  const geolocationEnabled = Boolean(organization && organizationHasFeature(organization, 'security_geolocation'));
  const ptiEnabled = Boolean(organization && organizationHasFeature(organization, 'security_pti_sos'));
  const supervisionEnabled = Boolean(organization && organizationHasFeature(organization, 'security_realtime_supervision'));
  const [agents, setAgents] = useState<SecurityAgentRecord[]>([]);
  const [sites, setSites] = useState<SecuritySiteRecord[]>([]);
  const [shifts, setShifts] = useState<SecurityShiftRecord[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlertRecord[]>([]);
  const [patrols, setPatrols] = useState<SecurityPatrolRecord[]>([]);
  const [entries, setEntries] = useState<SecurityLogbookEntryRecord[]>([]);
  const [entryPhotos, setEntryPhotos] = useState<Map<string, SecurityLogbookPhotoRecord[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [shiftBusy, setShiftBusy] = useState('');
  const [quickLogCategory, setQuickLogCategory] = useState<SecurityLogbookEntryRecord['category']>('autre');
  const [quickLogSeverity, setQuickLogSeverity] = useState<SecurityLogbookEntryRecord['severity']>('info');
  const [quickLogTitle, setQuickLogTitle] = useState('RAS');
  const [quickLogDetails, setQuickLogDetails] = useState('');
  const [quickLogBusy, setQuickLogBusy] = useState(false);
  const [quickLogPhotos, setQuickLogPhotos] = useState<Array<{ id: string; file: File; previewUrl: string }>>([]);
  const [quickPhotoPreparing, setQuickPhotoPreparing] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    if (!organization) return;
    const organizationId = organization.id;
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      const range = monthRange();
      const monthStart = new Date(`${range.start}T00:00:00`).toISOString();
      const monthEnd = new Date(`${range.end}T23:59:59.999`).toISOString();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      if (demoMode || !supabase) {
        const agentRows = readJsonStorage<SecurityAgentRecord[]>(`ncr-suite-security-agents-${organizationId}`, []);
        const siteRows = readJsonStorage<SecuritySiteRecord[]>(`ncr-suite-security-sites-${organizationId}`, []);
        const shiftRows = readJsonStorage<SecurityShiftRecord[]>(`ncr-suite-security-shifts-${organizationId}`, []);
        if (active) {
          setAgents(agentRows.filter((row) => row.status === 'active'));
          setSites(siteRows.filter((row) => row.status === 'active'));
          setShifts(shiftRows.filter((row) =>
            (row.starts_at >= monthStart && row.starts_at <= monthEnd)
            || (row.status === 'in_progress' && Boolean(row.clocked_in_at) && !row.clocked_out_at)
          ));
          setAlerts(readJsonStorage(`ncr-suite-security-alerts-${organizationId}`, []));
          setPatrols(readJsonStorage(`ncr-suite-security-patrols-${organizationId}`, []));
          setEntries(readJsonStorage(`ncr-suite-security-logbook-${organizationId}`, []));
          setLoading(false);
        }
        return;
      }

      const shiftSelect = 'id,organization_id,site_id,agent_id,title,starts_at,ends_at,break_minutes,status,notes,recurrence_group_id,duplicated_from_id,actual_minutes,clocked_in_at,clocked_in_source,clocked_out_at,clocked_out_source,logbook_status,billing_minutes_override,billing_override_reason,dossier_status,dossier_closed_at,dossier_archived_at,created_at,security_sites(name,hourly_rate_cents,color_hex,city,security_clients(company_name)),security_agents(first_name,last_name)';
      const [agentResult, siteResult, shiftResult, activeShiftResult] = await Promise.all([
        supabase.from('security_agents').select('id,organization_id,first_name,last_name,employee_number,email,phone,contract_type,weekly_hours,notes,status,linked_user_id,created_at').eq('organization_id', organizationId).eq('status', 'active'),
        supabase.from('security_sites').select('id,organization_id,client_id,name,code,address,postal_code,city,contact_name,contact_phone,hourly_rate_cents,color_hex,timezone,notes,status,created_at,security_clients(company_name)').eq('organization_id', organizationId).eq('status', 'active'),
        supabase.from('security_shifts').select(shiftSelect).eq('organization_id', organizationId).gte('starts_at', monthStart).lte('starts_at', monthEnd).order('starts_at'),
        supabase.from('security_shifts').select(shiftSelect).eq('organization_id', organizationId).eq('status', 'in_progress').not('clocked_in_at', 'is', null).is('clocked_out_at', null).order('clocked_in_at')
      ]);
      if (!active) return;
      const firstError = agentResult.error || siteResult.error || shiftResult.error || activeShiftResult.error;
      if (firstError) {
        setError(`Chargement impossible : ${firstError.message}`);
        setLoading(false);
        return;
      }
      setAgents((agentResult.data ?? []) as SecurityAgentRecord[]);
      setSites((siteResult.data ?? []) as unknown as SecuritySiteRecord[]);
      const mergedShiftRows = [
        ...((activeShiftResult.data ?? []) as unknown as SecurityShiftRecord[]),
        ...((shiftResult.data ?? []) as unknown as SecurityShiftRecord[])
      ];
      setShifts(Array.from(new Map(mergedShiftRows.map((row) => [row.id, row])).values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at)));

      if (essentialEnabled) {
        const [alertResult, patrolResult, logbookResult] = await Promise.all([
          supabase.from('security_alerts').select('id,organization_id,site_id,agent_id,title,message,severity,status,resolved_at,created_at,security_sites!security_alerts_site_fk(name,color_hex),security_agents!security_alerts_agent_fk(first_name,last_name)').eq('organization_id', organizationId).eq('status', 'open').order('created_at', { ascending: false }).limit(20),
          supabase.from('security_patrols').select('id,organization_id,site_id,agent_id,started_at,completed_at,status,notes,created_at,security_sites!security_alerts_site_fk(name,color_hex),security_agents!security_alerts_agent_fk(first_name,last_name),security_patrol_scans(id,organization_id,patrol_id,point_id,scanned_at,status)').eq('organization_id', organizationId).gte('started_at', todayStart.toISOString()).order('started_at', { ascending: false }).limit(20),
          supabase.from('security_logbook_entries').select('id,organization_id,site_id,agent_id,shift_id,occurred_at,category,severity,title,details,status,created_at,security_sites!security_alerts_site_fk(name,color_hex),security_agents!security_alerts_agent_fk(first_name,last_name)').eq('organization_id', organizationId).gte('occurred_at', todayStart.toISOString()).order('occurred_at', { ascending: false }).limit(12)
        ]);
        if (!alertResult.error) setAlerts((alertResult.data ?? []) as unknown as SecurityAlertRecord[]);
        if (!patrolResult.error) setPatrols((patrolResult.data ?? []) as unknown as SecurityPatrolRecord[]);
        if (!logbookResult.error) {
          const loadedEntries = (logbookResult.data ?? []) as unknown as SecurityLogbookEntryRecord[];
          setEntries(loadedEntries);
          if (logbookEnabled && loadedEntries.length) {
            try {
              setEntryPhotos(await loadSecurityLogbookPhotoMap(organizationId, loadedEntries.map((entry) => entry.id)));
            } catch (photoError) {
              setEntryPhotos(new Map());
              setError(`Événements chargés, mais les photos de main courante sont inaccessibles : ${readableActionError(photoError)}`);
            }
          } else {
            setEntryPhotos(new Map());
          }
        }
      }
      setLoading(false);
    }

    void load();
    return () => { active = false; };
  }, [organization?.id, organization?.role, organization?.plan, demoMode, essentialEnabled, refreshNonce]);

  const currentMonthRange = monthRange();
  const currentMonthStart = new Date(`${currentMonthRange.start}T00:00:00`).getTime();
  const currentMonthEnd = new Date(`${currentMonthRange.end}T23:59:59.999`).getTime();
  const operationalShifts = shifts.filter((row) => row.status !== 'canceled');
  const activeShifts = operationalShifts.filter((row) => {
    const startsAt = new Date(row.starts_at).getTime();
    return startsAt >= currentMonthStart && startsAt <= currentMonthEnd;
  });
  const minutes = activeShifts.reduce((sum, row) => sum + securityShiftMinutes(row), 0);
  const forecast = activeShifts.reduce((sum, row) => sum + Math.round((securityShiftMinutes(row) / 60) * (row.security_sites?.hourly_rate_cents || 0)), 0);
  const upcoming = useMemo(() => activeShifts.filter((row) => row.status !== 'completed' && new Date(row.ends_at) >= new Date()).slice(0, 6), [activeShifts]);
  const activePatrols = patrols.filter((row) => row.status === 'in_progress');
  const criticalAlerts = alerts.filter((row) => row.severity === 'critical');
  const setupMissing = [agents.length === 0 ? 'un agent' : '', sites.length === 0 ? 'un site' : ''].filter(Boolean);
  const now = Date.now();
  const terrainShift = operationalShifts.find((row) => row.clocked_in_at && !row.clocked_out_at)
    || activeShifts.find((row) => row.status !== 'completed' && new Date(row.starts_at).getTime() <= now + 4 * 60 * 60 * 1000 && new Date(row.ends_at).getTime() >= now - 8 * 60 * 60 * 1000)
    || null;

  const terrainShiftNeedsRecovery = Boolean(
    terrainShift?.clocked_in_at
    && !terrainShift.clocked_out_at
    && now > new Date(terrainShift.ends_at).getTime() + 8 * 60 * 60 * 1000
  );
  const terrainRecentEntries = terrainShift
    ? entries.filter((entry) => entry.shift_id === terrainShift.id).slice(0, 3)
    : [];

  const todayShifts = activeShifts.filter((row) => {
    const start = new Date(row.starts_at);
    const today = new Date();
    return start.getFullYear() === today.getFullYear() && start.getMonth() === today.getMonth() && start.getDate() === today.getDate();
  });
  const agentsOnDuty = todayShifts.filter((row) => Boolean(row.clocked_in_at) && !row.clocked_out_at);
  const lateClockIns = todayShifts.filter((row) => !row.clocked_in_at && row.status !== 'completed' && new Date(row.starts_at).getTime() < now - 15 * 60 * 1000 && new Date(row.ends_at).getTime() > now);
  const forgottenClockOuts = operationalShifts.filter((row) => Boolean(row.clocked_in_at) && !row.clocked_out_at && new Date(row.ends_at).getTime() < now - 15 * 60 * 1000);
  const openDossiers = operationalShifts.filter((row) => row.dossier_status !== 'closed' && row.dossier_status !== 'archived' && new Date(row.ends_at).getTime() < now);
  const operationalIssues = [
    ...criticalAlerts.map((alert) => ({ id: `alert-${alert.id}`, tone: 'critical', icon: 'alert' as const, title: alert.title || 'Alerte critique', detail: `${alert.security_agents ? securityPersonName(alert.security_agents.first_name, alert.security_agents.last_name) : 'Agent'} · ${alert.security_sites?.name || 'Site'}`, meta: formatSecurityDateTime(alert.created_at), to: '/consignes' })),
    ...lateClockIns.map((shift) => ({ id: `late-${shift.id}`, tone: 'warning', icon: 'clock' as const, title: 'Prise de poste en retard', detail: `${shift.security_agents ? securityPersonName(shift.security_agents.first_name, shift.security_agents.last_name) : 'Agent'} · ${shift.security_sites?.name || 'Site'}`, meta: `Prévue ${formatSecurityDateTime(shift.starts_at)}`, to: `/dossiers-vacations?shift=${shift.id}` })),
    ...forgottenClockOuts.map((shift) => ({ id: `end-${shift.id}`, tone: 'warning', icon: 'clock' as const, title: 'Fin de poste non enregistrée', detail: `${shift.security_agents ? securityPersonName(shift.security_agents.first_name, shift.security_agents.last_name) : 'Agent'} · ${shift.security_sites?.name || 'Site'}`, meta: `Fin prévue ${formatSecurityDateTime(shift.ends_at)}`, to: `/dossiers-vacations?shift=${shift.id}` }))
  ].slice(0, 8);

  async function captureClockPosition(shift: SecurityShiftRecord) {
    if (!geolocationEnabled || !supabase || !navigator.geolocation) return null;
    const locate = (options: PositionOptions) => new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));
    let position: GeolocationPosition;
    try {
      position = await locate({ enableHighAccuracy: true, maximumAge: 0, timeout: 12000 });
    } catch (firstError) {
      if ((firstError as GeolocationPositionError).code === 1) throw firstError;
      position = await locate({ enableHighAccuracy: false, maximumAge: 60000, timeout: 8000 });
    }
    const { error: positionError } = await supabase.rpc('record_security_agent_position_at', {
      p_organization_id: organization!.id,
      p_shift_id: shift.id,
      p_latitude: position.coords.latitude,
      p_longitude: position.coords.longitude,
      p_accuracy_m: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
      p_recorded_at: new Date().toISOString()
    });
    if (positionError) throw positionError;
    return Math.round(position.coords.accuracy);
  }

  async function shiftPresenceAction(shift: SecurityShiftRecord, action: 'start' | 'end') {
    if (!organization) return;
    if (action === 'start') {
      const otherActiveShift = shifts.find((row) => row.id !== shift.id && row.status === 'in_progress' && Boolean(row.clocked_in_at) && !row.clocked_out_at);
      if (otherActiveShift) {
        setSuccess('');
        setError(`Une autre vacation est encore active (${otherActiveShift.security_sites?.name || 'site'}). Termine-la avant de prendre un nouveau poste.`);
        return;
      }
    }
    if (action === 'end' && !window.confirm('Terminer le poste et clôturer la main courante de cette vacation ?')) return;
    setShiftBusy(`${shift.id}-${action}`); setError(''); setSuccess('');

    if (demoMode || !supabase) {
      const eventTime = new Date().toISOString();
      const updatedShift: SecurityShiftRecord = action === 'start'
        ? { ...shift, status: 'in_progress', clocked_in_at: shift.clocked_in_at || eventTime, clocked_in_source: 'agent', logbook_status: 'open' }
        : { ...shift, status: 'completed', clocked_out_at: shift.clocked_out_at || eventTime, clocked_out_source: 'agent', logbook_status: 'closed', logbook_closed_at: eventTime, logbook_closed_source: 'agent', completed_at: eventTime };
      setShifts((current) => {
        const next = current.map((row) => row.id === shift.id ? updatedShift : row);
        localStorage.setItem(`ncr-suite-security-shifts-${organization.id}`, JSON.stringify(next));
        return next;
      });
      const created: SecurityLogbookEntryRecord = {
        id: crypto.randomUUID(),
        organization_id: organization.id,
        site_id: shift.site_id,
        agent_id: shift.agent_id,
        shift_id: shift.id,
        occurred_at: eventTime,
        category: action === 'start' ? 'prise_poste' : 'fin_poste',
        severity: 'info',
        title: action === 'start' ? 'Prise de poste' : 'Fin de poste',
        details: null,
        status: 'open',
        created_at: eventTime,
        security_sites: shift.security_sites ? { name: shift.security_sites.name, color_hex: shift.security_sites.color_hex } : null,
        security_agents: shift.security_agents
      };
      setEntries((current) => {
        const next = [created, ...current];
        localStorage.setItem(`ncr-suite-security-logbook-${organization.id}`, JSON.stringify(next));
        return next;
      });
      setSuccess(action === 'start' ? 'Prise de poste enregistrée.' : 'Fin de poste enregistrée et main courante clôturée.');
      setShiftBusy('');
      return;
    }

    try {
      const { error: rpcError } = await supabase.rpc('set_security_shift_presence_event', {
        p_organization_id: organization.id,
        p_shift_id: shift.id,
        p_action: action,
        p_note: null,
        p_force: false
      });
      if (rpcError) throw rpcError;
      if (action === 'start') {
        try {
          const accuracy = await captureClockPosition(shift);
          setSuccess(accuracy == null ? 'Prise de poste enregistrée.' : `Prise de poste enregistrée et position GPS transmise (précision env. ${accuracy} m).`);
        } catch (gpsError) {
          const detail = readableGpsError(gpsError);
          setSuccess('Prise de poste enregistrée.');
          setError(`La position GPS n’a pas été transmise : ${detail}. Ouvre GPS / PTI pour tester le suivi.`);
        }
      } else {
        setSuccess('Fin de poste enregistrée et main courante clôturée.');
      }
      setRefreshNonce((value) => value + 1);
    } catch (caught) {
      setError(`Action impossible : ${readableActionError(caught)}`);
    } finally { setShiftBusy(''); }
  }

  const quickTextPresets = securityLogbookTextPresets(quickLogCategory, quickLogTitle);

  function clearQuickPhotos() {
    setQuickLogPhotos((current) => {
      current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return [];
    });
  }

  async function addQuickPhotos(fileList: FileList | null) {
    if (!fileList?.length) return;
    const remaining = MAX_SECURITY_LOGBOOK_PHOTOS - quickLogPhotos.length;
    if (remaining <= 0) { setError(`Maximum ${MAX_SECURITY_LOGBOOK_PHOTOS} photos par événement.`); return; }
    setQuickPhotoPreparing(true);
    setError('');
    try {
      const selected = Array.from(fileList).slice(0, remaining);
      const prepared = await Promise.all(selected.map((file, index) => prepareSecurityLogbookPhoto(file, quickLogPhotos.length + index + 1)));
      setQuickLogPhotos((current) => [...current, ...prepared.map((file) => ({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) }))]);
    } catch (caught) {
      setError(`Photo impossible : ${readableActionError(caught)}`);
    } finally {
      setQuickPhotoPreparing(false);
    }
  }

  function removeQuickPhoto(id: string) {
    setQuickLogPhotos((current) => {
      const target = current.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((photo) => photo.id !== id);
    });
  }

  function applyQuickTextPreset(text: string) {
    setQuickLogDetails((current) => current.trim() ? `${current.trim()} ${text}` : text);
  }

  function chooseQuickLogbookPreset(preset: (typeof securityQuickLogbookPresets)[number]) {
    setQuickLogCategory(preset.category);
    setQuickLogSeverity(preset.severity);
    setQuickLogTitle(preset.title);
    setError('');
    setSuccess('');
  }

  async function submitQuickLogbookEntry() {
    if (!organization || !terrainShift || !terrainShift.clocked_in_at || terrainShift.clocked_out_at) {
      setError('Prends d’abord ton poste avant d’ajouter un événement.');
      return;
    }
    if (terrainShift.logbook_status === 'closed') {
      setError('La main courante de cette vacation est clôturée.');
      return;
    }
    if (terrainShiftNeedsRecovery) {
      setError('Cette ancienne vacation doit d’abord être clôturée. Utilise « Terminer la vacation oubliée ».');
      return;
    }

    setQuickLogBusy(true);
    setError('');
    setSuccess('');
    const occurredAt = new Date().toISOString();

    try {
      if (demoMode || !supabase) {
        const created: SecurityLogbookEntryRecord = {
          id: crypto.randomUUID(),
          organization_id: organization.id,
          site_id: terrainShift.site_id,
          agent_id: terrainShift.agent_id,
          shift_id: terrainShift.id,
          occurred_at: occurredAt,
          category: quickLogCategory,
          severity: quickLogSeverity,
          title: quickLogTitle,
          details: quickLogDetails.trim() || null,
          status: 'open',
          created_at: occurredAt,
          security_sites: terrainShift.security_sites ? { name: terrainShift.security_sites.name, color_hex: terrainShift.security_sites.color_hex } : null,
          security_agents: terrainShift.security_agents
        };
        setEntries((current) => {
          const next = [created, ...current];
          localStorage.setItem(`ncr-suite-security-logbook-${organization.id}`, JSON.stringify(next));
          return next;
        });
      } else {
        const { data: createdEntryId, error: insertError } = await supabase.rpc('create_security_logbook_entry', {
          p_organization_id: organization.id,
          p_shift_id: terrainShift.id,
          p_category: quickLogCategory,
          p_severity: quickLogSeverity,
          p_title: quickLogTitle,
          p_details: quickLogDetails.trim() || null,
          p_occurred_at: occurredAt
        });
        if (insertError) throw insertError;
        const entryId = typeof createdEntryId === 'string' ? createdEntryId : String(createdEntryId ?? '');
        let uploadedPhotoCount = 0;
        let unreadablePhotoCount = 0;
        if (quickLogPhotos.length && entryId) {
          try {
            const uploaded = await uploadSecurityLogbookPhotos(organization.id, terrainShift.id, entryId, quickLogPhotos.map((photo) => photo.file));
            uploadedPhotoCount = uploaded.length;
            unreadablePhotoCount = uploaded.filter((photo) => !photo.signed_url).length;
            if (uploadedPhotoCount !== quickLogPhotos.length) {
              throw new Error(`${quickLogPhotos.length - uploadedPhotoCount} photo(s) n’ont pas été rattachée(s) à l’événement.`);
            }
          } catch (photoError) {
            setError(`Événement enregistré, mais la photo n’a pas été transmise : ${readableActionError(photoError)}`);
            setSuccess('');
            setRefreshNonce((value) => value + 1);
            return;
          }
        }
        setRefreshNonce((value) => value + 1);
        const photoSuffix = uploadedPhotoCount ? ` avec ${uploadedPhotoCount} photo${uploadedPhotoCount > 1 ? 's' : ''}` : '';
        if (unreadablePhotoCount) {
          setError(`La photo est enregistrée, mais son aperçu est actuellement inaccessible (${unreadablePhotoCount}).`);
          setSuccess(`« ${quickLogTitle} » ajouté à la main courante${photoSuffix}.`);
        } else {
          setSuccess(`« ${quickLogTitle} » ajouté à la main courante${photoSuffix}.`);
        }
      }
      setQuickLogDetails('');
      setQuickLogCategory('autre');
      setQuickLogSeverity('info');
      setQuickLogTitle('RAS');
      clearQuickPhotos();
    } catch (caught) {
      setError(`Ajout impossible : ${readableActionError(caught)}`);
    } finally {
      setQuickLogBusy(false);
    }
  }

  if (!organization) return null;

  if (isAgent) {
    const currentAgent = agents[0];
    return <div className="page security-page security-dashboard-page">
      <header className="page-header security-agent-compact-header"><div><p className="eyebrow">ESPACE AGENT · SÉCURITÉ PRIVÉE</p><h1>{currentAgent ? `Bonjour ${currentAgent.first_name}` : 'Bonjour, ton terrain est prêt'}</h1><p>Retrouve ton planning, les consignes de tes sites, tes rondes et la main courante.</p></div><Link className="primary-button" to="/consignes"><Icon name="alert" size={18}/>Voir les consignes</Link></header>
      {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}
      {criticalAlerts.length > 0 && <div className="security-callout critical"><Icon name="alert" size={21}/><div><strong>{criticalAlerts.length} alerte{criticalAlerts.length > 1 ? 's' : ''} critique{criticalAlerts.length > 1 ? 's' : ''}</strong><span>Consulte les alertes et applique immédiatement les consignes du site.</span></div></div>}
      {logbookEnabled && <section className={`security-agent-field-console ${terrainShift?.clocked_in_at && !terrainShift.clocked_out_at && !terrainShiftNeedsRecovery ? 'is-live' : 'is-waiting'}`}>
        <div className="security-agent-field-console-head">
          <div className="security-agent-field-console-title">
            <span className="security-agent-field-console-icon"><Icon name="clipboard" size={24}/></span>
            <div>
              <div className="security-agent-field-console-statusline"><p className="eyebrow">MAIN COURANTE</p>{terrainShift?.clocked_in_at && !terrainShift.clocked_out_at && <span className="security-live-pill">{terrainShiftNeedsRecovery ? 'À CLÔTURER' : 'EN POSTE'}</span>}</div>
              <h2>{terrainShift?.clocked_in_at && !terrainShift.clocked_out_at ? terrainShift.security_sites?.name || 'Vacation en cours' : 'Action terrain'}</h2>
              <small>{terrainShift?.clocked_in_at && !terrainShift.clocked_out_at ? (terrainShiftNeedsRecovery ? 'Cette ancienne vacation est toujours ouverte. Clôture-la avant toute nouvelle prise de poste.' : 'Ajoute un événement ici, sans quitter cet écran.') : terrainShift ? 'Prends ton poste : la saisie apparaîtra ici immédiatement.' : 'Aucune vacation active actuellement.'}</small>
            </div>
          </div>
          {terrainShift?.clocked_in_at && !terrainShift.clocked_out_at && <Link className="security-agent-field-history" to={`/main-courante?shift=${terrainShift.id}`}><Icon name="eye" size={17}/>Historique</Link>}
        </div>

        {terrainShift?.clocked_in_at && !terrainShift.clocked_out_at && !terrainShiftNeedsRecovery ? <div className="security-agent-quick-composer">
          <div className="security-agent-quick-presets" role="group" aria-label="Type d’événement">
            {securityQuickLogbookPresets.map((preset) => <button
              key={`${preset.category}-${preset.title}`}
              type="button"
              className={quickLogTitle === preset.title ? 'active' : ''}
              onClick={() => chooseQuickLogbookPreset(preset)}
            ><Icon name={preset.icon} size={18}/><span>{preset.label}</span></button>)}
          </div>

          {quickTextPresets.length > 0 && <div className="security-agent-quick-texts">
            <div><strong>Textes rapides</strong><small>Appuie pour remplir</small></div>
            <div>{quickTextPresets.map((text) => <button key={text} type="button" onClick={() => applyQuickTextPreset(text)}>{text}</button>)}</div>
          </div>}

          <label className="security-agent-quick-details">
            <span>Complément <small>facultatif pour un RAS</small></span>
            <textarea
              rows={2}
              value={quickLogDetails}
              onChange={(event) => setQuickLogDetails(event.target.value)}
              placeholder="Ex. portail arrière bloqué, véhicule immatriculé…, remise de clés à…"
            />
          </label>

          <div className="security-agent-quick-photo-zone">
            <label className="security-agent-quick-photo-button">
              <Icon name="camera" size={19}/>
              <span><b>{quickPhotoPreparing ? 'Préparation…' : 'Ajouter une photo'}</b><small>{quickLogPhotos.length}/{MAX_SECURITY_LOGBOOK_PHOTOS} · caméra ou galerie</small></span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/*" capture="environment" multiple disabled={quickPhotoPreparing || quickLogPhotos.length >= MAX_SECURITY_LOGBOOK_PHOTOS} onChange={(event) => { void addQuickPhotos(event.target.files); event.currentTarget.value = ''; }}/>
            </label>
            {quickLogPhotos.length > 0 && <div className="security-agent-quick-photo-previews">{quickLogPhotos.map((photo) => <figure key={photo.id}>
              <img src={photo.previewUrl} alt="Aperçu de la preuve"/>
              <button type="button" onClick={() => removeQuickPhoto(photo.id)} aria-label="Retirer cette photo"><Icon name="close" size={15}/></button>
            </figure>)}</div>}
          </div>

          <div className="security-agent-quick-footer">
            <div className="security-agent-severity-switch" role="group" aria-label="Gravité">
              <button type="button" className={quickLogSeverity === 'info' ? 'active' : ''} onClick={() => setQuickLogSeverity('info')}>Normal</button>
              <button type="button" className={quickLogSeverity === 'attention' ? 'active attention' : ''} onClick={() => setQuickLogSeverity('attention')}>Attention</button>
              <button type="button" className={quickLogSeverity === 'urgent' ? 'active urgent' : ''} onClick={() => setQuickLogSeverity('urgent')}>Urgent</button>
            </div>
            <button className="security-agent-quick-submit" type="button" disabled={quickLogBusy || quickPhotoPreparing} onClick={() => void submitQuickLogbookEntry()}>
              <Icon name={quickLogBusy ? 'clock' : 'plus'} size={21}/>
              <span><b>{quickLogBusy ? 'Ajout en cours…' : 'Ajouter maintenant'}</b><small>{quickLogTitle} · heure automatique</small></span>
            </button>
          </div>

          {terrainRecentEntries.length > 0 && <div className="security-agent-recent-logbook">
            <div className="security-agent-recent-logbook-head"><strong>Derniers événements</strong><Link to={`/main-courante?shift=${terrainShift.id}`}>Tout voir</Link></div>
            <div className="security-agent-recent-logbook-list">{terrainRecentEntries.map((entry) => {
              const photos = entryPhotos.get(entry.id) ?? [];
              return <article key={entry.id} className={`security-agent-recent-logbook-card ${entry.severity}`}>
                <div><strong>{entry.title}</strong><small>{new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date(entry.occurred_at))}{entry.details ? ` · ${entry.details}` : ''}</small></div>
                {photos.length > 0 && <div className="security-agent-recent-photo-strip">{photos.map((photo) => photo.signed_url
                  ? <a key={photo.id} href={photo.signed_url} target="_blank" rel="noreferrer"><img src={photo.signed_url} alt="Photo de main courante"/></a>
                  : <span key={photo.id} className="security-agent-photo-unavailable"><Icon name="camera" size={16}/>Photo jointe</span>)}
                </div>}
              </article>;
            })}</div>
          </div>}
        </div> : terrainShiftNeedsRecovery && terrainShift ? <button className="security-agent-start-shift-hero" disabled={Boolean(shiftBusy)} onClick={() => void shiftPresenceAction(terrainShift,'end')}>
          <Icon name="alert" size={25}/><span><b>{shiftBusy ? 'Clôture…' : 'Terminer la vacation oubliée'}</b><small>{terrainShift.security_sites?.name || 'Vacation'} · fin prévue {formatSecurityDateTime(terrainShift.ends_at)}</small></span><Icon name="chevronRight" size={21}/>
        </button> : terrainShift && !terrainShift.clocked_in_at ? <button className="security-agent-start-shift-hero" disabled={Boolean(shiftBusy)} onClick={() => void shiftPresenceAction(terrainShift,'start')}>
          <Icon name="check" size={25}/><span><b>{shiftBusy ? 'Enregistrement…' : 'Prendre mon poste'}</b><small>{terrainShift.security_sites?.name || 'Vacation'} · la main courante s’ouvre immédiatement après</small></span><Icon name="chevronRight" size={21}/>
        </button> : <div className="security-agent-no-shift"><Icon name="calendar" size={22}/><span>Aucune vacation à traiter maintenant.</span></div>}
      </section>}
      {terrainShift && <section className="panel security-agent-clock-card"><div><p className="eyebrow">VACATION À TRAITER</p><h2>{terrainShift.security_sites?.name || 'Site'}</h2><p>{formatSecurityDateTime(terrainShift.starts_at)} → {new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date(terrainShift.ends_at))}</p><span>{terrainShift.clocked_in_at ? `Poste pris à ${new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date(terrainShift.clocked_in_at))}` : 'Prise de poste non enregistrée'}</span></div><div className="security-agent-clock-actions">{!terrainShift.clocked_in_at && <button className="primary-button" disabled={Boolean(shiftBusy)} onClick={() => void shiftPresenceAction(terrainShift,'start')}><Icon name="check" size={18}/>{shiftBusy ? 'Enregistrement…' : 'Prendre mon poste'}</button>}{terrainShift.clocked_in_at && !terrainShift.clocked_out_at && <button className="secondary-button" disabled={Boolean(shiftBusy)} onClick={() => void shiftPresenceAction(terrainShift,'end')}><Icon name="check" size={18}/>{shiftBusy ? 'Clôture…' : 'Terminer mon poste'}</button>}{(geolocationEnabled || ptiEnabled) && <Link className="secondary-button" to={`/pti?shift=${terrainShift.id}`}><Icon name="map" size={18}/>{ptiEnabled ? 'GPS / PTI' : 'Géolocalisation'}</Link>}{logbookEnabled && <Link className="secondary-button" to={terrainShift.clocked_in_at && !terrainShift.clocked_out_at ? `/main-courante?shift=${terrainShift.id}` : '/main-courante'}><Icon name="clipboard" size={18}/>Historique main courante</Link>}</div></section>}
      <section className="stats-grid"><StatCard label="Missions du mois" value={String(activeShifts.length)} detail="affectées à ton compte" icon="calendar" loading={loading}/><StatCard label="Heures programmées" value={formatSecurityDuration(minutes)} detail="sur le mois en cours" icon="activity" loading={loading}/><StatCard label="Rondes aujourd’hui" value={String(patrols.length)} detail={`${activePatrols.length} en cours`} icon="shield" loading={loading}/><StatCard label="Main courante" value={String(entries.length)} detail="saisies aujourd’hui" icon="clipboard" loading={loading}/></section>
      <section className="dashboard-grid"><article className="panel large-panel security-dashboard-schedule"><div className="panel-header"><div><p className="eyebrow">PROCHAINES MISSIONS</p><h2>Mon planning</h2></div><Link className="secondary-button" to="/planning">Tout voir</Link></div>{loading ? <PremiumSkeleton rows={4} label="Chargement des prochaines missions"/> : upcoming.length === 0 ? <div className="security-empty"><Icon name="calendar" size={30}/><strong>Aucune mission à venir</strong><span>Ton responsable n’a rien planifié sur la période.</span></div> : <div className="security-upcoming-list">{upcoming.map((shift) => <article key={shift.id}><span className="security-record-icon" style={{ background: `${shift.security_sites?.color_hex || '#0A84FF'}22`, color: shift.security_sites?.color_hex || '#0A84FF' }}><Icon name="shield" size={19}/></span><div><strong>{shift.security_sites?.name || 'Site'}</strong><span>{shift.title || 'Mission de sécurité'}</span><small>{formatSecurityDateTime(shift.starts_at)} · {formatSecurityDuration(securityShiftMinutes(shift))}</small></div></article>)}</div>}</article><aside className="panel security-dashboard-actions"><div className="panel-header"><div><p className="eyebrow">ACTIONS TERRAIN</p><h2>Accès rapide</h2></div></div><div className="security-action-list">{qrEnabled && <Link to="/rondes"><span><Icon name="shield" size={19}/></span><div><strong>Mes rondes QR</strong><small>Démarrer ou poursuivre une ronde</small></div><Icon name="chevronRight" size={17}/></Link>}{logbookEnabled && <Link to={terrainShift?.clocked_in_at && !terrainShift.clocked_out_at ? `/main-courante?shift=${terrainShift.id}&add=1` : '/main-courante'}><span><Icon name="clipboard" size={19}/></span><div><strong>Ajouter à la main courante</strong><small>{terrainShift?.clocked_in_at && !terrainShift.clocked_out_at ? 'Saisie directe sur ta vacation en cours' : 'Prends ton poste pour saisir un événement'}</small></div><Icon name="chevronRight" size={17}/></Link>}{instructionsEnabled && <Link to="/consignes"><span><Icon name="alert" size={19}/></span><div><strong>Consignes & alertes</strong><small>Consulter les informations terrain</small></div><Icon name="chevronRight" size={17}/></Link>}{ptiEnabled && <Link to="/pti"><span><Icon name="shield" size={19}/></span><div><strong>PTI / SOS</strong><small>Activer la protection et la localisation</small></div><Icon name="chevronRight" size={17}/></Link>}</div></aside></section>
    </div>;
  }

  return <div className="page security-page security-dashboard-page">
    <header className="page-header"><div><p className="eyebrow">SÉCURITÉ PRIVÉE · {organization.plan.toUpperCase()}</p><h1>Bonjour, bienvenue sur {organization.name}</h1><p>{essentialEnabled ? 'Pilote le bureau et suis les premières opérations terrain.' : 'Pilote les agents, les sites, les heures programmées et la facturation prévisionnelle.'}</p></div><div className="header-actions"><Link className="secondary-button" to="/sites?new=1"><Icon name="map" size={18}/>Ajouter un site</Link><Link className="primary-button" to="/planning"><Icon name="calendar" size={18}/>Planifier</Link></div></header>
    {error && <div className="error-message page-message">{error}</div>}
    {setupMissing.length > 0 && !loading && <div className="security-callout"><Icon name="alert" size={20}/><div><strong>Finalise la configuration</strong><span>Ajoute {setupMissing.join(' et ')} pour exploiter le planning et la facturation.</span></div></div>}
    {essentialEnabled && criticalAlerts.length > 0 && <div className="security-callout critical"><Icon name="alert" size={21}/><div><strong>{criticalAlerts.length} alerte{criticalAlerts.length > 1 ? 's' : ''} critique{criticalAlerts.length > 1 ? 's' : ''}</strong><span>Une prise en charge immédiate est attendue.</span></div><Link className="secondary-button compact-button" to="/consignes">Traiter</Link></div>}
    <section className="stats-grid"><StatCard label="Agents actifs" value={String(agents.length)} detail={`${sites.length} site(s) actif(s)`} icon="users" loading={loading}/><StatCard label="Heures programmées" value={formatSecurityDuration(minutes)} detail="ce mois-ci" icon="calendar" loading={loading}/><StatCard label="Prévision HT" value={formatSecurityMoney(forecast)} detail="heures planifiées × tarif site" icon="creditCard" loading={loading}/><StatCard label={essentialEnabled ? 'Alertes ouvertes' : 'Sites actifs'} value={String(essentialEnabled ? alerts.length : sites.length)} detail={essentialEnabled ? `${activePatrols.length} ronde(s) en cours` : 'avec tarif horaire'} icon={essentialEnabled ? 'alert' : 'map'} loading={loading}/></section>
    {essentialEnabled && <section className="security-operations-grid">
      <article className="panel security-operations-overview">
        <div className="panel-header"><div><p className="eyebrow">CENTRE OPÉRATIONNEL</p><h2>Situation terrain maintenant</h2></div><Link className="secondary-button" to="/supervision">Ouvrir la supervision</Link></div>
        <div className="security-operations-kpis">
          <div className="is-live"><span><Icon name="activity" size={19}/></span><strong>{agentsOnDuty.length}</strong><small>agent{agentsOnDuty.length > 1 ? 's' : ''} en poste</small></div>
          <div className={lateClockIns.length ? 'is-warning' : ''}><span><Icon name="clock" size={19}/></span><strong>{lateClockIns.length}</strong><small>prise{lateClockIns.length > 1 ? 's' : ''} en retard</small></div>
          <div className={forgottenClockOuts.length ? 'is-warning' : ''}><span><Icon name="alert" size={19}/></span><strong>{forgottenClockOuts.length}</strong><small>fin{forgottenClockOuts.length > 1 ? 's' : ''} oubliée{forgottenClockOuts.length > 1 ? 's' : ''}</small></div>
          <div><span><Icon name="file" size={19}/></span><strong>{openDossiers.length}</strong><small>dossier{openDossiers.length > 1 ? 's' : ''} à clôturer</small></div>
        </div>
        <div className="security-on-duty-list">
          {agentsOnDuty.length === 0 ? <div className="security-empty compact"><Icon name="shield" size={26}/><strong>Aucun agent en poste</strong><span>Les prises de poste apparaîtront ici en temps réel.</span></div> : agentsOnDuty.slice(0, 5).map((shift) => <Link key={shift.id} to={`/dossiers-vacations?shift=${shift.id}`}><i style={{ background: shift.security_sites?.color_hex || '#0A84FF' }}/><div><strong>{shift.security_agents ? securityPersonName(shift.security_agents.first_name, shift.security_agents.last_name) : 'Agent'}</strong><span>{shift.security_sites?.name || 'Site'} · depuis {new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date(shift.clocked_in_at!))}</span></div><span className="security-live-pill">EN POSTE</span><Icon name="chevronRight" size={17}/></Link>)}
        </div>
      </article>
      <aside className="panel security-operations-issues">
        <div className="panel-header"><div><p className="eyebrow">À TRAITER</p><h2>Priorités QG</h2></div><span className="security-issue-count">{operationalIssues.length}</span></div>
        {operationalIssues.length === 0 ? <div className="security-empty compact"><Icon name="check" size={26}/><strong>Aucune anomalie urgente</strong><span>Le dispositif est à jour.</span></div> : <div className="security-issue-list">{operationalIssues.map((item) => <Link key={item.id} className={item.tone} to={item.to}><span><Icon name={item.icon} size={18}/></span><div><strong>{item.title}</strong><small>{item.detail}</small><em>{item.meta}</em></div><Icon name="chevronRight" size={16}/></Link>)}</div>}
      </aside>
    </section>}
    <section className="dashboard-grid"><article className="panel large-panel security-dashboard-schedule"><div className="panel-header"><div><p className="eyebrow">PROCHAINES MISSIONS</p><h2>Planning à venir</h2></div><Link className="secondary-button" to="/planning">Voir le planning</Link></div>{loading ? <PremiumSkeleton rows={4} label="Chargement du planning à venir"/> : upcoming.length === 0 ? <div className="security-empty"><Icon name="calendar" size={30}/><strong>Aucune mission à venir</strong><span>Le planning est prêt à être alimenté.</span></div> : <div className="security-upcoming-list">{upcoming.map((shift) => <article key={shift.id}><span className="security-record-icon" style={{ background: `${shift.security_sites?.color_hex || '#0A84FF'}22`, color: shift.security_sites?.color_hex || '#0A84FF' }}><Icon name="shield" size={19}/></span><div><strong>{shift.security_agents ? securityPersonName(shift.security_agents.first_name, shift.security_agents.last_name) : 'Agent'}</strong><span>{shift.security_sites?.name || 'Site'} · {shift.security_sites?.security_clients?.company_name || 'Client'}</span><small>{formatSecurityDateTime(shift.starts_at)} · {formatSecurityDuration(securityShiftMinutes(shift))}</small></div><b>{formatSecurityMoney(Math.round((securityShiftMinutes(shift) / 60) * (shift.security_sites?.hourly_rate_cents || 0)))}</b></article>)}</div>}</article><aside className="panel security-dashboard-actions"><div className="panel-header"><div><p className="eyebrow">RACCOURCIS</p><h2>{essentialEnabled ? 'Pilotage terrain' : 'Préparer l’activité'}</h2></div></div><div className="security-action-list">{instructionsEnabled && <Link to="/consignes"><span><Icon name="alert" size={19}/></span><div><strong>Alertes terrain</strong><small>{alerts.length} à suivre</small></div><Icon name="chevronRight" size={17}/></Link>}{logbookEnabled && <Link to="/main-courante"><span><Icon name="clipboard" size={19}/></span><div><strong>Main courante</strong><small>{entries.length} événement(s) aujourd’hui</small></div><Icon name="chevronRight" size={17}/></Link>}{qrEnabled && <Link to="/rondes"><span><Icon name="shield" size={19}/></span><div><strong>Rondes QR</strong><small>{activePatrols.length} en cours</small></div><Icon name="chevronRight" size={17}/></Link>}{essentialEnabled && <Link to="/acces-equipe"><span><Icon name="users" size={19}/></span><div><strong>Accès agents</strong><small>Gérer les accès terrain</small></div><Icon name="chevronRight" size={17}/></Link>}{supervisionEnabled && <Link to="/supervision"><span><Icon name="activity" size={19}/></span><div><strong>Supervision temps réel</strong><small>Vacations, PTI et urgences</small></div><Icon name="chevronRight" size={17}/></Link>}{geolocationEnabled && <Link to="/geolocalisation"><span><Icon name="map" size={19}/></span><div><strong>Géolocalisation</strong><small>Dernières positions terrain</small></div><Icon name="chevronRight" size={17}/></Link>}<Link to="/agents?new=1"><span><Icon name="users" size={19}/></span><div><strong>Nouvel agent</strong><small>Compléter l’effectif</small></div><Icon name="chevronRight" size={17}/></Link><Link to="/facturation"><span><Icon name="creditCard" size={19}/></span><div><strong>Facturation</strong><small>Préfactures et factures réalisées</small></div><Icon name="chevronRight" size={17}/></Link><Link to="/dossiers-vacations"><span><Icon name="file" size={19}/></span><div><strong>Dossiers vacations</strong><small>Clôturer et archiver les missions</small></div><Icon name="chevronRight" size={17}/></Link></div></aside></section>
    <section className="security-premium-showcase"><Link className={!supervisionEnabled ? 'locked' : ''} to="/supervision"><span><Icon name="activity" size={22}/></span><div><strong>Supervision temps réel</strong><small>{supervisionEnabled ? 'Suivre le dispositif opérationnel' : 'Module à la carte ou Professionnelle'}</small></div>{!supervisionEnabled && <Icon name="lock" size={16}/>}</Link><Link className={!geolocationEnabled ? 'locked' : ''} to="/geolocalisation"><span><Icon name="map" size={22}/></span><div><strong>Géolocalisation</strong><small>{geolocationEnabled ? 'Voir les dernières positions' : 'Module à la carte ou Professionnelle'}</small></div>{!geolocationEnabled && <Icon name="lock" size={16}/>}</Link><Link className={!ptiEnabled ? 'locked' : ''} to="/pti"><span><Icon name="shield" size={22}/></span><div><strong>PTI / SOS</strong><small>{ptiEnabled ? 'Protéger les agents isolés' : 'Module à la carte ou Professionnelle'}</small></div>{!ptiEnabled && <Icon name="lock" size={16}/>}</Link></section>
    <section className="panel security-discovery-rule"><span><Icon name="shield" size={25}/></span><div><p className="eyebrow">OFFRE {organization.plan.toUpperCase()}</p><h2>{essentialEnabled ? 'Le terrain est connecté' : 'Une gestion bureau simple'}</h2><p>{essentialEnabled ? `Jusqu’à ${organization.plan === 'professionnelle' || organization.plan === 'metier' ? 50 : 10} agents peuvent accéder aux fonctions terrain activées pour cette entreprise.` : 'Cette formule ne donne pas encore d’accès terrain aux agents. Active le module Accès Agent Terrain à la carte ou passe à l’offre Essentielle.'}</p></div></section>
  </div>;
}
