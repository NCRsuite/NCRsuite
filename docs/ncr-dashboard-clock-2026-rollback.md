# NCR Dashboard Clock 2026 — retour arrière

Le widget horloge/date du hero Formation est volontairement isolé.

## Désactivation immédiate

Dans `src/config/dashboardClock2026.ts`, passer :

```ts
const NCR_DASHBOARD_CLOCK_2026_FEATURE_ENABLED = true;
```

à :

```ts
const NCR_DASHBOARD_CLOCK_2026_FEATURE_ENABLED = false;
```

Cela retire uniquement l'horloge/date du hero. Le Smart Cockpit, les animations Motion et la Partie 2 interactive restent actifs.

## Fichiers concernés

- `src/config/dashboardClock2026.ts`
- `src/components/TrainingDashboardClock.tsx`
- `src/ncrUi2026TrainingDashboardClock.css`
- `src/components/TrainingDashboardSmartCockpit.tsx` uniquement pour le portail visuel vers le hero
- `src/main.tsx` uniquement pour charger la couche CSS

Le widget réutilise la liste `sessions` déjà chargée par le dashboard. Il n'ajoute aucune requête Supabase et n'écrit aucune donnée.

L'heure et la date utilisent l'heure locale du navigateur et sont mises à jour à la minute. La ligne de session n'est rendue que lorsqu'au moins une session non annulée chevauche la journée courante. Si aucune session n'est planifiée ce jour-là, aucune ligne `0 session` n'est affichée.

Le widget est masqué automatiquement lorsque la largeur disponible n'est pas suffisante, notamment sur tablette/mobile.

## Point de restauration Git

L'état validé juste avant l'ajout de l'horloge correspond au commit :

`3472d0862a6549fb78925af055f6ea91363c4af6`
