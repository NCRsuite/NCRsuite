# NCR Suite V2.29.16 — Formation · Droits & comptes

## Ordre de déploiement

1. Exécuter dans Supabase : `supabase/migrations/130_training_access_accounts_hardening.sql`
2. Déployer ensuite le front V2.29.16.
3. Fermer/réouvrir la PWA si nécessaire afin de charger le cache `ncr-suite-shell-v2.29.16-training-access-hardening`.

## Matrice retenue

- **Propriétaire** : tous les droits, y compris création/gestion des administrateurs.
- **Administrateur** : administration et exploitation Formation, mais ne peut ni créer ni modifier/suspendre un autre administrateur ou le propriétaire.
- **Responsable / manager** : gestion pédagogique et opérationnelle (catalogue, stagiaires, formateurs, sessions, clôture selon les fonctionnalités du plan), sans accès à l'annuaire des comptes/e-mails de l'équipe.
- **Collaborateur / employee** : consultation du catalogue, stagiaires, formateurs et sessions ; actions opérationnelles conservées sur émargements, documents et évaluations. Il ne peut plus modifier la structure pédagogique ou clôturer une session.
- **Consultation / viewer** : lecture seule sur les routes qui lui sont ouvertes.
- **Portails externes stagiaire/formateur/client** : restent isolés dans les RPC et règles dédiées du portail, sans accès au back-office interne.

## Durcissements serveur

- RLS multi-tenant Formation conservée et resserrée sur les tables cœur.
- Les rôles personnalisés Métier sont contrôlés côté base en fonction des modules autorisés.
- Un membre ne peut pas modifier son propre rôle/statut.
- Seul le propriétaire peut créer, promouvoir, suspendre ou rétrograder un administrateur.
- Les anciennes RPC génériques d'annuaire ne permettent plus à un manager Formation de lire les comptes/e-mails.
- Les limites de comptes de l'offre Formation sont contrôlées au niveau membership, même en cas d'appel direct à une ancienne RPC.
- Les comptes actifs obtiennent automatiquement un `user_profiles` manquant afin d'éviter les profils incomplets historiques.
- Les changements de rôle/statut sont audités.
- Les changements de statut et la clôture d'une session sont réservés à owner/admin/manager côté serveur.

## Interface

- Les boutons de création/modification/archive de formations, stagiaires, formateurs et sessions sont cachés aux rôles lecture/opérationnels.
- Les liens de pilotage du dossier de session ne sont plus affichés aux rôles qui n'ont pas accès au dossier.
- L'écran Accès équipe Formation utilise des RPC dédiées et affiche le statut du profil et la dernière connexion.
- Un administrateur voit les autres administrateurs mais leur gestion est indiquée comme réservée au propriétaire.
- Nouveau mot de passe de création d'un portail externe : minimum 10 caractères ; les connexions existantes ne sont pas bloquées par cette règle côté formulaire.

## Contrôles effectués

- `phase1-static-audit` : OK
- `phase1-critical-flows` : OK
- `phase1-release-readiness` : OK
- Parsing TypeScript ciblé des pages modifiées : OK

Le build TypeScript complet n'a pas pu aller au bout dans l'environnement de préparation car les paquets de définitions `@types/*` n'ont pas été complètement installés par `npm ci` avant expiration du délai.
