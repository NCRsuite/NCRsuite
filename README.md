# NCR Suite — V2.2.1

NCR Suite est une plateforme multi-entreprises indépendante de NCR Academy. Chaque entreprise dispose de son espace, de ses données isolées et des modules correspondant à son activité.


## V2.2 — Abonnements Qonto

- Page **Mon abonnement** dans chaque espace entreprise.
- Comparatif dynamique des formules et compteurs d’utilisation.
- Liens de paiement récurrents Qonto configurables depuis Administration NCR.
- Validation manuelle du paiement avant l’activation de la formule.
- Période d’essai configurable et expiration automatique.
- Conditions d’abonnement versionnées et historique complet.
- Modèle de données indépendant du prestataire pour préparer Stripe plus tard.

Après les migrations 001 à 011, exécuter :

```text
supabase/migrations/012_qonto_billing_portal.sql
```

La procédure détaillée est disponible dans `docs/QONTO_BILLING_SETUP.md`.


## V2.0.2 — Accès administrateur et mobile

- Le rôle plateforme est détecté automatiquement après authentification.
- Un Super-administrateur ou un compte Support est envoyé exclusivement vers `/administration-ncr`.
- Les utilisateurs d’entreprise restent dirigés vers leur espace métier ; les collaborateurs vers les rubriques autorisées par leur rôle.
- Sur mobile, toutes les rubriques sont regroupées dans un menu latéral `☰`, avec une barre basse limitée aux actions essentielles.
- La page globale ne défile plus horizontalement. Le planning et les tableaux conservent un défilement local contrôlé lorsqu’il est nécessaire.
- Cette mise à jour ne nécessite aucune migration SQL supplémentaire. La migration `010_platform_admin_subscriptions.sql` doit déjà être installée.

## Pack Coiffure & beauté opérationnel

- Authentification Supabase et création d’entreprise.
- Clients, prestations et profils collaborateurs.
- Horaires, pauses et prestations attribuées.
- Rendez-vous internes et planning jour/semaine.
- Réservation publique selon les disponibilités réelles.
- Modification et annulation via un lien privé.
- Confirmations, alertes et rappels par Brevo.
- Comptes d’équipe séparés avec rôles et permissions.
- Isolation multi-entreprises et RLS Supabase.
- PWA responsive pour mobile et ordinateur.

## Offres d’accès équipe

- **Découverte** : 1 compte propriétaire.
- **Essentielle** : jusqu’à 3 utilisateurs, rôle Collaborateur.
- **Professionnelle** : jusqu’à 10 utilisateurs, rôles Responsable et Collaborateur.
- **Métier** : rôles avancés et limite personnalisable dans une future administration NCR.

## Migrations Supabase

Pour une nouvelle installation, exécuter dans l’ordre :

1. `001_core.sql`
2. `002_booking_pack.sql`
3. `003_staff_availability.sql`
4. `004_appointments.sql`
5. `005_public_booking.sql`
6. `006_email_notifications.sql`
7. `007_team_access.sql`

Pour une installation déjà en V1.6.1, exécuter uniquement `007_team_access.sql`.

## Mise à jour de l’Edge Function

La V1.8 ajoute le consentement client, les règles de réservation configurables et l’ajout au calendrier. La V1.7 avait ajouté l’e-mail d’invitation d’équipe. Remplacer le code de la fonction Supabase `process-email-queue` par :

`supabase/functions/process-email-queue/index.ts`

Puis enregistrer et redéployer la fonction. Les secrets Brevo existants restent inchangés.

## Développement local

```bash
npm install
npm run dev
```

Variables :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-publique
```

## Cloudflare Pages

```text
Build command: npm run build
Build output directory: dist
```

La procédure détaillée de la V1.7 est disponible dans `docs/TEAM_ACCESS_SETUP.md`.


## Migration V1.8

1. Exécuter `supabase/migrations/008_client_experience.sql`.
2. Remplacer le code de l’Edge Function `process-email-queue` par `supabase/functions/process-email-queue/index.ts`.
3. Déployer le code sur GitHub puis attendre le déploiement Cloudflare.
4. Configurer les textes dans **Paramètres → Expérience client**.


## V1.9 — Personnalisation commerciale

La formule Professionnelle permet de personnaliser la page de réservation et les e-mails avec le nom commercial, le logo, la couleur, une bannière, une adresse, des horaires et des informations pratiques. Voir `docs/COMMERCIAL_BRANDING_SETUP.md`.

## Administration centrale V2.0

Après les migrations 001 à 009, exécuter `supabase/migrations/010_platform_admin_subscriptions.sql`.

Puis autoriser une seule fois le compte NCR depuis le SQL Editor :

```sql
select public.bootstrap_platform_admin(
  'TON_ADRESSE_DE_CONNEXION_NCR',
  'super_admin'
);
```

L’espace central devient accessible à l’adresse `/administration-ncr`. Le rôle `support` peut consulter, tandis que `super_admin` peut modifier les formules et suspendre les espaces.

La V2.2 utilise Qonto avec validation manuelle sécurisée. Les champs génériques permettent d’ajouter Stripe plus tard sans reconstruire le portail d’abonnement.


## Migration V2.1

Après les migrations 001 à 010, exécuter `supabase/migrations/011_plan_entitlements_mobile.sql` avant de déployer la V2.1. Cette migration applique réellement les limites de formule et sécurise les fonctions publiques côté Supabase.
