create or replace function private.tag_public_beauty_booking_origin(
  p_token uuid,
  p_origin text,
  p_detail text default null,
  p_meta jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $function$
declare
  v_updated integer;
begin
  if p_token is null then return false; end if;
  if p_origin not in ('public_page','qr_code','widget','direct_link') then
    raise exception 'Canal de réservation invalide.';
  end if;
  if p_meta is null or jsonb_typeof(p_meta)<>'object' or octet_length(p_meta::text)>2048 then
    raise exception 'Métadonnées de provenance invalides.';
  end if;

  update public.appointments a
  set booking_origin=p_origin,
      booking_origin_detail=left(nullif(trim(coalesce(p_detail,'')),''),120),
      booking_origin_meta=coalesce(a.booking_origin_meta,'{}'::jsonb) || p_meta,
      updated_at=now()
  where a.public_token=p_token
    and a.source='public'
    and a.company_id is not null
    and a.created_at>now()-interval '15 minutes'
    and a.booking_origin in ('unknown','public_page');

  get diagnostics v_updated=row_count;
  return v_updated>0;
end;
$function$;