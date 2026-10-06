# Phase 6B — propositions Supabase Beauty / Sécurité

Date : 6 octobre 2026. Base locale : `e385ce25de020e72651edf7b3c643f31df0ff6f3`, branche `refactor/premium-app-experience`.

**Archive de la proposition initiale 6B, rédigée avant application.** Les SQL ci-dessous ne sont pas les migrations finales Beauty : ils ont été remplacés par les migrations 6B.1 séparées, appliquées le 6 octobre 2026 puis reproduites dans `supabase/migrations/20261006172644_beauty_appointment_company_prevention_6b1.sql` (B) et `supabase/migrations/20261006173457_beauty_appointment_company_repair_6b1.sql` (A). Voir `07_PROGRESS.md` pour les résultats. Ne pas exécuter cette proposition historique en complément des migrations finales.

**Sécurité reste non appliquée et bloquée** en attente de validation des sept rattachements site → marque, de définition de l'attribution des futurs sites et de revue des RPC `SECURITY DEFINER`. Son diagnostic et son SQL de préparation sont conservés ci-dessous pour une intervention future, sans autorisation d'exécution.

## 1. État vérifié et décision recommandée

Lectures ciblées du projet NCRsuite (`cdndjjeomeqbrxgshfiz`) : catalogues PostgreSQL, historique de migrations, définitions des fonctions/triggers, agrégats et identifiants strictement nécessaires. Aucun appel RPC métier, même présenté via `SELECT`, n'a été effectué : certaines RPC écrivent des données. Aucun accès au contenu de `.env.local`.

| Anomalie | Résultat actuel | Décision |
|---|---|---|
| Beauty Terminer | 7 incohérences sur 14 rendez-vous Beauty ; aucune des 7 n'est terminée ni liée à une écriture/état de fidélité | Réconcilier ces 7 lignes après vérification des préconditions, prévenir l'incohérence dans la base, conserver les gardes de fidélité |
| Création mission Sécurité | Mauvais référentiel dans la policy restrictive ; 7 sites clients, 0 mission dans l'organisation test | Ajouter un rattachement explicite site client → enseigne, puis remplacer uniquement le prédicat erroné de `security_shifts` ; aucun rattachement inventé |

**Deux validations métier sont nécessaires avant application** : confirmer le rattachement Beauty proposé (notamment le rendez-vous aux ressources non rattachées) ; fournir le rattachement des sites Sécurité aux enseignes. Une troisième barrière technique concerne les RPC Sécurité `SECURITY DEFINER` : le SQL RLS présenté ne suffit pas à certifier tous ces parcours (voir §3.7). Aucun déploiement de la proposition Sécurité avant levée de cette barrière.

Les effectifs sont ceux de la lecture du 6 octobre ; ils doivent être recalculés avant migration. Le compte de diagnostic peut lire plusieurs organisations : les correctifs de données ne doivent pas devenir des mises à jour globales implicites.

## 2. Beauty — données historiques et prévention

### 2.1 Cause exacte / impact

Le frontend `src/pages/AppointmentsPage.tsx`, `saveAppointment`, appelle :

- `save_appointment` pour les offres autres que Métier : aucun paramètre ni colonne `company_id` dans l'INSERT ; l'UPDATE ne renseigne pas non plus cette colonne ;
- `save_appointment_v2` pour Métier : `company_id` est résolu depuis l'établissement sélectionné ; client, prestation et collaborateur sont contrôlés contre ce contexte.

Les fonctions distantes `metier_fill_appointment_company` et `metier_validate_beauty_appointment_client_company` quittent leur traitement si l'offre n'est pas `metier`. À l'inverse, `beauty_enforce_client_company_scope` exige une enseigne pour les nouveaux clients Beauty dès qu'une enseigne active existe, y compris Professionnelle. Il y a donc un désalignement entre attribution du client et attribution du rendez-vous.

Lors de `set_appointment_status(..., 'completed', null)`, le trigger `process_coiffure_appointment_loyalty` choisit la branche historique si `appointments.company_id` est nul. Cette branche crée l'état/ledger sans enseigne. `beauty_enforce_loyalty_company_scope` compare à l'enseigne du client et refuse : **« La fidélité doit rester dans l’enseigne du client. »** La transaction du statut est annulée. Les droits du RPC ne sont pas la cause de ce refus.

**Le risque existe encore aujourd'hui** : code et définitions distantes permettent ce nouvel INSERT en Professionnelle. Le dernier rendez-vous incohérent est du 6 octobre, après les anciennes migrations. Aucun nouveau rendez-vous n'a été créé pour ce diagnostic en lecture seule.

### 2.2 Données réellement concernées

Organisation AZZERA CUT, `e2b94483-f38e-491e-bbc9-05dd481847ec`, offre Professionnelle : 14 rendez-vous, 7 incohérences, 0 client introuvable. Les 7 sont du type rendez-vous sans enseigne / client avec enseigne ; aucune divergence entre deux enseignes non nulles trouvée dans la requête globale.

Cible issue du client : `d4f347b2-40df-4906-966f-c551fcda02f0`, enseigne active de cette organisation. Paramétrage de fidélité par enseigne déjà présent : programme actif, visites activées, points désactivés. Ne pas recopier le paramétrage historique de l'organisation sur celui de l'enseigne.

| Rendez-vous | Statut | Date de création UTC | Ressources |
|---|---|---|---|
| `5c180e42-ae64-4406-a947-c7e14ecea514` | confirmed | 05/10 18:25:17 | collaborateur et prestation dans l'enseigne cible |
| `88e3b3af-537e-4948-a465-87f94256a6d2` | confirmed | 05/10 18:28:11 | idem |
| `9d3a704e-da6d-4de6-a2aa-90f9f49ee165` | confirmed | 05/10 18:29:14 | idem |
| `d92561bf-f5d9-4430-9158-a45376f64c6b` | pending | 05/10 18:29:27 | idem |
| `7f2adeda-c54a-41f2-943d-081779a83a7d` | pending | 05/10 18:29:34 | idem |
| `1a0dbd23-709f-4989-a16e-4b93ff99f9b1` | cancelled | 05/10 20:48:40 | idem |
| `4c1b2443-caf2-45cf-9df8-5f28dd89a596` | confirmed | 06/10 10:22:40 | collaborateur et prestation sans enseigne ; usage partagé à confirmer |

4 confirmed, 2 pending, 1 cancelled. Aucun état `coiffure_appointment_loyalty_state` ni ligne `coiffure_loyalty_ledger` pour ces 7 identifiants. L'enseigne de l'établissement est nulle dans les jointures lues. Les ressources sans enseigne sont actuellement permises par le parcours v2 ; la proposition n'en fait pas des ressources d'une autre enseigne et ne modifie pas leurs fiches.

### 2.3 Correction recommandée

Combiner :

1. **Données existantes** : mise à jour explicite et bornée des 7 `company_id`, sans changer client, date, statut, montant, collaborateur ou prestation. Arrêt si la situation a changé, si une fidélité existe ou si une ressource appartient à une autre enseigne.
2. **Nouveaux rendez-vous** : un garde BEFORE commun à toutes les offres Beauty hérite de l'enseigne du client seulement quand celle du rendez-vous est absente. Une enseigne explicitement contradictoire est refusée. Les ressources non nulles doivent être compatibles. Le frontend conserve ses RPC : la cohérence ne repose pas sur un UUID envoyé par le navigateur.
3. **Modification du client** : interdire un déplacement de sa portée qui rendrait ses rendez-vous incohérents. Un transfert d'historique entre enseignes demande un parcours dédié, pas une modification ordinaire de fiche.
4. **Fidélité** : conserver intégralement ses gardes et ses calculs. Le contrôle amont est exécuté aussi avant un changement de statut. Aucune exception permettant à `Terminer` de contourner l'enseigne.

Une paire client/rendez-vous historique tous deux sans enseigne reste acceptée en offre non Métier pour compatibilité. Elle n'autorise jamais une ressource explicitement rattachée à une enseigne différente. L'offre Métier conserve son exigence d'enseigne et d'établissement. Les incohérences avec crédits existants sont refusées et ne sont pas régularisées automatiquement.

### 2.4 SQL proposé — migration logique `beauty_appointment_company_consistency`

À créer ultérieurement par l'outil de migration, pas dans ce lot. Ordre : fenêtre sans écritures concurrentes, transaction, sauvegarde du manifest, réparation bornée, installation des gardes, contrôles, commit après vérification. SQL ci-dessous **non exécuté**. Le rôle opérateur doit être propriétaire des objets ; ne jamais l'exécuter via le client public.

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- Empêche une nouvelle incohérence pendant réparation + installation.
LOCK TABLE public.appointments, public.clients,
  public.staff, public.services, public.organization_sites,
  public.organization_companies,
  public.coiffure_loyalty_ledger,
  public.coiffure_appointment_loyalty_state
  IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE private.phase6b_beauty_company_backup (
  appointment_id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  old_company_id uuid,
  new_company_id uuid NOT NULL,
  old_updated_at timestamptz,
  old_status text NOT NULL,
  repaired_updated_at timestamptz
);
REVOKE ALL ON private.phase6b_beauty_company_backup
  FROM PUBLIC, anon, authenticated;
ALTER TABLE private.phase6b_beauty_company_backup ENABLE ROW LEVEL SECURITY;

DO $repair$
DECLARE
  ids uuid[] := ARRAY[
    '5c180e42-ae64-4406-a947-c7e14ecea514',
    '88e3b3af-537e-4948-a465-87f94256a6d2',
    '9d3a704e-da6d-4de6-a2aa-90f9f49ee165',
    'd92561bf-f5d9-4430-9158-a45376f64c6b',
    '7f2adeda-c54a-41f2-943d-081779a83a7d',
    '1a0dbd23-709f-4989-a16e-4b93ff99f9b1',
    '4c1b2443-caf2-45cf-9df8-5f28dd89a596'
  ]::uuid[];
  n integer;
BEGIN
  INSERT INTO private.phase6b_beauty_company_backup
    (appointment_id,organization_id,old_company_id,new_company_id,
     old_updated_at,old_status)
  SELECT a.id,a.organization_id,a.company_id,c.company_id,a.updated_at,a.status
  FROM public.appointments a
  JOIN public.clients c
    ON (c.organization_id,c.id)=(a.organization_id,a.client_id)
  JOIN public.organization_companies co
    ON (co.organization_id,co.id)=(c.organization_id,c.company_id)
  JOIN public.staff st
    ON (st.organization_id,st.id)=(a.organization_id,a.staff_id)
  JOIN public.services sv
    ON (sv.organization_id,sv.id)=(a.organization_id,a.service_id)
  WHERE a.id=ANY(ids)
    AND a.organization_id='e2b94483-f38e-491e-bbc9-05dd481847ec'
    AND a.company_id IS NULL
    AND c.company_id='d4f347b2-40df-4906-966f-c551fcda02f0'
    AND co.status='active'
    AND a.status IN ('pending','confirmed','cancelled')
    AND (st.company_id IS NULL OR st.company_id=c.company_id)
    AND (sv.company_id IS NULL OR sv.company_id=c.company_id)
    AND (a.site_id IS NULL OR EXISTS (
      SELECT 1 FROM public.organization_sites s
      WHERE (s.organization_id,s.id)=(a.organization_id,a.site_id)
        AND (s.company_id IS NULL OR s.company_id=c.company_id)
    ))
    AND NOT EXISTS (SELECT 1 FROM public.coiffure_loyalty_ledger l
                    WHERE l.appointment_id=a.id)
    AND NOT EXISTS (SELECT 1 FROM public.coiffure_appointment_loyalty_state l
                    WHERE l.appointment_id=a.id);
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>7 THEN
    RAISE EXCEPTION 'Préconditions Beauty modifiées : % lignes éligibles / 7',n;
  END IF;
  UPDATE public.appointments a
  SET company_id=b.new_company_id
  FROM private.phase6b_beauty_company_backup b
  WHERE a.id=b.appointment_id AND a.organization_id=b.organization_id;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>7 THEN RAISE EXCEPTION 'Réparation Beauty incomplète'; END IF;
  UPDATE private.phase6b_beauty_company_backup b
  SET repaired_updated_at=a.updated_at
  FROM public.appointments a WHERE a.id=b.appointment_id;
  IF EXISTS (
    SELECT 1 FROM private.phase6b_beauty_company_backup b
    JOIN public.appointments a ON a.id=b.appointment_id
    WHERE a.company_id IS DISTINCT FROM b.new_company_id
       OR a.status IS DISTINCT FROM b.old_status
  ) THEN RAISE EXCEPTION 'Postcondition Beauty non satisfaite'; END IF;
END;
$repair$;

CREATE FUNCTION private.phase6b_beauty_appointment_company_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,private AS $guard$
DECLARE
  client_company uuid;
  resource_company uuid;
  business text;
  plan_name text;
BEGIN
  SELECT o.business_type,o.plan INTO business,plan_name
  FROM public.organizations o WHERE o.id=NEW.organization_id;
  IF business IS DISTINCT FROM 'coiffure' THEN RETURN NEW; END IF;

  -- Sérialise avec une éventuelle modification de portée de la fiche client.
  SELECT c.company_id INTO client_company FROM public.clients c
  WHERE (c.organization_id,c.id)=(NEW.organization_id,NEW.client_id)
  FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Client introuvable.' USING ERRCODE='23514'; END IF;

  IF NEW.company_id IS NULL AND client_company IS NOT NULL THEN
    IF TG_OP='UPDATE' THEN
      -- Aucun déplacement automatique d'un historique financier/fidélité.
      IF OLD.status='completed'
         OR EXISTS (SELECT 1 FROM public.coiffure_loyalty_ledger l
                    WHERE l.appointment_id=OLD.id)
         OR EXISTS (SELECT 1 FROM public.coiffure_appointment_loyalty_state l
                    WHERE l.appointment_id=OLD.id) THEN
        RAISE EXCEPTION 'Réconciliation explicite de l’historique requise.'
          USING ERRCODE='23514';
      END IF;
    END IF;
    NEW.company_id:=client_company;
  END IF;
  IF NEW.company_id IS DISTINCT FROM client_company THEN
    RAISE EXCEPTION 'Le rendez-vous doit rester dans l’enseigne du client.'
      USING ERRCODE='23514';
  END IF;
  IF plan_name='metier' AND NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'Une enseigne est requise pour ce rendez-vous Beauty.'
      USING ERRCODE='23514';
  END IF;
  IF NEW.company_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.organization_companies co
    WHERE (co.organization_id,co.id)=(NEW.organization_id,NEW.company_id)
  ) THEN RAISE EXCEPTION 'Enseigne hors organisation.' USING ERRCODE='23514'; END IF;

  -- Une ressource explicitement rattachée ne peut appartenir à une autre enseigne.
  SELECT st.company_id INTO resource_company FROM public.staff st
  WHERE (st.organization_id,st.id)=(NEW.organization_id,NEW.staff_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Collaborateur hors organisation.' USING ERRCODE='23514'; END IF;
  IF resource_company IS NOT NULL AND resource_company IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'Collaborateur d’une autre enseigne.' USING ERRCODE='23514';
  END IF;
  SELECT sv.company_id INTO resource_company FROM public.services sv
  WHERE (sv.organization_id,sv.id)=(NEW.organization_id,NEW.service_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Prestation hors organisation.' USING ERRCODE='23514'; END IF;
  IF resource_company IS NOT NULL AND resource_company IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'Prestation d’une autre enseigne.' USING ERRCODE='23514';
  END IF;
  IF NEW.site_id IS NOT NULL THEN
    SELECT s.company_id INTO resource_company FROM public.organization_sites s
    WHERE (s.organization_id,s.id)=(NEW.organization_id,NEW.site_id);
    IF NOT FOUND THEN RAISE EXCEPTION 'Établissement hors organisation.' USING ERRCODE='23514'; END IF;
    IF resource_company IS NOT NULL AND resource_company IS DISTINCT FROM NEW.company_id THEN
      RAISE EXCEPTION 'Établissement d’une autre enseigne.' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$guard$;
REVOKE ALL ON FUNCTION private.phase6b_beauty_appointment_company_guard()
  FROM PUBLIC,anon,authenticated;

-- Ordre alphabétique BEFORE : client_guard précède company_default.
CREATE TRIGGER metier_appointment_company_client_guard
BEFORE INSERT OR UPDATE OF organization_id,company_id,client_id,site_id,staff_id,service_id,status
ON public.appointments FOR EACH ROW
EXECUTE FUNCTION private.phase6b_beauty_appointment_company_guard();

CREATE FUNCTION private.phase6b_beauty_client_reassignment_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,private AS $client_guard$
BEGIN
  IF (NEW.organization_id IS DISTINCT FROM OLD.organization_id
      OR NEW.company_id IS DISTINCT FROM OLD.company_id)
     AND EXISTS (SELECT 1 FROM public.organizations o
                 WHERE o.id=OLD.organization_id AND o.business_type='coiffure')
     AND EXISTS (
       SELECT 1 FROM public.appointments a
       WHERE (a.organization_id,a.client_id)=(OLD.organization_id,OLD.id)
         AND (a.organization_id IS DISTINCT FROM NEW.organization_id
              OR a.company_id IS DISTINCT FROM NEW.company_id)
     ) THEN
    RAISE EXCEPTION 'Transfert de client avec rendez-vous : réconciliation explicite requise.'
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$client_guard$;
REVOKE ALL ON FUNCTION private.phase6b_beauty_client_reassignment_guard()
  FROM PUBLIC,anon,authenticated;
CREATE TRIGGER phase6b_beauty_client_reassignment_guard
BEFORE UPDATE OF organization_id,company_id ON public.clients FOR EACH ROW
EXECUTE FUNCTION private.phase6b_beauty_client_reassignment_guard();

-- Toute nouvelle anomalie interrompt automatiquement la transaction.
DO $verify$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.appointments a JOIN public.clients c
      ON (c.organization_id,c.id)=(a.organization_id,a.client_id)
    JOIN public.organizations o ON o.id=a.organization_id
    WHERE o.business_type='coiffure'
      AND a.company_id IS DISTINCT FROM c.company_id
  ) THEN RAISE EXCEPTION 'Incohérences Beauty restantes : arrêt'; END IF;
END;
$verify$;
-- COMMIT seulement après contrôle ; sinon ROLLBACK.
COMMIT;
```

Les rôles des RPC et les policies d'accès existantes ne sont pas remplacés par ce trigger d'intégrité. Les fonctions trigger sont privées, sans droit d'appel client ; elles ne modifient que `NEW` ou lèvent une erreur. Elles utilisent des lectures propriétaires afin que la cohérence ne dépende pas de la visibilité RLS partielle de l'appelant. Leur sécurité ne repose pas sur le fait d'être cachées : les vérifications d'organisation sont explicites.

**Effets secondaires de la réparation** : le trigger de fidélité s'exécutera sur UPDATE de `company_id`, mais les 7 lignes ne sont pas completed et n'ont pas d'état à inverser. Les settings de l'enseigne existent. `handle_appointment_email_events` n'envoie pas de mail sur un seul changement de `company_id`. Le contrôle ressources quitte pour cette offre non Métier. Ne désactiver aucun trigger, ni utiliser le flag d'import pour contourner des contrôles. Vérifier ces postconditions sur copie avant production.

### 2.5 Rollback Beauty

Avant COMMIT : `ROLLBACK` annule tables, fonctions, triggers et réparation ensemble. Après COMMIT, **préférer conserver les données désormais cohérentes** et retirer seulement la prévention si elle produit une régression. SQL de retrait :

```sql
BEGIN;
DROP TRIGGER metier_appointment_company_client_guard ON public.appointments;
DROP TRIGGER phase6b_beauty_client_reassignment_guard ON public.clients;
DROP FUNCTION private.phase6b_beauty_appointment_company_guard();
DROP FUNCTION private.phase6b_beauty_client_reassignment_guard();
COMMIT;
```

Cela réintroduit le risque de création incohérente : arrêter les écritures Beauty jusqu'au correctif. Ne pas remettre aveuglément `company_id=NULL`. Un rendez-vous peut avoir été terminé et avoir généré fidélité, parrainage, stock ou notifications depuis la réparation. Une restauration des 7 données vers la baseline défectueuse est réservée à une copie de test, ou à un plan de reprise séparé sans activité postérieure, avec comparaison du backup, statuts, `updated_at` et dépendances. Le backup privé reste conservé ; aucune purge automatique proposée.

### 2.6 Tests Beauty à exécuter ultérieurement

- Avant : recompter 7 incohérences, 0 fidélité liée ; relever la définition et les ACL des triggers/fonctions concernés ; reproduire le refus historique déjà constaté en Phase 6A sur copie.
- Réparation : exactement 7 lignes ; aucune autre colonne métier ne change, aucune notification ou attribution de points/visites, aucun nouveau mismatch.
- Refaire Terminer sur le rendez-vous de 09:00 : completed, un seul crédit conforme aux settings de l'enseigne ; répéter l'action ne double pas le crédit ; annulation/revalidation suit les règles existantes.
- Professionnelle : création sans `company_id` avec client rattaché → héritage ; édition de date sans perte d'enseigne ; paire legacy nulle/nulle préservée.
- Métier : création v2 avec établissement/client/ressources cohérents → succès ; client d'une autre enseigne → refus ; enseigne d'une autre organisation → refus.
- Refuser une enseigne explicitement contradictoire, une ressource rattachée ailleurs, un changement client/rendez-vous qui transporterait une fidélité historique, le transfert d'une fiche client encore liée à des rendez-vous incompatibles.
- Deux sessions : création de rendez-vous et changement d'enseigne du client simultanés ; transaction perdante doit échouer proprement, jamais produire de mismatch. Vérifier les cas de deadlock et le retry applicatif.
- Réservation publique et espace client à vérifier sur copie : les triggers s'y appliquent aussi ; aucune permission publique ajoutée. Pas de modification UI prévue.

Risques : verrouillage court des tables pendant migration ; gardes plus stricts révélant des incohérences jusqu'ici tolérées ; transfert de client volontaire désormais soumis à réconciliation ; performance de recherche des rendez-vous d'un client à mesurer sur volume réel ; autres rôles et RPC à tester. **Aucun test d'écriture de ce plan n'a été exécuté en Phase 6B.**

## 3. Sécurité — référentiel métier et portée RLS

### 3.1 Relations réelles

```text
organizations
 ├─ security_clients (client commercial)
 │   └─ security_sites (site d'intervention client)
 │       └─ security_shifts (mission, agent_id)
 ├─ security_agents (linked_user_id → utilisateur)
 ├─ organization_members (rôle, statut, accès facturation,
 │                       brand_scope_mode / company_scope_mode)
 ├─ organization_companies (entreprise/enseigne juridique)
 │   └─ organization_brands (marque ; company_id)
 └─ organization_sites (établissement interne ; brand_id / company_id)
```

`security_sites.client_id` a une FK composite `(organization_id,client_id)` vers `security_clients`. `security_shifts` a deux FK composites `(organization_id,site_id)` vers `security_sites` et `(organization_id,agent_id)` vers `security_agents`. Cela empêche de substituer un site/agent d'une autre organisation. Cela ne définit pas une autorisation d'enseigne à l'intérieur de l'organisation.

Aucune colonne `brand_id`, `company_id` ou `organization_site_id` dans `security_sites`, `security_clients` ou `security_agents` lus. Un UUID de site client ne doit **jamais** être testé comme un UUID d'établissement interne. Aucun rattachement ne peut être déduit honnêtement de leur nom ou de l'enseigne active dans le navigateur.

Utilisateur interne : membership actif, rôle, droits par enseigne ; agent rattaché par `security_agents.linked_user_id`. Client externe : compte du portail client, pas un rôle interne de gestionnaire. Un gestionnaire autorisé peut gérer plusieurs clients commerciaux ; « autre client interdit » signifie qu'un client du portail ne peut lire le site d'un autre client, et qu'un agent ne peut lire des missions non affectées. Il ne faut pas supprimer la capacité légitime du gestionnaire de planifier plusieurs clients.

### 3.2 Intention historique vérifiée

- Local `027_security_discovery_core.sql` : modèle des sites clients et missions, FK composites, gestion owner/admin/manager, suppression owner/admin.
- Local `028_security_essential_field.sql` : SELECT des missions limité au gestionnaire ou à l'agent affecté ; SELECT des sites via `security_agent_can_access_site` (gestionnaire ou mission non annulée affectée).
- Distant `20260902220410 / metier_brand_scope_rls_enforcement` : boucle ajoutant `metier_brand_scope_restrict` à de nombreuses tables, dont `security_shifts`, en appelant partout `metier_site_scope_allows(organization_id,site_id)`. Cette migration précise qu'il s'agit d'une restriction ajoutée aux droits métier, et non d'un remplacement. Sa définition n'est pas retrouvée dans les migrations locales recherchées : la source de vérité de cette étape est l'historique distant lu.
- Cette généralisation est l'origine du mauvais référentiel. Ne pas modifier `metier_site_scope_allows` globalement : d'autres métiers l'utilisent correctement pour `organization_sites`.
- `060_security_client_portal.sql` et définition distante actuelle de `security_client_portal_dashboard` : compte portail vérifié, requêtes bornées à son organisation et à `security_sites.client_id=v_account.client_id`. La RPC contient aussi des UPDATE de suivi de lecture ; elle a été **lue, jamais appelée**.

### 3.3 Toutes les policies actuelles de `security_shifts`

| Policy | Type / rôle PostgreSQL | Commande | USING | WITH CHECK |
|---|---|---|---|---|
| `security_shifts_member_select` | permissive / public | SELECT | `is_security_manager(organization_id) OR agent_id=current_security_agent_id(organization_id)` | — |
| `security_shifts_manager_insert` | permissive / public | INSERT | — | `has_org_role(organization_id, ARRAY['owner','admin','manager'])` |
| `security_shifts_manager_update` | permissive / public | UPDATE | même `has_org_role` | même `has_org_role` |
| `security_shifts_admin_delete` | permissive / public | DELETE | `has_org_role(organization_id, ARRAY['owner','admin'])` | — |
| `metier_brand_scope_restrict` | restrictive / authenticated | ALL | `metier_site_scope_allows(organization_id,site_id)` | même expression |

Les quatre policies permissives restent inchangées. **Une seule policy existante est proposée à la modification : `public.security_shifts.metier_brand_scope_restrict`**, ses deux expressions USING et WITH CHECK. Elle reste restrictive, ALL, pour authenticated. Aucun grant CRUD supplémentaire.

Fonctions actuelles :

- `has_org_role` : membership actif + rôle + accès de facturation, ou accès support actif pour les rôles autorisés ;
- `is_security_manager` : `has_org_role` avec owner/admin/manager ;
- `current_security_agent_id` : agent actif dont linked_user_id=auth.uid(), membership actif ;
- `metier_site_scope_allows` : faux sans utilisateur, vrai hors Métier ou site nul, sinon `metier_member_can_access_site` ;
- `metier_member_can_access_site` : recherche exclusivement `organization_sites`, établissement non archivé, puis contrôle de marque ;
- `metier_member_can_access_brand` : membership actif/facturation, propriétaire/admin ou portée all ou accès explicite à la marque active ; exception administrateur plateforme ;
- `metier_company_access_allows` : contrôle analogue de la portée entreprise. Les entreprises et marques sont des identifiants différents, même lorsqu'elles partagent un nom.

### 3.4 Données concernées / décision de rattachement

Deux organisations Sécurité lues : Azzera Protect Métier (`9d27285c-f91a-4c9e-9e5b-03eee7414513`) avec **7 sites, 4 actifs et 3 archivés, 0 mission**, et AZZERA PROTECT Métier (`f1bdf401-2465-4a98-bab8-b914d782ed40`) avec 0 site, 0 mission. Le compte test de la première a un owner et un employee actifs, tous deux portée all ; il ne permet pas à lui seul de prouver les cas de portée restreinte.

Marques de la première organisation :

| brand_id | Marque | company_id |
|---|---|---|
| `9dae9f2b-da34-41d2-bf63-77f56cb7c11f` | Azzera Protect (principale) | `1a861e5d-6422-4979-aebc-d0833869c0f9` |
| `32a79697-150d-4319-b06e-2d0e4fa45017` | Solutions | `92eb52b1-efbe-465b-90c1-8307f0dace58` |
| `cc23a0c2-e64d-43e4-adf9-762cf0c9b9c6` | Azzera solutions | `92eb52b1-efbe-465b-90c1-8307f0dace58` |

Les trois sont actives ; deux marques pointent vers la même entreprise. Ne pas choisir automatiquement la marque principale.

| Site client | site_id | Statut | Marque à confirmer |
|---|---|---|---|
| Cosquer Marseille | `f46dccd1-5dbf-45b5-a8c4-c2195bd60e30` | active | non déterminée |
| IUT DRAGUIGNAN | `fed5d556-7aed-49d8-8dee-3168fd9459b1` | archived | non déterminée |
| comédie d'aix | `0493306e-c333-4e2a-8ff9-4cc4d6dd67d9` | archived | non déterminée |
| IUT draguignan | `36c4b3b9-9672-4407-825b-affa03026114` | archived | non déterminée |
| comedie d'aix | `b4b0929e-33e4-4c85-b9a1-97c4f47dfdcb` | active | non déterminée |
| IUT Draguignan | `0cb1c45d-e19b-424d-9a91-b79a31fd2361` | active | non déterminée |
| Ramatyel hotel l'escalet | `7efc2fac-8d69-4ad2-8069-750f3f0da5eb` | active | non déterminée |

### 3.5 Règles cibles et SQL proposé

Recommandation : table de correspondance privée, une marque par site client, rattachement approuvé par l'opérateur ; aucun accès d'écriture depuis le navigateur. FKs composites pour les deux côtés, refus par défaut des sites Métier non rattachés. Ce choix est à valider : si un site doit être partagé par plusieurs enseignes, arrêter ici et définir explicitement ce modèle, sans transformer un rattachement absent en accès global.

Le contrôle restrictive reste un **ET** avec les autorisations métier :

| Opération | Rôle métier et contrôle de ligne | Portée supplémentaire |
|---|---|---|
| SELECT | gestionnaire ou agent affecté | organisation autorisée, site client réel, marque et entreprise accessibles |
| INSERT | owner/admin/manager | nouvelle organisation/site autorisés ; FK agent/site conservées ; validations dates/pause/agent/site actif/chevauchement inchangées |
| UPDATE | owner/admin/manager | portée de l'ancienne **et** de la nouvelle ligne ; empêche une réaffectation vers un site non autorisé |
| DELETE | owner/admin | portée de la ligne existante ; contraintes/guards métier conservés |

L'état actif d'un site pour la création reste contrôlé par `validate_security_shift`. Le helper de lecture ne filtre pas les sites archivés afin de ne pas cacher l'historique ; une marque inactive demeure refusée par le helper existant. Aucun accès accordé à un client externe par les policies internes.

Migration logique proposée : `security_shift_site_brand_scope`, après validation du manifest et de la barrière RPC (§3.7). **Le bloc ci-dessous est volontairement bloquant avec les `brand_id:null` : remplacer ces valeurs exclusivement par le manifest approuvé.** C'est une donnée de décision manquante, pas une valeur devinée. Aucun fichier de migration n'est créé dans cette phase.

```sql
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE public.security_sites, public.security_shifts,
  public.organization_brands IN SHARE ROW EXCLUSIVE MODE;

-- Le catalogue distant ne possède pas encore cette clé composite unique.
ALTER TABLE public.organization_brands
  ADD CONSTRAINT phase6b_brands_org_id_unique UNIQUE (organization_id,id);
CREATE TABLE private.security_site_brand_scope (
  organization_id uuid NOT NULL,
  security_site_id uuid NOT NULL,
  brand_id uuid NOT NULL,
  PRIMARY KEY (organization_id,security_site_id),
  FOREIGN KEY (organization_id,security_site_id)
    REFERENCES public.security_sites(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,brand_id)
    REFERENCES public.organization_brands(organization_id,id) ON DELETE RESTRICT
);
REVOKE ALL ON private.security_site_brand_scope FROM PUBLIC,anon,authenticated;
ALTER TABLE private.security_site_brand_scope ENABLE ROW LEVEL SECURITY;
-- Aucune policy d'écriture client : maintenance réservée à l'opérateur.

DO $mapping$
DECLARE
  manifest jsonb := '[
    {"site_id":"f46dccd1-5dbf-45b5-a8c4-c2195bd60e30","brand_id":null},
    {"site_id":"fed5d556-7aed-49d8-8dee-3168fd9459b1","brand_id":null},
    {"site_id":"0493306e-c333-4e2a-8ff9-4cc4d6dd67d9","brand_id":null},
    {"site_id":"36c4b3b9-9672-4407-825b-affa03026114","brand_id":null},
    {"site_id":"b4b0929e-33e4-4c85-b9a1-97c4f47dfdcb","brand_id":null},
    {"site_id":"0cb1c45d-e19b-424d-9a91-b79a31fd2361","brand_id":null},
    {"site_id":"7efc2fac-8d69-4ad2-8069-750f3f0da5eb","brand_id":null}
  ]'::jsonb;
  n integer;
BEGIN
  IF jsonb_array_length(manifest)<>7 OR EXISTS (
    SELECT 1 FROM jsonb_to_recordset(manifest) AS x(site_id uuid,brand_id uuid)
    WHERE x.site_id IS NULL OR x.brand_id IS NULL
  ) THEN RAISE EXCEPTION 'Manifest site client → marque non validé'; END IF;

  INSERT INTO private.security_site_brand_scope
    (organization_id,security_site_id,brand_id)
  SELECT s.organization_id,s.id,b.id
  FROM jsonb_to_recordset(manifest) AS x(site_id uuid,brand_id uuid)
  JOIN public.security_sites s ON s.id=x.site_id
  JOIN public.organization_brands b
    ON b.id=x.brand_id AND b.organization_id=s.organization_id
  WHERE s.organization_id='9d27285c-f91a-4c9e-9e5b-03eee7414513'
    AND b.status='active';
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>7 THEN RAISE EXCEPTION 'Manifest incomplet ou inter-organisation'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.security_sites s
    JOIN public.organizations o ON o.id=s.organization_id
    LEFT JOIN private.security_site_brand_scope m
      ON (m.organization_id,m.security_site_id)=(s.organization_id,s.id)
    WHERE o.plan='metier' AND m.security_site_id IS NULL
  ) THEN RAISE EXCEPTION 'Sites Métier non rattachés : revue requise'; END IF;
END;
$mapping$;

CREATE FUNCTION private.security_shift_site_scope_allows(
  p_organization_id uuid,p_security_site_id uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,private AS $scope$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.security_sites s
    JOIN public.security_clients c
      ON (c.organization_id,c.id)=(s.organization_id,s.client_id)
    JOIN public.organizations o ON o.id=s.organization_id
    LEFT JOIN private.security_site_brand_scope m
      ON (m.organization_id,m.security_site_id)=(s.organization_id,s.id)
    LEFT JOIN public.organization_brands b
      ON (b.organization_id,b.id)=(m.organization_id,m.brand_id)
    WHERE s.organization_id=p_organization_id AND s.id=p_security_site_id
      -- Ne pas transformer un défaut de membership en accès implicite.
      AND (
        EXISTS (SELECT 1 FROM public.organization_members om
                WHERE om.organization_id=s.organization_id
                  AND om.user_id=auth.uid() AND om.status='active')
        OR public.has_active_support_access(s.organization_id)
      )
      AND public.organization_billing_access_allowed(s.organization_id)
      AND (
        o.plan<>'metier'
        OR (
          b.id IS NOT NULL AND b.status='active' AND b.company_id IS NOT NULL
          AND public.metier_member_can_access_brand(s.organization_id,b.id)
          AND public.metier_company_access_allows(s.organization_id,b.company_id)
        )
      )
  );
$scope$;
REVOKE ALL ON FUNCTION private.security_shift_site_scope_allows(uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.security_shift_site_scope_allows(uuid,uuid)
  TO authenticated;
-- Helper privé utilisé par la policy, pas de nouvelle RPC publique.
-- Aucun p_user_id fourni par l'appelant : identité issue de auth.uid().

ALTER POLICY metier_brand_scope_restrict ON public.security_shifts
  USING (private.security_shift_site_scope_allows(organization_id,site_id))
  WITH CHECK (private.security_shift_site_scope_allows(organization_id,site_id));

SELECT policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='security_shifts'
ORDER BY policyname;
-- Attendu : mêmes 5 policies ; seule l'expression restrictive change.
COMMIT;
```

Le helper SECURITY DEFINER est limité à une lecture booléenne contrôlée : il doit voir le mapping privé et les sites sans provoquer une récursion RLS via `security_sites → security_agent_can_access_site → security_shifts`. Il n'accorde pas à lui seul le droit SELECT/INSERT/UPDATE/DELETE : les quatre policies métier restent obligatoires. Son propriétaire doit être le rôle de migration contrôlé ; search_path fixé ; aucun nom de table fourni par l'appelant. Aucun appel direct anonyme autorisé. Les ACL du schéma privé et la résolution du helper par la policy doivent être testées sous le vrai rôle authenticated sur copie ; ne pas exposer le schéma via la Data API pour résoudre un problème de droits.

### 3.6 Rollback Sécurité

Avant COMMIT : `ROLLBACK`. Après COMMIT : remettre exactement l'expression précédente, conserver le mapping comme preuve et pour le correctif suivant. Cela rétablit aussi le blocage connu de création Métier ; prévenir l'exploitation.

```sql
BEGIN;
ALTER POLICY metier_brand_scope_restrict ON public.security_shifts
  USING (public.metier_site_scope_allows(organization_id,site_id))
  WITH CHECK (public.metier_site_scope_allows(organization_id,site_id));
DROP FUNCTION private.security_shift_site_scope_allows(uuid,uuid);
COMMIT;
```

Ne pas supprimer les missions créées entre-temps et ne pas modifier leurs site_id. Le mapping privé et sa contrainte sont conservés sans accès client. Un retrait de schéma ultérieur ne peut être autorisé qu'après vérification des dépendances ; pas de DROP CASCADE proposé. Aucun droit élargi n'est conservé par ce rollback.

### 3.7 Risques et barrières avant application

1. **Rattachement non déterminé** : les sept marques restent à confirmer. Le SQL bloque au lieu d'attribuer arbitrairement tous les sites à la marque principale.
2. **Nouveaux sites** : le frontend actuel n'enregistre pas ce mapping. Une nouvelle fiche site Métier restera inutilisable pour une mission tant que son rattachement n'est pas validé. Définir avant déploiement le parcours administratif autorisé pour renseigner ce mapping, idéalement atomique avec la création du site. Ne pas ajouter un fallback « site sans marque → autorisé ».
3. **RPC propriétaire** : modifier une policy n'encadre pas les lectures/écritures des fonctions SECURITY DEFINER. Un repérage ciblé des fonctions référençant `security_shifts` identifie notamment `duplicate_security_shift`, `get_security_shift_handover`, `set_security_shift_presence_event`, `set_security_shift_presence_event_premium`, `delete_security_planned_shift`, `security_shift_dossier_readiness`, les fonctions de clôture/réouverture et de facturation. La recherche textuelle ne retrouve pas les helpers de scope site/marque dans ces fonctions ; ce repérage ne démontre pas à lui seul une faille, car elles peuvent appeler d'autres contrôles. **Relecture ciblée de leurs contrôles effectifs et tests par enseigne indispensables avant déploiement**. Tout accès à une mission par UUID doit contrôler organisation + site autorisé + rôle/affectation, ancienne et nouvelle portée pour une mutation. Pas de remplacement global de `is_security_manager` : cette fonction n'a pas de site en paramètre.
4. **Autres tables Sécurité** : la migration distante erronée cite aussi alertes, consignes, rondes, preuves et lignes de factures. Elles ne sont pas modifiées ici ; l'ouverture d'une mission peut donc rencontrer un autre refus antérieur. Les tester avant application, et traiter séparément les dépendances qui bloquent le parcours critique. Ne pas appliquer une boucle de correction globale sans avoir vérifié chaque FK.
5. **Catalogue de sites** : ses policies actuelles permettent aux gestionnaires de l'organisation de consulter les sites clients. Le SQL proposé limite la portée des missions, pas l'ensemble du catalogue ni le portail. Si le produit impose également un catalogue strictement cloisonné entre enseignes, prévoir une restriction dédiée de `security_sites` avec son parcours de création et ses RPC, avant déploiement. Ne pas annoncer une isolation complète de toute la verticale avec ce seul ALTER POLICY.
6. **Support / facturation** : le garde proposé reste conservateur. Un accès support sans membership peut être refusé en Métier par les helpers d'enseigne existants ; aucune exception automatique ajoutée. Un compte suspendu par facturation reste bloqué. Faire valider et tester ce comportement.

**Conclusion de sécurité :** le SQL est une proposition précise pour la policy fautive, avec referentiel correct et fermeture par défaut. Il n'est pas encore une migration prête à appliquer en production : mapping, nouveaux sites et contrôle des chemins RPC doivent être approuvés/validés. Cela évite de « réparer » la création au prix d'une ouverture multi-tenant.

### 3.8 Tests Sécurité avant/après, sur copie isolée

Préparer des identités owner/admin/manager/employee, un agent affecté, un non affecté, un utilisateur externe, deux organisations, deux enseignes, deux clients commerciaux. Le compte test actuel à portée all ne couvre pas ces exclusions. Exécuter via API/session authentifiée réelle ou harness PostgreSQL avec rôle/JWT de test ; une requête propriétaire ne prouve pas la RLS. Aucune impersonation ni création de fixtures dans cette phase.

| Test | Avant | Après attendu |
|---|---|---|
| Même création que Phase 6A, site actif rattaché, owner | refus policy erronée | succès et ligne relisible par `.insert().select().single()` |
| Agent affecté : lecture de sa mission | aucun cas réel disponible | autorisé si scope correspondant ; aucune autre mission |
| Manager portée enseigne A, mission site B | actuellement bloqué par mauvaise FK logique | reste refusé, malgré rôle manager |
| INSERT avec site/agent de l'autre organisation | refus | refus RLS/FK, aucune ligne |
| UPDATE site A → site B non autorisé | refus | refus WITH CHECK, ancienne ligne inchangée |
| UPDATE organisation + site pour déplacer la mission | refus hors droit | aucun déplacement hors organisation autorisée |
| DELETE manager / employee | refus | refus ; owner/admin autorisés dans leur portée |
| Site Métier sans mapping | refus | refus explicite de portée, jamais accès global |
| Marque inactive / membership suspendu / compte externe / anon | refus | refus |
| Portail client A, UUID/compte du client B | refus | refus ; dashboard reste borné à client_id et organisation |
| RPC duplication, présence, clôture, dossier, handover | baseline à relever | mêmes contrôles de portée ; aucun contournement par RPC |
| Création hors Métier | baseline autorisée selon rôle | mêmes règles métier, bon site client |
| Rattachement invalide à une marque d'autre organisation | non applicable | FK composite refuse |
| Dates inversées, pause trop longue, agent/site inactif, chevauchement | refus métier | refus métier inchangé |

La simulation UPDATE doit vérifier anciennes et nouvelles lignes et le résultat SELECT ; tester le nombre de lignes réellement modifiées (pas uniquement l'absence d'exception). Contrôler les erreurs PostgREST réelles, les logs, et vérifier qu'aucune mission n'est créée en cas de refus. Les tests de rollback doivent être réalisés avant autorisation de production.

## 4. Séquence proposée et critères de validation

1. Valider ce document et les décisions de rattachement ; maintenir la production inchangée.
2. Créer une copie isolée représentative ; vérifier la parité des fonctions, triggers, policies et contraintes avec les SELECT ci-dessous. Aucun clone n'a été créé ici.
3. Créer ultérieurement deux migrations séparées par l'outil Supabase : Beauty puis Sécurité. Ne pas modifier les migrations historiques. Conserver les définitions/ACL et un snapshot de données avant essai.
4. Exécuter Beauty sur copie, tester données + prévention + fidélité + rollback. Échec de précondition = ROLLBACK, pas d'assouplissement des gardes.
5. Finaliser Sécurité après les trois barrières identifiées ; tester matrice RLS et chemins RPC. Le manifest vide de marques n'est pas un feu vert implicite.
6. Faire relire les résultats et demander une autorisation explicite de modification distante. Une validation de ce plan ne doit pas être interprétée comme l'exécution déjà réalisée.

### Requêtes de contrôle en lecture seule (rejouables)

```sql
SELECT o.id,o.name,o.plan,count(*) AS appointments,
       count(*) FILTER (WHERE a.company_id IS DISTINCT FROM c.company_id) AS mismatches
FROM public.appointments a
JOIN public.clients c ON (c.organization_id,c.id)=(a.organization_id,a.client_id)
JOIN public.organizations o ON o.id=a.organization_id
WHERE o.business_type='coiffure'
GROUP BY o.id,o.name,o.plan;

SELECT policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname='public' AND tablename='security_shifts';

SELECT conrelid::regclass AS relation,conname,pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid IN
  ('public.security_sites'::regclass,'public.security_shifts'::regclass)
  AND contype IN ('f','u','p');

SELECT tgrelid::regclass AS relation,tgname,pg_get_triggerdef(oid)
FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN
  ('public.appointments'::regclass,'public.clients'::regclass,'public.security_shifts'::regclass);

SELECT p.oid::regprocedure,pg_get_functiondef(p.oid),p.proacl,p.prosecdef
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('public','private') AND p.proname IN (
  'save_appointment','save_appointment_v2','process_coiffure_appointment_loyalty',
  'beauty_enforce_loyalty_company_scope','metier_fill_appointment_company',
  'metier_validate_beauty_appointment_client_company','metier_site_scope_allows',
  'metier_member_can_access_site','metier_member_can_access_brand',
  'metier_company_access_allows','security_agent_can_access_site',
  'has_org_role','current_security_agent_id','is_security_manager');
```

Référence technique consultée : [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), notamment USING/WITH CHECK, nécessité de SELECT pour UPDATE et contournement RLS par les fonctions propriétaires. L'index changelog markdown a été tenté mais le lecteur web a refusé son type de contenu ; aucune implémentation Supabase n'a été effectuée sur cette base.

**Validation de cette phase :** SELECT seulement, revue ciblée du SQL et des migrations locales/distantes. Aucun test après migration possible puisqu'aucune modification n'est autorisée. Aucun build nécessaire : seul ce document est créé. Aucun changement UI, aucun commit, aucun push, aucun déploiement ; `main` et le checkpoint branding restent inchangés.
