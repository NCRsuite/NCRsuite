import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ReviewSummary {
  count: number;
  rating: number | null;
  reception: number | null;
  cleanliness: number | null;
  ambiance: number | null;
  quality: number | null;
}

interface PublicReview {
  id: string;
  rating: number;
  reception_rating: number;
  cleanliness_rating: number;
  ambiance_rating: number;
  quality_rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string;
  service_name: string;
  staff_name: string;
  verified: boolean;
}

interface ReviewsPayload {
  summary: ReviewSummary;
  reviews: PublicReview[];
}

const reviewDate = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

function Stars({ value }: { value: number }) {
  return <span className="beauty-public-review-stars" aria-label={`${value} sur 5`}>{[1,2,3,4,5].map((score) => <i key={score} className={score <= Math.round(value) ? 'active' : ''}>★</i>)}</span>;
}

function ScoreLine({ label, value }: { label: string; value: number | null }) {
  return <div className="beauty-public-score-line"><span>{label}</span><strong>{value == null ? '—' : value.toFixed(1)}</strong></div>;
}

export function BeautyPublicReviews({ slug }: { slug: string }) {
  const [payload, setPayload] = useState<ReviewsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !slug) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc('get_public_metier_coiffure_company_reviews', { p_slug: slug, p_limit: 20 });
      if (!active) return;
      if (!error && data) setPayload(data as ReviewsPayload);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [slug]);

  const count = payload?.summary?.count ?? 0;
  const average = payload?.summary?.rating ?? null;
  const reviews = useMemo(() => Array.isArray(payload?.reviews) ? payload!.reviews : [], [payload]);

  return <section className="company-public-section beauty-public-reviews" id="avis">
    <div className="company-public-section-heading"><p className="eyebrow">AVIS VÉRIFIÉS</p><h2>Ce que pensent les clients</h2><p>Seuls les clients ayant réellement terminé un rendez-vous auprès de cette enseigne peuvent publier un avis.</p></div>
    {loading ? <div className="beauty-public-review-empty">Chargement des avis…</div> : count === 0 ? <div className="beauty-public-review-empty"><strong>Pas encore d’avis publié</strong><p>Les premiers avis vérifiés apparaîtront ici après des rendez-vous terminés.</p></div> : <>
      <div className="beauty-public-review-summary">
        <div className="beauty-public-review-score"><strong>{average?.toFixed(1)}</strong><Stars value={average ?? 0}/><span>{count} avis vérifié{count > 1 ? 's' : ''}</span></div>
        <div className="beauty-public-review-details">
          <ScoreLine label="Accueil" value={payload?.summary.reception ?? null}/>
          <ScoreLine label="Propreté" value={payload?.summary.cleanliness ?? null}/>
          <ScoreLine label="Cadre & ambiance" value={payload?.summary.ambiance ?? null}/>
          <ScoreLine label="Qualité de la prestation" value={payload?.summary.quality ?? null}/>
        </div>
      </div>
      <div className="beauty-public-review-list">{reviews.map((review) => <article key={review.id} className="beauty-public-review-card">
        <div className="beauty-public-review-card-head"><div><strong>{review.reviewer_name}</strong><span className="beauty-public-verified">✓ Avis vérifié</span></div><time>{reviewDate.format(new Date(review.created_at))}</time></div>
        <div className="beauty-public-review-rating"><strong>{review.rating.toFixed(1)}</strong><Stars value={review.rating}/></div>
        {review.comment && <p>{review.comment}</p>}
        <small>{review.service_name} · avec {review.staff_name}</small>
      </article>)}</div>
    </>}
  </section>;
}
