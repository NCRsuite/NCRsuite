import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Icon } from './Icon';
import type { TrainingSignatureRequest } from '../features/training/portalTypes';

interface TrainingPortalSignatureModalProps {
  request: TrainingSignatureRequest;
  defaultName: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (blob: Blob, signerName: string) => void;
}

export function TrainingPortalSignatureModal({
  request,
  defaultName,
  saving,
  onCancel,
  onSave
}: TrainingPortalSignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [drawn, setDrawn] = useState(false);
  const [signerName, setSignerName] = useState(defaultName);

  function prepareCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = Math.max(Math.round(rect.width * ratio), 1);
    canvas.height = Math.max(Math.round(rect.height * ratio), 1);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, rect.width, rect.height);
    context.strokeStyle = '#121826';
    context.lineWidth = 2.4;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    setDrawn(false);
  }

  useEffect(() => {
    prepareCanvas();
    const handleResize = () => prepareCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = point(event);
  }

  function draw(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !lastPointRef.current) return;
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    const next = point(event);
    context.beginPath();
    context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    context.lineTo(next.x, next.y);
    context.stroke();
    lastPointRef.current = next;
    setDrawn(true);
  }

  function stopDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  function submit() {
    const canvas = canvasRef.current;
    if (!canvas || !drawn || signerName.trim().length < 2) return;
    canvas.toBlob((blob) => {
      if (blob) onSave(blob, signerName.trim());
    }, 'image/png', 0.94);
  }

  return (
    <div className="attendance-modal-overlay" role="presentation" onClick={onCancel}>
      <section
        className="attendance-signature-modal training-portal-signature-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="training-signature-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="eyebrow">SIGNATURE ÉLECTRONIQUE</p>
            <h2 id="training-signature-title">{request.title}</h2>
            <p>La date, le compte, les empreintes numériques et l’historique seront conservés avec la preuve.</p>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Fermer">
            <Icon name="close" size={21} />
          </button>
        </header>
        <label>
          Nom complet du signataire
          <input value={signerName} onChange={(event) => setSignerName(event.target.value)} maxLength={180} />
        </label>
        <div className="signature-canvas-shell">
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            aria-label="Zone de signature"
          />
          {!drawn && <span>Signez dans ce cadre</span>}
        </div>
        <p className="training-portal-consent">
          En validant, vous confirmez avoir consulté le document et consentez à sa signature électronique.
        </p>
        <div className="attendance-signature-actions">
          <button className="secondary-button" type="button" onClick={prepareCanvas} disabled={saving}>Effacer</button>
          <button className="secondary-button" type="button" onClick={onCancel} disabled={saving}>Annuler</button>
          <button
            className="primary-button"
            type="button"
            onClick={submit}
            disabled={saving || !drawn || signerName.trim().length < 2}
          >
            {saving ? 'Création de la preuve…' : 'Signer le document'}
          </button>
        </div>
      </section>
    </div>
  );
}
