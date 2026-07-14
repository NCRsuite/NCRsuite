# Changelog

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
