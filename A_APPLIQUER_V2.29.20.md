# Passage NCR Suite V2.29.19 → V2.29.20

1. Exécuter `supabase/migrations/134_training_premium_documents_release.sql` dans Supabase.
2. Copier le contenu de ce patch à la racine du dépôt NCR Suite en conservant l'arborescence.
3. Déployer le frontend comme d'habitude.
4. Important : le template de convocation automatique est dans `supabase/functions/process-email-queue/index.ts`. Si vos Edge Functions ne sont pas déployées automatiquement avec le dépôt, redéployer `process-email-queue` avec votre procédure Supabase habituelle.
5. Fermer/réouvrir la PWA si elle était déjà ouverte.

Tests conseillés :
- générer un devis et vérifier la zone « Bon pour accord » ;
- générer une convention/contrat et vérifier les signatures ;
- valider une session test et vérifier la nouvelle convocation ;
- vérifier qu'une convocation présentielle sans lieu est bloquée avec une erreur explicite plutôt que générée incomplète.
