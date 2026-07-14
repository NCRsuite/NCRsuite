# Documents Formation — V2.4.3

## Installation

Exécuter `supabase/migrations/020_training_documents.sql` après la migration 019.

La migration crée :

- la table `training_documents` ;
- le bucket privé `training-documents` ;
- les règles RLS et Storage par entreprise ;
- les catégories et contrôles de rattachement aux sessions et stagiaires.

## Formats acceptés

PDF, PNG, JPEG, WebP, Word, Excel et texte, avec une limite de 20 Mo par fichier.

## Vérification

1. Ouvrir un espace Formation.
2. Aller dans **Documents**.
3. Déposer un fichier lié à une session.
4. Actualiser la page.
5. Ouvrir le document via le lien temporaire.
6. Vérifier qu’un autre espace entreprise ne voit pas ce fichier.
