# Pack Formation — V2.4.0

## Installation

1. Exécuter `supabase/migrations/017_training_pack_core.sql`.
2. Déployer le code V2.4.0 sur GitHub.
3. Attendre le déploiement Cloudflare Pages.
4. Créer ou ouvrir un espace dont le domaine est `formation`.

## Ordre de test

1. Créer une formation.
2. Ajouter un formateur.
3. Ajouter plusieurs stagiaires.
4. Créer une session et sélectionner les stagiaires.
5. Modifier le statut de la session.
6. Actualiser puis se reconnecter.
7. Vérifier l’isolation avec une seconde entreprise.

## Périmètre

La V2.4.0 couvre le catalogue, les personnes et les sessions. Les documents, convocations, émargements, évaluations et attestations seront branchés dans les versions suivantes.
