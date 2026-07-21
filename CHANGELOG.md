## V2.11.0 — Administration NCR & Exploitation SaaS

- Nouveau cockpit SaaS avec entreprises actives, MRR estimé, utilisateurs, paiements en retard, onboarding incomplets et demandes urgentes.
- Vue du portefeuille par métier et centre d’attention centralisé.
- Administration des entreprises enrichie avec indicateur de santé, tickets ouverts, volume documentaire recensé, onboarding et dernière activité.
- Nouvelle file Support NCR avec filtres, priorités, assignation, notes internes et historique audité.
- Nouveau journal d’activité central multi-entreprises.
- Centre d’assistance intégré dans chaque espace métier pour créer et suivre les demandes.
- Onboarding entièrement refondu en quatre étapes : métier, identité de l’entreprise, formule souhaitée et identité visuelle.
- Coordonnées génériques de l’entreprise et état d’onboarding enregistrés dans Supabase.
- Interface responsive et moderne pour ordinateur, tablette et mobile.
- Aucun métier existant ni NCR Academy n’est modifié.

# V2.10.1 — Correctif déstockage automatique Restauration

- Réparation du déclenchement du déstockage lors du passage d’un article à l’état « Servi ».
- Nouvelle RPC transactionnelle qui confirme explicitement le nombre d’ingrédients déduits.
- Suppression des échecs silencieux : l’écran Cuisine indique désormais si la recette est absente, vide ou non éligible.
- Réconciliation manuelle des plats servis des 7 derniers jours depuis Stocks & fournisseurs.
- Réparation des droits Professionnelle et Métier dans le catalogue Supabase.
- Conservation de l’idempotence : un même article servi ne peut jamais être déduit deux fois.
- Cache PWA passé en `V2.10.1-stock-consumption-fix`.

# V2.10.0 — Fiches recettes, déstockage automatique et rentabilité Restauration

- Nouvelle rubrique **Fiches recettes** reliée directement aux plats de la carte.
- Gestion du rendement, des temps de préparation et cuisson, de la méthode, du dressage et des consignes Cuisine.
- Association des ingrédients aux références de stock avec quantités et unités compatibles (g/kg, ml/cl/l et unités).
- Enregistrement atomique des fiches recettes : la fiche et tous ses ingrédients sont validés dans une seule transaction.
- Détection des allergènes à partir des ingrédients et synchronisation volontaire vers la carte publique.
- Accès rapide à la fiche recette depuis la carte et depuis chaque ticket de l’écran Cuisine.
- Calcul automatique du coût matière par portion, de la marge brute et du taux de marge pour les comptes financiers autorisés.
- Déstockage automatique et idempotent lors du passage d’un article à l’état **Servi** en offre Professionnelle.
- Rétablissement automatique du stock lorsqu’un article servi est ensuite corrigé ou annulé.
- Recalcul sécurisé du déstockage si la quantité ou le plat d’un article déjà servi est corrigé.
- Déduction des pertes et du gaspillage du stock lorsqu’un produit est associé à la déclaration.
- Historique financier des mouvements de stock : réapprovisionnements, corrections, recettes, pertes et rétablissements.
- Le stock théorique peut devenir négatif afin de signaler un écart réel au lieu de masquer une rupture.
- Ajout des allergènes sur les ingrédients du stock.
- Tableau de bord enrichi avec les fiches recettes restant à compléter.
- Répartition par offre : fiches recettes en Découverte, consultation Cuisine en Essentielle, coûts/déstockage/traçabilité en Professionnelle.
- Aucun encaissement ni moyen de paiement n’est ajouté ou modifié.
- Cache PWA : `ncr-suite-shell-v2.10.0-restaurant-recipes`.

# V2.9.2 — Stabilisation complète Restauration

- Les réglages de réservation publique Restauration enregistrent désormais réellement le mode de confirmation, l’intervalle des créneaux, le délai minimum et la période maximale.
- La page publique respecte ces paramètres dans l’interface et côté Supabase.
- Les réservations automatiques sont directement confirmées ; le mode manuel conserve le statut en attente.
- Ajout d’une limitation anti-spam sur les demandes publiques répétées avec les mêmes coordonnées.
- Le bouton de validation reste bloqué tant que la disponibilité du créneau n’a pas été confirmée.
- Correction des décalages de date liés à l’UTC sur le tableau de bord, les réservations et le plan de salle.
- Centralisation des changements de statut des réservations avec audit et synchronisation du statut de la table.
- Messages plus explicites en cas de perte de connexion, session expirée ou créneau pris simultanément.
- Lecture plus robuste des données locales de démonstration et remontée des erreurs auparavant silencieuses sur les stocks, l’hygiène, les commandes et la cuisine.
- Cache PWA : `ncr-suite-shell-v2.9.2-restaurant-stable`.

# NCR Suite — Journal des versions

## V2.9.1 — Réservations Restauration Premium

- Refonte complète de l’écran Réservations Restauration.
- Tableau d’accueil avec réservations, couverts, demandes en attente et tables installées.
- Navigation hebdomadaire compacte et vue immédiate du nombre de réservations par jour.
- Filtres Matin, Midi, Soir, statuts et recherche client/table/téléphone.
- Tickets de réservation lisibles avec horaires, durée, table, source, contacts, notes et action suivante.
- Nouveau formulaire guidé avec boutons de couverts, durées rapides et cartes de tables réellement disponibles.
- Conservation intégrale du verrouillage anti-surréservation et de la page publique.
- Aucun SQL Supabase requis.
- Cache PWA : `ncr-suite-shell-v2.9.1-restaurant-bookings`.

## V2.9.0 — Plannings métiers premium

### Coiffure
- Nouvelle grille hebdomadaire par collaborateur et par jour.
- Rendez-vous compacts avec heure, client, prestation, durée et statut.
- Lecture immédiate du chiffre prévisionnel par collaborateur.
- Vue mobile centrée sur une journée avec sélecteur hebdomadaire.

### Formation
- Nouveau calendrier pédagogique mensuel.
- Sessions visibles par statut avec formateur, capacité et modalité.
- Agenda détaillé du jour sélectionné et accès direct au dossier.
- La vue cycle/listes existante reste disponible.

### Nettoyage
- Nouvelle grille d’exploitation hebdomadaire par agent.
- Sites différenciés visuellement et états prévu/en cours/terminé visibles.
- Vue mensuelle synthétique et vue mobile quotidienne.
- Contrôle local des chevauchements lors d’une nouvelle affectation.

### Restauration
- Nouvelle grille hebdomadaire par employé et poste.
- Distinction visuelle Salle, Cuisine, Bar/Accueil, Plonge et Manager.
- Résumé équipe, heures, services du jour et services du soir.
- Vue mobile quotidienne adaptée au service.

### Sécurité
- Le planning Sécurité existant est volontairement conservé : grille par site, vacations, couleurs, duplication, totaux et logique QG restent inchangés.

### Technique
- Aucun SQL Supabase requis.
- Cache PWA : `ncr-suite-shell-v2.9.0-premium-planning`.

# V2.8.7 — Traduction complète du menu public

- Traduction de tous les textes fixes du menu public en français, anglais, espagnol et italien.
- Le bandeau d’accueil, les compteurs, les titres de section, le badge du chef et les messages d’état suivent maintenant la langue choisie.
- Détection automatique de la langue du navigateur à la première ouverture, avec changement manuel toujours disponible.
- Amélioration d’accessibilité du sélecteur de langue.
- Aucun SQL ni changement des données Restauration.
- Cache PWA : `ncr-suite-shell-v2.8.7-public-menu-i18n`.

# V2.8.6 — Expérience Restauration Premium

- Refonte visuelle complète de la prise de commande tactile.
- Cartes produits plus lisibles avec catégories, descriptions, allergènes, prix et ajout immédiat.
- Sélection des tables modernisée et note provisoire présentée comme un véritable ticket de service.
- Tableau de cuisine enrichi avec indicateurs, temps d’attente, tickets hiérarchisés et remarques mises en évidence.
- Carte interne modernisée avec aperçu visuel, statut de disponibilité et indicateurs de traduction.
- Menu QR public repensé dans un style restaurant premium et entièrement responsive.
- Optimisations spécifiques iPhone et petits écrans, sans modification des fonctions métier ni de la base Supabase.
- Cache PWA : `ncr-suite-shell-v2.8.6-restaurant-premium`.

# NCR Suite — Journal des versions

## V2.8.5 — Commande tactile, cuisine, note provisoire et plan mobile

- Prise de commande tactile depuis une table ou une note libre.
- Ajout immédiat d’un plat à la note par simple appui.
- Quantités, remarques de cuisson, allergies et demandes particulières.
- Envoi des nouveaux articles vers l’écran Cuisine.
- Suivi article par article : à préparer, en préparation, prêt et servi.
- Note provisoire calculée automatiquement, sans stockage d’un moyen de paiement.
- Clôture après règlement sur la caisse ou le terminal externe du restaurant.
- Synchronisation automatique de l’état de la table : commande, à encaisser puis à nettoyer.
- Accès par offre : commande en Découverte, écran Cuisine en Essentielle, postes avancés en Professionnelle.
- Plan de salle adapté automatiquement à la largeur du téléphone.
- Bascule Adapter / Précision pour consulter tout le plan ou travailler avec zoom et défilement.
- Commandes tactiles, cuisine et note provisoire conservées.
- Cache PWA : `ncr-suite-shell-v2.8.5-restaurant-orders-mobile`.

## V2.8.4 — Paramètres Restauration et page publique

- Correction du libellé « tarif Coiffure » dans les paramètres des entreprises Restauration et Nettoyage.
- Présentation des fonctions réellement incluses dans chaque formule Restauration.
- Ajout du réglage Restauration dédié pour activer ou désactiver la page publique de réservation.
- Correction de l’adresse publique vers `/r/{slug}/reserver`.
- Bouton d’activation directe depuis la rubrique Réservations.
- Réparation du droit `restaurant_online_reservations` pour les offres Essentielle, Professionnelle et Métier.
- Contrôle Supabase du métier, du rôle et de l’offre avant activation.
- Cache PWA : `ncr-suite-shell-v2.8.4-restaurant-public-page`.

## V2.8.3 — Anti-surréservation des tables

- Tables proposées selon la date, l’heure, la durée, la capacité et leur disponibilité réelle.
- Retrait automatique d’une table du sélecteur lorsqu’un autre utilisateur la réserve.
- Blocage serveur transactionnel des doubles réservations, même lors de créations simultanées.
- Libération du créneau après annulation, absence ou fin de réservation.
- Contrôle de disponibilité sur la page de réservation publique.
- Attribution automatique de la plus petite table adaptée aux demandes en ligne.
- Compatibilité conservée pour les restaurants sans plan de salle configuré.
- Cache PWA : `ncr-suite-shell-v2.8.3-reservation-lock`.

## V2.8.2 — Plan de salle interactif

- Éditeur visuel libre avec glisser-déposer tactile et souris.
- Redimensionnement et rotation des tables.
- Tables rondes, carrées et rectangulaires avec capacité et zone personnalisées.
- Ajout de murs, portes, fenêtres, comptoirs, cuisine, toilettes, escaliers, zones interdites et libellés.
- Grille magnétique réglable, zoom et défilement mobile.
- Séparation entre mode édition sécurisé et mode service.
- États opérationnels : libre, réservée, occupée, commande, encaissement, nettoyage et indisponible.
- Réservations du jour visibles directement sur la table sélectionnée.
- Salles multiples réservées aux offres Professionnelle et Métier.
- Migration 047 sans suppression des tables ou réservations existantes.
- Cache PWA : `ncr-suite-shell-v2.8.2-floor-plan`.

# V2.8.1 — Correctif et stabilisation Restauration

- Remplacement des champs de traduction manuelle par une traduction automatique réelle des noms, descriptions et catégories en anglais, espagnol et italien.
- Ajout de l’Edge Function sécurisée `translate-restaurant-menu`, avec DeepL lorsqu’une clé est configurée et un moteur de secours sans clé.
- Traductions modifiables, retraduction des plats existants et menu QR réellement localisé, allergènes compris.
- Réparation du catalogue Supabase des offres et des modules Restauration afin de rétablir les accès attendus selon Découverte, Essentielle, Professionnelle et Métier.
- Séparation correcte des droits Températures et Checklists.
- Création atomique des modèles de checklist pour éviter les procédures vides ou partiellement enregistrées.
- Réservations créées manuellement directement confirmées.
- Conservation des traductions lors de la modification d’un prix, d’un coût ou des allergènes.
- Cache PWA passé en `V2.8.1-restaurant-stable`.

# V2.8.0 — Pack Restauration

- Activation du domaine Restauration dans NCR Suite et dans l’administration des offres.
- Offre Découverte : employés, planning, carte, catégories, prix, allergènes, fournisseurs, stocks simples et réservations internes.
- Offre Essentielle : jusqu’à 10 employés connectés, espace personnel, réservation publique, plan de salle, menu QR en français, anglais, espagnol et italien, températures et checklists.
- Offre Professionnelle : jusqu’à 50 employés, rôle Manager, coûts matière confidentiels, marge théorique par plat, stocks avancés, pertes et statistiques opérationnelles.
- Pages publiques dédiées au menu QR et à la demande de réservation.
- Accès aux fonctions supérieures visibles avec cadenas et contrôlés côté Supabase.
- Coûts matière lisibles uniquement par le propriétaire et les administrateurs.
- Invitations d’employés reliées à leur fiche Restauration.
- RLS dédiée et isolation stricte des données par entreprise.
- Cache PWA passé en `V2.8.0-restaurant`.

# V2.7.1 — Protocoles, récurrences et rentabilité Nettoyage

- Offre Découverte : protocoles de nettoyage structurés par site et planification récurrente hebdomadaire.
- Génération sans doublon des interventions sur les huit prochaines semaines.
- Sélection d’un protocole lors d’une planification manuelle.
- Offre Essentielle : checklists terrain copiées automatiquement dans les interventions.
- Blocage du départ tant que les tâches obligatoires ne sont pas terminées.
- Preuve photo après obligatoire lorsqu’elle est demandée par le protocole.
- Progression des tâches visible dans l’espace agent, le suivi des interventions et les rapports.
- Rapports PDF enrichis avec le détail des tâches réalisées.
- Offre Professionnelle : coût horaire confidentiel, consommables et marge estimée par chantier.
- Accès financier limité au propriétaire et aux administrateurs.
- RLS, fonctions Supabase et contrôles d’offre appliqués côté serveur.
- Cache PWA passé en `V2.7.1-cleaning-protocols`.

# V2.7.0 — Pack Nettoyage complet

- Activation du domaine Nettoyage dans NCR Suite et dans l’administration des offres.
- Offre Découverte : clients, sites, agents, planning, affectations et préfacturation programmée.
- Offre Essentielle : jusqu’à 10 agents connectés, espace terrain, pointage arrivée/départ, consignes de site, photos avant/après, fiches de passage et PDF.
- Offre Professionnelle : jusqu’à 50 agents, rôle Chef d’équipe, anomalies, actions correctives, contrôle qualité, stocks, seuils et statistiques opérationnelles.
- Offre Métier : conservation du multi-site, des modules et rôles sur mesure, de la marque blanche et des limites contractuelles.
- Nouveau tableau de bord Nettoyage avec activité du jour, retards de pointage, anomalies et alertes de stock.
- RLS Supabase dédiée, isolation stricte par entreprise et contrôle serveur des droits selon la formule.
- Invitations d’agents Nettoyage reliées à leur fiche terrain.
- Cache PWA passé en `V2.7.0-cleaning`.

# V2.6.5 FINAL — Envoi devis, planning agent et suppression sécurisée

- Nouveau service Edge Function `send-security-document-v2` pour fiabiliser l’envoi des devis et factures.
- Message explicite si la fonction n’est pas déployée.
- Fiche Agent avec vue hebdomadaire détaillée.
- Vue mensuelle avec total d’heures et répartition par semaine.
- Affichage des heures programmées, terminées et facturables.
- Suppression définitive d’une planification future créée par erreur.
- Confirmation avant suppression et audit complet.
- Blocage automatique si la vacation a commencé ou contient des données terrain, GPS, PTI, ronde, main courante ou facturation.
- Annulation des rappels Push encore en attente pour la mission supprimée.
- Cache PWA passé en `V2.6.5-final`.

## V2.11.1 — Assistance NCR sécurisée

- Conversation directe entre l'entreprise et l'équipe NCR tant que le ticket reste ouvert.
- Demande d'autorisation de prise en main liée au ticket.
- Approbation ou refus par le propriétaire ou un administrateur de l'entreprise.
- Sessions temporaires de 15, 30 ou 60 minutes.
- Bandeau permanent pendant l'intervention et sortie immédiate vers l'administration NCR.
- Révocation possible par l'entreprise à tout moment.
- Journalisation complète des demandes, autorisations, démarrages et fins de session.
- Fermeture automatique des accès lorsque le ticket est résolu ou fermé.
- Pages sensibles masquées pendant l'assistance.
