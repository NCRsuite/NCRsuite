import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export function LoginPage() {
  const { user, signIn, signUp, startDemo } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      if (mode === 'login') await signIn(email, password);
      else await signUp(email, password, fullName);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Une erreur est survenue.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-showcase">
        <div className="showcase-brand"><img src="/brand/ncr-suite-logo-horizontal.png" alt="NCR Suite" /></div>
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
          <h2>{mode === 'login' ? 'Connexion' : 'Créer votre espace'}</h2>
          <p className="muted">Accédez à votre environnement métier NCR Suite.</p>

          {isSupabaseConfigured ? (
            <form onSubmit={submit}>
              {mode === 'signup' && (
                <label>Nom complet<input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></label>
              )}
              <label>Adresse e-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
              <label>Mot de passe<input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
              {error && <div className="error-message">{error}</div>}
              <button className="primary-button full" disabled={pending}>{pending ? 'Veuillez patienter…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</button>
            </form>
          ) : (
            <div className="demo-box">
              <strong>Mode de démonstration local</strong>
              <p>Supabase n’est pas encore connecté. Tu peux déjà tester la structure et les différents packs métier.</p>
              <button className="primary-button full" onClick={startDemo}>Ouvrir la démonstration</button>
            </div>
          )}

          {isSupabaseConfigured && (
            <button className="text-button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'Première connexion ? Créer un compte' : 'Déjà inscrit ? Se connecter'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
