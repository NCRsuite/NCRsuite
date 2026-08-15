# NCR Suite V2.29.9 — Correctif affichage photos main courante

- Les photos des derniers événements sont visibles directement sur l’accueil Agent.
- Les photos restent visibles dans l’historique complet de la main courante.
- Un fichier joint mais non lisible affiche désormais un état explicite au lieu de disparaître silencieusement.
- Une erreur d’upload photo n’est plus masquée par un faux message de succès.
- Après dépôt, NCR vérifie le rattachement et tente immédiatement de générer une URL signée privée.
- Aucun nouveau SQL : la migration 123_security_logbook_photos_quick_texts.sql de la V2.29.8 doit déjà être appliquée.
