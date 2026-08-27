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
