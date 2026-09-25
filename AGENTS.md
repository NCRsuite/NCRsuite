# AGENTS.md — NCR Suite

## Mission

Tu travailles sur **NCR Suite**, un SaaS professionnel destiné à être commercialisé auprès de vrais clients.

Ta mission principale sur ce dépôt est d’élever le niveau **UI/UX et esthétique** de l’application afin d’obtenir un produit moderne, cohérent, premium et crédible commercialement, **sans dégrader les fonctionnalités existantes** et sans effectuer de refonte technique inutile.

L’objectif n’est pas de produire beaucoup de code.
L’objectif est d’obtenir le maximum d’amélioration visuelle et UX avec le minimum de modifications nécessaires.

## Priorités absolues

Dans cet ordre :

1. Préserver toutes les fonctionnalités existantes.
2. Améliorer la cohérence visuelle globale.
3. Mutualiser les composants et styles.
4. Améliorer l’UX.
5. Garantir une excellente qualité responsive, particulièrement sur mobile.
6. Réduire la duplication.
7. Limiter le nombre de fichiers modifiés au strict nécessaire.
8. Conserver de bonnes performances.
9. Éviter les changements d’architecture inutiles.

## Direction artistique

NCR Suite doit ressembler à un **SaaS premium mature**, pas à un template générique.

Le résultat recherché doit être :

- moderne ;
- professionnel ;
- premium ;
- minimaliste mais pas vide ;
- clair ;
- élégant ;
- rassurant ;
- cohérent ;
- très soigné dans les détails ;
- agréable sur desktop comme sur mobile.

Privilégier :

- espaces généreux et réguliers ;
- hiérarchie typographique nette ;
- composants sobres ;
- bordures fines ;
- ombres subtiles ;
- rayons cohérents ;
- excellente lisibilité ;
- CTA clairement identifiables ;
- transitions discrètes ;
- états hover/focus propres ;
- interfaces aérées ;
- densité maîtrisée.

Éviter :

- les gradients décoratifs inutiles ;
- trop de couleurs ;
- trop d’encadrés ;
- les ombres lourdes ;
- les éléments visuels tape-à-l’œil ;
- les animations gratuites ;
- les composants incohérents entre pages ;
- les effets “template IA” ;
- les réécritures massives sans bénéfice visible.

## Niveau de finition attendu

Le niveau cible est celui d’un **vrai SaaS commercial premium et mature**.

Chaque écran doit paraître intentionnellement conçu, et non simplement assemblé.

Exigences :

- aucune zone visuellement négligée ;
- alignements précis ;
- spacing cohérent ;
- typographie parfaitement hiérarchisée ;
- états vides propres ;
- loaders/skeletons cohérents ;
- messages d’erreur soignés ;
- formulaires clairs ;
- tableaux lisibles ;
- navigation évidente ;
- responsive réellement pensé ;
- cohérence totale entre les différentes offres.

La qualité perçue doit venir de la rigueur et de la cohérence, pas de l’accumulation d’effets.

## Règle fondamentale : fonctionnalité intacte

Sauf demande explicite, ne modifie pas :

- la logique métier ;
- les règles d’abonnement ;
- les droits et permissions ;
- l’authentification ;
- Supabase ;
- les migrations ;
- le schéma de base de données ;
- les API ;
- Stripe ;
- les webhooks ;
- les calculs ;
- les règles de facturation ;
- les données ;
- les routes existantes ;
- les noms de propriétés utilisés par le backend ;
- les workflows fonctionnels validés.

Ne change une couche fonctionnelle que si c’est strictement nécessaire pour réparer une régression directement provoquée par une modification UI.

Ne supprime aucune fonctionnalité existante sous prétexte de simplification visuelle.

## Design system avant pages individuelles

Avant de modifier plusieurs écrans séparément, inspecte les éléments réutilisés.

Cherche en priorité :

- AppShell / layout ;
- sidebar ;
- navigation mobile ;
- topbar ;
- PageHeader ;
- boutons ;
- cards ;
- inputs ;
- textarea ;
- select ;
- checkbox / radio / switch ;
- badges ;
- tabs ;
- modales ;
- dropdowns ;
- tooltips ;
- tableaux ;
- filtres ;
- formulaires ;
- pagination ;
- alertes ;
- états vides ;
- loaders / skeletons ;
- messages d’erreur ;
- confirmations ;
- calendriers ;
- composants de rendez-vous ;
- composants responsive.

Une amélioration d’un composant partagé doit être privilégiée lorsqu’elle permet d’améliorer plusieurs écrans à la fois.

Évite de recréer localement une variante d’un composant lorsqu’un composant partagé peut être amélioré.

## Tokens et conventions visuelles

Harmonise autant que possible :

- espacements ;
- tailles de texte ;
- line-height ;
- poids typographiques ;
- couleurs ;
- couleurs de fond ;
- bordures ;
- rayons ;
- ombres ;
- dimensions des contrôles ;
- hauteurs des inputs et boutons ;
- styles de titres ;
- styles de sections ;
- largeurs maximales ;
- breakpoints ;
- états interactifs.

Privilégie les variables, tokens, classes ou composants déjà utilisés dans le projet.

Ne crée pas plusieurs systèmes visuels concurrents.

## Cohérence entre les offres NCR Suite

Les offres **Essentiel**, **Professionnel** et **Métier** doivent présenter **le même niveau de qualité esthétique**.

Les différences entre les offres doivent provenir des fonctionnalités accessibles, jamais d’une finition visuelle inférieure.

Lorsque plusieurs offres utilisent la même fonction ou le même écran :

- mutualise les composants ;
- conserve une expérience identique ;
- évite les duplications de JSX/CSS ;
- garde une seule source de vérité visuelle autant que possible.

Un utilisateur qui change d’offre doit avoir l’impression d’utiliser le même produit.

## Responsive et mobile

Le mobile est une plateforme de premier ordre.

Ne considère jamais le responsive comme une simple réduction du desktop.

Vérifie notamment :

- absence de débordement horizontal involontaire ;
- largeur correcte des cards ;
- textes non coupés ;
- dates et heures bien cadrées ;
- boutons facilement utilisables au tactile ;
- formulaires confortables ;
- modales adaptées à l’écran ;
- tableaux utilisables ;
- calendrier exploitable ;
- actions importantes accessibles ;
- navigation cohérente ;
- bottom navigation lorsqu’elle existe ;
- zones tactiles suffisamment grandes ;
- espaces cohérents ;
- bon rendu sur petits écrans.

Accorde une attention particulière aux interfaces utilisées par les clients finaux :

- page publique ;
- réservation ;
- espace client ;
- agenda ;
- prise/modification de rendez-vous.

## Méthode de travail

### 1. Comprendre avant de modifier

Avant un nouveau lot :

- inspecte uniquement les fichiers nécessaires ;
- identifie les composants déjà existants ;
- recherche les styles partagés ;
- comprends les dépendances directes.

Ne reparcours pas tout le dépôt à chaque tâche.

### 2. Modifier par lots cohérents

Exemples de bons lots :

- shell + navigation ;
- design system ;
- dashboard ;
- agenda ;
- rendez-vous ;
- clients ;
- prestations ;
- collaborateurs ;
- page publique ;
- réservation ;
- espace client ;
- paramètres ;
- administration ;
- responsive final.

Ne lance pas une refonte globale de toutes les pages en une seule modification.

### 3. Réutiliser avant de créer

Avant de créer un composant :

1. chercher s’il existe ;
2. vérifier s’il peut être amélioré ;
3. vérifier s’il peut être généralisé sans casser ses usages ;
4. créer un nouveau composant seulement si nécessaire.

### 4. Limiter le scope

Ne modifie pas des fichiers sans rapport avec le lot courant.

Si tu découvres un problème hors périmètre, signale-le au lieu de lancer une refonte supplémentaire sauf si sa correction est indispensable au fonctionnement du lot.

### 5. Vérifier après modification

Après un lot :

- vérifier le build pertinent ;
- vérifier les erreurs TypeScript/lint pertinentes ;
- vérifier les écrans modifiés ;
- vérifier desktop ;
- vérifier mobile ;
- vérifier qu’aucune fonctionnalité utilisée par le lot n’est cassée.

Évite de relancer des validations globales extrêmement coûteuses après chaque changement mineur.

Une validation globale complète doit être faite à la fin des grands lots ou en fin de chantier.

## Ordre recommandé pour la refonte visuelle

1. Audit visuel et architecture UI.
2. Design system / tokens.
3. Shell global.
4. Sidebar / topbar / navigation mobile.
5. Composants partagés.
6. Dashboard / accueil.
7. Agenda.
8. Rendez-vous.
9. Clients.
10. Prestations.
11. Collaborateurs.
12. Page publique.
13. Réservation.
14. Espace client.
15. Paramètres.
16. Abonnements / administration.
17. Responsive transversal.
18. Polish final.

## Agenda

L’agenda est un écran métier essentiel.

Préserver :

- les fonctionnalités de planning ;
- les changements de statut ;
- les actions sur les rendez-vous ;
- la navigation temporelle ;
- les informations nécessaires à l’exploitation.

Améliorer prioritairement :

- lisibilité ;
- densité ;
- hiérarchie ;
- séparation des créneaux ;
- visibilité des statuts ;
- affichage des heures ;
- comportement mobile ;
- scroll horizontal si nécessaire ;
- actions rapides ;
- cadrage des dates.

Ne sacrifie jamais l’information métier au profit du minimalisme.

## Page publique et réservation

Ces écrans participent directement à la perception commerciale de NCR Suite.

Ils doivent être particulièrement :

- propres ;
- rassurants ;
- simples ;
- rapides à comprendre ;
- premium ;
- optimisés mobile.

Préserver toutes les possibilités existantes :

- photos ;
- prestations ;
- collaborateurs ;
- disponibilités ;
- réservation ;
- modification/annulation lorsque disponible ;
- liens/QR lorsque disponibles.

## Espace client

L’espace client doit donner l’impression d’un produit fini et autonome.

Priorités :

- navigation simple ;
- rendez-vous visibles immédiatement ;
- actions compréhensibles ;
- fidélité/avantages lisibles ;
- informations du compte structurées ;
- aucune répétition inutile des informations utilisateur ;
- excellent responsive.

## Performance

N’ajoute pas une nouvelle dépendance pour un effet pouvant être réalisé proprement avec les outils déjà présents.

Évite :

- composants inutilement lourds ;
- rerenders évitables ;
- images surdimensionnées ;
- animations coûteuses ;
- bibliothèques UI supplémentaires si le projet dispose déjà d’un système cohérent.

## Accessibilité minimale

Conserver ou améliorer :

- contraste ;
- focus visible ;
- labels de formulaires ;
- navigation clavier lorsque pertinente ;
- états disabled explicites ;
- boutons réellement identifiables ;
- tailles tactiles convenables ;
- feedback des actions.

## Ce qu’il ne faut jamais faire

Ne pas :

- refaire tout le projet à partir de zéro ;
- remplacer une architecture fonctionnelle pour des raisons purement esthétiques ;
- supprimer une fonctionnalité existante ;
- introduire un nouveau framework UI sans nécessité absolue ;
- multiplier les fichiers CSS spécifiques à chaque page ;
- dupliquer des composants presque identiques ;
- modifier la base de données pour une question de présentation ;
- modifier Stripe pour une question de présentation ;
- toucher aux permissions pour une question de présentation ;
- modifier plusieurs domaines fonctionnels sans rapport dans le même lot ;
- effectuer une réécriture massive “au cas où” ;
- inventer une nouvelle direction artistique différente sur chaque écran.

## Gestion efficace du contexte

Pour limiter le coût et les explorations inutiles :

- ne relis pas l’intégralité du repo à chaque lot ;
- réutilise ce qui a déjà été compris ;
- cible les chemins concernés ;
- privilégie les recherches précises ;
- ne génère pas de longs rapports intermédiaires sauf demande ;
- n’explique pas chaque ligne modifiée ;
- résume les changements de façon concise ;
- évite les longues réflexions visibles ou répétitives ;
- privilégie les modifications à fort effet transversal.

## Format attendu à la fin de chaque lot

Retourne un résumé court contenant :

1. ce qui a été amélioré ;
2. les principaux fichiers modifiés ;
3. les vérifications effectuées ;
4. les éventuels problèmes restant hors périmètre.

Pas de long rapport sauf demande explicite.

## Critère de réussite

Une modification est réussie si :

- elle améliore visiblement le produit ;
- elle respecte le design system ;
- elle fonctionne sur desktop et mobile ;
- elle ne casse aucune fonctionnalité ;
- elle réduit ou n’augmente pas inutilement la dette UI ;
- elle bénéficie si possible à plusieurs écrans ;
- elle n’introduit pas une complexité disproportionnée.

Si un écran est déjà très bon, ne le refais pas pour le principe.

**La qualité du résultat compte davantage que la quantité de code modifié.**


## Règles spécifiques à l’architecture UI actuelle du dépôt

Le dépôt possède déjà un socle visuel global dans `src/ncrUi2026.css`. Ce fichier et ses tokens doivent servir de référence principale pour toute nouvelle harmonisation transversale.

### Ne plus empiler des couches de patchs

Plusieurs fichiers Beauty/Coiffure contiennent actuellement des couches successives de corrections visuelles ou des sections versionnées ajoutées en fin de fichier.

À partir de maintenant :

- ne pas ajouter de nouvelles sections du type V8 / V9 / V10 en bas d’un fichier pour corriger une version précédente ;
- ne pas créer un nouveau fichier CSS uniquement pour surcharger trois règles existantes ;
- modifier ou consolider la règle source lorsque cela est raisonnablement sûr ;
- supprimer les doublons uniquement lorsqu’ils sont clairement identifiés et couverts par une vérification ;
- garder les sélecteurs les plus simples possibles ;
- éviter `!important` sauf contrainte héritée impossible à résoudre proprement dans le lot courant.

Le but est de réduire progressivement la cascade de surcharges sans provoquer de régression fonctionnelle.

### Source de vérité visuelle

Pour les éléments communs, privilégier les tokens existants :

- `--ncr26-brand` et variantes ;
- `--ncr26-bg` / surfaces ;
- `--ncr26-text` / text-soft / text-muted ;
- `--ncr26-border` ;
- `--ncr26-radius-*` ;
- `--ncr26-shadow-*` ;
- `--ncr26-space-*` ;
- `--ncr26-fast`, `--ncr26-ui`, `--ncr26-ease`.

L’accent métier peut continuer à utiliser `--business-accent` ou `--accent` lorsqu’il représente réellement la marque ou l’enseigne.

Évite les nouvelles valeurs arbitraires si un token existant convient.

### Beauty / Coiffure

Les fichiers Beauty doivent tendre vers une même grammaire visuelle que NCR UI 2026 tout en conservant l’identité métier.

Ne transforme pas la branche Beauty en deuxième design system indépendant.

Les offres Essentiel, Professionnel et Métier doivent partager les mêmes composants et la même qualité de rendu lorsque les fonctions sont communes.

### Agenda mobile

La lisibilité prime sur l’obligation de faire tenir sept jours simultanément dans la largeur d’un téléphone.

Ne réduis jamais les textes métier à des tailles minuscules pour conserver les sept colonnes à l’écran.

Pour la vue semaine mobile :

- conserver une taille de texte réellement lisible ;
- conserver des zones tactiles utilisables ;
- autoriser un scroll horizontal maîtrisé si nécessaire ;
- garder l’heure, le client/service et le statut identifiables ;
- mettre aujourd’hui en évidence ;
- éviter toute densité qui transforme l’agenda en miniature.

### Pas de nouvelle bibliothèque UI sans justification

Le projet fonctionne actuellement avec React + CSS maison.

N’introduis pas Tailwind, Material UI, Chakra, Ant Design ou une autre bibliothèque pour la seule refonte visuelle.

Le design premium doit être obtenu en consolidant le système existant.
