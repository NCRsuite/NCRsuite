# NCR Suite V1.8 — Expérience client

## Ordre d’installation

1. Exécuter `008_client_experience.sql` dans le SQL Editor Supabase.
2. Mettre à jour l’Edge Function `process-email-queue` avec le fichier du projet.
3. Envoyer l’intégralité de la V1.8 sur GitHub.
4. Attendre la coche verte Cloudflare.

## Tests recommandés

- Vérifier qu’une réservation est impossible sans cocher le consentement.
- Vérifier la présence du consentement dans `appointments.booking_consent_at`.
- Tester Google Agenda, Outlook et le fichier `.ics`.
- Déplacer puis annuler un rendez-vous depuis le lien privé.
- Contrôler les e-mails de confirmation, modification et annulation.
