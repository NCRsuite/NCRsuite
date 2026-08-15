# NCR Suite V2.29.13 — Correctif fenêtre Prise / Fin de poste

## Correctifs
- corrige index.html qui chargeait encore les CSS V2.29.11 au lieu des styles Premium V2.29.12 ;
- rend la feuille Prise / Fin de poste via React Portal dans document.body ;
- supprime le backdrop-filter du fond modal pour éviter les bugs Safari/PWA ;
- ouvre la feuille immédiatement, sans attendre la RPC de relève ;
- la relève précédente se charge ensuite sans bloquer la prise de poste ;
- nouveau cache PWA et nouveaux assets V2.29.13.

## SQL
Aucun nouveau SQL. La migration 127 de la V2.29.12 reste suffisante.
