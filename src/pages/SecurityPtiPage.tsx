import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  flushSecurityPositionQueue,
  pendingSecurityPositionCount,
  queueSecurityPosition
} from '../features/security/offlinePositionQueue';
import {
  formatSecurityDateTime,
  securityPersonName,
  type SecurityAgentRecord,
  type SecurityPtiSessionRecord,
  type SecurityShiftRecord
} from '../features/security/types';
import { supabase } from '../lib/supabase';

interface GpsState {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recordedAt: string;
}

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
}


function positionErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return 'Autorise la localisation dans les réglages de Safari pour utiliser cette fonction.';
  if (error.code === error.POSITION_UNAVAILABLE) return 'La position GPS est temporairement indisponible.';
  if (error.code === error.TIMEOUT) return 'La localisation a mis trop de temps à répondre.';
  return 'Impossible de récupérer la position.';
}

function isNetworkError(message: string) {
  const normalized = message.toLowerCase();
  return !navigator.onLine || normalized.includes('fetch') || normalized.includes('network') || normalized.includes('connexion');
}

function durationUntil(value: string, now: number) {
  const remaining = Math.max(0, new Date(value).getTime() - now);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function SecurityPtiPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const [searchParams] = useSearchParams();
  const [agent, setAgent] = useState<SecurityAgentRecord | null>(null);
  const [shifts, setShifts] = useState<SecurityShiftRecord[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [pti, setPti] = useState<SecurityPtiSessionRecord | null>(null);
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [gps, setGps] = useState<GpsState | null>(null);
  const [tracking, setTracking] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [permissionState, setPermissionState] = useState<'granted' | 'prompt' | 'denied' | 'unsupported'>('prompt');
  const [modeActive, setModeActive] = useState(false);
  const [resumeSuggested, setResumeSuggested] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [pageVisible, setPageVisible] = useState(document.visibilityState === 'visible');
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [pendingPositions, setPendingPositions] = useState(0);
  const [nowTick, setNowTick] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);
  const sosTimerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const modeActiveRef = useRef(false);

  const selectedShift = useMemo(() => shifts.find((row) => row.id === selectedShiftId) ?? null, [shifts, selectedShiftId]);
  const storagePrefix = organization ? `ncr-security-mode-${organization.id}` : '';

  const load = useCallback(async () => {
    if (!organization || !user) return;
    setLoading(true);
    setError('');

    if (demoMode || !supabase) {
      setAgent(null);
      setShifts([]);
      setPti(null);
      setLoading(false);
      return;
    }

    const agentResult = await supabase
      .from('security_agents')
      .select('id,organization_id,first_name,last_name,employee_number,email,phone,contract_type,weekly_hours,notes,status,linked_user_id,created_at')
      .eq('organization_id', organization.id)
      .eq('linked_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (agentResult.error) {
      setError(agentResult.error.message);
      setLoading(false);
      return;
    }

    const currentAgent = (agentResult.data ?? null) as SecurityAgentRecord | null;
    setAgent(currentAgent);
    if (!currentAgent) {
      setShifts([]);
      setPti(null);
      setLoading(false);
      return;
    }

    const now = new Date();
    const from = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
    const to = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const [shiftResult, ptiResult] = await Promise.all([
      supabase
        .from('security_shifts')
        .select('id,organization_id,site_id,agent_id,title,starts_at,ends_at,break_minutes,status,notes,created_at,security_sites(name,hourly_rate_cents,color_hex,address,postal_code,city,security_clients(company_name)),security_agents(first_name,last_name)')
        .eq('organization_id', organization.id)
        .eq('agent_id', currentAgent.id)
        .neq('status', 'canceled')
        .gte('ends_at', from)
        .lte('starts_at', to)
        .order('starts_at'),
      supabase
        .from('security_pti_sessions')
        .select('id,organization_id,agent_id,shift_id,status,check_interval_minutes,activated_at,last_check_in_at,next_check_due_at,triggered_at,trigger_reason,closed_at,created_at,updated_at')
        .eq('organization_id', organization.id)
        .eq('agent_id', currentAgent.id)
        .in('status', ['active', 'alerted'])
        .order('activated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    const firstError = shiftResult.error || ptiResult.error;
    if (firstError) setError(firstError.message);
    const shiftRows = (shiftResult.data ?? []) as unknown as SecurityShiftRecord[];
    const activePti = (ptiResult.data ?? null) as SecurityPtiSessionRecord | null;
    const storedShift = window.localStorage.getItem(`${storagePrefix}-shift`) ?? '';
    const storedMode = window.localStorage.getItem(`${storagePrefix}-active`) === '1';
    setShifts(shiftRows);
    setPti(activePti);
    setSelectedShiftId((current) => {
      if (activePti?.shift_id) return activePti.shift_id;
      const requestedShift = searchParams.get('shift') || '';
      if (requestedShift && shiftRows.some((row) => row.id === requestedShift)) return requestedShift;
      if (storedShift && shiftRows.some((row) => row.id === storedShift)) return storedShift;
      if (current && shiftRows.some((row) => row.id === current)) return current;
      const active = shiftRows.find((row) => new Date(row.starts_at) <= now && new Date(row.ends_at) >= now);
      return active?.id ?? shiftRows[0]?.id ?? '';
    });
    setResumeSuggested(storedMode);
    setPendingPositions(pendingSecurityPositionCount(organization.id));
    if (activePti) setIntervalMinutes(activePti.check_interval_minutes);
    setLoading(false);
  }, [organization, user, demoMode, storagePrefix, searchParams]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    let active = true;
    const permissions = navigator.permissions as Permissions | undefined;
    if (!permissions?.query) {
      setPermissionState(navigator.geolocation ? 'prompt' : 'unsupported');
      return;
    }
    permissions.query({ name: 'geolocation' }).then((status) => {
      if (!active) return;
      setPermissionState(status.state as 'granted' | 'prompt' | 'denied');
      status.addEventListener('change', () => {
        if (active) setPermissionState(status.state as 'granted' | 'prompt' | 'denied');
      });
    }).catch(() => {
      if (active) setPermissionState(navigator.geolocation ? 'prompt' : 'unsupported');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!organization || !client) return;
    const channel = client.channel(`security-pti-${organization.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_pti_sessions', filter: `organization_id=eq.${organization.id}` }, () => void load())
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [organization?.id, load]);

  useEffect(() => {
    modeActiveRef.current = modeActive;
  }, [modeActive]);

  useEffect(() => {
    if (organization && selectedShiftId) window.localStorage.setItem(`${storagePrefix}-shift`, selectedShiftId);
  }, [organization, selectedShiftId, storagePrefix]);

  const releaseWakeLock = useCallback(async () => {
    const current = wakeLockRef.current;
    wakeLockRef.current = null;
    if (current && !current.released) {
      try { await current.release(); } catch { /* rien à faire */ }
    }
    setWakeLockActive(false);
  }, []);

  const requestWakeLock = useCallback(async () => {
    const wakeNavigator = navigator as unknown as { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } };
    if (!modeActiveRef.current || document.visibilityState !== 'visible' || !wakeNavigator.wakeLock) return;
    try {
      await releaseWakeLock();
      const sentinel = await wakeNavigator.wakeLock.request('screen');
      wakeLockRef.current = sentinel;
      setWakeLockActive(true);
      sentinel.addEventListener('release', () => {
        if (wakeLockRef.current === sentinel) wakeLockRef.current = null;
        setWakeLockActive(false);
      });
    } catch {
      setWakeLockActive(false);
    }
  }, [releaseWakeLock]);

  const updatePresence = useCallback(async (status?: 'active' | 'paused' | 'stopped') => {
    if (!organization || !selectedShiftId || !supabase || !navigator.onLine) return;
    const resolvedStatus = status ?? (modeActiveRef.current ? 'active' : 'stopped');
    await supabase.rpc('update_security_agent_presence', {
      p_organization_id: organization.id,
      p_shift_id: selectedShiftId,
      p_status: resolvedStatus,
      p_network_status: navigator.onLine ? 'online' : 'offline',
      p_app_state: document.visibilityState === 'visible' ? 'visible' : 'hidden',
      p_tracking_active: watchIdRef.current !== null,
      p_wake_lock_active: Boolean(wakeLockRef.current && !wakeLockRef.current.released)
    });
  }, [organization, selectedShiftId]);

  useEffect(() => {
    const handleOnline = async () => {
      setOnline(true);
      if (!organization) return;
      const result = await flushSecurityPositionQueue(organization.id);
      setPendingPositions(result.remaining);
      if (result.sent > 0) setSuccess(`${result.sent} position(s) enregistrée(s) après le retour du réseau.`);
      if (modeActiveRef.current) await updatePresence('active');
    };
    const handleOffline = () => {
      setOnline(false);
      if (modeActiveRef.current) setError('Connexion perdue : les positions GPS seront conservées sur cet appareil puis envoyées au retour du réseau.');
    };
    const handleVisibility = async () => {
      const visible = document.visibilityState === 'visible';
      setPageVisible(visible);
      if (!modeActiveRef.current) return;
      if (visible) {
        await requestWakeLock();
        if (organization) {
          const result = await flushSecurityPositionQueue(organization.id);
          setPendingPositions(result.remaining);
        }
      } else {
        await releaseWakeLock();
      }
      await updatePresence('active');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [organization, requestWakeLock, releaseWakeLock, updatePresence]);

  useEffect(() => {
    if (!modeActive || !selectedShiftId) return;
    void updatePresence('active');
    const timer = window.setInterval(() => void updatePresence('active'), 45000);
    return () => window.clearInterval(timer);
  }, [modeActive, selectedShiftId, updatePresence]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (sosTimerRef.current !== null) window.clearTimeout(sosTimerRef.current);
    void releaseWakeLock();
  }, [releaseWakeLock]);

  async function savePosition(position: GeolocationPosition, force = false) {
    if (!organization || !selectedShiftId || !supabase) return;
    const now = Date.now();
    const recordedAt = new Date().toISOString();
    const accuracy = Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null;
    setGps({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy,
      recordedAt
    });
    if (!force && now - lastSentRef.current < 60000) return;
    lastSentRef.current = now;

    const pending = {
      organizationId: organization.id,
      shiftId: selectedShiftId,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy,
      recordedAt
    };

    if (!navigator.onLine) {
      setPendingPositions(queueSecurityPosition(pending));
      return;
    }

    const { error: rpcError } = await supabase.rpc('record_security_agent_position_at', {
      p_organization_id: organization.id,
      p_shift_id: selectedShiftId,
      p_latitude: position.coords.latitude,
      p_longitude: position.coords.longitude,
      p_accuracy_m: accuracy,
      p_recorded_at: recordedAt
    });
    if (rpcError) {
      if (isNetworkError(rpcError.message)) setPendingPositions(queueSecurityPosition(pending));
      else setError(rpcError.message);
    }
  }

  async function locateOnce(options: PositionOptions) {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  async function testGps() {
    if (!selectedShiftId) { setError('Sélectionne d’abord une vacation.'); return; }
    if (!navigator.geolocation) { setPermissionState('unsupported'); setError('La géolocalisation n’est pas disponible sur cet appareil.'); return; }
    setGpsBusy(true); setError(''); setSuccess('');
    try {
      let position: GeolocationPosition;
      try {
        position = await locateOnce({ enableHighAccuracy: true, maximumAge: 0, timeout: 18000 });
      } catch (firstError) {
        if ((firstError as GeolocationPositionError).code === 1) throw firstError;
        position = await locateOnce({ enableHighAccuracy: false, maximumAge: 60000, timeout: 12000 });
      }
      setPermissionState('granted');
      await savePosition(position, true);
      setSuccess(`Position trouvée avec une précision d’environ ${Math.round(position.coords.accuracy)} m.`);
    } catch (caught) {
      const geoError = caught as GeolocationPositionError;
      if (geoError.code === 1) setPermissionState('denied');
      setError(positionErrorMessage(geoError));
    } finally { setGpsBusy(false); }
  }

  async function startTracking() {
    if (!selectedShiftId) {
      setError('Sélectionne d’abord une vacation.');
      return false;
    }
    if (!navigator.geolocation) {
      setPermissionState('unsupported');
      setError('La géolocalisation n’est pas disponible sur cet appareil.');
      return false;
    }
    setGpsBusy(true);
    try {
      let firstPosition: GeolocationPosition;
      try {
        firstPosition = await locateOnce({ enableHighAccuracy: true, maximumAge: 0, timeout: 18000 });
      } catch (firstError) {
        if ((firstError as GeolocationPositionError).code === 1) throw firstError;
        firstPosition = await locateOnce({ enableHighAccuracy: false, maximumAge: 60000, timeout: 12000 });
      }
      setPermissionState('granted');
      await savePosition(firstPosition, true);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setPermissionState('granted');
          setTracking(true);
          setError('');
          void savePosition(position);
        },
        (geoError) => {
          setError(positionErrorMessage(geoError));
          if (geoError.code === geoError.PERMISSION_DENIED) {
            setPermissionState('denied');
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
            setTracking(false);
            void updatePresence('paused');
          }
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
      );
      setTracking(true);
      return true;
    } catch (caught) {
      const geoError = caught as GeolocationPositionError;
      if (geoError.code === 1) setPermissionState('denied');
      setTracking(false);
      setError(positionErrorMessage(geoError));
      return false;
    } finally { setGpsBusy(false); }
  }

  function stopTracking() {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setTracking(false);
  }

  async function startVacationMode() {
    setError('');
    setSuccess('');
    if (!selectedShiftId) {
      setError('Sélectionne d’abord une vacation.');
      return;
    }
    const started = await startTracking();
    if (!started) return;
    setModeActive(true);
    modeActiveRef.current = true;
    setResumeSuggested(false);
    window.localStorage.setItem(`${storagePrefix}-active`, '1');
    await requestWakeLock();
    if (organization) {
      const result = await flushSecurityPositionQueue(organization.id);
      setPendingPositions(result.remaining);
    }
    await updatePresence('active');
    setSuccess('Mode vacation actif. Garde NCR Suite au premier plan pour maintenir le suivi GPS sur iPhone.');
  }

  async function stopVacationMode() {
    stopTracking();
    modeActiveRef.current = false;
    setModeActive(false);
    setResumeSuggested(false);
    window.localStorage.removeItem(`${storagePrefix}-active`);
    await releaseWakeLock();
    await updatePresence('stopped');
    setSuccess('Mode vacation arrêté.');
  }

  async function startPti() {
    if (!organization || !selectedShiftId || !supabase) return;
    setBusy('pti-start'); setError(''); setSuccess('');
    const { error: rpcError } = await supabase.rpc('start_security_pti_session', {
      p_organization_id: organization.id,
      p_shift_id: selectedShiftId,
      p_check_interval_minutes: intervalMinutes
    });
    if (rpcError) setError(rpcError.message);
    else { setSuccess('Protection PTI activée. Pense à confirmer régulièrement ta présence.'); await load(); }
    setBusy('');
  }

  async function checkIn() {
    if (!organization || !pti || !supabase) return;
    setBusy('check'); setError(''); setSuccess('');
    const { error: rpcError } = await supabase.rpc('security_pti_check_in', { p_organization_id: organization.id, p_session_id: pti.id });
    if (rpcError) setError(rpcError.message);
    else { setSuccess('Présence confirmée. Le délai PTI est relancé.'); await load(); }
    setBusy('');
  }

  async function closePti() {
    if (!organization || !pti || !supabase) return;
    setBusy('close'); setError(''); setSuccess('');
    const { error: rpcError } = await supabase.rpc('close_security_pti_session', { p_organization_id: organization.id, p_session_id: pti.id });
    if (rpcError) setError(rpcError.message);
    else { setSuccess('Protection PTI clôturée.'); await load(); }
    setBusy('');
  }

  async function sendSos() {
    if (!organization || !selectedShiftId || !supabase) return;
    if (!navigator.onLine) {
      setError('Aucune connexion : le SOS ne peut pas être transmis à la supervision. Utilise immédiatement les moyens d’urgence prévus par ton entreprise.');
      return;
    }
    setBusy('sos'); setError(''); setSuccess('');
    let location: GeolocationPosition | null = null;
    if (navigator.geolocation) {
      location = await new Promise((resolve) => navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }));
      if (location) await savePosition(location, true);
    }
    const { error: rpcError } = await supabase.rpc('trigger_security_emergency', {
      p_organization_id: organization.id,
      p_shift_id: selectedShiftId,
      p_alert_type: 'sos',
      p_latitude: location?.coords.latitude ?? null,
      p_longitude: location?.coords.longitude ?? null,
      p_accuracy_m: location?.coords.accuracy ?? null,
      p_message: 'SOS déclenché depuis l’espace agent.'
    });
    if (rpcError) setError(rpcError.message);
    else { setSuccess('SOS transmis à la supervision. Reste joignable et applique les consignes d’urgence.'); await load(); }
    setBusy('');
  }

  function armSos() {
    if (sosTimerRef.current !== null) window.clearTimeout(sosTimerRef.current);
    sosTimerRef.current = window.setTimeout(() => { sosTimerRef.current = null; void sendSos(); }, 1800);
  }

  function cancelSos() {
    if (sosTimerRef.current !== null) window.clearTimeout(sosTimerRef.current);
    sosTimerRef.current = null;
  }

  if (!organization) return null;
  const officeOnly = !agent;
  const ptiRemaining = pti ? durationUntil(pti.next_check_due_at, nowTick) : '';
  const ptiLate = pti ? new Date(pti.next_check_due_at).getTime() <= nowTick : false;

  return (
    <div className="page security-page security-pti-page">
      <header className="page-header">
        <div><p className="eyebrow">SÉCURITÉ PROFESSIONNELLE</p><h1>Mode vacation, PTI & SOS</h1><p>Suivi terrain renforcé pour la PWA, rattaché à une vacation précise.</p></div>
        {officeOnly && <Link className="primary-button" to="/supervision"><Icon name="activity" size={18}/>Ouvrir la supervision</Link>}
      </header>

      {error && <div className="error-message page-message">{error}</div>}
      {success && <div className="success-message page-message">{success}</div>}

      {loading ? <div className="panel list-state">Chargement de la protection…</div> : officeOnly ? (
        <section className="panel security-empty"><Icon name="shield" size={34}/><strong>Aucune fiche agent liée à ce compte</strong><span>Les propriétaires et administrateurs pilotent les alertes depuis la supervision. Le mode vacation s’active depuis un compte Agent ou Chef de poste lié à une fiche agent.</span></section>
      ) : (
        <>
          <section className="panel security-protection-selector">
            <div className="panel-header"><div><p className="eyebrow">VACATION PROTÉGÉE</p><h2>{securityPersonName(agent.first_name, agent.last_name)}</h2></div></div>
            <label>Vacation<select value={selectedShiftId} disabled={Boolean(pti) || modeActive} onChange={(event) => setSelectedShiftId(event.target.value)}><option value="">Sélectionner</option>{shifts.map((shift) => <option value={shift.id} key={shift.id}>{formatSecurityDateTime(shift.starts_at)} · {shift.security_sites?.name || 'Site'}</option>)}</select></label>
            {selectedShift && <div className="security-shift-highlight"><Icon name="calendar" size={20}/><div><strong>{selectedShift.security_sites?.name || 'Site'}</strong><span>{formatSecurityDateTime(selectedShift.starts_at)} → {formatSecurityDateTime(selectedShift.ends_at)}</span></div></div>}
          </section>

          {resumeSuggested && !modeActive && <div className="security-callout warning"><Icon name="alert" size={22}/><div><strong>Mode vacation interrompu</strong><span>L’application a été fermée ou rechargée. Appuie sur « Reprendre » pour relancer le GPS et la présence terrain.</span></div></div>}

          <section className={`panel security-vacation-mode-card${modeActive ? ' active' : ''}`}>
            <div className="security-vacation-mode-main">
              <span className={`security-live-dot${modeActive ? ' active' : ''}`}/>
              <div><p className="eyebrow">MODE VACATION PWA</p><h2>{modeActive ? 'Vacation suivie' : 'Suivi inactif'}</h2><p>Active le GPS, la présence applicative et le maintien d’écran lorsque le navigateur le permet.</p></div>
            </div>
            <div className="security-runtime-statuses">
              <span className={permissionState === 'granted' ? 'good' : permissionState === 'denied' || permissionState === 'unsupported' ? 'danger' : 'warning'}><Icon name="map" size={15}/>{permissionState === 'granted' ? 'Autorisation GPS accordée' : permissionState === 'denied' ? 'Autorisation GPS refusée' : permissionState === 'unsupported' ? 'GPS indisponible' : 'Autorisation GPS à demander'}</span>
              <span className={online ? 'good' : 'danger'}><Icon name="activity" size={15}/>{online ? 'Réseau disponible' : 'Hors connexion'}</span>
              <span className={pageVisible ? 'good' : 'warning'}><Icon name="eye" size={15}/>{pageVisible ? 'Application visible' : 'Arrière-plan'}</span>
              <span className={tracking ? 'good' : 'muted'}><Icon name="map" size={15}/>{tracking ? 'GPS actif' : 'GPS arrêté'}</span>
              <span className={wakeLockActive ? 'good' : 'muted'}><Icon name="sun" size={15}/>{wakeLockActive ? 'Écran maintenu' : 'Maintien indisponible'}</span>
              {pendingPositions > 0 && <span className="warning"><Icon name="clock" size={15}/>{pendingPositions} position(s) en attente</span>}
            </div>
            {gps && <small>Dernière position locale : {new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(gps.recordedAt))} · précision {Math.round(gps.accuracy ?? 0)} m · <a href={`https://maps.google.com/?q=${gps.latitude},${gps.longitude}`} target="_blank" rel="noreferrer">ouvrir sur la carte</a></small>}
            <div className="security-inline-actions"><button className="secondary-button" type="button" disabled={!selectedShiftId || gpsBusy} onClick={() => void testGps()}>{gpsBusy ? 'Recherche GPS…' : 'Tester ma position'}</button><button className={modeActive ? 'secondary-button' : 'primary-button'} type="button" disabled={!selectedShiftId || gpsBusy} onClick={() => void (modeActive ? stopVacationMode() : startVacationMode())}>{modeActive ? 'Arrêter le mode vacation' : resumeSuggested ? 'Reprendre le mode vacation' : 'Démarrer le mode vacation'}</button></div>
          </section>

          <section className="security-professional-grid">
            <article className={`panel security-pti-card ${pti?.status || ''}`}>
              <p className="eyebrow">PROTECTION PTI</p><h2>{pti ? (pti.status === 'alerted' || ptiLate ? 'Alerte déclenchée' : 'Protection active') : 'Protection inactive'}</h2>
              {pti ? <>
                <div className={`security-pti-countdown${ptiLate ? ' late' : ''}`}><small>Prochaine confirmation</small><strong>{ptiLate ? '00:00' : ptiRemaining}</strong><span>avant {new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date(pti.next_check_due_at))}</span></div>
                <div className="security-inline-actions"><button className="primary-button" type="button" disabled={Boolean(busy) || !online} onClick={() => void checkIn()}>{busy === 'check' ? 'Confirmation…' : 'Je confirme ma présence'}</button><button className="secondary-button" type="button" disabled={Boolean(busy) || !online} onClick={() => void closePti()}>Clôturer</button></div>
              </> : <>
                <label>Confirmation toutes les<select value={intervalMinutes} onChange={(event) => setIntervalMinutes(Number(event.target.value))}><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option></select></label>
                <button className="primary-button" type="button" disabled={!selectedShiftId || Boolean(busy) || !online} onClick={() => void startPti()}>{busy === 'pti-start' ? 'Activation…' : 'Activer le PTI'}</button>
              </>}
            </article>

            <article className="panel security-pwa-limits-card">
              <p className="eyebrow">FIABILITÉ WEB</p><h2>État du suivi</h2>
              <ul><li>Les positions hors réseau sont conservées puis synchronisées.</li><li>La supervision détecte une application suspendue ou sans battement récent.</li><li>Sur iPhone, garde NCR Suite visible pour un suivi GPS continu.</li></ul>
            </article>
          </section>

          <section className="panel security-sos-panel">
            <div><p className="eyebrow">URGENCE CRITIQUE</p><h2>SOS immédiat</h2><p>Maintiens le bouton pendant deux secondes. L’alerte et la dernière position disponible seront transmises à la supervision.</p></div>
            <button className="security-sos-button" type="button" disabled={!selectedShiftId || Boolean(busy) || !online} onPointerDown={armSos} onPointerUp={cancelSos} onPointerLeave={cancelSos} onPointerCancel={cancelSos}><Icon name="alert" size={28}/><strong>{busy === 'sos' ? 'ENVOI…' : 'MAINTENIR SOS'}</strong><span>{online ? '2 secondes' : 'Connexion requise'}</span></button>
          </section>
        </>
      )}
    </div>
  );
}
