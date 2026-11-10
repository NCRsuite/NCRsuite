/** Local PostgreSQL unit tests. Requires PGlite 0.3.14, installed separately (no app dependency).
 * BEAUTY_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node --test scripts/beauty-booking-database.test.mjs
 * Fixtures substitute Auth sessions, email transport, loyalty side effects and shared-resource availability (no physical resources in these fixtures).
 * These tests do NOT certify hosted Supabase, GoTrue, SMTP, concurrency or backup restoration.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const modulePath=process.env.BEAUTY_PGLITE_MODULE;
if (!modulePath) throw new Error('Set BEAUTY_PGLITE_MODULE to a separately installed @electric-sql/pglite@0.3.14 module.');
const {PGlite}=await import(pathToFileURL(modulePath).href);
const db=new PGlite();
const read=(p)=>readFile(new URL(p,import.meta.url),'utf8');
await db.exec(await read('./fixtures/beauty-booking-baseline.sql'));
// Actual deployed Beauty final scope guards, not a simulated identity guard.
await db.exec(await read('../supabase/migrations/20261006172644_beauty_appointment_company_prevention_6b1.sql'));
await db.exec(`
CREATE FUNCTION public.organization_has_plan_feature(p_org uuid,p_feature text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT coalesce((SELECT status IN ('active','trial') AND CASE p_feature WHEN 'multi_site' THEN plan='metier' WHEN 'white_label' THEN plan='metier' WHEN 'commercial_branding' THEN plan IN ('professionnelle','metier') ELSE true END FROM public.organizations WHERE id=p_org),false) $$;
CREATE FUNCTION private.coiffure_client_portal_company_feature_enabled(p_org uuid,p_company uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM public.organizations o WHERE o.id=p_org AND o.status='active') AND (p_company IS NULL OR EXISTS(SELECT 1 FROM public.organization_companies WHERE id=p_company AND organization_id=p_org AND status='active')) $$;
CREATE FUNCTION public.can_access_client(uuid,uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT current_setting('test.staff_allowed',true)='yes' $$;
CREATE FUNCTION public.metier_company_access_allows(uuid,uuid,uuid DEFAULT auth.uid()) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT current_setting('test.staff_allowed',true)='yes' $$;
CREATE FUNCTION public.has_org_role(uuid,text[]) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT current_setting('test.staff_allowed',true)='yes' $$;
CREATE TABLE private.test_benefit_calls(org uuid,client uuid);
CREATE FUNCTION public.apply_coiffure_welcome_benefit(p_org uuid,p_client uuid) RETURNS void LANGUAGE sql AS $$ INSERT INTO private.test_benefit_calls VALUES(p_org,p_client) $$;
CREATE FUNCTION public.ensure_coiffure_birthday_reward(uuid,uuid) RETURNS void LANGUAGE sql AS $$ SELECT $$;
CREATE FUNCTION public.expire_coiffure_loyalty_rewards(uuid,uuid) RETURNS void LANGUAGE sql AS $$ SELECT $$;
CREATE FUNCTION private.ensure_beauty_company_loyalty_settings(uuid,uuid,uuid) RETURNS void LANGUAGE sql AS $$ SELECT $$;
CREATE FUNCTION public.plan_feature_enabled(text,text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$;
CREATE FUNCTION extensions.digest(t text,algorithm text) RETURNS bytea LANGUAGE sql IMMUTABLE AS $$ SELECT sha256(convert_to(t,'UTF8')) $$;
CREATE FUNCTION extensions.gen_random_bytes(n integer) RETURNS bytea LANGUAGE sql VOLATILE AS $$ SELECT decode(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'hex') $$;
`);
const security=await read('../supabase/migrations/20261018193658_beauty_verified_booking_identity.sql');
const entitlements=await read('../supabase/migrations/20261110162747_beauty_primary_booking_entitlements.sql');
await assert.rejects(db.exec(entitlements),/Definition changed|Security stage/);
await db.exec('ROLLBACK');
await db.exec(security);
await db.exec(await read('./fixtures/beauty-operational-site-constraint.sql'));
// Production structure uses random UUIDs; fixed synthetic IDs make assertions unambiguous.
const id=(n)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const [org,org2,c1,c2,c3,s1,s2,s3,s4,u1,u2,cl1,cl2,a1,a2,st,sv]=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17].map(id);
const q=async(sql,params=[]) => (await db.query(sql,params)).rows;
const login=async(user)=>{await q("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);};
await db.exec(`
 INSERT INTO public.organizations(id,name,slug,business_type,plan,status,booking_enabled,created_by) VALUES
 ('${org}','TEST Salon A','test-org-a','coiffure','metier','active',true,'${u1}'),('${org2}','TEST Salon B','test-org-b','coiffure','metier','active',true,'${u2}');
 INSERT INTO public.organization_companies(id,organization_id,name,public_slug,status,is_primary,public_page_enabled,booking_enabled) VALUES
 ('${c1}','${org}','TEST Main','test-main','active',true,true,true),('${c2}','${org}','TEST Other','test-other','active',false,true,true),('${c3}','${org2}','TEST External','test-external','active',true,true,true);
 INSERT INTO public.organization_sites(id,organization_id,company_id,name,status,is_primary) VALUES
 ('${s1}','${org}','${c1}','TEST Primary','active',true),('${s2}','${org}','${c1}','TEST Secondary','active',false),('${s3}','${org}','${c2}','TEST Other','active',true),('${s4}','${org2}','${c3}','TEST External','active',true);
 INSERT INTO auth.users VALUES('${u1}','client-a@example.invalid',now()),('${u2}','client-b@example.invalid',now());
 INSERT INTO public.clients(id,organization_id,company_id,first_name,email,phone) VALUES
 ('${cl1}','${org}','${c1}','TEST A','client-a@example.invalid','0100000001'),('${cl2}','${org}','${c1}','TEST B','client-b@example.invalid','0100000002');
 INSERT INTO public.coiffure_client_portal_accounts(id,organization_id,client_id,user_id,email) VALUES
 ('${a1}','${org}','${cl1}','${u1}','client-a@example.invalid'),('${a2}','${org}','${cl2}','${u2}','client-b@example.invalid');
 INSERT INTO public.staff(id,organization_id,company_id,site_id,display_name) VALUES('${st}','${org}','${c1}','${s1}','TEST Professional');
 INSERT INTO public.services(id,organization_id,company_id,name,duration_minutes,price_cents) VALUES('${sv}','${org}','${c1}','TEST Service',30,2500);
 INSERT INTO public.staff_services(organization_id,staff_id,service_id) VALUES('${org}','${st}','${sv}');
`);
const clientSnapshot=JSON.stringify(await q('select * from public.clients order by id'));
const resolve=async(email,phone,account=null)=> (await q('select private.beauty_booking_client($1,$2,$3,$4,$5,$6,$7) as id',[org,c1,'TEST Guest',null,email,phone,account]))[0].id;
let guest,appt;
// Execute the actual slot engines; only shared-resource availability is substituted.
await db.exec(`
CREATE TABLE public.beauty_availability_blocks(organization_id uuid,company_id uuid,site_id uuid,staff_id uuid,active boolean,starts_at timestamptz,ends_at timestamptz);
CREATE FUNCTION private.beauty_service_sequence_resources_available(uuid,uuid,uuid,uuid[],timestamptz) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT coalesce(current_setting('test.resource_denied',true),'no')<>'yes' $$;
UPDATE public.organizations SET timezone='UTC',booking_min_notice_hours=0,booking_max_days_ahead=60;
UPDATE public.organization_sites SET timezone='UTC';
INSERT INTO public.staff_working_hours(organization_id,staff_id,weekday,start_time,end_time) SELECT '${org}','${st}',d,'08:00','19:00' FROM generate_series(0,6) d;
`);
const future=async(hour=10)=>(await q("select (current_date+14+($1 * interval '1 hour')) at time zone 'UTC' t",[hour]))[0].t;
const book=async(hour,email='new-client@example.invalid',site=s1)=> (await q('select public.create_public_metier_coiffure_company_booking_v2($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) result', ['test-main',site,[sv],st,await future(hour),'TEST Guest',null,email,null,'TEST only',null,true]))[0].result;
test('guest contact matching never reuses or overwrites either existing client',async()=>{
 await login(null); guest=await resolve('client-a@example.invalid','0100000002');
 assert.notEqual(guest,cl1);assert.notEqual(guest,cl2);
 assert.equal(JSON.stringify(await q('select * from public.clients where id=any($1::uuid[]) order by id',[[cl1,cl2]])),clientSnapshot);
});
test('connected booking chooses owned dossier, not the supplied foreign contact',async()=>{
 await login(u1);assert.equal(await resolve('client-b@example.invalid','0100000002',a1),cl1);
 await assert.rejects(resolve('client-b@example.invalid','0100000002',a2),/Accès client refusé/);
 await login(null);await assert.rejects(resolve('client-a@example.invalid',null,a1),/Authentification/);
});
test('proof is bound to one new appointment, tenant and original client',async()=>{
 appt=id(30);await db.exec(`INSERT INTO public.appointments(id,organization_id,company_id,client_id,service_id,staff_id,site_id,starts_at,ends_at,source,public_token) VALUES('${appt}','${org}','${c1}','${guest}','${sv}','${st}','${s1}',now()+interval '7 days',now()+interval '7 days 30 minutes','public','${id(31)}');`);
 await q('select private.beauty_record_guest_booking($1)',[appt]);
 await login(u2);await assert.rejects(q('select private.beauty_claim_guest_booking($1)',[appt]),/invitation|vérifiée/);
 await login(u1);await q('update auth.users set email_confirmed_at=null where id=$1',[u1]);
 await assert.rejects(q('select private.beauty_claim_guest_booking($1)',[appt]),/Confirmez/);
 await q('update auth.users set email_confirmed_at=now() where id=$1',[u1]);
 assert.equal((await q('select private.beauty_claim_guest_booking($1) as id',[appt]))[0].id,a1);
 assert.equal((await q('select private.beauty_claim_guest_booking($1) as id',[appt]))[0].id,a1);
 assert.equal((await q('select count(*)::int n from private.test_benefit_calls'))[0].n,0);
 assert.equal((await q('select client_id from public.appointments where id=$1',[appt]))[0].client_id,guest);
});
test('verified booking is visible only through an active account in its tenant',async()=>{
 await login(u1);assert.equal((await q('select private.beauty_guest_booking_visible($1,$2) ok',[appt,a1]))[0].ok,true);
 await login(u2);assert.equal((await q('select private.beauty_guest_booking_visible($1,$2) ok',[appt,a2]))[0].ok,false);
 await login(u1);await q("update public.coiffure_client_portal_accounts set status='revoked' where id=$1",[a1]);
 assert.equal((await q('select private.beauty_guest_booking_visible($1,$2) ok',[appt,a1]))[0].ok,false);
 await assert.rejects(q('select private.beauty_claim_guest_booking($1)',[appt]),/réactiver/);
 await q("update public.coiffure_client_portal_accounts set status='active' where id=$1",[a1]);
});
test('public users cannot execute private identity helpers or enqueue arbitrary invitations',async()=>{
 for(const role of ['anon','authenticated']){
  await db.exec(`SET ROLE ${role}`);
  await assert.rejects(q('select private.beauty_claim_guest_booking($1)',[appt]),/permission denied/);
  await assert.rejects(q('select public.enqueue_coiffure_client_portal_invitation_email($1,$2)',[id(999),'fake']),/permission denied/);
  await db.exec('RESET ROLE');
 }
});
test('actual guest booking keeps existing contacts intact, writes its own scoped dossier and preserves price',async()=>{
 await login(null);
 const result=await book(8,'client-b@example.invalid');
 const row=(await q('select * from public.appointments where id=$1',[result.appointment_id]))[0];
 assert.notEqual(row.client_id,cl2);assert.equal(row.company_id,c1);assert.equal(row.site_id,s1);
 assert.equal(result.amount_cents,2500);assert.equal(result.total_duration_minutes,30);
 assert.equal((await q('select count(*)::int n from public.appointment_service_items where appointment_id=$1',[row.id]))[0].n,1);
 assert.equal((await q('select original_client_id from private.beauty_guest_booking_proofs where appointment_id=$1',[row.id]))[0].original_client_id,row.client_id);
 assert.equal(JSON.stringify(await q('select * from public.clients where id=any($1::uuid[]) order by id',[[cl1,cl2]])),clientSnapshot);
 await assert.rejects(book(8,'client-b@example.invalid'),/créneau/);
});
test('actual connected booking uses the authorized account; foreign account, consent and foreign site are rejected',async()=>{
 await login(u1);
 const create=async(account,site=s1,consent=true)=>q('select public.create_coiffure_client_portal_booking_v2($1,$2,$3,$4,$5,$6,$7) result',[account,site,[sv],st,await future(9),'TEST only',consent]);
 await assert.rejects(create(a2),/Accès client refusé/);
 await assert.rejects(create(a1,s4),/lieu actif/);
 await assert.rejects(create(a1,s1,false),/consentement/);
 const result=(await create(a1))[0].result;
 const row=(await q('select client_id,booking_origin from public.appointments where id=$1',[result.appointment_id]))[0];
 assert.equal(row.client_id,cl1);assert.equal(row.booking_origin,'client_portal');
 assert.equal((await q('select count(*)::int n from private.beauty_guest_booking_proofs where appointment_id=$1',[result.appointment_id]))[0].n,0);
});
test('actual activation sends only to the immutable booking email, validates the token, and grants only that booking',async()=>{
 await login(null);
 const b=await book(10,'client-a@example.invalid');
 const c=(await q('select client_id from public.appointments where id=$1',[b.appointment_id]))[0].client_id;
 await q('update public.clients set email=$1 where id=$2',['changed@example.invalid',c]);
 const status=(await q('select public.public_booking_client_portal_activation_status($1) result',[b.token]))[0].result;
 assert.equal(status.masked_email,'cl••••@example.invalid');
 assert.equal((await q('select public.request_public_booking_client_portal_activation($1) result',[b.token]))[0].result.status,'sent');
 const out=(await q("select recipient_email,payload from public.email_outbox order by created_at desc limit 1"))[0];
 assert.equal(out.recipient_email,'client-a@example.invalid');
 const token=out.payload.invitation_token;
 await login(u2);await assert.rejects(q('select public.accept_coiffure_client_portal_invitation($1)',[token]),/autre adresse/);
 await login(u1);await assert.rejects(q('select public.accept_coiffure_client_portal_invitation($1)',['invalid']),/introuvable/);
 await q('update auth.users set email_confirmed_at=null where id=$1',[u1]);
 await assert.rejects(q('select public.accept_coiffure_client_portal_invitation($1)',[token]),/Confirmez/);
 await q('update auth.users set email_confirmed_at=now() where id=$1',[u1]);
 assert.equal((await q('select public.accept_coiffure_client_portal_invitation($1) account',[token]))[0].account,a1);
 await assert.rejects(q('select public.accept_coiffure_client_portal_invitation($1)',[token]),/plus disponible/);
 assert.equal((await q('select public.public_booking_client_portal_activation_status($1) result',[b.token]))[0].result.already_active,true);
 const dashboard=(await q('select public.coiffure_client_portal_dashboard($1) result',[a1]))[0].result;
 assert.equal(dashboard.client.id,cl1);assert.equal(dashboard.client.email,'client-a@example.invalid');
 assert.ok(dashboard.appointments.some(a=>a.id===b.appointment_id));
 assert.equal(dashboard.balance.points,0);assert.equal(dashboard.balance.visits,0);
 await login(u2);
 assert.equal((await q('select public.coiffure_client_portal_dashboard($1) result',[a2]))[0].result.appointments.some(a=>a.id===b.appointment_id),false);
 await assert.rejects(q('select public.coiffure_client_portal_dashboard($1)',[a1]),/Accès refusé/);
});
test('first verified activation is idempotent and does not grant another company or organization access',async()=>{
 const user=id(70);await q('insert into auth.users values($1,$2,now())',[user,'new-verified@example.invalid']);
 await login(null);const b=await book(11,'new-verified@example.invalid');
 await login(user);
 const activate=async()=>(await q('select public.request_public_booking_client_portal_activation($1) result',[b.token]))[0].result;
 const first=await activate();assert.equal(first.status,'active');assert.equal((await activate()).account_id,first.account_id);
 assert.equal((await q('select count(*)::int n from private.test_benefit_calls'))[0].n,1);
 for (const [otherOrg,company,n] of [[org,c2,71],[org2,c3,72]]) {
  const client=id(n),account=id(n+2);
  await q('insert into public.clients(id,organization_id,company_id,first_name) values($1,$2,$3,$4)',[client,otherOrg,company,'TEST Other']);
  await q('insert into public.coiffure_client_portal_accounts(id,organization_id,client_id,user_id,email) values($1,$2,$3,$4,$5)',[account,otherOrg,client,user,'new-verified@example.invalid']);
  assert.equal((await q('select private.beauty_guest_booking_visible($1,$2) ok',[b.appointment_id,account]))[0].ok,false);
 }
});
const legacyBook=async()=>q('select public.create_public_booking($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) result',['test-org-a',sv,st,await future(13),'TEST Legacy',null,null,'0100000099',null,null]);
test('baseline v1 reproduces the missing-site deferred constraint failure',async()=>{
 await login(null);await db.exec('BEGIN');
 try {await legacyBook();await assert.rejects(db.exec('SET CONSTRAINTS ALL IMMEDIATE'),/établissement actif/);}
 finally {await db.exec('ROLLBACK');}
});
test('targeted v1 fix persists the exact staff site and passes deferred constraints',async()=>{
 await db.exec(await read('../supabase/migrations/20261110162614_beauty_legacy_booking_site.sql'));
 await db.exec('BEGIN');
 try {
  const b=(await legacyBook())[0].result;
  const row=(await q('select client_id,company_id,site_id from public.appointments where id=$1',[b.appointment_id]))[0];
  assert.equal(row.site_id,s1);assert.equal(row.company_id,c1);assert.notEqual(row.client_id,cl1);assert.notEqual(row.client_id,cl2);
  await db.exec('SET CONSTRAINTS ALL IMMEDIATE');
 } finally {await db.exec('ROLLBACK');}
});
test('v1 rejects missing, inactive, other-company and other-organization staff sites without creating a dossier',async()=>{
 for(const site of [null,s2,s3,s4]){
  await db.exec('BEGIN');
  try {
   await q('update public.staff set site_id=$1 where id=$2',[site,st]);
   if(site===s2)await q("update public.organization_sites set status='inactive' where id=$1",[s2]);
   const before=(await q('select count(*)::int n from public.clients'))[0].n;
   await db.exec('SAVEPOINT rejected_site');
   await assert.rejects(legacyBook(),/établissement du collaborateur/);
   await db.exec('ROLLBACK TO SAVEPOINT rejected_site');
   assert.equal((await q('select count(*)::int n from public.clients'))[0].n,before);
  } finally {await db.exec('ROLLBACK');}
 }
});
test('stage two applies only after the exact security and site-fix stages',async()=>{await db.exec(entitlements);});
test('Professionnelle and Essentielle allow only primary company/site; Metier retains multi-site',async()=>{
 for(const plan of ['professionnelle','essentielle','metier']){
  await q('update public.organizations set plan=$1 where id=$2',[plan,org]);
  const ok=async(co,si)=>(await q('select private.beauty_public_site_allowed($1,$2,$3) ok',[org,co,si]))[0].ok;
  assert.equal(await ok(c1,s1),true);assert.equal(await ok(c1,s2),plan==='metier');assert.equal(await ok(c2,s3),plan==='metier');assert.equal(await ok(c3,s4),false);
 }
 await q("update public.organizations set plan='professionnelle' where id=$1",[org]);
 await q("update public.organization_companies set is_primary=true where id=$1",[c2]);
 assert.equal((await q('select private.beauty_public_company_allowed($1,$2) ok',[org,c1]))[0].ok,false);
 await q("update public.organization_companies set is_primary=false where id=$1",[c2]);
});
test('actual Professionnelle booking succeeds on primary site and rejects secondary/foreign sites',async()=>{
 await login(null);
 const result=await book(12,'professional-plan@example.invalid');
 assert.equal(result.company_slug,'test-main');assert.equal(result.site_id,s1);assert.equal(result.amount_cents,2500);
 await assert.rejects(book(13,'professional-plan@example.invalid',s2),/non autorisé/);
 await assert.rejects(book(13,'professional-plan@example.invalid',s4),/non autorisé/);
});
test('public page keeps commercial branding and white-label entitlements separate',async()=>{
 await q("update public.organization_companies set logo_url='https://example.invalid/logo.png',primary_color='#123456',public_tagline='TEST Tagline',public_hours_text='TEST Hours',public_practical_info='TEST Info' where id=$1",[c1]);
 await q('update public.organizations set show_ncr_branding=false where id=$1',[org]);
 for(const plan of ['essentielle','professionnelle','metier']){
  await q('update public.organizations set plan=$1 where id=$2',[plan,org]);
  const page=(await q("select public.get_public_metier_coiffure_company_page('test-main') result"))[0].result;
  assert.equal(page.sites.length,plan==='metier'?2:1);
  assert.equal(page.company.logo_url,plan==='essentielle'?null:'https://example.invalid/logo.png');
  assert.equal(page.company.tagline,plan==='essentielle'?null:'TEST Tagline');
  assert.equal(page.company.hours_text,plan==='essentielle'?null:'TEST Hours');
  assert.equal(page.company.practical_info,plan==='essentielle'?null:'TEST Info');
  assert.equal(page.company.show_ncr_branding,plan!=='metier');
  assert.equal(page.staff.length,1);assert.equal(page.services.length,1);
 }
 await q("update public.organizations set plan='professionnelle',status='suspended' where id=$1",[org]);
 assert.equal((await q("select public.get_public_metier_coiffure_company_page('test-main') result"))[0].result,null);
 await q("update public.organizations set status='active' where id=$1",[org]);
});
test('actual slot engines preserve breaks, absence blocks and the resource-availability filter',async()=>{
 await db.exec('BEGIN');
 try {
  const refused=async(hour)=>{
   await db.exec('SAVEPOINT expected_refusal');
   await assert.rejects(book(hour),/créneau/);
   await db.exec('ROLLBACK TO SAVEPOINT expected_refusal; RELEASE SAVEPOINT expected_refusal');
  };
  await q("insert into public.staff_breaks(organization_id,staff_id,weekday,start_time,end_time) select $1,$2,extract(isodow from current_date+14)::smallint-1,'14:00','15:00'",[org,st]);
  await refused(14);
  await q("insert into public.beauty_availability_blocks values($1,$2,$3,$4,true,$5::timestamptz,$5::timestamptz+interval '1 hour')",[org,c1,s1,st,await future(15)]);
  await refused(15);
  await q("select set_config('test.resource_denied','yes',true)");
  await refused(16);
  await q("select set_config('test.resource_denied','no',true)");
  assert.ok((await book(16)).appointment_id);
 } finally {await db.exec('ROLLBACK');}
});
test('rescheduling a verified guest booking keeps its identity, proof and original appointment',async()=>{
 await db.exec('BEGIN');
 try {
  await login(null);const b=await book(17,'client-a@example.invalid');
  await login(u1);await q('select public.request_public_booking_client_portal_activation($1)',[b.token]);
  const before=(await q('select client_id from public.appointments where id=$1',[b.appointment_id]))[0].client_id;
  const result=(await q('select public.reschedule_public_booking_v3($1,$2,$3,$4) result',[b.token,s1,st,await future(18)]))[0].result;
  assert.equal(result.appointment_id,b.appointment_id);assert.equal(result.amount_cents,2500);
  const after=(await q('select client_id,starts_at from public.appointments where id=$1',[b.appointment_id]))[0];
  assert.equal(after.client_id,before);assert.equal(new Date(after.starts_at).getTime(),new Date(await future(18)).getTime());
  assert.equal((await q('select private.beauty_guest_booking_visible($1,$2) ok',[b.appointment_id,a1]))[0].ok,true);
  await assert.rejects(q('select public.reschedule_public_booking_v3($1,$2,$3,$4)',[b.token,s2,st,await future(18)]),/établissement initial/);
 } finally {await db.exec('ROLLBACK');}
});
test('legacy unversioned/v2/v3 and company single-service entrypoints create separate guest dossiers',async()=>{
 await login(null);
 for(const fn of ['create_public_booking','create_public_booking_v2','create_public_booking_v3','create_public_metier_coiffure_company_booking']){
  await db.exec('BEGIN');
  try {
   const company=fn==='create_public_metier_coiffure_company_booking';
   const params=[company?'test-main':'test-org-a',...(company||fn.endsWith('_v3')?[s1]:[]),sv,st,await future(13),'TEST Legacy',null,'client-b@example.invalid','0100000002',null,null,...(fn==='create_public_booking'?[]:[true])];
   const result=(await q(`select public.${fn}(${params.map((_,i)=>'$'+(i+1)).join(',')}) result`,params))[0].result;
   const ap=(await q('select client_id,company_id,site_id from public.appointments where id=$1',[result.appointment_id]))[0];
   assert.notEqual(ap.client_id,cl2,fn);assert.equal(ap.company_id,c1,fn);assert.equal(ap.site_id,s1,fn);await db.exec('SET CONSTRAINTS ALL IMMEDIATE');
   assert.equal((await q('select count(*)::int n from private.beauty_guest_booking_proofs where appointment_id=$1',[result.appointment_id]))[0].n,1,fn);
  } finally {await db.exec('ROLLBACK');}
 }
});
test('expired/revoked invitations and historical unbound public invitations cannot activate a dossier',async()=>{
 await login(u1);
 const invitation=id(90),token='synthetic-local-only';
 await q("insert into public.coiffure_client_portal_invitations(id,organization_id,client_id,email,token_hash,status,expires_at,invitation_source) values($1,$2,$3,$4,extensions.digest($5,'sha256'),'pending',now()-interval '1 day','public_booking')",[invitation,org,guest,'client-a@example.invalid',token]);
 await assert.rejects(q('select public.accept_coiffure_client_portal_invitation($1)',[token]),/expiré/);
 await q("update public.coiffure_client_portal_invitations set status='revoked',expires_at=now()+interval '1 day' where id=$1",[invitation]);
 await assert.rejects(q('select public.accept_coiffure_client_portal_invitation($1)',[token]),/plus disponible/);
 await q("update public.coiffure_client_portal_invitations set status='pending' where id=$1",[invitation]);
 await assert.rejects(q('select public.accept_coiffure_client_portal_invitation($1)',[token]),/ancienne invitation/);
 assert.equal((await q('select count(*)::int n from public.coiffure_client_portal_accounts where client_id=$1',[guest]))[0].n,0);
});
test('old RPC bodies contain no contact-based identity matching or client overwrite',async()=>{
 const functions=await q("select proname,prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in ('create_public_booking','create_public_booking_v2','create_public_metier_coiffure_company_booking')");
 assert.equal(functions.length,3);
 for(const f of functions){assert.doesNotMatch(f.prosrc,/update\s+public\.clients/i);assert.doesNotMatch(f.prosrc,/select c.id into v_client_id/i);assert.match(f.prosrc,/private.beauty_booking_client/);}
});
test('known disabled company slug cannot silently become an organization booking',async()=>{
 await q('update public.organizations set slug=$1 where id=$2',['test-main',org]);
 await q('update public.organization_companies set public_page_enabled=false where id=$1',[c1]);
 assert.equal((await q("select public.get_public_booking_page('test-main') as page"))[0].page,null);
 await q('update public.organization_companies set public_page_enabled=true where id=$1',[c1]);
});
test('migration preconditions reject a second execution, without touching existing records',async()=>{
 await assert.rejects(db.exec(security),/Definition changed/);await db.exec('ROLLBACK');
 assert.equal(JSON.stringify(await q('select * from public.clients where id=any($1::uuid[]) order by id',[[cl1,cl2]])),clientSnapshot);
});
test.after(async()=>{await db.close();});
