alter function public.training_personal_schedule(uuid,date,date)
  set search_path = public,pg_catalog;

alter function public.training_reporting_org_external_bpf_rows(uuid,date,date)
  set search_path = public,pg_catalog;

revoke all on function public.training_reporting_org_external_bpf_rows(uuid,date,date)
  from public,anon,authenticated;
