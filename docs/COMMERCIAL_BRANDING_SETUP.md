# NCR Suite V1.9 — Personnalisation commerciale

## Ordre de déploiement

1. Exécuter `supabase/migrations/009_commercial_branding.sql` dans le SQL Editor Supabase.
2. Mettre à jour l'Edge Function `process-email-queue` avec le fichier présent dans `supabase/functions/process-email-queue/index.ts`.
3. Envoyer le contenu de la V1.9.0 à la racine du dépôt GitHub.
4. Attendre le déploiement Cloudflare Pages.
5. Passer l'entreprise de test en formule `professionnelle` avant de tester le module.

## Fonctionnalités

- Logo : PNG, JPG ou WebP, 2 Mo maximum.
- Bannière : PNG, JPG ou WebP, 5 Mo maximum.
- Lien public unique : `/reserver/identifiant`.
- Informations pratiques et aperçu en direct.
- La mention NCR Suite reste obligatoire en formule Professionnelle.
- Seule la formule Métier peut masquer la mention NCR Suite.

## Sécurité

Les images sont stockées dans le bucket public `organization-branding`. Seuls les responsables actifs d'une entreprise Professionnelle ou Métier peuvent écrire dans le dossier portant l'identifiant de leur entreprise.
