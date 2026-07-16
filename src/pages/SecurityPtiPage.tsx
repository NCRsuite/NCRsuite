import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
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

function positionErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return 'Autorise la localisation dans les réglages de Safari pour utiliser cette fonction.';
  if (error.code === error.POSITION_UNAVAILABLE) return 'La position GPS est temporairement indisponible.';
  if (error.code === error.TIMEOUT) return 'La localisation a mis trop de temps à répondre.';
  return 'Impossible de récupérer la position.';
}

export function SecurityPtiPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const [agent, setAgent] = useState<SecurityAgentRecord | null>(null);
  const [shifts, setShifts] = useState<SecurityShiftRecord[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [pti, setPti] = useState<SecurityPtiSessionRecord | null>(null);
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [gps, setGps] = useState<GpsState | null>(null);
  const [tracking, setTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);
  const sosTimerRef = useRef<number | null>(null);

  const selectedShift = useMemo(() => shifts.find((row) => row.id === selectedShiftId) ?? null, [shifts, selectedShiftId]);

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
    setShifts(shiftRows);
    setPti(activePti);
    setSelectedShiftId((current) => {
      if (activePti?.shift_id) return activePti.shift_id;
      if (current && shiftRows.some((row) => row.id === current)) return current;
      const active = shiftRows.find((row) => new Date(row.starts_at) <= now && new Date(row.ends_at) >= now);
      return active?.id ?? shiftRows[0]?.id ?? '';
    });
    if (activePti) setIntervalMinutes(activePti.check_interval_minutes);
    setLoading(false);
  }, [organization, user, demoMode]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const client = supabase;
    if (!organization || !client) return;
    const channel = client.channel(`security-pti-${organization.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_pti_sessions', filter: `organization_id=eq.${organization.id}` }, () => void load())
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [organization?.id, load]);

  useEffect(() => () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (sosTimerRef.current !== null) window.clearTimeout(sosTimerRef.current);
  }, []);

  async function savePosition(position: GeolocationPosition, force = false) {
    if (!organization || !selectedShiftId || !supabase) return;
    const now = Date.now();
    setGps({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
      recordedAt: new Date().toISOString()
    });
    if (!force && now - lastSentRef.current < 60000) return;
    lastSentRef.current = now;
    const { error: rpcError } = await supabase.rpc('record_security_agent_position', {
      p_organization_id: organization.id,
      p_shift_id: selectedShiftId,
      p_latitude: position.coords.latitude,
      p_longitude: position.coords.longitude,
      p_accuracy_m: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null
    });
    if (rpcError) setError(rpcError.message);
  }

  function startTracking() {
    setError('');
    setSuccess('');
    if (!selectedShiftId) {
      setError('Sélectionne d’abord une vacation.');
      return;
    }
    if (!navigator.geolocation) {
      setError('La géolocalisation n’est pas disponible sur cet appareil.');
      return;
    }
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => void savePosition(position),
      (geoError) => { setTracking(false); setError(positionErrorMessage(geoError)); },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
    setTracking(true);
    setSuccess('Suivi GPS démarré. Garde l’application ouverte pendant la vacation.');
  }

  function stopTracking() {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setTracking(false);
    setSuccess('Suivi GPS arrêté.');
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

  return (
    <div className="page security-page security-pti-page">
      <header className="page-header">
        <div><p className="eyebrow">SÉCURITÉ PROFESSIONNELLE</p><h1>PTI, SOS & localisation</h1><p>Protection du travailleur isolé et remontée GPS rattachées à une vacation précise.</p></div>
        {officeOnly && <Link className="primary-button" to="/supervision"><Icon name="activity" size={18}/>Ouvrir la supervision</Link>}
      </header>

      {error && <div className="error-message page-message">{error}</div>}
      {success && <div className="success-message page-message">{success}</div>}

      {loading ? <div className="panel list-state">Chargement de la protection…</div> : officeOnly ? (
        <section className="panel security-empty"><Icon name="shield" size={34}/><strong>Aucune fiche agent liée à ce compte</strong><span>Les propriétaires et administrateurs pilotent les alertes depuis la supervision. Le PTI s’active depuis un compte Agent ou Chef de poste lié à une fiche agent.</span></section>
      ) : (
        <>
          <section className="panel security-protection-selector">
            <div className="panel-header"><div><p className="eyebrow">VACATION PROTÉGÉE</p><h2>{securityPersonName(agent.first_name, agent.last_name)}</h2></div></div>
            <label>Vacation<select value={selectedShiftId} disabled={Boolean(pti)} onChange={(event) => setSelectedShiftId(event.target.value)}><option value="">Sélectionner</option>{shifts.map((shift) => <option value={shift.id} key={shift.id}>{formatSecurityDateTime(shift.starts_at)} · {shift.security_sites?.name || 'Site'}</option>)}</select></label>
            {selectedShift && <div className="security-shift-highlight"><Icon name="calendar" size={20}/><div><strong>{selectedShift.security_sites?.name || 'Site'}</strong><span>{formatSecurityDateTime(selectedShift.starts_at)} → {formatSecurityDateTime(selectedShift.ends_at)}</span></div></div>}
          </section>

          <section className="security-professional-grid">
            <article className="panel security-tracking-card">
              <span className={`security-live-dot${tracking ? ' active' : ''}`}/><p className="eyebrow">GÉOLOCALISATION</p><h2>{tracking ? 'Suivi actif' : 'Suivi arrêté'}</h2>
              <p>La position est enregistrée pendant la vacation tant que NCR Suite reste ouverte.</p>
              {gps && <small>Dernière position : {new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(gps.recordedAt))} · précision {Math.round(gps.accuracy ?? 0)} m</small>}
              <button className={tracking ? 'secondary-button' : 'primary-button'} type="button" disabled={!selectedShiftId} onClick={tracking ? stopTracking : startTracking}>{tracking ? 'Arrêter le suivi' : 'Démarrer le suivi GPS'}</button>
            </article>

            <article className={`panel security-pti-card ${pti?.status || ''}`}>
              <p className="eyebrow">PROTECTION PTI</p><h2>{pti ? (pti.status === 'alerted' ? 'Alerte déclenchée' : 'Protection active') : 'Protection inactive'}</h2>
              {pti ? <>
                <p>Prochaine confirmation avant <strong>{new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date(pti.next_check_due_at))}</strong>.</p>
                <div className="security-inline-actions"><button className="primary-button" type="button" disabled={Boolean(busy)} onClick={() => void checkIn()}>{busy === 'check' ? 'Confirmation…' : 'Je confirme ma présence'}</button><button className="secondary-button" type="button" disabled={Boolean(busy)} onClick={() => void closePti()}>Clôturer</button></div>
              </> : <>
                <label>Confirmation toutes les<select value={intervalMinutes} onChange={(event) => setIntervalMinutes(Number(event.target.value))}><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option></select></label>
                <button className="primary-button" type="button" disabled={!selectedShiftId || Boolean(busy)} onClick={() => void startPti()}>{busy === 'pti-start' ? 'Activation…' : 'Activer le PTI'}</button>
              </>}
            </article>
          </section>

          <section className="panel security-sos-panel">
            <div><p className="eyebrow">URGENCE CRITIQUE</p><h2>SOS immédiat</h2><p>Maintiens le bouton pendant deux secondes. L’alerte et la dernière position disponible seront transmises à la supervision.</p></div>
            <button className="security-sos-button" type="button" disabled={!selectedShiftId || Boolean(busy)} onPointerDown={armSos} onPointerUp={cancelSos} onPointerLeave={cancelSos} onPointerCancel={cancelSos}><Icon name="alert" size={28}/><strong>{busy === 'sos' ? 'ENVOI…' : 'MAINTENIR SOS'}</strong><span>2 secondes</span></button>
          </section>
        </>
      )}
    </div>
  );
}
