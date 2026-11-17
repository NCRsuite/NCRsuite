# Espace super administrateur — amélioration locale

Date : 17 novembre 2026. Branche : `refactor/super-admin-experience`.
Base vérifiée : `9e0b08f99fafa4bc98d687478c60a157b6a36731`, identique sur main et origin/main au démarrage.

## Changements

- `src/pages/PlatformAdminPage.tsx` : navigation principale déplacée en rail latéral desktop, navigation mobile horizontale défilante, état courant accessible, lien d’évitement, recherche clients étiquetée, bouton de création nommé même en mode icône. Le formulaire de changement d’e-mail existant reste réservé aux mêmes rôles/sections, dans une section dépliable en bas des outils avancés.
- `src/components/AdminSaasCockpit.tsx` : introduction compacte, chargement et erreur explicites. L’ancien badge inconditionnel « Plateforme opérationnelle » devient « Administration NCR » ; aucune donnée de santé inventée.
- `src/platformAdmin.css` : styles délimités à l’administration, tokens NCR UI 2026, hiérarchie des indicateurs, surfaces légères, boutons et onglets harmonisés, recherche/fiches clients, mobile/tablette/desktop, focus visible et mouvement réduit.
- Facturation : la classe existante `billing-view-hidden` n’avait pas de règle effective dans la baseline CSS servie. Les vues existantes sont désormais séparées visuellement ; grille adaptée à la vue sélectionnée. Aucune règle commerciale ni action de paiement modifiée.
- Scroll : l’ancien overflow-x:hidden des ancêtres empêchait sticky. Les conteneurs extérieurs utilisent clip/visible seulement lorsque la page administrateur est montée. Le document conserve son scroll naturel. Aucune modification du shell professionnel.

## Contrôles réalisés

Compte super administrateur connecté manuellement par l’utilisateur, sur l’application locale. Aucune validation de formulaire métier, de facturation ou de compte.

- Ouverture des cinq rubriques : Vue d’ensemble, Clients, Abonnements, Assistance, Plateforme.
- Recherche clients : résultat vide puis retour aux résultats ; filtre métier ; ouverture de la fiche entreprise.
- Onglets de facturation : À traiter puis Catalogue Stripe ; panneaux inactifs effectivement masqués, panneaux actifs accessibles.
- Fenêtre Créer un espace : ouverture puis annulation sans saisie ni création.
- Largeurs DOM mesurées 360/390/430/768/1440 : cockpit et catalogue de facturation sans dépassement global (`scrollWidth === clientWidth`). Fiche entreprise contrôlée à 390 et 1440. Les navigations horizontales sont volontairement confinées à leurs propres conteneurs sur smartphone.
- Header au défilement mobile : top=0 ; navigation à environ126px. Desktop : header top=0, rail à environ112px. Navigation stable.
- Captures observées à 390, tablette et desktop. Le navigateur intégré met parfois un rendu à jour en retard après redimensionnement ; mesures DOM et captures stabilisées distinguées. Aucun test physique iPhone/PWA revendiqué.
- Console : une erreur HMR transitoire lors de l’import du fichier CSS avant sa création ; résolue par rechargement. Aucune nouvelle erreur capturée pendant les parcours suivants.
- Tests ciblés existants Beauty client/planning : 14/14 PASS.
- Comparaison des deux composants : fonctions, requêtes et logique avant rendu strictement identiques à HEAD (hors import CSS).
- TypeScript (`tsc -b`, inclus dans le build) : PASS. Compilation production : PASS, code de sortie 0. Contrôles statiques, parcours critiques, release-readiness et génération SEO : PASS. Avertissement existant de taille du bundle conservé (pas de nouveau découpage hors périmètre).

## Protection et limites

Aucune route, permission, action serveur, migration ou configuration Supabase modifiée. Aucun compte, abonnement, ticket ou réglage réel enregistré. Les droits support non-super-admin sont conservés dans le code, mais non testés avec un second compte. Les commandes sensibles (paiement, suspension, création, changement d’e-mail, envoi) ne sont volontairement pas exécutées.

Les alertes du module de surveillance existant restent visibles ; leur diagnostic métier/infrastructure est hors périmètre. Les autres métiers ne font pas l’objet d’une nouvelle recette complète : isolation CSS et diff vérifiés, tests ciblés exécutés. CSS publics et baseline héritée inchangés. `.env.local` ignoré, non versionné, non lu.

Validation visuelle utilisateur reçue le 17 novembre 2026, suivie d’une autorisation explicite de publication de ce lot uniquement. Préflight production : main et origin/main identiques à la base vérifiée ; seuls les deux composants administrateur, la feuille CSS dédiée et ce document sont inclus. Publication par fast-forward, sans changement applicatif supplémentaire. Les statuts distants et la version servie sont contrôlés après publication.

## Captures locales

- Avant : `/tmp/ncr-admin-before.png` (format de capture navigateur).
- Après desktop : `/tmp/ncr-admin-after.jpg`.
- Après mobile : `/tmp/ncr-admin-mobile.jpg`.

URL locale : http://127.0.0.1:5173/administration-ncr
