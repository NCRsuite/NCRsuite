-- NCR Suite V2.24.1 - Push super-administrateur sur ecran verrouille
-- A executer apres 092_portal_access_support_alerts.sql.

begin;

do $$
begin
  if to_regclass('public.platform_admin_notifications') is null
     or to_regclass('public.notification_events') is null
     or to_regclass('public.push_delivery_queue') is null
     or to_regclass('public.push_subscriptions') is null then
    raise exception 'Les migrations NCR Suite precedentes doivent etre executees avant la V2.24.1.';
  end if;
end;
$$;

-- Une demande d'acces a la plateforme n'appartient pas encore a une
-- entreprise. Les evenements Push centraux doivent donc accepter ce cas.
alter table public.notification_events
  alter column organization_id drop not null;

drop policy if exists notification_events_select_own
  on public.notification_events;
create policy notification_events_select_own
on public.notification_events
for select to authenticated
using (
  recipient_user_id=auth.uid()
  and status='active'
  and (
    (
      organization_id is not null
      and public.is_org_member(organization_id)
    )
    or (
      metadata->>'scope'='platform_admin'
      and public.is_platform_admin()
    )
  )
);

-- La notification centrale reste toujours creee. La partie Web Push est
-- isolee pour ne jamais bloquer une demande client en cas d'incident externe.
create or replace function public.enqueue_platform_admin_notification_internal(
  p_organization_id uuid,
  p_category text,
  p_event_type text,
  p_title text,
  p_body text,
  p_target_section text,
  p_urgency text,
  p_entity_type text,
  p_entity_id text,
  p_metadata jsonb default '{}'::jsonb,
  p_dedupe_prefix text default null
)
returns integer
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_admin record;
  v_count integer:=0;
  v_prefix text;
  v_notification_id uuid;
  v_push_event_id uuid;
  v_url text;
begin
  if p_category not in ('access','support','subscription','module','system')
     or p_target_section not in ('cockpit','access','support','billing')
     or p_urgency not in ('low','normal','high','critical') then
    raise exception 'Notification super-administrateur invalide.';
  end if;

  v_prefix:=coalesce(
    nullif(trim(p_dedupe_prefix),''),
    p_event_type||':'||coalesce(p_entity_id,gen_random_uuid()::text)
  );

  for v_admin in
    select user_id
    from public.platform_admins
    where active=true and role='super_admin'
  loop
    v_notification_id:=null;

    insert into public.platform_admin_notifications(
      recipient_user_id,organization_id,category,event_type,title,body,
      target_section,urgency,entity_type,entity_id,metadata,dedupe_key
    ) values (
      v_admin.user_id,p_organization_id,p_category,p_event_type,
      left(trim(p_title),180),left(trim(p_body),1000),
      p_target_section,p_urgency,p_entity_type,p_entity_id,
      coalesce(p_metadata,'{}'::jsonb),
      v_prefix||':'||v_admin.user_id::text
    )
    on conflict(dedupe_key) do nothing
    returning id into v_notification_id;

    if v_notification_id is not null then
      v_count:=v_count+1;
      v_url:=format(
        '/administration-ncr?section=%s&notification=%s',
        p_target_section,
        v_notification_id
      );

      begin
        insert into public.notification_events(
          organization_id,recipient_user_id,category,event_type,title,body,url,
          urgency,entity_type,entity_id,metadata,dedupe_key,scheduled_for,expires_at
        ) values (
          p_organization_id,v_admin.user_id,'system',p_event_type,
          left(trim(p_title),180),left(trim(p_body),1000),v_url,
          p_urgency,p_entity_type,p_entity_id,
          coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object(
            'scope','platform_admin',
            'platform_admin_notification_id',v_notification_id,
            'platform_category',p_category,
            'target_section',p_target_section
          ),
          'platform-admin-push:'||v_notification_id::text,
          now(),
          now()+interval '7 days'
        )
        returning id into v_push_event_id;

        insert into public.push_delivery_queue(
          event_id,subscription_id,scheduled_for
        )
        select v_push_event_id,s.id,now()
        from public.push_subscriptions s
        where s.user_id=v_admin.user_id
          and s.active=true
        on conflict(event_id,subscription_id) do update
        set status='pending',
            attempts=0,
            scheduled_for=excluded.scheduled_for,
            locked_at=null,
            sent_at=null,
            provider_status=null,
            last_error=null,
            updated_at=now();
      exception when others then
        raise warning 'Push super-administrateur non programme pour % : %',
          v_admin.user_id,sqlerrm;
      end;
    end if;
  end loop;

  return v_count;
exception when others then
  raise warning 'Notification super-administrateur ignoree : %',sqlerrm;
  return 0;
end;
$$;

-- Test declenche depuis le telephone apres autorisation du navigateur.
create or replace function public.queue_platform_admin_push_test()
returns uuid
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_notification_id uuid;
  v_push_event_id uuid;
  v_dedupe text;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Acces super-administrateur requis.';
  end if;

  v_dedupe:='platform-admin-push-test:'||auth.uid()::text||':'||
    floor(extract(epoch from now())/60)::text;

  insert into public.platform_admin_notifications(
    recipient_user_id,organization_id,category,event_type,title,body,
    target_section,urgency,entity_type,entity_id,metadata,dedupe_key
  ) values (
    auth.uid(),null,'system','system.platform_admin_push_test',
    'Alertes NCR Suite activees',
    'Ce telephone recevra les demandes super-administrateur, meme PWA fermee ou ecran verrouille.',
    'cockpit','normal','platform_admin',auth.uid()::text,
    jsonb_build_object('test',true),v_dedupe
  )
  on conflict(dedupe_key) do update
  set read_at=null,created_at=now()
  returning id into v_notification_id;

  insert into public.notification_events(
    organization_id,recipient_user_id,category,event_type,title,body,url,
    urgency,entity_type,entity_id,metadata,dedupe_key,scheduled_for,expires_at
  ) values (
    null,auth.uid(),'system','system.platform_admin_push_test',
    'Alertes NCR Suite activees',
    'Ce telephone recevra les demandes super-administrateur, meme PWA fermee ou ecran verrouille.',
    '/administration-ncr?section=cockpit&notification='||v_notification_id::text,
    'normal','platform_admin',auth.uid()::text,
    jsonb_build_object(
      'scope','platform_admin',
      'platform_admin_notification_id',v_notification_id,
      'test',true
    ),
    'platform-admin-push:'||v_notification_id::text,
    now(),
    now()+interval '1 day'
  )
  on conflict(dedupe_key) do update
  set status='active',
      read_at=null,
      scheduled_for=now(),
      expires_at=excluded.expires_at
  returning id into v_push_event_id;

  insert into public.push_delivery_queue(
    event_id,subscription_id,scheduled_for
  )
  select v_push_event_id,s.id,now()
  from public.push_subscriptions s
  where s.user_id=auth.uid()
    and s.active=true
  on conflict(event_id,subscription_id) do update
  set status='pending',
      attempts=0,
      scheduled_for=excluded.scheduled_for,
      locked_at=null,
      sent_at=null,
      provider_status=null,
      last_error=null,
      updated_at=now();

  return v_push_event_id;
end;
$$;

revoke all on function public.enqueue_platform_admin_notification_internal(
  uuid,text,text,text,text,text,text,text,text,jsonb,text
) from public,anon,authenticated;
revoke all on function public.queue_platform_admin_push_test()
  from public,anon;
grant execute on function public.queue_platform_admin_push_test()
  to authenticated;

insert into public.platform_release_state(
  singleton,
  database_version,
  expected_frontend_version,
  expected_pwa_cache,
  installed_at,
  installed_by,
  notes
) values (
  true,
  '2.24.1',
  '2.24.1',
  'ncr-suite-shell-v2.24.1-platform-admin-locked-screen-push',
  now(),
  auth.uid(),
  'V2.24.1 : alertes Web Push du super-administrateur disponibles PWA fermee et ecran verrouille.'
) on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
