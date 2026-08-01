import { FormEvent, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { PageMetadata } from '../components/PageMetadata';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { usePlatformAdmin } from '../contexts/PlatformAdminContext';
import { isSupabaseConfigured } from '../lib/supabase';

export function LoginPage() {
  const { user, signIn, startDemo } = useAuth();
  const { isAdmin, loading: adminLoading } = usePlatformAdmin();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  if (user && adminLoading) {
    return <div className="loading-screen"><img src="/brand/ncr-suite-icon.png" alt="" /><span>Ouverture de votre espace…</span></div>;
  }
  const cleaningAgentMode = searchParams.get('espace') === 'agent-nettoyage';

  if (user) return <Navigate to={isAdmin ? '/administration-ncr' : cleaningAgentMode ? '/terrain' : '/'} replace />;

  function releaseMobileKeyboard() {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) activeElement.blur();
    window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }), 0);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    releaseMobileKeyboard();
    setError('');
    setPending(true);
    try {
      await signIn(email, password);
      releaseMobileKeyboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Une erreur est survenue.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-layout">
      <PageMetadata title="Connexion | NCR Suite" path="/connexion" />
      <section className="auth-showcase">
        <Link className="showcase-brand" to="/"><img src="/brand/ncr-suite-logo-horizontal.png" alt="NCR Suite" /></Link>
        <div className="showcase-copy">
          <p className="eyebrow">UNE PLATEFORME. PLUSIEURS MÉTIERS.</p>
          <h1>La gestion professionnelle qui s’adapte vraiment à votre activité</h1>
          <p>Chaque entreprise retrouve uniquement les outils, les menus et les données dont elle a besoin.</p>
        </div>
        <div className="showcase-pills"><span>Multi-entreprises</span><span>Modulaire</span><span>Sécurisée</span></div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <img className="auth-wordmark" src="/brand/ncr-suite-logo-horizontal.png" alt="NCR Suite" />
          <p className="eyebrow">{cleaningAgentMode ? 'ESPACE AGENT NETTOYAGE' : 'ESPACE PROFESSIONNEL'}</p>
          <h2>{cleaningAgentMode ? 'Accès terrain' : 'Connexion'}</h2>
          <p className="muted">{cleaningAgentMode ? 'Retrouvez vos interventions, consignes, pointages et preuves terrain.' : 'Accédez à votre environnement métier NCR Suite.'}</p>

          {isSupabaseConfigured ? (
            <form onSubmit={submit}>
              <label>Adresse e-mail<input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
              <label>Mot de passe<input type="password" autoComplete="current-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
              <div className="auth-form-links"><Link to="/mot-de-passe-oublie">Mot de passe oublié ?</Link></div>
              {error && <div className="error-message">{error}</div>}
              <button className="primary-button full" disabled={pending}>{pending ? 'Veuillez patienter…' : 'Se connecter'}</button>
            </form>
          ) : (
            <div className="demo-box">
              <strong>Mode de démonstration local</strong>
              <p>Le mode de démonstration est actif. Tu peux déjà tester la structure et les différents packs métier.</p>
              <button className="primary-button full" onClick={startDemo}>Ouvrir la démonstration</button>
            </div>
          )}

          {isSupabaseConfigured && (
            <div className="auth-access-request">
              <span>Vous n’avez pas encore de compte ?</span>
              <Link className="text-button" to="/demande-acces">Demander un accès</Link>
            </div>
          )}

          <section className="auth-portal-chooser" aria-labelledby="auth-portals-title">
            <div>
              <p className="eyebrow">ESPACES EXTERNES</p>
              <h3 id="auth-portals-title">Accéder à votre portail</h3>
            </div>
            <div className="auth-portal-grid">
              <Link to="/espace-formation">
                <span><Icon name="graduation" size={18} /></span>
                <div><strong>Formation</strong><small>Stagiaire · Formateur · Client</small></div>
                <Icon name="chevronRight" size={16} />
              </Link>
              <Link to="/espace-securite">
                <span><Icon name="shield" size={18} /></span>
                <div><strong>Sécurité</strong><small>Client · Agent</small></div>
                <Icon name="chevronRight" size={16} />
              </Link>
              <Link to="/espace-nettoyage">
                <span><Icon name="sparkles" size={18} /></span>
                <div><strong>Nettoyage</strong><small>Client · Agent</small></div>
                <Icon name="chevronRight" size={16} />
              </Link>
              <Link to="/espace-client-coiffure">
                <span><Icon name="scissors" size={18} /></span>
                <div><strong>Coiffure</strong><small>Portail client</small></div>
                <Icon name="chevronRight" size={16} />
              </Link>
            </div>
          </section>
          <Link className="auth-home-link" to="/">Retour au site NCR Suite</Link>
        </div>
      </section>
    </div>
  );
}
