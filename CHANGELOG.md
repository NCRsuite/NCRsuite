# V2.6.2 — Finalisation opérationnelle Sécurité

- Répare l’envoi des devis avec transmission explicite et renouvellement automatique de la session Supabase.
- Ajoute une fiche détaillée par agent : planning individuel, missions, heures programmées et heures terminées.
- Clarifie la facturation définitive : heures planifiées par défaut, correction uniquement sur action volontaire avec motif obligatoire.
- Ajoute la prise de poste et la fin de poste directes pour l’agent.
- Permet au QG de régulariser une prise de poste manquante, clôturer la vacation et fermer la main courante.
- Verrouille la main courante après clôture avec réouverture réservée aux administrateurs.
- Fiabilise la géolocalisation PWA : position immédiate lors de la prise de poste en offre Professionnelle, diagnostic d’autorisation, test manuel, second mode de localisation, reprise du suivi et erreurs explicites.
- Cache PWA passé en V2.6.2.

# V2.6.1 — Correctif réservation Coiffure

- Corrige le champ collaborateur utilisé par le déclencheur Push (`display_name`).
- Empêche désormais une erreur de notification de bloquer la création ou la modification d’un rendez-vous.
- Répare la réservation publique et la création interne de rendez-vous.

# 2.6.0 — Notifications push globales NCR Suite

- Centre de notifications commun à tous les domaines.
- Notifications Web Push sur PWA installée, y compris téléphone verrouillé.
- Préférences individuelles : planning, rendez-vous, documents, alertes terrain, facturation et système.
- Abonnements multi-appareils et désactivation appareil par appareil.
- Initialisation VAPID sécurisée depuis le compte super-administrateur.
- Traitement automatique de la file chaque minute via Supabase Cron et Edge Function dédiée.
- Coiffure : nouveaux rendez-vous, modifications, annulations et rappels.
- Formation : sessions, rappels et documents publiés.
- Sécurité : vacations, rappels, consignes critiques, PTI/SOS et facturation.
- Badge de notifications non lues dans la navigation.
- Aucun changement apporté à process-email-queue ou send-security-document.
- Cache PWA passé en V2.6.0.

# 2.5.9 — Planning, devis et facturation commerciale Sécurité

- Totaux d’heures du planning par agent et par site, visibles à l’écran et dans les PDF.
- Suppression sécurisée des préfactures uniquement lorsqu’elles sont encore en brouillon.
- Nouveau module Devis pour les prospects : lignes personnalisées, TVA, validité, statuts et PDF.
- Conversion d’un devis accepté en client et site sans ressaisie.
- Coordonnées bancaires configurables : titulaire, banque, IBAN et BIC.
- Pied de page bancaire sur les factures définitives et les devis.
- Envoi direct des devis et factures PDF par e-mail via une Edge Function Brevo dédiée.
- Historique des envois, statut envoyé/échec, renvoi et passage automatique de la facture au statut Envoyée.
- Aucun changement apporté à process-email-queue.
- Cache PWA passé en V2.5.9.

# 2.5.8 — Clôture et dossier complet de vacation

- Nouvelle rubrique Dossiers de vacation pour les responsables et Chefs de poste.
- Classement automatique : à compléter, prêts à clôturer, clôturés et archivés.
- Contrôle serveur avant clôture : vacation réalisée, durée validée, prise et fin de poste, ronde QR, PTI, SOS et mode vacation.
- Clôture opérationnelle par un responsable ; réouverture et archivage réservés au propriétaire ou administrateur.
- Verrouillage des données terrain après clôture.
- Rattachement automatique des rondes QR à la vacation correspondante.
- PDF complet par mission : main courante, rondes, PTI/SOS, GPS, facturation, clôture et archivage.
- Cache PWA passé en V2.5.8.

# 2.5.7 — Fiabilité terrain PWA

- Nouveau mode vacation rattaché à une mission précise.
- Démarrage groupé du GPS, de la présence terrain et du maintien d'écran lorsque le navigateur le permet.
- Battement applicatif transmis toutes les 45 secondes pendant la vacation.
- Statut réseau, visibilité de l'application, GPS et maintien d'écran affichés à l'agent.
- Positions GPS conservées localement en cas de coupure réseau puis synchronisées au retour de la connexion.
- Reprise explicite du mode vacation après fermeture ou rechargement de la PWA.
- Compte à rebours PTI en temps réel.
- SOS bloqué hors connexion avec message d'urgence clair.
- Supervision enrichie : agent connecté, application en arrière-plan, GPS interrompu ou connexion perdue.
- Alerte de supervision lorsqu'un agent en vacation n'a plus de battement récent.
- Cache PWA passé en V2.5.7.
- Correctif migration 035 : conservation du retour UUID de `start_security_patrol` pour éviter l’erreur PostgreSQL 42P13.
