# À appliquer — V2.29.21

Base attendue : V2.29.20.

1. Exécuter `supabase/migrations/135_training_bpf_guided_completed_session_fix.sql` dans Supabase.
2. Remplacer les fichiers du dépôt par ceux de ce patch en conservant les chemins.
3. Déployer.
4. Fermer/réouvrir la PWA si elle conserve l'ancienne version.

Test rapide : BPF > Mode guidé > Mes formations > qualifier une session clôturée, puis classer un stagiaire.
