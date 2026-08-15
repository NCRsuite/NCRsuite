# NCR Suite V2.29.12 — Prise / fin de poste Premium

## Déploiement

1. Exécuter dans Supabase : `supabase/migrations/127_security_premium_shift_presence.sql`.
2. Déployer ensuite le front V2.29.12.
3. Fermer/réouvrir la PWA afin de charger le cache `ncr-suite-shell-v2.29.12-security-premium-presence`.

## Nouveautés

- Exigences configurables **par site** : GPS arrivée, photo arrivée, GPS sortie, photo sortie, signature de fin, note de relève obligatoire.
- Nouvelle feuille mobile de prise / fin de poste.
- Le GPS est tenté automatiquement lorsque la géolocalisation est activée. S’il est obligatoire sur le site, la prise/fin est bloquée en cas d’échec.
- Photos et signature stockées dans le bucket privé `security-shift-proofs`.
- La relève précédente du même site est affichée à l’agent entrant.
- La note de relève laissée à la sortie est conservée sur la vacation.
- Le bouton de fin devient prioritaire 30 minutes avant l’heure prévue et passe en alerte après l’heure de fin.
- Les preuves sont visibles dans le dossier de vacation côté QG.
- Les obligations sont aussi vérifiées côté PostgreSQL via `set_security_shift_presence_event_premium`.

## Test conseillé

1. Dans **Sites clients**, ouvrir « Preuves prise / fin de poste » et activer par exemple Photo arrivée + GPS sortie + Signature fin + Relève obligatoire.
2. Avec le compte Agent, ouvrir la vacation et appuyer sur **Prendre mon poste**.
3. Vérifier la relève précédente, prendre la photo et valider.
4. À l’approche de la fin, utiliser le CTA de clôture, écrire la relève, signer puis terminer.
5. Côté QG, ouvrir **Dossiers de vacation** et vérifier les badges / liens de preuve et la note de relève.

## Important

Les sites existants restent non bloquants après migration : toutes les nouvelles obligations sont désactivées par défaut. Elles doivent être activées uniquement sur les sites qui en ont besoin.
