# NCR Suite V2.2 — Abonnements Qonto

## Principe retenu

NCR Suite utilise des liens de paiement récurrents Qonto pour les premières commercialisations. La plateforme reste indépendante du prestataire afin de pouvoir ajouter Stripe plus tard sans reconstruire la gestion des abonnements.

Dans cette version :

- le client choisit une formule depuis **Mon abonnement** ;
- NCR Suite crée une demande avec une référence interne ;
- le client est redirigé vers le lien Qonto de la formule ;
- le super-administrateur vérifie le paiement dans Qonto ;
- il valide ensuite la demande depuis **Administration NCR** ;
- la formule et les droits sont activés dans Supabase.

Il n’y a volontairement aucune clé Qonto dans le navigateur et aucune activation basée uniquement sur une page « paiement réussi ».

## 1. Installer la migration

Exécuter après la migration 011 :

```text
supabase/migrations/012_qonto_billing_portal.sql
```

## 2. Créer les liens dans Qonto

Dans Qonto, créer un lien récurrent mensuel pour chaque formule commercialisée :

- Découverte : 9,90 € HT / mois ;
- Essentielle : 19,90 € HT / mois ;
- Professionnelle : 39,90 € HT / mois.

L’offre Métier reste sur étude et n’a pas besoin de lien automatique.

## 3. Ajouter les liens dans NCR Suite

Se connecter avec le compte super-administrateur :

```text
Administration NCR → Abonnements & Qonto → Liens de paiement
```

Pour chaque formule :

1. choisir `Qonto` ;
2. coller le lien HTTPS ;
3. activer la formule ;
4. enregistrer.

## 4. Traiter une demande

Quand un client souscrit :

1. vérifier dans Qonto que le paiement ou l’abonnement récurrent existe ;
2. repérer l’entreprise, l’e-mail et le montant ;
3. ouvrir la demande dans Administration NCR ;
4. ajouter facultativement la référence visible dans Qonto ;
5. cliquer sur **Valider et activer**.

Tant que cette validation n’est pas faite, NCR Suite ne modifie pas la formule.

## 5. Période d’essai

Le super-administrateur peut régler :

- la durée de l’essai ;
- la formule disponible pendant l’essai ;
- les conditions d’abonnement ;
- les conditions de résiliation.

Les nouvelles entreprises utilisent ces réglages. À la fin de l’essai, l’espace est suspendu mais le propriétaire conserve l’accès à **Mon abonnement** pour régulariser.

## 6. Préparation de Stripe

Les abonnements utilisent des champs génériques :

- `provider` ;
- `provider_customer_id` ;
- `provider_subscription_id` ;
- `provider_payment_reference` ;
- `provider_metadata`.

La valeur peut être `manual`, `qonto` ou `stripe`. Une future Edge Function Stripe pourra traiter les webhooks et approuver automatiquement les demandes sans modifier l’interface entreprise.
