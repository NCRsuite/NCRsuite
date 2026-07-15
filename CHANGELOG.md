# 2.5.5 — Identité documentaire et factures définitives Sécurité

- Logo de l’entreprise disponible pour toutes les offres Sécurité.
- Nouvelle rubrique Personnalisation avec identité légale et profil de facturation.
- Logo intégré aux mains courantes PDF, plannings PDF, préfactures et factures.
- Séparation claire entre préfactures calculées depuis les heures programmées et factures calculées depuis les vacations réalisées.
- Validation des minutes réellement effectuées avant émission.
- Numérotation chronologique des factures par entreprise et par année (`FAC-AAAA-000001`).
- Lignes détaillées par site et annexe listant chaque vacation facturée.
- Calcul HT, TVA et TTC, échéance, coordonnées légales et instantané des informations au moment de l’émission.
- Une vacation ne peut être intégrée qu’à une seule facture définitive.
- Statuts des factures : Émise, Envoyée, Payée et En retard.
- Préfactures et factures définitives restent consultables dans deux rubriques séparées.
- Cache PWA passé en V2.5.5.

- Correctif migration 032 : suppression explicite de l’ancienne fonction `set_security_invoice_status` avant recréation avec les nouveaux champs de retour.
