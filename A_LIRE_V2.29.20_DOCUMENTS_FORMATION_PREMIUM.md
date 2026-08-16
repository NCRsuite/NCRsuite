# NCR Suite V2.29.20 — Documents Formation premium

## Objectif
Harmoniser les principaux documents Formation autour d'une identité plus claire, plus lisible et plus professionnelle, sans modifier les données métier existantes.

## Documents concernés dans cette release
- Devis de formation
- Convention de formation professionnelle
- Contrat de formation professionnelle
- Convocation automatique individuelle

## Évolutions principales
- En-tête commun plus sobre et mieux hiérarchisé.
- Logo isolé dans un bloc propre et coordonnées de l'organisme séparées du titre.
- Pied de page harmonisé avec nom de l'organisme, SIRET/NDA/TVA et référence.
- Devis : synthèse financière renforcée et vraie zone « Bon pour accord ».
- Convention/contrat : signatures mieux structurées et informations client/organisme plus lisibles.
- Convocation : destinataire mieux identifié, e-mail visible, bloc « Votre session en un coup d'œil », puis formation, lieu, formateur et fin prévue.
- Métadonnées PDF alignées sur la V2.29.20.
- Contrôle avant génération automatique : les convocations ne partent plus avec un stagiaire, une formation, des dates ou un lieu présentiel manquants.

## Installation depuis V2.29.19
1. Exécuter `supabase/migrations/134_training_premium_documents_release.sql`.
2. Déployer le patch V2.29.20.
3. Fermer/réouvrir la PWA si elle était déjà ouverte.

## Important
Les documents déjà générés et archivés ne sont pas modifiés rétroactivement. Les nouveaux PDF générés après déploiement utilisent le nouveau rendu. Une régénération d'un document existant utilisera également le nouveau template.
