# Progression — refonte premium applicative

## Phase 2A — fondations UI et isolation CSS

Date : 5 octobre 2026. Branche : `refactor/premium-app-experience`.
Base auditée : `9a5857b` (`docs: complete premium app UX UI audit`).

**État : lot 2A validé par l’utilisateur ; checkpoint local autorisé. Aucun push ni déploiement.**
Les cinq écrans métier ont été ouverts avec le code local et le compte test connecté par l’utilisateur. Aucune régression attribuable au lot 2A n’a été identifiée dans les contrôles décrits ci-dessous. Ce résultat ne vaut pas validation exhaustive de tous les parcours métier.

### Fichiers du lot

| Fichier | Rôle |
|---|---|
| `.gitignore` | Règle ciblée `/.env.local` : configuration locale exclue de Git |
| `src/ncrUi2026.css` | Scope des tokens/body, tokens de contrôles, focus, tailles tactiles, états disabled/pressed et couverture du dialogue partagé |
| `src/ncrUi2026LegacySurfaces.css` | Héritage public/autonome figé depuis la version auditée, sans règles de layout métier |
| `src/ncrUi2026Pages.css` | Trois couleurs de fond de feedback remplacées par leurs tokens équivalents |
| `src/main.tsx` | Import de compatibilité juste avant le socle ; ordre relatif des 51 feuilles existantes inchangé |
| `scripts/generate-public-showcase-css.mjs` | Protection de la baseline CSS héritée lors du build ; régénération désormais explicite |
| `scripts/ui-foundations.test.mjs` | Cinq tests sur les sorties publiques et le refus des dérives non validées |
| `docs/premium-redesign/07_PROGRESS.md` | Compte rendu et limites de validation |

### Isolation retenue

Le socle global est activé par `html[data-ncr-ui-2026="true"]:where(:has(.app-shell))`. Il dépend du shell effectivement monté, pas d’une liste de routes ni de l’état d’authentification. Cela évite un effet React tardif ou un MutationObserver supplémentaire. Le wrapper `:where` n’augmente pas la spécificité des sélecteurs racines.

Les règles de composants déjà sous `.app-shell` conservent leur scope. Aucun nom de classe, ordre des enfants du shell, route ou point d’injection Beauty n’est modifié. Les tokens restent sur `html` lorsque le shell existe : un portail attaché à `body`, y compris hors `#root`, continue à hériter des couleurs, de la police et des surfaces. Le dialogue réel de `ConfirmDialogProvider`, frère du contenu applicatif, rejoint les règles communes des boutons/champs/focus via `.ncr-confirm-dialog`.

En l’absence d’AppShell, `ncrUi2026LegacySurfaces.css` conserve exactement les anciennes déclarations globales de tokens, ponts de couleurs métier et body, y compris OKLCH et le fond mobile. Cette petite duplication est volontaire : la vitrine, les pages d’authentification et les portails autonomes ne doivent plus hériter des futures évolutions du socle applicatif. Ce fichier est une baseline de compatibilité, pas un second design system à faire évoluer en parallèle.

Le changement est progressif : il ne prétend pas isoler les 51 feuilles historiques ni l’intégralité de `styles.css`. Les futurs lots doivent rester sous leur racine de composant/app et vérifier les feuilles métier concernées. Les portails autonomes sans AppShell conservent leur ancien rendu ; leur modernisation est différée.

### Cascade réelle et génération publique

Ordre conservé : feuilles publiques liées dans `index.html`, puis compatibilité figée et NCR UI 2026, puis couches pages/Formation/transversales, puis métiers/Beauty et correctifs mobiles. Aucun passage en CSS layers, aucun framework, aucune fusion massive.

Un premier build a révélé une dérive préexistante entre `src/styles.css` et les deux fichiers CSS servis dans `public/` : la régénération ajoutait environ 1 060 lignes et modifiait des variables globales. Les deux sorties ont été remises exactement à leur contenu du checkpoint, puis protégées par empreintes SHA-256, ainsi que leur source historique.

Désormais le build ordinaire vérifie cette baseline et ne la réécrit pas. Une modification de l’un des trois fichiers fait échouer la génération avec une explication. Une migration volontaire du CSS historique demande `node scripts/generate-public-showcase-css.mjs --refresh-legacy`, une comparaison visuelle publique et une actualisation explicite des empreintes après validation. Cette option n’a été exercée que dans des copies temporaires pour les tests. Ce mécanisme protège les sorties héritées ; il n’empêche pas une nouvelle feuille mal scopée de contaminer la vitrine, d’où la nécessité de la comparaison visuelle.

### Tokens et composants

- Couleurs, surfaces, espaces, rayons et ombres existants conservés ; pas de nouvelle palette.
- Ajout de tokens pour famille typographique, tailles control/compact/caption, interlignes, bordure, rayon pill, focus, opacité disabled et déplacement pressed.
- Fonds success/warning/danger : mêmes mélanges à 5 % qu’auparavant, maintenant nommés et réutilisés par les messages.
- Boutons et champs principaux : hauteur existante de 44 px conservée. Contrôles compacts/icônes : minimum de 44 px sur petit écran ou pointeur grossier ; aucune règle de taille ajoutée aux cartes de rendez-vous.
- Champs de formulaire : 16 px minimum sur mobile/pointeur grossier pour préparer la lisibilité et éviter le zoom de saisie. Vérification sur appareil iOS réel non effectuée.
- Focus visible : couleur forte du métier au lieu d’un mélange éclairci ; règle harmonisée avec la spécificité des champs. Disabled à 0,6, sans transformation/ombre d’action ; `aria-disabled` reçoit un traitement visuel, sans modification des handlers métier.
- Pressed pour boutons secondaires/danger/icônes ; transitions courtes existantes conservées.
- Reduced motion : protection étendue au document applicatif pour couvrir les portails hors shell. Les safe areas existantes restent intactes, et les boutons de confirmation mobile conservent au moins 46 px.

### Vérifications effectuées

| Vérification | Résultat |
|---|---|
| Diff et branche | Aucun changement de page métier, contexte, route, logique métier ou Supabase |
| `git diff --check` | Réussi |
| `node --check` sur les deux scripts du lot | Réussi |
| `node --test scripts/ui-foundations.test.mjs` | 5 tests réussis : conservation, refus de dérive source/de chacune des deux sorties, régénération explicite dans copie temporaire |
| Audits statiques inclus dans `npm run build` | Audit phase 1, parcours critiques et préparation release réussis |
| TypeScript / build production | `npm run build` réussi : `tsc -b`, Vite et génération SEO. Avertissement de taille du bundle (3 778 kB JS), sans erreur bloquante. Les deux CSS publics de dist sont identiques au checkpoint audité |
| Lint | Aucun script/configuration lint fourni dans package.json ; aucune dépendance lint ajoutée |
| Landing locale avant/après | Captures aux cinq largeurs ; mêmes couleurs/polices des titres et liens et même fond/police body. Aucun débordement horizontal global mesuré |
| Composants communs | Banc temporaire sans Auth/Supabase, avec les feuilles dans l’ordre réel et le vrai ConfirmDialogProvider |
| Responsive du banc | 360, 390, 430, environ 768 et 1440 px ; boutons/icônes mobiles proches de 44 px, champs 16 px ; pas de débordement document observé |
| Dialogue hors shell | Ouverture, saisie, confirmation et Échap réussis ; bottom sheet mobile et dialogue centré desktop ; héritage conservé |
| Portail attaché à body | Toast de test visible et héritage correct ; montage/retrait du shell fait apparaître/disparaître les nouveaux tokens applicatifs |
| Thèmes | Formation, Coiffure, Sécurité, Nettoyage, Restauration : accents vérifiés dans le banc, succès/danger constants |
| Clavier | Focus visible mesuré sur icône et textarea du dialogue |
| Portail Formation autonome | Écran de connexion réellement ouvert aux cinq dimensions (360/389/430/767/1439 px mesurés), sans débordement global ; aucune authentification effectuée |

### Validation connectée locale

[VÉRIFIÉ VISUELLEMENT] Tests réalisés dans le navigateur intégré sur `http://localhost:5173`, avec le compte test et ses cinq entreprises. Les largeurs CSS réellement mesurées sont 360, 389, 430, 767 et 1439 px (cibles 360/390/430/768/1440). Les 25 captures ont été inspectées ; aucune largeur de document supérieure au viewport n’a été mesurée. Cela ne supprime pas les scrolls internes prévus par les agendas/listes.

| Écran | Contrôles ciblés effectués |
|---|---|
| Rendez-vous Beauty | Rendez-vous de l’audit présents ; header, KPI, navigation et disposition aux cinq formats. Ouverture/fermeture du formulaire sans sauvegarde, recherche client, champ à 16 px et hauteur proche de 44 px avec focus visible. Menu Beauty injecté et sélecteur de compte ouverts sur mobile |
| Dashboard Formation | Chargement puis dashboard réel ; cinq formats ; passage de 90 à 30 jours et synchronisation du sélecteur. Le double contrôle de période mobile préexistant reste visible |
| Planning Sécurité | Cinq formats, semaine vide et sites existants ; ouverture et fermeture du formulaire de mission sur mobile, sans soumission |
| Planning Nettoyage | Cinq formats ; vues semaine/mois/jour accessibles. Planifier désactivé avec explication : aucun agent actif. Création d’intervention non testée |
| Commandes Restauration | Cinq formats ; commande existante en cours. Recherche sans résultat puis effacement ; filtre Boissons puis retour Tout. Aucun ajout, envoi en cuisine ni encaissement |

Les accents métier et les navigations desktop/mobile restent présents dans les cinq espaces. Le sélecteur d’entreprise fonctionne et reste utilisable en panneau mobile. Les formulaires Beauty/Sécurité ont été fermés sans sauvegarde. Aucune donnée métier n’a été créée, modifiée ou supprimée pendant cette validation ; seuls les filtres et la navigation ont changé. Aucun accès direct à Supabase : uniquement les échanges normaux de l’application connectée.

La densité, les petits textes métier, les longs héros mobiles et les libellés de navigation tronqués (notamment Planning équipe à 360 px) restent des sujets pour les lots suivants. La validation 2A porte sur les fondations et leur compatibilité, pas sur une refonte de ces écrans.

### Limites et éléments laissés pour plus tard

- Aucun P1 métier corrigé : Beauty « Terminer », création Sécurité et autres anomalies de l’audit restent la baseline. Aucun agenda/dashboard refondu.
- Pas de consolidation massive des correctifs Beauty ; les overrides ultérieurs peuvent encore primer sur certains contrôles métier. Les dimensions mesurées sur le banc ne sont pas une garantie pour chaque contrôle du produit.
- Les cinq thèmes ont été exercés sur le banc et les cinq organisations test ouvertes avec le code local. Les variantes personnalisées du moteur de marque blanche ne sont pas exhaustivement testées.
- Le mode du socle est explicitement clair (`color-scheme: light`) ; aucun mode sombre n’a été ajouté. Reduced motion vérifié dans la règle source, pas par bascule du réglage système.
- PWA installée, clavier virtuel, safe areas sur appareil réel, tous les toasts et overlays spécifiques métier, lecteurs d’écran et contrastes WCAG exhaustifs : non vérifiés.
- `:has()` requiert un navigateur moderne ; le projet l’utilise déjà. Pas de validation sur les anciens WebView.
- Les cartes animées de la landing ne sont pas comparables pixel à pixel à deux instants différents ; la comparaison porte sur rendu, typographie, couleurs et géométrie stable. Quelques positions de sections animées évoluent selon leur état d’apparition.
- `.env.local` a été créé par l’utilisateur. Son contenu n’a pas été lu ni affiché par l’agent. Il n’était initialement pas ignoré : ajout de `/.env.local` dans `.gitignore`, puis vérification par `git check-ignore -v` et confirmation qu’il n’est pas suivi. Le serveur a été relancé et l’utilisateur a connecté lui-même son compte test.

### Preuves locales

Captures temporaires : `/tmp/ncr-phase2a/` (`landing-before-*`, `landing-after-*`, `controls-*`, `dialog-*`, `theme-*`, `live-beauty-*`, `live-formation-*`, `live-security-*`, `live-cleaning-*`, `live-restaurant-*`, `live-account-360.jpg`). Mesures de landing dans `landing-before.json` / `landing-after.json`, matrice connectée dans `live-validation.json`. Logs de build : `/tmp/ncr-phase2a-build.log`. Les exports du navigateur peuvent être redimensionnés/flous : ce n’est pas un défaut typographique établi de l’application.

Le banc est un outil temporaire de vérification, pas une route de production ni un contournement des permissions. Ses exemples ne doivent pas être présentés comme des écrans métier connectés.

### État local à la fin du lot

Serveur Vite arrêté au checkpoint et lien temporaire `node_modules` retiré ; les dépendances restent disponibles hors dépôt. Le banc HTML temporaire et le build sont dans `/tmp/ncr-phase2a/`, et les métadonnées TypeScript générées ont été remises à leur version initiale. Aucun export, capture ni jeu de données métier de test n’est inclus dans ce commit ; la documentation conserve uniquement les résultats des contrôles.

### Vérification du checkpoint

Relecture des huit fichiers du lot, contrôle de l’exclusion de `.env.local` et de son absence de l’index, recherche de signatures de credentials et contrôle du périmètre. Aucun changement Supabase ou de logique métier. Les deux feuilles publiques et `src/styles.css` sont identiques au checkpoint audité ; cinq tests de protection du générateur réussis. Commit local demandé : `refactor(ui): establish premium app foundations`. `main` reste à `63fa0563b51816197b4f6dbbc4de0b5a2a506670`.
