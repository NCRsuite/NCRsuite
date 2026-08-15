# NCR Suite V2.29.14 — à appliquer

1. Exécuter `supabase/migrations/128_security_presence_photo_release_alignment.sql`.
2. Remplacer les fichiers du repo par ceux de ce patch.
3. Déployer.
4. Fermer complètement la PWA et la rouvrir.

Correctifs :
- photo arrivée/sortie toujours disponible ; obligatoire seulement si activée dans la fiche site ;
- alignement `platform_release_state`, frontend et cache sur V2.29.14 ;
- fin de la demande permanente de V2.29.12.
