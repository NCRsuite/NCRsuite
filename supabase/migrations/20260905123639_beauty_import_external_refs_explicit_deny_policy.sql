drop policy if exists beauty_import_external_refs_no_direct_access on public.beauty_import_external_refs;

create policy beauty_import_external_refs_no_direct_access
on public.beauty_import_external_refs
for all
to authenticated
using (false)
with check (false);
