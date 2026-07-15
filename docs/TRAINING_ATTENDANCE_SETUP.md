# NCR Suite — Émargements Formation V2.4.4

## Installation

Exécuter après `020_training_documents.sql` :

```text
supabase/migrations/021_training_attendance.sql
```

Aucun secret supplémentaire ni modification de l’Edge Function Brevo n’est nécessaire.

## Fonctionnement

1. Ouvrir **Formation → Émargements**.
2. Sélectionner la session, la journée et la période matin ou après-midi.
3. Le formateur passe l’appareil au stagiaire et touche **Faire signer**.
4. Le stagiaire signe dans le cadre puis valide.
5. Pour une absence, choisir **Absent** ou **Justifié**.

## Sécurité

- bucket privé `training-signatures` ;
- limite de 2 Mo par signature ;
- lecture réservée aux membres de l’entreprise ;
- écriture réservée aux rôles autorisés ;
- validation serveur de l’inscription du stagiaire et des dates de session ;
- une seule ligne par stagiaire, date et période.
