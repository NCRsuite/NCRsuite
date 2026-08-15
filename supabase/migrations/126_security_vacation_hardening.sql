-- NCR Suite V2.29.11 — Vacations Sécurité blindées
-- Une seule vacation réellement active par agent, récupération des vacations oubliées
-- et blocage des actions terrain sur une vacation ancienne non clôturée.

begin;

do $$
begin
  if to_regclass('public.security_shifts') is null
     or to_regclass('public.platform_release_state') is null then
    raise exception 'Les migrations Sécurité précédentes doivent être exécutées avant la V2.29.11.';
  end if;
end;
$$;

-- Verrou serveur fort : même avec deux appareils / deux clics simultanés,
-- un agent ne peut avoir qu'une seule vacation effectivement en poste.
-- Le verrou advisory sérialise les changements pour un même agent et évite
-- la course classique entre deux prises de poste concurrentes.
create or replace function public.enforce_single_active_security_shift()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if new.status = 'in_progress'
     and new.clocked_in_at is not null
     and new.clocked_out_at is null then

    perform pg_advisory_xact_lock(
      hashtextextended(new.organization_id::text || ':' || new.agent_id::text, 0)
    );

    if exists (
      select 1
      from public.security_shifts s
      where s.organization_id = new.organization_id
        and s.agent_id = new.agent_id
        and s.id <> new.id
        and s.status = 'in_progress'
        and s.clocked_in_at is not null
        and s.clocked_out_at is null
    ) then
      raise exception 'Une autre vacation est déjà active pour cet agent. Termine ou régularise la vacation en cours avant d’en démarrer une nouvelle.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_single_active_security_shift_trigger on public.security_shifts;
create trigger enforce_single_active_security_shift_trigger
before insert or update of organization_id, agent_id, status, clocked_in_at, clocked_out_at
on public.security_shifts
for each row execute procedure public.enforce_single_active_security_shift();

-- Défense en profondeur : même un INSERT direct sur security_patrols par un compte
-- agent doit référencer sa propre vacation réellement prise et encore ouverte.
drop policy if exists security_patrols_agent_insert on public.security_patrols;
create policy security_patrols_agent_insert on public.security_patrols for insert
with check (
  public.is_security_manager(organization_id)
  or (
    agent_id = public.current_security_agent_id(organization_id)
    and shift_id is not null
    and exists (
      select 1
      from public.security_shifts s
      where s.organization_id = security_patrols.organization_id
        and s.id = security_patrols.shift_id
        and s.agent_id = public.current_security_agent_id(s.organization_id)
        and s.site_id = security_patrols.site_id
        and s.status = 'in_progress'
        and s.clocked_in_at is not null
        and s.clocked_out_at is null
        and s.logbook_status = 'open'
        and s.dossier_status = 'open'
    )
  )
);

-- La main courante reste utilisable pendant une vacation active et pendant
-- une marge raisonnable de dépassement. Une ancienne vacation oubliée depuis
-- plus de 8 h doit uniquement être clôturée/régularisée, pas continuer à
-- recevoir des événements comme si elle était encore en cours.
create or replace function public.create_security_logbook_entry(
  p_organization_id uuid,
  p_shift_id uuid,
  p_category text,
  p_severity text,
  p_title text,
  p_details text default null,
  p_occurred_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_shift public.security_shifts%rowtype;
  v_agent uuid;
  v_manager boolean;
  v_entry_id uuid;
  v_title text := trim(coalesce(p_title, ''));
  v_category text := lower(trim(coalesce(p_category, '')));
  v_severity text := lower(trim(coalesce(p_severity, 'info')));
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if not public.organization_has_plan_feature(p_organization_id, 'security_smart_logbook') then
    raise exception 'La main courante n’est pas activée pour cet espace.';
  end if;

  if v_category not in ('prise_poste','fin_poste','ronde','anomalie','incident','visiteur','livraison','appel','consigne','autre') then
    raise exception 'Type d’événement invalide.';
  end if;
  if v_severity not in ('info','attention','urgent') then
    raise exception 'Niveau de gravité invalide.';
  end if;
  if char_length(v_title) < 2 or char_length(v_title) > 180 then
    raise exception 'Le titre doit contenir entre 2 et 180 caractères.';
  end if;

  v_manager := public.is_security_manager(p_organization_id);
  v_agent := public.current_security_agent_id(p_organization_id);

  select * into v_shift
  from public.security_shifts
  where organization_id = p_organization_id
    and id = p_shift_id
  for update;

  if v_shift.id is null then
    raise exception 'Vacation introuvable.';
  end if;
  if v_shift.status = 'canceled' then
    raise exception 'Cette vacation est annulée.';
  end if;
  if v_shift.logbook_status = 'closed' then
    raise exception 'La main courante de cette vacation est clôturée.';
  end if;
  if v_shift.dossier_status in ('closed','archived') then
    raise exception 'Le dossier de cette vacation est déjà clôturé.';
  end if;

  if not v_manager then
    if v_agent is null or v_shift.agent_id <> v_agent then
      raise exception 'Cette vacation ne vous est pas attribuée.';
    end if;
    if v_shift.clocked_in_at is null then
      raise exception 'Prends d’abord ton poste avant d’ajouter un événement.';
    end if;
    if v_shift.clocked_out_at is not null or v_shift.status = 'completed' then
      raise exception 'Cette vacation est déjà terminée.';
    end if;
    if now() > v_shift.ends_at + interval '8 hours' then
      raise exception 'Cette ancienne vacation n’a pas été clôturée. Termine d’abord la vacation depuis l’accueil avant d’ajouter un nouvel événement.';
    end if;
  end if;

  insert into public.security_logbook_entries(
    organization_id,
    shift_id,
    site_id,
    agent_id,
    occurred_at,
    category,
    severity,
    title,
    details,
    status,
    created_by
  ) values (
    p_organization_id,
    v_shift.id,
    v_shift.site_id,
    v_shift.agent_id,
    coalesce(p_occurred_at, now()),
    v_category,
    v_severity,
    v_title,
    nullif(trim(coalesce(p_details, '')), ''),
    'open',
    auth.uid()
  )
  returning id into v_entry_id;

  insert into public.audit_logs(organization_id, user_id, action, entity_type, entity_id, metadata)
  values (
    p_organization_id,
    auth.uid(),
    'security_logbook_entry_created',
    'security_logbook_entry',
    v_entry_id,
    jsonb_build_object(
      'shift_id', v_shift.id,
      'site_id', v_shift.site_id,
      'agent_id', v_shift.agent_id,
      'category', v_category,
      'severity', v_severity,
      'source', case when v_manager then 'qg' else 'agent' end
    )
  );

  return v_entry_id;
end;
$$;

revoke all on function public.create_security_logbook_entry(uuid,uuid,text,text,text,text,timestamptz) from public, anon;
grant execute on function public.create_security_logbook_entry(uuid,uuid,text,text,text,text,timestamptz) to authenticated;

insert into public.platform_release_state(
  singleton,database_version,expected_frontend_version,expected_pwa_cache,
  installed_at,installed_by,notes
) values (
  true,'2.29.11','2.29.11','ncr-suite-shell-v2.29.11-security-vacation-hardening',
  now(),auth.uid(),
  'V2.29.11 : une seule vacation active par agent, récupération des anciennes vacations oubliées et blocage des actions terrain sur une vacation périmée.'
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
