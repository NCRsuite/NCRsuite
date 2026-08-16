# V2.29.18 — Formation · BPF activité mixte

- Qualification réglementaire obligatoire des sessions avant intégration au BPF.
- Distinction formation professionnelle continue, apprentissage, formation initiale et hors champ BPF.
- Formation initiale / hors champ conservée dans NCR Suite mais exclue du calcul BPF.
- Sessions à qualifier bloquantes pour la préparation BPF afin d’éviter une intégration silencieuse.
- Consolidation des sous-traitances éligibles d’un formateur dans son propre organisme déclarant NCR Suite.
- Conservation des SST directs dans l’activité propre et des prestations pour d’autres organismes dans la sous-traitance.
- Choix d’inclure ou non une facture Formation dans le BPF.
- Protection contre le double comptage lorsque la facture existe déjà dans NCR Suite.
- Base, frontend et cache PWA alignés en V2.29.18.

# V2.29.17 — Formation · BPF personnel formateur

- Nouvel onglet **Mon BPF** dans l’espace Formateur.
- Consolidation multi-centres des sessions terminées attribuées au formateur externe.
- Calcul automatique stagiaires / heures-stagiaires à partir des inscriptions et émargements.
- Saisie personnelle du montant HT facturé, référence et date de facture.
- Export CSV.
- Qualification Interne / Externe directement depuis la page Formateurs du centre.
- Isolation stricte : aucun accès au BPF global du centre.
- Release front/base/cache alignée sur 2.29.17.

# V2.29.16 — Formation · Droits & comptes

- Durcissement RLS et rôles Formation côté serveur.
- Séparation propriétaire / administrateur pour la gestion des comptes.
- Collaborateurs en lecture seule sur la structure pédagogique, tout en conservant émargements/documents/évaluations.
- RPC d’annuaire Formation dédiées et fermeture du contournement manager via les RPC génériques.
- Contrôle des rôles personnalisés Métier au niveau RLS.
- Profils historiques manquants réparés automatiquement.
- Interface alignée sur les permissions serveur.

## V2.29.15 — QG opérationnel temps réel

- Push QG dédupliqués : prise de poste, fin de poste, retard +15 min, fin oubliée +15 min.
- Push critique immédiat pour MCI urgente ; SOS/PTI continue d’utiliser le moteur existant.
- Alertes retard/fin oubliée programmées puis annulées automatiquement si l’agent pointe.
- Dashboard QG temps réel : agents en poste, attendus non pointés, fins oubliées, urgences et dernières relèves.
- Realtime Supabase + repli par actualisation toutes les 30 secondes.
- Migration `129_security_qg_operational_notifications.sql` et cache PWA `ncr-suite-shell-v2.29.15-security-qg-operational`.

## V2.29.11 — Vacations Sécurité blindées

- Une seule vacation réellement active par agent, garantie côté serveur avec verrou transactionnel.
- Les anciennes vacations oubliées sont rechargées même hors du mois courant et remontent en priorité sur l’accueil Agent.
- Après 8 h de dépassement, l’agent ne peut plus alimenter la MCI de l’ancienne vacation : il doit la clôturer.
- Une nouvelle prise de poste est refusée tant qu’une autre vacation reste active.
- Défense RLS supplémentaire sur la création directe de rondes : vacation prise, ouverte et attribuée obligatoire.
- Le QG conserve les régularisations et clôtures existantes.
- Nouveau cache PWA et nouveaux assets `v2911`.

## V2.29.10 — Photos dans le PDF de main courante

- Le PDF de mission recharge les photos de chaque événement avec des URLs signées fraîches.
- Jusqu’à 3 photos sont intégrées sous l’événement correspondant.
- Redimensionnement automatique sans déformation.
- Un aperçu indisponible est signalé explicitement au lieu d’ignorer silencieusement la photo.
- Nouveau cache PWA et nouveaux assets `v2910`.

# V2.29.9 — Correctif affichage photos main courante

- Affichage des photos des derniers événements directement sur l’accueil Agent.
- Affichage conservé dans l’historique complet de la main courante.
- Les erreurs d’upload photo ne sont plus remplacées par un faux message de succès.
- Vérification immédiate du rattachement et de la lisibilité de la photo après dépôt.
- Lecture Storage privée simplifiée et fiabilisée via la migration 124.
- Nouveau cache PWA V2.29.9 pour forcer la diffusion du correctif.

# Changelog NCR Suite

## V2.29.6 - Transmission progressive du flux public

- Remplacement visuel du signal ECG par une ligne fine reliant les quatre étapes du parcours.
- Progression automatique d'un point bleu de Collecter vers Orchestrer, Prouver puis Piloter.
- Mise en valeur synchronisée de l'icône et de la carte qui reçoit l'information.
- Alignement du rail sur le centre réel des quatre cartes, avec un cycle calme de huit secondes.
- Animation limitée à l'affichage ordinateur pour préserver le rendu mobile et tablette validé.
- Correction du décalage horizontal qui faisait chevaucher le texte et l'aperçu sur les cinq pages Solutions métier.
- Aucun changement dans l'application connectée, les routes, contenus SEO, offres, droits ou données.
- Migration `120` de synchronisation et cache PWA `ncr-suite-shell-v2.29.6-public-flow-transmission`.

## V2.29.5 - Animations publiques toujours actives

- Suppression des restrictions de mouvement propres à la vitrine et aux pages Solutions métier.
- Apparitions au défilement réactivées même lorsque macOS demande moins d'animations.
- Animations des aperçus, graphiques, cartes, menus, boutons et signal ECG conservées.
- Périmètre limité aux pages publiques : l'application connectée garde son comportement actuel.
- Aucun changement de route, contenu SEO, formulaire, prix, droit ou fonction métier.
- Migration `119` de synchronisation et cache PWA `ncr-suite-shell-v2.29.5-public-motion`.

## V2.29.4 - Signal automatique du flux public

- Remplacement de la barre bleue fixe par une ligne fine traversée par un battement type électrocardiogramme.
- Cycle autonome de gauche à droite avec une courte pause avant redémarrage.
- Respect du réglage système de réduction des animations.
- Conservation du rendu mobile validé, où le rail reste masqué.
- Aucun changement dans l'application connectée, les parcours, les prix ou le référencement.

## V2.29.3 - Alignements et contrastes de la vitrine

- Sections Flux, Catalogue et appel à l'action final centrées à toutes les largeurs ordinateur.
- Catalogue détaché du grand fond gris et présenté dans une composition blanche plus légère.
- Badges verts des cartes Collecter, Orchestrer, Prouver et Piloter remplacés par des pastilles sobres sans ligne sombre.
- Prix, titres, descriptions et listes des offres recommandées rendus lisibles sur les cinq pages métier.
- Compatibilité mobile conservée sans modification de structure.
- Aucun changement de route, contenu SEO, formulaire, prix, droit ou fonction métier.
- Migration `117` de synchronisation et cache PWA `ncr-suite-shell-v2.29.3-public-ui-alignment-contrast`.

## V2.29.2 - Corrections de cadrage de la vitrine

- Cartes Collecter, Orchestrer, Prouver et Piloter réalignées sur ordinateur.
- Hauteur du flux et espaces verticaux du catalogue réduits.
- Dernier appel à l'action resserré et rééquilibré.
- Pied de page forcé en mode clair pour rendre le logo horizontal officiel lisible.
- Compatibilité mobile conservée sans modification de structure.
- Aucun changement de route, contenu SEO, formulaire, prix, droit ou fonction métier.
- Migration `116` de synchronisation et cache PWA `ncr-suite-shell-v2.29.2-public-ui-spacing-fix`.

## V2.29.1 - Interface publique premium et essai de 7 jours

- Refonte strictement visuelle de la page principale et des pages Solutions métier en mode clair.
- Hiérarchie typographique, espacements, contrastes, ombres et interactions harmonisés.
- Cartes, démonstrations d’interface, offres, FAQ et formulaire d’accès remis au même niveau visuel.
- CTA `Essai gratuit de 7 jours` intégrés au parcours de demande d’accès existant.
- Métier et offre sélectionnés transmis au formulaire sans modifier la validation super-administrateur.
- Aucun accès gratuit automatique et aucun changement Stripe, abonnement, droit, donnée ou fonction métier.
- Compatibilité mobile et respect de la réduction des animations conservés.
- Migration `115` de synchronisation de release et cache PWA `ncr-suite-shell-v2.29.1-public-ui-premium`.

## V2.29.0 - Contrat et signature avant activation Stripe

- Contrat de première souscription généré automatiquement avec les informations de l’entreprise et l’offre choisie.
- PDF exact consultable avant signature puis archivé dans un espace Supabase privé.
- Consentements distincts pour le contrat, les CGV, les CGU et l’annexe de traitement des données.
- Signature électronique simple documentée avec code e-mail à six chiffres valable dix minutes.
- Preuve horodatée comprenant le signataire, sa qualité, l’e-mail vérifié, l’adresse IP, le navigateur et les empreintes SHA-256.
- Exemplaire signé envoyé automatiquement par e-mail et conservé dans `Mon abonnement`.
- Première page Stripe inaccessible tant que le contrat complet n’est pas signé.
- Identifiant du contrat transmis à Checkout, à l’abonnement et aux webhooks Stripe.
- Statut contractuel synchronisé avec le paiement, l’échec, la résiliation et l’abonnement actif.
- Données existantes, rétrogradations et changements d’offres des clients déjà abonnés conservés.
- Migration `114`, Edge Function `subscription-contract` et cache PWA `ncr-suite-shell-v2.29.0-subscription-contract-signature`.
- Pages publiques, sitemap, canonical, métadonnées et indexation inchangés.

## V2.28.9 - Espaces externes unifiés et photos dans les rapports

- Une seule entrée `Sécurité` pour les clients et les agents dans les espaces externes.
- Une seule entrée `Nettoyage` pour les clients et les agents dans les espaces externes.
- Détection automatique du profil après connexion : portail client ou espace terrain agent.
- Anciennes invitations client conservées et redirigées vers les nouvelles adresses unifiées.
- Suppression de la tuile visible `Nettoyage agent` sans supprimer sa compatibilité historique.
- Photos Avant et Après téléchargées puis intégrées au PDF du rapport de passage.
- Mise à l’échelle des photos sans déformation et état explicite si une preuve est indisponible.
- Échec de chargement d’une photo isolé pour ne jamais bloquer la génération du rapport.
- Migration `113` et cache PWA `ncr-suite-shell-v2.28.9-unified-external-portals-photo-reports`.
- Pages publiques, sitemap, canonical, métadonnées et indexation inchangés.

## V2.28.8 - Espace agent Nettoyage et photos terrain

- Accès Agent Nettoyage clairement proposé depuis l’écran de connexion.
- Compte agent redirigé vers son espace terrain et accès mobile principal corrigé.
- Boutons explicites `Prendre la photo avant` et `Prendre la photo après`.
- Ouverture directe de l’appareil photo arrière sur téléphone compatible.
- Conversion automatique des formats photo mobiles vers JPEG.
- Redimensionnement et compression avant envoi pour éviter les refus de taille.
- Enregistrement sécurisé limité à l’intervention affectée à l’agent.
- Contrôle Supabase du dossier, de l’offre et de l’affectation avant le dépôt.
- Migration `112` et cache PWA `ncr-suite-shell-v2.28.8-cleaning-agent-camera`.
- Pages publiques, sitemap, canonical, métadonnées et indexation inchangés.

## V2.28.7 - Favicon Google Search

- Favicon NCR Suite ajouté à la racine via `/favicon.ico`.
- Versions PNG carrées `48x48` et `96x96` ajoutées.
- Déclarations de favicon compatibles avec les recommandations Google.
- Fichiers disponibles sur la page d'accueil et les cinq pages métier générées.
- URL, canonical, sitemap, robots.txt et contenus SEO conservés.
- Contrôles automatiques ajoutés aux audits de build.
- Migration `111` limitée à la synchronisation de la release.
- Cache PWA `ncr-suite-shell-v2.28.7-google-favicon`.
- Nouveau bundle autonome `ncr-suite-app-v287.js`.

## V2.28.6 - Menu Solutions métier

- Menu déroulant horizontal ajouté dans le header de la vitrine.
- Cinq pages indexables accessibles directement : Formation, Sécurité privée, Nettoyage, Restauration et Coiffure & beauté.
- Surbrillance au survol, au clavier et sur la page métier active.
- Fermeture après sélection, avec Échap ou par clic extérieur.
- Navigation mobile conservée sous forme de ligne horizontale glissable.
- Liens issus du catalogue SEO central pour éviter les incohérences futures.
- URL, sitemap, métadonnées et données structurées inchangés.
- Migration `110` limitée à la synchronisation de la release.
- Cache PWA `ncr-suite-shell-v2.28.6-solutions-menu`.
- Nouveau bundle autonome `ncr-suite-app-v286.js`.

## V2.28.5 - Correctif rubrique Notifications

- Cause du problème NCR Solutions identifiée dans le filtrage des modules Métier.
- Rubrique Notifications déclarée comme accès universel de la plateforme.
- Anciennes sélections de modules empêchées de masquer la rubrique.
- Rôles personnalisés empêchés de bloquer le centre de notifications.
- Contrôles de rôle et d’appartenance à l’entreprise conservés.
- Cloche permanente et compteur V2.28.4 conservés.
- Aucun module payant, abonnement Stripe ou contenu client modifié.
- Migration `109` limitée à la synchronisation de la release.
- Cache PWA `ncr-suite-shell-v2.28.5-universal-notification-access`.
- Nouveau bundle autonome `ncr-suite-app-v285.js`.

## V2.28.4 - Bouton notifications entreprise

- Cloche Notifications permanente dans tous les espaces entreprise.
- Accès placé près du profil sur ordinateur et dans l’en-tête mobile.
- Compteur des notifications non lues mis à jour pour l’entreprise active.
- Accès indépendant du métier, de la formule, de la recherche et des groupes du menu.
- Centre de notifications, préférences push et alertes écran verrouillé conservés.
- Aucun droit, abonnement Stripe, contenu client ou automatisation modifié.
- Migration `108` limitée à la synchronisation de la release.
- Cache PWA `ncr-suite-shell-v2.28.4-enterprise-notification-shortcut`.
- Nouveau bundle autonome `ncr-suite-app-v284.js`.

## V2.28.3 - Correctif cartes et espacement des pages métier

- Titres et icônes des cartes rétablis sur ordinateur.
- Zones de grille déclarées explicitement pour chaque carte standard.
- Priorité de style corrigée sur la première carte sombre.
- Aperçus fonctionnels maintenus dans leurs emplacements.
- Grande transition vide sous l’aperçu produit fortement réduite.
- Correctif limité aux écrans de plus de `1000 px`.
- Rendu mobile V2.28.2 conservé sans modification.
- Parcours, boutons, tarifs, formulaires, SEO et données existantes inchangés.
- Migration `107` limitée à la synchronisation de la release.
- Cache PWA `ncr-suite-shell-v2.28.3-solution-layout-fix`.
- Nouveau bundle autonome `ncr-suite-app-v283.js`.

## V2.28.2 - Direction artistique des pages métier

- Hero enrichi avec un aperçu produit plus crédible et plus proche de l’application.
- Fin de l’animation flottante permanente de la maquette pour un rendu plus professionnel.
- Grille de fonctionnalités remplacée par une composition éditoriale asymétrique.
- Chaque fonctionnalité possède désormais une miniature d’usage dédiée.
- Grandes zones vides supprimées sur ordinateur et mobile.
- Numéros décoratifs remplacés par des libellés utiles.
- Première fonctionnalité mise en avant dans un bloc sombre plus affirmé.
- Dernière fonctionnalité présentée comme une synthèse visuelle pleine largeur.
- Cartes d’offres séparées et offre recommandée davantage mise en valeur.
- Espacement mobile du hero corrigé pour éviter le chevauchement des preuves et de l’aperçu.
- Parcours, boutons, tarifs, formulaires, SEO et données existantes inchangés.
- Migration `106` limitée à la synchronisation de la release.
- Cache PWA `ncr-suite-shell-v2.28.2-solution-art-direction`.
- Nouveau bundle autonome `ncr-suite-app-v282.js`.

## V2.28.1 - Pages métier premium

- Hiérarchie typographique renforcée sur les cinq pages métier publiques.
- Fonctionnalités présentées dans une composition bento plus riche et plus lisible.
- Cartes d’offres agrandies avec prix, bénéfices et actions mieux mis en valeur.
- Apparition progressive des sections et des cartes pendant le défilement.
- Réactions visibles au survol, au clic et au focus clavier.
- Animations automatiquement réduites lorsque le système le demande.
- Nouvelle icône NCR Suite fournie utilisée sur le bloc final à fond sombre.
- Mise en page mobile conservée sans débordement horizontal.
- Parcours, liens, formulaires, tarifs, SEO et données existantes inchangés.
- Migration `105` limitée à la synchronisation de la release.
- Cache PWA `ncr-suite-shell-v2.28.1-premium-solution-pages`.
- Nouveau bundle autonome `ncr-suite-app-v281.js`.

## V2.28.0 - SEO métier et acquisition

- Cinq pages publiques spécialisées pour Formation, Sécurité privée, Nettoyage, Restauration et Coiffure.
- Titres, descriptions, adresses canoniques et données de partage propres à chaque page.
- Données structurées `WebPage`, `SoftwareApplication`, fil d’Ariane et FAQ.
- HTML métier généré au build pour rester lisible avant le chargement de React.
- Sitemap enrichi avec les six pages publiques à indexer.
- Redirection permanente de `www.ncr-suite.fr` vers le domaine canonique.
- Espaces de connexion, administration, activation et portails explicitement exclus de l’indexation.
- Liens métier ajoutés à la vitrine et au pied de page.
- Métier et formule présélectionnés depuis les pages publiques.
- Origine, campagne, page d’entrée et site référent conservés avec les demandes d’accès.
- Informations d’acquisition visibles uniquement dans l’administration centrale.
- Migration `104` sans suppression de données.
- Cache PWA `ncr-suite-shell-v2.28.0-seo-acquisition`.
- Nouveau bundle autonome `ncr-suite-app-v280.js`.

## V2.27.1 - Interactions et finitions premium

- Transitions courtes et cohérentes lors des changements de page.
- Apparition progressive des indicateurs et panneaux principaux.
- États de chargement élégants sur les tableaux de bord métier.
- Faux zéros supprimés pendant le chargement des statistiques.
- Chargements harmonisés pour les abonnements, les notifications et les entreprises.
- Retours immédiats sur les boutons, onglets et filtres.
- Confirmations et messages rendus plus compacts et plus discrets.
- Animations réduites automatiquement lorsque le système le demande.
- Logique métier, droits, abonnements Stripe et données existantes inchangés.
- Migration `103` limitée à la synchronisation de la release.
- Cache PWA `ncr-suite-shell-v2.27.1-interactions`.
- Nouveau bundle autonome `ncr-suite-app-v271.js`.

## V2.27.0 - Recette commerciale d’une entreprise pilote

- Nouvelle section `Recette client` dans l’administration centrale.
- Sélection d’une entreprise existante sans création automatique de données.
- Contrôles de l’entreprise, du propriétaire, de la formule et des droits.
- Vérification de l’abonnement, du tarif, de Checkout et des webhooks Stripe.
- Contrôle de la conservation des données après rétrogradation ou résiliation.
- Synthèse des erreurs, e-mails, notifications, versions PWA et portails Formation.
- Parcours guidé couvrant acquisition, paiement, rôles, invitations, signatures et mobile.
- Notes de preuve par scénario et observations finales avant clôture.
- Sauvegarde de l’avancement puis validation stricte uniquement sans blocage.
- Historique horodaté par entreprise pilote et export JSON.
- Migration `102` et cache PWA `ncr-suite-shell-v2.27.0-commercial-readiness`.
- Nouveau bundle autonome `ncr-suite-app-v270.js`.

## V2.26.6 - Navigation compacte et montée en gamme lisible

- Menus de tous les métiers regroupés en familles repliables.
- Famille de la page active ouverte automatiquement.
- Recherche instantanée disponible sur ordinateur et dans le menu mobile.
- Modules non inclus conservés sous cadenas dans `Modules disponibles`.
- Niveau d’offre requis toujours affiché pour accompagner la montée en gamme.
- Catalogue Formation conservé pour Découverte et Essentielle, puis masqué en Professionnelle.
- Catalogue Sécurité aligné sur la même règle pour ne plus afficher des options déjà incluses.
- Routes, droits, données métier, abonnements Stripe et automatisations inchangés.
- Migration `101` et cache PWA `ncr-suite-shell-v2.26.6-compact-navigation`.
- Nouveau bundle autonome `ncr-suite-app-v266.js`.

## V2.26.5 - Finition premium de l’espace connecté

- Hiérarchie des en-têtes de pages harmonisée entre les métiers.
- Navigation latérale enrichie avec états actifs, survols et focus plus lisibles.
- Boutons, champs et commandes dotés de micro-interactions cohérentes.
- Indicateurs visuels renforcés sans modifier leurs données.
- États vides modernisés et tableau clients plus confortable à parcourir.
- Navigation clavier et préférence de réduction des animations prises en compte.
- Couche visuelle limitée à l’espace connecté afin de préserver les pages publiques.
- Aucun changement des droits, abonnements, paiements ou données métier.
- Migration `100` et cache PWA `ncr-suite-shell-v2.26.5-premium-workspace`.
- Nouveau bundle autonome `ncr-suite-app-v265.js`.

## V2.26.4 - Recadrage de la photo de profil

- Nouvel éditeur de recadrage ouvert avant l’enregistrement de la photo.
- Déplacement à la souris ou au doigt dans un cadre circulaire.
- Zoom réglable avec remise à zéro instantanée.
- Export optimisé en 512 x 512 pixels, en WebP avec repli JPEG.
- Avatars circulaires harmonisés dans le menu ordinateur et les panneaux mobiles.
- Correction du masque de l’avatar situé en bas du menu.
- Aucun changement des droits, abonnements, paiements ou données métier.
- Migration `099` et cache PWA `ncr-suite-shell-v2.26.4-avatar-crop`.
- Nouveau bundle autonome `ncr-suite-app-v264.js`.

## V2.26.3 - Identités visuelles dans le menu

- Nouveau fichier de style et nouveau cache PWA pour corriger définitivement le double sélecteur de période.
- Logo de l’entreprise affiché dans le sélecteur lorsqu’il est renseigné.
- Icône métier conservée automatiquement lorsqu’aucun logo n’est disponible.
- Photo de profil personnelle téléversable depuis l’avatar du menu.
- Photo reprise dans le pied du menu, l’en-tête et les panneaux de compte mobiles.
- Stockage limité aux images PNG, JPEG ou WebP de moins de 3 Mo et isolé par utilisateur.
- Aucune modification des droits, abonnements, paiements ou données métier.
- Migration `098` et cache PWA `ncr-suite-shell-v2.26.3-visual-identities`.
- Nouveau bundle autonome `ncr-suite-app-v263.js`.

## V2.26.2 - Finition premium du cockpit

- Barre d’actions Formation restructurée sur ordinateur avec période segmentée et exports regroupés.
- Hiérarchie visuelle renforcée sur les indicateurs et cartes du tableau de bord Formation.
- Titres de l’interface harmonisés sans point final décoratif.
- Références aux prestataires techniques masquées dans les parcours utilisateurs.
- Informations techniques conservées dans les outils super-administrateur et les mentions légales.
- Parcours mobile, données, droits, abonnements et automatisations inchangés.
- Migration `097` et cache PWA `ncr-suite-shell-v2.26.2-premium-cockpit`.
- Nouveau bundle autonome `ncr-suite-app-v262.js`.

## V2.26.1 - Sélecteurs de contexte premium

- Nouveau sélecteur d'entreprise sur ordinateur avec identité visuelle, métier, formule, rôle et état actif.
- Nouveau sélecteur d'établissement cohérent avec distinction entre vue consolidée et site sélectionné.
- Menus accessibles au clavier et refermés avec Échap, au clic extérieur, après sélection ou navigation.
- Réutilisation stricte des fonctions existantes de changement d'entreprise et d'établissement.
- Interface mobile existante conservée et nouveaux sélecteurs masqués sous 900 px.
- Aucune modification des droits, abonnements, automatisations ou données métier.
- Migration `096` et cache PWA `ncr-suite-shell-v2.26.1-premium-switchers`.
- Nouveau bundle autonome `ncr-suite-app-v261.js`.

## V2.26.0 — Cycle Stripe complet et données conservées

- Catalogue des `price_id` Stripe administrable par métier, formule et module.
- Stripe devient le moyen normal pour les abonnements et modules récurrents.
- Qonto est conservé uniquement pour les prestations et virements exceptionnels.
- Choix obligatoire du métier et de la formule avant le premier paiement.
- Espace métier verrouillé jusqu’à la confirmation du paiement Stripe.
- Rétrogradations programmées à la fin de la période en cours.
- Retrait des droits premium sans suppression des clients, dossiers, documents ou historiques.
- Réapparition des données dès qu’une formule ou un module compatible est réactivé.
- Ajout et retrait automatiques des modules Formation et Sécurité dans l’abonnement Stripe.
- Délai de grâce configurable après un paiement échoué, puis suspension des accès.
- Résiliation et gestion du moyen de paiement depuis le portail client Stripe.
- Affichage du statut, de la date d’effet et de la conservation des données côté client et super-administrateur.
- Migration `095`, Edge Function `manage-stripe-addon` et cache PWA `ncr-suite-shell-v2.26.0-stripe-billing`.
- Nouveau bundle autonome `ncr-suite-app-v260.js`.

## V2.25.0 — Facturation Stripe multi-métiers

- Checkout Stripe mensuel créé à la demande depuis la page Abonnement.
- Trois premiers Price Stripe configurés pour les offres Formation.
- Catalogue extensible à tous les métiers sans nouveau développement backend.
- Création et conservation des identifiants client et abonnement Stripe dans Supabase.
- Portail client Stripe accessible aux propriétaires et administrateurs.
- Webhook signé et idempotent pour les souscriptions, paiements, échecs et résiliations.
- Synchronisation automatique du plan, du statut, des périodes et des demandes.
- Notification super-administrateur lors des principaux événements de paiement.
- Secrets Stripe confinés aux Supabase Edge Functions.
- Trois Edge Functions autonomes, déployables directement depuis le tableau de bord Supabase.
- Correction du démarrage autonome du worker `stripe-webhook`.
- Migration `094` et cache PWA `ncr-suite-shell-v2.25.0-stripe-billing`.
- Nouveau bundle autonome `ncr-suite-app-v250.js`.

## V2.24.1 — Notifications super-admin sur écran verrouillé

- Acheminement des demandes super-administrateur dans la file Web Push serveur.
- Réception possible lorsque la PWA est fermée ou le téléphone verrouillé.
- Ouverture directe de la rubrique concernée depuis la notification.
- Marquage automatique comme lu après ouverture.
- Test Push programmé lors de l’activation du téléphone super-admin.
- Indication spécifique pour l’installation de la PWA sur iPhone.
- Isolation des erreurs Push afin qu’une demande client ne soit jamais bloquée.
- Migration `093` et cache PWA `ncr-suite-shell-v2.24.1-platform-admin-locked-screen-push`.
- Nouveau bundle autonome `ncr-suite-app-v241.js`.

## V2.24.0 — Accès portails et alertes super-administrateur

- Génération sécurisée d’un lien manuel pour les invitations Formation.
- Renouvellement automatique du lien pendant 7 jours et invalidation du précédent.
- Copie et partage natif du lien depuis l’entreprise sur ordinateur ou téléphone.
- Conservation de l’envoi automatique par e-mail et de la révocation existante.
- Accès central aux portails Formation, Sécurité, Nettoyage et Coiffure depuis la connexion.
- Formation clairement présentée pour les stagiaires, formateurs et clients.
- Nouvelle cloche dans la console super-administrateur avec compteur non lu.
- Alerte immédiate dans l’application et historique personnel des événements.
- Activation facultative des alertes système sur le téléphone.
- Notifications couvrant tickets, réponses support, accès, abonnements et modules Formation/Sécurité.
- Ouverture directe de la rubrique concernée depuis chaque notification.
- Migration `092` et cache PWA `ncr-suite-shell-v2.24.0-portal-access-support-alerts`.
- Nouveau bundle autonome `ncr-suite-app-v240.js`.
- Aucun retrait de portail, automatisation, droit ou fonction métier existante.

## V2.23.2 — Finitions visuelles et cadrage mobile

- Réduction d’environ 18 % des quatre cartes flottantes du premier écran.
- Conservation de leurs animations et de la réaction au pointeur.
- Survol bleu explicite pour Plateforme, Solutions métier, Offres et Se connecter.
- Même indication bleue lors de la navigation au clavier.
- Suppression des points finaux dans les grands titres de la vitrine.
- Correction du chevauchement entre le texte et les aperçus bento sur mobile.
- Aperçus mobiles replacés dans le flux normal sous leur contenu.
- Présentation des cinq métiers en deux colonnes sur petit écran.
- Migration `091` synchronisant Supabase, le frontend et le cache PWA en `2.23.2`.
- Nouveau bundle `ncr-suite-app-v232.js` et cache `ncr-suite-shell-v2.23.2-showcase-polish`.
- Aucun changement de tarif, fonction métier, automatisation, droit ou donnée.

## V2.23.1 — Vitrine signature et bento animé

- Nouveau premier écran composé de quatre mini-interfaces bento animées.
- Réaction douce des cartes au déplacement du pointeur sur ordinateur.
- Mouvement lent maintenu sur Safari lorsque la réduction des animations est active.
- Indicateurs `01` à `04` agrandis dans le parcours opérationnel.
- Suppression de la pastille bleue qui recouvrait l’icône Collecter.
- Nouvelle progression lumineuse sans élément parasite.
- Présentation du socle transformée en grille bento contrastée et animée.
- Aperçus visuels dédiés aux métiers, modules, rôles et appareils.
- Interactions du catalogue tarifaire affinées sans modifier les prix validés.
- Migration `090` synchronisant Supabase, le frontend et le cache PWA en `2.23.1`.
- Nouveau bundle `ncr-suite-app-v231.js` et cache `ncr-suite-shell-v2.23.1-signature-showcase`.
- Aucun retrait de fonction, automatisation, droit ou donnée métier existante.

## V2.23.0 — Vitrine premium et catalogue tarifaire métier

- Mouvement renforcé et différencié des quatre signaux du premier écran.
- Parcours opérationnel relié par une progression animée de la collecte jusqu’à la décision.
- Nouveau catalogue tarifaire interactif pour les cinq métiers.
- Vingt offres synchronisées avec les prix et capacités du catalogue central validé.
- Formule Essentielle mise en avant selon la recommandation actuelle de chaque gamme.
- Présentation détaillée des accès inclus et des fonctions clés par formule.
- Correction du logo NCR Suite dans le pied de page de la demande d’accès.
- Migration `089` synchronisant Supabase, le frontend et le cache PWA en `2.23.0`.
- Nouveau bundle autonome `ncr-suite-app-v230.js` et nouveau cache `ncr-suite-shell-v2.23.0-premium-catalog`.
- Aucun retrait de fonction, automatisation, droit ou donnée métier existante.

## V2.22.4 — Démarrage Cloudflare résilient

- Correction de l’échec réel du module dynamique `PublicHomePage` observé en production.
- Regroupement du démarrage dans `ncr-suite-app-v2224.js`, servi à la racine.
- Suppression de la dépendance de la vitrine aux fragments JavaScript générés dans `/assets`.
- Feuille de style complète servie à la racine sous `ncr-suite-app-v2224.css`.
- Feuille critique animée servie sous `ncr-suite-showcase-v2224.css`.
- Conservation de toutes les animations, interactions et transitions de la V2.22.2.
- Page de récupération désormais stylée même en cas d’incident applicatif.
- Cache PWA renouvelé sous `ncr-suite-shell-v2.22.4-asset-resilience`.
- Contrôles automatiques vérifiant l’absence de fragmentation au prochain build.
- Aucun changement SQL, Supabase, authentification, automatisation ou donnée métier.

## V2.22.3 — Fiabilité Safari de la vitrine animée

- Conservation intégrale des animations et interactions introduites en V2.22.2.
- Nouvelle feuille critique légère dédiée à la vitrine et chargée avant le style général.
- Génération automatique de cette feuille depuis les styles officiels à chaque build.
- Type MIME `text/css` explicite pour les styles Cloudflare.
- Type MIME JavaScript explicite pour les modules de l’application.
- Écran de préparation NCR Suite empêchant l’affichage temporaire d’un HTML brut.
- Récupération automatique unique si les styles ne sont pas disponibles.
- Contrôle distinct de la vitrine publique et des styles complets de la connexion.
- Nouveau cache `ncr-suite-shell-v2.22.3-safari-styles`.
- Aucun changement SQL, Supabase, authentification, automatisation ou donnée métier.

## V2.22.2 — Mouvement premium et lancement PWA

- Suppression de la croix, du carré central et du repère bleu présents dans le hero ordinateur.
- Court écran d’introduction NCR Suite affiché une seule fois par session.
- Mouvements continus et discrets des signaux Relation client, Planning, Documents et Conformité.
- Présentation de ces quatre signaux également sur mobile.
- Apparition progressive des sections pendant le défilement.
- Réactions professionnelles au survol, au clic, au toucher et au changement de métier.
- Respect du réglage système réduisant les animations.
- Ouverture directe de la PWA installée sur la page de connexion.
- Conservation de la vitrine publique sur `https://ncr-suite.fr` dans un navigateur normal.
- Récupération automatique unique des erreurs de module provoquées par un ancien cache PWA.
- Cache PWA synchronisé en `ncr-suite-shell-v2.22.2-motion-pwa-recovery`.
- Aucun changement SQL, Supabase, authentification, automatisation ou donnée métier.

## V2.22.1 — Vitrine premium et catalogue métier

- Nouvelle première impression centrée sur le logo NCR Suite, sans photographie générique.
- Animation épurée reliant relation client, planning, documents et conformité autour de la marque.
- Présentation produit détaillée avec aperçu réaliste du poste de pilotage.
- Catalogue interactif pour Formation, Sécurité privée, Nettoyage, Restauration et Coiffure & beauté.
- Mise en avant claire des modules et du résultat opérationnel de chaque métier.
- Parcours visuel Collecter, Orchestrer, Prouver et Piloter.
- Présentation simplifiée de la montée en gamme et de la comparaison tarifaire déjà disponible dans l’application.
- Logos officiels haute définition dans l’en-tête et signature Retina dans le pied de page.
- Nouvelle image Open Graph sans texte coupé pour les partages et résultats enrichis.
- Responsive renforcé pour ordinateur, tablette et mobile.
- Cache PWA synchronisé en `ncr-suite-shell-v2.22.1-premium-showcase`.
- Aucun changement SQL, Supabase, authentification, automatisation ou donnée métier.

## V2.22.0 — Lancement commercial, domaine et accès contrôlés

- Nouvelle page publique complète présentant NCR Suite, ses cinq métiers, sa plateforme et sa montée en gamme.
- Séparation nette entre le site public, la connexion et l’application privée.
- Suppression de la création libre d’un espace depuis la page de connexion.
- Formulaire de demande d’accès protégé par Cloudflare Turnstile, limitation de débit et pot de miel.
- Nouvelle file de demandes dans l’administration centrale NCR.
- Acceptation, refus et renvoi d’invitation réservés au super-administrateur.
- Invitation et récupération de mot de passe personnalisées depuis `contact@ncr-suite.fr`.
- Création d’entreprise refusée en base sans demande préalablement acceptée.
- Préremplissage de la configuration avec les informations validées lors de la demande.
- Domaine canonique `https://ncr-suite.fr` dans les liens, e-mails, métadonnées et données structurées.
- Redirection contrôlée de `ncrsuite.pages.dev` et `www.ncr-suite.fr` vers le domaine principal.
- SEO technique avec canonical, Open Graph, Twitter Card, Schema.org, robots et sitemap.
- Guides complets IONOS, Cloudflare, Supabase, Brevo, SPF, DKIM et DMARC.
- Cache PWA et validation production synchronisés en V2.22.0.

## V2.21.2 — Validation production finale

- Identification des 188 fonctions publiques comme objets d'extensions PostgreSQL gérés par Supabase.
- Inventaire séparé des fonctions d'extensions sans changement de propriétaire, de rôle ou d'ACL.
- Maintien du blocage pour toute véritable fonction applicative publique hors liste autorisée.
- Reclassement des tables internes fermées par RLS comme inventaire non bloquant.
- Prévention des droits publics par défaut sur les prochaines fonctions créées par `postgres`.
- Durcissement final des anciennes fonctions `SECURITY DEFINER` déjà présentes dans Supabase.
- Ajout automatique d'un chemin de recherche sûr sans recréer les traitements existants.
- Interdiction de créer des objets dans le schéma public pour les rôles applicatifs.
- Contrôle transactionnel empêchant une installation partielle du correctif de sécurité.
- Correctif de production : suppression des droits anonymes hérités sur les fonctions internes.
- Conservation exacte des accès déjà disponibles pour les utilisateurs connectés et les traitements de service.
- Liste explicite des 22 fonctions nécessaires aux réservations, questionnaires et invitations publiques.
- Correction du faux blocage « Demandes de modules Formation » lorsque le compteur vaut zéro.
- Nouveau verdict de production réservé au super-administrateur NCR.
- Contrôles automatiques des versions, droits, abonnements, files d’envoi et erreurs navigateur.
- Vérification des automatisations Formation, imports, sessions, portails et signatures.
- Liste manuelle de mise en production obligatoire avant l’enregistrement du contrôle.
- Historique horodaté des validations avec auteur et résultats détaillés.
- Exports JSON et CSV du rapport, plus export CSV de l’historique.
- Conservation des contrôles de surveillance et de préparation V2.20 déjà validés.
- Cache PWA, migration Supabase et tests Cloudflare synchronisés.

## V2.21.1 — Reprise de données Formation

- Conservation des imports existants des stagiaires, formateurs et programmes.
- Contrôle serveur du fichier avant toute écriture dans Supabase.
- Reprise guidée des entreprises clientes, financeurs et prospects CRM.
- Import des sessions à venir en brouillon pour éviter les envois automatiques.
- Reprise des sessions historiques réalisées sans relancer les anciennes automatisations.
- Import des inscriptions, catégories BPF et heures suivies.
- Détection des doublons et validation des dépendances entre les fichiers.
- Rapport d’erreurs CSV et historique détaillé de chaque opération.
- Cache PWA et contrôles de livraison synchronisés.

## V2.21.0 — Espaces Formation et signatures traçables

- Nouveaux espaces sécurisés pour les stagiaires, formateurs et clients.
- Invitations personnelles par e-mail avec création ou connexion au compte existant.
- Vue des sessions, documents, évaluations et émargements selon le profil.
- Dépôt de pièces directement dans le dossier général ou la session choisie.
- Partage de documents existants, devis, conventions, contrats et factures.
- Demandes de signature avec consultation préalable, échéance et relances.
- Empreinte SHA-256 du document et de la preuve, référence unique et historique horodaté.
- Enregistrement automatique de la preuve dans le dossier Qualiopi.
- Console organisme pour ouvrir, suspendre et diagnostiquer les accès externes.
- Nouveau module `Portails et signatures` à la carte sur Découverte et Essentielle.
- Inclusion dans les offres Professionnelle et Métier, avec comparaison tarifaire de la V2.20.
- Nouveau cache PWA et contrôles automatiques de sécurité, droits et parcours critiques.

## V2.20.1 — Modules Formation visibles sous cadenas

- Conservation des modules Formation non inclus dans les menus ordinateur et mobile.
- Cadenas et badge de l’offre nécessaire sur chaque rubrique concernée.
- Écran de présentation dédié sans accès aux données du module verrouillé.
- Bouton de montée en gamme ouvrant directement le bon module dans `Mon abonnement`.
- Mise en évidence automatique de la carte correspondant au module demandé.
- Redirection des configurations Métier vers leur espace contractuel.
- Accès inchangé pour les modules déjà inclus ou activés à la carte.
- Contrôles automatisés des routes Formation, des droits, de la migration et du cache PWA.

## V2.20.0 — Stabilisation finale et modules Formation à la carte

- Ajout de dix modules Formation sélectionnables depuis `Mon abonnement`.
- Affichage du tarif de chaque module, du total actuel et du total après validation.
- Recommandation automatique de l’offre supérieure dès qu’elle devient plus avantageuse.
- Gestion des dépendances entre CRM, facturation et BPF.
- Demandes d’ajout ou de retrait validées depuis l’administration NCR.
- Liens Qonto facultatifs configurables séparément pour chaque module Formation.
- Désactivation automatique des suppléments devenus inclus après une montée de formule.
- Séparation des droits `Émargement numérique` et `Dossier complet de session`.
- Rapport super administrateur de préparation et d’intégrité multi-métiers.
- Nouveau test de release transversal pour les routes, droits, migrations et caches PWA.
- Nettoyage du cache PWA limité aux caches NCR Suite.

## V2.19.0 — Formation · Qualiopi, conformité et preuves

- Nouveau module `Qualiopi & conformité` réservé aux responsables Formation.
- Référentiel interne structuré en 7 critères et 32 indicateurs.
- Statut, applicabilité, responsable, échéance, constat et actions par indicateur.
- Réutilisation automatique des programmes, convocations, supports, attestations et évaluations déjà présents.
- Dépôt de preuves complémentaires avec date, expiration et session liée.
- Détection des indicateurs sans preuve et des preuves à renouveler.
- Calendrier des audits initial, surveillance, renouvellement et interne.
- Résultat d’audit et photographie des indicateurs et preuves lors de la clôture.
- Exports de préparation PDF et CSV.
- Cloisonnement multi-entreprises, rôles, fonctions contrôlées et RLS Supabase.
- Cache PWA et audits techniques synchronisés en V2.19.0.

## V2.18.0 — Formation · Facturation et encaissements

- Création de factures depuis les dossiers commerciaux acceptés, signés ou réalisés.
- Facturation partielle et partage entre client et financeur sans dépasser le montant commercial.
- Numérotation définitive par organisme et par exercice lors de l’émission.
- Factures et avoirs PDF avec identité figée du vendeur et du payeur.
- Historique des encaissements partiels ou complets et calcul du solde.
- Suivi des échéances, retards et relances automatiques Brevo.
- Réglages de paiement, mentions TVA, pénalités et coordonnées bancaires.
- BPF alimenté par les factures et avoirs émis dès qu’ils existent sur l’exercice.
- Conservation du calcul commercial V2.17.0 pour les anciens exercices sans facture.
- Cloisonnement multi-entreprises, rôles, fonctions contrôlées et RLS Supabase.
- Cache PWA, producteurs PDF, processeur e-mail et audits synchronisés en V2.18.0.

## V2.17.0 — Formation · BPF automatique

- Nouveau module annuel `BPF automatique`.
- Calcul des produits HT selon les rubriques du cadre C du Cerfa 10443*17.
- Saisie contrôlée du chiffre d’affaires et des charges du cadre D.
- Calcul des formateurs, stagiaires, heures-stagiaires, objectifs et spécialités des cadres E, F1 à F4 et G.
- Proratisation des heures à partir des émargements, avec possibilité de correction explicite.
- Classification centrale des publics, programmes, formateurs, modes de réalisation et produits commerciaux.
- Préclassement automatique uniquement lorsque les données permettent une déduction fiable.
- Contrôles bloquants et points de vigilance avant validation.
- Brouillon annuel, statut vérifié, verrouillage et réouverture réservée aux responsables.
- Exports préparatoires PDF et CSV.
- Cloisonnement multi-entreprises, rôles et RLS Supabase.
- Cache PWA, producteurs PDF, processeur e-mail et audits synchronisés en V2.17.0.

## V2.16.0 — Formation · CRM et pipeline commercial

- Nouveau pipeline CRM intégré au module commercial Formation.
- Gestion des prospects et opportunités de la prise de contact jusqu’à la vente gagnée ou perdue.
- Suivi du montant potentiel, de la probabilité et de la date de décision estimée.
- Liste centralisée des relances et signalement des actions en retard.
- Historique des appels, e-mails, rendez-vous, tâches et notes.
- Transformation d’un prospect en fiche client sans ressaisie.
- Préparation d’un devis directement depuis une opportunité.
- Synchronisation automatique du pipeline avec le statut du dossier commercial.
- Cloisonnement multi-entreprises, contrôle par rôle et RLS Supabase.
- Cache PWA, producteurs PDF et audits synchronisés en V2.16.0.

## V2.15.4 — Super administration · SAV Formation

- Nouvelle console `SAV Formation` dans l’administration centrale, visible uniquement par les super administrateurs NCR.
- Vue globale des organismes Formation et des automatisations nécessitant une intervention.
- Diagnostic par session des évaluations initiales/finales, attestations, dossiers documentaires et e-mails en échec.
- Relance guidée des jobs documentaires et des e-mails Formation.
- Réparation contrôlée d’une session en réutilisant les automatisations validées en V2.15.2 et V2.15.3.
- Migration 075 sécurisée par le contrôle `is_platform_super_admin`.
- Cache PWA, producteurs PDF, processeur e-mail et monitoring synchronisés en V2.15.4.
## V2.15.3 — Formation · Intégrité des automatisations

- Ajout de la migration 074 pour rendre la file `training_document_jobs` autoportante dans le dépôt.
- Déclaration explicite des métadonnées de documents automatiques (`automation_key`, `generated_at`, `emailed_at`).
- Fonctions service-role de traitement documentaire : claim des jobs et payload PDF.
- Garde SQL contre la planification directe d’une session sans validation officielle.
- L’écran Sessions crée désormais en brouillon puis valide via `validate_training_session_workflow` lorsque le statut demandé est planifié ou en cours.
- Lecture complète des champs d’évaluations initiales/finales dans le PDF direct de session.
- Cache PWA et monitoring synchronisés en V2.15.3.

## V2.15.2 — Formation · Déroulement et clôture automatisés

- Évaluation initiale individuelle envoyée par Brevo lors de la validation de session.
- Évaluation finale individuelle envoyée par Brevo lors de la fin de session.
- Relances automatiques configurables pour les questionnaires sans réponse.
- Questionnaire public unique adapté au début ou à la fin de formation.
- Génération et envoi automatique des attestations selon les réglages de l’organisme.
- Contrôle automatique des émargements, évaluations et attestations.
- Finalisation automatique du dossier complet.
- Nouveau centre d’évaluations moderne et responsive.
- Cockpit et dossiers de formation raccordés à la clôture automatisée.
- Cache PWA et état de version synchronisés en V2.15.2.

## V2.15.1 — Formation · Documents premium & Brevo

- Moteur documentaire premium commun.
- Envois Brevo des documents commerciaux et convocations.

## V2.29.7 — Main courante terrain sans navigation
- Saisie directe en haut de l’espace Agent.
- Raccourcis terrain et gravité accessibles sans changer de page.
- Heure automatique.
- Historique séparé de la saisie quotidienne.

## V2.29.8 — Photos et textes rapides main courante
- Ajout de jusqu'à 3 photos privées par événement de main courante Sécurité.
- Compression mobile avant upload et stockage Supabase privé.
- Textes prédéfinis contextuels accessibles en un toucher sur l'accueil Agent.
- Miniatures photo dans l'historique de la main courante.
- Autorisation caméra PWA corrigée pour le domaine NCR Suite.
- Nouveau cache PWA et nouveaux assets `v298`.


## V2.29.14 — Photo prise de poste + alignement version
- Photo arrivée/sortie toujours accessible, obligatoire uniquement si configurée par site.
- Alignement platform_release_state sur 2.29.14.
- Nouveau cache/assets v2914.
