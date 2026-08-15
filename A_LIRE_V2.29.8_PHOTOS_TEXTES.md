# NCR Suite V2.29.8 — Main courante Sécurité

Cette version ajoute la saisie terrain enrichie sans changer le parcours rapide V2.29.7.

## Avant le déploiement

1. Exécuter dans Supabase : `supabase/migrations/123_security_logbook_photos_quick_texts.sql`.
2. Déployer ensuite l'intégralité du dépôt V2.29.8.
3. Fermer puis rouvrir la PWA si elle était déjà installée.

## Nouveautés

- Jusqu'à 3 photos par événement de main courante.
- Photos compressées côté téléphone avant envoi.
- Bucket Supabase privé `security-logbook-photos`.
- Accès photo limité au QG et à l'agent concerné.
- Textes rapides contextuels selon RAS, ronde, anomalie, véhicule, livraison et contrôle d'accès.
- Aperçus photo avant enregistrement puis miniatures dans l'historique de main courante.
- Autorisation caméra PWA limitée au domaine NCR Suite (`camera=(self)`).

## Contrôle rapide

Prendre un poste → choisir `Anomalie` → toucher un texte rapide → prendre une photo → `Ajouter maintenant` → ouvrir `Historique` et vérifier la miniature.
