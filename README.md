# NCR Suite — V1.8.0

NCR Suite est une plateforme multi-entreprises indépendante de NCR Academy. Chaque entreprise dispose de son espace, de ses données isolées et des modules correspondant à son activité.

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
