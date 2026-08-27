# NCR UI 2026 — sécurité et retour arrière

## Point de restauration intégral

Branche de sauvegarde créée avant toute modification visuelle :

`backup/pre-ncr-ui-2026-2026-08-27`

Commit d'origine :

`7d6d6341d812d70441b547c9f88317c5f30fde61`

## Désactivation immédiate sans rollback Git

Fichier : `src/config/ui2026.ts`

Passer :

```ts
export const NCR_UI_2026_ENABLED = true;
```

à :

```ts
export const NCR_UI_2026_ENABLED = false;
```

Le CSS NCR UI 2026 reste chargé mais tous ses sélecteurs sont inactifs car ils exigent :

`html[data-ncr-ui-2026="true"]`

Le rendu historique reprend alors la main.

## Fichiers de la couche 2026

- `src/config/ui2026.ts`
- `src/ncrUi2026.css`
- `src/ncrUi2026Pages.css`
- `src/ncrUi2026TrainingDashboard.css`
- `src/ncrUi2026TrainingOperations.css`
- `src/ncrUi2026TrainingSpacing.css`
- `src/main.tsx` uniquement pour charger les couches et poser le flag HTML

Le cockpit Formation V2 est contenu dans `src/ncrUi2026TrainingDashboard.css`. Il ne modifie ni `TrainingDashboardPage.tsx`, ni ses calculs, ni ses requêtes, ni ses actions.

Les refontes V2 des pages `Formations` et `Parcours Formation` sont contenues dans `src/ncrUi2026TrainingOperations.css`. Elles ne modifient ni `TrainingProgramsPage.tsx`, ni `TrainingWorkflowPage.tsx`, ni leurs données, requêtes ou actions.

La passe d'espacement premium de `Formations` et `Parcours Formation` est isolée dans `src/ncrUi2026TrainingSpacing.css`. Elle ne touche ni au JSX, ni aux données, ni aux actions et peut être retirée indépendamment des autres couches UI 2026.

Le fichier historique `src/styles.css` n'est pas modifié par cette refonte.

## Retour intégral

Si un retour complet est demandé, utiliser la branche de sauvegarde ou restaurer les fichiers concernés à partir du commit `7d6d6341d812d70441b547c9f88317c5f30fde61`.
