import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { getPlanDefinition, organizationHasFeature } from '../config/planEntitlements';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import type { MemberRole, Plan } from '../types';

type AccessRole = 'admin' | 'manager' | 'employee' | 'viewer';
type MemberStatus = 'active' | 'disabled';

interface PlanSummary {
  plan: Plan;
  member_limit: number;
  active_members: number;
  pending_invitations: number;
  available_seats: number;
  invitations_enabled: boolean;
  manager_role_enabled: boolean;
}

interface TeamMember {
  user_id: string;
  email: string;
  full_name: string;
  role: MemberRole;
  status: MemberStatus;
  staff_id: string | null;
  staff_name: string | null;
  joined_at: string;
}

interface TeamInvitation {
  invitation_id: string;
  email: string;
  role: AccessRole;
  staff_id: string | null;
  staff_name: string | null;
  status: 'pending' | 'expired';
  expires_at: string;
  created_at: string;
}

interface StaffOption {
  id: string;
  display_name: string;
  email: string | null;
  linked_user_id: string | null;
  active: boolean;
}

const planLabels: Record<Plan, string> = {
  decouverte: 'Découverte',
  essentielle: 'Essentielle',
  professionnelle: 'Professionnelle',
  metier: 'Métier'
};

const roleLabels: Record<MemberRole, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  manager: 'Responsable',
  employee: 'Collaborateur',
  viewer: 'Consultation'
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function TeamAccessPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const [summary, setSummary] = useState<PlanSummary | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AccessRole>('employee');
  const [staffId, setStaffId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canAdminister = ['owner', 'admin'].includes(organization?.role ?? 'viewer');
  const canView = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const isTraining = organization?.business_type === 'formation';
  const isSecurity = organization?.business_type === 'securite';
  const hasTeamAccess = Boolean(organization && organizationHasFeature(organization, 'team_access'));
  const hasManagerRole = Boolean(organization && organizationHasFeature(organization, 'manager_role'));

  const load = useCallback(async () => {
    if (!organization) return;
    setLoading(true);
    setError('');

    if (demoMode || !supabase) {
      const planDefinition = getPlanDefinition(organization.business_type, organization.plan);
      setSummary({
        plan: organization.plan,
        member_limit: planDefinition.memberLimit,
        active_members: isSecurity ? 0 : 1,
        pending_invitations: 0,
        available_seats: hasTeamAccess ? Math.max(0, planDefinition.memberLimit - (isSecurity ? 0 : 1)) : 0,
        invitations_enabled: hasTeamAccess,
        manager_role_enabled: hasManagerRole
      });
      setMembers([{ user_id: user?.id ?? 'demo', email: user?.email ?? 'demo@ncr-suite.local', full_name: 'Compte de démonstration', role: 'owner', status: 'active', staff_id: null, staff_name: null, joined_at: new Date().toISOString() }]);
      setInvitations([]);
      setStaff([]);
      setLoading(false);
      return;
    }

    try {
      const summaryRpc = isTraining ? 'training_team_plan_summary' : isSecurity ? 'security_team_plan_summary' : 'team_plan_summary';
      const summaryResult = await supabase.rpc(summaryRpc, { p_organization_id: organization.id });
      if (summaryResult.error) throw summaryResult.error;
      setSummary((summaryResult.data?.[0] ?? null) as PlanSummary | null);

      if (canView) {
        const [membersResult, invitationsResult, staffResult] = await Promise.all([
          supabase.rpc(isSecurity ? 'list_security_team_members' : 'list_team_members', { p_organization_id: organization.id }),
          supabase.rpc(isSecurity ? 'list_security_team_invitations' : 'list_team_invitations', { p_organization_id: organization.id }),
          isTraining
            ? Promise.resolve({ data: [], error: null })
            : isSecurity
              ? supabase.from('security_agents').select('id,first_name,last_name,email,linked_user_id,status').eq('organization_id', organization.id).eq('status', 'active').order('last_name')
              : supabase.from('staff').select('id,display_name,email,linked_user_id,active').eq('organization_id', organization.id).eq('active', true).order('display_name')
        ]);
        const firstError = membersResult.error || invitationsResult.error || staffResult.error;
        if (firstError) throw firstError;
        setMembers((membersResult.data ?? []) as TeamMember[]);
        setInvitations((invitationsResult.data ?? []) as TeamInvitation[]);
        setStaff(isSecurity
          ? ((staffResult.data ?? []) as Array<{ id: string; first_name: string; last_name: string; email: string | null; linked_user_id: string | null; status: string }>).map((item) => ({ id: item.id, display_name: `${item.first_name} ${item.last_name}`.trim(), email: item.email, linked_user_id: item.linked_user_id, active: item.status === 'active' }))
          : (staffResult.data ?? []) as StaffOption[]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de charger les accès de l’équipe.');
    } finally {
      setLoading(false);
    }
  }, [organization, demoMode, user, canView, isTraining, isSecurity, hasTeamAccess, hasManagerRole]);

  useEffect(() => { load(); }, [load]);

  const roleOptions = useMemo(() => {
    if (isSecurity) {
      const options: Array<{ value: AccessRole; label: string }> = [{ value: 'employee', label: 'Agent' }];
      if (summary?.manager_role_enabled) options.push({ value: 'manager' as AccessRole, label: 'Chef de poste' });
      return options;
    }
    if (!summary) return [{ value: 'employee' as AccessRole, label: 'Collaborateur' }];
    if (isTraining && summary.invitations_enabled) {
      const options = [
        { value: 'employee' as AccessRole, label: 'Collaborateur' },
        { value: 'viewer' as AccessRole, label: 'Consultation' }
      ];
      if (summary.manager_role_enabled) options.splice(1, 0, { value: 'manager' as AccessRole, label: 'Responsable' });
      if (summary.plan === 'metier') options.splice(1, 0, { value: 'admin' as AccessRole, label: 'Administrateur' });
      return options;
    }
    if (summary.plan === 'essentielle') return [{ value: 'employee' as AccessRole, label: 'Collaborateur' }];
    if (summary.plan === 'professionnelle') return [
      { value: 'employee' as AccessRole, label: 'Collaborateur' },
      { value: 'manager' as AccessRole, label: 'Responsable' }
    ];
    return [
      { value: 'employee' as AccessRole, label: 'Collaborateur' },
      { value: 'manager' as AccessRole, label: 'Responsable' },
      { value: 'admin' as AccessRole, label: 'Administrateur' },
      { value: 'viewer' as AccessRole, label: 'Consultation' }
    ];
  }, [summary, isTraining, isSecurity]);

  const availableStaff = useMemo(() => {
    const pendingStaff = new Set(invitations.filter((item) => item.status === 'pending').map((item) => item.staff_id));
    return staff.filter((item) => !item.linked_user_id && !pendingStaff.has(item.id));
  }, [staff, invitations]);

  useEffect(() => {
    if (!roleOptions.some((option) => option.value === role)) setRole(roleOptions[0].value);
  }, [roleOptions, role]);

  function selectStaff(value: string) {
    setStaffId(value);
    const selected = availableStaff.find((item) => item.id === value);
    if (selected?.email) setEmail(selected.email);
  }

  async function invite(event: FormEvent) {
    event.preventDefault();
    if (!organization || !supabase || !canAdminister) return;
    if (!isTraining && (isSecurity || role === 'employee') && !staffId) {
      setError(isSecurity ? 'Sélectionne l’agent qui recevra cet accès.' : 'Sélectionne le collaborateur qui recevra cet accès.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const invitationRpc = isTraining ? 'create_training_team_invitation' : isSecurity ? 'create_security_team_invitation' : 'create_team_invitation';
      const invitationPayload = isSecurity
        ? { p_organization_id: organization.id, p_email: email, p_security_agent_id: staffId, p_role: role }
        : { p_organization_id: organization.id, p_email: email, p_role: role, p_staff_id: staffId || null };
      const { error: inviteError } = await supabase.rpc(invitationRpc, invitationPayload);
      if (inviteError) throw inviteError;
      setEmail('');
      setStaffId('');
      setRole('employee');
      setSuccess('Invitation envoyée. Elle reste valable pendant 7 jours.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invitation impossible.');
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action: 'resend' | 'revoke', invitationId: string) {
    if (!organization || !supabase || !canAdminister) return;
    setBusyId(invitationId);
    setError('');
    setSuccess('');
    try {
      const rpc = action === 'resend' ? 'resend_team_invitation' : 'revoke_team_invitation';
      const { error: actionError } = await supabase.rpc(rpc, { p_organization_id: organization.id, p_invitation_id: invitationId });
      if (actionError) throw actionError;
      setSuccess(action === 'resend' ? 'L’invitation a été renvoyée.' : 'L’invitation a été révoquée.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Action impossible.');
    } finally {
      setBusyId('');
    }
  }

  async function changeMemberRole(member: TeamMember, nextRole: AccessRole) {
    if (!organization || !supabase || !canAdminister) return;
    setBusyId(member.user_id);
    setError('');
    try {
      const roleRpc = isSecurity ? 'set_security_team_member_role' : isTraining ? 'update_training_team_member_role' : 'update_team_member_role';
      const { error: roleError } = await supabase.rpc(roleRpc, {
        p_organization_id: organization.id,
        p_user_id: member.user_id,
        p_role: nextRole
      });
      if (roleError) throw roleError;
      setSuccess('Le rôle a été mis à jour.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Modification impossible.');
    } finally {
      setBusyId('');
    }
  }

  async function toggleMember(member: TeamMember) {
    if (!organization || !supabase || !canAdminister) return;
    const nextStatus: MemberStatus = member.status === 'active' ? 'disabled' : 'active';
    if (nextStatus === 'disabled' && !window.confirm(`Suspendre l’accès de ${member.full_name} ?`)) return;
    setBusyId(member.user_id);
    setError('');
    try {
      const { error: statusError } = await supabase.rpc(isSecurity ? 'set_security_team_member_status' : 'set_team_member_status', {
        p_organization_id: organization.id,
        p_user_id: member.user_id,
        p_status: nextStatus
      });
      if (statusError) throw statusError;
      setSuccess(nextStatus === 'active' ? 'L’accès a été réactivé.' : 'L’accès a été suspendu.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Modification impossible.');
    } finally {
      setBusyId('');
    }
  }

  if (!organization) return null;

  return (
    <div className="page team-access-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">COMPTES & PERMISSIONS</p>
          <h1>{isSecurity ? 'Accès agents' : 'Accès équipe'}</h1>
          <p>{isSecurity ? `Reliez jusqu’à ${summary?.member_limit ?? (organization.plan === 'professionnelle' ? 50 : 10)} agents à leur espace terrain personnel et attribuez le rôle Chef de poste avec l’offre Professionnelle.` : 'Invitez chaque personne avec son propre compte, sans partager le mot de passe du propriétaire.'}</p>
        </div>
      </header>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message" role="status">{success}</div>}

      {loading ? <div className="panel list-state">Chargement des accès…</div> : summary && (
        <>
          <section className="team-plan-grid">
            <article className="panel team-plan-card">
              <span>Formule actuelle</span><strong>{planLabels[summary.plan]}</strong><small>{summary.invitations_enabled ? 'Comptes d’équipe disponibles' : 'Compte propriétaire uniquement'}</small>
            </article>
            <article className="panel team-plan-card">
              <span>{isSecurity ? 'Agents connectés' : 'Utilisateurs actifs'}</span><strong>{summary.active_members} / {summary.member_limit}</strong><small>{summary.available_seats} place{summary.available_seats > 1 ? 's' : ''} disponible{summary.available_seats > 1 ? 's' : ''}</small>
            </article>
            <article className="panel team-plan-card">
              <span>Invitations en attente</span><strong>{summary.pending_invitations}</strong><small>décomptées de la limite</small>
            </article>
          </section>

          {!summary.invitations_enabled ? (
            <section className="panel upgrade-panel">
              <div className="upgrade-icon"><Icon name="users" size={30} /></div>
              <div>
                <p className="eyebrow">{isTraining ? 'OFFRE PROFESSIONNELLE' : 'OFFRE ESSENTIELLE'}</p>
                <h2>Donnez un accès personnel à vos collaborateurs</h2>
                <p>{isTraining ? 'L’offre Professionnelle permet de créer des accès employés distincts et de choisir leur rôle dans l’espace Formation.' : isSecurity ? 'La formule Découverte reste réservée au gestionnaire. L’offre Essentielle permet de connecter jusqu’à 10 agents à leur planning, aux rondes, aux consignes et à la main courante.' : 'La formule Découverte reste limitée au compte propriétaire. À partir de l’offre Essentielle, vous pouvez inviter jusqu’à 2 collaborateurs supplémentaires, chacun avec son propre planning.'}</p>
              </div>
              <span className="plan-lock-badge">{isTraining ? 'Professionnelle' : isSecurity ? 'Essentielle · 69,90 € HT / mois' : 'Disponible à partir de 19,90 € HT / mois'}</span>
            </section>
          ) : !canView ? (
            <section className="panel upgrade-panel"><div><h2>Accès limité</h2><p>Votre compte ne permet pas de consulter ou modifier les accès de l’équipe.</p></div></section>
          ) : (
            <>
              {canAdminister && (
                <section className="panel team-invite-panel">
                  <div className="panel-header">
                    <div><p className="eyebrow">NOUVEL ACCÈS</p><h2>Inviter une personne</h2><p className="muted">L’invitation est envoyée automatiquement par e-mail.</p></div>
                  </div>
                  <form className="team-invite-form" onSubmit={invite}>
                    <label>
                      Rôle
                      <select value={role} onChange={(event) => setRole(event.target.value as AccessRole)}>
                        {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    {!isTraining && <label>
                      {isSecurity ? 'Agent' : 'Profil collaborateur'} {(isSecurity || role === 'employee') && <span aria-hidden="true">*</span>}
                      <select value={staffId} onChange={(event) => selectStaff(event.target.value)} required={isSecurity || role === 'employee'}>
                        <option value="">{isSecurity ? 'Sélectionner un agent' : role === 'employee' ? 'Sélectionner un collaborateur' : 'Aucun profil associé'}</option>
                        {availableStaff.map((item) => <option key={item.id} value={item.id}>{item.display_name}{item.email ? ` · ${item.email}` : ''}</option>)}
                      </select>
                      <small>{isSecurity ? 'Les fiches agents se créent d’abord dans le menu Agents.' : 'Les profils se créent d’abord dans le menu Collaborateurs.'}</small>
                    </label>}
                    <label>
                      Adresse e-mail <span aria-hidden="true">*</span>
                      <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="collaborateur@entreprise.fr" />
                    </label>
                    <button className="primary-button" disabled={saving || summary.available_seats <= 0}>{saving ? 'Envoi…' : 'Envoyer l’invitation'}</button>
                  </form>
                  {summary.available_seats <= 0 && <div className="info-message">La limite de votre formule est atteinte. Une invitation en attente occupe déjà une place.</div>}
                </section>
              )}

              <section className="panel team-list-panel">
                <div className="panel-header"><div><p className="eyebrow">UTILISATEURS</p><h2>Comptes actifs et suspendus</h2></div></div>
                <div className="team-member-list">
                  {members.map((member) => (
                    <article key={member.user_id} className={`team-member-row${member.status === 'disabled' ? ' disabled' : ''}`}>
                      <div className="team-avatar">{member.full_name.slice(0, 1).toUpperCase()}</div>
                      <div className="team-member-identity"><strong>{member.full_name}</strong><span>{member.email}</span><small>{isTraining ? roleLabels[member.role] : isSecurity ? (member.staff_name ? `${member.role === 'manager' ? 'Chef de poste' : 'Agent'} : ${member.staff_name}` : roleLabels[member.role]) : member.staff_name ? `Profil : ${member.staff_name}` : 'Aucun profil collaborateur associé'}</small></div>
                      <span className={`status-chip ${member.status === 'active' ? 'active' : 'inactive'}`}>{member.status === 'active' ? 'Actif' : 'Suspendu'}</span>
                      <div className="team-member-actions">
                        {member.role === 'owner' ? <strong>Propriétaire</strong> : canAdminister ? (
                          <>
                            {isSecurity ? <select value={member.role} disabled={busyId === member.user_id} onChange={(event) => changeMemberRole(member, event.target.value as AccessRole)} aria-label={`Rôle de ${member.full_name}`}>{roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <select value={member.role} disabled={busyId === member.user_id} onChange={(event) => changeMemberRole(member, event.target.value as AccessRole)} aria-label={`Rôle de ${member.full_name}`}>
                              {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>}
                            <button type="button" className="secondary-button compact-button" disabled={busyId === member.user_id} onClick={() => toggleMember(member)}>{member.status === 'active' ? 'Suspendre' : 'Réactiver'}</button>
                          </>
                        ) : <strong>{roleLabels[member.role]}</strong>}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              {invitations.length > 0 && (
                <section className="panel team-list-panel">
                  <div className="panel-header"><div><p className="eyebrow">INVITATIONS</p><h2>En attente d’acceptation</h2></div></div>
                  <div className="team-member-list">
                    {invitations.map((invitation) => (
                      <article key={invitation.invitation_id} className="team-member-row invitation-row">
                        <div className="team-avatar pending"><Icon name="users" size={20} /></div>
                        <div className="team-member-identity"><strong>{invitation.email}</strong><span>{isSecurity ? (invitation.role === 'manager' ? 'Chef de poste' : 'Agent') : roleLabels[invitation.role]}</span><small>{invitation.staff_name ? `${isSecurity ? 'Agent' : 'Profil'} : ${invitation.staff_name}` : `Expire le ${formatDate(invitation.expires_at)}`}</small></div>
                        <span className={`status-chip ${invitation.status === 'pending' ? 'pending' : 'inactive'}`}>{invitation.status === 'pending' ? 'Envoyée' : 'Expirée'}</span>
                        {canAdminister && <div className="team-member-actions"><button type="button" className="secondary-button compact-button" disabled={busyId === invitation.invitation_id} onClick={() => runAction('resend', invitation.invitation_id)}>Renvoyer</button><button type="button" className="danger-text-button" disabled={busyId === invitation.invitation_id} onClick={() => runAction('revoke', invitation.invitation_id)}>Révoquer</button></div>}
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
