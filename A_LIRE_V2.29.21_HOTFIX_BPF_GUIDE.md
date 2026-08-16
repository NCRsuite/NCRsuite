# NCR Suite V2.29.21 — Hotfix Assistant BPF guidé

## Bug corrigé
Le BPF travaille sur des sessions clôturées, mais les garde-fous d'intégrité interdisaient leurs modifications directes. La qualification réglementaire et le classement BPF des stagiaires échouaient donc en mode guidé (et pouvaient aussi échouer en mode expert).

## Correction
- RPC dédiée pour la nature réglementaire BPF d'une session clôturée.
- RPC dédiée pour le mode de réalisation BPF.
- RPC dédiée pour la catégorie BPF d'un stagiaire.
- RPC dédiée pour classer toute une session de stagiaires en une fois.
- Aucune réouverture de session.
- Aucune modification des émargements, dates, statuts ou données pédagogiques.
- Un BPF déjà verrouillé reste immuable.

## Installation
Après la V2.29.20 :
1. Exécuter `135_training_bpf_guided_completed_session_fix.sql`.
2. Déployer le patch V2.29.21.
3. Fermer/réouvrir la PWA si nécessaire.
