import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { trainingPortalSubjectLabels, type TrainingPortalSubjectKind } from '../features/training/portalTypes';
import { supabase } from '../lib/supabase';

interface PortalInvitationDetails {
  organization_name: string;
  organization_logo_url: string | null;
  organization_primary_color: string | null;
  subject_kind: TrainingPortalSubjectKind;
  subject_name: string;
  invited_email: string;
  invited_name: string | null;
  invitation_status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
}

export function TrainingPortalInvitationPage() {
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
    async function loadInvitation() {
      if (!supabase || !token) {
        setError('Invitation invalide.');
        setLoading(false);
        return;
      }
      const { data, error: rpcError } = await supabase.rpc('get_training_portal_invitation', { p_token: token });
      if (!active) return;
      if (rpcError) setError(rpcError.message);
      else if (!data?.[0]) setError('Cette invitation est introuvable ou n’est plus disponible.');
      else {
        const invitation = data[0] as PortalInvitationDetails;
        setDetails(invitation);
        setFullName(invitation.invited_name || invitation.subject_name);
      }
      setLoading(false);
    }
    void loadInvitation();
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
        setMessage('Connexion réussie. Vous pouvez maintenant valider votre accès.');
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
          setMessage('Un compte existe déjà avec cette adresse. Connectez-vous pour valider l’invitation.');
        } else {
          setMessage(data.session
            ? 'Compte créé. Validez maintenant votre accès.'
            : 'Compte créé. Confirmez votre adresse depuis l’e-mail reçu, puis revenez ici.');
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
      const { error: acceptError } = await supabase.rpc('accept_training_portal_invitation', { p_token: token });
      if (acceptError) throw acceptError;
      navigate('/espace-formation', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Validation impossible.');
      setPending(false);
    }
  }

  const emailMatches = Boolean(
    user?.email && details?.invited_email && user.email.toLowerCase() === details.invited_email.toLowerCase()
  );
  const available = details?.invitation_status === 'pending';
  const accent = details?.organization_primary_color || '#147a52';

  return (
    <main className="training-portal-public-shell training-portal-invitation-shell" style={{ '--portal-accent': accent } as CSSProperties}>
      <section className="training-portal-auth-panel">
        <div className="training-portal-public-brand">
          {details?.organization_logo_url
            ? <img src={details.organization_logo_url} alt="" />
            : <span><Icon name="graduation" size={25} /></span>}
          <div>
            <strong>{details?.organization_name || 'Espace Formation'}</strong>
            <small>Accès sécurisé par NCR Suite</small>
          </div>
        </div>

        {loading ? (
          <div className="training-portal-loading"><span /><p>Vérification de l’invitation…</p></div>
        ) : details ? (
          <>
            <div className="training-portal-auth-heading">
              <p className="eyebrow">ESPACE {trainingPortalSubjectLabels[details.subject_kind].toUpperCase()}</p>
              <h1>Votre espace personnel est prêt</h1>
              <p>
                {details.organization_name} vous donne accès aux sessions, aux documents et aux signatures
                liés à <strong>{details.subject_name}</strong>.
              </p>
            </div>

            {!available ? (
              <div className="training-portal-notice error">
                <Icon name="alert" size={20} />
                <span>Cette invitation est {details.invitation_status === 'accepted' ? 'déjà utilisée' : 'expirée ou révoquée'}.</span>
              </div>
            ) : user ? (
              <div className="training-portal-accept">
                <div className={`training-portal-notice ${emailMatches ? 'success' : 'error'}`}>
                  <Icon name={emailMatches ? 'check' : 'alert'} size={20} />
                  <span>
                    {emailMatches
                      ? `Connecté avec ${user.email}.`
                      : `Cette invitation est réservée à ${details.invited_email}.`}
                  </span>
                </div>
                {emailMatches ? (
                  <button className="primary-button" onClick={() => void acceptInvitation()} disabled={pending}>
                    {pending ? 'Validation…' : 'Ouvrir mon espace'}
                  </button>
                ) : (
                  <button className="secondary-button" onClick={() => void signOut()}>Changer de compte</button>
                )}
              </div>
            ) : (
              <>
                <div className="training-portal-auth-switch" role="tablist" aria-label="Mode de connexion">
                  <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Créer mon accès</button>
                  <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>J’ai déjà un compte</button>
                </div>
                <form className="training-portal-auth-form" onSubmit={authenticate}>
                  {mode === 'signup' && (
                    <label>Nom complet<input value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} /></label>
                  )}
                  <label>Adresse e-mail<input type="email" value={details.invited_email} disabled /></label>
                  <label>Mot de passe<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} /></label>
                  <button className="primary-button" disabled={pending}>
                    {pending ? 'Patientez…' : mode === 'signup' ? 'Créer mon compte' : 'Me connecter'}
                  </button>
                </form>
              </>
            )}
          </>
        ) : (
          <div className="training-portal-auth-heading">
            <p className="eyebrow">INVITATION INDISPONIBLE</p>
            <h1>Ce lien ne peut pas être utilisé</h1>
            <p>Demandez une nouvelle invitation à votre organisme de formation.</p>
          </div>
        )}

        {message && <div className="training-portal-notice success"><Icon name="check" size={20} /><span>{message}</span></div>}
        {error && <div className="training-portal-notice error"><Icon name="alert" size={20} /><span>{error}</span></div>}
        <Link className="training-portal-back-link" to="/connexion">Retour à NCR Suite</Link>
      </section>
    </main>
  );
}
