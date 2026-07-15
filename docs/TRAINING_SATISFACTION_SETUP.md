# NCR Suite V2.4.6 — Évaluations et satisfaction Formation

## Installation

1. Exécuter `supabase/migrations/023_training_satisfaction.sql` après la migration 022.
2. Remplacer intégralement le code de l’Edge Function `process-email-queue` par la version V2.4.6.
3. Conserver `Verify JWT` désactivé et le Cron existant. Aucun nouveau secret n’est nécessaire.
4. Déployer l’application sur GitHub / Cloudflare.

## Fonctionnement

- Quand une session passe au statut **Terminée**, un questionnaire individuel est préparé pour chaque stagiaire inscrit.
- Le lien est envoyé automatiquement par Brevo selon le délai configuré.
- Le stagiaire répond sans créer de compte.
- L’organisme consulte le taux de réponse, la note moyenne, le taux de recommandation et les commentaires dans **Formation → Évaluations**.
- Le bouton **Envoyer / relancer** permet de renvoyer les questionnaires d’une session terminée.

Les e-mails Coiffure, les invitations d’équipe, les convocations et les attestations restent traités par la même Edge Function.
