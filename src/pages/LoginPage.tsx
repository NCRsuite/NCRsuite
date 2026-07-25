import { FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { PageMetadata } from '../components/PageMetadata';
import { useAuth } from '../contexts/AuthContext';
import { usePlatformAdmin } from '../contexts/PlatformAdminContext';
import { isSupabaseConfigured } from '../lib/supabase';

export function LoginPage() {
  const { user, signIn, startDemo } = useAuth();
  const { isAdmin, loading: adminLoading } = usePlatformAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  if (user && adminLoading) {
    return <div className="loading-screen"><img src="/brand/ncr-suite-icon.png" alt="" /><span>Ouverture de votre espace…</span></div>;
  }
  if (user) return <Navigate to={isAdmin ? '/administration-ncr' : '/'} replace />;

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
          <h1>La gestion professionnelle qui s’adapte vraiment à votre activité.</h1>
          <p>Chaque entreprise retrouve uniquement les outils, les menus et les données dont elle a besoin.</p>
        </div>
        <div className="showcase-pills"><span>Multi-entreprises</span><span>Modulaire</span><span>Sécurisée</span></div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <img className="auth-wordmark" src="/brand/ncr-suite-logo-horizontal.png" alt="NCR Suite" />
          <p className="eyebrow">ESPACE PROFESSIONNEL</p>
          <h2>Connexion</h2>
          <p className="muted">Accédez à votre environnement métier NCR Suite.</p>

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
              <p>Supabase n’est pas encore connecté. Tu peux déjà tester la structure et les différents packs métier.</p>
              <button className="primary-button full" onClick={startDemo}>Ouvrir la démonstration</button>
            </div>
          )}

          {isSupabaseConfigured && (
            <div className="auth-access-request">
              <span>Vous n’avez pas encore de compte ?</span>
              <Link className="text-button" to="/demande-acces">Demander un accès</Link>
            </div>
          )}
          <Link className="auth-home-link" to="/">Retour au site NCR Suite</Link>
        </div>
      </section>
    </div>
  );
}
