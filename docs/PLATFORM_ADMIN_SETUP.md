# NCR Suite V2.0.2 — Administration centrale

## 1. Migration

Exécuter `010_platform_admin_subscriptions.sql` après la migration 009. La V2.0.2 ne nécessite pas de migration supplémentaire.

## 2. Autoriser le compte NCR

Le compte doit déjà exister dans Authentication > Users. Depuis le SQL Editor :

```sql
select public.bootstrap_platform_admin('adresse@ncr.fr', 'super_admin');
```

Ne jamais exposer cette commande dans l’interface client. La fonction n’est pas exécutable par un utilisateur authentifié ordinaire.

## 3. Connexion et redirection

La page de connexion est unique. NCR Suite détecte automatiquement le rôle :

- `super_admin` : redirection vers `/administration-ncr`, avec lecture et modification ;
- `support` : redirection vers `/administration-ncr`, en lecture seule ;
- utilisateur d’entreprise : ouverture de son espace métier ;
- collaborateur : accès limité aux rubriques autorisées.

Un compte plateforme ne peut pas ouvrir le tableau de bord, les clients, les prestations ou les rendez-vous d’une entreprise depuis l’interface standard.

## 4. Suspension

Le statut `suspended` bloque les données métier côté Supabase. Le membre conserve uniquement l’identité de l’entreprise afin d’afficher un écran d’information et de changer vers un autre espace actif.

## 5. Paiement

Les colonnes Stripe sont prévues, mais la V2.0.2 ne réalise aucun prélèvement. Le MRR est une estimation basée sur les abonnements marqués `active`.
