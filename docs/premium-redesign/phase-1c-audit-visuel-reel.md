# Phase 1C — Audit visuel réel NCR Suite

Date : 5 octobre 2026. Application déployée : https://ncr-suite.fr/.
Branche locale : `refactor/premium-app-experience`. HEAD et main : `63fa0563b51816197b4f6dbbc4de0b5a2a506670`.

## 1. Périmètre et méthode

Audit effectué dans le navigateur intégré, avec le compte déjà connecté **NCR Test**. L’utilisateur a explicitement autorisé les modifications des données accessibles à ce compte. Les cinq espaces ont été identifiés dans le sélecteur d’entreprise avant les tests :

| Écran | Espace affiché | Offre affichée | Accès |
|---|---|---|---|
| Dashboard Formation | AZZERA ACADEMY | Professionnelle | Oui |
| Rendez-vous Beauty | AZZERA CUT | Professionnelle | Oui |
| Planning Sécurité | Azzera Protect | Métier | Oui |
| Planning Nettoyage | Azzera Service + | Professionnelle | Oui |
| Commandes Restauration | Azzera Food | Professionnelle | Oui |

Navigation et écritures exclusivement par l’interface. Aucun appel direct à Supabase, aucune modification de schéma, RLS, Auth, RPC, trigger, Edge Function ou Storage. Aucun fichier applicatif modifié, aucun commit, push ou déploiement. Seul ce rapport est créé dans le dépôt pendant cette phase.

Les constats sont séparés ainsi :

- **[VÉRIFIÉ VISUELLEMENT]** : rendu réellement affiché, capture examinée et/ou texte rendu de l’interface ; mesures complémentaires sur le DOM et les styles calculés.
- **[DÉDUIT DU CODE]** : explication ou risque provenant du code local, sans preuve que le déploiement correspond exactement au commit local.
- **[NON TESTÉ]** : parcours ou état non exercé. Ne signifie ni défaut ni absence de fonctionnalité.

Les cinq écrans ont été capturés et examinés aux largeurs CSS **360, 390, 430, 768 et 1440 px**, hauteur cible 900 px. Les dimensions ont été contrôlées avec `innerWidth/innerHeight`, pas seulement demandées au navigateur. Aucun débordement horizontal du document entier n’a été mesuré dans ces vues ; certains composants ont leur propre défilement horizontal.

Il s’agit d’un redimensionnement du navigateur desktop : clavier virtuel, appareil iOS/Android, gestes tactiles physiques, mode PWA installé et performances sur matériel mobile restent **[NON TESTÉ]**. Les captures du navigateur peuvent comporter une marge de sortie et une mise à l’échelle ; cette marge ou leur netteté ne sont pas considérées comme des défauts de l’application.

## 2. Résultat principal et priorités

**Aucun P0 établi dans le périmètre testé.** Deux actions métier ont échoué ; elles nécessitent un diagnostic ciblé avant de conclure à un problème général. Les principaux défauts d’usage observés sont concentrés sur Beauty et sur la densité mobile des écrans opérationnels.

| ID | Niveau | Preuve | Constat | Action recommandée ultérieure |
|---|---|---|---|---|
| B01 | P1 | [VÉRIFIÉ VISUELLEMENT] | Cartes semaine Beauty de 30 minutes trop basses : textes 8–10 px et lignes comprimées/coupées, aussi sur desktop | Revoir la représentation des rendez-vous courts, conserver heure/client/prestation lisibles et une cible tactile confortable |
| B02 | P1 | [VÉRIFIÉ VISUELLEMENT] | Vue Jour Beauty : les huit rendez-vous sont affichés deux fois à 360/390/430 px | Conserver une seule liste mobile ; vérifier les conditions de rendu et de visibilité |
| B03 | P1 | [VÉRIFIÉ VISUELLEMENT] | Actions rapides Beauty ouvertes sous le viewport à 390 px ; voile visible, fiche retrouvée en défilant | Corriger le placement de la fiche et le comportement du fond au scroll |
| B04 | P1 | [VÉRIFIÉ VISUELLEMENT] | « Terminer » le RDV test de 09:00 échoue : « La fidélité doit rester dans l’enseigne du client » | Diagnostiquer le contexte client/enseigne/fidélité, sans changer la règle pour contourner l’erreur |
| S01 | P1 | [VÉRIFIÉ VISUELLEMENT] | Planifier une mission Sécurité aboutit à « Planification impossible : erreur inconnue » | Reproduire et identifier la cause ; fournir un message exploitable |
| T01 | P1 | [VÉRIFIÉ VISUELLEMENT] | Headers, KPI et filtres prennent une grande partie du premier écran mobile avant l’outil métier | Réduire la hauteur du contexte et donner priorité à l’agenda, aux interventions ou à la commande |
| F01 | P1 | [VÉRIFIÉ VISUELLEMENT] | Deux sélecteurs de période simultanés sur Formation mobile : boutons et select | N’exposer qu’un contrôle adapté à la largeur, conserver la synchronisation |
| R01 | P1 | [VÉRIFIÉ VISUELLEMENT] | Sur mobile, note de restaurant placée après le catalogue ; bottom bar orientée planning/ajout de plat plutôt que commande active | Donner un accès direct à la note et au total pendant le service |
| N01 | P2 | [VÉRIFIÉ VISUELLEMENT] | Nettoyage explique le manque d’agent/site mais sans raccourci de résolution dans le message | Relier l’état vide à la configuration nécessaire, selon les droits |
| R02 | P2 | [VÉRIFIÉ VISUELLEMENT] | Recherche restaurant sans résultat : message « Aucun produit disponible dans cette catégorie » | Distinguer recherche vide et catégorie vide |
| R03 | P2 | [VÉRIFIÉ VISUELLEMENT] | Colonne note desktop étroite, nom de produit tronqué ; pictogrammes emoji différents du shell | Rééquilibrer les colonnes et harmoniser l’iconographie |
| T02 | P2 | [VÉRIFIÉ VISUELLEMENT] | Titres d’onglet peu contextuels : « Connexion » encore présent sur Formation, puis titre marketing générique sur d’autres routes | Mettre à jour le titre par écran |
| ISO01 | P1, risque futur | [DÉDUIT DU CODE] | Styles globaux et ancrages DOM du shell partagés avec d’autres surfaces | Borner les futurs changements et vérifier la vitrine à chaque lot transversal |

## 3. Dashboard Formation

### Réussites à conserver

**[VÉRIFIÉ VISUELLEMENT]** La hiérarchie du héros, les cartes KPI, les accents bleus et les panneaux de pilotage forment une base cohérente. Sur desktop, la sidebar et les groupes de navigation structurent bien l’espace. Le cockpit propose une lecture opérationnelle, pas seulement une collection de chiffres.

Le jeu de données consulté sur 90 jours affiche une session clôturée, un stagiaire, 100 % de présence et de documents, une satisfaction de 5/5. Les valeurs absentes après changement de période utilisent des zéros ou tirets plutôt que des nombres inventés.

### Tests et problèmes constatés

- **[VÉRIFIÉ VISUELLEMENT]** Le chargement affiche des états d’attente, dont « Cockpit intelligent en cours d’analyse », puis les indicateurs.
- **[VÉRIFIÉ VISUELLEMENT]** Passage de 90 à 30 jours : le select et les boutons restent synchronisés ; les indicateurs se recalculent et aucun message d’erreur n’apparaît.
- **[VÉRIFIÉ VISUELLEMENT]** À 360/390/430 px, les deux contrôles de période sont affichés simultanément. Cette duplication augmente la hauteur et fait hésiter sur le contrôle principal. À 768 px, le select mobile n’occupe plus cette place.
- **[VÉRIFIÉ VISUELLEMENT]** Le titre de bienvenue s’étale sur plusieurs lignes ; les exports et le CTA rallongent fortement le héros. Le premier écran mobile montre surtout le contexte, peu de données opérationnelles.
- **[VÉRIFIÉ VISUELLEMENT]** Le menu mobile s’ouvre/se ferme ; une recherche sans résultat affiche « Aucune rubrique trouvée ». Le changement d’entreprise fonctionne.
- **[VÉRIFIÉ VISUELLEMENT]** Le titre d’onglet « Connexion | NCR Suite » subsiste pendant la consultation du dashboard dans cette session.

### Mobile, tablette et desktop

Mobile : titres lisibles, cartes cadrées, CTA identifiable et bottom bar présente. Le principal problème est la longueur du parcours vertical. À 390 px, les exports occupent plusieurs lignes ; à 430 px, leur disposition est plus compacte. Tablette : composition lisible, mais encore beaucoup de hauteur dédiée à la synthèse. Desktop : répartition plus équilibrée ; pas de débordement global observé.

### Sensation produit et risques

L’aspect SaaS desktop est déjà convaincant. La sensation « page web » mobile vient du grand bloc d’accueil et des commandes répétées. Priorité à un en-tête plus compact et à une seule commande de période, sans appauvrir le cockpit.

**[DÉDUIT DU CODE]** Les styles Formation constituent une référence interne, mais les composants transversaux et tokens doivent être traités avant une copie dans les autres métiers. Conserver les règles de calcul et les actions existantes.

**[NON TESTÉ]** Exports CSV/PDF, création de session, données Formation massives, formulaires détaillés, lecteur d’écran et navigation clavier complète.

## 4. Rendez-vous Beauty

### Jeu de données et parcours exercés

**[VÉRIFIÉ VISUELLEMENT]** Huit rendez-vous ont été créés par le formulaire pour le mardi 6 octobre 2026, un collaborateur, trois clients de test déjà présents, prestations de 30 ou 45 minutes. Horaires : **09:00, 10:00, 11:00, 12:00, 14:00, 15:00, 16:00 et 17:00**. Montant prévisionnel affiché : **205 €**.

Les notes identifient les éléments `AUDIT UI 1C — rendez-vous test 01` à `08`. Quatre rendez-vous étaient initialement en attente ; celui de 11:00 a ensuite été confirmé avec succès. État final : **cinq confirmés, trois en attente**. La note du RDV de 09:00 a été modifiée avec succès, suffixe « édition vérifiée ».

### Réussites à conserver

- **[VÉRIFIÉ VISUELLEMENT]** Création et édition réussies, message de succès explicite et état d’enregistrement désactivant le bouton.
- **[VÉRIFIÉ VISUELLEMENT]** Double réservation refusée avec « Ce créneau est déjà occupé pour ce collaborateur ».
- **[VÉRIFIÉ VISUELLEMENT]** Créneau de 13:00 refusé avec « Le créneau chevauche une pause du collaborateur » ; création à 14:00 réussie.
- **[VÉRIFIÉ VISUELLEMENT]** Heures, jours, aujourd’hui, plages hors horaires et pause sont représentés. Le texte expliquant le balayage horizontal est utile.
- **[VÉRIFIÉ VISUELLEMENT]** À 390 px, le conteneur semaine mesure environ 336 px pour 800 px de contenu ; son `scrollLeft` passe de 0 à environ 463 px après défilement horizontal. Le document entier ne déborde pas.
- **[VÉRIFIÉ VISUELLEMENT]** Le clic sur mardi ouvre la vue Jour ; le filtre « En attente » restreint bien la liste. Confirmation d’un rendez-vous réussie et message « Le rendez-vous est maintenant “Confirmé” ».
- **[VÉRIFIÉ VISUELLEMENT]** La vue Jour rend les informations métier nettement plus lisibles que la semaine, avec heure, durée, tarif, statut et actions explicites.

### Défauts mobile et desktop

**B01 — P1 : contenu des cartes semaine écrasé. [VÉRIFIÉ VISUELLEMENT]**

À 390 px, un rendez-vous de 30 minutes occupe environ 103 × 32 px. Styles calculés : heure 8 px, client 10 px, prestation 8 px, collaborateur/durée 8 px. À 1440 px : heure et prestation 9 px, client 10 px, détail 8 px, carte haute d’environ 30,5 px. Les lignes sous l’heure sont comprimées ; sur le rendez-vous inspecté en desktop, leurs boîtes ne mesurent qu’environ 1,6 à 2,1 px de haut. Le contenu est réellement presque illisible/coupé, pas seulement petit sur la capture. Les rendez-vous de 45 minutes montrent davantage de contenu.

La cible de 30–32 px de haut est inconfortable pour un usage tactile précis. Le défilement horizontal existant doit être conservé : il ne résout pas la hauteur insuffisante des cartes.

**B02 — P1 : journée dupliquée sur téléphone. [VÉRIFIÉ VISUELLEMENT]**

Après les huit rendez-vous, une seconde section « AGENDA DU JOUR — Mardi 6 octobre 2026 » recommence à 09:00 avec les mêmes huit entrées. Deux listes réellement rendues, environ 1786 et 1806 px de haut, sont mesurées à 360/390/430 px. À 768 et 1440 px, la seconde liste existe dans le DOM mais sa hauteur est nulle : **pas de doublon visuel établi à ces largeurs**. Il s’agit d’une duplication de présentation, pas d’une preuve de rendez-vous enregistrés en double.

**[DÉDUIT DU CODE]** `src/pages/AppointmentsPage.tsx:1621` et `:1624` rendent chacun `selectedDayAppointments.map(appointmentCard)`. C’est une piste précise à rapprocher des règles de visibilité mobile, sans présumer de l’identité exacte du bundle distant.

**B03 — P1 : fiche d’actions rapides hors écran. [VÉRIFIÉ VISUELLEMENT]**

À 390 × 900 px, ouverture directe depuis le rendez-vous de 09:00 : voile affiché et bottom navigation encore visible, mais fiche située à environ y=912–1237, sous le viewport. Un scroll vertical permet de la retrouver à y=372–696. Reproduit après fermeture/réouverture en mobile, donc pas seulement lors du passage depuis desktop. Les actions existent et sont utilisables après défilement ; l’ouverture ne les met pas immédiatement à portée de vue.

**B04 — P1 : fin de prestation refusée. [VÉRIFIÉ VISUELLEMENT]**

Sur le RDV de 09:00, bouton « Terminer » : « Mise à jour impossible : La fidélité doit rester dans l’enseigne du client. » Le statut reste Confirmé. L’alerte est placée dans la page, loin de la fiche ouverte : il faut revenir en haut pour la lire. La confirmation d’un autre rendez-vous fonctionne : ne pas généraliser cet échec à tous les statuts. La cause serveur exacte n’a pas été consultée.

### Hiérarchie, statuts, navigation et sensation premium

**[VÉRIFIÉ VISUELLEMENT]** Le haut de page et les quatre KPI monopolisent le premier écran mobile avant le planning. Les boutons principaux sont repérables ; le formulaire conserve des labels, une durée/un tarif récapitulés et les valeurs lors de l’édition. Il reste long et pousse le planning vers le bas. La bottom navigation donne accès à Accueil, Rendez-vous, Nouveau et Menu, avec l’accent métier violet.

En semaine, Confirmé et En attente restent proches : même fond bleuté, distinction par bordure pleine/pointillée, pas de libellé de statut dans les cartes. Le détail et la vue Jour donnent des libellés explicites ; leurs petits badges secondaires restent discrets. Conserver la distinction non exclusivement colorée, mais rendre le statut immédiatement compréhensible.

Desktop : sidebar cohérente et KPI alignés, mais la lisibilité métier de l’agenda est en retrait par rapport au shell. Mobile : la vue Jour est une bonne base d’application, une fois la duplication supprimée ; le header compact et les actions à portée de main doivent prendre le pas sur les grandes synthèses.

### Risques et limites

**[DÉDUIT DU CODE]** Les classes du shell servent d’ancrages à `BeautySidebarNavigation` et à d’autres injections/portails recensés en phase 1A. Ne pas les renommer dans un simple lot CSS sans vérifier leurs consommateurs. Le test porte sur l’offre Professionnelle ; les variantes spécifiques Métier/Essentiel ne sont pas validées par ce résultat.

**[NON TESTÉ]** Plusieurs collaborateurs simultanés, sept journées très chargées, rendez-vous chevauchants autorisés selon métier, déplacement par geste, annulation et suppression, paiement, SMS/e-mails sortants, parcours client public, PWA installée et clavier virtuel. La densité testée est une journée de huit rendez-vous, pas une charge maximale de salon.

## 5. Planning Sécurité

### Réussites à conserver

**[VÉRIFIÉ VISUELLEMENT]** Vue structurée par site et par jour, résumé missions/heures/coût, navigation temporelle et CTA « Planifier une mission » explicite. Quatre lignes de sites et des agents sont disponibles. Sidebar desktop et contexte d’établissement rendent le périmètre compréhensible.

### Défauts et parcours

**[VÉRIFIÉ VISUELLEMENT]** Semaine du 5 au 11 octobre initialement vide. Le formulaire s’ouvre dans la page, avec agent, site, début et fin. La soumission d’une mission avec les valeurs de début/fin par défaut, du 5 octobre à 21:00 au 6 octobre à 05:00, montre « Planification… », puis **« Planification impossible : erreur inconnue »**. Le compteur reste à zéro ; aucune mission réussie n’est constatée. L’interface ne propose pas de résolution précise.

Une tentative de saisie de date par l’outil n’a pas persisté après rerendu : elle est exclue des résultats. **La validation “fin avant début” n’a donc pas été testée.** Aucun défaut de saisie manuelle n’est déduit de cette limitation d’automatisation.

### Mobile / tablette / desktop

**[VÉRIFIÉ VISUELLEMENT]** Aux petites largeurs, héros, KPI et barre de période occupent beaucoup de hauteur. Les colonnes du planning dépassent la largeur de leur conteneur sans élargir toute la page ; le contexte site prend une grande part de l’espace visible. La bottom bar reste affichée pendant le défilement vertical. Sur desktop, l’espace est plus approprié à la grille, mais certaines colonnes demandent encore une exploration du conteneur.

**[NON TESTÉ]** Balayage horizontal complet de ce planning, lisibilité de missions chargées, conflits, édition/suppression et changements de statut : aucune création n’a abouti pendant cet essai. Ne pas extrapoler la bonne tenue de la grille vide à un planning rempli.

### Sensation produit et risques

La matrice correspond à l’exploitation desktop. Sur téléphone, la longue synthèse puis la grille évoquent davantage une page d’administration. Priorités : réduire le contexte vertical, rendre le changement de jour/site immédiatement pratique et traiter le message d’erreur. Préserver horaires de nuit, affectations, coûts et périmètre d’établissement ; aucune correction métier n’est proposée comme simple polish UI.

## 6. Planning Nettoyage

### Réussites à conserver

**[VÉRIFIÉ VISUELLEMENT]** Accent vert cohérent, titres clairs, indicateurs cadrés, vues Semaine/Mois/Jour accessibles. Le changement vers Mois puis Jour fonctionne. Aucun débordement global du document n’est mesuré.

### État réel et défauts

**[VÉRIFIÉ VISUELLEMENT]** Zéro agent actif et zéro intervention ; un site est disponible dans la sélection. Le bouton Planifier est désactivé, avec l’explication **« Il faut au moins un site actif et un agent actif pour planifier. »** C’est un prérequis explicite, pas une permission contournée ni un bug de création prouvé.

Le message ne permet pas d’aller directement configurer le prérequis manquant. L’état est compréhensible mais peu accompagnant. Les KPI à zéro occupent une place importante avant l’espace de travail.

### Mobile / tablette / desktop

**[VÉRIFIÉ VISUELLEMENT]** Sur téléphone, le héros, l’alerte de prérequis et les KPI repoussent le planning sous le premier écran. À 390 px en Jour, le sélecteur de site arrive près de la bottom bar. Les surfaces sont propres et le bouton désactivé identifiable. Sur desktop, la grille vide paraît très étendue faute de contenu utile ou d’action de démarrage.

### Sensation produit, risques et limites

Priorités : état vide guidé, raccourci vers les agents si autorisé, hiérarchie réduite des KPI vides et navigation Jour adaptée au terrain. Conserver les informations de protocole, de site et d’affectation lors d’une future évolution.

**[NON TESTÉ]** Création d’un agent, création/édition d’intervention, planning dense, protocoles exécutés, statuts et erreurs de soumission. Aucun agent n’a été créé pendant cet audit. Le module est accessible, mais son parcours opérationnel complet n’est pas validé.

## 7. Commandes Restauration

### Réussites à conserver et parcours réussi

**[VÉRIFIÉ VISUELLEMENT]** Sept tables et neuf produits sont disponibles. La sélection de note/table, les prix et les actions d’ajout sont identifiables. La composition desktop en trois zones — tables, catalogue, note — correspond bien au flux métier.

Une **note libre, commande n°7, deux couverts** a été ouverte : message de succès. Ajout d’une marguerite à 10 € et d’un soda à 3 € : total 13 €. Retrait du soda via son bouton : total 10 €. Envoi en cuisine : boutons temporairement désactivés, feedback « Les nouveaux articles ont été envoyés en cuisine », état **En cours** et article envoyé. Aucun encaissement effectué.

Recherche sans correspondance testée puis effacée : liste vide correctement produite, mais texte générique « Aucun produit disponible dans cette catégorie », même lorsque le filtre responsable est une recherche.

### Mobile / tablette / desktop

**[VÉRIFIÉ VISUELLEMENT]** En mobile, zones empilées : tables, catalogue, puis note. Avec les produits disponibles, la note et son total sont éloignés du début de page ; ajouter puis vérifier la note nécessite du défilement. Les tables et catégories disposent de bandes horizontales ; aucune largeur excessive du document entier n’est mesurée.

La bottom navigation affiche Accueil, Planning équipe, Nouveau, Menu. Le raccourci Nouveau renvoie à l’ajout d’un plat (`/carte`) ; il ne ramène pas à la note active. Cela paraît peu adapté à la tâche de service sur l’écran Commandes. Le héros explicatif ajoute encore une grande zone avant l’action.

Desktop : les trois colonnes réduisent ce problème, mais la note est étroite et le libellé de produit peut être tronqué. Les prix sont visibles. Les emoji du catalogue apportent une identité différente des icônes sobres du shell ; les bordures, rayons et panneaux restent globalement cohérents.

### Sensation produit, risques et limites

Priorités : accès persistant ou immédiat à la note et au total sur téléphone, raccourcis contextuels, catalogue à densité maîtrisée, largeur utile de la note desktop. Préserver l’ordre des envois cuisine, les lignes déjà envoyées, les quantités et les calculs.

**[NON TESTÉ]** Encaissement, clôture de note, remboursement, imprimante/ticket, simultanéité entre salle et cuisine, grands volumes de commandes et navigation clavier complète. Le retour affiché dans Commandes a été vérifié ; le poste cuisine séparé n’a pas été contrôlé.

## 8. Cohérence transversale et protection de la vitrine

**[VÉRIFIÉ VISUELLEMENT]** Les cinq métiers partagent sidebar, header mobile, compte/entreprises et bottom navigation ; les accents changent avec le métier. Les menus, boutons principaux et surfaces appartiennent visuellement à une même famille. Les différences de densité et d’iconographie restent perceptibles, en particulier Restauration. Les petits textes secondaires et grandes synthèses ne donnent pas partout le même niveau de confort opérationnel.

Les zones tactiles principales sont repérables. Beauty expose un cas mesuré de cible trop basse. Les contrastes ont été appréciés visuellement ; **[NON TESTÉ]** ratios WCAG exhaustifs, focus sur tous les contrôles, navigation au lecteur d’écran, réduction des animations. Les états pressés, chargements et boutons désactivés ont été observés au cours des actions ; fluidité/FPS et micro-interactions complètes ne sont pas certifiées.

**[DÉDUIT DU CODE]** Le couplage global documenté en phases 1A/1B reste un risque pour une refonte : `src/ncrUi2026.css` touche le body, et les classes communes peuvent être utilisées hors shell. La phase 1B avait mesuré cette application de styles sur la landing locale. **[NON TESTÉ]** nouvelle comparaison visuelle de la landing publique distante dans cette phase connectée ; aucune régression publique actuelle n’est affirmée.

Pour les futurs lots : délimiter les règles au shell/racines concernées, conserver les tokens et ancrages fonctionnels, comparer la landing séparément avant/après. Ne pas résoudre un défaut d’agenda par une surcharge globale de tous les boutons, cartes ou dialogues.

## 9. Lots recommandés après validation de l’audit

1. **Diagnostic fonctionnel ciblé préalable** : erreurs Sécurité et fin de prestation Beauty. D’abord reproduire avec les contextes entreprise/enseigne/client exacts. Une lecture ciblée des erreurs et dépendances serveur peut devenir nécessaire ; aucune modification d’infrastructure n’est autorisée par cet audit.
2. **Socle mobile et overlays** : placement des dialogues, gestion du scroll, couches de la bottom bar, tailles de contrôles, messages près de l’action. Vérifications multi-métiers et vitrine.
3. **Beauty agenda** : une seule liste Jour, cartes courtes lisibles, statuts explicites, conservation du scroll horizontal et des contraintes métier. Rejouer les huit RDV, conflit, pause, confirmation et édition.
4. **Densité commune** : headers/KPI compacts, un seul filtre Formation mobile, états vides accompagnés. Adapter sans uniformiser artificiellement les métiers.
5. **Flux Restaurant et plannings** : note accessible sur mobile, planning Sécurité/Nettoyage rempli après résolution des prérequis, puis finition desktop/tablette et audit d’accessibilité ciblé.

## 10. Données laissées dans l’espace test

| Espace | Modification réellement effectuée | État laissé |
|---|---|---|
| AZZERA CUT | 8 RDV créés le 06/10/2026 ; confirmation du RDV de 11:00 ; édition de la note du RDV de 09:00 | 8 RDV, 5 confirmés, 3 en attente, 205 € prévisionnels ; notifications internes générées |
| Azzera Food | Commande n°7 créée ; marguerite + soda ajoutés ; soda retiré ; marguerite envoyée en cuisine | Note libre ouverte, 2 couverts, 10 €, En cours, non encaissée |
| Azzera Protect | Tentative de planification refusée | Aucune mission créée constatée |
| Azzera Service + | Navigation et vues seulement | Aucun agent/intervention créé |
| AZZERA ACADEMY | Période et recherche de menu testées | Aucune donnée métier modifiée |

Les données ont été laissées pour reproduire les constats. Aucun mot de passe, token ou secret n’est conservé dans ce rapport.

## 11. Captures et preuves

Afin de respecter « mettre à jour uniquement ce fichier », les captures sont conservées **hors dépôt**, dans `/tmp/ncr-phase1c-captures/` (emplacement temporaire, susceptible d’être nettoyé par le système).

- Pour chaque largeur 360/390/430/768/1440 : `formation-{largeur}.jpg`, `securite-{largeur}.jpg`, `nettoyage-{largeur}.jpg`, `restaurant-{largeur}.jpg`, `beauty-{largeur}.jpg`.
- Agenda chargé : `beauty-dense-360.jpg`, `beauty-dense-390.jpg`, `beauty-dense-430.jpg`, `beauty-dense-768.jpg`, `beauty-dense-1440.jpg`.
- Doublon : `beauty-day-duplicate-390.jpg` ; vues Jour : `beauty-day-*.jpg` et `beauty-day-final-*.jpg`.
- Dialogue hors écran et récupéré : `beauty-actions-reopened-390.jpg`, `beauty-actions-scroll-390.jpg`.
- Erreur métier : `beauty-status-error-390.jpg`.
- Succès final / édition : `beauty-final-summary-390.jpg`, `beauty-edit-390.jpg`.
- Autres : `formation-menu-empty.jpg`, `securite-scroll.jpg`, `nettoyage-jour-390.jpg`, `restaurant-top-390.jpg`, `restaurant-note-390.jpg`.
- Mesures de viewport : `viewport-measurements.json` ; l’essai initial Formation 360 avant stabilisation du facteur d’échelle ne doit pas être retenu. La capture et les mesures suivantes à 360 effectifs sont celles utilisées.

Les noms ne garantissent pas que toute une action se trouve dans le cadrage : notamment `restaurant-note-390.jpg` montre le feedback et le catalogue, et `securite-form-error-390.jpg` ne cadre pas l’alerte. Les messages Sécurité ont été lus dans le rendu/DOM, pas inventés à partir de ces captures.

### Exemples de preuves

![Beauty : journée répétée à 390 px](/tmp/ncr-phase1c-captures/beauty-day-duplicate-390.jpg)

![Beauty : erreur lors de la fin de prestation](/tmp/ncr-phase1c-captures/beauty-status-error-390.jpg)

![Beauty : huit rendez-vous, trois encore en attente, édition réussie](/tmp/ncr-phase1c-captures/beauty-final-summary-390.jpg)

## 12. Limite de conclusion

L’audit établit des défauts réels et reproductibles sur les cinq écrans accessibles. Il ne valide pas l’ensemble fonctionnel des cinq métiers : Formation détaillée, planning Sécurité rempli, opérations Nettoyage et encaissement Restaurant restent à couvrir. L’agenda Beauty a été testé avec une journée chargée, ses créations, une édition, ses contraintes, ses filtres et deux transitions de statut dont une refusée. Aucun contournement de permissions ou changement applicatif n’a été réalisé. Le viewport temporaire du navigateur a été réinitialisé à la fin des tests.
