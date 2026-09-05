create index if not exists appointments_org_company_client_start_idx
  on public.appointments(organization_id,company_id,client_id,starts_at desc);

create index if not exists beauty_client_consents_latest_idx
  on public.beauty_client_consents(
    organization_id,company_id,client_id,consent_type,recorded_at desc,id desc
  );
