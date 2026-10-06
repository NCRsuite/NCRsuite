# Phase 7 — QA Release Candidate

Date : 6 octobre 2026. Base contrôlée : `5acff5175f6cf540775cc66b7625ffeef837ff97`, branche `refactor/premium-app-experience`.

## Verdict : READY FOR PREVIEW

La branche est suffisamment stable pour une **preview de validation sur vrai iPhone**. Aucun nouveau blocage critique ni régression de branche constaté dans les parcours effectivement couverts. Ce verdict n'est pas une validation de mise en production ni une certification exhaustive des permissions, du réseau ou du fonctionnement hors ligne.

La reprise conserve les contrôles déjà validés par l'utilisateur ; ils n'ont pas été rejoués. Aucune correction applicative effectuée, aucune migration ni modification de configuration distante. La reprise a été menée sans écriture Supabase, y compris via les formulaires de l'application.

## Résultats par catégorie

`PASS limité` signifie que le contrôle décrit a réussi, avec les exclusions indiquées ; ce n'est pas un PASS des scénarios non testés.

| Catégorie | Résultat | Preuve / portée |
|---|---|---|
| TypeScript | PASS acquis | `tsc -b`, résultat conservé de la première partie de QA |
| Build production | PASS acquis | `npm run build`, audits inclus, Vite et SEO ; avertissement de taille de chunks non bloquant |
| Tests existants | PASS acquis | `node --test scripts/ui-foundations.test.mjs` : 5/5 |
| Lint | NON TESTÉ | Aucun script lint dédié dans package.json |
| Beauty | PASS acquis | Création, modification, responsive aux cinq largeurs ; preuves distantes acceptées ci-dessous |
| Formation | PASS | Dashboard, période, Smart Cockpit, navigation, accès création et exports |
| Sécurité | PASS limité | Dashboard, planning, dates, sites, agents, navigation ; création exclue |
| Création de mission Sécurité | FAIL connu | Anomalie RLS préexistante, volontairement non corrigée et non rejouée ; explicitement exclue du blocage de cette preview |
| Nettoyage | PASS | Dashboard, planning, interventions, filtre, recherche, textes longs et navigation |
| Restauration | PASS limité | Catalogue, note existante, quantités affichées, total et cuisine ; mutations non testées |
| Responsive global | PASS limité | Vues ciblées aux cinq largeurs ; aucun débordement global mesuré ; appareil physique non testé |
| Branding | PASS | Bascule entre cinq métiers sans rechargement ; état final correct |
| Console | PASS | Aucun error enregistré dans les parcours consultés ; deux avertissements React Router en développement |
| Réseau | PASS limité | Aucun échec critique apparent dans les parcours chargés ; pas de capture exhaustive des requêtes/HTTP |
| PWA | PASS statique / runtime NON TESTÉ | Manifest, références, stratégie et mise à jour inspectés ; limites détaillées plus bas |
| Landing / CSS publics | PASS | Rendu du build à 390 et 1440 px ; fichiers publics identiques à main, pas de shell applicatif sur la landing |
| Git / confidentialité | PASS | Branche correcte, main inchangée, env ignoré/non suivi, aucun secret détecté par les contrôles ciblés |

## Parcours réellement contrôlés

### Formation

- Entreprise AZZERA ACADEMY : dashboard et navigation chargés ; état vide des sessions présenté correctement.
- Changement de période de 90 à 30 jours : sélection et libellé actualisés.
- Smart Cockpit : synthèse puis ouverture de « À faire ensuite », état sans action prioritaire cohérent.
- « Créer une session » ouvre `/sessions?new=1` : formation, formateur, établissement, dates/heures, capacité, stagiaires et notes accessibles. Aucune soumission.
- Menu Exporter : CSV et Rapport PDF disponibles. Téléchargement/contenu des exports non testés, conformément au périmètre.

### Sécurité

- Azzera Protect : dashboard, quatre sites actifs et deux agents affichés ; planning sans mission.
- Navigation semaine suivante puis Aujourd'hui : dates actualisées.
- Accès Sites puis Équipe & accès → Agents : listes et informations visibles.
- Planning mobile conservant une largeur de colonnes lisible et un débordement interne intentionnel, sans débordement de la page.
- Pas de création de mission, de contournement ni de changement RLS. Journée dense non testable avec les données affichées.

### Nettoyage

- Azzera Service+ : dashboard puis planning avec une intervention de 13:00 à 15:00, agent, site et deux heures planifiées.
- Sélection du site et de l'agent, passage en vue Jour : protocole long « Test UX — entretien des espaces pédagogiques et contrôle des salles » lisible en entier.
- Interventions : filtre Terminées → état vide ; Planifiées → une intervention ; recherche « pédagogiques » → résultat pertinent.
- Menu mobile : ouverture, navigation et fermeture ; entrée active identifiable.
- Limite non bloquante : le titre long est tronqué dans la liste, alors qu'il est lisible dans le planning Jour. Aucun polish ajouté.

### Restauration

- Azzera Food : dashboard, Commandes, catalogue de neuf produits et plusieurs catégories ; carte et note accessibles sur mobile, côte à côte sur desktop.
- Commande existante n°7, quatre lignes : 1 × 10 €, 2 × 12 €, 1 × 5 €, 1 × 3 € ; total **42 €**, cohérent avec les quantités affichées.
- Note longue visible sur la pizza ; bas de note accessible par scroll. À 390 px, boutons visibles au-dessus du dock (bouton d'envoi vers y509–557, dock à y824–900).
- Commande déjà envoyée et « À encaisser » : ajout et quantités verrouillés ; aucun brouillon à envoyer. Ce verrouillage n'est pas une régression.
- Écran cuisine accessible : ticket n°7, quatre lignes, quantités et note visibles. Aucune transition de statut exécutée.
- **NON TESTÉ : ajout, modification des quantités ou de note, création de commande, envoi cuisine et encaissement.** Ces actions persistent dans Supabase ; aucune exception à l'interdiction d'écriture n'a été obtenue pendant la reprise. Pas de succès d'envoi revendiqué.

### Beauty — résultats acquis, non rejoués

Création et modification via l'interface, responsive 360/390/430/768/1440 validés avant interruption. Protections présentes, sept rendez-vous réparés, zéro incohérence restante : contrôles acceptés par l'utilisateur à la reprise.

Le succès réel de Terminer et l'écriture unique de fidélité proviennent du test post-migration documenté en 6B.1 : **+1 visite, 0 point**. Le rendez-vous créé pendant la première partie de QA n'a pas été terminé dans cette reprise. Aucun nouveau contrôle distant ni nouvelle écriture de fidélité.

## Responsive et branding

| Vue inspectée | 360 | 390 | 430 | 768 | 1440 |
|---|---|---|---|---|---|
| Beauty | PASS acquis | PASS acquis | PASS acquis | PASS acquis | PASS acquis |
| Formation dashboard | PASS | PASS | PASS | PASS | PASS |
| Sécurité planning | PASS | PASS | PASS | PASS | PASS |
| Nettoyage planning | PASS | PASS | PASS | PASS | PASS |
| Restauration commandes | PASS | PASS | PASS | PASS | PASS |

Largeurs réellement mesurées, zoom/échelle 1, DPR 1. Sur ces vues, `scrollWidth` de la page égale sa largeur. Inspection des captures : headers, hiérarchie, dock mobile et état tablette cohérents ; aucun chevauchement bloquant constaté. Sidebar desktop Restauration contrôlée avant/après scroll : position fixe, haut à zéro. Scrolling du contenu naturel ; débordement interne des plannings intentionnel. Safe areas prévues par `env(safe-area-inset-*)` dans le CSS, mais encoche/clavier/gestes iOS **[NON TESTÉ SUR APPAREIL PHYSIQUE]**.

Bascule sans rechargement Beauty → Formation → Sécurité → Nettoyage → Restauration : nom, logo, couleur, contexte métier et navigation corrects après chargement. Lors de Sécurité → Nettoyage, l'ancien établissement est apparu brièvement dans un contrôle désactivé pendant chargement, puis a disparu ; aucun résidu persistant. Bascule rapide concurrente et tous les sous-établissements non rejoués. Le défaut déjà documenté de portail du sélecteur d'enseigne mobile reste hors correction.

## PWA, landing et réseau

- Manifest présent : scope `/`, démarrage `/connexion?source=pwa`, mode standalone. Icônes 192/512 et maskable 512 présentes ; références de précache retrouvées dans le build.
- Service worker identique à main. Lecture du code : cache versionné, réseau d'abord, refus d'une réponse HTML pour un asset de code, fallback navigation, nettoyage des anciens caches du même préfixe.
- Enregistrement en production seulement ; mécanisme de mise à jour présent, événement `ncr:sw-update`, bouton Actualiser et traitement `controllerchange`.
- Build servi localement sur 4173 et landing effectivement rendue à 1440/390 : aucun ancien style évident, aucune erreur console enregistrée. Header public et CTA conservés ; aucun shell applicatif parasite.
- **NON TESTÉ** : état effectif d'enregistrement/contrôle du SW, contenu runtime des caches, bascule hors ligne et mise à jour entre deux versions. L'API navigateur disponible limite l'évaluation à la lecture DOM et n'expose pas `navigator.serviceWorker`. Aucun statut runtime inventé à partir du seul code.
- **[NON TESTÉ SUR APPAREIL PHYSIQUE]** : installation iOS, lancement standalone, reprise après suspension, mise à jour du cache sur un appareil déjà installé.
- Aucune erreur JavaScript ni promesse rejetée enregistrée dans les parcours inspectés. Deux avertissements React Router v7 en développement, aucun sur la landing de production. Les données attendues se chargent ; pas d'inspection HTTP exhaustive disponible, donc absence de toute erreur réseau non certifiée.
- `git diff main HEAD -- public src/styles.css` vide : CSS et assets publics inchangés. Le build n'a pas réécrit les CSS publics. Isolation contrôlée visuellement sur la landing ; tests de fondations déjà PASS.

## État Git, corrections et preuves

- Aucun code corrigé pendant cette QA ; pas de motif concret pour rejouer TypeScript/build/tests acquis.
- Diff historique main → branche : 55 fichiers, 4 064 insertions / 1 800 suppressions, dont les deux migrations Beauty déjà validées. Aucun fichier Supabase ajouté/modifié pendant la QA.
- Main reste `63fa0563b51816197b4f6dbbc4de0b5a2a506670` ; HEAD reste `5acff5175f6cf540775cc66b7625ffeef837ff97`.
- Working tree propre au départ de la QA ; artefacts générés par le build (`dist`, métadonnées TypeScript) retirés du diff final. Seuls ce rapport et `07_PROGRESS.md` restent ajoutés/modifiés.
- `.env.local` ignoré et absent de l'index ; contenu jamais lu. Aucune clé privée, JWT ou signature de secret fournisseur détectée dans les lignes ajoutées depuis main. Ce contrôle ciblé ne constitue pas un audit exhaustif des secrets de tout l'historique.
- Aucun commit, push, merge ou déploiement. Serveur de preview local arrêté après contrôle.
- Preuves temporaires non versionnées : `/tmp/ncr-rc-qa/`, mesures `responsive.json`, captures `formation-*`, `securite-planning-*`, `nettoyage-planning-*`, `restauration-commandes-*`, `drawer-nettoyage-390.png`, `restauration-note-bas-390.png`, `cuisine-existante-1440.png`, `landing-production-{390,1440}.png`. Build conservé hors dépôt dans `dist-final/`. Les fichiers temporaires ne sont pas garantis persistants après nettoyage système.

## Risque restant avant preview

Aucun P0 nouveau constaté. Risques explicitement conservés : création de mission Sécurité bloquée, sélecteur d'enseigne mobile historique, parcours d'écriture Restauration non rejoué, datasets peu denses Formation/Sécurité et couverture réseau limitée. La preview doit servir en priorité à tester un vrai iPhone (clavier, safe areas, PWA/cache), puis une commande modifiable avec autorisation d'écriture. Ces réserves ne bloquent pas l'ouverture d'une preview de test ; elles interdisent de présenter ce rapport comme une validation complète de production.
