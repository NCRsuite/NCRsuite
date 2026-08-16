# NCR Suite V2.29.22 — Correctif définitif PDF multi-ligne

1. Exécuter `supabase/migrations/136_training_pdf_multiline_definitive.sql`.
2. Écraser les fichiers du dépôt avec le contenu de ce patch.
3. Déployer l'application.
4. Redéployer l'Edge Function `process-email-queue` pour les convocations/attestations automatiques.
5. Fermer complètement la PWA puis la rouvrir afin de charger le cache V2.29.22.

## Correction
- Les retours à la ligne ne sont plus transmis comme glyphes à `pdf-lib`.
- Chaque ligne est dessinée séparément dans le PDF.
- Les caractères non supportés par Helvetica sont ignorés au lieu de devenir `?`.
- Les champs mono-ligne des émargements remplacent un retour forcé par un séparateur lisible.
- Nouveau bundle `ncr-suite-app-v2922.js` et nouveau cache PWA pour empêcher l'ancien code V2.29.21 de rester servi.
