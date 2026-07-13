# Changelog

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
