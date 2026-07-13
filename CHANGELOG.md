# Changelog

## 1.0.2 — Correctif de déploiement Cloudflare

- Remplace les URL privées du registre npm présentes par erreur dans `package-lock.json` par le registre public officiel.
- Ajoute une configuration `.npmrc` explicite vers `https://registry.npmjs.org/`.
- Fige les versions des dépendances pour rendre les builds reproductibles.
- Fige Node.js 22.16.0 via `.node-version`.

## 1.0.1 — Correctif sécurité avant déploiement

- Empêche un administrateur client de modifier directement son forfait, son statut ou son type de métier.
- Ajoute une fonction sécurisée dédiée à la modification du nom et de la couleur de l’entreprise.
- Garantit qu’un rendez-vous ne peut référencer qu’un client, un service et un collaborateur de la même entreprise.
- Ajoute la validation des couleurs et des identifiants d’entreprise.
- Rend les scripts SQL réexécutables grâce au remplacement propre des politiques.
- Ajoute la mise à jour automatique des champs `updated_at`.

## 1.0.0 — Identité officielle

- Intégration du logo horizontal NCR Suite.
- Intégration de l’icône officielle.
- Favicons et icônes PWA.
- Métadonnées de partage.
- Palette officielle NCR Suite.
