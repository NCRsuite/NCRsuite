import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <div className="beauty-review-rating-row">
    <span>{label}</span>
    <div role="radiogroup" aria-label={label}>
      {[1,2,3,4,5].map((score) => <button
        key={score}
        type="button"
        className={score <= value ? 'active' : ''}
        aria-label={`${score} sur 5`}
        aria-pressed={score === value}
        onClick={() => onChange(score)}
      >★</button>)}
    </div>
  </div>;
}

export function BeautyClientReviewModal({
  open,
  accountId,
  appointmentId,
  serviceName,
  staffName,
  onClose,
  onSubmitted
}: {
  open: boolean;
  accountId: string;
  appointmentId: string;
  serviceName: string;
  staffName: string;
  onClose: () => void;
  onSubmitted: () => void | Promise<void>;
}) {
  const [rating, setRating] = useState(0);
  const [reception, setReception] = useState(0);
  const [cleanliness, setCleanliness] = useState(0);
  const [ambiance, setAmbiance] = useState(0);
  const [quality, setQuality] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setRating(0);
    setReception(0);
    setCleanliness(0);
    setAmbiance(0);
    setQuality(0);
    setComment('');
    setError('');
  }, [open, appointmentId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !accountId || !appointmentId) return;
    if ([rating,reception,cleanliness,ambiance,quality].some((score) => score < 1)) {
      setError('Attribuez une note à chaque critère.');
      return;
    }
    setBusy(true);
    setError('');
    const { error: requestError } = await supabase.rpc('submit_coiffure_client_review', {
      p_account_id: accountId,
      p_appointment_id: appointmentId,
      p_rating: rating,
      p_reception_rating: reception,
      p_cleanliness_rating: cleanliness,
      p_ambiance_rating: ambiance,
      p_quality_rating: quality,
      p_comment: comment.trim() || null
    });
    setBusy(false);
    if (requestError) {
      setError(requestError.message);
      return;
    }
    await onSubmitted();
    onClose();
  }

  return <div className="beauty-review-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="beauty-review-modal" role="dialog" aria-modal="true" aria-labelledby="beauty-review-title">
      <div className="beauty-review-modal-head">
        <div><p className="beauty-client-eyebrow">AVIS VÉRIFIÉ</p><h2 id="beauty-review-title">Comment s’est passé votre rendez-vous ?</h2><p>{serviceName} · avec {staffName}</p></div>
        <button type="button" onClick={onClose} aria-label="Fermer">×</button>
      </div>
      <form onSubmit={submit}>
        <div className="beauty-review-overall"><strong>Votre note globale</strong><div>{[1,2,3,4,5].map((score) => <button key={score} type="button" className={score <= rating ? 'active' : ''} onClick={() => setRating(score)}>★</button>)}</div>{rating > 0 && <span>{rating}/5</span>}</div>
        <div className="beauty-review-criteria">
          <RatingRow label="Accueil" value={reception} onChange={setReception}/>
          <RatingRow label="Propreté" value={cleanliness} onChange={setCleanliness}/>
          <RatingRow label="Cadre & ambiance" value={ambiance} onChange={setAmbiance}/>
          <RatingRow label="Qualité de la prestation" value={quality} onChange={setQuality}/>
        </div>
        <label className="beauty-review-comment">Votre commentaire <small>Optionnel · 1 200 caractères maximum</small><textarea rows={4} maxLength={1200} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Partagez votre expérience…"/></label>
        <p className="beauty-review-verification">✓ Cet avis sera marqué comme vérifié car il est lié à un rendez-vous réellement terminé.</p>
        {error && <div className="beauty-client-message error">{error}</div>}
        <button className="beauty-client-login-button" type="submit" disabled={busy}>{busy ? 'Publication…' : 'Publier mon avis'}</button>
      </form>
    </section>
  </div>;
}
