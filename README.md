# NCR Suite V2.29.11

## Release V2.29.17

L’espace Formateur dispose désormais de **Mon BPF** pour consolider les interventions réalisées en sous-traitance pour d’autres organismes. Depuis V2.29.15, appliquer d’abord `130_training_access_accounts_hardening.sql`, puis `131_training_trainer_personal_bpf.sql`. Voir `A_LIRE_V2.29.17_BPF_PERSONNEL_FORMATEUR.md`.


Base SaaS multi-métier NCR Suite.

Cette version remplace le signal ECG de la vitrine par une transmission visuelle
progressive entre Collecter, Orchestrer, Prouver et Piloter. L'application
connectée, Stripe, le référencement et les fonctions métier restent inchangés.

Consulter `A_LIRE_V2.29.11_VACATIONS_BLINDEES.md` pour déployer cette release.

## Release V2.29.16

Le bloc Formation « Droits & comptes » est durci. Appliquer `supabase/migrations/130_training_access_accounts_hardening.sql` avant de déployer le front. Voir `A_LIRE_V2.29.16_DROITS_COMPTES_FORMATION.md`.

