-- NCR Suite V2.29.25 — Durcissement ACL du trigger de resoumission des demandes d'accès.
-- La fonction est appelée uniquement par son trigger PostgreSQL et ne doit pas être exécutable directement par les rôles client.

begin;

revoke all on function public.notify_platform_admin_access_request_resubmitted()
  from public, anon, authenticated;

grant execute on function public.notify_platform_admin_access_request_resubmitted()
  to service_role;

commit;

select pg_notify('pgrst','reload schema');
