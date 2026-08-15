# NCR Suite V2.29.7 — UX Agent / Main courante

Correctif ciblé du parcours terrain Sécurité.

## Changement principal
La saisie quotidienne de la main courante ne redirige plus l'agent vers le bas d'une autre page.
Une console de saisie est maintenant directement affichée en haut de l'espace Agent dès que le poste est pris.

### Parcours
1. Prendre mon poste
2. Choisir un raccourci : RAS, Ronde, Anomalie, Passage véhicule, Livraison, Personne / accès
3. Ajouter éventuellement un complément
4. Choisir la gravité si nécessaire
5. Ajouter maintenant

L'heure est prise automatiquement au moment de l'enregistrement.
La page Main courante complète reste accessible via « Historique » pour consultation / exports.

## Base de données
Aucun nouveau SQL n'est requis si la migration 121_security_agent_logbook_fast_entry.sql du hotfix précédent a déjà été appliquée.
