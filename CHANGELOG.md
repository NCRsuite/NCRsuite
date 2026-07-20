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
