-- NCR Suite V2.29.25 R5.2 — Hub client NCR Admin
-- Lecture centralisée et sécurisée des accès, invitations, assistance et activité d'une entreprise.

create or replace function public.admin_get_organization_hub(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public,pg_catalog
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Acces administrateur NCR requis.';
  end if;

  if not exists (select 1 from public.organizations where id = p_organization_id) then
    raise exception 'Entreprise introuvable.';
  end if;

  select jsonb_build_object(
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id,
        'email', u.email::text,
        'full_name', coalesce(nullif(trim(p.full_name),''), split_part(u.email::text,'@',1)),
        'phone', p.phone,
        'avatar_url', p.avatar_url,
        'role', m.role,
        'status', m.status,
        'created_at', m.created_at
      ) order by case m.role when 'owner' then 0 when 'admin' then 1 else 2 end, m.created_at)
      from public.organization_members m
      join auth.users u on u.id = m.user_id
      left join public.user_profiles p on p.id = m.user_id
      where m.organization_id = p_organization_id
    ), '[]'::jsonb),
    'invitations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'email', i.email,
        'role', i.role,
        'status', i.status,
        'expires_at', i.expires_at,
        'created_at', i.created_at
      ) order by i.created_at desc)
      from public.organization_invitations i
      where i.organization_id = p_organization_id
        and i.status = 'pending'
        and i.expires_at > now()
    ), '[]'::jsonb),
    'support_tickets', coalesce((
      select jsonb_agg(ticket order by (ticket->>'updated_at')::timestamptz desc)
      from (
        select jsonb_build_object(
          'id', t.id,
          'subject', t.subject,
          'category', t.category,
          'priority', t.priority,
          'status', t.status,
          'updated_at', t.updated_at,
          'created_at', t.created_at
        ) as ticket
        from public.platform_support_tickets t
        where t.organization_id = p_organization_id
        order by t.updated_at desc
        limit 6
      ) recent_tickets
    ), '[]'::jsonb),
    'support_access', (
      select jsonb_build_object(
        'id', a.id,
        'ticket_id', a.ticket_id,
        'status', a.status,
        'reason', a.reason,
        'duration_minutes', a.duration_minutes,
        'requested_at', a.requested_at,
        'approved_at', a.approved_at,
        'started_at', a.started_at,
        'expires_at', a.expires_at,
        'ended_at', a.ended_at
      )
      from public.platform_support_access_requests a
      where a.organization_id = p_organization_id
        and a.status in ('pending','approved','active')
      order by a.updated_at desc
      limit 1
    ),
    'activity', coalesce((
      select jsonb_agg(activity order by (activity->>'created_at')::timestamptz desc)
      from (
        select jsonb_build_object(
          'id', a.id,
          'action', a.action,
          'entity_type', a.entity_type,
          'entity_id', a.entity_id,
          'actor_email', u.email::text,
          'created_at', a.created_at
        ) as activity
        from public.audit_logs a
        left join auth.users u on u.id = a.user_id
        where a.organization_id = p_organization_id
        order by a.created_at desc
        limit 12
      ) recent_activity
    ), '[]'::jsonb),
    'counts', jsonb_build_object(
      'pending_invitations', (select count(*) from public.organization_invitations i where i.organization_id = p_organization_id and i.status='pending' and i.expires_at > now()),
      'open_tickets', (select count(*) from public.platform_support_tickets t where t.organization_id = p_organization_id and t.status in ('open','in_progress','waiting_customer')),
      'urgent_tickets', (select count(*) from public.platform_support_tickets t where t.organization_id = p_organization_id and t.status in ('open','in_progress','waiting_customer') and t.priority='urgent')
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_get_organization_hub(uuid) from public,anon;
grant execute on function public.admin_get_organization_hub(uuid) to authenticated;

comment on function public.admin_get_organization_hub(uuid) is
  'NCR Admin: vue centralisee non destructive d une entreprise (acces, assistance et activite).';
