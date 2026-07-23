# Changelog NCR Suite

## V2.16.0 — Formation · CRM et pipeline commercial

- Nouveau pipeline CRM intégré au module commercial Formation.
- Gestion des prospects et opportunités de la prise de contact jusqu’à la vente gagnée ou perdue.
- Suivi du montant potentiel, de la probabilité et de la date de décision estimée.
- Liste centralisée des relances et signalement des actions en retard.
- Historique des appels, e-mails, rendez-vous, tâches et notes.
- Transformation d’un prospect en fiche client sans ressaisie.
- Préparation d’un devis directement depuis une opportunité.
- Synchronisation automatique du pipeline avec le statut du dossier commercial.
- Cloisonnement multi-entreprises, contrôle par rôle et RLS Supabase.
- Cache PWA, producteurs PDF et audits synchronisés en V2.16.0.

## V2.15.4 — Super administration · SAV Formation

- Nouvelle console `SAV Formation` dans l’administration centrale, visible uniquement par les super administrateurs NCR.
- Vue globale des organismes Formation et des automatisations nécessitant une intervention.
- Diagnostic par session des évaluations initiales/finales, attestations, dossiers documentaires et e-mails en échec.
- Relance guidée des jobs documentaires et des e-mails Formation.
- Réparation contrôlée d’une session en réutilisant les automatisations validées en V2.15.2 et V2.15.3.
- Migration 075 sécurisée par le contrôle `is_platform_super_admin`.
- Cache PWA, producteurs PDF, processeur e-mail et monitoring synchronisés en V2.15.4.
## V2.15.3 — Formation · Intégrité des automatisations

- Ajout de la migration 074 pour rendre la file `training_document_jobs` autoportante dans le dépôt.
- Déclaration explicite des métadonnées de documents automatiques (`automation_key`, `generated_at`, `emailed_at`).
- Fonctions service-role de traitement documentaire : claim des jobs et payload PDF.
- Garde SQL contre la planification directe d’une session sans validation officielle.
- L’écran Sessions crée désormais en brouillon puis valide via `validate_training_session_workflow` lorsque le statut demandé est planifié ou en cours.
- Lecture complète des champs d’évaluations initiales/finales dans le PDF direct de session.
- Cache PWA et monitoring synchronisés en V2.15.3.

## V2.15.2 — Formation · Déroulement et clôture automatisés

- Évaluation initiale individuelle envoyée par Brevo lors de la validation de session.
- Évaluation finale individuelle envoyée par Brevo lors de la fin de session.
- Relances automatiques configurables pour les questionnaires sans réponse.
- Questionnaire public unique adapté au début ou à la fin de formation.
- Génération et envoi automatique des attestations selon les réglages de l’organisme.
- Contrôle automatique des émargements, évaluations et attestations.
- Finalisation automatique du dossier complet.
- Nouveau centre d’évaluations moderne et responsive.
- Cockpit et dossiers de formation raccordés à la clôture automatisée.
- Cache PWA et état de version synchronisés en V2.15.2.

## V2.15.1 — Formation · Documents premium & Brevo

- Moteur documentaire premium commun.
- Envois Brevo des documents commerciaux et convocations.
