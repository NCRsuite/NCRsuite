# NCR UI 2026 — sécurité et retour arrière

## Point de restauration intégral

Branche de sauvegarde créée avant toute modification visuelle :

`backup/pre-ncr-ui-2026-2026-08-27`

Commit d'origine :

`7d6d6341d812d70441b547c9f88317c5f30fde61`

## Point de restauration Dashboard Motion — avant partie 2

La version du tableau de bord avec la couche Motion CSS premium validée, mais sans count-up / reveal JS / profondeur interactive de la partie 2, correspond au commit :

`2af6cc397c4322b797e03915ff8b06368b33ac99`

Restaurer les fichiers de la partie 2 depuis ce commit permet de revenir uniquement à cette version du dashboard sans annuler le reste de NCR UI 2026.

## Point de restauration Dashboard Interactive — avant partie 3

La version validée avec Motion + Partie 2 interactive, mais sans Smart Cockpit, correspond au commit :

`149dc204b68eb1e21227e07c36771aa722c77979`

Le moyen recommandé pour désactiver uniquement la Partie 3 est de passer `NCR_DASHBOARD_SMART_2026_FEATURE_ENABLED` à `false` dans `src/config/dashboardSmart2026.ts`. Le composant Smart disparaît alors immédiatement sans toucher aux Parties 1 et 2. Pour une restauration Git stricte, utiliser le commit ci-dessus comme référence pour les fichiers du dashboard.

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

Le rendu historique reprend alors la main. Le Smart Cockpit est également désactivé automatiquement car son flag dépend de `NCR_UI_2026_ENABLED`.

## Fichiers de la couche 2026

- `src/config/ui2026.ts`
- `src/config/dashboardSmart2026.ts`
- `src/ncrUi2026.css`
- `src/ncrUi2026Pages.css`
- `src/ncrUi2026TrainingDashboard.css`
- `src/ncrUi2026TrainingDashboardMotion.css`
- `src/ncrUi2026TrainingDashboardInteractive.css`
- `src/ncrUi2026TrainingDashboardSmart.css`
- `src/ncrUi2026TrainingDashboardSmartPolish.css`
- `src/hooks/useTrainingDashboardMotion.ts`
- `src/components/TrainingDashboardSmartCockpit.tsx`
- `src/ncrUi2026TrainingOperations.css`
- `src/ncrUi2026TrainingSpacing.css`
- `src/ncrUi2026TrainingWorkflowStepper.css`
- `src/ncrUi2026TrainingSessions.css`
- `src/ncrUi2026TrainingSessionsSummary.css`
- `src/ncrUi2026TrainingMobileFixes.css`
- `src/ncrUi2026TrainingMobilePolish.css`
- `src/ncrUi2026TrainingPersonalWork.css`
- `src/ncrUi2026TrainingCommercialBilling.css`
- `src/ncrUi2026TrainingPeopleQuality.css`
- `src/ncrUi2026TrainingGovernance.css`
- `src/ncrUi2026TrainingGovernancePolish.css`
- `src/main.tsx` uniquement pour charger les couches et poser le flag HTML

Le cockpit Formation V2 est contenu dans `src/ncrUi2026TrainingDashboard.css`. Il ne modifie ni `TrainingDashboardPage.tsx`, ni ses calculs, ni ses requêtes, ni ses actions.

La couche d'animation premium du tableau de bord est isolée dans `src/ncrUi2026TrainingDashboardMotion.css`. Elle ajoute uniquement des reveals séquencés, micro-interactions, animation du graphique, mouvement ambiant discret du hero et gestion `prefers-reduced-motion`. Elle ne modifie ni `TrainingDashboardPage.tsx`, ni les KPI, ni les calculs, ni les requêtes, ni les exports ou actions métier.

La partie 2 interactive du tableau de bord repose sur `src/hooks/useTrainingDashboardMotion.ts`, `src/ncrUi2026TrainingDashboardInteractive.css` et des modifications d'affichage limitées à `TrainingDashboardPage.tsx`. Elle ajoute le count-up réel des KPI, le reveal au scroll, les transitions lors d'un changement de période, un signal visuel ponctuel pour les sessions prêtes à clôturer et une profondeur légère au pointeur sur desktop. Les requêtes Supabase, `buildTrainingQualityDashboard`, les données, les exports PDF/CSV et les actions restent inchangés. Pour annuler uniquement cette partie, utiliser `2af6cc397c4322b797e03915ff8b06368b33ac99` comme point de référence.

La partie 3 Smart Cockpit est isolée par `src/config/dashboardSmart2026.ts`, `src/components/TrainingDashboardSmartCockpit.tsx` et `src/ncrUi2026TrainingDashboardSmart.css`, avec un branchement minimal dans `TrainingDashboardPage.tsx`. Elle classe uniquement les informations déjà calculées par le dashboard selon l'ordre Bloquant → Prêt à clôturer → Vigilance → Information, affiche la prochaine activité et des raccourcis adaptés aux droits, et enrichit le graphique avec des tooltips visuels. Elle n'ajoute aucune requête Supabase, ne modifie pas `buildTrainingQualityDashboard`, n'écrit aucune donnée et ne change aucun export ou action métier. Pour la désactiver seule, passer `NCR_DASHBOARD_SMART_2026_FEATURE_ENABLED` à `false`; pour retrouver strictement l'état pré-Partie 3, utiliser `149dc204b68eb1e21227e07c36771aa722c77979` comme référence.

La finition d'espacement des en-têtes du Smart Cockpit est isolée dans `src/ncrUi2026TrainingDashboardSmartPolish.css`. Elle sépare clairement les labels `SMART COCKPIT`, `À FAIRE ENSUITE`, `PROCHAINE ACTIVITÉ` et `RACCOURCIS` de leurs textes contextuels, améliore l'alignement et autorise les retours à la ligne propres sur les cartes étroites. Elle ne modifie aucun JSX, aucune donnée, aucune priorisation ni aucune action.

Les refontes V2 des pages `Formations` et `Parcours Formation` sont contenues dans `src/ncrUi2026TrainingOperations.css`. Elles ne modifient ni `TrainingProgramsPage.tsx`, ni `TrainingWorkflowPage.tsx`, ni leurs données, requêtes ou actions.

La passe d'espacement premium de `Formations` et `Parcours Formation` est isolée dans `src/ncrUi2026TrainingSpacing.css`. Elle ne touche ni au JSX, ni aux données, ni aux actions et peut être retirée indépendamment des autres couches UI 2026.

Le stepper premium 01→06 de `Parcours Formation` est isolé dans `src/ncrUi2026TrainingWorkflowStepper.css`. Il ne modifie pas `TrainingWorkflowPage.tsx` et peut être retiré indépendamment du reste de la refonte.

La refonte premium de `Sessions` est isolée dans `src/ncrUi2026TrainingSessions.css`. Elle couvre le hero, la création de session, le calendrier, l'agenda, la vue liste et les modales test/clôture sans modifier `TrainingSessionsPage.tsx`, ses données, ses requêtes ou ses actions.

La carte de synthèse `Planning pédagogique / sessions` est raffinée séparément dans `src/ncrUi2026TrainingSessionsSummary.css`. Elle ne modifie pas le calendrier, la logique ni `TrainingSessionsPage.tsx`.

La passe mobile Formation est isolée dans `src/ncrUi2026TrainingMobileFixes.css`. Elle compacte les hero et KPI de `Formations`, transforme le stepper mobile `Parcours Formation` en grille 2 × 3 et ajoute l'espace de sécurité sous les contenus pour la navigation basse. Elle ne modifie aucun JSX, aucune donnée, aucune requête ni aucune action métier.

La finition mobile corrective est isolée dans `src/ncrUi2026TrainingMobilePolish.css`. Elle remet les boutons `Profil organisme` et création de formation entièrement à l'intérieur des hero, supprime la séparation qui les coupait visuellement et restaure une navigation basse Formation flottante, plus légère et arrondie sur les quatre coins. Elle ne modifie aucun JSX ni aucune logique métier.

La refonte V2 du parcours personnel `Mon activité` → `Mon planning` → `Facturation mensuelle` est isolée dans `src/ncrUi2026TrainingPersonalWork.css`. Elle modernise le raccourci de facturation, les hero, KPI, formulaire et liste d'interventions, l'organisateur mensuel, le planning consolidé et les cartes de facturation par centre. Elle ne modifie ni `TrainingPersonalActivityPage.tsx`, ni `TrainingPersonalActivityOrganizer.tsx`, ni `TrainingPersonalPlanningPage.tsx`, ni `TrainingPersonalMonthlyBillingPage.tsx`, ni leurs requêtes, calculs, RPC, données ou actions. Les CSS historiques propres à ces composants restent inchangés.

La refonte V2 du parcours `CRM & commercial` → `Facturation Formation` → `Documents / Attestations` est isolée dans `src/ncrUi2026TrainingCommercialBilling.css`. Elle modernise le pipeline CRM, les opportunités et relances, les dossiers commerciaux, clients et financeurs, les KPI financiers, factures et encaissements ainsi que la bibliothèque documentaire et ses regroupements par session/catégorie. Elle ne modifie ni `TrainingCommercialPage.tsx`, ni `TrainingCrmPipeline.tsx`, ni `TrainingBillingPage.tsx`, ni `TrainingDocumentsPage.tsx`, ni leurs données, requêtes, calculs, génération PDF, stockage, envois ou actions métier.

La refonte V2 du parcours `Stagiaires` → `Formateurs` → `Émargements` → `Évaluations` est isolée dans `src/ncrUi2026TrainingPeopleQuality.css`. Elle modernise les répertoires et formulaires, le statut BPF des formateurs, le cockpit d'émargement, les signatures, les KPI de présence, le parcours d'automatisation des évaluations et le suivi individuel des réponses. Elle ne modifie ni `TrainingTraineesPage.tsx`, ni `TrainingTrainersPage.tsx`, ni `TrainingAttendancePage.tsx`, ni `TrainingEvaluationsPage.tsx`, ni leurs données, requêtes, signatures, PDF, réglages, envois ou actions métier.

La refonte V2 du bloc `Dossiers Formation` → `Qualité & conformité` → `BPF` → `Profil organisme / Établissements` → `Espaces & signatures` est isolée dans `src/ncrUi2026TrainingGovernance.css`. Elle modernise le cockpit administratif des dossiers, les contrôles et preuves Qualiopi, le BPF guidé et expert, le profil organisme et ses documents, la liste des établissements ainsi que la console d'accès, de partage documentaire et de signature. Elle ne modifie ni `TrainingDossiersPage.tsx`, ni `TrainingQualityCompliancePage.tsx`, ni `TrainingBpfPage.tsx`, ni `TrainingBpfAssistant.tsx`, ni `TrainingOrganizationProfilePage.tsx`, ni `TrainingSitesPage.tsx`, ni `TrainingPortalAdminPage.tsx`, ni leurs calculs, données, requêtes, PDF, preuves, invitations, signatures ou actions métier.

La finition corrective `Dossiers Formation / Qualité & conformité` est isolée dans `src/ncrUi2026TrainingGovernancePolish.css`. Elle neutralise les anciens motifs décoratifs hérités du hero Dossiers, repositionne l'accent du hero Qualité & conformité et rétablit le contraste complet de la carte `Synthèse du dossier`. Elle ne modifie aucun JSX, aucune donnée, aucune requête, aucun PDF ni aucune action métier.

Le fichier historique `src/styles.css` n'est pas modifié par cette refonte.

## Retour intégral

Si un retour complet est demandé, utiliser la branche de sauvegarde ou restaurer les fichiers concernés à partir du commit `7d6d6341d812d70441b547c9f88317c5f30fde61`.
