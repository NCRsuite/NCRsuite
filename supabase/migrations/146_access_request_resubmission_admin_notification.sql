-- NCR Suite V2.29.25 R5.7.1
-- Recrée une notification Admin lorsqu'une ancienne demande est soumise à nouveau.
-- Important pour les essais 7 jours réutilisant une adresse déjà connue.

create or replace function public.notify_platform_admin_access_request_resubmitted()
returns trigger
language plpgsql
security definer
set search_path = public,pg_catalog
as $$
declare
  v_title text;
  v_body text;
  v_dedupe text;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  if not (
    old.status is distinct from 'pending'
    or old.submitted_at is distinct from new.submitted_at
  ) then
    return new;
  end if;

  v_title := case when coalesce(new.trial_requested,false)
    then 'Nouvelle demande d essai'
    else 'Nouvelle demande d acces'
  end;

  v_body := new.company_name||' : '||new.full_name
    ||case when coalesce(new.trial_requested,false) then ' · Essai 7 jours · Professionnelle' else '' end;

  v_dedupe := 'access.request_resubmitted:'||new.id::text||':'
    ||to_char(coalesce(new.submitted_at,now()) at time zone 'UTC','YYYYMMDDHH24MISSMS');

  perform public.enqueue_platform_admin_notification_internal(
    null,
    'access',
    case when coalesce(new.trial_requested,false) then 'access.trial_requested' else 'access.request_resubmitted' end,
    v_title,
    v_body,
    'access',
    'high',
    'platform_access_request',
    new.id::text,
    jsonb_build_object(
      'reference',new.reference,
      'business_type',new.business_type,
      'requested_plan',new.requested_plan,
      'trial_requested',coalesce(new.trial_requested,false),
      'submitted_at',new.submitted_at
    ),
    v_dedupe
  );

  return new;
end;
$$;

drop trigger if exists notify_platform_admin_access_request_resubmitted_update
  on public.platform_access_requests;

create trigger notify_platform_admin_access_request_resubmitted_update
after update of status,submitted_at,trial_requested,requested_plan
on public.platform_access_requests
for each row
execute function public.notify_platform_admin_access_request_resubmitted();
