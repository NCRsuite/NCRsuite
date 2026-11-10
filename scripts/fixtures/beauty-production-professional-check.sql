-- Controlled integration test. Synthetic data only; SQL claims are not a GoTrue login. Always execute the entire BEGIN...ROLLBACK batch.
BEGIN;
SET LOCAL statement_timeout='90s';
SET LOCAL lock_timeout='5s';
DO $qa$
DECLARE
 owner_id uuid:=gen_random_uuid(); ua uuid:=gen_random_uuid(); ub uuid:=gen_random_uuid();
 org uuid:=gen_random_uuid(); org2 uuid:=gen_random_uuid();
 ca uuid:=gen_random_uuid(); cb uuid:=gen_random_uuid(); cc uuid:=gen_random_uuid();
 site uuid:=gen_random_uuid(); staff_id uuid:=gen_random_uuid(); service_id uuid:=gen_random_uuid();
 client_a uuid:=gen_random_uuid(); client_b uuid:=gen_random_uuid(); account_a uuid:=gen_random_uuid(); account_b uuid:=gen_random_uuid();
 slug text:='qa-beauty-'||replace(gen_random_uuid()::text,'-','');
 email_a text:='qa-a-'||replace(gen_random_uuid()::text,'-','')||'@example.invalid';
 email_b text:='qa-b-'||replace(gen_random_uuid()::text,'-','')||'@example.invalid';
 result jsonb; ap uuid; tok uuid; guest uuid; denied boolean; count_rows integer; slot timestamptz; slot2 timestamptz; invitation_token text; accepted uuid; i integer; extra_ap uuid; secondary_site uuid:=gen_random_uuid(); foreign_site uuid:=gen_random_uuid();
 BEGIN
 INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data,raw_app_meta_data,created_at,updated_at,aud,role)
 VALUES(owner_id,'qa-owner-'||owner_id::text||'@example.invalid',now(),'{}','{}',now(),now(),'authenticated','authenticated'),
 (ua,email_a,now(),'{}','{}',now(),now(),'authenticated','authenticated'),
 (ub,email_b,now(),'{}','{}',now(),now(),'authenticated','authenticated');
 INSERT INTO public.organizations(id,name,slug,business_type,plan,status,created_by,booking_enabled,timezone,booking_min_notice_hours,booking_max_days_ahead)
 VALUES(org,'QA SYNTHETIC BEAUTY',slug,'coiffure','professionnelle','active',owner_id,true,'UTC',0,60),
 (org2,'QA SYNTHETIC OTHER',slug||'-other','coiffure','metier','active',owner_id,true,'UTC',0,60);
 INSERT INTO public.organization_companies(id,organization_id,name,public_slug,is_primary,public_page_enabled,booking_enabled)
 VALUES(ca,org,'QA COMPANY A',slug,true,true,true),(cb,org,'QA COMPANY B',slug||'-b',false,true,true),(cc,org2,'QA COMPANY C',slug||'-c',true,true,true);
 INSERT INTO public.organization_sites(id,organization_id,company_id,name,is_primary,timezone) VALUES(site,org,ca,'QA SITE',true,'UTC');
 INSERT INTO public.clients(id,organization_id,company_id,first_name,email,phone)
 VALUES(client_a,org,ca,'QA CLIENT A',email_a,'0100000001'),(client_b,org,ca,'QA CLIENT B',email_b,'0100000002');
 INSERT INTO public.coiffure_client_portal_accounts(id,organization_id,client_id,user_id,email)
 VALUES(account_a,org,client_a,ua,email_a),(account_b,org,client_b,ub,email_b);
 INSERT INTO public.staff(id,organization_id,company_id,site_id,display_name) VALUES(staff_id,org,ca,site,'QA STAFF');
 INSERT INTO public.services(id,organization_id,company_id,name,duration_minutes,price_cents) VALUES(service_id,org,ca,'QA SERVICE',30,2500);
 INSERT INTO public.staff_services(organization_id,staff_id,service_id) VALUES(org,staff_id,service_id);
 INSERT INTO public.staff_working_hours(organization_id,staff_id,weekday,start_time,end_time) SELECT org,staff_id,d,'08:00','19:00' FROM generate_series(0,6) d;

 INSERT INTO public.organization_sites(id,organization_id,company_id,name,is_primary,timezone)
 VALUES(secondary_site,org,ca,'QA SECONDARY',false,'UTC'),(foreign_site,org2,cc,'QA FOREIGN','true','UTC');
 IF NOT private.beauty_public_site_allowed(org,ca,site)
    OR private.beauty_public_site_allowed(org,ca,secondary_site)
    OR private.beauty_public_site_allowed(org2,ca,site)
    OR private.beauty_public_site_allowed(org,cc,foreign_site)
    OR private.beauty_public_company_allowed(org,cb)
 THEN RAISE EXCEPTION 'QA SECURITY FAILURE: Professionnelle entitlement scope'; END IF;
 IF public.organization_has_plan_feature(org,'multi_site') OR public.organization_has_plan_feature(org,'white_label') THEN
   RAISE EXCEPTION 'QA failed: Professional must not gain multi-site or white-label'; END IF;
 result:=public.get_public_metier_coiffure_company_page(slug);
 IF jsonb_array_length(result->'sites')<>1 THEN RAISE EXCEPTION 'QA failed: public secondary site exposed'; END IF;
 PERFORM set_config('request.jwt.claim.sub','',true);
 PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
 EXECUTE 'SET LOCAL ROLE anon';
 SELECT s.slot_start INTO slot FROM public.get_public_metier_coiffure_company_multi_slots(slug,site,ARRAY[service_id],current_date+14,staff_id) s ORDER BY s.slot_start LIMIT 1;
 IF slot IS NULL THEN RAISE EXCEPTION 'QA failed: no synthetic slots'; END IF;
 denied:=false;
 BEGIN PERFORM public.create_public_metier_coiffure_company_booking_v2(slug,secondary_site,ARRAY[service_id],staff_id,slot,'QA GUEST',NULL,email_a,NULL,'QA',NULL,true);
 EXCEPTION WHEN OTHERS THEN denied:=SQLERRM ~ 'non autorisé'; END;
 IF NOT denied THEN RAISE EXCEPTION 'QA SECURITY FAILURE: Professional secondary site accepted'; END IF;

 result:=public.create_public_metier_coiffure_company_booking_v2(slug,site,ARRAY[service_id],staff_id,slot,'QA GUEST',NULL,email_a,'0100000002','Synthetic rollback check',NULL,true);
 ap:=(result->>'appointment_id')::uuid; tok:=(result->>'token')::uuid;
 IF ap IS NULL OR (result->>'amount_cents')::integer<>2500 THEN RAISE EXCEPTION 'QA failed: guest result'; END IF;
 BEGIN
 SELECT count(*) INTO count_rows FROM public.clients WHERE id IN (client_a,client_b);
 EXCEPTION WHEN insufficient_privilege THEN count_rows:=0;
 END;
 IF count_rows<>0 THEN RAISE EXCEPTION 'QA SECURITY FAILURE: anon can read existing clients'; END IF;
 result:=public.request_public_booking_client_portal_activation(tok);
 IF result->>'status'<>'sent' THEN RAISE EXCEPTION 'QA failed: invitation not queued'; END IF;
 EXECUTE 'RESET ROLE';
 SELECT payload->>'invitation_token' INTO invitation_token FROM public.email_outbox WHERE organization_id=org AND template_key='coiffure_client_portal_invitation' AND recipient_email=email_a ORDER BY created_at DESC LIMIT 1;
 IF invitation_token IS NULL THEN RAISE EXCEPTION 'QA failed: invitation token missing from synthetic outbox'; END IF;
 SELECT client_id INTO guest FROM public.appointments WHERE id=ap;
 IF guest IN (client_a,client_b) THEN RAISE EXCEPTION 'QA SECURITY FAILURE: guest reused existing dossier'; END IF;
 IF NOT EXISTS(SELECT 1 FROM private.beauty_guest_booking_proofs WHERE appointment_id=ap AND original_client_id=guest AND company_id=ca AND organization_id=org) THEN RAISE EXCEPTION 'QA failed: proof scope'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.clients WHERE id=client_a AND email=email_a AND first_name='QA CLIENT A') OR NOT EXISTS(SELECT 1 FROM public.clients WHERE id=client_b AND email=email_b AND phone='0100000002') THEN RAISE EXCEPTION 'QA failed: existing contact changed'; END IF;

 PERFORM set_config('request.jwt.claim.sub',ub::text,true);
 PERFORM set_config('request.jwt.claims',json_build_object('sub',ub,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 denied:=false;
 BEGIN PERFORM public.coiffure_client_portal_dashboard(account_a); EXCEPTION WHEN OTHERS THEN denied:=SQLERRM ~* '(accès|access|refus|autorisé)'; END;
 IF NOT denied THEN RAISE EXCEPTION 'QA SECURITY FAILURE: foreign dashboard not denied'; END IF;
 denied:=false;
 BEGIN PERFORM public.accept_coiffure_client_portal_invitation(invitation_token); EXCEPTION WHEN OTHERS THEN denied:=SQLERRM ~ 'autre adresse'; END;
 IF NOT denied THEN RAISE EXCEPTION 'QA SECURITY FAILURE: wrong email accepted invitation'; END IF;
 SELECT count(*) INTO count_rows FROM public.clients WHERE id=client_a;
 IF count_rows<>0 THEN RAISE EXCEPTION 'QA SECURITY FAILURE: foreign client visible through RLS'; END IF;
 EXECUTE 'RESET ROLE';
 denied:=false;
 BEGIN PERFORM private.beauty_claim_guest_booking(ap); EXCEPTION WHEN OTHERS THEN denied:=SQLERRM ~ '(invitation|vérifiée)'; END;
 IF NOT denied THEN RAISE EXCEPTION 'QA SECURITY FAILURE: foreign email claimed guest'; END IF;

 PERFORM set_config('request.jwt.claim.sub',ua::text,true);
 PERFORM set_config('request.jwt.claims',json_build_object('sub',ua,'role','authenticated')::text,true);
 UPDATE auth.users SET email_confirmed_at=NULL WHERE id=ua;
 denied:=false;
 BEGIN PERFORM private.beauty_claim_guest_booking(ap); EXCEPTION WHEN OTHERS THEN denied:=SQLERRM ~ 'Confirmez'; END;
 IF NOT denied THEN RAISE EXCEPTION 'QA SECURITY FAILURE: unverified email claimed guest'; END IF;
 UPDATE auth.users SET email_confirmed_at=now() WHERE id=ua;
 denied:=false;
 BEGIN PERFORM private.beauty_booking_client(org,cb,'QA','TEST',email_a,NULL,account_a); EXCEPTION WHEN OTHERS THEN denied:=SQLERRM ~ 'refusé'; END;
 IF NOT denied THEN RAISE EXCEPTION 'QA SECURITY FAILURE: foreign company accepted account'; END IF;
 denied:=false;
 BEGIN PERFORM private.beauty_booking_client(org2,cc,'QA','TEST',email_a,NULL,account_a); EXCEPTION WHEN OTHERS THEN denied:=SQLERRM ~ 'refusé'; END;
 IF NOT denied THEN RAISE EXCEPTION 'QA SECURITY FAILURE: foreign organization accepted account'; END IF;
 EXECUTE 'SET LOCAL ROLE authenticated';
 accepted:=public.accept_coiffure_client_portal_invitation(invitation_token);
 IF accepted<>account_a THEN RAISE EXCEPTION 'QA failed: invitation account mismatch'; END IF;
 denied:=false;
 BEGIN PERFORM public.accept_coiffure_client_portal_invitation(invitation_token); EXCEPTION WHEN OTHERS THEN denied:=SQLERRM ~ 'plus disponible'; END;
 IF NOT denied THEN RAISE EXCEPTION 'QA SECURITY FAILURE: invitation replay accepted'; END IF;
 result:=public.request_public_booking_client_portal_activation(tok);
 IF result->>'status'<>'active' OR (result->>'account_id')::uuid<>account_a THEN RAISE EXCEPTION 'QA failed: verified activation'; END IF;
 result:=public.coiffure_client_portal_dashboard(account_a);
 IF position(ap::text IN result::text)=0 THEN RAISE EXCEPTION 'QA failed: claimed appointment absent'; END IF;
 SELECT s.slot_start INTO slot2 FROM public.get_public_metier_coiffure_company_multi_slots(slug,site,ARRAY[service_id],current_date+15,staff_id) s ORDER BY s.slot_start LIMIT 1;
 IF slot2 IS NULL THEN RAISE EXCEPTION 'QA failed: no reschedule slot'; END IF;
 result:=public.reschedule_public_booking_v3(tok,site,staff_id,slot2);
 IF NOT public.cancel_public_booking(tok,'QA rollback cancellation') THEN RAISE EXCEPTION 'QA failed: cancellation'; END IF;
 EXECUTE 'RESET ROLE';
 IF NOT EXISTS(SELECT 1 FROM public.appointments WHERE id=ap AND starts_at=slot2 AND status='cancelled') THEN RAISE EXCEPTION 'QA failed: reschedule/cancel not persisted inside transaction'; END IF;
 IF (SELECT client_id FROM public.appointments WHERE id=ap)<>guest THEN RAISE EXCEPTION 'QA failed: appointment reassigned'; END IF;
 IF private.beauty_guest_booking_visible(ap,account_b) THEN RAISE EXCEPTION 'QA SECURITY FAILURE: foreign account sees proof'; END IF;
 IF (SELECT count(*) FROM private.beauty_guest_booking_proofs WHERE appointment_id=ap AND verified_user_id=ua)<>1 THEN RAISE EXCEPTION 'QA failed: unique verified proof'; END IF;
 EXECUTE 'SET LOCAL ROLE authenticated';
 SELECT s.slot_start INTO slot2 FROM public.get_public_metier_coiffure_company_multi_slots(slug,site,ARRAY[service_id],current_date+20,staff_id) s ORDER BY s.slot_start LIMIT 1;
 result:=public.create_coiffure_client_portal_booking_v2(account_a,site,ARRAY[service_id],staff_id,slot2,'QA connected booking',true);
 extra_ap:=(result->>'appointment_id')::uuid;
 EXECUTE 'RESET ROLE';
 IF extra_ap IS NULL OR (SELECT client_id FROM public.appointments WHERE id=extra_ap)<>client_a THEN RAISE EXCEPTION 'QA SECURITY FAILURE: connected booking dossier'; END IF;
 PERFORM set_config('request.jwt.claim.sub','',true);
 PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
 FOR i IN 1..4 LOOP
   EXECUTE 'SET LOCAL ROLE anon';
   SELECT s.slot_start INTO slot2 FROM public.get_public_metier_coiffure_company_multi_slots(slug,site,ARRAY[service_id],current_date+21+i,staff_id) s ORDER BY s.slot_start LIMIT 1;
   CASE i
     WHEN 1 THEN result:=public.create_public_booking(slug,service_id,staff_id,slot2,'QA LEGACY',NULL,email_b,NULL,'QA',NULL);
     WHEN 2 THEN result:=public.create_public_booking_v2(slug,service_id,staff_id,slot2,'QA LEGACY',NULL,email_b,NULL,'QA',NULL,true);
     WHEN 3 THEN result:=public.create_public_booking_v3(slug,site,service_id,staff_id,slot2,'QA LEGACY',NULL,email_b,NULL,'QA',NULL,true);
     WHEN 4 THEN result:=public.create_public_metier_coiffure_company_booking(slug,site,service_id,staff_id,slot2,'QA LEGACY',NULL,email_b,NULL,'QA',NULL,true);
   END CASE;
   extra_ap:=(result->>'appointment_id')::uuid;
   EXECUTE 'RESET ROLE';
   IF extra_ap IS NULL OR NOT EXISTS(SELECT 1 FROM public.appointments WHERE id=extra_ap AND site_id=site AND company_id=ca AND organization_id=org AND client_id NOT IN (client_a,client_b)) THEN RAISE EXCEPTION 'QA SECURITY FAILURE: legacy route % reused dossier or crossed scope',i; END IF;
   IF NOT EXISTS(SELECT 1 FROM private.beauty_guest_booking_proofs WHERE appointment_id=extra_ap AND organization_id=org AND company_id=ca) THEN RAISE EXCEPTION 'QA failed: legacy proof %',i; END IF;
   SET CONSTRAINTS ALL IMMEDIATE;
   SET CONSTRAINTS ALL DEFERRED;
 END LOOP;
 SET CONSTRAINTS ALL IMMEDIATE;
END;
$qa$;
ROLLBACK;
SELECT 'PASS: real SQL RPC checks for guest and connected creation, four legacy entries, RLS/client/company/organization isolation, invitation queue/accept/replay denial, verified email, reschedule/cancel and immutable owner. All synthetic fixtures rolled back. SQL Auth claims injected, not GoTrue login.' AS result;
