# NCR Suite V2.29.18 — BPF activité mixte

## Objectif

Cette release évite de mélanger automatiquement toutes les activités d’un formateur dans le BPF.

Chaque session terminée doit désormais être qualifiée :

- `professional_continuing` — Formation professionnelle continue : incluse au BPF.
- `apprenticeship` — Apprentissage : incluse au BPF.
- `initial_education` — Formation initiale scolaire / universitaire : conservée dans NCR Suite mais exclue du BPF.
- `out_of_scope` — Hors champ BPF : conservée dans NCR Suite mais exclue du BPF.
- `review_required` — À qualifier : exclue du calcul tant que le centre n’a pas tranché.

## Cas d’usage type

Un formateur peut cumuler :

1. des SST vendus directement par son propre organisme ;
2. des SST ou autres formations professionnelles réalisées pour un autre organisme ;
3. des cours de BTS relevant de la formation initiale ;
4. éventuellement des interventions BTS relevant de l’apprentissage / formation professionnelle.

NCR Suite conserve toutes les activités, mais le BPF ne retient que les activités qualifiées comme éligibles.

Les interventions éligibles réalisées pour un autre organisme alimentent le suivi de sous-traitance du formateur. S’il possède son propre organisme Formation dans NCR Suite et qu’il le sélectionne comme organisme déclarant, ces interventions sont consolidées dans ce même BPF : données pédagogiques de sous-traitance + produits correspondants.

## Anti-double comptage

Si la facture de sous-traitance existe déjà dans la facturation Formation de l’organisme déclarant et que sa référence correspond à celle renseignée dans « Mon BPF », le montant saisi dans « Mon BPF » n’est pas ajouté une seconde fois. NCR demande en revanche que cette facture soit correctement classée dans la catégorie BPF « Autres organismes de formation ».

## Factures hors BPF

Les factures Formation disposent désormais du champ `bpf_included`. Une facture liée à une activité hors champ BPF peut rester dans la comptabilité NCR Suite tout en étant explicitement exclue du calcul BPF.

## Migration

Si la V2.29.17 est déjà installée :

```text
supabase/migrations/132_training_bpf_mixed_activity_scope.sql
```

Si la base est encore en V2.29.15, appliquer dans l’ordre :

```text
supabase/migrations/130_training_access_accounts_hardening.sql
supabase/migrations/131_training_trainer_personal_bpf.sql
supabase/migrations/132_training_bpf_mixed_activity_scope.sql
```

## Attention après migration

Les sessions existantes sont volontairement initialisées en `review_required`. Elles doivent être qualifiées une fois dans les sources BPF avant d’être intégrées au calcul. Ce comportement évite d’intégrer silencieusement une ancienne session de formation initiale.

## Version

- Frontend : `2.29.18`
- Base : `2.29.18`
- Cache PWA : `ncr-suite-shell-v2.29.18-bpf-mixed-activity`
