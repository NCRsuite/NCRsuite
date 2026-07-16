# V2.6.4 — Correctif régularisation tardive de fin de poste

- Une vacation oubliée peut être terminée après sa plage horaire sans déclencher l’erreur de main courante.
- L’événement « Fin de poste » est rattaché à l’heure planifiée de fin lorsque la régularisation intervient plus de deux heures après la mission.
- L’heure réelle de l’action reste enregistrée dans l’audit et dans la date de traitement du dossier.
- Les heures facturées restent fondées sur les heures planifiées, conformément à la règle Sécurité validée.
- Cache PWA passé en V2.6.4.
