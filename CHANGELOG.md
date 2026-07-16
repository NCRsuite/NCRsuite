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
