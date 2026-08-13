# NCR Suite V2.29.6 - Transmission progressive du flux public

## Ce qui change

- Le tracé ECG est remplacé par une ligne de transmission fine et discrète.
- Un point bleu parcourt automatiquement les étapes Collecter, Orchestrer, Prouver et Piloter.
- La progression bleue matérialise l'information déjà transmise.
- L'icône et la carte atteintes s'illuminent et se soulèvent légèrement.
- Le cycle dure huit secondes et recommence sans intervention.
- Le rail est aligné sur le centre réel de chaque carte.
- Les aperçus des cinq pages Solutions métier entrent verticalement et ne glissent plus sur leurs titres.

## Ce qui ne change pas

- Le rendu mobile et tablette déjà validé.
- L'application connectée et ses animations.
- Les routes, contenus, CTA, tarifs et pages Solutions métier.
- Stripe, Supabase métier, abonnements, rôles, droits et données.
- Le sitemap, les canonical et l'indexation.

## Fichiers du patch

- `supabase/migrations/120_public_flow_transmission.sql`
- `src/pages/PublicHomePage.tsx`
- `src/pages/PublicSolutionPage.tsx`
- `src/styles.css`
- `src/config/runtime.ts`
- `public/ncr-suite-showcase-v296.css`
- `public/ncr-suite-app-v296.css`
- `public/sw.js`
- `public/_headers`
- `scripts/generate-public-showcase-css.mjs`
- `scripts/phase1-static-audit.mjs`
- `scripts/phase1-critical-flows.mjs`
- `scripts/phase1-release-readiness.mjs`
- `index.html`, `vite.config.ts`, `package.json` et `package-lock.json`
- `README.md`, `CHANGELOG.md` et les deux documents V2.29.6

## Installation

Suivre uniquement `A_LIRE_INSTALLATION_V2.29.6.txt` :

1. Exécuter `supabase/migrations/120_public_flow_transmission.sql`.
2. Envoyer tous les fichiers du patch sur GitHub en conservant leur arborescence.
3. Attendre le build et le déploiement Cloudflare.
4. Renouveler le cache PWA.
5. Contrôler le flux sur ordinateur et l'absence de changement sur mobile.

## Validation réalisée

- Audit statique NCR Suite : validé.
- Parcours critiques : validés.
- Préparation de release : validée.
- Compilation TypeScript : validée.
- Build Vite de production : validé.
- Génération des cinq pages SEO métier et du sitemap : validée.
- Vérification statique du positionnement des quatre étapes et du correctif commun aux cinq pages métier : validée.
- Contrôle final du rendu réel : à effectuer après le déploiement Cloudflare, sur ordinateur puis sur mobile.
