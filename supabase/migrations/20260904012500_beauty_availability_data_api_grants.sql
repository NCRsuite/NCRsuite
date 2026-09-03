
revoke all on table public.beauty_availability_blocks from anon;
revoke insert, update, delete, truncate, references, trigger on table public.beauty_availability_blocks from authenticated;
grant select on table public.beauty_availability_blocks to authenticated;
grant select, insert, update, delete on table public.beauty_availability_blocks to service_role;
