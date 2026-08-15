# NCR Suite V2.29.10 — Photos dans le PDF de main courante

## Installation
1. La V2.29.9 doit déjà être installée.
2. Exécuter `supabase/migrations/125_security_logbook_pdf_photos.sql`.
3. Déployer ensuite cette V2.29.10.
4. Fermer puis rouvrir la PWA si elle était déjà ouverte.

## Correctif
- Le PDF de main courante recharge les photos de chaque événement au moment de l'export avec des URLs signées fraîches.
- Jusqu'à 3 photos sont intégrées sous l'événement correspondant.
- Les images sont redimensionnées automatiquement sans déformation.
- Si un fichier ne peut vraiment pas être lu, le PDF affiche un encart `Aperçu indisponible` au lieu d'ignorer silencieusement la pièce jointe.
- Aucun changement du stockage privé des photos.

## Test
`Agent -> prise de poste -> événement + photo -> Main courante -> PDF de la mission`.
La photo doit apparaître sous l'événement concerné.
