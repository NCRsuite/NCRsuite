-- NCR Suite V2.29.25 — Bac à sable Session test Formation
-- Permet de tester le cycle complet (convocation, portail, émargement, évaluations,
-- clôture, attestations) avec une seule adresse de test, sans polluer le BPF.

begin;

alter table public.organizations
  add column if not exists training_test_email text,
  add column if not exists training_test_trainee_id uuid;

alter table public.training_trainees
  add column if not exists is_test_profile boolean not null default false;

alter table public.training_sessions
  add column if not exists is_test boolean not null default false,
  add column if not exists test_source_session_id uuid,
  add column if not exists test_recipient_email text;

alter table public.organizations
  drop constraint if exists organizations_training_test_email_check,
  add constraint organizations_training_test_email_check
  check (
    training_test_email is null
    or training_test_email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
  );

alter table public.training_sessions
  drop constraint if exists training_sessions_test_email_check,
  add constraint training_sessions_test_email_check
  check (
    test_recipient_email is null
    or test_recipient_email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
  );

create index if not exists idx_training_sessions_test
  on public.training_sessions(organization_id,is_test,created_at desc);
create index if not exists idx_training_trainees_test
  on public.training_trainees(organization_id,is_test_profile,status);

create or replace function public.configure_training_test_recipient(
  p_organization_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email,'')));
  v_trainee_id uuid;
  v_old_email text;
  v_invited boolean := false;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin']) then
    raise exception 'Seuls le propriétaire et les administrateurs peuvent configurer le stagiaire test.';
  end if;
  if not exists (select 1 from public.organizations where id=p_organization_id and business_type='formation') then
    raise exception 'Organisme de formation introuvable.';
  end if;
  if v_email='' or v_email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception 'Adresse e-mail de test invalide.';
  end if;

  select training_test_trainee_id into v_trainee_id
  from public.organizations where id=p_organization_id;

  if v_trainee_id is not null then
    select email into v_old_email from public.training_trainees
    where organization_id=p_organization_id and id=v_trainee_id;
  end if;

  if v_trainee_id is null or not exists (
    select 1 from public.training_trainees
    where organization_id=p_organization_id and id=v_trainee_id
  ) then
    select id into v_trainee_id
    from public.training_trainees
    where organization_id=p_organization_id and is_test_profile=true
    order by created_at asc limit 1;
  end if;

  if v_trainee_id is null then
    insert into public.training_trainees(
      organization_id,first_name,last_name,email,company,notes,status,created_by,is_test_profile
    ) values (
      p_organization_id,'Stagiaire','Test NCR',v_email,'SESSION TEST',
      'Profil technique réservé aux tests de parcours Formation NCR Suite.','active',auth.uid(),true
    ) returning id into v_trainee_id;
  else
    update public.training_trainees
    set first_name='Stagiaire',last_name='Test NCR',email=v_email,company='SESSION TEST',
        notes='Profil technique réservé aux tests de parcours Formation NCR Suite.',
        status='active',is_test_profile=true,updated_at=now()
    where organization_id=p_organization_id and id=v_trainee_id;
  end if;

  update public.organizations
  set training_test_email=v_email,training_test_trainee_id=v_trainee_id,updated_at=now()
  where id=p_organization_id;

  -- Si l'adresse change, on suspend l'ancien accès du profil test uniquement.
  if nullif(lower(trim(coalesce(v_old_email,''))),'') is not null
     and lower(trim(v_old_email)) <> v_email then
    update public.training_portal_accounts
    set status='suspended',updated_at=now()
    where organization_id=p_organization_id and trainee_id=v_trainee_id
      and lower(email)<>v_email and status='active';
    update public.training_portal_invitations
    set status='revoked',revoked_at=now(),updated_at=now()
    where organization_id=p_organization_id and trainee_id=v_trainee_id
      and lower(email)<>v_email and status='pending';
  end if;

  -- Un vrai accès portail est proposé à l'adresse test si le module est actif.
  if to_regprocedure('public.training_portals_feature_enabled(uuid)') is not null
     and public.training_portals_feature_enabled(p_organization_id) then
    if not exists (
      select 1 from public.training_portal_accounts
      where organization_id=p_organization_id and trainee_id=v_trainee_id
        and lower(email)=v_email and status='active'
    ) and not exists (
      select 1 from public.training_portal_invitations
      where organization_id=p_organization_id and trainee_id=v_trainee_id
        and lower(email)=v_email and status='pending' and expires_at>now()
    ) then
      perform public.create_training_portal_invitation(
        p_organization_id,'trainee',v_trainee_id,v_email,'Stagiaire Test NCR'
      );
      v_invited := true;
    end if;
  end if;

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (p_organization_id,auth.uid(),'training.test_recipient_configured','training_trainee',v_trainee_id::text,
    jsonb_build_object('email',v_email,'portal_invitation_created',v_invited));

  return jsonb_build_object(
    'trainee_id',v_trainee_id,
    'email',v_email,
    'portal_invitation_created',v_invited
  );
end;
$$;

create or replace function public.create_training_test_session(
  p_organization_id uuid,
  p_source_session_id uuid,
  p_test_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.training_sessions%rowtype;
  v_org public.organizations%rowtype;
  v_trainee_id uuid;
  v_email text;
  v_session_id uuid;
  v_start_local timestamp;
  v_end_local timestamp;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_validation jsonb;
begin
  if auth.uid() is null or not public.has_org_role(p_organization_id,array['owner','admin']) then
    raise exception 'Seuls le propriétaire et les administrateurs peuvent créer une session test.';
  end if;

  select * into v_org from public.organizations
  where id=p_organization_id and business_type='formation';
  if v_org.id is null then raise exception 'Organisme de formation introuvable.'; end if;

  select * into v_source from public.training_sessions
  where organization_id=p_organization_id and id=p_source_session_id;
  if v_source.id is null then raise exception 'Session source introuvable.'; end if;
  if coalesce(v_source.is_test,false) then raise exception 'Choisissez une vraie session comme modèle.'; end if;
  if v_source.trainer_id is null then raise exception 'La session modèle doit avoir un formateur affecté.'; end if;

  v_email := lower(trim(coalesce(p_test_email,v_org.training_test_email,'')));
  if v_email='' then raise exception 'Configurez d’abord l’adresse e-mail de test.'; end if;

  if v_org.training_test_trainee_id is null
     or not exists (
       select 1 from public.training_trainees
       where organization_id=p_organization_id and id=v_org.training_test_trainee_id
         and is_test_profile=true and status='active' and lower(email)=v_email
     ) then
    perform public.configure_training_test_recipient(p_organization_id,v_email);
    select training_test_trainee_id into v_trainee_id
    from public.organizations where id=p_organization_id;
  else
    v_trainee_id := v_org.training_test_trainee_id;
  end if;

  -- Une journée déjà terminée : on peut tester immédiatement le cycle de clôture,
  -- mais les émargements et évaluations restent réellement obligatoires.
  v_start_local := date_trunc('day', now() at time zone coalesce(v_org.timezone,'Europe/Paris'))
                   - interval '1 day' + interval '9 hours';
  v_end_local := date_trunc('day', now() at time zone coalesce(v_org.timezone,'Europe/Paris'))
                 - interval '1 day' + interval '17 hours';
  v_starts_at := v_start_local at time zone coalesce(v_org.timezone,'Europe/Paris');
  v_ends_at := v_end_local at time zone coalesce(v_org.timezone,'Europe/Paris');

  insert into public.training_sessions(
    organization_id,site_id,program_id,trainer_id,title,starts_at,ends_at,capacity,
    location,modality,status,notes,created_by,bpf_delivery_mode,bpf_regulatory_scope,
    is_test,test_source_session_id,test_recipient_email
  ) values (
    p_organization_id,v_source.site_id,v_source.program_id,v_source.trainer_id,
    '[TEST] '||regexp_replace(v_source.title,'^\[TEST\][[:space:]]*','','i'),
    v_starts_at,v_ends_at,1,v_source.location,v_source.modality,'draft',
    'SESSION DE TEST — non contractuelle. Créée depuis la session '||v_source.id::text||'.',
    auth.uid(),'direct','out_of_scope',true,v_source.id,v_email
  ) returning id into v_session_id;

  insert into public.training_session_enrollments(
    organization_id,session_id,trainee_id,status,created_by
  ) values (p_organization_id,v_session_id,v_trainee_id,'registered',auth.uid());

  -- Réutilise le vrai workflow : convocation + évaluation initiale + documents réels.
  v_validation := public.validate_training_session_workflow(
    p_organization_id,v_session_id,true
  );

  insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
  values (p_organization_id,auth.uid(),'training.test_session_created','training_session',v_session_id::text,
    jsonb_build_object('source_session_id',v_source.id,'test_email',v_email,'validation',v_validation));

  return jsonb_build_object(
    'session_id',v_session_id,
    'trainee_id',v_trainee_id,
    'test_email',v_email,
    'starts_at',v_starts_at,
    'ends_at',v_ends_at,
    'status','scheduled',
    'validation',v_validation
  );
end;
$$;

revoke all on function public.configure_training_test_recipient(uuid,text) from public,anon;
revoke all on function public.create_training_test_session(uuid,uuid,text) from public,anon;
grant execute on function public.configure_training_test_recipient(uuid,text) to authenticated;
grant execute on function public.create_training_test_session(uuid,uuid,text) to authenticated;

-- Les sessions test sont toujours hors BPF, même si un client tente de les requalifier directement.
create or replace function public.force_training_test_session_out_of_bpf()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(new.is_test,false) then
    new.bpf_regulatory_scope := 'out_of_scope';
    new.bpf_delivery_mode := 'direct';
    new.source_commercial_document_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists force_training_test_session_out_of_bpf on public.training_sessions;
create trigger force_training_test_session_out_of_bpf
before insert or update on public.training_sessions
for each row execute procedure public.force_training_test_session_out_of_bpf();

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.29.25','2.29.25','ncr-suite-shell-v2.29.25-training-test-sandbox',
  now(),auth.uid(),
  'V2.29.25 : bac à sable Session test Formation avec vrai stagiaire test, vrais e-mails/portail et exclusion BPF.'
)
on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

insert into public.audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata)
values (null,auth.uid(),'platform.training_test_sandbox_applied','platform_release','2.29.25',
  jsonb_build_object('migration','139_training_test_session_sandbox'));

commit;

select pg_notify('pgrst','reload schema');
