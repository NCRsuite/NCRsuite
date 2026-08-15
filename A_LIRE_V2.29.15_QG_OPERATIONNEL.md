# NCR Suite V2.29.15 — QG opérationnel

## Installation

1. Depuis Supabase SQL Editor, exécuter uniquement :

   `supabase/migrations/129_security_qg_operational_notifications.sql`

2. Déployer ensuite la V2.29.15 complète, ou appliquer le patch-only sur la V2.29.14.

3. Fermer/réouvrir la PWA si elle est installée. La release attendue doit être V2.29.15.

## Ce que la migration ajoute

- push QG immédiat à la prise de poste ;
- push QG immédiat à la fin de poste ;
- alerte de retard programmée 15 minutes après le début prévu ;
- alerte de fin oubliée programmée 15 minutes après la fin prévue ;
- annulation/déduplication automatique si l'agent régularise son pointage ;
- push critique uniquement pour les MCI marquées `urgent` ;
- SOS/PTI conservés sur le moteur critique existant ;
- publication Realtime des tables nécessaires au cockpit QG ;
- alignement base/front/cache sur V2.29.15.

## Dashboard QG

Le centre opérationnel affiche désormais :

- agents actuellement en poste ;
- agents attendus mais non pointés, dont le nombre réellement en retard ;
- fins de poste oubliées ;
- MCI urgentes, alertes critiques et SOS/PTI ouverts ;
- dernières notes de relève ;
- liens directs vers la vacation, la main courante, les consignes ou la supervision.

Le dashboard écoute Supabase Realtime et garde un rafraîchissement de secours toutes les 30 secondes.

## Notifications push

Le QG doit avoir activé les notifications sur son appareil dans NCR Suite. La V2.29.15 réutilise `notification_events`, `push_delivery_queue` et le worker push déjà existants : aucune seconde configuration VAPID n'est créée.
