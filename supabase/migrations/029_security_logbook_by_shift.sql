-- NCR Suite V2.5.2 — Sécurité · Main courante par vacation
-- À exécuter après 028_security_essential_field.sql.
-- Corrige l’ambiguïté PostgREST des alertes et rattache chaque nouvelle
-- entrée de main courante à une mission précise (site + agent + vacation).

begin;

alter table public.security_logbook_entries
  add column if not exists shift_id uuid;

do $$
begin
  alter table public.security_logbook_entries
    add constraint security_logbook_shift_fk
    foreign key (organization_id, shift_id)
    references public.security_shifts(organization_id, id)
    on delete restrict;
exception when duplicate_object then null;
end $$;

-- Reprise des anciennes entrées lorsqu’une mission correspond exactement
-- au site, à l’agent et à l’heure de l’événement.
update public.security_logbook_entries e
set shift_id = (
  select s.id
  from public.security_shifts s
  where s.organization_id = e.organization_id
    and s.site_id = e.site_id
    and s.agent_id = e.agent_id
    and s.status <> 'canceled'
    and e.occurred_at between s.starts_at - interval '1 hour' and s.ends_at + interval '2 hours'
  order by
    case when e.occurred_at between s.starts_at and s.ends_at then 0 else 1 end,
    abs(extract(epoch from (e.occurred_at - s.starts_at)))
  limit 1
)
where e.shift_id is null
  and exists (
    select 1
    from public.security_shifts s
    where s.organization_id = e.organization_id
      and s.site_id = e.site_id
      and s.agent_id = e.agent_id
      and s.status <> 'canceled'
      and e.occurred_at between s.starts_at - interval '1 hour' and s.ends_at + interval '2 hours'
  );

create index if not exists idx_security_logbook_shift_date
  on public.security_logbook_entries(organization_id, shift_id, occurred_at);

create or replace function public.validate_security_logbook_shift()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_shift public.security_shifts%rowtype;
  v_agent uuid;
begin
  if new.shift_id is null then
    raise exception 'Une mission doit être sélectionnée pour alimenter la main courante.';
  end if;

  select * into v_shift
  from public.security_shifts
  where organization_id = new.organization_id
    and id = new.shift_id;

  if not found then
    raise exception 'Mission introuvable.';
  end if;

  if v_shift.status = 'canceled' then
    raise exception 'La main courante ne peut pas être alimentée pour une mission annulée.';
  end if;

  -- Le site et l’agent proviennent toujours de la mission : le navigateur
  -- ne peut pas rattacher une entrée à un autre site ou à un autre agent.
  new.site_id := v_shift.site_id;
  new.agent_id := v_shift.agent_id;

  if new.occurred_at < v_shift.starts_at - interval '1 hour'
     or new.occurred_at > v_shift.ends_at + interval '2 hours' then
    raise exception 'L’heure de l’événement doit correspondre à la vacation sélectionnée.';
  end if;

  if not public.is_security_manager(new.organization_id) then
    v_agent := public.current_security_agent_id(new.organization_id);
    if v_agent is null or v_agent <> v_shift.agent_id then
      raise exception 'Cette mission ne vous est pas affectée.';
    end if;
  end if;

  return new;
end;
$$;

-- L’ancien contrôle site/agent est remplacé par le contrôle complet de mission.
drop trigger if exists validate_security_logbook_owner on public.security_logbook_entries;
drop trigger if exists validate_security_logbook_shift_record on public.security_logbook_entries;
create trigger validate_security_logbook_shift_record
before insert or update of shift_id, site_id, agent_id, occurred_at
on public.security_logbook_entries
for each row execute procedure public.validate_security_logbook_shift();

-- Une entrée est visible et créable uniquement dans la main courante de la
-- mission correspondante. Les responsables conservent la vue complète.
drop policy if exists security_logbook_member_select on public.security_logbook_entries;
create policy security_logbook_member_select
on public.security_logbook_entries for select
using (
  public.is_security_manager(organization_id)
  or (
    agent_id = public.current_security_agent_id(organization_id)
    and shift_id is not null
    and exists (
      select 1
      from public.security_shifts s
      where s.organization_id = security_logbook_entries.organization_id
        and s.id = security_logbook_entries.shift_id
        and s.agent_id = public.current_security_agent_id(s.organization_id)
    )
  )
);

drop policy if exists security_logbook_member_insert on public.security_logbook_entries;
create policy security_logbook_member_insert
on public.security_logbook_entries for insert
with check (
  public.is_security_manager(organization_id)
  or (
    agent_id = public.current_security_agent_id(organization_id)
    and shift_id is not null
    and exists (
      select 1
      from public.security_shifts s
      where s.organization_id = security_logbook_entries.organization_id
        and s.id = security_logbook_entries.shift_id
        and s.agent_id = public.current_security_agent_id(s.organization_id)
        and s.status <> 'canceled'
    )
  )
);

comment on column public.security_logbook_entries.shift_id is
  'Mission/vacation à laquelle appartient obligatoirement la nouvelle entrée de main courante.';

-- Force PostgREST à recalculer les relations après l’ajout de la FK.
notify pgrst, 'reload schema';

commit;
