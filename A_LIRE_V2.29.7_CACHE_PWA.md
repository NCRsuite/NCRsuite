# NCR Suite V2.29.7 — UX Agent + renouvellement PWA

Cette version corrige le problème où la nouvelle interface Agent pouvait ne pas apparaître après déploiement parce que la V2.29.6 réutilisait les mêmes noms d'assets et le même cache PWA.

## Déploiement
1. Appliquer `121_security_agent_logbook_fast_entry.sql` si ce n'est pas déjà fait.
2. Appliquer `122_security_agent_logbook_ux_release.sql`.
3. Déployer tout le dépôt V2.29.7.
4. Ouvrir l'application une fois dans le navigateur. Si une ancienne PWA installée reste ouverte, la fermer puis la relancer.

## Vérification
- La version attendue est `2.29.7`.
- Le bundle principal est `ncr-suite-app-v297.js`.
- Le cache est `ncr-suite-shell-v2.29.7-security-agent-logbook-ux`.
- En espace Agent, une fois en poste, la saisie rapide Main courante est directement en haut de l'accueil.
