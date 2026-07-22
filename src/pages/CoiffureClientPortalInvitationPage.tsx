import { FormEvent, type CSSProperties, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface InvitationDetails {
  organization_name: string;
  organization_logo_url: string | null;
  organization_primary_color: string | null;
  client_name: string;
  invited_email: string;
  invited_name: string | null;
  invitation_status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
}

export function CoiffureClientPortalInvitationPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { user, signIn, signOut } = useAuth();
  const [details, setDetails] = useState<InvitationDetails | null>(null);
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
      if (!supabase || !token) { setError('Invitation invalide.'); setLoading(false); return; }
      const { data, error: rpcError } = await supabase.rpc('get_coiffure_client_portal_invitation', { p_token: token });
      if (!active) return;
      if (rpcError) setError(rpcError.message);
      else if (!data?.[0]) setError('Cette invitation est introuvable ou n’est plus disponible.');
      else {
        const invitation = data[0] as InvitationDetails;
        setDetails(invitation);
        setFullName(invitation.invited_name || invitation.client_name);
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [token]);

  async function authenticate(event: FormEvent) {
    event.preventDefault();
    if (!details || !supabase) return;
    setPending(true); setError(''); setMessage('');
    try {
      if (mode === 'login') {
        await signIn(details.invited_email, password);
        setMessage('Connexion réussie. Active maintenant ton espace client.');
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: details.invited_email,
          password,
          options: { data: { full_name: fullName.trim() }, emailRedirectTo: window.location.href }
        });
        if (signUpError) throw signUpError;
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          setMode('login');
          setMessage('Un compte existe déjà avec cette adresse. Connecte-toi pour activer l’invitation.');
        } else {
          setMessage(data.session ? 'Compte créé. Active maintenant ton espace client.' : 'Compte créé. Confirme ton adresse depuis l’e-mail reçu, puis reviens sur cette page.');
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentification impossible.');
    } finally { setPending(false); }
  }

  async function acceptInvitation() {
    if (!supabase || !token) return;
    setPending(true); setError('');
    const { error: rpcError } = await supabase.rpc('accept_coiffure_client_portal_invitation', { p_token: token });
    if (rpcError) { setError(rpcError.message); setPending(false); }
    else navigate('/espace-client-coiffure', { replace: true });
  }

  const emailMatches = Boolean(user?.email && details?.invited_email && user.email.toLowerCase() === details.invited_email.toLowerCase());
  const available = details?.invitation_status === 'pending';
  const accent = details?.organization_primary_color || '#c026d3';

  return <div className="hair-client-public-shell" style={{ '--hair-accent': accent } as CSSProperties}>
    <div className="hair-client-public-glow"/>
    <section className="hair-client-invitation-card">
      <div className="hair-client-brand">{details?.organization_logo_url ? <img src={details.organization_logo_url} alt=""/> : <span><Icon name="scissors" size={25}/></span>}<div><strong>{details?.organization_name || 'Espace client Coiffure'}</strong><small>Propulsé par NCR Suite</small></div></div>
      {loading ? <div className="hair-client-loading"><span/><p>Vérification de l’invitation…</p></div> : details ? <>
        <div className="hair-client-invitation-heading"><p className="eyebrow">FIDÉLITÉ & RENDEZ-VOUS</p><h1>Ton espace client est prêt.</h1><p>{details.organization_name} t’invite à retrouver tes rendez-vous, tes avantages et ton programme fidélité dans un espace personnel.</p></div>
        <div className="hair-client-invitation-summary"><div><span><Icon name="users" size={18}/></span><p>Profil client<strong>{details.client_name}</strong></p></div><div><span><Icon name="message" size={18}/></span><p>Adresse invitée<strong>{details.invited_email}</strong></p></div><div><span><Icon name="sparkles" size={18}/></span><p>Services disponibles<strong>Rendez-vous & fidélité</strong></p></div></div>
        {!available ? <div className="hair-client-accept-box"><div className={`hair-client-status-box ${details.invitation_status === 'accepted' ? '' : 'error'}`}><Icon name={details.invitation_status === 'accepted' ? 'check' : 'alert'} size={20}/><div><strong>{details.invitation_status === 'accepted' ? 'Invitation déjà activée' : 'Invitation indisponible'}</strong><p>Elle est {details.invitation_status === 'accepted' ? 'déjà liée à ton compte' : details.invitation_status === 'expired' ? 'expirée' : 'révoquée'}.</p></div></div>{details.invitation_status === 'accepted' && <Link className="primary-button full" to="/espace-client-coiffure">Ouvrir mon espace client</Link>}</div> : user ? <div className="hair-client-accept-box">{emailMatches ? <><div><Icon name="check" size={20}/><p>Connecté avec <strong>{user.email}</strong></p></div><button className="primary-button full" disabled={pending} onClick={() => void acceptInvitation()}>{pending ? 'Activation…' : 'Activer mon espace client'}</button></> : <><div className="hair-client-status-box error"><Icon name="alert" size={20}/><div><strong>Mauvaise adresse connectée</strong><p>Cette invitation est réservée à {details.invited_email}.</p></div></div><button className="secondary-button full" onClick={() => void signOut()}>Se déconnecter</button></>}</div> : <>
          <div className="segmented-control hair-client-auth-mode"><button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Créer mon accès</button><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>J’ai déjà un compte</button></div>
          <form className="hair-client-auth-form" onSubmit={authenticate}>{mode === 'signup' && <label>Nom complet<input value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} autoComplete="name"/></label>}<label>Adresse e-mail<input value={details.invited_email} disabled/></label><label>Mot de passe<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/></label><button className="primary-button full" disabled={pending}>{pending ? 'Veuillez patienter…' : mode === 'signup' ? 'Créer mon compte sécurisé' : 'Se connecter'}</button></form>
        </>}
      </> : null}
      {error && <div className="error-message page-message" role="alert">{error}</div>}{message && <div className="success-message page-message" role="status">{message}</div>}
      <div className="hair-client-public-footer"><Link to="/espace-client-coiffure">Déjà client ? Ouvrir l’espace</Link><span>·</span><a href="mailto:contact@ncr-suite.fr">Assistance NCR Suite</a></div>
    </section>
  </div>;
}
