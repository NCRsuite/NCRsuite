# NCR Suite — V1.4.0

NCR Suite est une plateforme multi-entreprises indépendante de NCR Academy. Une seule base technique affiche des outils différents selon le métier de l’entreprise connectée, sans mélanger les données.

## Fonctionnalités opérationnelles du pack Coiffure & beauté

- Authentification Supabase et création d’entreprise.
- Isolation multi-entreprises avec RLS.
- Clients : création, recherche et archivage.
- Prestations : durée, tarif, description et statut.
- Collaborateurs : contacts, prestations réalisées, horaires et pauses.
- Rendez-vous internes : création, modification, planning jour/semaine et statuts.
- Contrôle automatique des horaires, pauses, prestations autorisées et doubles réservations.
- Tableau de bord coiffure alimenté par les vraies données Supabase.
- PWA responsive pour mobile et ordinateur.

## Installation locale

```bash
npm install
npm run dev
```

## Migrations Supabase

Exécuter dans cet ordre dans le SQL Editor :

1. `supabase/migrations/001_core.sql`
2. `supabase/migrations/002_booking_pack.sql`
3. `supabase/migrations/003_staff_availability.sql`
4. `supabase/migrations/004_appointments.sql`

Variables d’environnement :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-publique
```

## Déploiement Cloudflare Pages

```text
Build command: npm run build
Build output directory: dist
```

## Sécurité V1.4

Les rendez-vous ne sont plus écrits directement depuis le navigateur. Les fonctions Supabase `save_appointment` et `set_appointment_status` contrôlent les rôles, l’entreprise, le client, la prestation, le collaborateur, les horaires, les pauses et les conflits. Une contrainte PostgreSQL empêche également deux réservations concurrentes sur le même créneau.

## Prochaine évolution

V1.5 : page publique de réservation sans compte obligatoire, calcul des créneaux disponibles et confirmation client.
