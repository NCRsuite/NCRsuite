# NCR Suite V2.29.4 - Signal automatique du flux public

## Ce qui change

- La barre fixe située au-dessus de Collecter, Orchestrer, Prouver et Piloter devient une ligne très fine.
- Un battement bleu type électrocardiogramme traverse automatiquement la ligne, marque une courte pause, puis recommence.
- Le réglage système de réduction des animations est respecté.
- Les fichiers CSS et JavaScript V2.29.4 forcent le renouvellement du cache.

## Ce qui ne change pas

- Les quatre cartes et tous leurs contenus.
- Le rendu mobile, où ce rail reste masqué.
- L'application connectée et les écrans métier.
- Les formulaires, routes, CTA, prix et pages métier.
- Stripe, les abonnements, rôles, droits et données.
- Les contenus SEO, le sitemap, les canonical et l'indexation.

## Installation

Suivre uniquement `A_LIRE_INSTALLATION_V2.29.4.txt` :

1. Exécuter `supabase/migrations/118_public_flow_signal.sql`.
2. Envoyer tous les fichiers du patch sur GitHub en conservant leur arborescence.
3. Attendre le build et le déploiement Cloudflare.
4. Renouveler le cache PWA.
5. Vérifier le cycle du signal sur ordinateur, puis une connexion existante.

## Validation réalisée

- Audit statique NCR Suite : validé.
- Parcours critiques : validés.
- Préparation de release : validée.
- TypeScript et build Vite : validés.
- Génération des cinq pages SEO et du sitemap : validée.
- Contrôle visuel définitif à effectuer sur le domaine après le déploiement Cloudflare.
