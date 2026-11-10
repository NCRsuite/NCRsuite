# Beauty — parcours client premium

## État au 15 octobre 2026

**BLOQUÉ pour la validation de bout en bout.** Les évolutions locales sont réalisées ; elles ne constituent pas une release validée. Aucune publication, aucun merge, aucun déploiement, aucune migration ou modification de fonction distante.

Branche : `refactor/beauty-client-experience`, créée depuis la version stable vérifiée `c2f0d28514846a12a0f38d460c8d67338e7cc300`. Dépôt `NCRsuite/NCRsuite`. Avant création : checkout propre, fetch réussi, `main` et `origin/main` identiques. Aucun ancien travail de la refonte professionnelle n'a été réutilisé comme base. Aucun commit créé pour ce lot.

## Composition et périmètre réalisés

- Page publique : header compact, photographie séparée du texte, présentation longue dans une section dépliable, prestations rapprochées de l'introduction, informations pratiques conservées après le formulaire. Sans photographie, aucune colonne vide réservée. Logos en proportions originales, pas de nouvelle image ou preuve commerciale inventée.
- Réservation : étapes dépendantes révélées progressivement, choix conservés dans l'état du formulaire, prix/durée lisibles, contrôles tactiles, récapitulatif avant envoi. Les catégories, images et choix multiples de la page enseigne restent présents.
- Confirmation/gestion : statut confirmé/en attente explicite, durée, lieu renvoyé par le serveur, calendrier conservé, droits de déplacement et d'annulation distincts. Une adresse d'organisation n'est plus présentée comme celle d'un site lorsqu'il manque l'adresse du site.
- Espace client : introduction courte, priorité au prochain rendez-vous ou à son état vide, suppression du grand doublon d'identité, historique « Passés et annulés », fidélité réelle, quatre entrées de navigation. Préférences et autorisations de modification conservées.
- Couleurs : accent configuré conservé ; dérivation d'un ton de même famille pour les actions, avec contraste blanc ≥ 4,5:1. Plus de prune imposé à toutes les enseignes. Réglages existants de marque blanche conservés.
- Navigation mobile : barre bord à bord, items de 52 px minimum, safe area dans son padding et réserve correspondante dans le contenu. Aucune prétention de validation Safari/iPhone physique.
- Styles limités aux classes publiques/clientes. Aucun changement du shell professionnel, de l'agenda professionnel, des routes ou de la landing.

## Fichiers du lot

| Fichier | Modification |
|---|---|
| `src/pages/PublicBookingPage.tsx` | Composition publique, étapes, retour de connexion, soumission et confirmation |
| `src/pages/PublicMetierCoiffureCompanyPage.tsx` | Composition enseigne, conservation des sélections, confirmation et erreurs |
| `src/pages/PublicBookingManagePage.tsx` | Présentation du rendez-vous, lieu/fuseau, droits et garde de mutation |
| `src/pages/CoiffureClientPortalPage.tsx` | Accueil compact, identité réelle, navigation et protection contre les réponses périmées |
| `src/pages/CoiffureClientPortalInvitationPage.tsx` | Présentation et texte d'activation fidèle au mécanisme existant |
| `src/pages/ForgotPasswordPage.tsx` | Retour client pour `?client=beauty`, parcours professionnel inchangé |
| `src/beautyPublicBookingBaseline.css` | Consolidation des règles de réservation publique ; éditeur de couverture professionnel conservé |
| `src/publicMetierCoiffureCompany.css` | Composition responsive de la page enseigne |
| `src/beautyClientPortal.css` | Composition client, navigation, lisibilité et états |
| `src/beautyVerifiedReviews.css` | Uniquement boutons d'avis du portail : taille tactile et contraste ; avis publics inchangés |
| `src/lib/beautyClientExperience.ts` | Garde de soumission, validation de réponse, contraste et retour client |
| `scripts/beauty-client-experience.test.mjs` | Tests ciblés des comportements ajoutés |
| `docs/beauty-client-experience/PROGRESS.md` | Ce suivi unique |

## Identité : sources réellement constatées

Lecture ciblée du catalogue/fonctions et des données de personnalisation, sans SQL de modification. Compte client connecté manuellement sur localhost par l'utilisateur ; aucune session professionnelle récupérée.

| Contexte | Source | Résultat observé |
|---|---|---|
| Organisation | `organizations` | AZZERA CUT, offre `professionnelle`, nom public Azzera Nail, slug `nail` |
| Page `/reserver/nail` | `get_public_booking_page` puis configuration organisation si la page enseigne ne répond pas | Logo organisation, couleur `#ffcc41`, adresse publique à Fréjus, photo/texte/horaires configurés |
| Enseigne du dossier client | `organization_companies` via `current_coiffure_client_portal_accounts` et `coiffure_client_portal_dashboard` | Azzera nail, slug `nail`, logo Nail distinct, couleur `#ffaeff` |
| Site de l'enseigne | `organization_sites` | nail · centre beauty ; adresse configurée à Puget-sur-Argens |
| Identité pour réserver connecté | `get_current_coiffure_client_booking_identity` | Contrôle `auth.uid()` + compte actif + client + enseigne correspondant au slug |
| Adresse du rendez-vous | Réponse de réservation/gestion (`site_name`, `site_address`) | Affichée lorsqu'elle est disponible ; pas de substitution d'adresse d'une autre portée |

Les différences entre les deux captures ne sont donc pas corrigées avec un logo, une couleur ou une adresse codés en dur. L'adresse du profil représente le contexte renvoyé par le portail, pas une preuve du lieu de tout rendez-vous. Le dashboard client actuel renvoie le nom du site, mais pas son adresse ni son fuseau dans chaque ligne de rendez-vous ; cette limite reste explicitement ouverte.

## Blocages confirmés à traiter séparément

### B1 — Page enseigne et réservation client inaccessibles avec l'offre actuelle

- `get_public_metier_coiffure_company_page('nail')` renvoie `NULL`.
- Cause dans la définition distante : condition `organizations.plan = 'metier'`, alors que l'organisation du compte test est `professionnelle`.
- La création publique enseigne possède également cette condition.
- Le portail construit `/salon/nail` et `/salon/nail#reserver`. Navigation réelle vérifiée : **Page indisponible**, malgré une enseigne active dont la page publique est activée.
- `/reserver/nail` affiche la configuration organisation après repli ; cela explique aussi les différences d'identité.
- Aucune offre changée, aucune condition contournée, aucun client réattribué. Le lien n'a pas été remplacé par une réservation d'organisation ambiguë.
- Suite nécessaire : décision explicite sur l'éligibilité du parcours enseigne pour cette offre, puis proposition ciblée de correction serveur et retour arrière, à valider avant toute application.

### B2 — Rapprochement invité insuffisamment vérifié

Lecture de `create_public_metier_coiffure_company_booking_v2` : après contrôle du scope organisation/enseigne, la fonction cherche un client existant par e-mail **ou** téléphone saisi. Si elle le trouve, elle actualise prénom/nom/e-mail/téléphone et rattache le nouveau rendez-vous à ce dossier. Cette branche ne demande pas de preuve de possession de ces coordonnées.

Cela ne satisfait pas l'exigence d'identité vérifiée du présent chantier, même si le scope enseigne est conservé. Risque déduit directement du code serveur ; aucune tentative avec les coordonnées d'un autre client et aucune exploitation réelle effectuée. L'accès général au compte d'un tiers n'est pas démontré par cette lecture.

Aucune fonction distante modifiée. Une correction doit séparer le visiteur non vérifié du client authentifié et préserver les réservations invitées ; elle exige une proposition SQL, une revue des droits et un rollback avant autorisation. Un simple contrôle frontend ne sécuriserait pas cet endpoint public.

### B3 — Recette multi-compte et interventions humaines

Un seul compte client fourni. L'absence d'accès aux dossiers d'un autre client/enseigne n'est pas marquée PASS. Invitation valide, activation, récupération par e-mail, notification et nouvelle réservation nécessitent encore les opérations de test explicitement autorisées et, lorsque nécessaire, une intervention humaine.

L'utilisateur a confirmé sa connexion. La question groupée création/déplacement/annulation + destinataires n'a pas reçu de confirmation explicite de ces opérations ; aucune réservation n'a été soumise.

## Corrections fonctionnelles locales

- Verrou synchrone des soumissions de réservation et de gestion, indépendant du délai de rendu de l'état React. Il empêche deux événements simultanés, sans prétendre assurer une idempotence serveur entre deux rechargements.
- Une confirmation n'est affichée qu'après une réponse contenant identifiant, lien de gestion, statut attendu et horaires valides. Une erreur réseau signale l'incertitude de persistance au lieu de promettre un succès ou de recommander aveuglément un nouvel envoi.
- Les erreurs restent visibles même lorsque le créneau sélectionné est effacé ; récupération des disponibilités après échec de création, autres coordonnées conservées.
- Retour de connexion limité aux routes clientes internes connues ; prestation(s), site, professionnel et date peuvent accompagner ce retour. Aucun détail personnel ajouté à l'URL.
- Préremplissage de la page organisation refusé si le contexte retourné par le dashboard appartient à une autre enseigne. Chemin authentifié enseigne existant conservé.
- Le déplacement d'un rendez-vous d'enseigne utilise son référentiel de créneaux enseigne même avec une prestation unique ; aucune création de remplacement ajoutée.
- Les réponses de chargement périmées ne peuvent plus écraser un contexte client plus récent. Les détails de gestion sont effacés lors du rechargement/changement de lien.
- L'activation n'est plus annoncée comme automatique après connexion alors qu'une action explicite est nécessaire dans le parcours existant.

## Recette réalisée et limites

| Parcours / contrôle | État | Preuve / limite |
|---|---|---|
| Connexion client existant | PASS | Connexion manuelle sur localhost ; compte/enseigne attendus affichés |
| Session après rechargement | PASS | Plusieurs rechargements réels du portail conservant l'accès |
| Accueil / RDV / Avantages / Profil | PASS consultation | Navigation réelle, historique terminé/annulé, état vide à venir, préférences chargées |
| Fidélité visible | PASS affichage | 8 passages sur 10, 0 récompense disponible, 8 mouvements affichés ; ni solde ni règle édités |
| Profil | PARTIEL | Coordonnées non modifiables selon le réglage actuel, préférences affichées ; aucun enregistrement ni consentement changé |
| Page organisation | PARTIEL | Contenu configuré, prestations/prix/durées affichés ; aucune confirmation réelle |
| Portail → réservation enseigne | FAIL préexistant | `/salon/nail` indisponible, B1 |
| A — réservation invité → confirmation/gestion | BLOQUÉ | B1/B2 ; aucun envoi |
| B — client → réservation → rendez-vous persistant | BLOQUÉ | B1 ; aucun envoi |
| C — déplacement/annulation persistants | NON TESTÉ | Pas de rendez-vous futur de test ; autorisation des opérations à confirmer |
| D — concordance dans l'agenda professionnel | NON TESTÉ | Aucun nouveau rendez-vous créé ; pas de session professionnelle utilisée |
| E — erreur/double clic | PARTIEL | Tests unitaires des gardes/réponses ; pas de concurrence ni coupure réseau simulée sur la base réelle |
| F — isolation réelle multi-client | NON TESTÉ | Deuxième compte non fourni ; lectures de code ne remplacent pas cette recette |
| Invitation / activation / récupération | NON TESTÉ de bout en bout | Présentation et retour corrigés, aucune invitation ni demande d'e-mail envoyée |
| Déconnexion / expiration | À terminer | Pas de validation réelle finale de disparition des données privées |
| Responsive 360 / 430 / 768 / 1440 | À terminer | Redimensionnement navigateur interrompu par délais d'expiration de l'outil ; aucune validation inventée |
| Responsive 390 | PARTIEL | Mesure intermédiaire `innerWidth = clientWidth = scrollWidth = 390`, capture à 390 × 844. Après rechargement, l’outil revient à 325 px malgré la demande 390 ; impossible de certifier la matrice finale complète |
| Safari / iPhone / PWA / clavier | NON TESTÉ | Test physique utilisateur encore nécessaire ; aucune conclusion sur une double safe area |
| Console | PARTIEL | Dernière consultation des journaux warn/error du portail : aucune entrée retournée. Avertissements React Router observés auparavant. Les autres surfaces/états restent à couvrir ; erreurs Statsig/Cloudflare de l'outil exclues |
| Landing / shell / agenda pro | PARTIEL | Sources et CSS publics inchangés, tests statiques d'isolation ; smoke visuel connecté professionnel à reprendre |

## Tests techniques

- TypeScript : **PASS**, dernier contrôle `tsc --noEmit --pretty false -p tsconfig.app.json`, code de sortie 0.
- Build production final : **PASS**, code de sortie 0, après rétablissement à l’identique des règles de l’éditeur de couverture professionnel. Contrôles statiques, TypeScript build, bundle Vite et génération SEO réussis. Journal : `/tmp/ncr-beauty-client-build-final.log`.
- Tests finaux : **12/12 PASS** (`node --test scripts/beauty-client-experience.test.mjs scripts/ui-foundations.test.mjs`) : 7 tests ciblés et 5 tests existants de protection CSS.
- Le build conserve explicitement les CSS publics gelés ; aucune régénération implicite.
- Avertissement de taille des bundles Vite conservé, pas de nouvelle dépendance UI.

## Données et protections

Aucun rendez-vous créé, déplacé, annulé ou supprimé. Aucun paiement, avantage consommé, avis publié, profil enregistré, e-mail ou SMS volontairement envoyé. Aucun nettoyage de données nécessaire au titre d'un rendez-vous de test.

Nuance : les fonctions existantes appelées normalement à l'ouverture du portail peuvent mettre à jour `last_seen_at`, initialiser des paramètres de fidélité, traiter des récompenses arrivées à échéance/anniversaire et obtenir/créer un lien de parrainage. Leur code n'a pas été modifié. Il serait inexact de qualifier tous les chargements de l'interface de SELECT purs ou d'affirmer qu'aucune écriture technique distante n'a pu avoir lieu.

Aucun SQL de modification exécuté par l'agent ; schéma, RLS, Auth, triggers, RPC, Edge Functions et Storage inchangés. `.env.local` ignoré et non versionné, contenu non lu. Contrôle final : `HEAD`, `main` et la référence locale `origin/main` restent à `c2f0d28514846a12a0f38d460c8d67338e7cc300`. Aucun changement `main`, push ou déploiement. Scan des formats de secrets usuels dans les 13 fichiers du lot : aucune correspondance. Les artefacts de build ont été retirés du diff. `git diff --check` : PASS. Working tree volontairement non commité : 10 fichiers suivis modifiés + 3 nouveaux fichiers, tous listés ci-dessus.

## Captures et reprise

Captures conservées hors Git, sous `/tmp/ncr-beauty-client-captures/` :

- `public-before-390.png` : état antérieur ; nom historique, largeur réelle non garantie (mesure ultérieure du navigateur à 319 px).
- `portal-before-390.png` : état antérieur du portail.
- `portal-after-390.png` : capture locale du nouvel accueil à 390 × 844, avant la dernière réduction de l'état vide.
- `history-after-mobile.png` : historique consulté ; avant la correction finale du contraste du bouton d'avis.
- `public-final.png` : page publique finale, viewport natif du panneau (capture de 319 px de large, sans prétention de test iPhone).
- `portal-final.png` : état final du portail, capture affectée par l’échelle du navigateur intégré ; ne constitue pas une preuve de largeur 390 px. Les fichiers suffixés `final-390` ne doivent pas être utilisés pour valider ce breakpoint : mesure réelle 325 px.

Les overrides de viewport temporaires ont été réinitialisés avant la remise du travail.

Les captures ne doivent pas être interprétées comme des PASS de réservation ou des tests iPhone.

Validation locale : `http://localhost:5173/espace-client-coiffure` (compte client fourni) ; page publique organisation `http://localhost:5173/reserver/nail`. La page enseigne `/salon/nail` reste volontairement non contournée.

Prochaine étape : valider séparément la stratégie serveur B1/B2, puis terminer les parcours A–F et les cinq largeurs. Aucun push/preview distante sans accord explicite.

## 18 octobre 2026 — Correctifs fonctionnels locaux, sécurité puis offre Professionnelle

### Décision et environnement

La base visuelle est validée par l'utilisateur et conservée. L'autorisation de production reste conditionnée aux garanties de restauration et à une recette isolée représentative. La capture fournie confirme l'existence d'une sauvegarde physique du projet NCRsuite du **18 octobre 2026 à 06:15:35 UTC**, mais ne prouve pas une restauration réussie.

Organisation Supabase confirmée par l'utilisateur. Le connecteur a annoncé **0,01344 USD/heure** pour une branche (~0,32 USD/24 h), hors consommation supplémentaire, et **10 USD/mois** pour un projet distinct, hors options/consommation. L'utilisateur a refusé la création payante : **« Non, rester en local »**. Aucune branche, aucun projet et aucune restauration créés. Aucun SQL de modification envoyé à Supabase. Aucun push, merge ou déploiement.

Docker/Podman et un serveur PostgreSQL autonome ne sont pas disponibles dans le PATH de cet environnement ; la CLI Supabase installée seule ne fournit pas une stack Auth/API locale complète.

Les requêtes de diagnostic ont lu les définitions et métadonnées nécessaires ; aucune donnée de production n'a été copiée dans les fixtures. Les UUID, contacts en `example.invalid`, entreprises et rendez-vous des tests sont entièrement fictifs.

### Fichiers de ce complément fonctionnel

- `supabase/migrations/20261018173525_beauty_verified_booking_identity.sql` — **candidate locale, non appliquée au distant** : identité autorisée, preuves des nouvelles réservations invitées, activation et anciennes RPC.
- `supabase/migrations/20261018173541_beauty_primary_booking_entitlements.sql` — **candidate locale, non appliquée au distant** : réservation sur enseigne/établissement autorisés selon les capacités commerciales existantes.
- `src/pages/PublicBookingPage.tsx` — résolution du dossier authentifié dans le contexte exact de l'enseigne, préremplissage autoritaire et utilisation de la RPC authentifiée ; coordonnées du dossier en lecture seule avec lien vers l’espace client, pour ne pas laisser croire qu’une saisie différente modifierait le dossier ; remise à zéro du préremplissage lors d'un changement de session/contexte. Aucun changement de composition ou CSS dans ce complément.
- `scripts/beauty-booking-database.test.mjs` — tests exécutables PostgreSQL locaux.
- `scripts/fixtures/beauty-booking-baseline.sql` — structures minimales et définitions antérieures issues du catalogue, **fixture de test uniquement**, jamais une migration ni un script à appliquer sur un projet Supabase. Les anciennes définitions vulnérables servent à tester leur remplacement.
- Le présent document. Les changements visuels déjà validés restent dans le working tree et ne sont pas annulés.

Les deux fichiers de migration ont été créés avec la CLI Supabase 2.121.0. Chaque fichier est transactionnel, comporte des délais de verrouillage/exécution bornés et vérifie les empreintes des fonctions qu'il remplace. Une divergence de définition ou une tentative de réapplication provoque un refus. La seconde migration exige la première ; ce refus dans l'ordre inverse est vérifié localement. Ces préconditions ne remplacent pas la comparaison complète du schéma et des droits avant une éventuelle mise en production.

### 1. Identité et réservations invitées

- Un visiteur sans dossier autorisé reçoit **un nouveau dossier invité**. Ni l'e-mail ni le téléphone saisis ne sélectionnent ou ne modifient un dossier existant.
- Un utilisateur connecté ayant un compte client actif dans l'enseigne utilise ce dossier autorisé. Un identifiant de compte appartenant à un autre utilisateur est refusé. Plusieurs dossiers autorisés ambigus imposent un choix depuis le portail.
- Le moteur de réservation multi-prestations existant est conservé dans une fonction privée. L'entrée du portail transmet explicitement le compte autorisé ; la signature publique existante reste compatible.
- Les anciennes créations `create_public_booking`, `_v2`, `_v3`, `create_public_metier_coiffure_company_booking` et `_v2` sont couvertes directement ou par leurs appels aux fonctions sécurisées. Aucune simple protection frontend.
- Une table privée `beauty_guest_booking_proofs`, inaccessible à `anon`/`authenticated` et protégée par RLS, mémorise pour **les nouvelles réservations** le rendez-vous, l'organisation, l'enseigne, le dossier invité d'origine et l'adresse déclarée au moment de la création. Elle ne contient aucun rattachement historique automatique.
- L'activation exige un utilisateur Auth dont l'adresse est **confirmée**, correspondant à cette adresse mémorisée, ainsi que le lien de gestion du rendez-vous ou une invitation valide liée à ce rendez-vous. Un nom, un téléphone ou une adresse non vérifiée ne suffit jamais.
- Si le compte existe déjà dans cette enseigne, seule la réservation vérifiée devient visible et gérable depuis ce compte. Le rendez-vous conserve son `client_id` ; aucun transfert de dossier, de visites, de points ou de récompenses.
- S'il n'existe aucun compte pour cet utilisateur dans cette enseigne, l'activation crée le compte du nouveau dossier invité. Un compte révoqué ne peut pas être réactivé silencieusement par ce chemin. Les traitements de bienvenue existants sont invoqués uniquement lors de cette première création, sans changer leurs règles.
- `coiffure_client_portal_dashboard` ajoute les rendez-vous prouvés au périmètre du compte actif, sans élargir les requêtes de profil ou de fidélité. Le déplacement conserve la preuve et le même rendez-vous.
- Les anciennes invitations publiques sans lien vers une preuve ne peuvent plus ouvrir automatiquement un dossier. Elles nécessitent une invitation renouvelée par le salon. Les invitations professionnelles restent possibles dans le périmètre autorisé du professionnel.
- Les créations/renvois d'invitations professionnels vérifient le périmètre client/enseigne. La fonction d'envoi n'est plus exécutable directement par les rôles publics et vérifie que le token correspond à l'invitation.

**Limites volontaires :** pas de rapprochement rétroactif massif ; les réservations historiques ambiguës nécessitent une intervention du salon. Un téléphone seul ne permet pas l'activation automatique, faute de mécanisme de vérification téléphonique intégré à ce parcours. Les soldes des dossiers invités séparés ne sont pas fusionnés avec ceux d'un compte existant. Les nouvelles références de preuve sont conservatrices (`ON DELETE RESTRICT`) : les éventuels parcours de suppression/purge doivent être revus avant production, sans supprimer arbitrairement ces preuves ou l'historique métier.

### 2. Droits de réservation par offre

Les conditions figées `plan = 'metier'` sont remplacées dans les pages, créneaux (y compris les deux fonctions intermédiaires filtrant les ressources), recherches de prochains créneaux et créations concernées par les capacités existantes et un scope explicite.

| Offre | Réservation publique | Personnalisation commerciale | Multi-sites / marque blanche |
|---|---|---|---|
| Essentielle | Capacité existante conservée ; enseigne et site principaux uniquement dans ce chemin | Pas d'ouverture de la personnalisation commerciale ; présentation neutre du logo/couleur dans l'adaptateur enseigne | Non |
| Professionnelle | Enseigne principale active et son établissement principal actif uniquement | Capacité existante conservée | Non ; mention NCR maintenue |
| Métier | Périmètre multi-sites existant conservé, toujours dans la bonne organisation/enseigne | Capacité existante conservée | Selon capacités déjà présentes |

Aucun tarif ni catalogue de capacités modifié. Le choix principal doit être non ambigu ; en cas de configuration invalide, la réservation est refusée plutôt que redirigée vers un autre site. Un slug d'enseigne connu mais inaccessible ne peut plus se transformer silencieusement en page d'organisation homonyme. Le lien d'organisation est résolu vers son enseigne principale lorsque ce référentiel existe. Les contrôles de créneaux, pauses, absences et ressources restent en place.

### Tests locaux de ce complément

Exécution SQL dans **PGlite 0.3.14 / PostgreSQL 17.5**, installé séparément sous `/tmp/ncr-beauty-sql-test`, sans ajouter de dépendance applicative. Les migrations candidates sont réellement exécutées contre une base éphémère ; les fonctions de réservation, créneaux, activation, dashboard et déplacement sont appelées. Les trois triggers de cohérence Beauty de la migration déployée `20261006172644` sont également exécutés.

Commande reproductible après installation séparée de PGlite :

```sh
BEAUTY_PGLITE_MODULE=/chemin/absolu/node_modules/@electric-sql/pglite/dist/index.js node --test scripts/beauty-booking-database.test.mjs
node --test scripts/beauty-client-experience.test.mjs scripts/ui-foundations.test.mjs
```

**20/20 tests SQL PASS :** contacts déclarés sans réutilisation/écrasement, compte autorisé/refus compte tiers, e-mail non confirmé, mauvais destinataire, preuve immuable, compte révoqué, isolation de deux utilisateurs et de plusieurs organisations/enseignes, refus d'exécuter les helpers privés, création invitée réelle dans PostgreSQL, création connectée, consentement, montant/prestations, créneau déjà pris, invitation avec token, token invalide/rejoué/expiré/révoqué, ancienne invitation publique refusée, première activation sans double appel de bienvenue, dashboard sans accès au profil étranger, limites Professionnelle, séparation marque blanche, pauses/absences et filtre de ressources, déplacement sans nouveau rendez-vous, quatre anciennes entrées réellement exécutées, slug ambigu et préconditions de migration. Les assertions de premier montage refusent aussi l'application de la migration commerciale avant la sécurisation.

**12/12 tests UI/unitaires existants PASS**, dont 7 comportements du parcours client et 5 protections des CSS publics.

**TypeScript PASS** (`tsc --noEmit --pretty false -p tsconfig.app.json`). **Build production PASS** (code 0), contrôles statiques, `tsc -b`, Vite et génération SEO compris. Journal local : `/tmp/ncr-beauty-functional-build.log`. Avertissements existants de taille de bundles et temps des plugins conservés. Le contrôle statique a également été réexécuté sur la version finale des migrations : PASS.

La première compilation a détecté un binaire Rolldown absent dans `node_modules`. Les paquets officiels **@rolldown/binding-darwin-x64 1.1.5** puis **lightningcss-darwin-x64 1.32.0**, déjà référencés au lockfile, ont été récupérés ; leurs SHA-512 ont été comparés au lockfile avant restauration des seuls binaires manquants. Aucun manifeste ni lockfile modifié.

**Ce que ces PASS ne prouvent pas :** les sessions Auth sont représentées par un `auth.uid()` de test ; les permissions métier et capacités utilisent des substituts limités au contrat audité ; les traitements de fidélité sont instrumentés, sans calculer les récompenses de production ; le filtre de disponibilité des ressources physiques est substitué. Le schéma de test est minimal, sans l'ensemble des triggers/policies/extensions de Supabase. L'e-mail est écrit dans un outbox fictif, jamais envoyé. Pas de GoTrue/PostgREST, de recette navigateur connectée aux migrations candidates, de concurrence multi-connexion, ni de restauration de sauvegarde. L'annulation complète via sa fonction historique et le scénario salon restent à valider sur une instance représentative. Aucun rendez-vous réel n'a été créé pour ces tests.

### Retour arrière sûr et conditions restant avant production

- En cas d'échec pendant une migration, sa transaction est annulée. La migration commerciale n'est jamais appliquée si la sécurisation échoue.
- Si la seule ouverture commerciale doit être retirée après déploiement, restaurer les restrictions de périmètre commerciales par une migration corrective **en conservant** le nouveau moteur d'identité et les protections d'activation.
- Si une anomalie de sécurité apparaît après déploiement, fermer temporairement les entrées de création/activation concernées par un correctif transactionnel qui refuse l'opération, puis corriger en avant. Ne jamais remettre les anciennes fonctions qui sélectionnent un dossier par contact déclaré.
- Conserver les preuves et les nouvelles réservations ; pas de `DROP` ni de nettoyage de dossiers pour revenir en arrière. Une restauration globale de production n'est pas un test ni le rollback normal de ces fonctions.
- **Bloqué avant application distante** : restauration fiable non exercée ; environnement Supabase représentatif non disponible après refus de la branche payante ; tests réels multi-client/enseigne, anciennes routes HTTP, droits RLS, Auth/invitations et emails, concurrence, fidélité complète et parcours de suppression à terminer.

Le travail local avance, mais les conditions de l'autorisation de production ne sont pas réunies. Les migrations sont proposées, pas déployées. La production conserve donc encore les deux anomalies en attente de validation distante appropriée.

### Contrôle final local

- 20/20 tests PostgreSQL et 12/12 tests UI/unitaires réussis ; TypeScript et build réussis.
- CSS gelés de la landing, shell commun, `package.json` et lockfile inchangés. Aucune nouvelle passe esthétique.
- `.env.local` ignoré et absent des fichiers suivis ; contenu non lu. Scan des formats de secrets courants : aucune correspondance dans les fichiers du lot. Ce scan ne remplace pas une revue avant publication.
- `git diff --check` PASS. Artefacts de compilation retirés du diff : bundle conservé sous `/tmp`, cache TypeScript remis à son état initial. Cache de version créé par la CLI retiré.
- Branche `refactor/beauty-client-experience`. `HEAD`, `main` et la référence locale `origin/main` restent à `c2f0d28514846a12a0f38d460c8d67338e7cc300` ; aucune nouvelle vérification réseau Git ni modification de `main` pendant ce complément.
- Working tree volontairement non commité : travaux visuels validés conservés, candidats SQL, tests et suivi local ajoutés. Aucun commit, push, merge, déploiement ni changement Supabase distant.
- **Verdict : correctifs candidats validés par les tests locaux ciblés ; application en production bloquée par les garanties et recettes restantes ci-dessus.**

## Dernière recette gratuite — 18 octobre 2026 — NO-GO

Demande actuelle : obtenir une recette Supabase réelle en local avant une nouvelle autorisation finale de production. Aucune ressource Supabase payante, aucune écriture distante, aucun push, merge ou déploiement. La présence de la sauvegarde est acceptée comme vérifiée ; l'absence de test de restauration reste un risque résiduel explicite, pas une restauration prétendument réussie.

### Installation et essais réellement exécutés

- Mac Intel x86_64, macOS 13.7.8, 8 Gio de RAM, environ 15 Gio libres au départ ; virtualisation matérielle disponible.
- Installation utilisateur temporaire sous `/tmp/ncr-beauty-fullstack` de Colima 0.10.3, Lima 2.2.1 et du client Docker officiel 29.9.1. SHA-256 Colima et Lima comparés aux checksums officiels : PASS. CLI Supabase 2.121.0 déjà disponible, sans ajout au manifeste du projet ni Homebrew/sudo sur le Mac.
- VM `ncr-beauty-qa` démarrée avec VZ, 2 CPU et 4 Gio de RAM. L'avertissement Lima concernant Intel/macOS et les noyaux récents n'a pas empêché le démarrage effectif. Ce Mac n'est donc pas déclaré incompatible avec la virtualisation.
- Configuration de recette indépendante, sans lien vers le projet distant, sans lecture de `.env.local`, sans copie de données clients. Confirmation d'e-mail activée ; serveur SMTP local Mailpit. Analytics/Vector seuls exclus du démarrage pour réduire la charge.
- Premier obstacle identifié : le réseau Docker `--internal` n'exposait pas les ports sur l'hôte ; PostgreSQL était inaccessible à `127.0.0.1:54322`. Remplacement par un réseau dédié avec liaison des ports sur `127.0.0.1` et règle `DOCKER-USER` dans la VM refusant les nouvelles connexions sortantes du sous-réseau de test. Aucun endpoint de production configuré.
- PostgreSQL **17.11** a réellement démarré (production : **17.6**). Auth, Kong et Mailpit ont atteint l'état Docker `healthy`. Aucun parcours d'authentification utilisateur n'a cependant été validé.
- **Échec de disponibilité globale** : la CLI s'est arrêtée avec `HealthCheckTimeoutError`, car Realtime, Storage, Meta et Studio restaient `unhealthy`. Elle a ensuite arrêté/supprimé les conteneurs. Aucun événement Docker `oom` n'a été relevé : une insuffisance de mémoire n'est pas affirmée comme cause démontrée. Les limites matérielles et le temps de démarrage restent à examiner.
- La VM a été arrêtée proprement après ces essais pour libérer la mémoire. Outils/images conservés pour éviter de les retélécharger ; environ 4,5 Gio restaient libres avant arrêt. Aucun service payant créé.

### Blocage de reconstruction du schéma

Les migrations historiques ont été rejouées dans PostgreSQL local, sans substituer `auth.uid()` ni les policies. Les fichiers **001 à 012 ont réussi**. Le fichier **`013_metier_workspace.sql` échoue** sur `public.team_plan_summary(uuid)` :

```text
ERROR: cannot change return type of existing function
HINT: Use DROP FUNCTION team_plan_summary(uuid) first.
```

La migration déclare désormais `RETURNS jsonb`, incompatible avec le type créé auparavant. Le schéma complet n'a donc pas été reconstruit. Une tentative de préparation d'une reprise strictement locale n'a pas pu exécuter le `DROP` : la CLI avait déjà supprimé le conteneur après son échec de santé. Aucun `DROP` n'a été envoyé au distant et les migrations du dépôt n'ont pas été modifiées pour contourner ce problème.

La réparation historique des sept rendez-vous était explicitement exclue du bootstrap synthétique : elle vise des enregistrements de production absents localement. Elle n'a pas été exécutée. Les deux migrations candidates n'ont pas été appliquées sur cette stack incomplète.

Il manque donc une stack durablement saine et un bootstrap représentatif du schéma courant. Avant une recette valide, il faudra résoudre la reconstruction locale (ou obtenir un export de schéma seul fidèle), vérifier les définitions finales et les droits, puis charger exclusivement des fixtures fictives. La stack incomplète ne doit pas servir à annoncer un PASS de sécurité.

### Recontrôle distant strictement en lecture seule

- **37/37 corps de fonctions** du périmètre déjà audité correspondent aux empreintes des définitions de référence. Les 12 remplacements publics de la première migration et les 15 de la seconde sont toujours présents. Aucun écart de source détecté dans ce périmètre.
- Les colonnes des **20 tables** de référence sont identiques à la capture précédente. Catalogue également relu pour leurs **32 policies** et **56 triggers**. Clés uniques attendues pour les références nouvelles présentes (`clients(organization_id,id)`, `organization_companies(organization_id,id)`, `appointments(id)`).
- `private.beauty_guest_booking_proofs` et `coiffure_client_portal_invitations.booking_appointment_id` restent absents : les candidats ne sont pas déjà appliqués.
- Ces concordances ciblées ne constituent pas une certification du schéma complet ni de ses effets à l'exécution ; l'application réelle et la recette sur une copie fidèle restent manquantes.
- Sauvegarde physique **18 octobre 2026, 06:15:35 UTC** : présence vérifiée par la capture fournie par l'utilisateur, pas par une nouvelle restauration ni par une nouvelle consultation du tableau des sauvegardes. Restaurabilité **non testée**.

### Résultat des contrôles et décision

| Contrôle | Résultat de cette recette |
|---|---|
| Installation gratuite Colima/Docker/CLI | PASS |
| Démarrage PostgreSQL, Auth, Kong, Mailpit | Services sains observés, mais stack non pérenne |
| Stack Supabase complète | FAIL — quatre services non prêts, arrêt automatique |
| Reconstruction fidèle du schéma | FAIL — migration historique 013 |
| Auth réelle avec comptes, invitations et activation | NON TESTÉ |
| Isolation RLS réelle entre clients/enseignes | NON TESTÉ |
| Anciennes RPC par HTTP avec vrais JWT | NON TESTÉ |
| Réservation, déplacement, annulation de bout en bout | NON TESTÉ |
| Correspondance ciblée des sources/colonnes déployées | PASS dans le périmètre indiqué ; certification globale non acquise |
| Sauvegarde récente | Présence confirmée ; restauration non testée |

Les 20 tests PostgreSQL/PGlite et 12 tests unitaires/UI, TypeScript et le build précédemment réussis restent des acquis locaux antérieurs ; ils n'ont pas été présentés comme cette recette intégrée ni inutilement relancés sans changement applicatif. Aucun rendez-vous réel, compte réel ou message réel créé par ces essais.

Preuves techniques locales : `/tmp/ncr-beauty-fullstack/start-network.log`, `replay-report.json`, `replay-last.log`, `function-comparison.json`, `schema-review.json`, `oom-events.json`. Les journaux de stack peuvent contenir des informations de configuration locale : ils ne sont pas ajoutés au dépôt ni publiés.

**NO-GO production.** La recette réelle demandée reste incomplète. Le risque résiduel de restauration non exercée s'ajoute à ces blocages ; il ne les remplace pas. Aucune application distante avant réussite de la recette et autorisation finale de l'utilisateur. Aucun changement visuel ou applicatif effectué pendant cette passe ; seul ce suivi a été complété. Branche `refactor/beauty-client-experience`, `main` inchangée, `.env.local` ignoré et non versionné.


## Application production partielle — 18 octobre 2026 — ARRÊT SUR CONTRÔLE ÉCHOUÉ

Cette section remplace le statut courant des sections précédentes, conservées comme historique. L'utilisateur a explicitement accepté l'absence de restauration testée et de recette Supabase isolée complète. Il a autorisé une application séquentielle en production, avec arrêt obligatoire au premier contrôle de sécurité ou fonctionnel échoué. Aucune ressource payante créée.

### Préflight et sauvegarde

- Après actualisation des références Git : HEAD, main et origin/main à `c2f0d28514846a12a0f38d460c8d67338e7cc300`. Travaux locaux Beauty préexistants conservés sur `refactor/beauty-client-experience`.
- Historique distant des migrations lu ; 12 empreintes de fonctions exigées par la migration de sécurité concordantes. Catalogue de 53 fonctions pertinentes, propriétaires, droits, dépendances et triggers concernés relus. Aucune divergence bloquant cette migration détectée.
- Policies et droits des clients, rendez-vous, comptes/invitations du portail et fidélité examinés. Les anciennes entrées publiques de réservation sont couvertes par la correction d'identité ; cela ne prouve pas encore leur bon fonctionnement intégral.
- Sauvegarde physique du **18 octobre 2026 à 06:15:35 UTC** : existence vérifiée par la capture de l'utilisateur, sans nouvelle consultation du tableau des sauvegardes. **Restauration non testée.**
- Aucune migration historique rejouée, notamment `013_metier_workspace.sql`. Aucun DROP destructif.

### Migration de sécurité effectivement appliquée

- Historique distant : **`20261018193658_beauty_verified_booking_identity`**, résultat d'application réussi.
- Fichier local aligné : `supabase/migrations/20261018193658_beauty_verified_booking_identity.sql`. Ancien nom candidat : `20261018173525_beauty_verified_booking_identity.sql`. SQL strictement identique à celui envoyé au distant ; le commentaire initial de candidature est conservé pour ne pas altérer la copie exacte appliquée.
- SHA-256 du SQL appliqué : `257a73f177b98fc536d6631cfd77c0b4f6307e9205712ce68fbbbe63b9b12965`.
- Après application : cinq fonctions privées inaccessibles en EXECUTE à anon/authenticated ; table de preuves protégée par RLS, sans lecture anon/authenticated ni policy publique ; fonction privée de mise en file d'invitation non exécutable directement par ces rôles. Droits des RPC publiques conservés selon leur rôle.
- Aucun rapprochement rétroactif massif, aucune modification des soldes de fidélité. Protections appliquées **conservées**, aucun retour à l'ancien rapprochement par coordonnées déclarées.

### Contrôles réels réussis — SQL transactionnel sur le projet déployé

Fixtures exclusivement fictives : organisations, enseignes, utilisateurs Auth et coordonnées `example.invalid`. Exécution des fonctions, triggers et RLS réellement déployés avec rôles anon/authenticated et claims SQL contrôlés. Il ne s'agit **pas** de connexions réelles via GoTrue ou de tests navigateur HTTP.

- Réservation invitée utilisant l'e-mail d'un dossier et le téléphone d'un autre : création d'un dossier distinct, sans accès ni réattribution aux dossiers existants.
- Lecture directe anonyme de dossiers privés refusée ; lecture RLS du dossier étranger refusée ; accès au dashboard d'un autre compte refusé.
- Rattachement refusé pour adresse différente, adresse Auth non confirmée, mauvaise enseigne ou autre organisation.
- Invitation réelle mise en file dans `email_outbox` au sein de la transaction ; acceptation refusée pour la mauvaise identité, acceptation autorisée pour l'adresse vérifiée correspondante, rejeu refusé. Aucun message envoyé : transaction annulée avant visibilité par un worker.
- Rendez-vous invité visible après revendication autorisée, sans réattribuer son `client_id` ni fusionner les dossiers. Déplacement du même rendez-vous et annulation vérifiés ; contraintes différées validées dans ce scénario.
- Création connectée et appels des anciennes routes ensuite exercés ; **la validation finale de ce scénario élargi a échoué**, voir ci-dessous.

### Blocage réel : ancienne réservation v1 sans établissement

Au contrôle final des contraintes du scénario élargi (`SET CONSTRAINTS ALL IMMEDIATE`) :

```text
ERROR P0001: Un établissement actif doit être sélectionné.
CONTEXT: validate_operational_site_scope(), ligne 20
```

Cause confirmée par comparaison avant/après : **`public.create_public_booking` (v1)** insère dans `appointments` sans `site_id`. Cette liste de colonnes est identique avant et après la migration de sécurité. La contrainte différée existante `validate_operational_site_scope()` exige un établissement actif pour une organisation Métier. Aucun trigger actuel ne complète ce site manquant. La v2 comporte bien `site_id = v_site_id` : ne pas généraliser le défaut à toutes les versions.

Le contrôle SQL précédent passait sans ces appels historiques supplémentaires ; les tests locaux PGlite ne couvrent pas cette contrainte différée réelle. Le défaut est donc **préexistant mais bloquant pour la recette complète des anciennes routes**, et ne doit pas être masqué par leurs PASS locaux.

Suite arrêtée immédiatement : aucune application de l'ouverture Professionnelle, aucun push, merge ou déploiement frontend. La correction nécessaire avant reprise devra attribuer à la v1 le site autorisé selon le collaborateur et le contexte, ou déléguer à un parcours compatible déjà sécurisé, sans assouplir la contrainte. **Aucune telle correction effectuée pendant cette passe.**

Après ROLLBACK explicite, vérification distante : **0 organisation fictive, 0 utilisateur Auth fictif, 0 e-mail fictif persistant ; 1 migration de sécurité, 0 migration d'ouverture commerciale.** Aucun dossier de vrai client utilisé.

### Candidat commercial et récupération

- Migration Professionnelle **NON APPLIQUÉE** : `supabase/migrations/20261018194433_beauty_primary_booking_entitlements.sql` (ancien candidat `20261018173541_beauty_primary_booking_entitlements.sql`). Nouveau nom généré avec la CLI pour rester après la version de sécurité réellement enregistrée. SQL inchangé, SHA-256 `f6cb0a5cd1daf92ece1d5bcd22e0028bf2fa6df0afabe16e088a04553ec29ef2`. Références du test local mises à jour uniquement pour ces noms.
- Ne pas lancer un envoi automatique de toutes les migrations locales. La candidate commerciale reste suspendue tant que le blocage n'est pas corrigé et retesté.
- Récupération : conserver la sécurisation appliquée. En cas de fuite ou d'anomalie critique confirmée, suspendre uniquement les opérations exposées concernées par retrait ciblé d'EXECUTE, puis appliquer une correction en avant après revue et tests. Ne jamais réinstaller les anciennes fonctions vulnérables.
- Une restauration globale serait un dernier recours, avec interruption du service, perte potentielle des écritures postérieures au point de sauvegarde, puis réapplication et vérification des protections avant réouverture. Les objets Storage ne sont pas couverts par cette sauvegarde physique. Aucun test de restauration ni restauration lancé.

### État de livraison

**PRODUCTION PARTIELLE — SUITE BLOQUÉE.** Sécurité appliquée et premiers contrôles réussis ; ancienne route v1 non conforme à une contrainte existante ; ouverture Professionnelle et publication du parcours client suspendues. Les vérifications GoTrue/HTTP, concurrence, parcours navigateur complets et restauration restent non validées. Aucun nouveau changement visuel, aucun commit, aucun push, aucun merge et aucune modification de main.


## Reprise du 10 novembre 2026 — correctif et ouverture vérifiés sur Supabase

- Autorisation : correction de `create_public_booking`, conservation des protections et du design, puis ouverture Professionnelle et publication si les contrôles passent. HEAD, main et origin/main identiques après fetch : `c2f0d28514846a12a0f38d460c8d67338e7cc300`. Aucun travail précédent écrasé.
- Sauvegarde **physique du 10 novembre 2026 à 06:17:45 UTC**, constatée directement dans le dashboard Supabase après connexion manuelle de l'utilisateur. Restauration toujours **non testée**, aucune restauration déclenchée.
- Source distante v1 confirmée : `ec8cc850ff767c1556115acf732d56e9`. Contrat, permissions et protections de rapprochement inchangés avant correction ; les fonctions privées concernées restent non exécutables par anon/authenticated.

### Corrections appliquées, dans cet ordre

1. **`20261110162614_beauty_legacy_booking_site`** : seule la v1 est modifiée. Récupération du site et de l'enseigne du collaborateur sélectionné ; refus si établissement absent, inactif, hors organisation ou hors enseigne ; insertion du site dans le rendez-vous. Aucun fallback vers un autre site. Signature, règles de disponibilité existantes, rapprochement sécurisé, grants et triggers conservés. Empreinte du corps après correction : `dfbac68c07646fb447ee891e7e9eec0c`.
2. **`20261110162747_beauty_primary_booking_entitlements`** : candidate commerciale validée précédemment, adaptée uniquement pour conserver le correctif v1 et son empreinte préalable. Professionnelle limitée à son enseigne et son site principaux ; multi-sites et marque blanche non débloqués. Pas de modification du catalogue commercial, ni d'attribution rétroactive.

Les fichiers locaux portent les versions réellement enregistrées au distant. Le fichier de sécurité `20261018193658_beauty_verified_booking_identity.sql` est conservé sans réexécution ni modification. Les anciens noms candidats du journal ci-dessus ne sont plus les noms courants. Les commentaires historiques « LOCAL CANDIDATE » sont conservés dans les copies exactes réellement appliquées. Aucune migration historique rejouée, aucun DROP, aucun changement Auth global ou RLS.

### Vérifications

- **23/23 tests PostgreSQL locaux (PGlite)** : reproduction du défaut avant correction, passage avec contrainte différée, refus des sites absents/inactifs/étrangers, isolation et règles des offres. La contrainte différée réellement déployée a été ajoutée comme fixture locale pour éviter le faux sentiment de couverture du précédent lot.
- **7/7 tests unitaires du parcours client**, audits statiques, TypeScript et **build production PASS**. Une terminaison SQL manquante dans le brouillon et la syntaxe `SET search_path TO` non reconnue par l'audit statique ont été corrigées localement avant toute application distante ; `SET search_path = public` est équivalent, sans affaiblir le contrôle. Warning existant de taille du bundle, non bloquant.
- **Tests SQL transactionnels sur le projet réel PASS** après le correctif, puis après l'ouverture commerciale : création invitée/connectée, quatre routes anciennes, contraintes différées forcées, refus des dossiers et contextes étrangers, e-mail non confirmé, invitation mise en file/acceptation/rejeu refusé, déplacement du même rendez-vous, annulation, propriétaire inchangé.
- Suites distantes exécutées sous **Métier, Professionnelle et Essentielle**. Professionnelle/Essentielle : site principal autorisé ; site secondaire, autre enseigne et autre organisation refusés ; pas de droit multi-site ou marque blanche ; page publique limitée à un site. Métier retesté après l'ouverture commerciale.
- **ROLLBACK systématique** : 0 organisation fictive, 0 utilisateur Auth fictif, 0 e-mail fictif persistant. Aucun dossier réel, paiement, notification délivrée ou avantage réel consommé.
- Les neuf helpers privés de ces migrations restent interdits à anon/authenticated. Les alertes globales Supabase préexistantes (fonctions publiques SECURITY DEFINER intentionnelles, fonctions hors périmètre, protection des mots de passe compromis désactivée) ne sont pas déclarées résolues par ce lot. Voir https://supabase.com/docs/guides/database/database-linter et https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . Aucun problème de santé signalé.
- CSS publics, design validé et fichiers applicatifs : aucune modification nouvelle pendant cette reprise. `.env.local` ignoré et non versionné. Les sorties du build et métadonnées CLI sont conservées hors dépôt ; le tsbuildinfo généré est revenu à son état initial.

### Preuves et limites

Scénarios conservés dans `scripts/fixtures/beauty-production-security-check.sql` et `beauty-production-professional-check.sql` (fixtures synthétiques uniquement, jamais envoyer un fragment privé de son ROLLBACK). Ils injectent des claims SQL et changent le rôle PostgreSQL ; **ce ne sont pas des connexions GoTrue ni des tests HTTP avec de vrais JWT**. Les tests navigateur Auth complets, concurrence multi-connexion et restauration restent non validés, comme explicitement accepté avant cette reprise. Les tests locaux substituent certaines dépendances ; seuls les contrôles SQL distants attestent les véritables triggers/RPC/RLS.

Retour arrière : préserver les protections de sécurité ; en cas de défaut commercial, suspendre l'accès concerné et appliquer une correction en avant conservant l'identité et le site autorisés. Ne jamais réinstaller le rapprochement vulnérable. La sauvegarde est un dernier recours avec maintenance et réapplication des protections avant réouverture, pas un rollback ordinaire testé.

### Publication et validation de la preview

- Commit applicatif publié : `2f2fa5d548fc02c20b3934808f760ac6b11e0d7b`, branche `refactor/beauty-client-experience`, 21 fichiers (design déjà validé, corrections, tests et suivi).
- Cloudflare Pages : **preview déployée avec succès** à https://d181bdd2.ncrsuite.pages.dev ; alias https://refactor-beauty-client-exper.ncrsuite.pages.dev .
- Contrôle navigateur réel sur `/salon/nail` : page publique, identité, prestations, sélection, calcul durée/prix et disponibilités réelles du professionnel affichés ; aucune erreur console capturée. Aucune réservation envoyée et aucune donnée réelle modifiée. Les parcours authentifiés complets restent distincts des tests transactionnels SQL décrits plus haut.
- Les trois fichiers SQL locaux correspondent exactement aux entrées distantes : MD5 `71a9206c13d6e94a984dd9b6bf866904`, `1b890cce461bf79185b65117bf752c0a`, `87d193042af97da9782353b2276e1cec` dans l'ordre sécurité / site / offre. Le workflow GitHub compile uniquement ; aucun rejeu SQL automatique configuré dans les workflows du dépôt.
- Vérification finale locale après alignement des noms : **23/23 tests PostgreSQL PASS**, diff sans erreur, aucun motif de secret détecté parmi les 21 fichiers, `.env.local` non versionné. Branche propre après commit. Aucun changement de navigation professionnelle, de landing générale ou de CSS public généré.
- L'utilisateur a autorisé le passage de cette version sur `main` après réussite des contrôles. Le point de retour frontend reste `c2f0d28514846a12a0f38d460c8d67338e7cc300` ; les protections SQL ne doivent jamais être annulées avec le frontend. Le résultat du déploiement de production et son hash final seront rapportés après observation dans le compte rendu de cette intervention.



## 2026-11-10 — Parcours public unique et header de l'enseigne

Correction locale, sans publication ni modification Supabase.

- `/reserver/:slug` reste accessible pour les QR déjà imprimés. Le résolveur public existant fournit le slug d'enseigne ; une seconde lecture vérifie l'identité de la page cible avant remplacement de l'adresse par `/salon/:slug`. Aucun slug Azzera codé en dur. Les configurations historiques sans page d'enseigne correspondante gardent leur réservation existante.
- Tous les paramètres de requête sont conservés sans réécriture (établissement, prestation(s), professionnel, date, QR/widget, parrainage, intégration). `#reservation` devient `#reserver` et `#salon-infos` devient `#infos`. Défilement vers la section après chargement effectif des données ; remplacement d'historique pour éviter une boucle avec Retour.
- Header : les liens n'avaient plus de display/padding/radius/alignement propres. Deux règles héritées de `beautyCenterSwitcher.css` imposaient en plus blanc sur blanc et noir sur prune. Ces deux règles contradictoires sont retirées ; boutons alignés, hauteur 46 px, padding 11/16 px, rayon 12 px, libellé accessible sur mobile.
- Finition de cette seule page : fond neutre chaud, titre de réservation ramené à 26–34 px (28 px mobile), suppression du halo décoratif sans photo. Identité, photographies, catégories, prestations, équipe, avis et informations configurées conservés.

Fichiers : `src/pages/PublicBookingPage.tsx`, `src/pages/PublicMetierCoiffureCompanyPage.tsx`, `src/lib/beautyClientExperience.ts`, `src/publicMetierCoiffureCompany.css`, `src/beautyCenterSwitcher.css`, `scripts/beauty-client-experience.test.mjs`, ce document.

Vérifications :
- 9/9 tests unitaires PASS : paramètres/ancres, refus d'une destination d'identité différente ou non vérifiée, protections de soumission et retours de connexion existants.
- TypeScript, build production et contrôles statiques inclus PASS. Warning de taille de bundle préexistant.
- Navigateur local avec lectures publiques réelles : ancien lien `/reserver/nail?src=qr#reservation` redirigé ; site + prestation + date conservés, disponibilité réelle et récapitulatif 30 min / 25 euros affichés ; aucune soumission. Boutons du header testés, formulaire de connexion ouvert avec retour vers le bon salon.
- Largeurs CSS réellement mesurées 360/390/430/768/1440 : `scrollWidth === clientWidth`. Composition en une colonne sous 820 px, deux colonnes desktop ; header 48 px et actions 46 px. Dimensions calibrées sur les mesures DOM car le facteur de zoom du navigateur intégré différait de sa consigne. Captures représentatives `/tmp/ncr-beauty-salon-390.jpg` et `/tmp/ncr-beauty-salon-desktop.jpg` ; les simulations ne remplacent pas un essai physique iPhone.
- Aucune erreur console capturée sur le parcours public. Aucun changement de SQL, RPC, RLS, Auth, données, soumission, logique de disponibilité, offre, identité client ou fidélité. Aucun changement de landing/professionnel ni des CSS publics générés. `.env.local` reste ignoré et non versionné ; `main` inchangée.
- Limites : pas de nouvelle réservation réelle ni de connexion client/activation complète pendant cette correction. Les anciens QR restent des liens de compatibilité côté navigateur, pas des redirections HTTP serveur. Ni commit, ni push, ni déploiement effectués pour ce lot.

### Publication autorisée — 10 novembre 2026

Après validation utilisateur, publication de ce seul correctif autorisée. Préflight : branche Beauty, main locale/distante et branche distante à `86c238535c05aa9ec9a7642135baf5211af8fd66`, aucun travail externe à intégrer. Diff limité aux sept fichiers ci-dessus ; aucune migration ni configuration modifiée ; `.env.local` exclu. Les 9 tests ciblés repassent ; build/TypeScript final déjà validés sur ce même code. Le résultat du déploiement automatique et du contrôle en production sera communiqué après observation. Point de retour frontend : `86c238535c05aa9ec9a7642135baf5211af8fd66` ; aucun retour arrière SQL nécessaire ou autorisé pour ce lot.
