# Changelog NCR Suite

## V2.19.0 — Formation · Qualiopi, conformité et preuves

- Nouveau module `Qualiopi & conformité` réservé aux responsables Formation.
- Référentiel interne structuré en 7 critères et 32 indicateurs.
- Statut, applicabilité, responsable, échéance, constat et actions par indicateur.
- Réutilisation automatique des programmes, convocations, supports, attestations et évaluations déjà présents.
- Dépôt de preuves complémentaires avec date, expiration et session liée.
- Détection des indicateurs sans preuve et des preuves à renouveler.
- Calendrier des audits initial, surveillance, renouvellement et interne.
- Résultat d’audit et photographie des indicateurs et preuves lors de la clôture.
- Exports de préparation PDF et CSV.
- Cloisonnement multi-entreprises, rôles, fonctions contrôlées et RLS Supabase.
- Cache PWA et audits techniques synchronisés en V2.19.0.

## V2.18.0 — Formation · Facturation et encaissements

- Création de factures depuis les dossiers commerciaux acceptés, signés ou réalisés.
- Facturation partielle et partage entre client et financeur sans dépasser le montant commercial.
- Numérotation définitive par organisme et par exercice lors de l’émission.
- Factures et avoirs PDF avec identité figée du vendeur et du payeur.
- Historique des encaissements partiels ou complets et calcul du solde.
- Suivi des échéances, retards et relances automatiques Brevo.
- Réglages de paiement, mentions TVA, pénalités et coordonnées bancaires.
- BPF alimenté par les factures et avoirs émis dès qu’ils existent sur l’exercice.
- Conservation du calcul commercial V2.17.0 pour les anciens exercices sans facture.
- Cloisonnement multi-entreprises, rôles, fonctions contrôlées et RLS Supabase.
- Cache PWA, producteurs PDF, processeur e-mail et audits synchronisés en V2.18.0.

## V2.17.0 — Formation · BPF automatique

- Nouveau module annuel `BPF automatique`.
- Calcul des produits HT selon les rubriques du cadre C du Cerfa 10443*17.
- Saisie contrôlée du chiffre d’affaires et des charges du cadre D.
- Calcul des formateurs, stagiaires, heures-stagiaires, objectifs et spécialités des cadres E, F1 à F4 et G.
- Proratisation des heures à partir des émargements, avec possibilité de correction explicite.
- Classification centrale des publics, programmes, formateurs, modes de réalisation et produits commerciaux.
- Préclassement automatique uniquement lorsque les données permettent une déduction fiable.
- Contrôles bloquants et points de vigilance avant validation.
- Brouillon annuel, statut vérifié, verrouillage et réouverture réservée aux responsables.
- Exports préparatoires PDF et CSV.
- Cloisonnement multi-entreprises, rôles et RLS Supabase.
- Cache PWA, producteurs PDF, processeur e-mail et audits synchronisés en V2.17.0.

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
