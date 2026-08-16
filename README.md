# NCR Suite V2.29.19

## Release V2.29.19

Le BPF Formation dispose désormais d'un **Assistant guidé** destiné aux nouveaux formateurs et organismes : qualification pas à pas, classement simplifié des stagiaires et recettes, contrôles NCR et synthèse prête à reporter. Le mode expert reste disponible. Appliquer `133_training_bpf_guided_assistant_release.sql` après la V2.29.18. Voir `A_LIRE_V2.29.19_ASSISTANT_BPF_GUIDE.md`.


Le BPF Formation gère désormais l’activité mixte : formation professionnelle continue, apprentissage, formation initiale et hors champ sont séparés. Les sous-traitances éligibles d’un formateur peuvent être consolidées dans son propre organisme déclarant NCR Suite sans mélanger le BPF du centre donneur d’ordre. Appliquer `132_training_bpf_mixed_activity_scope.sql` après la V2.29.17. Voir `A_LIRE_V2.29.18_BPF_ACTIVITE_MIXTE.md`.


## Release V2.29.17

L’espace Formateur dispose désormais de **Mon BPF** pour consolider les interventions réalisées en sous-traitance pour d’autres organismes. Depuis V2.29.15, appliquer d’abord `130_training_access_accounts_hardening.sql`, puis `131_training_trainer_personal_bpf.sql`. Voir `A_LIRE_V2.29.17_BPF_PERSONNEL_FORMATEUR.md`.


Base SaaS multi-métier NCR Suite.

Cette version remplace le signal ECG de la vitrine par une transmission visuelle
progressive entre Collecter, Orchestrer, Prouver et Piloter. L'application
connectée, Stripe, le référencement et les fonctions métier restent inchangés.

Consulter `A_LIRE_V2.29.11_VACATIONS_BLINDEES.md` pour déployer cette release.

## Release V2.29.16

Le bloc Formation « Droits & comptes » est durci. Appliquer `supabase/migrations/130_training_access_accounts_hardening.sql` avant de déployer le front. Voir `A_LIRE_V2.29.16_DROITS_COMPTES_FORMATION.md`.

