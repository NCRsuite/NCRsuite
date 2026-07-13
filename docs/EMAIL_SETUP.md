# NCR Suite V1.6 — Configuration des e-mails automatiques

## Architecture

Les rendez-vous créent des notifications dans `email_outbox`. Une Edge Function Supabase récupère la file, génère l’e-mail aux couleurs de l’entreprise et l’envoie avec Brevo. Un Cron Supabase appelle la fonction toutes les minutes.

Cette architecture évite de perdre une confirmation si le client ferme sa page juste après sa réservation.

## 1. Base de données

Exécuter dans le SQL Editor :

```text
supabase/migrations/006_email_notifications.sql
```

## 2. Brevo

Créer ou utiliser un compte Brevo, puis :

1. enregistrer et vérifier une adresse d’expédition NCR Suite ;
2. créer une clé API transactionnelle ;
3. conserver l’adresse vérifiée et la clé pour les secrets Supabase.

Le domaine conseillé est `ncr-solutions.fr`. L’expéditeur peut être par exemple :

```text
NCR Suite <notifications@ncr-solutions.fr>
```

Les entreprises clientes ne deviennent pas expéditeurs techniques. Leur adresse est utilisée comme adresse de réponse, ce qui évite d’envoyer depuis des domaines non vérifiés.

## 3. Edge Function

Dans Supabase > Edge Functions :

1. créer une fonction nommée `process-email-queue` via l’éditeur ;
2. remplacer le code par `supabase/functions/process-email-queue/index.ts` ;
3. déployer la fonction ;
4. désactiver la vérification JWT pour cette fonction, car l’accès est protégé par `EMAIL_PROCESSOR_SECRET`.

## 4. Secrets de production

Ajouter dans Edge Functions > Secrets :

```text
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=notifications@ncr-solutions.fr
BREVO_SENDER_NAME=NCR Suite
NCR_SUITE_PUBLIC_URL=https://ncrsuite.pages.dev
EMAIL_PROCESSOR_SECRET=une-valeur-longue-et-imprevisible
```

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement à l’Edge Function par Supabase.

Ne jamais placer `BREVO_API_KEY`, `EMAIL_PROCESSOR_SECRET` ou `SUPABASE_SERVICE_ROLE_KEY` dans GitHub, Cloudflare Pages ou le navigateur.

## 5. Planification

Dans Supabase > Cron > Jobs :

1. créer un job `ncr-suite-email-processor` ;
2. fréquence : toutes les minutes ;
3. type : requête HTTP `POST` ;
4. URL : `https://VOTRE_PROJECT_REF.supabase.co/functions/v1/process-email-queue` ;
5. en-têtes :

```json
{
  "Content-Type": "application/json",
  "x-ncr-suite-secret": "la-meme-valeur-que-EMAIL_PROCESSOR_SECRET"
}
```

6. corps : `{}`.

## 6. Test

1. Dans NCR Suite > Paramètres, renseigner l’e-mail de contact et activer les e-mails.
2. Créer un client avec une adresse e-mail accessible.
3. Créer un rendez-vous confirmé dans plus de 30 minutes.
4. Attendre au maximum deux minutes.
5. Vérifier l’e-mail et l’onglet Logs de l’Edge Function.

## E-mails couverts

- demande reçue en validation manuelle ;
- confirmation ;
- déplacement ;
- annulation ;
- rappel configurable ;
- nouvelle réservation publique pour l’établissement ;
- modification ou annulation publique pour l’établissement.

## Fiabilité

- file d’attente persistante en base ;
- verrouillage anti-double envoi ;
- trois tentatives automatiques ;
- notifications obsolètes annulées avant envoi ;
- aucun accès navigateur à `email_outbox` ;
- données séparées par `organization_id`.
