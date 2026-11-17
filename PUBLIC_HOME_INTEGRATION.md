# NCR Suite — intégration de la vitrine publique

2 octobre 2026 — **branche locale prête pour revue, non déployée**.

## Branche et base

- Dépôt : `NCRsuite/NCRsuite`.
- Branche : `feature/new-public-home`.
- Base : `main`, commit `ef8612a883ed30b825f828140e6c7656ae6996bd`. Même SHA confirmé sur le dépôt distant le 2 octobre.
- Copie de travail : `/Users/ec/Documents/Codex/2026-09-30/tu-serais-capable-de-me-rendre/work/ncr-suite-official`.
- Aucun push, aucune PR, aucun merge, aucun déploiement. La branche est locale.

## Intégration

Seule `PublicHomePage` est remplacée. Le routage officiel reste inchangé : `/` sans session et hors PWA affiche la vitrine ; les utilisateurs connectés gardent AppShell et leur dashboard ; la PWA conserve son démarrage historique sur la connexion. Connexion, accès et liens métier utilisent les routes locales existantes. Le catalogue tarifaire est celui du dépôt, sans copie divergente.

Le dépôt impose un bundle applicatif unique et son précache PWA. Cette contrainte est conservée, sans toucher à Vite, au Service Worker ni aux workflows. Un module ESM marketing séparé, nommé par empreinte de contenu, est produit avant le build officiel. Seule PublicHomePage l’importe à la demande ; il n’est pas ajouté au précache PWA. Le composant partage l’instance React de la SaaS via une référence temporaire supprimée après import : ni React ni ReactDOM ne sont dupliqués dans le module marketing, et aucun second arbre React n’est créé.

Le module fait 813 522 octets non compressés. Vérification du bundle applicatif : absence des marqueurs WebGLRenderer, product-carousel, story-selector et NCRHomeInter. Ces ressources restent dans le module marketing.

CSS : 586 règles de premier niveau contrôlées sous `#ncr-public-home`, classe racine `.ncr-public-home`, animations et propriétés CSS nommées spécifiquement. Le style est un enfant React retiré au démontage. Aucune modification de `html` ou `body`. La police existante `/fonts/inter-variable.woff2` est réutilisée avec un nom réservé à la vitrine. Aucun asset applicatif existant supprimé.

Les apparitions de sections conservent leur animation V3, avec un IntersectionObserver local à la place des écouteurs globaux ScrollTrigger. La 3D et le carousel V3 sont conservés. Les timers de préparation sont annulés au démontage ; les URL temporaires sont révoquées ; les scènes libèrent leurs ressources.

## Fichiers existants modifiés — liste exacte

- `package-lock.json`
- `package.json`
- `scripts/phase1-critical-flows.mjs`
- `scripts/phase1-release-readiness.mjs`
- `scripts/phase1-static-audit.mjs`
- `src/pages/PublicHomePage.tsx`

## Nouveaux fichiers — liste exacte

- `PUBLIC_HOME_INTEGRATION.md`
- `public/public-home/runtime-47317be32e311f0e.js`
- `scripts/audit-public-home.mjs`
- `scripts/build-public-home.mjs`
- `src/components/public-home/App.tsx`
- `src/components/public-home/components/Avantages.tsx`
- `src/components/public-home/components/Faq.tsx`
- `src/components/public-home/components/Final.tsx`
- `src/components/public-home/components/Footer.tsx`
- `src/components/public-home/components/Header.tsx`
- `src/components/public-home/components/Logo.tsx`
- `src/components/public-home/components/Metiers.tsx`
- `src/components/public-home/components/Offres.tsx`
- `src/components/public-home/components/Produit.tsx`
- `src/components/public-home/components/Socle.tsx`
- `src/components/public-home/components/Story.tsx`
- `src/components/public-home/components/VerticalSelector.tsx`
- `src/components/public-home/components/useReveal.ts`
- `src/components/public-home/data.ts`
- `src/components/public-home/logoGeometry.ts`
- `src/components/public-home/moduleUrl.ts`
- `src/components/public-home/offers.ts`
- `src/components/public-home/runtime.tsx`
- `src/components/public-home/styles.d.ts`
- `src/components/public-home/styles.scoped.css`
- `src/components/public-home/styles.source.css`
- `src/components/public-home/three/FinalScene.ts`
- `src/components/public-home/three/StoryScene.ts`
- `src/components/public-home/three/common.ts`
- `src/components/public-home/three/scrollGeometry.ts`
- `src/components/public-home/three/ui.ts`
- `src/components/public-home/verticals.ts`

## Dépendances

Ajoutées : `three@0.186.0`, `gsap@3.15.0`, `lucide-react@1.49.0`.

Développement : `@types/three@0.186.0`, `esbuild@0.28.2`, déclaration explicite de `postcss@8.5.18` déjà présent transitivement. Aucune version de dépendance préexistante changée, aucune dépendance supprimée. React reste en 18.3.1. Aucun Tailwind/plugin Vite ajouté : la feuille CSS compilée de V3 est intégrée comme source CSS indépendante et isolée.

## Build et audits

- `npm ci` avec cache de travail : réussi depuis le lockfile final.
- `npm run build` : TypeScript, Vite, génération SEO et tous les audits du script conservés.
- `npm run audit:phase1`, `npm run test:critical`, `npm run test:release` : validations statiques réussies.
- Le build conserve son avertissement historique de bundle applicatif supérieur à 3200 kB. Aucun seuil relevé, aucun contrôle contourné.
- npm signale 4 alertes de dépendances (3 modérées, 1 haute). Le premier npm ci avant intégration en signalait 6 ; les versions préexistantes sont restées identiques. Aucun audit fix global exécuté hors périmètre.

Les trois scripts d’audit contenaient des recherches littérales des classes et animations de l’ancienne vitrine. Seules ces assertions propres à PublicHomePage ont été remplacées par `audit-public-home.mjs` : isolation CSS, destinations, catalogue officiel, import différé, nettoyage et séparation PWA. Les contrôles des autres pages, de sécurité, d’authentification et de backend sont conservés. Le diff permet de vérifier exactement ce remplacement.

## Non-régression locale

22 scénarios exécutés avec le véritable App.tsx, mais des sessions/providers et frontières de pages simulés. Ils valident la décision de routage, pas une authentification réelle ni le rendu interne des dashboards :

- `/` anonyme, connecté, puis anonyme après déconnexion simulée ; accueil connecté via AppShell ; lancement installé simulé vers LoginPage.
- `/connexion`, `/demande-acces`, `/mot-de-passe-oublie`, `/activation`.
- `/mentions-legales`, `/confidentialite`.
- Les cinq routes `/logiciel-gestion-formation`, `/logiciel-securite-privee`, `/logiciel-entreprise-nettoyage`, `/logiciel-gestion-restaurant`, `/logiciel-coiffure`.
- `/reserver/:slug`, `/reservation/:token`, `/invitation/:token`.
- `/espace-formation`, `/espace-securite`, `/espace-nettoyage`, `/espace-client-coiffure`.

Module marketing réellement exécuté dans JSDOM avec Canvas de contrôle, à largeur 1440 et 390 simulées : deux montages/démontages par mode, cinq métiers, vingt offres officielles, un H1, clic Connexion dirigé vers la navigation locale, absence d’erreur d’exécution. Après démontage : aucun style vitrine, zéro RAF, zéro observer, zéro écouteur scroll/resize/wheel/touchmove/visibilitychange ajouté par la vitrine, html/body inchangés. La 3D n’est pas rendue dans JSDOM.

## Confirmation de périmètre

Diff vide pour `src/App.tsx`, `src/main.tsx`, `vite.config.ts`, `index.html`, `public/sw.js`, le manifest, `src/contexts`, AppShell, le catalogue officiel, `supabase`, `functions` et `.github/workflows`. Aucun dashboard ni logique métier modifié. Aucun compte, organisation, abonnement ou donnée client utilisé/modifié. Aucun changement distant, merge ou déploiement.

Les fichiers CSS globaux et tsbuildinfo que le build officiel régénère également sur main ont été remis à leur version initiale dans le checkout pour ne pas polluer le diff. Le build de validation a été réalisé avant cette remise en état des seuls produits générés.

## Contrôles manuels avant merge

Le navigateur automatisé ne démarre pas dans cet environnement (erreur de sandbox TIOCSTI). Ne pas considérer ces points comme validés :

1. Prévisualisation isolée sans données de production : mise en page, contrastes, desktop/mobile, 3D, scroll carousel et netteté Retina.
2. Avec un compte de test hors production : connexion, déconnexion, rechargement connecté de `/`, dashboard et absence de fuite de style après navigation.
3. Sur une PWA de test installée : démarrage, retour hors ligne, cache et actualisation.
4. Vérifier dans Network que l’accès direct à `/connexion` ne charge aucun fichier `/public-home/runtime-…js`, puis qu’un passage par la vitrine le charge seulement à cet instant.
5. Vérifier le Content-Type JavaScript du module sur l’hébergement de prévisualisation, les cinq pages SEO et les routes publiques particulières.

## Reproduction et maintenance

`npm ci`, puis `npm run build`. Le prétraitement `build:public-home` génère le CSS isolé, le module à empreinte et moduleUrl.ts. `npm run dev` le prépare avant de lancer Vite ; relancer `npm run build:public-home` après modification de la vitrine pendant le développement. `styles.source.css` est le CSS complet compilé de la V3 validée, et non une configuration Tailwind globale. Ne jamais importer cette feuille directement dans main.tsx. Le wrapper doit conserver l’import dynamique ignoré par Vite.

Retour arrière : revenir au commit de base ou annuler le commit d’intégration. Aucun schéma, donnée ou migration à annuler. Restaurer uniquement PublicHomePage avec git restaure l’affichage précédent, mais le rollback complet doit également rétablir les assertions correspondantes pour retrouver la même base de tests.
