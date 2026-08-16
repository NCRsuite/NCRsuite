# NCR Suite V2.29.23 — Documents de clôture premium

## Installation depuis V2.29.22

1. Exécuter `supabase/migrations/137_training_attendance_attestation_certificate_premium.sql`.
2. Copier le patch V2.29.23 dans le dépôt.
3. Redéployer l’application.
4. Redéployer l’Edge Function `process-email-queue` pour activer le nouveau design des attestations automatiques.
5. Fermer puis rouvrir la PWA afin de charger le cache V2.29.23.

## Émargement

- En-tête premium sombre avec identité de l’organisme.
- Date du jour mise en avant.
- Session, formateur, lieu et nombre de participants visibles immédiatement.
- Tableau plus lisible et alternance des lignes.
- Statuts de présence plus visibles.
- Version vierge conservée pour signature papier.
- Retours à la ligne sécurisés comme en V2.29.22.

## Attestation de fin

- Attestation nominative plus institutionnelle.
- Bénéficiaire fortement mis en avant.
- Formation, période, durée, modalité, lieu et formateur structurés.
- Synthèse de présence.
- Signature et cachet de l’organisme.
- Génération automatique et envoi existants conservés.

## Certificat de réalisation

- Nouveau PDF disponible depuis le dossier d’une session terminée.
- Une page par stagiaire actif.
- Action de formation, période, durée réalisée, modalité, lieu et formateur.
- Signature/cachet de l’organisme.
- La durée utilise en priorité `bpf_attended_hours`; à défaut elle s’appuie sur les présences enregistrées, puis sur la durée de l’action si aucun émargement n’est disponible.

## Vérifications réalisées

- Audit statique NCR Suite : OK.
- Parcours critiques : OK.
- Release readiness : OK.
- Contrôle TypeScript ciblé : aucune erreur de syntaxe détectée ; les erreurs restantes concernent uniquement les dépendances React/pdf-lib absentes de l’environnement de test.
