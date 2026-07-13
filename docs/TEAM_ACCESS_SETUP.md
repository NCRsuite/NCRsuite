# NCR Suite V1.7 — Accès équipe

## Offres et limites

| Formule | Comptes inclus | Rôles disponibles |
|---|---:|---|
| Découverte | 1 | Propriétaire uniquement |
| Essentielle | 3 | Propriétaire + Collaborateurs |
| Professionnelle | 10 | Propriétaire + Responsables + Collaborateurs |
| Métier | 100 par défaut | Administrateur, Responsable, Collaborateur, Consultation |

Une invitation en attente occupe une place jusqu’à son acceptation, son expiration ou sa révocation.

## Installation sur une base déjà en V1.6.1

1. Exécuter `supabase/migrations/007_team_access.sql` dans le SQL Editor.
2. Remplacer le code de l’Edge Function `process-email-queue` par `supabase/functions/process-email-queue/index.ts`.
3. Redéployer la fonction avec **Verify JWT désactivé**, comme pour la V1.6.
4. Envoyer le contenu de la V1.7 sur GitHub. Cloudflare Pages redéploie automatiquement.

Aucun nouveau secret Supabase ou Brevo n’est nécessaire.

## Test d’une offre payante

Les organisations existantes restent en formule `decouverte`. Pour tester l’offre Essentielle sur une entreprise de démonstration, modifier son champ `plan` depuis le Table Editor Supabase, ou utiliser une requête SQL ciblée sur son identifiant :

```sql
update public.organizations
set plan = 'essentielle'
where id = 'IDENTIFIANT_DE_L_ENTREPRISE';
```

Ne jamais exposer cette modification aux clients dans l’application. Le changement de formule sera piloté plus tard par l’administration NCR et le système d’abonnement.

## Parcours d’invitation

1. Créer d’abord le profil dans **Collaborateurs**.
2. Ouvrir **Accès équipe**.
3. Sélectionner le rôle, le profil et l’adresse e-mail.
4. Le destinataire reçoit un lien valable 7 jours.
5. Il se connecte avec un compte existant ou crée un compte avec la même adresse.
6. Après acceptation, son compte est lié au profil collaborateur.

Un Collaborateur ne voit que son propre planning et les clients liés à ses rendez-vous. Il peut modifier le statut de ses rendez-vous, mais ne peut pas créer des prestations, gérer l’équipe ou déplacer les rendez-vous.
