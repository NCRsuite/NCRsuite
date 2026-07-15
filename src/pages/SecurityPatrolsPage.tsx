import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatSecurityDate,
  securityPersonName,
  type SecurityAgentRecord,
  type SecurityPatrolPointRecord,
  type SecurityPatrolRecord,
  type SecuritySiteRecord
} from '../features/security/types';
import { supabase } from '../lib/supabase';

type PointForm = { siteId: string; label: string; sequence: string; instructions: string };
type BarcodeDetectorLike = { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>> };
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

const emptyPoint: PointForm = { siteId: '', label: '', sequence: '1', instructions: '' };

function scannerErrorMessage(caught: unknown) {
  if (!(caught instanceof Error)) return 'erreur inconnue';
  if (caught.name === 'NotAllowedError') return 'Accès à la caméra refusé. Autorise la caméra dans les réglages du navigateur.';
  if (caught.name === 'NotFoundError') return 'Aucune caméra compatible n’a été trouvée.';
  if (caught.name === 'NotReadableError') return 'La caméra est déjà utilisée par une autre application.';
  return caught.message;
}

export function SecurityPatrolsPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');

  const [sites, setSites] = useState<SecuritySiteRecord[]>([]);
  const [agents, setAgents] = useState<SecurityAgentRecord[]>([]);
  const [points, setPoints] = useState<SecurityPatrolPointRecord[]>([]);
  const [patrols, setPatrols] = useState<SecurityPatrolRecord[]>([]);
  const [form, setForm] = useState<PointForm>(emptyPoint);
  const [open, setOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState('');
  const [current, setCurrent] = useState<SecurityPatrolRecord | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [qrPreview, setQrPreview] = useState<{ point: SecurityPatrolPointRecord; url: string } | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('Initialisation de la caméra…');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const scanLockedRef = useRef(false);

  function stopCamera() {
    if (scanTimerRef.current !== null) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    scanLockedRef.current = false;
  }

  function closeCamera() {
    stopCamera();
    setCameraOpen(false);
  }

  async function load() {
    if (!organization) return;
    setLoading(true);
    setError('');
    if (demoMode || !supabase) {
      setSites(JSON.parse(localStorage.getItem(`ncr-suite-security-sites-${organization.id}`) || '[]'));
      setAgents(JSON.parse(localStorage.getItem(`ncr-suite-security-agents-${organization.id}`) || '[]'));
      setPoints(JSON.parse(localStorage.getItem(`ncr-suite-security-points-${organization.id}`) || '[]'));
      const stored = JSON.parse(localStorage.getItem(`ncr-suite-security-patrols-${organization.id}`) || '[]') as SecurityPatrolRecord[];
      setPatrols(stored);
      setCurrent(stored.find((patrol) => patrol.status === 'in_progress') || null);
      setLoading(false);
      return;
    }

    const [siteResult, agentResult, pointResult, patrolResult] = await Promise.all([
      supabase.from('security_sites').select('id,organization_id,client_id,name,code,address,postal_code,city,contact_name,contact_phone,hourly_rate_cents,color_hex,timezone,notes,status,created_at,security_clients!security_sites_client_fk(company_name)').eq('organization_id', organization.id).eq('status', 'active').order('name'),
      supabase.from('security_agents').select('id,organization_id,first_name,last_name,employee_number,email,phone,contract_type,weekly_hours,notes,status,linked_user_id,created_at').eq('organization_id', organization.id).eq('status', 'active').order('last_name'),
      supabase.from('security_patrol_points').select('id,organization_id,site_id,label,qr_code,sequence_number,instructions,status,created_at,security_sites!security_patrol_points_site_fk(name,color_hex)').eq('organization_id', organization.id).eq('status', 'active').order('site_id').order('sequence_number'),
      supabase.from('security_patrols').select('id,organization_id,site_id,agent_id,started_at,completed_at,status,notes,created_at,security_sites!security_patrols_site_fk(name,color_hex),security_agents!security_patrols_agent_fk(first_name,last_name),security_patrol_scans(id,organization_id,patrol_id,point_id,scanned_at,status,security_patrol_points!security_patrol_scans_point_fk(label,sequence_number))').eq('organization_id', organization.id).order('started_at', { ascending: false }).limit(50)
    ]);

    const firstError = siteResult.error || agentResult.error || pointResult.error || patrolResult.error;
    if (firstError) {
      setError(`Chargement impossible : ${firstError.message}`);
    } else {
      setSites((siteResult.data ?? []) as unknown as SecuritySiteRecord[]);
      setAgents((agentResult.data ?? []) as SecurityAgentRecord[]);
      setPoints((pointResult.data ?? []) as unknown as SecurityPatrolPointRecord[]);
      const rows = (patrolResult.data ?? []) as unknown as SecurityPatrolRecord[];
      setPatrols(rows);
      setCurrent(rows.find((patrol) => patrol.status === 'in_progress') || null);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [organization?.id, demoMode]);
  useEffect(() => {
    const id = sites[0]?.id || '';
    setForm((value) => ({ ...value, siteId: value.siteId || id }));
    setSelectedSite((value) => value || id);
  }, [sites]);
  useEffect(() => () => stopCamera(), []);

  async function createPoint(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !canManage) return;
    setSaving(true); setError(''); setSuccess('');
    const code = `NCRSEC:${organization.id}:${crypto.randomUUID()}`;
    const payload = {
      organization_id: organization.id,
      site_id: form.siteId,
      label: form.label.trim(),
      qr_code: code,
      sequence_number: Math.max(1, Number(form.sequence) || 1),
      instructions: form.instructions.trim() || null,
      created_by: user.id
    };
    try {
      if (demoMode || !supabase) {
        const site = sites.find((item) => item.id === form.siteId);
        const created = { id: crypto.randomUUID(), ...payload, status: 'active', created_at: new Date().toISOString(), security_sites: site ? { name: site.name, color_hex: site.color_hex } : null };
        const next = [...points, created];
        localStorage.setItem(`ncr-suite-security-points-${organization.id}`, JSON.stringify(next));
        setPoints(next as SecurityPatrolPointRecord[]);
      } else {
        const { error: insertError } = await supabase.from('security_patrol_points').insert(payload);
        if (insertError) throw insertError;
        await load();
      }
      setForm({ ...emptyPoint, siteId: sites[0]?.id || '' });
      setOpen(false);
      setSuccess('Le point de ronde QR a été créé.');
    } catch (caught) {
      setError(`Création impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setSaving(false); }
  }

  async function preview(point: SecurityPatrolPointRecord) {
    try {
      const { default: QRCode } = await import('qrcode');
      const url = await QRCode.toDataURL(point.qr_code, { width: 720, margin: 4, errorCorrectionLevel: 'H' });
      setQrPreview({ point, url });
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'QR impossible'); }
  }

  function downloadQr() {
    if (!qrPreview) return;
    const anchor = document.createElement('a');
    anchor.href = qrPreview.url;
    anchor.download = `qr-${qrPreview.point.label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
  }

  async function start() {
    if (!organization || !selectedSite) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const agent = agents[0];
        if (!agent) throw new Error('Aucun agent disponible.');
        const created = {
          id: crypto.randomUUID(), organization_id: organization.id, site_id: selectedSite, agent_id: agent.id,
          started_at: new Date().toISOString(), completed_at: null, status: 'in_progress', notes: null,
          created_at: new Date().toISOString(), security_sites: { name: sites.find((site) => site.id === selectedSite)?.name || 'Site' },
          security_agents: { first_name: agent.first_name, last_name: agent.last_name }, security_patrol_scans: []
        };
        const next = [created, ...patrols];
        localStorage.setItem(`ncr-suite-security-patrols-${organization.id}`, JSON.stringify(next));
        setPatrols(next as SecurityPatrolRecord[]); setCurrent(created as SecurityPatrolRecord);
      } else {
        const { data, error: rpcError } = await supabase.rpc('start_security_patrol', { p_organization_id: organization.id, p_site_id: selectedSite });
        if (rpcError) throw rpcError;
        await load(); setSuccess(`Ronde démarrée (${data}).`);
      }
    } catch (caught) { setError(`Démarrage impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setSaving(false); }
  }

  async function recordCode(code: string) {
    if (!organization || !current || !code.trim()) return false;
    setSaving(true); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const point = points.find((item) => item.qr_code === code.trim() && item.site_id === current.site_id);
        if (!point) throw new Error('Point QR inconnu pour cette ronde.');
        const scan = { id: crypto.randomUUID(), organization_id: organization.id, patrol_id: current.id, point_id: point.id, scanned_at: new Date().toISOString(), status: 'valid' as const, security_patrol_points: { label: point.label, sequence_number: point.sequence_number } };
        const updated = { ...current, security_patrol_scans: [...(current.security_patrol_scans || []).filter((item) => item.point_id !== point.id), scan] };
        setCurrent(updated);
        setPatrols((rows) => rows.map((row) => row.id === current.id ? updated : row));
        setSuccess(`Point validé : ${point.label}`);
      } else {
        const { data, error: rpcError } = await supabase.rpc('record_security_patrol_scan', { p_organization_id: organization.id, p_patrol_id: current.id, p_qr_code: code.trim() });
        if (rpcError) throw rpcError;
        setSuccess(`Point validé : ${data?.[0]?.point_label || 'OK'}`);
        await load();
      }
      setManualCode('');
      return true;
    } catch (caught) {
      setError(`Scan impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
      return false;
    } finally { setSaving(false); }
  }

  useEffect(() => {
    if (!cameraOpen || !current) return;
    let cancelled = false;

    async function bootCamera() {
      setCameraStatus('Autorisation de la caméra…');
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('La caméra en direct n’est pas disponible sur ce navigateur.');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) throw new Error('Aperçu caméra indisponible.');
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        await video.play();
        setCameraStatus('Place le QR code dans le cadre.');

        const Detector = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
        let detector: BarcodeDetectorLike | null = null;
        if (Detector) {
          try { detector = new Detector({ formats: ['qr_code'] }); } catch { detector = null; }
        }
        const { default: jsQR } = await import('jsqr');

        async function scanFrame() {
          if (cancelled || scanLockedRef.current) return;
          const activeVideo = videoRef.current;
          const canvas = canvasRef.current;
          if (!activeVideo || !canvas || activeVideo.readyState < 2 || !activeVideo.videoWidth) {
            scanTimerRef.current = window.setTimeout(() => void scanFrame(), 180);
            return;
          }

          const maxWidth = 1280;
          const ratio = Math.min(1, maxWidth / activeVideo.videoWidth);
          canvas.width = Math.max(1, Math.round(activeVideo.videoWidth * ratio));
          canvas.height = Math.max(1, Math.round(activeVideo.videoHeight * ratio));
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) throw new Error('Analyse vidéo indisponible.');
          context.drawImage(activeVideo, 0, 0, canvas.width, canvas.height);

          let code = '';
          if (detector) {
            try { code = (await detector.detect(canvas))?.[0]?.rawValue || ''; } catch { code = ''; }
          }
          if (!code) {
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
            code = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' })?.data || '';
          }

          if (code) {
            scanLockedRef.current = true;
            setCameraStatus('QR détecté, validation…');
            stopCamera();
            setCameraOpen(false);
            await recordCode(code);
            return;
          }
          scanTimerRef.current = window.setTimeout(() => void scanFrame(), 180);
        }
        void scanFrame();
      } catch (caught) {
        stopCamera();
        if (!cancelled) {
          setCameraStatus(scannerErrorMessage(caught));
          setError(`Caméra impossible : ${scannerErrorMessage(caught)}`);
        }
      }
    }

    void bootCamera();
    return () => { cancelled = true; stopCamera(); };
  }, [cameraOpen, current?.id]);

  async function scanImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const { default: jsQR } = await import('jsqr');
      const objectUrl = URL.createObjectURL(file);
      let code = '';
      try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const element = new Image();
          element.onload = () => resolve(element);
          element.onerror = () => reject(new Error('Image illisible. Utilise une photo JPG ou PNG nette.'));
          element.src = objectUrl;
        });
        const maxSide = 2400;
        const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const baseWidth = Math.max(1, Math.round(image.naturalWidth * ratio));
        const baseHeight = Math.max(1, Math.round(image.naturalHeight * ratio));
        const attempts = [0, 90, 180, 270];

        for (const rotation of attempts) {
          const canvas = document.createElement('canvas');
          const sideways = rotation === 90 || rotation === 270;
          canvas.width = sideways ? baseHeight : baseWidth;
          canvas.height = sideways ? baseWidth : baseHeight;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) continue;
          context.translate(canvas.width / 2, canvas.height / 2);
          context.rotate(rotation * Math.PI / 180);
          context.drawImage(image, -baseWidth / 2, -baseHeight / 2, baseWidth, baseHeight);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
          code = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' })?.data || '';
          if (code) break;
        }
      } finally { URL.revokeObjectURL(objectUrl); }

      if (!code) throw new Error('Aucun QR code détecté. Cadre uniquement le QR, avec une bonne lumière, puis reprends la photo.');
      if (cameraOpen) closeCamera();
      await recordCode(code);
    } catch (caught) {
      setError(`Lecture QR impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setSaving(false); }
  }

  async function complete() {
    if (!organization || !current) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const updatedRows = patrols.map((patrol) => patrol.id === current.id ? { ...patrol, status: 'completed' as const, completed_at: new Date().toISOString() } : patrol);
        localStorage.setItem(`ncr-suite-security-patrols-${organization.id}`, JSON.stringify(updatedRows));
        setPatrols(updatedRows); setCurrent(null);
      } else {
        const { error: rpcError } = await supabase.rpc('complete_security_patrol', { p_organization_id: organization.id, p_patrol_id: current.id, p_notes: null });
        if (rpcError) throw rpcError;
        await load();
      }
      setSuccess('Ronde terminée et enregistrée.');
    } catch (caught) { setError(`Clôture impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`); }
    finally { setSaving(false); }
  }

  const currentPoints = useMemo(() => points.filter((point) => point.site_id === current?.site_id), [points, current]);
  const scannedIds = new Set((current?.security_patrol_scans || []).map((scan) => scan.point_id));

  if (!organization) return null;
  return <div className="page security-page">
    <header className="page-header"><div><p className="eyebrow">SÉCURITÉ PRIVÉE</p><h1>Rondes QR</h1><p>Crée les points de passage, imprime leurs QR codes et certifie chaque ronde sur le terrain.</p></div>{canManage && <button className="primary-button" onClick={() => setOpen(true)}><Icon name="plus" size={18}/>Ajouter un point QR</button>}</header>

    {open && canManage && <section className="panel security-form-panel"><div className="panel-header"><div><p className="eyebrow">POINT DE RONDE</p><h2>Créer un QR code</h2></div><button className="secondary-button compact-button" onClick={() => setOpen(false)}>Fermer</button></div><form className="security-form-grid" onSubmit={createPoint}><label>Site *<select value={form.siteId} onChange={(event) => setForm({ ...form, siteId: event.target.value })}>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label><label>Ordre<input type="number" min="1" value={form.sequence} onChange={(event) => setForm({ ...form, sequence: event.target.value })}/></label><label className="full-field">Nom du point *<input required placeholder="Entrée principale, local technique…" value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })}/></label><label className="full-field">Instruction<textarea rows={3} value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })}/></label><div className="form-actions full-field"><button className="primary-button" disabled={saving}>Créer le QR</button></div></form></section>}

    {qrPreview && <section className="panel security-qr-preview"><div><p className="eyebrow">QR À IMPRIMER</p><h2>{qrPreview.point.label}</h2><p>{qrPreview.point.security_sites?.name}</p><img src={qrPreview.url} alt={`QR ${qrPreview.point.label}`}/><code>{qrPreview.point.qr_code}</code><div className="form-actions"><button className="secondary-button" onClick={() => setQrPreview(null)}>Fermer</button><button className="primary-button" onClick={downloadQr}>Télécharger le QR</button></div></div></section>}

    {cameraOpen && <div className="security-scanner-overlay" role="dialog" aria-modal="true" aria-label="Scanner un QR code"><div className="security-scanner"><div className="panel-header"><div><p className="eyebrow">SCAN EN DIRECT</p><h2>Point de ronde</h2></div><button className="secondary-button compact-button" onClick={closeCamera}>Fermer</button></div><div className="security-camera-stage"><video ref={videoRef} muted autoPlay playsInline/><span className="security-camera-guide"/></div><canvas ref={canvasRef} hidden/><p>{cameraStatus}</p><label className="secondary-button security-photo-fallback">Utiliser une photo<input type="file" accept="image/jpeg,image/png,image/webp,image/*" capture="environment" onChange={scanImage}/></label></div></div>}

    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}

    <section className="security-patrol-layout">
      <div className="panel security-patrol-action"><div className="panel-header"><div><p className="eyebrow">RONDE TERRAIN</p><h2>{current ? 'Ronde en cours' : 'Démarrer une ronde'}</h2></div>{current && <span className="security-status-pill active">En cours</span>}</div>
        {!current ? <><label className="security-field-label">Site<select value={selectedSite} onChange={(event) => setSelectedSite(event.target.value)}>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label><button className="primary-button wide-button" disabled={!selectedSite || saving} onClick={() => void start()}>Démarrer la ronde</button></> : <><div className="security-patrol-progress"><strong>{scannedIds.size}/{currentPoints.length}</strong><span>points validés</span></div><div className="security-point-checklist">{currentPoints.map((point) => <article className={scannedIds.has(point.id) ? 'done' : ''} key={point.id}><span>{point.sequence_number}</span><div><strong>{point.label}</strong><small>{point.instructions || 'Scanner le QR placé sur ce point.'}</small></div><Icon name={scannedIds.has(point.id) ? 'check' : 'map'} size={19}/></article>)}</div><button className="primary-button wide-button" disabled={saving} onClick={() => { setError(''); setCameraStatus('Initialisation de la caméra…'); setCameraOpen(true); }}>Scanner avec la caméra</button><label className="secondary-button security-scan-button">Analyser une photo<input type="file" accept="image/jpeg,image/png,image/webp,image/*" capture="environment" onChange={scanImage}/></label><div className="security-manual-scan"><input placeholder="Code QR manuel" value={manualCode} onChange={(event) => setManualCode(event.target.value)}/><button className="secondary-button" disabled={!manualCode || saving} onClick={() => void recordCode(manualCode)}>Valider</button></div><button className="primary-button wide-button" disabled={saving || scannedIds.size < currentPoints.length} onClick={() => void complete()}>Terminer la ronde</button></>}
      </div>

      <div className="panel security-list-panel"><div className="panel-header"><div><p className="eyebrow">POINTS CONFIGURÉS</p><h2>{points.length} point{points.length > 1 ? 's' : ''}</h2></div></div>{loading ? <div className="security-empty">Chargement…</div> : points.length === 0 ? <div className="security-empty"><Icon name="map" size={30}/><strong>Aucun point QR</strong><span>Le responsable doit créer les points de ronde du site.</span></div> : <div className="security-card-list">{points.map((point) => <article className="security-record-card" key={point.id}><span className="security-record-icon"><b>{point.sequence_number}</b></span><div className="security-record-main"><strong>{point.label}</strong><span>{point.security_sites?.name}</span><small>{point.instructions || 'Aucune instruction'}</small></div>{canManage && <button className="secondary-button compact-button" onClick={() => void preview(point)}>Voir le QR</button>}</article>)}</div>}</div>
    </section>

    {canManage && <section className="panel security-list-panel"><div className="panel-header"><div><p className="eyebrow">HISTORIQUE</p><h2>Dernières rondes</h2></div></div><div className="security-card-list">{patrols.filter((patrol) => patrol.status !== 'in_progress').slice(0, 12).map((patrol) => <article className="security-record-card" key={patrol.id}><span className="security-record-icon"><Icon name="shield" size={20}/></span><div className="security-record-main"><strong>{patrol.security_sites?.name || 'Site'}</strong><span>{patrol.security_agents ? securityPersonName(patrol.security_agents.first_name, patrol.security_agents.last_name) : 'Agent'}</span><small>{formatSecurityDate(patrol.started_at, { dateStyle: 'short', timeStyle: 'short' })} · {(patrol.security_patrol_scans || []).length} scan(s)</small></div><span className={`security-status-pill ${patrol.status === 'completed' ? 'completed' : 'canceled'}`}>{patrol.status === 'completed' ? 'Terminée' : 'Abandonnée'}</span></article>)}</div></section>}
  </div>;
}
