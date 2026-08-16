# NCR Suite V2.29.19 — Assistant BPF guidé

## Objectif
Le BPF s'ouvre désormais par défaut en **Mode guidé**, conçu pour un formateur ou un nouvel organisme qui n'a jamais rempli de BPF.

NCR reprend les données existantes et ne pose que les questions manquantes :
1. vérification de l'organisme déclarant ;
2. qualification des sessions : formation professionnelle, apprentissage, formation initiale ou hors champ ;
3. classement des stagiaires, avec classement d'une session entière en un clic ;
4. classement des recettes à partir des factures / documents commerciaux ;
5. contrôle de cohérence NCR ;
6. synthèse « Prêt à déclarer » + PDF/CSV préparatoires.

Le **Mode expert** reste disponible et conserve tous les cadres, sources et réglages détaillés.

## Installation depuis V2.29.18
Exécuter uniquement :
`supabase/migrations/133_training_bpf_guided_assistant_release.sql`

Puis déployer la V2.29.19.

## Important
NCR prépare et contrôle le BPF mais ne prétend pas le télétransmettre automatiquement. La déclaration officielle reste effectuée sur Mon Activité Formation.
