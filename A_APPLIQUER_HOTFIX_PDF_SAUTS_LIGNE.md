# Hotfix PDF — sauts de ligne propres

Ce correctif reste sur la version applicative V2.29.21 : aucune migration SQL n'est nécessaire.

## Corrige
- les retours `CRLF` / `CR` / `LF` ;
- les séparateurs Unicode U+2028 / U+2029 ;
- le caractère `?` qui pouvait remplacer un saut de ligne dans les PDF ;
- le wrapping des paragraphes dans les convocations automatiques ;
- le même comportement dans les feuilles d'émargement et dossiers de session.

## Installation
1. Écraser les fichiers du dépôt avec ceux du patch.
2. Redéployer l'application.
3. Redéployer l'Edge Function `process-email-queue` afin que les convocations automatiques utilisent aussi le correctif.
4. Régénérer un PDF pour vérifier le rendu.

Aucun SQL à exécuter.
