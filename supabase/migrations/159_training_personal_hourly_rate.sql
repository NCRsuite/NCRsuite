alter table public.training_personal_interventions
  add column if not exists hourly_rate_cents bigint;

alter table public.training_personal_interventions
  drop constraint if exists training_personal_interventions_hourly_rate_check;

alter table public.training_personal_interventions
  add constraint training_personal_interventions_hourly_rate_check
  check (hourly_rate_cents is null or hourly_rate_cents >= 0);

comment on column public.training_personal_interventions.hourly_rate_cents is
  'Tarif horaire convenu pour le suivi personnel des interventions salariees. Information hors chiffre d affaires et hors BPF de l organisme declarant.';
