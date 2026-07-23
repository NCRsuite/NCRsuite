# V2.15.0 — Formation · Parcours unifié

- Nouvelle rubrique « Parcours Formation » : cockpit central du programme au dossier complet.
- Refonte de la rubrique Formations en catalogue maître moderne, responsive et réutilisable.
- Fiche formation complète : public, prérequis, objectifs, programme détaillé, méthodes, moyens, évaluations, accessibilité, durée, capacité, tarif, TVA, lieu et formateurs habilités.
- Indicateur automatique de complétude avant commercialisation.
- Nouveau « Profil organisme » saisi une seule fois : identité, coordonnées, SIRET, NDA, représentant légal, TVA, adresse de retour des documents signés, mentions communes et conditions par défaut.
- Liaison obligatoire d’un devis, d’une convention ou d’un contrat à une formation complète.
- Import du document signé dans le dossier commercial.
- Transformation guidée d’une proposition signée en session en préparation.
- Préremplissage du formateur principal, des dates, de la capacité, du lieu et du stagiaire nominatif.
- Ajout des stagiaires validés au moment de la création de la session.
- Validation explicite de la session avant tout envoi.
- Mise en file automatique des convocations individuelles via le processeur Brevo existant.
- Cockpit session : commercial, participants, convocations, évaluation initiale, émargements, évaluation finale, attestations et dossier complet.
- Interface Formation modernisée pour ordinateur et mobile.
- Protection des nouveaux parcours par rôles, offres et RLS Supabase.
- Synchronisation frontend, base et cache PWA en V2.15.0.
- Cache PWA : `ncr-suite-shell-v2.15.0-training-workflow`.

## Limites volontaires de ce lot

- La refonte graphique commune de tous les PDF et l’envoi direct Brevo des devis/conventions seront livrés en V2.15.1.
- L’automatisation complète des évaluations initiales/finales, relances, attestations et clôture sera livrée en V2.15.2.
