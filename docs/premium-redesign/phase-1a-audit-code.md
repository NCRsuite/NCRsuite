# Phase 1A — Audit UX/UI du code local NCR Suite

Date : 5 octobre 2026. Dépôt : `/Users/ec/Documents/GitHub/NCRsuite`.
Branche : `refactor/premium-app-experience`. Base : `63fa0563b51816197b4f6dbbc4de0b5a2a506670`.

## 1. Périmètre et niveau de preuve

Audit statique du code uniquement. Aucun appel Supabase distant, aucune lecture des migrations pendant cette phase, aucune exécution des parcours métier. Aucun fichier applicatif modifié. La vitrine commerciale est exclue ; ses points de couplage au socle sont néanmoins identifiés pour la préserver.

Les observations de code sont vérifiées localement. Les conséquences visuelles sont des risques à confirmer au navigateur, pas des défauts de rendu mesurés. Aucun score esthétique, contraste calculé, résultat de performance ou conformité responsive n'est prétendu. Les sources sont référencées relativement au présent document.

Méthode : inventaire des chemins, lecture des points d'entrée et du shell, recherche des usages partagés, lecture ciblée des styles et parcours représentatifs. Pas de revue exhaustive des 118 pages.

## 2. Constat et recommandation

Le projet dispose déjà d'un socle premium exploitable : tokens NCR UI 2026, accents métier, shell commun, navigation responsive, cartes statistiques, skeletons, confirmations et composants métier riches. Le chantier doit consolider cet existant par lots.

Le risque principal est la combinaison de couches CSS successives, de composants métier monolithiques et d'injections DOM dépendantes des classes du shell. Une refonte globale ou un nettoyage massif serait disproportionné. Commencer par une référence visuelle vérifiée, puis les tokens et les éléments partagés, en conservant les contrats DOM et les règles d'accès.

Inventaire reproductible par comptage des fichiers sous `src` : **72 CSS, 187 TSX, dont 118 pages et 63 composants**. `main.tsx` importe directement **51 feuilles CSS**. Ce sont des comptes de fichiers source, pas des mesures du bundle exécuté ; ils incluent les surfaces publiques présentes dans le dépôt.

## 3. Architecture et routing

| Couche | Sources et fonctionnement | Conséquence pour la refonte |
|---|---|---|
| Application | [package.json](../../package.json), React 18, TypeScript, Vite 8, React Router 6 ; CSS maison, sans bibliothèque UI supplémentaire | Conserver la pile actuelle |
| Entrée | [main.tsx](../../src/main.tsx) : StrictMode → BrowserRouter → ConfirmDialogProvider → RoutedApplication | Le thème et les composants injectés vivent au-dessus des pages |
| Contextes | AuthProvider → PlatformAdminProvider → OrganizationProvider ; gardes configuration client et onboarding | Ne pas déplacer les providers pour un motif esthétique |
| Routage | [App.tsx](../../src/App.tsx), 99 déclarations Route ; pages déclarées avec `lazy`, fallback Suspense global | Routes et redirections font partie du contrat fonctionnel |
| Shell authentifié | ProtectedArea → [AppShell](../../src/components/AppShell.tsx) → Outlet dans `.premium-route-stage` | Point d'intervention transversal privilégié, mais sensible |
| Données | Contextes, appels Supabase directement dans de nombreuses pages ; utilitaires par métier dans `src/features` | Séparer les changements visuels des handlers et requêtes existants |
| Build | [vite.config.ts](../../vite.config.ts) : `codeSplitting: false`, nom JS versionné fixe | `lazy` dans le source ne garantit pas des bundles réseau séparés en production ; pas de changement de build dans les lots UI initiaux |

ProtectedArea vérifie session, chargement organisation/admin, assistance, statut fermé/suspendu et accès au chemin. `/` affiche le dashboard avec une session entreprise ; sans session et hors PWA installée, il affiche la vitrine. L'administrateur plateforme est redirigé vers `/administration-ncr` hors assistance. Ces variations doivent être préservées.

Familles de routes :

- Connexion et accès : `/connexion`, `/configuration`, `/activation`, `/mot-de-passe-oublie`, invitations.
- Application : enfants de ProtectedArea ; plusieurs chemins sont polymorphes selon le métier (`/clients`, `/planning`, `/agents`, `/sites`, `/stocks`, `/terrain`, `/facturation`, `/equipe`).
- Portails : `/espace-formation`, `/espace-securite`, `/espace-nettoyage`, `/espace-client-coiffure`, hors AppShell standard ; ne pas présumer qu'ils reçoivent les styles ciblant `.app-shell`.
- Réservation et parcours externes métier : `/reserver/:slug`, `/reservation/:token`, `/evaluation/:token`, `/r/:slug/menu`, `/r/:slug/reserver` ; cartographiés, pas audités visuellement ici.
- Exception d'entrée : `/salon/:slug` reçoit un arbre réduit dans main.tsx.
- Navigation additionnelle par query string : `/?beauty=page-reservation` insère BeautyPublicPageManagementPage par portail ; MetierSimpleExperience ajoute aussi une surface dans `.premium-route-stage`. L'inventaire des seuls Route ne décrit donc pas toutes les surfaces.
- La route wildcard authentifiée rend ModulePage ; ne pas la remplacer automatiquement par une page 404.

## 4. Layouts et navigation

[AppShell.tsx](../../src/components/AppShell.tsx) assemble sidebar desktop, recherche et groupes de rubriques, contextes entreprise/établissement, identité utilisateur, notifications, en-tête mobile, bottom navigation, drawer de navigation et panneau de compte. La navigation provient de [businessPacks.ts](../../src/config/businessPacks.ts), puis est filtrée selon organisation, modules, rôle et assistance. Les raccourcis mobiles dépendent du métier et du rôle.

Les règles sont réparties entre `moduleAccess.ts`, `planEntitlements.ts`, `accessMatrix.ts`, `domainOfferCatalog.ts`, ModuleAccessGuard et les quatre FeatureGate métier. Leur apparence peut être harmonisée ; leur décision d'autorisation et leur destination ne doivent pas être simplifiées.

**Contrats DOM à préserver explicitement** :

| Consommateur | Ancrages utilisés |
|---|---|
| [BeautySidebarNavigation](../../src/components/BeautySidebarNavigation.tsx) | `.sidebar`, `.main-nav.grouped-navigation`, `.mobile-navigation-drawer`, `.mobile-drawer-nav.grouped-navigation` |
| [BeautyCenterSwitcher](../../src/components/BeautyCenterSwitcher.tsx) et [MetierBrandSwitcher](../../src/components/MetierBrandSwitcher.tsx) | `.desktop-context-switchers`, `.organization-switcher`, `.site-switcher`, `.mobile-account-sheet`, sections et actions du compte |
| [MetierSimpleExperience](../../src/components/MetierSimpleExperience.tsx), [BeautyPublicPageManagementPortal](../../src/components/BeautyPublicPageManagementPortal.tsx) | `.premium-route-stage` |
| [MetierRuntimeBranding](../../src/components/MetierRuntimeBranding.tsx) | Logos du shell, drawer, chargement et favicon ; variables du document |

Ces composants emploient `MutationObserver`, `querySelector` et/ou `createPortal`. Les classes jouent ici un rôle fonctionnel. Une évolution ultérieure vers des emplacements React explicites serait envisageable seulement si nécessaire et dans un lot isolé ; ce n'est pas un préalable à toute amélioration visuelle.

## 5. Design system, cascade, thèmes et couleurs

Source principale : [ncrUi2026.css](../../src/ncrUi2026.css), activée par `data-ncr-ui-2026="true"` et `NCR_UI_2026_ENABLED`.

Tokens existants : marque et variantes, fonds/surfaces, texte, bordures, succès/alerte/danger, rayons 8–22 px, ombres, espacements 4–48 px, contrôles 44 px et compacts 36 px, largeur maximale 1560 px, gouttière fluide, transitions 140/190/280 ms. Palette claire déclarée avec `color-scheme: light`, variantes OKLCH lorsque supportées. Aucun besoin d'introduire un thème sombre dans ce chantier.

[BusinessTheme](../../src/config/businessTheme.ts) définit : Formation bleu `#3370EC`, Nettoyage vert `#44946E`, Sécurité rouge foncé `#9B1C1C`, Coiffure violet `#5C194B`, Restauration ocre `#B78324`. Les couleurs sémantiques doivent rester distinctes de ces accents, particulièrement pour Sécurité.

Marque blanche : `--tenant-brand-color`, `--business-accent`, `--accent`, `--ncr26-brand` peuvent être ajustés par MetierRuntimeBranding. OrganizationContext et AppShell pilotent aussi des attributs du document. Ne pas déduire la couleur finale d'un seul fichier ; vérifier le résultat au changement d'entreprise, d'enseigne et de métier. Le commentaire de businessTheme distingue couleur métier et commerciale, tandis que le runtime prévoit une exception marque blanche : documenter cette exception sans supprimer le comportement existant.

Ordre de styles à prendre en compte :

1. `index.html` charge les CSS publiques versionnées showcase et app.
2. [styles.css](../../src/styles.css), **24 842 lignes**, est la source du CSS app généré ; il contient également le contenu extrait pour la vitrine.
3. `main.tsx` ajoute NCR UI 2026, ses couches Formation et transversales, puis les couches métier/Beauty ; `beautyMobileResponsive.css` termine ses imports CSS directs.
4. Des composants/pages importent également leurs styles. La priorité effective dépend des imports, de la spécificité et des `!important`, pas seulement du nom du fichier.

[generate-public-showcase-css.mjs](../../scripts/generate-public-showcase-css.mjs) réécrit les deux CSS publiques à partir de styles.css. **Ne pas éditer les copies générées comme nouvelle source de vérité.** Une modification du socle historique ou un build peut toucher la vitrine exclue du périmètre ; contrôler le diff généré lors des futurs lots.

Formation reste une référence de composition : héros, KPI, grilles, formulaires, toolbars dans les feuilles Dashboard/Operations/Spacing. Mais elle a aussi de nombreuses couches VisualFixes, GovernancePolish, MobilePolish et SmartPolish. De plus, `ncrUi2026TrainingSidebarPolish.css` cible explicitement les cinq métiers : son nom ne décrit pas son rayon d'impact.

## 6. Composants partagés et duplication

Réutilisation réelle : Icon, StatCard, PremiumSkeleton, ConfirmDialogProvider, AppErrorBoundary, ConnectivityStatus, SupportConversation, gardes de modules et éléments du shell.

La majorité des primitives passe par des classes CSS et du HTML natif, sans composants génériques Button/Input/PageHeader/Table/Modal repérés dans l'inventaire des composants. C'est une base valable ; ne pas la remplacer intégralement par une bibliothèque de composants.

Comptages textuels dans les TSX, tous périmètres source confondus : `primary-button` dans 131 fichiers, `page-header` dans 80, `empty-state` dans 26 ; PremiumSkeleton dans 8 et StatCard dans 6, définitions comprises. Ces comptes montrent la portée potentielle des styles, pas des clones exacts.

| Répétition identifiée | Nature | Action recommandée |
|---|---|---|
| Training/Cleaning/Security/RestaurantFeatureGate | Même composition carte/verrou/titre/offre/CTA ; variantes de destinations et règles | Harmoniser la présentation, conserver les wrappers métier |
| Headers, toolbars, filtres, alertes et états vides | Motifs JSX/CSS répétés dans les pages | Stabiliser les classes communes d'abord ; extraire seulement les répétitions démontrées |
| Calendriers Formation, Sécurité, Nettoyage, Beauty | Grammaire visuelle proche mais modèles et interactions différents | Partager styles de contrôles/statuts, pas imposer un calendrier universel |
| Navigation desktop/mobile | Réutilise déjà renderNavigationItem ; wrappers et navigation Beauty parallèles | Conserver la réutilisation existante, vérifier parité des destinations |
| Dialogues locaux | Sessions, admin, avis Beauty et signatures ont leurs propres compositions | Réutiliser les principes du ConfirmDialog, sans remplacer ses dialogues métier complexes |

Dette mesurable : 50 occurrences de `!important` dans beautyMobileResponsive.css, 50 dans beautyMetierShell.css, 45 dans beautyUniverse.css ; sections V6/V7 dans beautyAppointmentWeekPlanner.css et V5/V8 en fin de beautyMobileResponsive.css. Aucun de ces chiffres ne prouve qu'une règle est inutile. Suppression uniquement après identification de la règle gagnante et validation des variantes.

AppointmentsPage (1 706 lignes) et SettingsPage (1 549 lignes) mêlent beaucoup de présentation et de comportements ; réduire le périmètre des modifications dans ces fichiers. Des styles inline existent dans 62 TSX : certains expriment légitimement des coordonnées d'agenda, hauteurs ou couleurs de données et ne doivent pas être convertis aveuglément.

## 7. Desktop, responsive, mobile et accessibilité

Desktop : sidebar fixe et contenu en grille ; seuil central 900/901 px ; panneaux latéraux et grilles propres aux métiers. Vérifier la largeur utile à 1280 px avec sidebar, les noms longs, les menus de contexte et les tableaux denses.

Mobile : header, bottom nav, drawer et compte dédiés ; `safe-area-inset-bottom` dans le socle ; compensation du clavier via `visualViewport` dans AppShell ; règles iOS supplémentaires dans Beauty. Conserver ces protections jusqu'à preuve de leur inutilité.

Le CSS source contient de nombreux seuils : 760, 900, 720, 680, 640, 700, 1180, 820 px notamment. Leur multiplicité augmente le coût de QA mais ne justifie pas leur uniformisation immédiate : les besoins des composants diffèrent.

**Agenda Beauty — priorité visuelle forte** : scroll horizontal déjà présent, axe horaire sticky dans les surcharges mobile, indication de balayage et règles tactiles. Cependant beautyMobileResponsive.css, notamment vers les lignes 716–853, définit encore des heures/services à 8 px, clients à 10 px et des cibles de rendez-vous d'au moins 32 px. [Inférence] La lisibilité et le confort tactile peuvent rester insuffisants malgré le scroll. Vérifier le style calculé final et les rendez-vous qui se chevauchent avant de corriger les règles sources ; ne pas ajouter une V9.

Tables : le socle NCR UI applique `overflow: hidden` à plusieurs wrappers (vers la ligne 644), alors que certaines tables métier nécessitent du défilement. [Inférence] Il existe un risque de masquage selon les surcharges effectives ; aucun débordement réel n'a été mesuré.

Accessibilité déjà présente : focus-visible global dans l'app-shell, reduced-motion, aria-busy/statuts des loaders, boutons de navigation nommés, dialogues avec aria-modal. ConfirmDialog gère Tab et Escape. Les drawers du shell gèrent Escape et le blocage du scroll, mais aucun piégeage/restauration explicite du focus n'a été repéré dans cette implémentation ; ConfirmDialog ne restaure pas explicitement le focus sur le déclencheur. Tester ces transitions clavier, les dialogues locaux, le zoom et les contrastes de marque blanche. La présence d'ARIA ne vaut pas validation d'accessibilité.

## 8. PWA

[manifest.webmanifest](../../public/manifest.webmanifest) : standalone, scope `/`, démarrage `/connexion?source=pwa`, icônes dont maskable. Enregistrement de [sw.js](../../public/sw.js) uniquement en production dans main.tsx.

Service worker : précache d'une liste d'assets versionnés, requêtes GET réseau d'abord, repli cache/index en cas d'erreur, timeout, réception push et ouverture de lien. `skipWaiting()` à l'installation et rechargement sur controllerchange : une évolution visuelle doit être vérifiée aussi pendant une mise à jour, notamment en présence d'un formulaire ouvert.

ConnectivityStatus affiche hors-ligne, nouvelle version et écart de version. `index.html` comporte une récupération en cas de styles indisponibles pouvant désinscrire les service workers et purger les caches NCR. Préserver le chargement des styles et les identifiants de release.

Une file locale ciblée existe pour les positions Sécurité (`features/security/offlinePositionQueue.ts`, localStorage, 120 éléments maximum), avec renvoi RPC au retour du réseau. **Cela ne démontre pas un fonctionnement hors ligne complet de l'application.** L'audit visuel futur sur serveur de développement ne suffira pas pour valider la PWA de production.

## 9. Carte des métiers et modules

| Univers | Principales surfaces présentes dans les routes/pages | Vigilance |
|---|---|---|
| Formation | Dashboard, catalogue, parcours, sessions, stagiaires, formateurs, documents, émargements, évaluations, commercial, facturation, qualité, BPF, dossiers, portails, paramètres | Référence initiale mais passage final dédié obligatoire ; formulaires et listes denses |
| Coiffure / Beauté | Dashboard réservation, rendez-vous, clients/CRM, prestations, équipe, ressources, fidélité, stocks, pilotage, comptabilité, imports, RGPD, historique, contexte enseigne/centre | Fort empilement CSS, agenda et navigation injectée |
| Sécurité | Clients, agents, sites, planning, devis, facturation, rondes, main courante, consignes, GPS, PTI, supervision, dossiers, terrain et portail client | Statuts opérationnels, alertes et actions critiques à conserver |
| Nettoyage | Clients, sites, agents, planning, interventions, rapports, anomalies, qualité, protocoles, stocks, rentabilité, facturation, terrain et portail client | Preuves et informations d'intervention, listes mobiles |
| Restauration | Équipe/planning, carte, recettes, réservations, commandes, cuisine, salle, QR, hygiène, stocks, portail employé | Forte densité en service, états de commande et commandes tactiles |
| Transversal | Paramètres, abonnement, personnalisation, accès équipe, assistance, notifications, démarrage, configuration Métier, administration | Rôles, offres, assistance et marque blanche |

Cette carte confirme l'existence des surfaces dans le code, pas leur qualité visuelle ni le bon fonctionnement de chaque module.

## 10. Composants globaux prioritaires

1. **Tokens et règles de base NCR UI 2026** : typographie, densité, boutons, champs, focus, surfaces, bordures et statuts. Conserver l'identité métier et les variantes compactes utiles.
2. **AppShell + navigation + sélecteurs de contexte** : hiérarchie, espacement, largeur du contenu, desktop/mobile ; sécuriser les ancrages DOM avant tout changement structurel.
3. **Headers, cards/KPI et toolbars** : partager les principes de Formation sans copier ses besoins métier.
4. **Listes/tableaux et états** : filtres, alignements, pagination là où elle existe, vide/chargement/erreur, PremiumSkeleton et StatCard.
5. **Dialogues, drawers et surfaces verrouillées** : cohérence des actions, focus/clavier, mobile ; garder les décisions d'accès dans leurs gardes actuelles.

## 11. Cinq écrans de référence pour la phase visuelle

| Écran et contexte | Pourquoi | États à inspecter sans action destructive |
|---|---|---|
| `/` — Formation, compte entreprise gestionnaire | Référence interne : héros, KPI, navigation, sections et feedbacks | Chargement, données présentes/absentes, sidebar et compte mobile |
| `/rendez-vous` — Coiffure, vues jour/semaine | Plus forte dette responsive repérée et workflow quotidien | Journée dense, noms longs, filtres, scroll de semaine, sélection et formulaire non soumis |
| `/planning` — Sécurité | Densité opérationnelle, statuts, dates, filtres | Jour/semaine/mois disponibles, actions visibles selon rôle, panneaux |
| `/planning` — Nettoyage | Comparer un autre planning sans copier son modèle | Liste de journée mobile, vide, filtres, cartes et formulaires |
| `/commandes` — Restauration | Lecture rapide en service, lignes/articles et actions | Commandes de plusieurs statuts, détail, écrans étroits ; aucune validation de commande |

Même protocole : desktop 1440×900 et 1280×800, tablette 768×1024, mobiles 390×844 et 360×800, plus transitions autour de 900 px. Captures et styles calculés, clavier, zoom 200 %, textes longs, drawer, compte et contraste. Comparer Essentielle/Professionnelle/Métier pour les composants communs avec des comptes existants appropriés. Aucun contournement des gardes ni création de données réelles pour la seule inspection.

Ces cinq écrans amorcent la direction visuelle ; ils ne remplacent pas la recette complète. Sessions/dossiers Formation, paramètres et espaces client seront audités dans leurs lots.

## 12. Vérifications Supabase éventuellement nécessaires ensuite

**Aucune requête distante nécessaire aux lots purement CSS.** Consulter uniquement si un état visuel ou un contexte ne peut être expliqué à partir du code et des données déjà accessibles dans le parcours.

| Dépendance ciblée | Quand la vérifier | Limite de consultation |
|---|---|---|
| `organizations`, `organization_members`, `organization_custom_roles`, `organization_modules`, `organization_sites` | Menu, offre ou contexte absent/inattendu | Champs de configuration et contrat d'accès du compte de test ; pas d'audit RLS global |
| `metier_list_brands`, `resolve_public_metier_brand_host` | Logos, couleurs ou enseigne incohérents | Contrat de résultat et configuration utile ; pas de changement de domaine/Auth |
| Notifications/profil, bucket `profile-avatars` | Badge ou avatar inexplicable | Métadonnées et accès nécessaires à l'affichage |
| Tables directement lues par l'écran inspecté | Libellé, statut, relation ou champ vide ambigu | Formation : sessions/inscriptions/présences/documents ; Beauty : appointments/service_items/disponibilités ; Sécurité : shifts/agents/sites ; Nettoyage : interventions/agents/sites ; Restauration : orders/order_items/tables |
| RPC d'action de l'écran, par exemple `set_appointment_status` | Seulement si un changement UI exige de comprendre les états permis | Lire signature/définition ; ne pas appeler une RPC qui modifie des données |
| Auth et Storage documentaire | Uniquement au lot portail/connexion/documents si redirection ou fichier inaccessible | Paramètres de redirection et métadonnées/politiques précisément concernées ; pas d'extraction de comptes ou fichiers clients |

Ni Stripe, ni webhooks, ni inventaire complet des migrations, policies ou Edge Functions ne sont requis pour l'audit visuel. Un compte de test représentatif peut être nécessaire pour afficher une variante ; cela ne donne pas autorisation de modifier ses droits ou son abonnement.

## 13. Plan de refonte par lots — proposition, non exécutée

| Lot | Périmètre | Critère de sortie |
|---|---|---|
| 0 — Références visuelles | Les cinq écrans ci-dessus ; relevé de cascade et états | Captures desktop/mobile et écarts classés ; aucun changement métier |
| 1 — Fondations | Tokens et règles sources des contrôles, surfaces, typo, focus | Gain perceptible transversal, accents conservés, pas de nouvelle couche de patchs |
| 2 — Shell/navigation | Sidebar, header/bottom nav, recherche, contexte, drawers | Ancrages DOM préservés, parité des liens et états d'accès, clavier et safe areas vérifiés |
| 3 — Composants communs | Headers, toolbars, KPI, listes/tableaux, dialogues, loaders/vide/erreurs | Mêmes fonctions et même finition dans les trois offres ; extraction limitée aux répétitions démontrées |
| 4 — Formation | Sous-lots : dashboard/catalogue/parcours ; sessions/personnes ; documents/émargements/évaluations ; commercial/facturation ; qualité/BPF/dossiers/paramètres | Vrai passage métier final, aucune modification de calculs, exports, signatures ou clôtures |
| 5 — Beauty | Sous-lots : agenda/RDV ; clients/prestations/équipe ; ressources/CRM/pilotage ; espace client | Agenda lisible et tactile, consolidation des surcharges, enseigne/centre conservés |
| 6 — Sécurité | Planning/terrain, puis clients/agents/sites, puis documents/supervision | Statuts, alertes, preuves et actions opérationnelles intacts |
| 7 — Nettoyage | Planning/interventions, puis suivi qualité et gestion | Densité mobile maîtrisée, preuve et suivi intacts |
| 8 — Restauration | Commandes/cuisine/salle, puis réservations/carte/stocks/hygiène | Actions en service accessibles, états et totaux inchangés |
| 9 — Surfaces transversales restantes | Paramètres, abonnements, administration, assistance, portails et connexion | Cohérence hors shell et dans les rôles spécifiques ; aucune logique commerciale/Auth modifiée |
| 10 — Recette finale | Tous métiers, trois offres, desktop/mobile/PWA, responsive et polish | Contrôles fonctionnels ciblés + build global + inspection visuelle finale |

La vitrine commerciale reste exclue de tous ces lots. Les pages publiques métier de réservation sont seulement cartographiées ici ; leur éventuelle évolution doit faire l'objet d'un périmètre explicite distinct, sans élargissement automatique aux pages marketing.

Chaque lot : petit diff, vérification TypeScript et contrôles pertinents, inspection visuelle desktop/mobile, vérification des états fonctionnels utilisés, contrôle des fichiers générés. Pas de réécriture globale, pas de nouvelle bibliothèque UI, pas de remplacement des fonctionnalités par des versions simplifiées.

## 14. Vérifications réalisées et limites

- Dépôt, branche et commit contrôlés ; arbre Git propre avant création de cette documentation.
- Inventaire statique, lecture ciblée et recherches locales ; aucune interrogation Supabase distante.
- Points de couplage CSS, routing, DOM, marque blanche et PWA identifiés.
- Aucun build lancé : le script `build` commence par régénérer des fichiers applicatifs publics, ce qui serait contraire au périmètre documentaire de cette phase. Aucun test navigateur ni validation fonctionnelle exécuté.
- Uniquement ce document créé sous `docs/premium-redesign/`. Aucun commit, push ou déploiement.

**Phase 1A terminée. La phase visuelle et tous les lots de refonte restent à exécuter après instruction.**
