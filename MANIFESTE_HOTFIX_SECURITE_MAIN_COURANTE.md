# NCR Suite V2.29.6 — Hotfix Sécurité Main courante agent

## Objectif

Fiabiliser le parcours terrain Agent autour de la main courante et supprimer les étapes inutiles pour ajouter un événement pendant une vacation.

## Correctifs appliqués

- Ajout d’un bouton principal `Ajouter à la main courante` directement sur l’accueil Agent lorsqu’une vacation est réellement en poste.
- Le bouton ouvre directement le formulaire de saisie sur la vacation active via `?shift=...&add=1`.
- Défilement automatique jusqu’au formulaire d’ajout pour éviter une nouvelle recherche dans la page.
- La vacation réellement en poste est prioritaire lors de l’ouverture de la main courante.
- Un agent ne peut plus ajouter un événement avant d’avoir pris son poste ou après l’avoir terminé.
- Les messages affichés expliquent clairement s’il faut prendre le poste, si la vacation est terminée ou si la main courante est clôturée.
- L’écriture live ne passe plus par un `INSERT` navigateur direct : elle utilise la RPC sécurisée `create_security_logbook_entry`.
- La RPC vérifie l’utilisateur, l’affectation de la vacation, la prise de poste, la clôture de la main courante et du dossier avant l’insertion.
- La policy RLS d’insertion directe est renforcée pour n’autoriser l’agent que pendant une vacation réellement en poste.
- Une ronde QR ne peut plus être démarrée tant que l’agent n’a pas réellement pris son poste sur le site.
- Le mode démo/local enregistre maintenant réellement la prise de poste, la fin de poste et les événements automatiques correspondants.
- `Terminer mon poste` devient une action secondaire lorsqu’un agent est en poste afin que l’action principale soit la saisie terrain.

## Fichiers modifiés

- `src/pages/SecurityDashboardPage.tsx`
- `src/pages/SecurityLogbookPage.tsx`
- `src/styles.css`
- `public/ncr-suite-app-v296.css`
- `supabase/migrations/121_security_agent_logbook_fast_entry.sql`

## Validation

- Syntaxe TypeScript/TSX des fichiers modifiés : validée.
- Audit statique NCR Suite : validé.
- Parcours critiques NCR Suite : validés.
- Préparation release NCR Suite : validée.
- Build complet non exécuté dans l’environnement d’audit car les dépendances npm du ZIP ne sont pas présentes localement. Le contrôle s’est arrêté sur les modules React/Vite manquants, avant toute erreur liée au patch.

## Important

La migration `121_security_agent_logbook_fast_entry.sql` doit être appliquée sur Supabase avant de tester l’ajout d’événement live avec un compte Agent.
