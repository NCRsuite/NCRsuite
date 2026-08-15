# NCR Suite V2.29.11 — Vacations Sécurité blindées

À déployer après la V2.29.10.

## 1. Migration Supabase

Exécuter uniquement :

`supabase/migrations/126_security_vacation_hardening.sql`

## 2. Ce que la V2.29.11 verrouille

- une seule vacation réellement active (`in_progress`, prise de poste enregistrée, pas de fin) par agent ;
- verrou serveur transactionnel pour éviter deux prises de poste simultanées depuis deux appareils ;
- une ronde créée directement doit malgré tout référencer une vacation réellement prise et ouverte ;
- une MCI reste impossible avant la prise de poste ;
- une ancienne vacation oubliée depuis plus de 8 h ne peut plus recevoir de nouvelles MCI côté agent ;
- une vacation oubliée hors du mois courant est quand même rechargée sur l’accueil Agent ;
- l’ancienne vacation est affichée en priorité avec `Terminer la vacation oubliée` ;
- une nouvelle prise de poste est bloquée tant qu’une autre vacation est encore active ;
- le QG conserve ses fonctions existantes de régularisation et de clôture.

## 3. Test conseillé

1. Planifier une vacation A et une vacation B pour le même agent.
2. Prendre le poste sur A.
3. Tenter de prendre le poste sur B : NCR doit refuser.
4. Ajouter une MCI sur A : elle doit fonctionner pendant la vacation.
5. Terminer A.
6. Prendre B : cela doit fonctionner.
7. Pour tester la récupération, laisser une vacation active au-delà de la fenêtre de récupération ou modifier temporairement sa date de fin sur un environnement de test : l’accueil Agent doit afficher `Terminer la vacation oubliée`.

## 4. Cache PWA

La release utilise :

`ncr-suite-shell-v2.29.11-security-vacation-hardening`

avec les assets `v2911`.
