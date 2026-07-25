# Modèles Auth Supabase - NCR Suite V2.22.0

Dans `Supabase > Authentication > Email Templates`, utiliser les fichiers :

| Modèle Supabase | Sujet | Fichier |
| --- | --- | --- |
| Confirm signup | Confirmez votre adresse NCR Suite | `supabase/templates/confirmation.html` |
| Invite user | Votre invitation NCR Suite | `supabase/templates/invite.html` |
| Reset password | Nouveau mot de passe NCR Suite | `supabase/templates/recovery.html` |
| Change email address | Confirmez votre nouvelle adresse NCR Suite | `supabase/templates/change-email.html` |

Coller le contenu HTML complet du fichier correspondant. Ne pas supprimer la
variable `{{ .ConfirmationURL }}`.

Le SMTP personnalisé doit être activé avant le test :

```text
Sender name: NCR Suite
Sender email: contact@ncr-suite.fr
```

Les invitations d’ouverture d’une entreprise et le parcours principal de mot
de passe oublié sont envoyés directement par les Edge Functions V2.22.0. Ces
modèles Supabase restent nécessaires pour les invitations de collaborateurs,
stagiaires, formateurs et clients, ainsi que pour les changements d’adresse.

Dans Brevo, désactiver le suivi des liens et le pixel d’ouverture pour ces
messages d’authentification afin d’éviter de modifier les liens sécurisés.
