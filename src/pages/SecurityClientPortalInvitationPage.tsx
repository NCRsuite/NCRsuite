import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface PortalInvitationDetails {
  organization_name: string;
  organization_logo_url: string | null;
  organization_primary_color: string | null;
  client_name: string;
  invited_email: string;
  invited_name: string | null;
  invited_role: 'client_admin' | 'client_viewer';
  invitation_status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
}

export function SecurityClientPortalInvitationPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { user, signIn, signOut } = useAuth();
  const [details, setDetails] = useState<PortalInvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !token) {
        setError('Invitation invalide.');
        setLoading(false);
        return;
      }
      const { data, error: rpcError } = await supabase.rpc('get_security_client_portal_invitation', { p_token: token });
      if (!active) return;
      if (rpcError) setError(rpcError.message);
      else if (!data?.[0]) setError('Cette invitation est introuvable ou n’est plus disponible.');
      else {
        const invitation = data[0] as PortalInvitationDetails;
        setDetails(invitation);
        setFullName(invitation.invited_name ?? '');
      }
      setLoading(false);
    }
    void load();
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
        setMessage('Connexion réussie. Valide maintenant ton accès au portail.');
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: details.invited_email,
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: window.location.href
          }
        });
        if (signUpError) throw signUpError;
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          setMode('login');
          setMessage('Un compte existe déjà avec cette adresse. Connecte-toi avec ton mot de passe pour valider l’invitation.');
        } else {
          setMessage(data.session
            ? 'Compte créé. Valide maintenant ton accès au portail.'
            : 'Compte créé. Confirme ton adresse depuis l’e-mail reçu, puis reviens sur cette page.');
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentification impossible.');
    } finally {
      setPending(false);
    }
  }

  async function acceptInvitation() {
    if (!supabase || !token) return;
    setPending(true);
    setError('');
    try {
      const { error: acceptError } = await supabase.rpc('accept_security_client_portal_invitation', { p_token: token });
      if (acceptError) throw acceptError;
      navigate('/espace-client-securite', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Validation impossible.');
      setPending(false);
    }
  }

  const emailMatches = Boolean(user?.email && details?.invited_email && user.email.toLowerCase() === details.invited_email.toLowerCase());
  const available = details?.invitation_status === 'pending';
  const accent = details?.organization_primary_color || '#1d4ed8';

  return <div className="security-client-public-shell" style={{ '--portal-accent': accent } as React.CSSProperties}>
    <div className="security-client-public-glow" />
    <section className="security-client-invitation-card">
      <div className="security-client-public-brand">
        {details?.organization_logo_url ? <img src={details.organization_logo_url} alt="" /> : <span><Icon name="shield" size={26}/></span>}
        <div><strong>{details?.organization_name || 'Portail client Sécurité'}</strong><small>Propulsé par NCR Suite</small></div>
      </div>

      {loading ? <div className="security-client-loading"><span/><p>Vérification de l’invitation…</p></div> : details ? <>
        <div className="security-client-invitation-heading">
          <p className="eyebrow">ESPACE DONNEUR D’ORDRE</p>
          <h1>Ton portail sécurisé est prêt.</h1>
          <p>{details.organization_name} t’invite à suivre les prestations de sécurité réalisées pour <strong>{details.client_name}</strong>.</p>
        </div>

        <div className="security-client-invitation-summary">
          <div><span><Icon name="building" size={18}/></span><p>Entreprise cliente<strong>{details.client_name}</strong></p></div>
          <div><span><Icon name="message" size={18}/></span><p>Adresse invitée<strong>{details.invited_email}</strong></p></div>
          <div><span><Icon name="lock" size={18}/></span><p>Niveau d’accès<strong>{details.invited_role === 'client_admin' ? 'Responsable client' : 'Consultation'}</strong></p></div>
        </div>

        {!available ? <div className="security-client-accept-box">
          <div className={`security-client-status-box ${details.invitation_status === 'accepted' ? '' : 'error'}`}>
            <Icon name={details.invitation_status === 'accepted' ? 'check' : 'alert'} size={20}/><div><strong>{details.invitation_status === 'accepted' ? 'Invitation déjà activée' : 'Invitation indisponible'}</strong><p>Elle est {details.invitation_status === 'accepted' ? 'déjà associée à votre compte' : details.invitation_status === 'expired' ? 'expirée' : 'révoquée'}.</p></div>
          </div>
          {details.invitation_status === 'accepted' && <Link className="primary-button full" to="/espace-client-securite">Ouvrir mon portail client</Link>}
        </div> : user ? <div className="security-client-accept-box">
          {emailMatches ? <>
            <div><Icon name="check" size={20}/><p>Connecté avec <strong>{user.email}</strong></p></div>
            <button className="primary-button full" disabled={pending} onClick={() => void acceptInvitation()}>{pending ? 'Activation…' : 'Activer mon portail client'}</button>
          </> : <>
            <div className="security-client-status-box error"><Icon name="alert" size={20}/><div><strong>Mauvaise adresse connectée</strong><p>Cette invitation est réservée à {details.invited_email}.</p></div></div>
            <button className="secondary-button full" onClick={() => void signOut()}>Se déconnecter</button>
          </>}
        </div> : <>
          <div className="segmented-control security-client-auth-mode">
            <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Créer mon accès</button>
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>J’ai déjà un compte</button>
          </div>
          <form className="security-client-auth-form" onSubmit={authenticate}>
            {mode === 'signup' && <label>Nom complet<input value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} autoComplete="name" /></label>}
            <label>Adresse e-mail<input value={details.invited_email} disabled /></label>
            <label>Mot de passe<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
            <button className="primary-button full" disabled={pending}>{pending ? 'Veuillez patienter…' : mode === 'signup' ? 'Créer mon compte sécurisé' : 'Se connecter'}</button>
          </form>
        </>}
      </> : null}

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}
      <div className="security-client-public-footer"><Link to="/espace-client-securite">Déjà client ? Ouvrir le portail</Link><span>·</span><a href="mailto:contact@ncr-suite.fr">Assistance NCR Suite</a></div>
    </section>
  </div>;
}
