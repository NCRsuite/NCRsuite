# V2.4.1 — Création d’un nouvel espace entreprise

## Installation

Après la migration `017_training_pack_core.sql`, exécuter :

```text
supabase/migrations/018_admin_create_organization_space.sql
```

Puis déployer le code V2.4.1 sur GitHub. Aucun changement Brevo ou Edge Function n’est nécessaire.

## Utilisation

1. Se connecter avec le compte super-administrateur NCR.
2. Ouvrir **Administration NCR → Entreprises**.
3. Cliquer sur **Créer un espace**.
4. Saisir l’e-mail d’un compte entreprise NCR Suite déjà confirmé.
5. Choisir un domaine métier, une formule et un tarif distincts.
6. Valider la création.

Le propriétaire retrouve le nouvel espace dans **Changer d’entreprise** après actualisation ou reconnexion.

## Règles

- Un espace correspond à un seul domaine métier.
- Chaque espace possède son propre abonnement.
- Les données ne sont jamais partagées entre les espaces.
- Le compte administrateur NCR ne peut pas devenir propriétaire d’un espace entreprise.
- Un espace Métier reçoit automatiquement un établissement principal et uniquement les modules compatibles avec son domaine.
