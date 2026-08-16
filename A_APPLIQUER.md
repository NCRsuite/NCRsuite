# Patch NCR Suite V2.29.18 depuis V2.29.17

1. Exécuter `supabase/migrations/132_training_bpf_mixed_activity_scope.sql` dans Supabase.
2. Remplacer les fichiers du dépôt par ceux de ce patch en conservant leur arborescence.
3. Déployer le front.
4. Fermer/réouvrir la PWA si nécessaire.
5. Dans BPF > Sources, qualifier les anciennes sessions : formation pro, apprentissage, initiale ou hors champ.

Si la base est encore en V2.29.15, exécuter d'abord les migrations 130 puis 131, puis 132.
