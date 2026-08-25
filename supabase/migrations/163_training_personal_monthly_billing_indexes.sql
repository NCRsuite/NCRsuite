-- NCR Suite — Facturation mensuelle Mon activité : index des clés de rattachement

begin;

create index if not exists idx_training_invoices_personal_activity_user
  on public.training_invoices(personal_activity_user_id)
  where personal_activity_user_id is not null;

create index if not exists idx_training_personal_interventions_billing_customer
  on public.training_personal_interventions(billing_customer_id)
  where billing_customer_id is not null;

commit;
