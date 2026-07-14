# NCR Suite V2.2 — Administration centrale et facturation

## Migrations

Après les migrations 001 à 011, exécuter :

```text
012_qonto_billing_portal.sql
```

## Autoriser le compte NCR

Depuis le SQL Editor :

```sql
select public.bootstrap_platform_admin(
  'TON_ADRESSE_DE_CONNEXION_NCR',
  'super_admin'
);
```

Le rôle `support` reste en lecture seule. Le rôle `super_admin` peut gérer les formules, les accès, les liens Qonto et les demandes d’abonnement.

## V2.2

L’administration permet désormais :

- de configurer un lien de paiement récurrent par formule ;
- de régler la période d’essai des nouvelles entreprises ;
- de modifier les conditions d’abonnement et de résiliation ;
- de consulter les demandes de changement ;
- de confirmer manuellement un paiement Qonto ;
- d’activer ou de refuser une formule ;
- de conserver un historique des changements.

Stripe reste prévu dans le modèle de données, mais il n’est pas actif dans la V2.2.
