# NCR Suite — V2.5.9

Base stable : V2.5.8 corrigée.

Cette version finalise la partie commerciale du métier Sécurité : synthèses du planning, nettoyage des préfactures, devis prospects, conversion en client, coordonnées bancaires et envoi direct des devis et factures PDF par e-mail.

Installation : voir `A_LIRE_INSTALLATION.txt` et `docs/V2.5.9_INSTALLATION.md`.

L’envoi des documents utilise la nouvelle Edge Function `send-security-document`, séparée de `process-email-queue`.
