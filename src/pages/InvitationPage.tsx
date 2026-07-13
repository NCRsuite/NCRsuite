import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface InvitationDetails {
  organization_name: string;
  organization_color: string;
  invited_email: string;
  invited_role: 'admin' | 'manager' | 'employee' | 'viewer';
  staff_name: string | null;
  invitation_status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
}

const roleLabels: Record<InvitationDetails['invited_role'], string> = {
  admin: 'Administrateur',
  manager: 'Responsable',
  employee: 'Collaborateur',
  viewer: 'Consultation'
};

export function InvitationPage() {
  const { token = '' } = useParams();
  const { user, signIn } = useAuth();
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function loadInvitation() {
      if (!supabase || !token) {
        if (active) {
          setError('Invitation invalide.');
          setLoading(false);
        }
        return;
      }
      const { data, error: invitationError } = await supabase.rpc('get_team_invitation', { p_token: token });
      if (!active) return;
      if (invitationError) setError(invitationError.message);
      else if (!data?.[0]) setError('Cette invitation est introuvable ou n’est plus valide.');
      else setDetails(data[0] as InvitationDetails);
      setLoading(false);
    }
    loadInvitation();
    return () => { active = false; };
  }, [token]);

  async function authenticate(event: FormEvent) {
    event.preventDefault();
    if (!details || !supabase) return;
    setPending(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'login') {
        await signIn(details.invited_email, password);
        setMessage('Connexion réussie. Vous pouvez maintenant accepter l’invitation.');
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: details.invited_email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.href
          }
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          setMessage('Compte créé. Vous pouvez maintenant accepter l’invitation.');
        } else {
          setMessage('Compte créé. Ouvrez l’e-mail de confirmation reçu, puis revenez sur cette invitation.');
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentification impossible.');
    } finally {
      setPending(false);
    }
  }

  async function accept() {
    if (!supabase || !details) return;
    setPending(true);
    setError('');
    try {
      const { error: acceptError } = await supabase.rpc('accept_team_invitation', { p_token: token });
      if (acceptError) throw acceptError;
      window.location.assign('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible d’accepter l’invitation.');
      setPending(false);
    }
  }

  const emailMatches = Boolean(user?.email && details?.invited_email && user.email.toLowerCase() === details.invited_email.toLowerCase());
  const unavailable = details && details.invitation_status !== 'pending';

  return (
    <div className="invitation-layout" style={{ '--accent': details?.organization_color || '#0a84ff' } as React.CSSProperties}>
      <section className="invitation-card">
        <img className="auth-wordmark" src="/brand/ncr-suite-logo-horizontal.png" alt="NCR Suite" />
        {loading ? <div className="list-state">Chargement de l’invitation…</div> : details ? (
          <>
            <p className="eyebrow">INVITATION ÉQUIPE</p>
            <h1>Rejoignez {details.organization_name}</h1>
            <p className="muted">Un accès personnel vous a été proposé sur NCR Suite.</p>

            <div className="invitation-summary">
              <div><span>Entreprise</span><strong>{details.organization_name}</strong></div>
              <div><span>Adresse invitée</span><strong>{details.invited_email}</strong></div>
              <div><span>Rôle</span><strong>{roleLabels[details.invited_role]}</strong></div>
              {details.staff_name && <div><span>Profil associé</span><strong>{details.staff_name}</strong></div>}
            </div>

            {unavailable ? (
              <div className="error-message">Cette invitation est {details.invitation_status === 'accepted' ? 'déjà acceptée' : details.invitation_status === 'expired' ? 'expirée' : 'révoquée'}.</div>
            ) : user ? (
              <div className="invitation-action-box">
                {emailMatches ? (
                  <>
                    <p>Vous êtes connecté avec <strong>{user.email}</strong>.</p>
                    <button className="primary-button full" disabled={pending} onClick={accept}>{pending ? 'Validation…' : 'Accepter et ouvrir mon espace'}</button>
                  </>
                ) : (
                  <div className="error-message">Vous êtes connecté avec {user.email}. Déconnectez-vous puis utilisez l’adresse {details.invited_email}.</div>
                )}
              </div>
            ) : (
              <>
                <div className="segmented-control invitation-mode" role="group" aria-label="Type de connexion">
                  <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Créer mon compte</button>
                  <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>J’ai déjà un compte</button>
                </div>
                <form className="invitation-auth-form" onSubmit={authenticate}>
                  {mode === 'signup' && <label>Nom complet<input value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} /></label>}
                  <label>Adresse e-mail<input value={details.invited_email} disabled /></label>
                  <label>Mot de passe<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /></label>
                  <button className="primary-button full" disabled={pending}>{pending ? 'Veuillez patienter…' : mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}</button>
                </form>
              </>
            )}
          </>
        ) : null}

        {error && <div className="error-message page-message" role="alert">{error}</div>}
        {message && <div className="success-message page-message" role="status">{message}</div>}
        <Link className="text-button invitation-back" to="/connexion">Retour à la connexion</Link>
      </section>
    </div>
  );
}
