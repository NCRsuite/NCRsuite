import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { prepareSecurityShiftPhoto, signatureCanvasToFile } from '../features/security/shiftProof';
import type { SecurityShiftRecord } from '../features/security/types';

type Handover = { note?: string | null; recorded_at?: string | null; agent_name?: string | null } | null;

type Props = {
  shift: SecurityShiftRecord;
  action: 'start' | 'end';
  handover: Handover;
  geolocationEnabled: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (payload: { photoFile: File | null; signatureFile: File | null; handoverNote: string }) => Promise<void>;
};

export function SecurityShiftPresenceSheet({ shift, action, handover, geolocationEnabled, busy, onCancel, onConfirm }: Props) {
  const site = shift.security_sites;
  const photoRequired = action === 'start' ? Boolean(site?.clock_in_photo_required) : Boolean(site?.clock_out_photo_required);
  const gpsRequired = action === 'start' ? Boolean(site?.clock_in_gps_required) : Boolean(site?.clock_out_gps_required);
  const signatureRequired = action === 'end' && Boolean(site?.clock_out_signature_required);
  const noteRequired = action === 'end' && Boolean(site?.handover_note_required);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [note, setNote] = useState('');
  const [localError, setLocalError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const signedRef = useRef(false);

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !signatureRequired) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#111827';
    };
    resize();
  }, [signatureRequired]);

  async function choosePhoto(files: FileList | null) {
    if (!files?.[0]) return;
    setLocalError('');
    try {
      const prepared = await prepareSecurityShiftPhoto(files[0]);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhoto(prepared);
      setPhotoPreview(URL.createObjectURL(prepared));
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Photo impossible.');
    }
  }

  function pointerPosition(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    drawingRef.current = true;
    signedRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const point = pointerPosition(event);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const point = pointerPosition(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function stopDrawing() { drawingRef.current = false; }

  function clearSignature() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    signedRef.current = false;
  }

  async function confirm() {
    setLocalError('');
    if (photoRequired && !photo) { setLocalError('La photo est obligatoire pour ce site.'); return; }
    if (gpsRequired && !geolocationEnabled) { setLocalError('Ce site exige le GPS, mais la géolocalisation n’est pas activée dans cette offre.'); return; }
    if (noteRequired && !note.trim()) { setLocalError('La note de relève est obligatoire pour ce site.'); return; }
    if (signatureRequired && !signedRef.current) { setLocalError('La signature est obligatoire pour terminer cette vacation.'); return; }
    let signatureFile: File | null = null;
    if (signatureRequired && canvasRef.current) signatureFile = await signatureCanvasToFile(canvasRef.current);
    await onConfirm({ photoFile: photo, signatureFile, handoverNote: note.trim() });
  }

  return createPortal(<div className="security-presence-overlay" role="dialog" aria-modal="true" aria-label={action === 'start' ? 'Prise de poste' : 'Fin de poste'}>
    <section className="security-presence-sheet">
      <div className="security-presence-sheet-head">
        <div><p className="eyebrow">{action === 'start' ? 'PRISE DE POSTE' : 'FIN DE POSTE'}</p><h2>{site?.name || 'Vacation'}</h2><small>{action === 'start' ? 'Vérifie les éléments du site puis démarre.' : 'Transmets une relève propre avant de quitter le site.'}</small></div>
        <button type="button" className="security-presence-close" onClick={onCancel} disabled={busy}><Icon name="close" size={20}/></button>
      </div>

      {action === 'start' && handover?.note && <div className="security-handover-card"><Icon name="message" size={20}/><div><strong>Relève précédente</strong><p>{handover.note}</p><small>{handover.agent_name ? `${handover.agent_name} · ` : ''}{handover.recorded_at ? new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'short'}).format(new Date(handover.recorded_at)) : ''}</small></div></div>}

      <div className="security-presence-requirements">
        <div className={gpsRequired ? 'required' : ''}><Icon name="map" size={18}/><span><b>GPS {action === 'start' ? 'd’arrivée' : 'de sortie'}</b><small>{geolocationEnabled ? (gpsRequired ? 'Obligatoire sur ce site' : 'Enregistré si disponible') : 'Géolocalisation non activée'}</small></span>{gpsRequired && <em>REQUIS</em>}</div>
        {photoRequired && <div className="required"><Icon name="camera" size={18}/><span><b>Photo {action === 'start' ? 'd’arrivée' : 'de sortie'}</b><small>Une preuve photo est demandée par le site</small></span><em>REQUIS</em></div>}
        {signatureRequired && <div className="required"><Icon name="signature" size={18}/><span><b>Signature agent</b><small>Signature obligatoire avant clôture</small></span><em>REQUIS</em></div>}
      </div>

      {photoRequired && <div className="security-presence-photo">
        <label><Icon name="camera" size={21}/><span><b>{photo ? 'Remplacer la photo' : `Prendre la photo ${action === 'start' ? 'd’arrivée' : 'de sortie'}`}</b><small>Caméra ou galerie · compression automatique</small></span><input type="file" accept="image/*" capture="environment" onChange={(event) => { void choosePhoto(event.target.files); event.currentTarget.value=''; }}/></label>
        {photoPreview && <img src={photoPreview} alt="Aperçu de la preuve de poste"/>}
      </div>}

      {action === 'end' && <label className="security-presence-note"><span>Note de relève {noteRequired ? <b>· obligatoire</b> : <small>· facultative</small>}</span><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ex. clés remises au réceptionniste, portail arrière à surveiller, RAS particulier…" maxLength={2000}/></label>}

      {signatureRequired && <div className="security-presence-signature"><div><strong>Signature de fin de poste</strong><button type="button" onClick={clearSignature}>Effacer</button></div><div className="security-presence-signature-canvas"><canvas ref={canvasRef} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerCancel={stopDrawing}/><span>Signe ici avec le doigt</span></div></div>}

      {localError && <div className="error-message">{localError}</div>}

      <button className={`security-presence-confirm ${action === 'end' ? 'end' : ''}`} type="button" disabled={busy} onClick={() => void confirm()}>
        <Icon name={busy ? 'clock' : 'check'} size={22}/><span><b>{busy ? 'Enregistrement…' : action === 'start' ? 'Prendre mon poste' : 'Terminer et transmettre la relève'}</b><small>{action === 'start' ? 'La main courante sera disponible immédiatement' : 'La vacation et la main courante seront clôturées'}</small></span>
      </button>
    </section>
  </div>, document.body);
}
