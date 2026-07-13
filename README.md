# NCR Suite — V1.5.0

NCR Suite est une plateforme multi-entreprises indépendante de NCR Academy. Une seule base technique affiche des outils différents selon le métier de l’entreprise connectée, sans mélanger les données.

## Fonctionnalités opérationnelles du pack Coiffure & beauté

- Authentification Supabase et création d’entreprise.
- Isolation multi-entreprises avec RLS.
- Clients : création, recherche et archivage.
- Prestations : durée, tarif, description et statut.
- Collaborateurs : contacts, prestations réalisées, horaires et pauses.
- Rendez-vous internes : création, modification, planning jour/semaine et statuts.
- Tableau de bord alimenté par les données réelles Supabase.
- Réservation publique sans compte client.
- Créneaux calculés selon les horaires, pauses, durées et rendez-vous existants.
- Choix d’un collaborateur ou de l’option « Peu importe ».
- Confirmation automatique ou validation manuelle.
- Consultation, déplacement et annulation via un lien privé.
- PWA responsive pour mobile et ordinateur.

## Migrations Supabase

Pour une nouvelle installation, exécuter dans cet ordre dans le SQL Editor :

1. `supabase/migrations/001_core.sql`
2. `supabase/migrations/002_booking_pack.sql`
3. `supabase/migrations/003_staff_availability.sql`
4. `supabase/migrations/004_appointments.sql`
5. `supabase/migrations/005_public_booking.sql`

Pour une installation déjà en V1.4, exécuter uniquement `005_public_booking.sql`.

## Activation de la page publique

Après la migration et le déploiement :

1. Ouvrir **Paramètres** dans NCR Suite.
2. Activer **Prise de rendez-vous en ligne**.
3. Régler le mode de confirmation et les délais.
4. Enregistrer.
5. Ouvrir ou copier le lien affiché : `/reserver/identifiant-entreprise`.

## E-mails

La réservation, l’affichage dans le planning et le lien de gestion sont fonctionnels sans service supplémentaire. L’envoi automatique d’un e-mail personnalisé nécessite ensuite la connexion d’un fournisseur d’e-mail transactionnel. Aucun envoi n’est simulé par la V1.5.

## Installation locale

```bash
npm install
npm run dev
```

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

## Sécurité V1.5

Les tables privées ne sont pas ouvertes aux visiteurs. La page publique utilise uniquement des fonctions PostgreSQL `security definer` dédiées qui contrôlent l’entreprise, les prestations, les collaborateurs, les horaires, les pauses, les délais et les conflits. Les liens de gestion reposent sur un jeton UUID aléatoire non affiché dans le planning interne.

## V1.6.1 — E-mails automatiques

Cette version ajoute une file d’envoi sécurisée, une Edge Function Supabase et l’intégration Brevo pour :

- confirmation ou accusé de réception d’un rendez-vous ;
- modification et annulation ;
- rappel automatique configurable ;
- notification de l’établissement lors d’une réservation publique ;
- trois tentatives automatiques en cas d’échec ;
- séparation stricte des données par entreprise.

Installation : exécuter `006_email_notifications.sql`, déployer `process-email-queue`, ajouter les secrets Brevo puis planifier l’appel de la fonction.
