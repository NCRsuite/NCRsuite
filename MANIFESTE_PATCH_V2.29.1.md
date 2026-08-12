# NCR Suite V2.29.1 - UI publique premium

## Ce qui change

- Nouvelle direction visuelle claire, premium et responsive pour la page principale.
- Mise en page éditoriale et aperçus produit détaillés sur les cinq pages métier.
- Grilles, offres, états de survol, transitions et retours visuels harmonisés.
- Logo horizontal officiel du pack NCR Suite utilisé dans le header et le footer.
- Police Inter officielle embarquée localement et appliquée à toute l'interface publique.
- CTA `Essai gratuit de 7 jours` ajouté au parcours public existant.
- Formulaire d'essai prérempli selon le métier et l'offre sélectionnés.
- Version, cache PWA, fichiers CSS critiques et contrôles de release alignés en V2.29.1.

## Ce qui ne change pas

- L'application connectée et ses écrans métier.
- Les droits, rôles, abonnements et produits Stripe.
- Les fonctions Supabase existantes et la validation super-administrateur.
- Les routes publiques, le référencement et le parcours de connexion.

## Installation

Suivre strictement `A_LIRE_INSTALLATION_V2.29.1.txt` :

1. Exécuter `supabase/migrations/115_public_ui_premium_trial_cta.sql`.
2. Envoyer tous les fichiers du patch sur GitHub en conservant leur arborescence.
3. Attendre le build et le déploiement Cloudflare.
4. Renouveler le cache PWA.
5. Tester la vitrine, les cinq pages métier, l'essai et une connexion existante.

## Validation réalisée

- Audit statique NCR Suite : validé.
- Parcours critiques : validés.
- Préparation de release : validée.
- TypeScript et build Vite : validés.
- Génération des cinq pages SEO et du sitemap : validée.
- Contrôle visuel ordinateur et mobile : validé.
