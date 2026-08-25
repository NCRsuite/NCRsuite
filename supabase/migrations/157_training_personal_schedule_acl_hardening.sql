revoke all on function public.training_personal_schedule(uuid,date,date) from public, anon;
grant execute on function public.training_personal_schedule(uuid,date,date) to authenticated, service_role;
