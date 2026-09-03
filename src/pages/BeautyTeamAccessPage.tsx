import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import '../beautyTeamAccess.css';

type BeautyProfile = 'admin' | 'manager' | 'secretary' | 'collaborator' | 'viewer';
type ScopeMode = 'all' | 'selected';

type Company = {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  is_primary: boolean;
};

type Staff = {
  id: string;
  display_name: string;
  email: string | null;
  company_id: string | null;
  linked_user_id: string | null;
};

type TeamMember = {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  profile: BeautyProfile | 'owner';
  status: 'active' | 'disabled';
  company_scope_mode: ScopeMode;
  shared_reception_enabled: boolean;
  company_ids: string[];
  staff_id: string | null;
  staff_name: string | null;
  joined_at: string;
};

type TeamInvitation = {
  invitation_id: string;
  email: string;
  role: string;
  profile: BeautyProfile;
  staff_id: string | null;
  staff_name: string | null;
  status: 'pending' | 'expired';
  expires_at: string;
  created_at: string;
  company_scope_mode: ScopeMode;
  company_ids: string[];
  shared_reception_enabled: boolean;
};

type Overview = {
  member_limit: number;
  active_members: number;
  pending_invitations: number;
  companies: Company[];
  staff: Staff[];
  members: TeamMember[];
  invitations: TeamInvitation[];
};

const profileCopy: Record<BeautyProfile, { label: string; short: string; detail: string; icon: 'shield' | 'settings' | 'calendar' | 'users' | 'eye' }> = {
  admin: { label: 'Gérant', short: 'Tout gérer', detail: 'Accès complet à la configuration, aux équipes et aux activités.', icon: 'shield' },
  manager: { label: 'Responsable', short: 'Piloter une activité', detail: 'Gère les opérations des entreprises que vous lui autorisez.', icon: 'settings' },
  secretary: { label: 'Secrétaire', short: 'Rendez-vous & clients', detail: 'Prend et gère les rendez-vous des entreprises choisies, sans accès à l’administration.', icon: 'calendar' },
  collaborator: { label: 'Collaborateur', short: 'Son activité quotidienne', detail: 'Accède à son planning, ses rendez-vous et les informations utiles à son travail.', icon: 'users' },
  viewer: { label: 'Lecture seule', short: 'Consulter uniquement', detail: 'Peut consulter les informations autorisées sans les modifier.', icon: 'eye' }
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function BeautyTeamAccessPage() {
  const { organization } = useOrganization();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<BeautyProfile>('collaborator');
  const [staffId, setStaffId] = useState('');
  const [scopeMode, setScopeMode] = useState<ScopeMode>('all');
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [editingUserId, setEditingUserId] = useState('');
  const [editProfile, setEditProfile] = useState<BeautyProfile>('viewer');
  const [editScopeMode, setEditScopeMode] = useState<ScopeMode>('all');
  const [editCompanyIds, setEditCompanyIds] = useState<string[]>([]);

  const canAdminister = ['owner', 'admin'].includes(organization?.role ?? 'viewer');
  const canManageAdmins = organization?.role === 'owner';

  const load = useCallback(async () => {
    if (!organization || organization.business_type !== 'coiffure' || organization.plan !== 'metier' || !supabase) return;
    setLoading(true);
    setError('');
    const { data, error: requestError } = await supabase.rpc('metier_beauty_team_access_overview', { p_organization_id: organization.id });
    if (requestError) setError(requestError.message);
    else setOverview((data ?? null) as Overview | null);
    setLoading(false);
  }, [organization?.id, organization?.business_type, organization?.plan]);

  useEffect(() => { void load(); }, [load]);

  const companies = overview?.companies ?? [];
  const centerMode = companies.length > 1;
  const availableStaff = useMemo(() => (overview?.staff ?? []).filter((item) => !item.linked_user_id), [overview?.staff]);
  const secretaryCount = (overview?.members ?? []).filter((item) => item.status === 'active' && item.profile === 'secretary').length;

  useEffect(() => {
    if (!centerMode) {
      setScopeMode('all');
      setCompanyIds([]);
    }
  }, [centerMode]);

  function toggleCompany(id: string, editing = false) {
    if (editing) {
      setEditCompanyIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
    } else {
      setCompanyIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
    }
  }

  function chooseStaff(value: string) {
    setStaffId(value);
    const selected = availableStaff.find((item) => item.id === value);
    if (selected?.email) setEmail(selected.email);
  }

  async function invite(event: FormEvent) {
    event.preventDefault();
    if (!organization || !supabase || !canAdminister) return;
    if (profile === 'collaborator' && !staffId) {
      setError('Sélectionnez le collaborateur correspondant à cet accès.');
      return;
    }
    if (centerMode && ['manager', 'secretary', 'viewer'].includes(profile) && scopeMode === 'selected' && companyIds.length === 0) {
      setError('Sélectionnez au moins une entreprise.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    const { error: inviteError } = await supabase.rpc('metier_beauty_create_team_invitation', {
      p_organization_id: organization.id,
      p_email: email,
      p_profile: profile,
      p_staff_id: profile === 'collaborator' ? staffId : null,
      p_scope_mode: centerMode ? scopeMode : 'all',
      p_company_ids: centerMode && scopeMode === 'selected' ? companyIds : []
    });
    if (inviteError) {
      setError(inviteError.message);
    } else {
      setEmail('');
      setStaffId('');
      setProfile('collaborator');
      setScopeMode('all');
      setCompanyIds([]);
      setSuccess('Invitation envoyée. Les bons accès seront appliqués automatiquement dès son activation.');
      await load();
    }
    setSaving(false);
  }

  async function invitationAction(action: 'resend' | 'revoke', invitationId: string) {
    if (!organization || !supabase || !canAdminister) return;
    setBusyId(invitationId);
    setError('');
    setSuccess('');
    const rpc = action === 'resend' ? 'resend_team_invitation' : 'revoke_team_invitation';
    const { error: actionError } = await supabase.rpc(rpc, { p_organization_id: organization.id, p_invitation_id: invitationId });
    if (actionError) setError(actionError.message);
    else {
      setSuccess(action === 'resend' ? 'Invitation renvoyée.' : 'Invitation annulée.');
      await load();
    }
    setBusyId('');
  }

  function startEdit(member: TeamMember) {
    if (member.profile === 'owner') return;
    setEditingUserId(member.user_id);
    setEditProfile(member.profile);
    setEditScopeMode(member.company_scope_mode ?? 'all');
    setEditCompanyIds(Array.isArray(member.company_ids) ? member.company_ids : []);
    setError('');
  }

  async function saveMember(member: TeamMember) {
    if (!organization || !supabase || !canAdminister || member.profile === 'owner') return;
    if (centerMode && ['manager', 'secretary', 'viewer'].includes(editProfile) && editScopeMode === 'selected' && editCompanyIds.length === 0) {
      setError('Sélectionnez au moins une entreprise.');
      return;
    }
    setBusyId(member.user_id);
    setError('');
    const { error: updateError } = await supabase.rpc('metier_beauty_set_member_profile', {
      p_organization_id: organization.id,
      p_user_id: member.user_id,
      p_profile: editProfile,
      p_scope_mode: centerMode ? editScopeMode : 'all',
      p_company_ids: centerMode && editScopeMode === 'selected' ? editCompanyIds : []
    });
    if (updateError) setError(updateError.message);
    else {
      setSuccess('Accès mis à jour.');
      setEditingUserId('');
      await load();
    }
    setBusyId('');
  }

  async function toggleMember(member: TeamMember) {
    if (!organization || !supabase || !canAdminister || member.profile === 'owner') return;
    const nextStatus = member.status === 'active' ? 'disabled' : 'active';
    if (nextStatus === 'disabled' && !window.confirm(`Suspendre l’accès de ${member.full_name} ?`)) return;
    setBusyId(member.user_id);
    setError('');
    const { error: statusError } = await supabase.rpc('set_team_member_status', {
      p_organization_id: organization.id,
      p_user_id: member.user_id,
      p_status: nextStatus
    });
    if (statusError) setError(statusError.message);
    else {
      setSuccess(nextStatus === 'active' ? 'Accès réactivé.' : 'Accès suspendu.');
      await load();
    }
    setBusyId('');
  }

  if (!organization || organization.business_type !== 'coiffure' || organization.plan !== 'metier') return null;

  const selectableProfiles = (Object.keys(profileCopy) as BeautyProfile[]).filter((item) => item !== 'admin' || canManageAdmins);

  return (
    <div className="page beauty-team-page">
      <header className="beauty-team-hero">
        <div>
          <span className="beauty-team-badge"><Icon name="users" size={15} /> Coiffure & Beauté</span>
          <h1>Équipe & accès</h1>
          <p>{centerMode
            ? 'Invitez chaque personne avec le bon niveau d’accès et choisissez simplement les entreprises du centre qu’elle peut gérer.'
            : 'Invitez votre équipe sans vous soucier des permissions techniques : choisissez simplement ce que chacun doit pouvoir faire.'}</p>
        </div>
        <div className="beauty-team-summary">
          <span><small>Accès actifs</small><strong>{loading ? '…' : overview?.active_members ?? 0}</strong></span>
          <span><small>Invitations</small><strong>{loading ? '…' : overview?.pending_invitations ?? 0}</strong></span>
          {centerMode && <span><small>Secrétaires</small><strong>{loading ? '…' : secretaryCount}</strong></span>}
        </div>
      </header>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      {canAdminister && (
        <section className="beauty-access-panel beauty-invite-panel">
          <div className="beauty-access-heading">
            <div><p>NOUVEL ACCÈS</p><h2>Inviter une personne</h2><span>Choisissez son profil. NCR Suite configure les permissions pour vous.</span></div>
          </div>

          <form onSubmit={invite}>
            <div className="beauty-profile-grid">
              {selectableProfiles.map((item) => {
                const copy = profileCopy[item];
                return <button key={item} type="button" className={`beauty-profile-card${profile === item ? ' selected' : ''}`} onClick={() => { setProfile(item); setStaffId(''); }}>
                  <span className="beauty-profile-icon"><Icon name={copy.icon} size={19} /></span>
                  <span><strong>{copy.label}</strong><small>{copy.short}</small></span>
                  <i className="beauty-profile-check"><Icon name="check" size={12} /></i>
                  <em>{copy.detail}</em>
                </button>;
              })}
            </div>

            <div className="beauty-invite-fields">
              {profile === 'collaborator' && (
                <label>
                  Collaborateur associé
                  <select value={staffId} onChange={(event) => chooseStaff(event.target.value)} required>
                    <option value="">Sélectionner un collaborateur</option>
                    {availableStaff.map((item) => <option key={item.id} value={item.id}>{item.display_name}{item.email ? ` · ${item.email}` : ''}</option>)}
                  </select>
                  <small>Le collaborateur est automatiquement limité à l’entreprise à laquelle sa fiche est rattachée.</small>
                </label>
              )}

              <label>
                Adresse e-mail
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="prenom@entreprise.fr" required />
                <small>L’invitation reste valable pendant 7 jours.</small>
              </label>
            </div>

            {centerMode && ['manager', 'secretary', 'viewer'].includes(profile) && (
              <div className="beauty-company-scope">
                <div className="beauty-scope-head"><div><strong>Quelles entreprises peut-elle gérer ?</strong><small>{profile === 'secretary' ? 'Elle prendra les rendez-vous uniquement pour ce périmètre.' : 'Son accès restera limité à ce périmètre.'}</small></div></div>
                <div className="beauty-scope-toggle">
                  <button type="button" className={scopeMode === 'all' ? 'active' : ''} onClick={() => { setScopeMode('all'); setCompanyIds([]); }}>Toutes les entreprises</button>
                  <button type="button" className={scopeMode === 'selected' ? 'active' : ''} onClick={() => setScopeMode('selected')}>Certaines entreprises</button>
                </div>
                {scopeMode === 'selected' && <div className="beauty-company-chips">
                  {companies.map((company) => <button type="button" key={company.id} className={companyIds.includes(company.id) ? 'selected' : ''} onClick={() => toggleCompany(company.id)}>
                    <span style={{ background: company.primary_color }}>{company.logo_url ? <img src={company.logo_url} alt="" /> : company.name.slice(0, 1).toUpperCase()}</span>
                    <strong>{company.name}</strong><Icon name="check" size={13} />
                  </button>)}
                </div>}
              </div>
            )}

            {profile === 'secretary' && <div className="beauty-secretary-note"><span><Icon name="calendar" size={18} /></span><div><strong>Accueil partagé activé automatiquement</strong><small>Après acceptation, cette personne verra directement l’accueil partagé et pourra gérer les rendez-vous des entreprises autorisées, sans accéder aux réglages du centre.</small></div></div>}

            <div className="beauty-invite-submit"><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Envoi…' : 'Envoyer l’invitation'}</button></div>
          </form>
        </section>
      )}

      <section className="beauty-access-panel">
        <div className="beauty-access-heading"><div><p>VOTRE ÉQUIPE</p><h2>Qui peut accéder à votre espace ?</h2><span>{overview?.active_members ?? 0} accès actif(s) sur {overview?.member_limit ?? '—'} disponibles.</span></div></div>
        {loading ? <div className="beauty-access-loading" /> : (
          <div className="beauty-member-list">
            {(overview?.members ?? []).map((member) => {
              const isOwner = member.profile === 'owner';
              const displayProfile = isOwner ? 'Propriétaire' : profileCopy[member.profile]?.label ?? 'Accès';
              const selectedCompanyNames = member.company_scope_mode === 'all'
                ? 'Toutes les entreprises'
                : companies.filter((company) => member.company_ids?.includes(company.id)).map((company) => company.name).join(' · ') || 'Périmètre spécifique';
              const editing = editingUserId === member.user_id;
              return <article className={`beauty-member-card${member.status === 'disabled' ? ' disabled' : ''}`} key={member.user_id}>
                <div className="beauty-member-main">
                  <span className="beauty-member-avatar">{member.full_name.slice(0, 1).toUpperCase()}</span>
                  <div><strong>{member.full_name}</strong><small>{member.email}</small><div className="beauty-member-tags"><span>{displayProfile}</span>{centerMode && !isOwner && <span>{selectedCompanyNames}</span>}{member.profile === 'secretary' && <span className="reception">Accueil partagé</span>}{member.status === 'disabled' && <span className="suspended">Suspendu</span>}</div></div>
                </div>
                {!isOwner && canAdminister && <div className="beauty-member-actions"><button type="button" className="secondary-button compact-button" onClick={() => editing ? setEditingUserId('') : startEdit(member)}>{editing ? 'Fermer' : 'Gérer l’accès'}</button><button type="button" className="secondary-button compact-button" disabled={busyId === member.user_id} onClick={() => void toggleMember(member)}>{member.status === 'active' ? 'Suspendre' : 'Réactiver'}</button></div>}
                {editing && <div className="beauty-member-editor">
                  <label>Profil<select value={editProfile} onChange={(event) => setEditProfile(event.target.value as BeautyProfile)}>{selectableProfiles.filter((item) => item !== 'collaborator' || Boolean(member.staff_id)).map((item) => <option value={item} key={item}>{profileCopy[item].label}</option>)}</select></label>
                  {centerMode && ['manager', 'secretary', 'viewer'].includes(editProfile) && <div className="beauty-edit-scope"><div className="beauty-scope-toggle"><button type="button" className={editScopeMode === 'all' ? 'active' : ''} onClick={() => { setEditScopeMode('all'); setEditCompanyIds([]); }}>Toutes</button><button type="button" className={editScopeMode === 'selected' ? 'active' : ''} onClick={() => setEditScopeMode('selected')}>Certaines</button></div>{editScopeMode === 'selected' && <div className="beauty-company-chips compact">{companies.map((company) => <button type="button" key={company.id} className={editCompanyIds.includes(company.id) ? 'selected' : ''} onClick={() => toggleCompany(company.id, true)}><span style={{ background: company.primary_color }}>{company.name.slice(0, 1).toUpperCase()}</span><strong>{company.name}</strong><Icon name="check" size={12} /></button>)}</div>}</div>}
                  <button type="button" className="primary-button compact-button" disabled={busyId === member.user_id} onClick={() => void saveMember(member)}>Enregistrer</button>
                </div>}
              </article>;
            })}
          </div>
        )}
      </section>

      {(overview?.invitations.length ?? 0) > 0 && <section className="beauty-access-panel">
        <div className="beauty-access-heading"><div><p>INVITATIONS</p><h2>En attente d’activation</h2></div></div>
        <div className="beauty-invitation-list">
          {(overview?.invitations ?? []).map((invitation) => {
            const copy = profileCopy[invitation.profile] ?? profileCopy.viewer;
            const names = invitation.company_scope_mode === 'all' ? 'Toutes les entreprises' : companies.filter((company) => invitation.company_ids?.includes(company.id)).map((company) => company.name).join(' · ');
            return <article key={invitation.invitation_id}><span className="beauty-invite-avatar"><Icon name={copy.icon} size={17} /></span><div><strong>{invitation.email}</strong><small>{copy.label}{centerMode ? ` · ${names || 'Périmètre spécifique'}` : ''} · expire le {formatDate(invitation.expires_at)}</small></div><span className={`beauty-invite-status ${invitation.status}`}>{invitation.status === 'pending' ? 'En attente' : 'Expirée'}</span>{canAdminister && <div className="beauty-invite-actions"><button type="button" onClick={() => void invitationAction('resend', invitation.invitation_id)} disabled={busyId === invitation.invitation_id}>Renvoyer</button><button type="button" onClick={() => void invitationAction('revoke', invitation.invitation_id)} disabled={busyId === invitation.invitation_id}>Annuler</button></div>}</article>;
          })}
        </div>
      </section>}
    </div>
  );
}
