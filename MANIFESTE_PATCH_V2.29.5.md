# NCR Suite V2.29.5 - Animations publiques toujours actives

## Ce qui change

- La vitrine ne raccourcit plus ses animations quand macOS ou le navigateur demande moins de mouvement.
- Les sections de la page principale apparaissent à nouveau progressivement au défilement.
- Les pages Solutions métier conservent leurs apparitions, aperçus animés, graphiques et transitions.
- Le signal ECG reste visible et animé dans tous les réglages système.
- Les boutons, le menu Solutions métier et les interactions publiques conservent leurs retours visuels.
- Les fichiers CSS et JavaScript V2.29.5 forcent le renouvellement du cache.

## Ce qui ne change pas

- L'application connectée et ses règles de réduction des mouvements.
- Les écrans et automatisations métier.
- Les formulaires, routes, CTA, prix et contenus SEO.
- Stripe, les abonnements, rôles, droits et données.
- Le sitemap, les canonical et l'indexation.

## Fichiers du patch

- `supabase/migrations/119_public_motion_override.sql`
- `src/pages/PublicHomePage.tsx`
- `src/pages/PublicSolutionPage.tsx`
- `src/pages/AccessRequestPage.tsx`
- `src/styles.css`
- `src/config/runtime.ts`
- `public/ncr-suite-showcase-v295.css`
- `public/ncr-suite-app-v295.css`
- `public/sw.js`
- `public/_headers`
- `scripts/generate-public-showcase-css.mjs`
- `scripts/phase1-static-audit.mjs`
- `scripts/phase1-critical-flows.mjs`
- `scripts/phase1-release-readiness.mjs`
- `index.html`, `vite.config.ts`, `package.json` et `package-lock.json`
- `README.md`, `CHANGELOG.md` et les deux documents V2.29.5

## Installation

Suivre uniquement `A_LIRE_INSTALLATION_V2.29.5.txt` :

1. Exécuter `supabase/migrations/119_public_motion_override.sql`.
2. Envoyer tous les fichiers du patch sur GitHub en conservant leur arborescence.
3. Attendre le build et le déploiement Cloudflare.
4. Renouveler le cache PWA.
5. Vérifier les animations sur la page principale et une page Solution métier.

## Validation réalisée

- Audit statique NCR Suite : validé.
- Parcours critiques : validés.
- Préparation de release : validée.
- Contrôle dédié des règles `prefers-reduced-motion` publiques : validé.
- Compilation TypeScript : validée.
- Build Vite de production : validé.
- Génération des cinq pages SEO métier et du sitemap : validée.
- Contrôle visuel final à réaliser sur `ncr-suite.fr` après le déploiement Cloudflare, le serveur local étant interdit dans l'environnement de validation.
