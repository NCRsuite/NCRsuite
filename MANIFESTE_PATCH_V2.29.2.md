# NCR Suite V2.29.2 - Corrections de cadrage public

## Ce qui change

- Les quatre cartes du flux sont alignées sur une même ligne sur ordinateur.
- Leur hauteur et leurs espacements sont réduits sans toucher au rendu mobile.
- Le catalogue des offres est remonté pour supprimer la grande zone vide.
- Le dernier appel à l'action est plus compact et mieux équilibré.
- Le pied de page passe définitivement en mode clair.
- Le logo horizontal officiel retrouve ses proportions et sa lisibilité.
- Les nouveaux fichiers CSS et JavaScript V2.29.2 forcent le renouvellement du cache.

## Ce qui ne change pas

- L'application connectée et les écrans métier.
- Les formulaires, routes et CTA existants.
- Les prix, produits Stripe, abonnements, rôles et droits.
- Les contenus SEO, le sitemap, les canonical et l'indexation.
- Les données Supabase et les fonctions existantes.

## Installation

Suivre uniquement `A_LIRE_INSTALLATION_V2.29.2.txt` :

1. Exécuter `supabase/migrations/116_public_ui_spacing_fix.sql`.
2. Envoyer tous les fichiers du patch sur GitHub en conservant leur arborescence.
3. Attendre le build et le déploiement Cloudflare.
4. Renouveler le cache PWA.
5. Vérifier la vitrine sur ordinateur et mobile puis une connexion existante.

## Validation réalisée

- Audit statique NCR Suite : validé.
- Parcours critiques : validés.
- Préparation de release : validée.
- TypeScript et build Vite : validés.
- Génération des cinq pages SEO et du sitemap : validée.
- Contrôle visuel définitif à effectuer sur le domaine après le déploiement Cloudflare.
