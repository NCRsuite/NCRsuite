import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { supabase } from '../lib/supabase';

interface PublicSurveyData {
  survey_id: string;
  status: 'pending' | 'sent' | 'completed';
  organization_name: string;
  organization_logo_url: string | null;
  organization_primary_color: string;
  show_ncr_branding: boolean;
  intro_text: string | null;
  session_title: string;
  program_title: string;
  starts_at: string;
  ends_at: string;
  trainer_name: string | null;
  trainee_first_name: string;
  completed_at: string | null;
}

type RatingKey = 'content' | 'trainer' | 'organization' | 'objectives';

function humanPeriod(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
  const startText = formatter.format(new Date(start));
  const endText = formatter.format(new Date(end));
  return startText === endText ? startText : `du ${startText} au ${endText}`;
}

function RatingField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <fieldset className="public-rating-field"><legend>{label}</legend><div>{[1, 2, 3, 4, 5].map((score) => <button key={score} type="button" className={value === score ? 'active' : ''} onClick={() => onChange(score)} aria-label={`${score} sur 5`}>{score}<small>{score === 1 ? 'Insuffisant' : score === 5 ? 'Excellent' : ''}</small></button>)}</div></fieldset>;
}

export function PublicTrainingSatisfactionPage() {
  const { token = '' } = useParams();
  const [data, setData] = useState<PublicSurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [ratings, setRatings] = useState<Record<RatingKey, number>>({ content: 0, trainer: 0, organization: 0, objectives: 0 });
  const [recommend, setRecommend] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [improvement, setImprovement] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !token) { setError('Questionnaire introuvable.'); setLoading(false); return; }
      const { data: payload, error: rpcError } = await supabase.rpc('get_public_training_satisfaction', { p_token: token });
      if (!active) return;
      if (rpcError || !payload || !(payload as PublicSurveyData).survey_id) setError(rpcError?.message || 'Ce questionnaire n’est plus disponible.');
      else {
        const survey = payload as PublicSurveyData;
        setData(survey);
        setCompleted(survey.status === 'completed');
        document.documentElement.style.setProperty('--accent', survey.organization_primary_color || '#0a84ff');
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !token) return;
    if (Object.values(ratings).some((value) => value < 1) || recommend === null) {
      setError('Réponds à toutes les questions obligatoires avant de valider.'); return;
    }
    setSubmitting(true); setError('');
    const { error: rpcError } = await supabase.rpc('submit_public_training_satisfaction', {
      p_token: token,
      p_content_rating: ratings.content,
      p_trainer_rating: ratings.trainer,
      p_organization_rating: ratings.organization,
      p_objectives_rating: ratings.objectives,
      p_recommend: recommend,
      p_comment: comment,
      p_improvement: improvement
    });
    if (rpcError) setError(rpcError.message);
    else { setCompleted(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    setSubmitting(false);
  }

  if (loading) return <div className="public-booking-state"><img src="/brand/ncr-suite-icon.png" alt="" /><span>Chargement du questionnaire…</span></div>;
  if (error && !data) return <div className="public-booking-state"><img src="/brand/ncr-suite-icon.png" alt="" /><strong>Questionnaire indisponible</strong><span>{error}</span></div>;
  if (!data) return null;

  if (completed) return <div className="public-survey-page"><main className="public-survey-container"><section className="public-survey-thankyou"><span><Icon name="check" size={34} /></span><p className="eyebrow">RÉPONSE ENREGISTRÉE</p><h1>Merci {data.trainee_first_name}.</h1><p>Ton retour a bien été transmis à {data.organization_name}. Il aidera l’organisme à améliorer ses prochaines formations.</p></section></main>{data.show_ncr_branding && <footer className="public-booking-footer">Propulsé par <strong>NCR Suite</strong></footer>}</div>;

  return (
    <div className="public-survey-page">
      <header className="public-booking-brand">{data.organization_logo_url ? <img className="public-brand-logo-image" src={data.organization_logo_url} alt={data.organization_name} /> : <span className="public-brand-mark" style={{ background: data.organization_primary_color }}>{data.organization_name.slice(0, 1)}</span>}<div><strong>{data.organization_name}</strong><span>Questionnaire de satisfaction</span></div></header>
      <main className="public-survey-container">
        <section className="public-survey-hero"><p className="eyebrow">QUALITÉ FORMATION</p><h1>Ton avis compte.</h1><p>{data.intro_text || `Bonjour ${data.trainee_first_name}, prends quelques instants pour évaluer la formation que tu viens de suivre.`}</p></section>
        <section className="public-survey-session-card"><span><Icon name="graduation" size={25} /></span><div><strong>{data.program_title || data.session_title}</strong><p>{humanPeriod(data.starts_at, data.ends_at)}{data.trainer_name ? ` · Formateur : ${data.trainer_name}` : ''}</p></div></section>
        <form className="public-survey-form" onSubmit={submit}>
          <RatingField label="Qualité et utilité du contenu *" value={ratings.content} onChange={(value) => setRatings((current) => ({ ...current, content: value }))} />
          <RatingField label="Animation du formateur *" value={ratings.trainer} onChange={(value) => setRatings((current) => ({ ...current, trainer: value }))} />
          <RatingField label="Organisation de la formation *" value={ratings.organization} onChange={(value) => setRatings((current) => ({ ...current, organization: value }))} />
          <RatingField label="Atteinte des objectifs annoncés *" value={ratings.objectives} onChange={(value) => setRatings((current) => ({ ...current, objectives: value }))} />
          <fieldset className="public-recommend-field"><legend>Recommanderais-tu cette formation ? *</legend><div><button type="button" className={recommend === true ? 'active' : ''} onClick={() => setRecommend(true)}><Icon name="check" size={19} />Oui</button><button type="button" className={recommend === false ? 'active negative' : ''} onClick={() => setRecommend(false)}><Icon name="close" size={19} />Non</button></div></fieldset>
          <label>Ce que tu as particulièrement apprécié<textarea rows={4} maxLength={3000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Contenu, méthode, exercices, animation…" /></label>
          <label>Une piste d’amélioration<textarea rows={4} maxLength={3000} value={improvement} onChange={(event) => setImprovement(event.target.value)} placeholder="Ce qui pourrait être amélioré…" /></label>
          {error && <div className="error-message" role="alert">{error}</div>}
          <button className="primary-button public-survey-submit" type="submit" disabled={submitting}>{submitting ? 'Enregistrement…' : 'Envoyer mon évaluation'}</button>
          <p className="public-survey-privacy">Tes réponses sont transmises uniquement à l’organisme de formation pour le suivi qualité de cette session.</p>
        </form>
      </main>
      {data.show_ncr_branding && <footer className="public-booking-footer">Propulsé par <strong>NCR Suite</strong></footer>}
    </div>
  );
}
