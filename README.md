# NCR Suite — V1.1.0

NCR Suite est une nouvelle plateforme indépendante de NCR Academy.

Le principe : une seule plateforme multi-entreprises, avec une expérience différente selon le métier de l’entreprise connectée.

## Ce qui fonctionne déjà

- Design sobre NCR Solutions.
- Connexion et inscription prévues avec Supabase.
- Mode démonstration local sans configuration.
- Création d’un espace entreprise.
- Choix parmi cinq métiers : coiffure, nettoyage, sécurité, formation et artisan.
- Menus et tableau de bord adaptés automatiquement au métier.
- Couleur d’accent personnalisable.
- Structure responsive mobile et ordinateur.
- Manifest PWA et service worker.
- Base SQL multi-entreprises avec rôles, RLS, clients, documents et audit.
- Schéma du premier pack rendez-vous.
- Module Clients fonctionnel : création, liste, recherche et archivage connecté à Supabase.

## Tester immédiatement

```bash
npm install
npm run dev
```

Tant que Supabase n’est pas configuré, l’application propose un mode de démonstration local.

## Connecter Supabase

1. Créer un nouveau projet Supabase uniquement pour NCR Suite.
2. Ouvrir l’éditeur SQL.
3. Exécuter dans l’ordre :
   - `supabase/migrations/001_core.sql`
   - `supabase/migrations/002_booking_pack.sql`
4. Copier `.env.example` vers `.env`.
5. Renseigner l’URL et la clé `anon` du nouveau projet.
6. Redémarrer `npm run dev`.

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
```

## Déploiement recommandé

Cloudflare Pages ou Vercel conviennent mieux qu’un sous-dossier GitHub Pages pour cette application React avec authentification.

Commande de build :

```bash
npm run build
```

Dossier publié : `dist`

## Architecture

```text
src/
├── components/          composants d’interface
├── config/              définition des packs métier
├── contexts/            connexion et entreprise active
├── lib/                 client Supabase
├── pages/               pages principales
├── App.tsx              routes
└── styles.css           charte visuelle

supabase/migrations/     base de données et sécurité
```

## Important

Cette V1.1.0 ajoute le premier module réellement opérationnel : la gestion des clients. Les chiffres affichés sur les tableaux de bord restent encore des données visuelles de démonstration. Les autres modules métier seront développés lot par lot.


## Identité officielle V1.0

Les éléments de marque sont centralisés dans :

```text
public/brand/
public/icons/
public/og/
```

Le logo horizontal est utilisé dans les écrans principaux, tandis que l’icône carrée alimente le chargement, le favicon et l’installation PWA.

## Correctif Cloudflare V1.0.2

Le registre npm est explicitement configuré sur le registre public officiel. Le fichier `package-lock.json` ne contient plus aucune URL privée liée à l’environnement de génération.
