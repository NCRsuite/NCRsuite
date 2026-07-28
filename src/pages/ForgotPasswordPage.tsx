import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageMetadata } from '../components/PageMetadata';
import { PublicSiteHeader } from '../components/PublicSiteHeader';
import { supabase } from '../lib/supabase';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || pending) return;
    setPending(true);
    setError('');
    const { data, error: requestError } = await supabase.functions.invoke('request-account-recovery', {
      body: { email }
    });
    if (requestError || data?.error) setError(String(data?.error || requestError?.message || 'Demande impossible.'));
    else setSent(true);
    setPending(false);
  }

  return (
    <div className="public-form-page auth-public-page">
      <PageMetadata title="Mot de passe oublié | NCR Suite" path="/mot-de-passe-oublie" />
      <PublicSiteHeader compact />
      <main className="auth-simple-shell">
        <section>
          <span className="auth-simple-icon"><Icon name={sent ? 'check' : 'lock'} size={26} /></span>
          <p className="public-section-label">{sent ? 'DEMANDE ENREGISTRÉE' : 'ACCÈS SÉCURISÉ'}</p>
          <h1>{sent ? 'Consultez votre boîte e-mail' : 'Réinitialiser votre mot de passe'}</h1>
          {sent ? (
            <>
              <p>Si cette adresse correspond à un compte autorisé, un lien NCR Suite vient d’être envoyé par <strong>contact@ncr-suite.fr</strong>.</p>
              <Link className="public-primary-action full" to="/connexion">Revenir à la connexion</Link>
            </>
          ) : (
            <form onSubmit={submit}>
              <p>Indiquez l’adresse utilisée pour votre compte. La réponse reste volontairement identique, que le compte existe ou non.</p>
              <label>Adresse e-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
              {error && <div className="error-message" role="alert">{error}</div>}
              <button className="public-primary-action full" disabled={pending}>{pending ? 'Vérification…' : 'Recevoir un lien sécurisé'}</button>
            </form>
          )}
          <Link className="auth-simple-back" to="/connexion">Retour</Link>
        </section>
      </main>
    </div>
  );
}
