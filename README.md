# NCR Suite — V2.5.5 corrigée

Base : V2.5.4.

Cette version ajoute le logo documentaire à toutes les offres Sécurité et une facturation définitive distincte des préfactures, basée sur les vacations réalisées et validées.

Installation : voir `A_LIRE_INSTALLATION.txt` et `docs/V2.5.5 corrigée_INSTALLATION.md`.


## Correctif SQL
La migration supprime explicitement l’ancienne fonction `set_security_invoice_status(uuid,uuid,text)` avant de la recréer avec son nouveau type de retour. Cela corrige l’erreur PostgreSQL `42P13 cannot change return type of existing function`.
