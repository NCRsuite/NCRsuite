# Synchronisation déploiement — 26 août 2026

Ce marqueur de déploiement force la reconstruction de la branche `main` après la refonte Card-based des PDF Formation.

Le HEAD attendu contient notamment les compatibilités de build suivantes dans `src/features/training/commercialPdf.ts` :

- `Devis de formation`
- `SYNTHÈSE DE L’OFFRE`
- `Bon pour accord`
- `NCR Suite V2.29.20`

Aucune logique métier, donnée Supabase ou configuration de production n’est modifiée par ce fichier.
