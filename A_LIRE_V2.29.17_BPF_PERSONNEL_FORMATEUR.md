# NCR Suite V2.29.17 — BPF personnel formateur

## Ordre de déploiement depuis V2.29.15

1. Exécuter `supabase/migrations/130_training_access_accounts_hardening.sql`.
2. Exécuter `supabase/migrations/131_training_trainer_personal_bpf.sql`.
3. Déployer le frontend V2.29.17.
4. Fermer/réouvrir la PWA si elle était déjà installée.

## Ce qui change

- Le centre qualifie chaque formateur comme `Interne / salarié` ou `Externe / sous-traitant` depuis la page **Formateurs**.
- Un formateur invité dans l'**Espace Formation** dispose d'un nouvel onglet **Mon BPF**.
- Les sessions terminées qui lui sont attribuées comme formateur externe remontent automatiquement, y compris si elles proviennent de plusieurs organismes NCR Suite.
- NCR calcule automatiquement le nombre de stagiaires et les heures-stagiaires issus des dossiers/émargements.
- Le formateur complète le montant HT réellement facturé au centre, la référence et la date de facture.
- La synthèse présente séparément les données pédagogiques de sous-traitance et le total des montants renseignés.
- Export CSV disponible.
- Le formateur ne voit jamais le BPF global, les factures clients ou les données financières globales du centre donneur d'ordre.

## Important

Cette vue est un **suivi BPF sous-traitance**. Elle ne remplace pas le BPF complet de l'organisme du formateur lorsqu'il possède sa propre activité de formation : elle prépare les éléments des interventions réalisées pour d'autres organismes.
