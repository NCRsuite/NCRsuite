# NCR Suite — Patch V2.29.17 depuis V2.29.15

1. Exécuter `supabase/migrations/130_training_access_accounts_hardening.sql`.
2. Exécuter `supabase/migrations/131_training_trainer_personal_bpf.sql`.
3. Remplacer les fichiers du dépôt par ceux du patch en conservant leur arborescence.
4. Déployer.
5. Fermer puis rouvrir la PWA si nécessaire.

Ne pas inverser les migrations 130 et 131.
