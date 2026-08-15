# NCR Suite V2.29.14 — Correctif photo prise de poste + version

## Correctifs
- La photo d'arrivée et de sortie est désormais toujours proposée à l'agent.
- Si le site active l'exigence photo, elle devient obligatoire ; sinon elle reste facultative.
- L'état de release Supabase est aligné sur V2.29.14 afin d'arrêter la demande permanente de V2.29.12.
- Nouveau cache PWA V2.29.14 et nouveaux noms d'assets.

## Migration à exécuter
`supabase/migrations/128_security_presence_photo_release_alignment.sql`

La migration 127 doit déjà avoir été exécutée.
