# NCR Suite V2.13.1 — Traductions publiques Restauration

Patch différentiel à appliquer sur la V2.13.0.

## Installation

1. Exécuter `supabase/migrations/066_restaurant_public_translations_complete.sql`.
2. Ajouter les fichiers du patch sur GitHub en conservant les chemins.
3. Vérifier le build Cloudflare.
4. Fermer puis rouvrir la PWA.
5. Dans **Restauration > Identité du menu public**, cliquer une fois sur **Publier cette identité** afin de générer les traductions des textes déjà enregistrés.

La fonction Supabase `translate-restaurant-menu` déjà utilisée par les plats est réutilisée. Aucun redéploiement d’Edge Function n’est nécessaire si elle est déjà en production.
