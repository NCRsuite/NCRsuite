import { FormEvent, useEffect, useState } from 'react';
import type { EmailOtpType } from '@supabase/supabase-js';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageMetadata } from '../components/PageMetadata';
import { PublicSiteHeader } from '../components/PublicSiteHeader';
import { supabase } from '../lib/supabase';

const allowedOtpTypes = new Set<EmailOtpType>(['invite', 'magiclink', 'recovery', 'signup']);

export function AccountActivationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const typeValue = searchParams.get('type') as EmailOtpType | null;
  const isRecovery = typeValue === 'recovery';

  useEffect(() => {
    let active = true;

    async function verify() {
      if (!supabase) {
        setError('Le service de connexion est indisponible.');
        setVerifying(false);
        return;
      }

      const tokenHash = searchParams.get('token_hash');
      if (!tokenHash || !typeValue || !allowedOtpTypes.has(typeValue)) {
        setError('Ce lien est incomplet ou invalide.');
        setVerifying(false);
        return;
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: typeValue });
      if (!active) return;
      if (verifyError) setError('Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien.');
      else setVerified(true);
      setVerifying(false);
    }

    void verify();
    return () => { active = false; };
  }, [searchParams, typeValue]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || pending || !verified) return;
    if (password.length < 10) {
      setError('Le mot de passe doit contenir au moins 10 caractères.');
      return;
    }
    if (password !== confirmation) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setPending(true);
    setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) setError(updateError.message);
    else navigate(isRecovery ? '/' : '/configuration', { replace: true });
    setPending(false);
  }

  return (
    <div className="public-form-page auth-public-page">
      <PageMetadata title={`${isRecovery ? 'Nouveau mot de passe' : 'Activer mon accès'} | NCR Suite`} path="/activation" />
      <PublicSiteHeader compact />
      <main className="auth-simple-shell">
        <section>
          <span className="auth-simple-icon"><Icon name={verified ? 'check' : 'lock'} size={26} /></span>
          <p className="public-section-label">{isRecovery ? 'RÉCUPÉRATION DU COMPTE' : 'INVITATION NCR SUITE'}</p>
          <h1>{isRecovery ? 'Choisissez un nouveau mot de passe' : 'Finalisez votre accès'}</h1>

          {verifying && <div className="auth-verification-state"><span className="auth-spinner" /><p>Vérification du lien sécurisé…</p></div>}
          {!verifying && error && !verified && (
            <div className="auth-expired-state">
              <div className="error-message" role="alert">{error}</div>
              <Link className="public-primary-action full" to={isRecovery ? '/mot-de-passe-oublie' : '/demande-acces'}>
                {isRecovery ? 'Recevoir un nouveau lien' : 'Revenir à ma demande'}
              </Link>
            </div>
          )}
          {verified && (
            <form onSubmit={submit}>
              <p>{isRecovery ? 'Votre identité est confirmée. Définissez maintenant votre nouveau mot de passe.' : 'Votre invitation est valide. Ce mot de passe protégera votre futur espace professionnel.'}</p>
              <label>Nouveau mot de passe<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} autoComplete="new-password" required /></label>
              <label>Confirmer le mot de passe<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={10} autoComplete="new-password" required /></label>
              {error && <div className="error-message" role="alert">{error}</div>}
              <button className="public-primary-action full" disabled={pending}>{pending ? 'Enregistrement…' : isRecovery ? 'Enregistrer le mot de passe' : 'Activer mon accès'}</button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
