import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { formatDateTime } from '../features/training/types';
import { supabase } from '../lib/supabase';

interface UpcomingSession {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  capacity: number;
  location: string | null;
  program_title: string;
  trainer_name: string | null;
  enrolled_count: number;
}

interface Summary {
  active_programs: number;
  active_trainees: number;
  active_trainers: number;
  upcoming_sessions: number;
  next_sessions: UpcomingSession[];
}

const emptySummary: Summary = {
  active_programs: 0,
  active_trainees: 0,
  active_trainers: 0,
  upcoming_sessions: 0,
  next_sessions: []
};

export function TrainingDashboardPage() {
  const { organization, activeSiteId, activeSite } = useOrganization();
  const { demoMode } = useAuth();
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!organization) return;
    let active = true;
    const organizationId: string = organization.id;
    async function load() {
      setLoading(true); setError('');
      if (demoMode || !supabase) {
        const getCount = (key: string) => {
          const raw = localStorage.getItem(key);
          return raw ? (JSON.parse(raw) as unknown[]).length : 0;
        };
        const sessionsRaw = localStorage.getItem(`ncr-suite-training-sessions-${organizationId}`);
        const sessions = sessionsRaw ? JSON.parse(sessionsRaw) as UpcomingSession[] : [];
        if (active) {
          setSummary({
            active_programs: getCount(`ncr-suite-training-programs-${organizationId}`),
            active_trainees: getCount(`ncr-suite-training-trainees-${organizationId}`),
            active_trainers: getCount(`ncr-suite-training-trainers-${organizationId}`),
            upcoming_sessions: sessions.filter((session) => new Date(session.ends_at) >= new Date()).length,
            next_sessions: sessions.slice(0, 6)
          });
          setLoading(false);
        }
        return;
      }
      const { data, error: rpcError } = await supabase.rpc('training_dashboard_summary', {
        p_organization_id: organizationId,
        p_site_id: activeSiteId
      });
      if (!active) return;
      if (rpcError) setError(`Tableau de bord indisponible : ${rpcError.message}`);
      else setSummary({ ...emptySummary, ...(data as Summary), next_sessions: (data as Summary)?.next_sessions ?? [] });
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [organization, activeSiteId, demoMode]);

  if (!organization) return null;

  return (
    <div className="page training-dashboard-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">PACK FORMATION</p>
          <h1>Bonjour, bienvenue sur {organization.name}.</h1>
          <p>{activeSite ? `Vue de l’établissement ${activeSite.name}.` : 'Pilotez vos formations, stagiaires et sessions depuis un espace unique.'}</p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" to="/stagiaires?new=1"><Icon name="users" size={18} />Ajouter un stagiaire</Link>
          <Link className="primary-button" to="/sessions?new=1"><Icon name="calendar" size={18} />Créer une session</Link>
        </div>
      </header>

      {error && <div className="error-message page-message" role="alert">{error}</div>}

      <section className="stats-grid">
        <StatCard label="Formations actives" value={loading ? '…' : String(summary.active_programs)} detail="catalogue disponible" icon="graduation" />
        <StatCard label="Stagiaires actifs" value={loading ? '…' : String(summary.active_trainees)} detail="fiches enregistrées" icon="users" />
        <StatCard label="Formateurs actifs" value={loading ? '…' : String(summary.active_trainers)} detail="intervenants disponibles" icon="briefcase" />
        <StatCard label="Sessions à venir" value={loading ? '…' : String(summary.upcoming_sessions)} detail="brouillons et planifiées" icon="calendar" />
      </section>

      <section className="training-dashboard-grid">
        <article className="panel training-upcoming-panel">
          <div className="panel-header"><div><p className="eyebrow">PROCHAINES SESSIONS</p><h2>Planning à venir</h2></div><Link className="secondary-button compact-button" to="/sessions">Tout afficher</Link></div>
          {loading ? <div className="training-empty">Chargement…</div> : summary.next_sessions.length === 0 ? (
            <div className="training-empty"><Icon name="calendar" size={30} /><strong>Aucune session à venir</strong><span>Crée une formation, puis planifie la première session.</span></div>
          ) : (
            <div className="training-upcoming-list">
              {summary.next_sessions.map((session) => (
                <article key={session.id}>
                  <span className="training-upcoming-date"><strong>{new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(new Date(session.starts_at))}</strong><small>{new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(session.starts_at))}</small></span>
                  <div><strong>{session.title}</strong><span>{session.program_title}</span><small>{formatDateTime(session.starts_at)}{session.trainer_name ? ` · ${session.trainer_name}` : ''}</small></div>
                  <em>{session.enrolled_count}/{session.capacity}</em>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="panel training-readiness-panel">
          <div className="panel-header"><div><p className="eyebrow">MISE EN ROUTE</p><h2>Préparer une session</h2></div></div>
          <div className="training-readiness-list">
            <Link to="/formations"><span><Icon name="graduation" size={19} /></span><div><strong>1. Créer la formation</strong><small>Intitulé, durée, modalité et objectifs.</small></div><Icon name="chevronRight" size={17} /></Link>
            <Link to="/formateurs"><span><Icon name="briefcase" size={19} /></span><div><strong>2. Ajouter le formateur</strong><small>Coordonnées et spécialités.</small></div><Icon name="chevronRight" size={17} /></Link>
            <Link to="/stagiaires"><span><Icon name="users" size={19} /></span><div><strong>3. Enregistrer les stagiaires</strong><small>Contacts et entreprise d’origine.</small></div><Icon name="chevronRight" size={17} /></Link>
            <Link to="/sessions"><span><Icon name="calendar" size={19} /></span><div><strong>4. Planifier la session</strong><small>Dates, lieu, capacité et inscriptions.</small></div><Icon name="chevronRight" size={17} /></Link>
            <Link to="/documents"><span><Icon name="file" size={19} /></span><div><strong>5. Préparer les documents</strong><small>Convocations, programmes, supports et attestations.</small></div><Icon name="chevronRight" size={17} /></Link>
            <Link to="/emargements"><span><Icon name="signature" size={19} /></span><div><strong>6. Faire émarger</strong><small>Présences et signatures matin / après-midi.</small></div><Icon name="chevronRight" size={17} /></Link>
          </div>
        </article>
      </section>

      <section className="panel training-next-phase">
        <span><Icon name="signature" size={24} /></span>
        <div><p className="eyebrow">ÉMARGEMENTS OPÉRATIONNELS</p><h2>Signatures matin et après-midi</h2><p>Le formateur peut maintenant faire signer chaque stagiaire directement sur téléphone ou tablette, puis suivre les absences et justificatifs par session.</p><Link className="secondary-button compact-button" to="/emargements">Ouvrir les émargements</Link></div>
      </section>
    </div>
  );
}
