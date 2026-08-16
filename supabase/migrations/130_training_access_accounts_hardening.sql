-- NCR Suite V2.29.16 — Formation · droits & comptes durcis
-- À exécuter après 129_security_qg_operational_notifications.sql.
-- Objectifs :
-- 1) revalider les rôles Formation au niveau DB lors de toute modification de membership ;
-- 2) garantir la cohérence des rôles personnalisés Métier ;
-- 3) faire respecter les modules personnalisés sur les données Formation cœur ;
-- 4) tracer les changements de rôle Formation ;
-- 5) réparer les profils utilisateurs historiques manquants.

begin;

-- -----------------------------------------------------------------------------
-- Profils : un ancien compte Auth sans user_profiles ne doit jamais casser l’UI.
-- -----------------------------------------------------------------------------
insert into public.user_profiles(id, full_name)
select u.id, nullif(trim(coalesce(u.raw_user_meta_data->>'full_name','')), '')
from auth.users u
left join public.user_profiles p on p.id=u.id
where p.id is null
on conflict(id) do nothing;

-- -----------------------------------------------------------------------------
-- Accès module Formation tenant compte d’un rôle personnalisé Métier.
-- Owner/Admin ne peuvent pas recevoir de custom_role_id et conservent leur accès système.
-- Un membre standard sans rôle personnalisé garde son comportement historique.
-- -----------------------------------------------------------------------------
create or replace function public.training_member_has_module_access(
  p_organization_id uuid,
  p_module_key text,
  p_roles text[] default array['owner','admin','manager','employee','viewer']::text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    left join public.organization_custom_roles cr
      on cr.id=m.custom_role_id
     and cr.organization_id=m.organization_id
     and cr.active=true
    join public.organizations o on o.id=m.organization_id
    where m.organization_id=p_organization_id
      and m.user_id=auth.uid()
      and m.status='active'
      and m.role=any(p_roles)
      and o.business_type='formation'
      and (
        m.role in ('owner','admin')
        or m.custom_role_id is null
        or (cr.id is not null and p_module_key=any(cr.module_keys))
      )
  );
$$;

revoke all on function public.training_member_has_module_access(uuid,text,text[]) from public, anon;
grant execute on function public.training_member_has_module_access(uuid,text,text[]) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Cohérence membership Formation : bloque les élévations incohérentes et les
-- invitations anciennes dont le rôle n’est plus autorisé par l’offre courante.
-- -----------------------------------------------------------------------------
create or replace function public.enforce_training_membership_integrity()
returns trigger
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_business_type text;
  v_plan text;
  v_custom_base_role text;
  v_caller_role text;
  v_user_email text;
  v_limit integer;
  v_active integer;
begin
  select business_type,plan into v_business_type,v_plan
  from public.organizations where id=new.organization_id;

  if v_business_type is distinct from 'formation' then return new; end if;

  if new.role not in ('owner','admin','manager','employee','viewer') then
    raise exception 'Rôle Formation invalide.';
  end if;

  if new.role<>'owner' and new.status='active' then
    if not public.organization_has_plan_feature(new.organization_id,'team_access') then
      raise exception 'Les comptes d’équipe Formation nécessitent l’accès équipe.';
    end if;
    if v_plan='professionnelle' and new.role not in ('manager','employee','viewer') then
      raise exception 'Le rôle Administrateur nécessite l’offre Métier.';
    elsif v_plan='metier' and new.role not in ('admin','manager','employee','viewer') then
      raise exception 'Rôle Formation invalide pour l’offre Métier.';
    elsif v_plan not in ('professionnelle','metier') then
      raise exception 'Cet accès équipe n’est plus compatible avec l’offre Formation actuelle.';
    end if;
  end if;

  if tg_op='UPDATE' then
    select role into v_caller_role
    from public.organization_members
    where organization_id=new.organization_id and user_id=auth.uid() and status='active';

    if old.role='owner' and new.role<>'owner' then raise exception 'Le propriétaire ne peut pas être rétrogradé.'; end if;
    if old.role='owner' and new.status<>'active' then raise exception 'Le propriétaire ne peut pas être suspendu.'; end if;

    if new.user_id=auth.uid() and (
      old.role is distinct from new.role or old.status is distinct from new.status or old.custom_role_id is distinct from new.custom_role_id
    ) then
      raise exception 'Vous ne pouvez pas modifier votre propre rôle ou suspendre votre propre accès.';
    end if;

    if (old.role='admin' or new.role='admin') and old.role is distinct from new.role and v_caller_role<>'owner' then
      raise exception 'Seul le propriétaire peut attribuer ou retirer le rôle Administrateur.';
    end if;
    if old.role='admin' and old.status is distinct from new.status and v_caller_role<>'owner' then
      raise exception 'Seul le propriétaire peut suspendre ou réactiver un administrateur.';
    end if;
  end if;

  -- Une invitation Admin ne peut provenir que du propriétaire actif.
  if tg_op='INSERT' and new.role='admin' then
    select lower(u.email::text) into v_user_email from auth.users u where u.id=new.user_id;
    if not exists (
      select 1
      from public.organization_invitations i
      join public.organization_members inviter
        on inviter.organization_id=i.organization_id and inviter.user_id=i.invited_by
      where i.organization_id=new.organization_id
        and lower(i.email)=v_user_email
        and i.role='admin' and i.status='pending' and i.expires_at>now()
        and inviter.role='owner' and inviter.status='active'
    ) then
      raise exception 'Un accès Administrateur doit être accordé par le propriétaire.';
    end if;
  end if;

  if new.custom_role_id is not null then
    if new.role in ('owner','admin') then
      raise exception 'Un rôle système Propriétaire/Administrateur ne peut pas recevoir de rôle personnalisé.';
    end if;
    select base_role into v_custom_base_role
    from public.organization_custom_roles
    where id=new.custom_role_id and organization_id=new.organization_id and active=true;
    if v_custom_base_role is null then raise exception 'Rôle personnalisé introuvable ou inactif.'; end if;
    if v_custom_base_role is distinct from new.role then raise exception 'Le niveau système ne correspond pas au rôle personnalisé.'; end if;
  end if;

  -- Limite de comptes également contrôlée au niveau membership, quel que soit le RPC appelé.
  if new.status='active' then
    if tg_op='INSERT' then
      v_limit:=public.domain_plan_member_limit('formation',v_plan);
      select count(*)::integer into v_active
      from public.organization_members m
      where m.organization_id=new.organization_id and m.status='active' and m.user_id<>new.user_id;
      if v_active>=v_limit then raise exception 'La limite de % utilisateur(s) Formation est atteinte.',v_limit; end if;
    elsif tg_op='UPDATE' and old.status is distinct from 'active' then
      v_limit:=public.domain_plan_member_limit('formation',v_plan);
      select count(*)::integer into v_active
      from public.organization_members m
      where m.organization_id=new.organization_id and m.status='active' and m.user_id<>new.user_id;
      if v_active>=v_limit then raise exception 'La limite de % utilisateur(s) Formation est atteinte.',v_limit; end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_training_membership_integrity on public.organization_members;
create trigger enforce_training_membership_integrity
before insert or update of role,status,custom_role_id,organization_id
on public.organization_members
for each row execute procedure public.enforce_training_membership_integrity();

-- -----------------------------------------------------------------------------
-- Le changement de rôle Formation devient atomique : le rôle personnalisé est
-- supprimé lorsqu’on choisit explicitement un rôle système, et l’action est auditée.
-- -----------------------------------------------------------------------------
create or replace function public.update_training_team_member_role(
  p_organization_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_current_role text;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin']) then
    raise exception 'Droits insuffisants.';
  end if;
  if not public.organization_has_plan_feature(p_organization_id,'team_access') then
    raise exception 'Les accès employés sont disponibles avec l’offre Professionnelle.';
  end if;

  select o.plan into v_plan
  from public.organizations o
  where o.id=p_organization_id and o.business_type='formation';
  if v_plan is null then raise exception 'Espace Formation introuvable.'; end if;

  select role into v_current_role
  from public.organization_members
  where organization_id=p_organization_id and user_id=p_user_id;
  if v_current_role is null then raise exception 'Utilisateur introuvable.'; end if;
  if v_current_role='owner' then raise exception 'Le rôle du propriétaire ne peut pas être modifié.'; end if;

  if v_plan='professionnelle' and p_role not in ('manager','employee','viewer') then
    raise exception 'Ce rôle nécessite l’offre Métier.';
  end if;
  if v_plan='metier' and p_role not in ('admin','manager','employee','viewer') then
    raise exception 'Rôle invalide.';
  end if;

  update public.organization_members
  set role=p_role,
      custom_role_id=null
  where organization_id=p_organization_id and user_id=p_user_id;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (
    p_organization_id,auth.uid(),'training.team_role_updated','organization_member',p_user_id::text,
    jsonb_build_object('previous_role',v_current_role,'new_role',p_role,'custom_role_cleared',true)
  );
end;
$$;

revoke all on function public.update_training_team_member_role(uuid,uuid,text) from public, anon;
grant execute on function public.update_training_team_member_role(uuid,uuid,text) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS Formation cœur : les rôles personnalisés Métier ne peuvent plus contourner
-- leur liste de modules en appelant Supabase directement depuis DevTools/API.
-- Les rôles système standards gardent leur comportement historique.
-- -----------------------------------------------------------------------------

drop policy if exists training_programs_select on public.training_programs;
create policy training_programs_select on public.training_programs for select to authenticated
using (public.training_member_has_module_access(organization_id,'training_programs'));
drop policy if exists training_programs_insert on public.training_programs;
create policy training_programs_insert on public.training_programs for insert to authenticated
with check (public.training_member_has_module_access(organization_id,'training_programs',array['owner','admin','manager']));
drop policy if exists training_programs_update on public.training_programs;
create policy training_programs_update on public.training_programs for update to authenticated
using (public.training_member_has_module_access(organization_id,'training_programs',array['owner','admin','manager']))
with check (public.training_member_has_module_access(organization_id,'training_programs',array['owner','admin','manager']));
drop policy if exists training_programs_delete on public.training_programs;
create policy training_programs_delete on public.training_programs for delete to authenticated
using (public.training_member_has_module_access(organization_id,'training_programs',array['owner','admin','manager']));

drop policy if exists training_trainees_select on public.training_trainees;
create policy training_trainees_select on public.training_trainees for select to authenticated
using (public.training_member_has_module_access(organization_id,'trainees'));
drop policy if exists training_trainees_insert on public.training_trainees;
create policy training_trainees_insert on public.training_trainees for insert to authenticated
with check (public.training_member_has_module_access(organization_id,'trainees',array['owner','admin','manager']));
drop policy if exists training_trainees_update on public.training_trainees;
create policy training_trainees_update on public.training_trainees for update to authenticated
using (public.training_member_has_module_access(organization_id,'trainees',array['owner','admin','manager']))
with check (public.training_member_has_module_access(organization_id,'trainees',array['owner','admin','manager']));
drop policy if exists training_trainees_delete on public.training_trainees;
create policy training_trainees_delete on public.training_trainees for delete to authenticated
using (public.training_member_has_module_access(organization_id,'trainees',array['owner','admin','manager']));

drop policy if exists training_trainers_select on public.training_trainers;
create policy training_trainers_select on public.training_trainers for select to authenticated
using (public.training_member_has_module_access(organization_id,'trainers'));
drop policy if exists training_trainers_insert on public.training_trainers;
create policy training_trainers_insert on public.training_trainers for insert to authenticated
with check (public.training_member_has_module_access(organization_id,'trainers',array['owner','admin','manager']));
drop policy if exists training_trainers_update on public.training_trainers;
create policy training_trainers_update on public.training_trainers for update to authenticated
using (public.training_member_has_module_access(organization_id,'trainers',array['owner','admin','manager']))
with check (public.training_member_has_module_access(organization_id,'trainers',array['owner','admin','manager']));
drop policy if exists training_trainers_delete on public.training_trainers;
create policy training_trainers_delete on public.training_trainers for delete to authenticated
using (public.training_member_has_module_access(organization_id,'trainers',array['owner','admin','manager']));

drop policy if exists training_sessions_select on public.training_sessions;
create policy training_sessions_select on public.training_sessions for select to authenticated
using (public.training_member_has_module_access(organization_id,'sessions'));
drop policy if exists training_sessions_insert on public.training_sessions;
create policy training_sessions_insert on public.training_sessions for insert to authenticated
with check (public.training_member_has_module_access(organization_id,'sessions',array['owner','admin','manager']));
drop policy if exists training_sessions_update on public.training_sessions;
create policy training_sessions_update on public.training_sessions for update to authenticated
using (public.training_member_has_module_access(organization_id,'sessions',array['owner','admin','manager']))
with check (public.training_member_has_module_access(organization_id,'sessions',array['owner','admin','manager']));
drop policy if exists training_sessions_delete on public.training_sessions;
create policy training_sessions_delete on public.training_sessions for delete to authenticated
using (public.training_member_has_module_access(organization_id,'sessions',array['owner','admin','manager']));

drop policy if exists training_enrollments_select on public.training_session_enrollments;
create policy training_enrollments_select on public.training_session_enrollments for select to authenticated
using (public.training_member_has_module_access(organization_id,'sessions'));
drop policy if exists training_enrollments_insert on public.training_session_enrollments;
create policy training_enrollments_insert on public.training_session_enrollments for insert to authenticated
with check (public.training_member_has_module_access(organization_id,'sessions',array['owner','admin','manager']));
drop policy if exists training_enrollments_update on public.training_session_enrollments;
create policy training_enrollments_update on public.training_session_enrollments for update to authenticated
using (public.training_member_has_module_access(organization_id,'sessions',array['owner','admin','manager']))
with check (public.training_member_has_module_access(organization_id,'sessions',array['owner','admin','manager']));
drop policy if exists training_enrollments_delete on public.training_session_enrollments;
create policy training_enrollments_delete on public.training_session_enrollments for delete to authenticated
using (public.training_member_has_module_access(organization_id,'sessions',array['owner','admin','manager']));

-- L'affectation structurelle des formateurs à un programme est réservée aux responsables.
drop policy if exists training_program_trainers_manage on public.training_program_trainers;
create policy training_program_trainers_manage on public.training_program_trainers for all to authenticated
using (public.training_member_has_module_access(organization_id,'trainers',array['owner','admin','manager']))
with check (public.training_member_has_module_access(organization_id,'trainers',array['owner','admin','manager']));

drop policy if exists training_documents_select on public.training_documents;
create policy training_documents_select on public.training_documents for select to authenticated
using (public.training_member_has_module_access(organization_id,'documents'));
drop policy if exists training_documents_insert on public.training_documents;
create policy training_documents_insert on public.training_documents for insert to authenticated
with check (public.training_member_has_module_access(organization_id,'documents',array['owner','admin','manager','employee']));
drop policy if exists training_documents_update on public.training_documents;
create policy training_documents_update on public.training_documents for update to authenticated
using (public.training_member_has_module_access(organization_id,'documents',array['owner','admin','manager','employee']))
with check (public.training_member_has_module_access(organization_id,'documents',array['owner','admin','manager','employee']));
drop policy if exists training_documents_delete on public.training_documents;
create policy training_documents_delete on public.training_documents for delete to authenticated
using (public.training_member_has_module_access(organization_id,'documents',array['owner','admin','manager']));

drop policy if exists training_attendance_select on public.training_attendance;
create policy training_attendance_select on public.training_attendance for select to authenticated
using (public.training_member_has_module_access(organization_id,'attendance'));
drop policy if exists training_attendance_insert on public.training_attendance;
create policy training_attendance_insert on public.training_attendance for insert to authenticated
with check (
  public.training_member_has_module_access(organization_id,'attendance',array['owner','admin','manager','employee'])
  and public.organization_has_plan_feature(organization_id,'training_digital_attendance')
);
drop policy if exists training_attendance_update on public.training_attendance;
create policy training_attendance_update on public.training_attendance for update to authenticated
using (
  public.training_member_has_module_access(organization_id,'attendance',array['owner','admin','manager','employee'])
  and public.organization_has_plan_feature(organization_id,'training_digital_attendance')
)
with check (
  public.training_member_has_module_access(organization_id,'attendance',array['owner','admin','manager','employee'])
  and public.organization_has_plan_feature(organization_id,'training_digital_attendance')
);
drop policy if exists training_attendance_delete on public.training_attendance;
create policy training_attendance_delete on public.training_attendance for delete to authenticated
using (
  public.training_member_has_module_access(organization_id,'attendance',array['owner','admin','manager'])
  and public.organization_has_plan_feature(organization_id,'training_digital_attendance')
);

drop policy if exists training_satisfaction_select on public.training_satisfaction_surveys;
create policy training_satisfaction_select on public.training_satisfaction_surveys for select to authenticated
using (
  public.training_member_has_module_access(organization_id,'evaluations')
  and public.organization_has_plan_feature(organization_id,'training_satisfaction')
);

-- -----------------------------------------------------------------------------
-- Storage documents / signatures : même limitation module côté fichiers privés.
-- Les portails externes restent gérés par leurs règles dédiées existantes.
-- -----------------------------------------------------------------------------
create or replace function public.can_manage_training_document_asset(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organizations o
    where o.id=public.training_document_organization_id(p_object_name)
      and o.business_type='formation'
      and o.status in ('trial','active')
      and public.training_member_has_module_access(o.id,'documents',array['owner','admin','manager','employee'])
  );
$$;

create or replace function public.can_read_training_signature_asset(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organizations o
    where o.id=public.training_signature_organization_id(p_object_name)
      and o.business_type='formation'
      and public.training_member_has_module_access(o.id,'attendance')
  );
$$;

create or replace function public.can_manage_training_signature_asset(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organizations o
    where o.id=public.training_signature_organization_id(p_object_name)
      and o.business_type='formation'
      and o.status in ('trial','active')
      and public.training_member_has_module_access(o.id,'attendance',array['owner','admin','manager','employee'])
  );
$$;

-- Lecture du bucket historique : restriction interne "documents" + conservation
-- stricte des accès des portails externes déjà autorisés.
create or replace function public.can_read_training_document_asset(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations o
    where o.id=public.training_document_organization_id(p_object_name)
      and o.business_type='formation'
      and public.training_member_has_module_access(o.id,'documents')
  )
  or exists (
    select 1
    from public.training_portal_accounts a
    where a.user_id=auth.uid() and a.status='active'
      and public.training_portals_feature_enabled(a.organization_id)
      and (
        exists (
          select 1 from public.training_portal_documents pd
          where pd.organization_id=a.organization_id
            and pd.storage_bucket='training-documents'
            and pd.storage_path=p_object_name and pd.status='active'
            and pd.subject_kind=a.subject_kind
            and coalesce(pd.trainee_id,pd.trainer_id,pd.customer_id)=
                coalesce(a.trainee_id,a.trainer_id,a.customer_id)
        )
        or exists (
          select 1 from public.training_documents d
          where d.organization_id=a.organization_id
            and d.storage_path=p_object_name
            and d.status='published' and d.visibility<>'internal'
            and (
              (a.subject_kind='trainee' and (
                d.trainee_id=a.trainee_id
                or (d.session_id is not null and public.training_portal_subject_session_allowed(a.id,d.session_id))
              ))
              or (a.subject_kind='trainer' and d.session_id is not null
                  and public.training_portal_subject_session_allowed(a.id,d.session_id))
            )
        )
        or exists (
          select 1 from public.training_commercial_documents d
          where d.organization_id=a.organization_id
            and d.generated_document_path=p_object_name
            and d.status not in ('draft','canceled')
            and (
              (a.subject_kind='trainee' and d.trainee_id=a.trainee_id)
              or (a.subject_kind='client' and d.customer_id=a.customer_id)
            )
        )
        or exists (
          select 1 from public.training_invoices i
          where i.organization_id=a.organization_id
            and i.generated_document_path=p_object_name
            and i.status not in ('draft','canceled')
            and a.subject_kind='client' and i.customer_id=a.customer_id
        )
      )
  );
$$;

-- Les gestionnaires de pièces de portail doivent eux aussi disposer du module.
create or replace function public.can_manage_training_portal_document_asset(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations o
    where p_object_name like o.id::text||'/%'
      and public.training_member_has_module_access(o.id,'training_portals_signatures',array['owner','admin','manager'])
      and public.training_portals_feature_enabled(o.id)
  );
$$;

-- -----------------------------------------------------------------------------
-- Invitations équipe Formation : séparation Propriétaire / Administrateur.
-- Un administrateur peut gérer l'équipe courante mais ne peut pas créer un pair admin.
-- -----------------------------------------------------------------------------
create or replace function public.enforce_training_team_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_business_type text;
  v_plan text;
begin
  select o.business_type,o.plan into v_business_type,v_plan
  from public.organizations o where o.id=new.organization_id;

  if v_business_type='formation' and new.status='pending' then
    if not public.organization_has_plan_feature(new.organization_id,'team_access') then
      raise exception 'Les accès équipe Formation nécessitent l’offre Professionnelle.';
    end if;
    if new.role='owner' then raise exception 'Le rôle Propriétaire ne peut pas être attribué par invitation.'; end if;
    if v_plan='professionnelle' and new.role not in ('manager','employee','viewer') then
      raise exception 'Ce rôle nécessite l’offre Métier.';
    end if;
    if v_plan='metier' and new.role not in ('admin','manager','employee','viewer') then
      raise exception 'Rôle Formation invalide.';
    end if;
    if new.role='admin' and not public.has_org_role(new.organization_id,array['owner']) then
      raise exception 'Seul le propriétaire peut inviter un administrateur.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_training_team_entitlement() from public,anon,authenticated;
drop trigger if exists enforce_training_team_entitlement on public.organization_invitations;
create trigger enforce_training_team_entitlement
before insert or update of role,status on public.organization_invitations
for each row execute procedure public.enforce_training_team_entitlement();

-- -----------------------------------------------------------------------------
-- Annuaire comptes Formation : les e-mails et états de connexion sont réservés
-- à l'administration de l'organisme (owner/admin). Un manager ne peut plus
-- contourner /acces-equipe en appelant directement les anciens RPC génériques.
-- -----------------------------------------------------------------------------
create or replace function public.list_training_team_members(p_organization_id uuid)
returns table (
  user_id uuid,email text,full_name text,role text,status text,staff_id uuid,staff_name text,joined_at timestamptz,
  profile_ready boolean,last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public,pg_catalog
as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin']) then
    raise exception 'Accès aux comptes Formation refusé.';
  end if;
  if not exists(select 1 from public.organizations where id=p_organization_id and business_type='formation') then
    raise exception 'Espace Formation introuvable.';
  end if;
  return query
  select m.user_id,u.email::text,
    coalesce(nullif(trim(p.full_name),''),split_part(u.email::text,'@',1))::text,
    m.role,m.status,null::uuid,null::text,m.created_at,
    (p.id is not null),u.last_sign_in_at
  from public.organization_members m
  join auth.users u on u.id=m.user_id
  left join public.user_profiles p on p.id=m.user_id
  where m.organization_id=p_organization_id
  order by case m.role when 'owner' then 0 when 'admin' then 1 when 'manager' then 2 when 'employee' then 3 else 4 end,
           coalesce(p.full_name,u.email::text);
end;
$$;

create or replace function public.list_training_team_invitations(p_organization_id uuid)
returns table (
  invitation_id uuid,email text,role text,staff_id uuid,staff_name text,status text,expires_at timestamptz,created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public,pg_catalog
as $$
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin']) then
    raise exception 'Accès aux invitations Formation refusé.';
  end if;
  if not exists(select 1 from public.organizations where id=p_organization_id and business_type='formation') then
    raise exception 'Espace Formation introuvable.';
  end if;
  return query
  select i.id,i.email,i.role,null::uuid,null::text,
    case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,
    i.expires_at,i.created_at
  from public.organization_invitations i
  where i.organization_id=p_organization_id and i.status in ('pending','expired')
  order by i.created_at desc;
end;
$$;

create or replace function public.list_team_members(p_organization_id uuid)
returns table (user_id uuid,email text,full_name text,role text,status text,staff_id uuid,staff_name text,joined_at timestamptz)
language plpgsql
stable
security definer
set search_path = public,pg_catalog
as $$
declare v_business text;
begin
  select business_type into v_business from public.organizations where id=p_organization_id;
  if v_business='formation' then
    if not public.has_org_role(p_organization_id,array['owner','admin']) then raise exception 'Accès refusé.'; end if;
  elsif not public.has_org_role(p_organization_id,array['owner','admin','manager']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;
  return query
  select m.user_id,u.email::text,coalesce(nullif(trim(p.full_name),''),split_part(u.email::text,'@',1))::text,
         m.role,m.status,s.id,s.display_name,m.created_at
  from public.organization_members m
  join auth.users u on u.id=m.user_id
  left join public.user_profiles p on p.id=m.user_id
  left join public.staff s on s.organization_id=m.organization_id and s.linked_user_id=m.user_id
  where m.organization_id=p_organization_id
  order by case m.role when 'owner' then 0 when 'admin' then 1 when 'manager' then 2 else 3 end,coalesce(p.full_name,u.email::text);
end;
$$;

create or replace function public.list_team_invitations(p_organization_id uuid)
returns table (invitation_id uuid,email text,role text,staff_id uuid,staff_name text,status text,expires_at timestamptz,created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public,pg_catalog
as $$
declare v_business text;
begin
  select business_type into v_business from public.organizations where id=p_organization_id;
  if v_business='formation' then
    if not public.has_org_role(p_organization_id,array['owner','admin']) then raise exception 'Accès refusé.'; end if;
  elsif not public.has_org_role(p_organization_id,array['owner','admin','manager']) then
    raise exception 'Vous ne disposez pas des droits nécessaires.';
  end if;
  return query
  select i.id,i.email,i.role,i.staff_id,s.display_name,
         case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,
         i.expires_at,i.created_at
  from public.organization_invitations i
  left join public.staff s on s.organization_id=i.organization_id and s.id=i.staff_id
  where i.organization_id=p_organization_id and i.status in ('pending','expired')
  order by i.created_at desc;
end;
$$;

-- -----------------------------------------------------------------------------
-- Rôle/statut : pas d'auto-élévation, pas d'auto-suspension, et un administrateur
-- ne peut ni créer, ni modifier, ni suspendre un autre administrateur.
-- -----------------------------------------------------------------------------
create or replace function public.update_training_team_member_role(p_organization_id uuid,p_user_id uuid,p_role text)
returns void
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_plan text;
  v_current_role text;
  v_caller_role text;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin']) then raise exception 'Droits insuffisants.'; end if;
  if not public.organization_has_plan_feature(p_organization_id,'team_access') then raise exception 'Les accès équipe nécessitent l’offre Professionnelle.'; end if;
  if p_user_id=auth.uid() then raise exception 'Vous ne pouvez pas modifier votre propre rôle.'; end if;
  select o.plan into v_plan from public.organizations o where o.id=p_organization_id and o.business_type='formation';
  select role into v_current_role from public.organization_members where organization_id=p_organization_id and user_id=p_user_id;
  select role into v_caller_role from public.organization_members where organization_id=p_organization_id and user_id=auth.uid() and status='active';
  if v_current_role is null then raise exception 'Utilisateur introuvable.'; end if;
  if v_current_role='owner' then raise exception 'Le rôle du propriétaire ne peut pas être modifié.'; end if;
  if (v_current_role='admin' or p_role='admin') and v_caller_role<>'owner' then raise exception 'Seul le propriétaire peut gérer les administrateurs.'; end if;
  if v_plan='professionnelle' and p_role not in ('manager','employee','viewer') then raise exception 'Ce rôle nécessite l’offre Métier.'; end if;
  if v_plan='metier' and p_role not in ('admin','manager','employee','viewer') then raise exception 'Rôle invalide.'; end if;
  update public.organization_members set role=p_role,custom_role_id=null where organization_id=p_organization_id and user_id=p_user_id;
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(p_organization_id,auth.uid(),'training.team_role_updated','organization_member',p_user_id::text,jsonb_build_object('previous_role',v_current_role,'new_role',p_role,'custom_role_cleared',true));
end;
$$;

create or replace function public.set_training_team_member_status(p_organization_id uuid,p_user_id uuid,p_status text)
returns void
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_target_role text;
  v_caller_role text;
  v_plan text;
  v_limit integer;
  v_active integer;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin']) then raise exception 'Droits insuffisants.'; end if;
  if p_status not in ('active','disabled') then raise exception 'Statut invalide.'; end if;
  if p_user_id=auth.uid() then raise exception 'Vous ne pouvez pas suspendre votre propre accès.'; end if;
  select role into v_target_role from public.organization_members where organization_id=p_organization_id and user_id=p_user_id;
  select role into v_caller_role from public.organization_members where organization_id=p_organization_id and user_id=auth.uid() and status='active';
  if v_target_role is null then raise exception 'Utilisateur introuvable.'; end if;
  if v_target_role='owner' then raise exception 'Le propriétaire ne peut pas être suspendu.'; end if;
  if v_target_role='admin' and v_caller_role<>'owner' then raise exception 'Seul le propriétaire peut gérer les administrateurs.'; end if;
  if p_status='active' then
    if not public.organization_has_plan_feature(p_organization_id,'team_access') then raise exception 'Les accès équipe ne sont plus actifs.'; end if;
    select plan into v_plan from public.organizations where id=p_organization_id and business_type='formation';
    v_limit:=public.domain_plan_member_limit('formation',v_plan);
    select count(*)::integer into v_active from public.organization_members where organization_id=p_organization_id and status='active' and user_id<>p_user_id;
    if v_active>=v_limit then raise exception 'La limite de % utilisateur(s) Formation est atteinte.',v_limit; end if;
  end if;
  update public.organization_members set status=p_status where organization_id=p_organization_id and user_id=p_user_id;
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(p_organization_id,auth.uid(),'training.team_status_updated','organization_member',p_user_id::text,jsonb_build_object('status',p_status));
end;
$$;

create or replace function public.training_team_plan_summary(p_organization_id uuid)
returns table(plan text,member_limit integer,active_members integer,pending_invitations integer,available_seats integer,invitations_enabled boolean,manager_role_enabled boolean)
language plpgsql
stable
security definer
set search_path = public,pg_catalog
as $$
declare v_plan text; v_limit integer; v_active integer; v_pending integer;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin']) then raise exception 'Accès refusé.'; end if;
  select o.plan,public.domain_plan_member_limit(o.business_type,o.plan) into v_plan,v_limit
  from public.organizations o where o.id=p_organization_id and o.business_type='formation';
  if v_plan is null then raise exception 'Espace Formation introuvable.'; end if;
  select count(*)::integer into v_active from public.organization_members where organization_id=p_organization_id and status='active';
  select count(*)::integer into v_pending from public.organization_invitations where organization_id=p_organization_id and status='pending' and expires_at>now();
  return query select v_plan,v_limit,v_active,v_pending,greatest(v_limit-v_active-v_pending,0),
    public.organization_has_plan_feature(p_organization_id,'team_access'),public.organization_has_plan_feature(p_organization_id,'manager_role');
end;
$$;

-- -----------------------------------------------------------------------------
-- Statut et clôture d'une session = opérations structurelles, réservées aux
-- responsables. Collaborateur conserve émargements/documents/évaluations.
-- -----------------------------------------------------------------------------
create or replace function public.set_training_session_status(p_organization_id uuid,p_session_id uuid,p_status text)
returns void
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare v_current_status text; v_target_status text:=p_status;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin','manager']) then raise exception 'Accès insuffisant.'; end if;
  if v_target_status not in ('draft','scheduled','in_progress','canceled') then raise exception 'Utilisez la clôture sécurisée pour terminer une session.'; end if;
  select status into v_current_status from public.training_sessions where organization_id=p_organization_id and id=p_session_id for update;
  if v_current_status is null then raise exception 'Session introuvable.'; end if;
  if v_current_status='completed' then raise exception 'La session est clôturée. Rouvrez-la avant de la modifier.'; end if;
  if v_current_status='draft' and v_target_status in ('scheduled','in_progress') then
    perform public.validate_training_session_workflow(p_organization_id,p_session_id,true);
    if v_target_status='in_progress' then update public.training_sessions set status='in_progress',updated_at=now() where organization_id=p_organization_id and id=p_session_id; end if;
    return;
  end if;
  update public.training_sessions set status=v_target_status,updated_at=now() where organization_id=p_organization_id and id=p_session_id;
end;
$$;

create or replace function public.close_training_session(p_organization_id uuid,p_session_id uuid,p_closure_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare v_check jsonb; v_result jsonb;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin','manager']) then raise exception 'Accès insuffisant.'; end if;
  v_check:=public.training_session_closure_check(p_organization_id,p_session_id);
  if not coalesce((v_check->>'can_close')::boolean,false) then
    raise exception '%',coalesce(v_check->'blockers'->>0,'La session ne peut pas être terminée.');
  end if;
  update public.training_sessions
  set status='completed',closed_at=now(),delivery_completed_at=now(),closed_by=auth.uid(),
      closure_notes=nullif(trim(coalesce(p_closure_notes,'')),''),reopened_at=null,reopened_by=null,
      training_dossier_finalized_at=null,training_dossier_finalized_by=null,
      training_dossier_auto_completed=false,closure_automation_started_at=null,updated_at=now()
  where organization_id=p_organization_id and id=p_session_id and status<>'completed';
  if not found then raise exception 'Session introuvable ou déjà terminée.'; end if;
  select jsonb_build_object(
    'id',s.id,'status',s.status,'closed_at',s.closed_at,'delivery_completed_at',s.delivery_completed_at,
    'closure_notes',s.closure_notes,'closure_automation_started_at',s.closure_automation_started_at,
    'training_dossier_finalized_at',s.training_dossier_finalized_at,
    'final_evaluations_queued',(select count(*) from public.training_satisfaction_surveys q where q.organization_id=p_organization_id and q.session_id=p_session_id and q.evaluation_type='final'),
    'attestations_queued',(select count(*) from public.training_document_jobs j where j.organization_id=p_organization_id and j.session_id=p_session_id and j.document_kind='attestation')
  ) into v_result from public.training_sessions s where s.organization_id=p_organization_id and s.id=p_session_id;
  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values(p_organization_id,auth.uid(),'training.session_delivery_completed','training_session',p_session_id::text,
    jsonb_build_object('closure_notes',nullif(trim(coalesce(p_closure_notes,'')),''),'check',v_check,'automation',v_result));
  return v_result;
end;
$$;

-- Un compte Formation actif doit toujours disposer d'un profil exploitable par l'UI.
create or replace function public.ensure_training_member_profile()
returns trigger
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
begin
  if new.status='active' and exists(select 1 from public.organizations o where o.id=new.organization_id and o.business_type='formation') then
    insert into public.user_profiles(id) values(new.user_id) on conflict(id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.ensure_training_member_profile() from public,anon,authenticated;
drop trigger if exists ensure_training_member_profile on public.organization_members;
create trigger ensure_training_member_profile
after insert or update of status on public.organization_members
for each row execute procedure public.ensure_training_member_profile();

revoke all on function public.list_training_team_members(uuid) from public,anon;
revoke all on function public.list_training_team_invitations(uuid) from public,anon;
revoke all on function public.set_training_team_member_status(uuid,uuid,text) from public,anon;
revoke all on function public.training_team_plan_summary(uuid) from public,anon;
revoke all on function public.update_training_team_member_role(uuid,uuid,text) from public,anon;
grant execute on function public.list_training_team_members(uuid) to authenticated;
grant execute on function public.list_training_team_invitations(uuid) to authenticated;
grant execute on function public.set_training_team_member_status(uuid,uuid,text) to authenticated;
grant execute on function public.training_team_plan_summary(uuid) to authenticated;
grant execute on function public.update_training_team_member_role(uuid,uuid,text) to authenticated;
grant execute on function public.set_training_session_status(uuid,uuid,text) to authenticated;
grant execute on function public.close_training_session(uuid,uuid,text) to authenticated;

-- -----------------------------------------------------------------------------
-- Release state
-- -----------------------------------------------------------------------------
insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,installed_at,installed_by,notes
) values (
  true,'2.29.16','2.29.16','ncr-suite-shell-v2.29.16-training-access-hardening',now(),auth.uid(),
  'V2.29.16 : durcissement Formation droits/comptes, intégrité des rôles, rôles personnalisés côté RLS et réparation profils.'
)
on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

select pg_notify('pgrst','reload schema');
commit;
