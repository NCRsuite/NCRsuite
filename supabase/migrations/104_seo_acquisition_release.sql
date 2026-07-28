begin;

alter table public.platform_access_requests
  add column if not exists acquisition_source text,
  add column if not exists acquisition_medium text,
  add column if not exists acquisition_campaign text,
  add column if not exists acquisition_content text,
  add column if not exists landing_path text,
  add column if not exists referrer_url text;

alter table public.platform_access_requests
  drop constraint if exists platform_access_requests_acquisition_source_length,
  add constraint platform_access_requests_acquisition_source_length
    check (acquisition_source is null or char_length(acquisition_source) <= 80),
  drop constraint if exists platform_access_requests_acquisition_medium_length,
  add constraint platform_access_requests_acquisition_medium_length
    check (acquisition_medium is null or char_length(acquisition_medium) <= 80),
  drop constraint if exists platform_access_requests_acquisition_campaign_length,
  add constraint platform_access_requests_acquisition_campaign_length
    check (acquisition_campaign is null or char_length(acquisition_campaign) <= 120),
  drop constraint if exists platform_access_requests_acquisition_content_length,
  add constraint platform_access_requests_acquisition_content_length
    check (acquisition_content is null or char_length(acquisition_content) <= 120),
  drop constraint if exists platform_access_requests_landing_path_length,
  add constraint platform_access_requests_landing_path_length
    check (landing_path is null or char_length(landing_path) <= 500),
  drop constraint if exists platform_access_requests_referrer_url_length,
  add constraint platform_access_requests_referrer_url_length
    check (referrer_url is null or char_length(referrer_url) <= 500);

update public.platform_access_requests
set acquisition_source=coalesce(acquisition_source,'direct'),
    acquisition_medium=coalesce(acquisition_medium,'none')
where acquisition_source is null or acquisition_medium is null;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.28.0','2.28.0','ncr-suite-shell-v2.28.0-seo-acquisition',
  now(),auth.uid(),
  'V2.28.0 : pages metier indexables, pre-rendu HTML, donnees structurees, sitemap et suivi des origines de demande.'
)
on conflict(singleton) do update set
  database_version=excluded.database_version,
  expected_frontend_version=excluded.expected_frontend_version,
  expected_pwa_cache=excluded.expected_pwa_cache,
  installed_at=excluded.installed_at,
  installed_by=excluded.installed_by,
  notes=excluded.notes;

commit;

select pg_notify('pgrst','reload schema');
