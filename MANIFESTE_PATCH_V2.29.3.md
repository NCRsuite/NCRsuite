# NCR Suite V2.29.3 - Alignements et contrastes publics

## Ce qui change

- Le flux, le catalogue et le dernier appel à l'action sont centrés sur ordinateur.
- Le catalogue repose sur un fond blanc avec une navigation métier compacte.
- Les validations sous Collecter, Orchestrer, Prouver et Piloter deviennent des badges discrets.
- Les informations des cartes recommandées retrouvent un contraste complet sur chaque page métier.
- Les fichiers CSS et JavaScript V2.29.3 forcent le renouvellement du cache.

## Ce qui ne change pas

- L'application connectée et les écrans métier.
- Les formulaires, routes et CTA existants.
- Les prix, produits Stripe, abonnements, rôles et droits.
- Les contenus SEO, le sitemap, les canonical et l'indexation.
- Les données Supabase et les fonctions existantes.

## Installation

Suivre uniquement `A_LIRE_INSTALLATION_V2.29.3.txt` :

1. Exécuter `supabase/migrations/117_public_ui_alignment_contrast.sql`.
2. Envoyer tous les fichiers du patch sur GitHub en conservant leur arborescence.
3. Attendre le build et le déploiement Cloudflare.
4. Renouveler le cache PWA.
5. Vérifier la vitrine sur ordinateur et mobile puis une connexion existante.

## Validation réalisée

- Audit statique NCR Suite : validé.
- Parcours critiques : validés.
- Préparation de release : validée.
- TypeScript et build Vite : validés.
- Génération des cinq pages SEO et du sitemap : validée.
- Contrôle visuel définitif à effectuer sur le domaine après le déploiement Cloudflare.
