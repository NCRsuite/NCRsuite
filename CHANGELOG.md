# 2.5.1 — Sécurité privée · Offre Essentielle

- Ajout de 10 comptes agents connectés maximum selon la formule.
- Espace terrain personnel avec planning limité aux missions de l’agent.
- Rondes QR : création des points, QR imprimables, démarrage, scan et clôture contrôlée.
- Scan des QR compatible Safari/iPhone par photo avec décodage local, plus saisie manuelle de secours.
- Main courante intelligente avec catégories et niveaux de gravité prédéfinis.
- Consignes et alertes propres à chaque site avec accusé de lecture.
- Export PDF de la main courante réservé aux responsables.
- Planning hebdomadaire en matrice sites × jours, avec une couleur distincte par site.
- Duplication d’une mission sur les jours choisis de la semaine.
- Planning collaborateur PDF mensuel : sites en lignes, jours en colonnes, horaires, totaux journaliers et hebdomadaires.
- RLS renforcée : un agent ne voit que sa fiche, son planning, ses sites, ses rondes et sa main courante.
- Dépendances publiques `qrcode` et `jsqr` : génération des QR imprimables et décodage local des photos sur mobile.
- Rubrique Paramètres / abonnement alignée sur les droits réels de l’offre Sécurité.
- Cache PWA mis à jour en V2.5.1.

# 2.5.0 — Socle Sécurité privée · Découverte

- Activation du domaine Sécurité privée dans la création des espaces.
- Tableau de bord Sécurité connecté aux données réelles.
- Gestion des clients donneurs d’ordre.
- Gestion des sites avec tarif horaire HT.
- Gestion des agents sans accès terrain.
- Planning hebdomadaire avec contrôle des chevauchements.
- Calcul des heures programmées et de la prévision de facturation.
- Génération de préfactures par client et par période.
- PDF de préfacturation compatible Safari et iPhone.
- Isolation multi-entreprises et règles RLS dédiées.
- Cache PWA mis à jour en V2.5.0.

# CHANGELOG

## 2.4.13 — Catalogue central des offres

- Nouveau catalogue central dans le compte super administrateur avec les cinq domaines NCR Suite.
- Suppression du domaine Artisan et remplacement par Restauration dans l’interface et le catalogue Supabase.
- Grilles tarifaires centralisées pour Coiffure, Formation, Sécurité, Nettoyage et Restauration.
- Présentation progressive des formules : chaque niveau affiche uniquement son socle ou ce qu’il ajoute à l’offre précédente.
- Offres Sécurité validées à 39,90 €, 69,90 €, 89,90 € et à partir de 119,90 € HT/mois.
- Offres Nettoyage validées à 29,90 €, 49,90 €, 79,90 € et à partir de 109,90 € HT/mois.
- Offres Restauration validées à 29,90 €, 49,90 €, 79,90 € et à partir de 109,90 € HT/mois.
- Menu QR Restauration multilingue prévu en français, anglais, espagnol et italien, avec traduction automatique modifiable.
- Sécurité, Nettoyage et Restauration sont marqués « En préparation » et ne peuvent pas encore être créés avant livraison de leurs modules.
- Mise à jour des limites d’accès : 10 puis 50 agents/employés pour les offres terrain concernées.
- Migration Supabase `026_central_offer_catalog.sql`.
- Aucun changement de Brevo, Qonto, Coiffure, Formation ou NCR Academy.
- Cache PWA et version applicative passés en V2.4.13.

## 2.4.12 — Pilotage & contrôle qualité Formation

- Nouveau tableau de bord Formation centré sur les actions à traiter.
- Classement immédiat des sessions planifiées, en cours, prêtes à clôturer et clôturées.
- Détection des formateurs non affectés, sessions sans stagiaires, convocations incomplètes, émargements manquants, attestations absentes et questionnaires non envoyés.
- Accès direct depuis chaque alerte vers la session, les émargements, les documents ou les évaluations concernés.
- Mise en évidence automatique de la session ciblée et ouverture directe du contrôle de clôture.
- Indicateurs réels : stagiaires formés, taux de présence, couverture documentaire, note moyenne et taux de réponse.
- Périodes d’analyse de 30 jours, 90 jours et 12 mois.
- Graphique des sessions clôturées et stagiaires formés sur six mois.
- Export du plan de pilotage en PDF multipage et CSV compatible Excel.
- Adaptation automatique aux droits des offres : émargement numérique et satisfaction uniquement lorsqu’ils sont autorisés.
- Aucun SQL, aucune nouvelle dépendance et aucun changement de Brevo, Qonto, Coiffure ou NCR Academy.
- Cache PWA et version applicative passés en V2.4.12.

## 2.4.11 — Organisation multi-domaines et clôture des sessions

- Classement des entreprises par domaine dans le compte super administrateur, avec filtre et regroupement Coiffure, Formation, Sécurité, Nettoyage et Restauration.
- Vue « Mes abonnements NCR Suite » regroupant tous les abonnements accessibles lorsqu’un utilisateur possède plusieurs domaines.
- Total mensuel actif et accès direct au détail de chaque abonnement.
- Sessions Formation rangées automatiquement en Planifiées, En cours, Clôturées et Annulées.
- Contrôle de clôture : date de fin passée, formateur affecté, stagiaires inscrits et émargements complets lorsque la formule inclut la signature numérique.
- Clôture sécurisée avec horodatage, note interne, journal d’audit et déclenchement des automatisations existantes.
- Verrouillage des émargements et inscriptions après clôture.
- Réouverture réservée au propriétaire et aux administrateurs.
- Documents Formation regroupés par session puis par rubrique : convocations, programmes, supports, attestations, administratifs et autres.
- Migration Supabase `025_training_session_closure.sql`.
- Aucun changement de l’Edge Function Brevo, de Qonto, du pack Coiffure ou de NCR Academy.
- Cache PWA et version applicative passés en V2.4.11.

## 2.4.10 — Offres Formation dans l’administration NCR

- Correction de la grille tarifaire utilisée par le super administrateur lors de la modification d’un espace Formation existant.
- Tarifs Formation correctement proposés : 39,90 €, 69,90 €, 99,90 € et 149,90 € HT/mois.
- Limites d’accès affichées depuis le catalogue du domaine sélectionné au lieu de valeurs génériques codées en dur.
- Présentation claire des droits propres à chaque formule Formation directement dans l’éditeur d’abonnement administrateur.
- Conservation des tarifs Coiffure et des autres domaines sans modification.
- Aucun changement Supabase, Brevo, Qonto ou NCR Academy requis.
- Cache PWA et version applicative passés en V2.4.10.

## 2.4.9 — Droits des offres Formation

- Matrice Formation appliquée à Découverte, Essentielle, Professionnelle et Métier.
- Découverte limitée à la feuille d’émargement vierge tout en conservant les attestations automatiques.
- Émargement numérique, signatures et PDF signé réservés à Essentielle et aux offres supérieures.
- Personnalisation des convocations, attestations, émargements et e-mails automatiques disponible à partir d’Essentielle.
- Évaluations de satisfaction, dossier complet de session, multi-site et accès employés avec rôles réservés à Professionnelle et aux configurations Métier compatibles.
- Nouvelle gestion des établissements Formation et rattachement des programmes, sessions et documents au bon site.
- Génération d’un dossier complet de session avec participants, présence, satisfaction, documents et traçabilité.
- Rubrique Mon abonnement réécrite de façon progressive : chaque offre affiche uniquement ce qu’elle ajoute.
- Contrôles appliqués dans l’interface, les routes, les RPC Supabase, les RLS et le stockage des signatures.
- Conservation stricte des modules Métier déjà configurés sur mesure.
- Aucun changement de l’Edge Function Brevo : les automatisations Coiffure et Formation existantes sont conservées.
- Cache PWA et version applicative passés en V2.4.9.

## 2.4.8 — Signatures PDF et téléchargements fiables

- Recadrage automatique des signatures manuscrites avant leur insertion dans la feuille d’émargement.
- Affichage agrandi et lisible des signatures du matin et de l’après-midi dans le PDF.
- Détection fiable des fichiers PNG et JPEG, même lorsque Supabase renvoie un type MIME générique.
- Une signature temporairement inaccessible ne bloque plus la génération de toute la feuille d’émargement.
- Téléchargement des documents par URL Supabase signée avec nom de fichier et en-tête de téléchargement.
- Fenêtre préparée dès le clic pour éviter le blocage Safari/iPhone après l’appel asynchrone à Supabase.
- Page de secours avec boutons Télécharger et Ouvrir pour les PDF d’émargement générés localement.
- Aucun changement Supabase ni Edge Function requis depuis la V2.4.7.
- Cache PWA et version applicative passés en V2.4.8.

## 2.4.7 — Attestations et émargement PDF

- Accès direct aux attestations générées depuis chaque session.
- Bibliothèque Documents filtrable par session et par catégorie.
- Boutons distincts pour visualiser ou télécharger chaque document.
- Badge d’identification des documents générés automatiquement.
- Génération locale sécurisée d’une feuille d’émargement PDF par journée.
- Regroupement des émargements du matin et de l’après-midi avec signatures et horodatages.
- PDF paysage multipage adapté aux sessions nombreuses.
- Aucun changement Supabase ni Edge Function requis depuis la V2.4.6.
- Cache PWA et version applicative passés en V2.4.7.

## 2.4.6 — Évaluations et satisfaction Formation

- Questionnaire public individuel envoyé après la fin d’une session.
- Notes sur le contenu, le formateur, l’organisation et l’atteinte des objectifs.
- Recommandation, commentaire libre et piste d’amélioration.
- Envoi automatique Brevo configurable de 0 à 48 heures après la session.
- Relance manuelle depuis l’espace Formation.
- Tableau de suivi avec taux de réponse, note moyenne et taux de recommandation.
- Isolation stricte par entreprise et établissement.
- Conservation de toutes les automatisations e-mail Coiffure et Formation existantes.
- Cache PWA et version applicative passés en V2.4.6.

## 2.4.5 — Documents automatiques Formation

- Convocations PDF individualisées générées dès qu’une session est planifiée.
- Attestations de fin générées à la clôture de la session après contrôle d’une présence signée.
- Classement automatique dans la bibliothèque Documents avec statut d’envoi.
- Envoi Brevo avec PDF en pièce jointe et identité visuelle de l’organisme.
- File de traitement sécurisée, relances automatiques et messages d’erreur exploitables.
- Boutons de régénération / renvoi depuis les sessions.
- Suivi par session du nombre de documents générés, en attente ou en erreur.
- Cache PWA et version applicative passés en V2.4.5.


## 2.4.4 — Émargements et signatures Formation

- Feuilles d’émargement par session, journée et période matin / après-midi.
- Liste automatique des stagiaires inscrits à la session.
- Signature manuscrite directement sur téléphone, tablette ou ordinateur.
- Présence validée uniquement avec une signature et un nom de signataire.
- Gestion des absences, absences justifiées et émargements restant à réaliser.
- Horodatage, rattachement au stagiaire, à la session, au site et à l’utilisateur qui a capturé la signature.
- Stockage privé des signatures dans Supabase Storage avec liens temporaires.
- Remplacement sécurisé d’une signature et suppression du fichier devenu obsolète.
- Interface responsive pensée pour le formateur qui fait signer chaque stagiaire sur son appareil.
- Tableau de bord Formation mis à jour et cache PWA passé en V2.4.4.

## 2.4.3 — Documents du pack Formation

- Bibliothèque documentaire réelle connectée à Supabase Storage.
- Classement par catégorie : convocation, programme, support, attestation, administratif et autre.
- Rattachement facultatif à une session, une formation et un stagiaire.
- Visibilité interne, session complète ou stagiaire désigné.
- Téléchargement sécurisé par lien temporaire.
- Recherche, filtres, brouillons, archivage et restauration.
- Isolation stricte par entreprise et par établissement pour les offres Métier.
- Taille maximale de 20 Mo et formats PDF, image, Word, Excel ou texte.
- Tableau de bord Formation mis à jour ; émargements et signatures annoncés comme prochaine phase.
- Cache PWA mis à jour en V2.4.3.

## 2.4.2 — Tarifs et offres par domaine métier

- Conservation des quatre niveaux communs : Découverte, Essentielle, Professionnelle et Métier.
- Nouveau catalogue commercial distinct pour chaque domaine.
- Tarifs Formation intégrés : 39,90 €, 69,90 € et 99,90 € HT/mois ; Métier sur étude.
- Tarifs Coiffure conservés : 9,90 €, 19,90 € et 39,90 € HT/mois.
- Page Mon abonnement adaptée au domaine : fonctions et indicateurs Formation réels.
- Liens Qonto séparés entre Coiffure et Formation.
- Administration NCR avec sélection du domaine avant configuration des liens de paiement.
- Création d’espace préremplie avec le bon tarif selon le domaine et la formule.
- Correction automatique des espaces Formation encore facturés avec un ancien tarif générique, sans écraser les tarifs personnalisés.
- Cache PWA mis à jour en V2.4.2.

## 2.4.1 — Création d’espaces multi-activités

- Nouveau bouton **Créer un espace** dans Administration NCR → Entreprises.
- Rattachement d’un nouvel espace à un compte entreprise déjà existant, sans nouvelle adresse e-mail.
- Un domaine métier unique, des données isolées et un abonnement indépendant pour chaque espace.
- Choix de la formule, du tarif mensuel et de la période d’essai au moment de la création.
- Configuration initiale des limites, frais et établissement principal pour l’offre Métier.
- Activation automatique des seuls modules compatibles avec le domaine choisi.
- Blocage des comptes administrateurs NCR comme propriétaires d’un espace métier.
- Journalisation de la création et initialisation sécurisée de l’abonnement.
- Cache PWA mis à jour en V2.4.2.

## 2.4.0 — Pack Formation, socle opérationnel

- Tableau de bord Formation alimenté par les vraies données Supabase.
- Catalogue de formations avec code, durée, modalité, objectifs et établissement.
- Répertoire de stagiaires avec coordonnées, entreprise et notes.
- Répertoire de formateurs avec spécialités.
- Création transactionnelle de sessions avec dates, capacité, lieu, formateur et inscriptions.
- Statuts de session : brouillon, planifiée, en cours, terminée et annulée.
- Gestion multi-établissements pour les espaces Formation en offre Métier.
- RLS et contrôles inter-entreprises appliqués à toutes les nouvelles tables.
- Documents, émargements et attestations restent prévus pour la prochaine évolution.
- Cache PWA mis à jour en V2.4.0.

## 2.3.3 — Multi-établissements opérationnel

- Sélecteur distinct Entreprise / Établissement sur ordinateur et mobile.
- Vue consolidée « Tous les établissements » pour les responsables.
- Collaborateurs rattachés à un établissement précis.
- Rendez-vous internes filtrés et enregistrés par établissement.
- Tableau de bord filtré selon le site actif.
- Réservation publique avec choix de l’établissement.
- Déplacement client conservé dans le site initial.
- Migration automatique des collaborateurs et rendez-vous existants vers le site principal.
- Contrôles différés Supabase empêchant les incohérences de site.

# Changelog

## 2.3.1 — Correctif personnalisation commerciale

- Correction de l’enregistrement de la personnalisation pour les espaces existants.
- Conservation autorisée d’un ancien lien public réservé lorsqu’il appartient déjà à l’entreprise.
- Affichage du véritable message Supabase en cas d’échec au lieu du message générique.
- Messages d’erreur d’envoi de logo ou bannière rendus lisibles.
- Rafraîchissement du cache API Supabase après la migration corrective.

## 2.3.0 — Offre Métier opérationnelle

- Nouvelle configuration contractuelle par entreprise : limites d’accès, établissements, stockage et frais de mise en service.
- Gestion multi-établissements avec site principal, activation, désactivation et archivage.
- Catalogue de modules à la carte, configuré uniquement par l’administration NCR.
- Navigation automatiquement adaptée aux modules inclus dans le contrat.
- Rôles personnalisés avec niveau de sécurité et rubriques visibles.
- Attribution sécurisée des rôles aux collaborateurs, sans modification des comptes Propriétaire ou Administrateur.
- Marque blanche activable par NCR et domaine personnalisé avec suivi de validation DNS.
- Nouvel onglet **Offres Métier** dans l’administration centrale.
- Nouvelle page **Configuration Métier** dans l’espace client.
- Protection des routes masquées et renforcement des règles PostgreSQL.
- Cache PWA mis à jour en V2.3.0.

## 2.3.0 — Offre Métier opérationnelle

- Ajout d’une configuration contractuelle dédiée aux entreprises Métier.
- Limites personnalisées pour les utilisateurs, établissements et stockage.
- Frais de configuration et référence de contrat suivis dans l’administration NCR.
- Gestion de plusieurs établissements avec site principal et statuts.
- Catalogue de modules activables à la carte avec navigation dynamique.
- Rôles personnalisés : niveau système, rubriques visibles et attribution aux utilisateurs.
- Marque blanche soumise à activation NCR et domaine personnalisé avec statut DNS.
- Nouvel onglet **Offres Métier** dans l’administration centrale.
- Nouvelle page **Configuration Métier** dans l’espace entreprise.
- Les domaines Cloudflare restent volontairement configurés manuellement pour éviter toute modification DNS non contrôlée.
- Les établissements sont administrables dans cette version ; le rattachement des rendez-vous, collaborateurs et données opérationnelles à un site précis viendra avec le premier pack métier multi-site.
- Cache PWA mis à jour.


## 2.2.1 — Accès abonnement et paiements clarifiés

- Ajout d’un accès permanent et visible à **Mon abonnement** dans la barre latérale et le menu mobile.
- Carte dédiée indiquant la formule active et l’accès au changement de formule.
- Administration NCR séparée en deux sections explicites : **Entreprises** et **Abonnements & paiements**.
- Les demandes de changement, les liens Qonto et les conditions ne sont plus enfouis en bas de page.
- Cache PWA mis à jour pour forcer la récupération de la nouvelle interface.


## 2.2.0 — Abonnements Qonto & portail commercial

- Nouvelle page **Mon abonnement** pour les propriétaires et administrateurs d’entreprise.
- Comparatif des quatre formules, fonctions incluses, utilisation et historique.
- Liens de paiement récurrents Qonto configurables depuis l’administration NCR.
- Demande de changement enregistrée avant la redirection vers Qonto.
- Activation manuelle sécurisée après vérification du paiement dans Qonto.
- File de demandes avec validation, refus, note interne et référence de paiement.
- Période d’essai configurable pour les nouvelles entreprises.
- Suspension automatique des essais arrivés à échéance.
- L’espace suspendu conserve l’accès à la page d’abonnement pour régularisation.
- Conditions d’abonnement et de résiliation versionnées et acceptées avant toute demande.
- Compteurs d’utilisation : accès, clients, prestations, rendez-vous mensuels et stockage de marque.
- Historique des changements de formule et de statut.
- Architecture multi-prestataires compatible avec Qonto maintenant et Stripe plus tard.
- Cache PWA mis à jour.

## 2.1.0 — Formules automatiques & correctif iPhone

- Correction du zoom automatique d’iOS Safari sur les champs de connexion et de formulaire.
- Fermeture du clavier et remise à zéro du défilement avant la redirection après connexion.
- Le zoom manuel de l’utilisateur reste disponible pour préserver l’accessibilité.
- Nouveau catalogue central des fonctions incluses dans chaque formule.
- Rappels automatiques réellement bloqués en Découverte, côté interface et Supabase.
- Modification et annulation en ligne réellement réservées à Essentielle et aux offres supérieures.
- Liens Apple, Google Agenda et Outlook réservés à Essentielle et aux offres supérieures.
- Écran Paramètres enrichi avec la formule, les accès inclus et les fonctions verrouillées.
- Une baisse de formule neutralise automatiquement les fonctions qui ne sont plus incluses.
- Cache PWA mis à jour.

## 2.0.2 — Compte administrateur dédié & navigation mobile

- Redirection automatique du compte Super-administrateur et Support vers `/administration-ncr` dès la connexion.
- Suppression de l’accès au tableau de bord métier, aux rendez-vous, clients, collaborateurs et prestations pour les comptes plateforme.
- Page de connexion unique : aucun choix manuel de rôle ou d’espace administrateur.
- Administration centrale autonome, sans bouton de retour vers un espace entreprise.
- Nouveau menu latéral mobile complet ouvert avec le bouton `☰`.
- Barre inférieure limitée à Accueil, Planning/Rendez-vous, action rapide et Menu.
- Changement d’entreprise, personnalisation, paramètres et déconnexion accessibles sur mobile.
- Blocage strict du débordement horizontal de l’application ; seuls les tableaux et le planning peuvent défiler dans leur propre zone.
- Adaptation renforcée aux petits écrans, aux encoches iPhone et à la barre d’accueil.
- Aucun nouveau SQL ni changement d’Edge Function requis.
- Cache PWA mis à jour.

## 2.0.1 — Accès mobile à la personnalisation

- Ajout d’un accès direct « Personnaliser l’entreprise » dans le menu de compte mobile.
- L’accès est visible pour les propriétaires, administrateurs et responsables lorsque le pack métier prend en charge la personnalisation.
- Les offres inférieures conservent la page de présentation verrouillée, tandis que Professionnelle et Métier accèdent à l’éditeur complet.
- Aucun changement SQL ni Edge Function requis.
- Cache PWA mis à jour.

## 2.0.0 — Administration centrale et abonnements

- Nouvel espace sécurisé `/administration-ncr` réservé à NCR Suite.
- Tableau de bord global : entreprises, utilisateurs, essais, suspensions et MRR estimé.
- Recherche et filtres par formule ou statut.
- Gestion manuelle des formules Découverte, Essentielle, Professionnelle et Métier.
- Tarifs mensuels personnalisables pour les accords spécifiques.
- Périodes d’essai, fins de période, résiliation programmée et notes internes.
- Suspension sécurisée : l’entreprise voit son état, mais ses données métier sont bloquées par les règles Supabase.
- Rôles plateforme Super-administrateur et Support en lecture seule.
- Catalogue central des offres et structure prête pour une future connexion Stripe.
- Backfill automatique des entreprises existantes sans perte de données.
- Accès Administration NCR ajouté sur ordinateur et mobile.
- Cache PWA mis à jour.

## 1.9.1 — Navigation mobile

- Ajout d’un menu de compte accessible depuis l’en-tête mobile.
- Changement d’entreprise disponible sur téléphone et tablette.
- Déconnexion désormais visible et accessible sur mobile.
- Redirection sécurisée vers le tableau de bord après changement d’entreprise.
- Accès rapide aux paramètres depuis le menu mobile.
- Prise en charge de la fermeture par toucher extérieur et touche Échap.


## 1.9.0 — Personnalisation commerciale Professionnelle

- Nouveau module Personnalisation réservé aux offres Professionnelle et Métier.
- Nom commercial, couleur, logo et bannière propres à l’établissement.
- Lien public de réservation personnalisable avec contrôle d’unicité.
- Adresse, horaires et informations pratiques visibles par les clients.
- Aperçu mobile en direct avant enregistrement.
- Stockage sécurisé des images dans un bucket Supabase dédié.
- Page publique et espace de gestion du rendez-vous enrichis.
- E-mails de rendez-vous harmonisés avec le logo, la couleur et l’adresse de l’établissement.
- Mention « Propulsé par NCR Suite » obligatoire en Professionnelle et configurable en Métier.
- Identité publique neutre NCR Suite conservée pour les offres inférieures.
- Mise à jour du cache PWA et de la documentation de déploiement.

## 1.8.0 — Expérience client et gestion du rendez-vous

- Consentement explicite obligatoire avant toute réservation publique.
- Enregistrement de la date et du texte de consentement dans Supabase.
- Politique de modification/annulation et information de confidentialité configurables par entreprise.
- Nouvelle page de gestion client plus complète avec coordonnées et règles de l’établissement.
- Ajout au calendrier Apple, Google Agenda et Outlook.
- Liens de gestion et ajout Google Agenda intégrés aux e-mails de rendez-vous.
- Informations de contact plus visibles pour le client.
- Mise à jour du cache PWA et renforcement de la traçabilité.

## 1.7.1

- Correction de la migration équipe : appels pgcrypto qualifiés via `extensions.digest` et `extensions.gen_random_bytes`.
- Ajout explicite de l’extension `pgcrypto` dans le schéma `extensions`.

## 1.7.0 — Comptes d’équipe et permissions

- Invitations par e-mail avec lien personnel valable 7 jours.
- Comptes séparés pour le propriétaire, les responsables et les collaborateurs.
- Limites automatiques selon la formule : 1, 3, 10 ou 100 utilisateurs.
- Offre Découverte verrouillée avec présentation de l’offre Essentielle.
- Rôle Responsable disponible à partir de l’offre Professionnelle.
- Association d’un compte à un profil Collaborateur existant.
- Suspension, réactivation, renvoi et révocation des accès.
- Collaborateur limité à son propre planning et aux rendez-vous qui lui sont attribués.
- Contrôles renforcés côté PostgreSQL, RLS et fonctions sécurisées.
- Nouveau modèle Brevo pour les invitations d’équipe.

## 1.6.1 — E-mails automatiques

- File d’envoi transactionnelle sécurisée.
- Confirmations, demandes en attente, modifications et annulations.
- Rappels configurables de 2 à 72 heures.
- Alertes professionnelles pour les réservations publiques.
- Edge Function Brevo avec reprises automatiques en cas d’échec.
- Paramètres e-mail par entreprise.

## 1.5.0

- Ajout d’une page publique de réservation propre à chaque entreprise : `/reserver/identifiant`.
- Réservation sans création de compte client.
- Choix de la prestation, du collaborateur ou de l’option « Peu importe ».
- Calcul côté Supabase des créneaux réellement disponibles selon les horaires, pauses, durées et rendez-vous existants.
- Confirmation automatique ou demande soumise à validation manuelle.
- Création ou mise à jour sécurisée du client dans la bonne entreprise.
- Protection contre les doubles réservations simultanées et limitation des envois répétitifs.
- Lien privé permettant au client de consulter, déplacer ou annuler sa réservation dans le délai autorisé.
- Nouveaux réglages : activation, intervalle des créneaux, délai minimum, période réservable et délai d’annulation.
- Accès direct à la page publique depuis le tableau de bord et les paramètres.
- Préparation de l’envoi d’e-mails transactionnels, à connecter à un fournisseur dédié lors d’une étape séparée.
- Mise à jour du cache PWA.

## 1.4.0

- Ajout du module Rendez-vous internes connecté à Supabase.
- Création et modification avec client, prestation, collaborateur, date, heure, statut et notes.
- Planning hebdomadaire et journalier responsive.
- Filtres par collaborateur et statut.
- Contrôle des horaires de travail, pauses et prestations attribuées.
- Protection anti double-réservation côté interface, fonction SQL et contrainte PostgreSQL.
- Gestion des statuts : en attente, confirmé, terminé, absent et annulé.
- Tableau de bord Coiffure & beauté alimenté par les données réelles.
- Mise à jour du cache PWA.

## 1.3.0

- Ajout du module Collaborateurs connecté à Supabase.
- Création et modification des membres de l’équipe.
- Gestion du nom, de l’e-mail, du téléphone et de la couleur de planning.
- Attribution des prestations réalisables par collaborateur.
- Configuration des jours travaillés, horaires et pauses.
- Enregistrement transactionnel des réglages grâce à une fonction Supabase sécurisée.
- Recherche, filtres et activation/désactivation.
- Préparation du moteur de disponibilités pour les futurs rendez-vous publics.
- Mise à jour du cache PWA.

## 1.2.0

- Ajout du module Prestations connecté à Supabase.
- Création et modification des prestations.
- Gestion de la durée, du tarif et de la description.
- Activation et désactivation sans suppression des historiques.
- Recherche et filtres par statut.
- Résumé automatique du catalogue : nombre, durée moyenne et tarif moyen.
- Respect des rôles : seuls les responsables autorisés peuvent modifier le catalogue.
- Le raccourci principal du tableau de bord ouvre désormais la création d’une prestation.
- Mise à jour du cache PWA.

## 1.1.0

- Ajout du module Clients réellement connecté à Supabase.
- Création, recherche, affichage et archivage des clients.
- Le bouton « Créer un client » ouvre directement le formulaire.
- Ajout d'une redirection SPA Cloudflare Pages pour les routes internes.
- Mise à jour du cache PWA.

## 1.0.2

- Stabilisation du déploiement Cloudflare Pages.

- Correctif SQL final : chargement séparé du `%ROWTYPE` de session et du fuseau horaire pour compatibilité PL/pgSQL.
