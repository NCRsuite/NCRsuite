# Vitrine NCR Suite — fidélité au prototype V3

## Référence retrouvée

La dernière source V3 retrouvée est `/Users/ec/Downloads/ncr-suite-main/src`, documentée dans `RAPPORT_V3.md` le 1er octobre 2026, avec son build `dist/index.html`. `work/v3/src-before` est la sauvegarde V2, pas la référence finale. La comparaison porte sur les fichiers réels et le CSS extrait du build V3, pas sur la preview intégrée.

Fichiers 3D originaux : `src/three/StoryScene.ts` (caméra et séquences), `FinalScene.ts`, `common.ts` (rendu, lumière, textures, DPR et disposal), `ui.ts` (écrans canvas desktop/mobile et éléments flottants), `src/logoGeometry.ts`.

Interactions et scroll : `src/components/Story.tsx`, `Produit.tsx`, `Final.tsx`, `Header.tsx`, `useReveal.ts`, `src/three/scrollGeometry.ts` ; disposition et responsive dans `src/index.css`, compilé dans `dist/index.html`.

## Constat et correction

Les scènes, leurs caméras, géométries, positions, rotations, timings, easing, éclairage et mapping du scroll étaient déjà identiques octet pour octet à la V3. `Produit.tsx`, `Metiers.tsx`, `Final.tsx`, `Header.tsx`, les couleurs métier et le logo le sont aussi. `ui.ts` ne diffère que par l'alias de police `NCRHomeInter`; le fichier de police est identique. Le CSS source compilé intégré est exactement celui du build V3. Les mécanismes `buildView` et `buildMobileView` sont donc bien ceux du prototype, pas une recréation d'intégration.

Le problème concret identifié dans le code d'intégration est externe aux scènes : le CSS SaaS définit `overflow-x:hidden` sur `html`, `body` et `#root`. Cela crée des ancêtres de défilement qui empêchent le sticky de suivre le viewport comme dans le prototype. Préfixer les styles de la landing ne neutralisait pas cette contrainte des ancêtres.

Le générateur CSS émet maintenant une seule exception strictement conditionnelle : `html:has(#ncr-public-home), body:has(#ncr-public-home), #root:has(#ncr-public-home)` reçoivent uniquement `overflow-x:clip; overflow-y:visible`. La règle appartient au style React de la vitrine, retiré au démontage. Aucun style permanent ni attribut de html/body n'est modifié. Aucun fichier CSS de la SaaS n'est corrigé. Les fonctions typographiques héritées de l'application sont remises à `normal` dans la landing pour retrouver le prototype.

Ce correctif ne suffit pas, sans rendu navigateur, à prouver que tous les écarts signalés sur Cloudflare sont résolus.

## Transplantation et adaptations conservées

Aucune scène n'a été redessinée ou remplacée : retransplanter les fichiers identiques aurait produit un diff vide. Les empreintes SHA-256 de la source V3 sont maintenant conservées dans `scripts/public-home-prototype.json` et contrôlées par l'audit. Elles couvrent les scènes, le scroll, les couleurs, les grilles, le carousel, les mockups (alias de police normalisé) et le CSS original.

Adaptations d'intégration conservées : React partagé avec la SaaS, chargement du runtime sur l'accueil public uniquement, styles préfixés, alias de police, URLs internes et catalogue officiel, syntaxe inert compatible React 18 et annulation des timers. L'apparition des sections utilise toujours IntersectionObserver à la place du ScrollTrigger original, avec les mêmes valeurs y/durée/easing ; son équivalence visuelle exacte reste à vérifier. Les fichiers three.module.js et three.core.js installés sont identiques entre prototype et intégration malgré les versions déclarées 0.186.1 / 0.186.0. Aucune dépendance modifiée par cette correction.

## Contrôles de non-régression

Les différences historiques dans les trois audits phase1 ont été relues : elles retirent des noms/classes spécifiques à l'ancienne PublicHomePage et délèguent au contrat de la nouvelle vitrine. Les contrôles métier, backend, sécurité, catalogue, LoginPage et autres pages restent présents. Le contrat est renforcé : logo/navigation/CTA, image Open Graph, scène, cinq univers, panneaux tarifaires accessibles, grille centrée, scroll-snap, lifecycle du carousel, exception CSS limitée aux deux propriétés de défilement et empreintes V3.

Tests locaux supplémentaires :

- identité source/build du prototype et fichiers transplantés ;
- CSS calculé JSDOM : clipping actif uniquement avec landing, retour à hidden après démontage ;
- 22 décisions de routage du véritable App.tsx, avec sessions/providers et pages simulés ;
- runtime marketing exécuté à 1440 et 390 px simulés, deux montages/démontages, cinq métiers, vingt offres, accès local à /connexion, zéro RAF/observer/listener de scroll, resize ou visibilité après démontage et styles retirés ; aucune erreur d'exécution dans ces tests.

Résultats : `npm run build`, `npm run audit:phase1`, `npm run test:critical` et `npm run test:release` réussis (code 0). Avertissement de taille du bundle applicatif conservé, aucun seuil modifié. Les 12 mockups canvas (six desktop et six mobile) sont comparés pixel par pixel et identiques ; planche de comparaison dans `outputs/COMPARAISON_TEXTURES_V3.png` à la racine du workspace. Il ne s’agit pas d’un rendu WebGL.

Les quatre commandes exigées sont consignées dans les journaux `../correction-build.log`, `../correction-audit.log`, `../correction-critical.log`, `../correction-release.log` du workspace.

## Limite de validation visuelle

Le navigateur CUA échoue au démarrage (sandbox TIOCSTI). Une seconde tentative avec Chrome headless/Playwright échoue également (processus SIGABRT). Aucun screenshot WebGL comparatif A/B fiable n'a donc pu être produit. Les tests simulés ne prouvent ni le rendu 3D, ni la fluidité, ni la PWA réellement installée, ni la connexion avec un compte réel. **La correspondance visuelle finale n'est pas confirmée.** Vérifier les deux versions à résolution identique sur desktop/mobile, les cinq étapes, la sortie du sticky, le swipe et le retour à /connexion avant merge.

## Périmètre Git

Uniquement `feature/new-public-home`, PR existante #1. Pas de nouvelle branche ou PR, pas de push, merge ou déploiement. `main` local reste au SHA constaté au début de cette correction : `63fa0563b51816197b4f6dbbc4de0b5a2a506670`. AuthProvider, OrganizationProvider, PlatformAdminProvider, AppShell, routes, dashboards, backend, Supabase, Stripe, organisations, données et PWA inchangés.

Fichiers du correctif : `scripts/build-public-home.mjs`, `scripts/audit-public-home.mjs`, nouveau `scripts/public-home-prototype.json`, `src/components/public-home/styles.scoped.css`, `src/components/public-home/moduleUrl.ts`, remplacement du runtime généré dans `public/public-home/`, et ce rapport. Le CSS global et tsbuildinfo produits par le build sont exclus du commit.
