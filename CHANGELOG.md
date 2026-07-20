# V2.6.6 — Centre opérationnel Sécurité

- Ajout du cockpit QG en temps réel sur le tableau de bord Sécurité.
- Suivi immédiat des agents en poste, prises de poste en retard et fins de poste oubliées.
- Regroupement des alertes critiques et anomalies opérationnelles dans une file « À traiter ».
- Accès direct aux dossiers de vacation depuis le cockpit.
- Aucun changement de schéma Supabase requis.

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
