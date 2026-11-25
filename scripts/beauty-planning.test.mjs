import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Exercise the actual submit handler with a fake transport: these are unit tests,
// not proof of database/RLS execution or real appointment creation.
const source = await readFile(new URL('../src/pages/AppointmentsPage.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('AppointmentsPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'saveAppointment') handler = node.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(handler);
const compiled = ts.transpileModule(handler, {compilerOptions: {target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const noop = () => {};
async function submit(overrides = {}) {
  const calls = [], errors = [];
  const scope = {
    organization:{id:'org-a',plan:'professionnelle'}, professionalBeauty:true, primaryPlanning:{site:{id:'site-primary'}},
    canEditAppointments:true, demoMode:false, beautyMode:false, editingId:null,
    form:{siteId:'untrusted-other-site',clientId:'client-a',serviceId:'service-a',staffId:'staff-a',date:'2026-11-11',time:'09:00',status:'confirmed',notes:''},
    serviceById:new Map([['service-a',{duration_minutes:45,price_cents:3000}]]),
    localAvailabilityError:()=>'', supabase:{rpc:async (...args)=>{calls.push(args);return {error:null};}},
    loadData:async()=>{},setSaving:noop,setError:value=>errors.push(value),setSuccess:noop,
    setSelectedDate:noop,startOfDay:date=>date,setEditingId:noop,setForm:noop,emptyForm:()=>({}),
    defaultBeautySiteId:'site-metier',activeSiteId:null,sites:[],setSearchParams:noop,
    ...overrides
  };
  const run = new Function(...Object.keys(scope), `${compiled};return saveAppointment;`)(...Object.values(scope));
  await run({preventDefault:noop});
  return {calls,errors};
}
test('Professionnelle uses the guarded site RPC and server-resolved primary site',async()=>{
  const {calls}=await submit();
  assert.equal(calls.length,1);
  assert.equal(calls[0][0],'save_appointment_v2');
  assert.equal(calls[0][1].p_site_id,'site-primary');
  assert.equal(calls[0][1].p_service_id,'service-a');
  assert.equal('p_ends_at' in calls[0][1],false,'duration remains server-calculated');
});
test('unresolved primary context fails closed without any request',async()=>{
  const {calls,errors}=await submit({primaryPlanning:{site:null}});
  assert.equal(calls.length,0); assert.match(errors.join(' '),/principal/);
});
test('blocked local interval stops submission before any write',async()=>{
  const {calls,errors}=await submit({localAvailabilityError:()=> 'Ce créneau est bloqué.'});
  assert.equal(calls.length,0); assert.match(errors.join(' '),/bloqué/);
});
test('Métier keeps its existing site-scoped RPC',async()=>{
  const {calls}=await submit({organization:{id:'org-a',plan:'metier'},professionalBeauty:false});
  assert.equal(calls[0][0],'save_appointment_v2'); assert.equal(calls[0][1].p_site_id,'untrusted-other-site');
});
test('other businesses retain their existing booking path',async()=>{
  const {calls}=await submit({professionalBeauty:false});
  assert.equal(calls[0][0],'save_appointment'); assert.equal('p_site_id' in calls[0][1],false);
});

// Removal uses the existing cancellation RPC; no remote data is touched by these tests.
function pageFunction(name) {
  let found;
  const find = node => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node.getText(ast);
    ts.forEachChild(node, find);
  };
  find(ast); assert.ok(found, name);
  return ts.transpileModule(found, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
}
const filterStatus = new Function(`${pageFunction('matchesAppointmentPlanningFilter')}; return matchesAppointmentPlanningFilter;`)();
const removable = new Function(`${pageFunction('canRemoveAppointment')}; return canRemoveAppointment;`)();
const booking = {id:'appointment-a',client_id:'client-a',status:'confirmed'};
function removalHarness(overrides = {}) {
  const calls=[], confirmations=[], errors=[], successes=[], filters=[], sheets=[];
  const scope={
    organization:{id:'org-a'},canChangeStatus:true,canEditAppointments:true,coiffureUiMode:true,
    demoMode:false,busyId:null,removalInFlightRef:{current:false},canRemoveAppointment:removable,
    clientById:new Map([['client-a',{first_name:'Client test'}]]),fullClientName:c=>c.first_name,
    confirm:async options=>{confirmations.push(options);return {confirmed:true,value:'Doublon saisi par erreur'};},
    supabase:{rpc:async(...args)=>{calls.push(args);return {error:null};}},loadData:async()=>{},
    setBusyId:noop,setError:e=>errors.push(e),setSuccess:s=>successes.push(s),
    setStatusFilter:f=>filters.push(f),setWeekQuickAppointmentId:id=>sheets.push(id),
    statusLabels:{cancelled:'Annulé'},...overrides
  };
  const run=new Function(...Object.keys(scope),`${pageFunction('changeStatus')}\n${pageFunction('removeFromPlanning')}; return removeFromPlanning;`)(...Object.values(scope));
  return {run,scope,calls,confirmations,errors,successes,filters,sheets};
}
test('Beauty planning hides cancelled bookings but retains explicit history and other businesses',()=>{
  for(const status of ['pending','confirmed','completed','no_show']) assert.equal(filterStatus(status,'all',true),true);
  assert.equal(filterStatus('cancelled','all',true),false);
  assert.equal(filterStatus('cancelled','history',true),true);
  assert.equal(filterStatus('cancelled','cancelled',true),true);
  assert.equal(filterStatus('confirmed','cancelled',true),false);
  assert.equal(filterStatus('cancelled','all',false),true);
});
test('removal preserves appointment identity, records reason and uses only existing cancellation RPC',async()=>{
  const h=removalHarness(); await h.run(booking);
  assert.deepEqual(h.calls,[['set_appointment_status',{p_organization_id:'org-a',p_appointment_id:'appointment-a',p_status:'cancelled',p_cancellation_reason:'Doublon saisi par erreur'}]]);
  assert.match(h.confirmations[0].message,/historique/); assert.match(h.confirmations[0].message,/e-mail/);
  assert.deepEqual(h.filters,['all']); assert.deepEqual(h.sheets,[null]); assert.match(h.successes.at(-1),/retiré/);
});
test('declining removal makes no request and leaves filters unchanged',async()=>{
  const h=removalHarness({confirm:async()=>({confirmed:false})}); await h.run(booking);
  assert.equal(h.calls.length,0); assert.deepEqual(h.filters,[]); assert.deepEqual(h.successes,[]);
  assert.equal(h.scope.removalInFlightRef.current,false);
});
test('failed cancellation does not hide the booking or report success',async()=>{
  const h=removalHarness({supabase:{rpc:async()=>({error:{message:'Accès refusé'}})}}); await h.run(booking);
  assert.deepEqual(h.filters,[]); assert.deepEqual(h.successes.filter(Boolean),[]); assert.match(h.errors.at(-1),/Accès refusé/);
  assert.equal(h.scope.removalInFlightRef.current,false);
});
test('removal unavailable for employees, other businesses and completed/cancelled/no-show appointments',async()=>{
  for(const override of [{canEditAppointments:false},{coiffureUiMode:false},{busyId:'another'}]){
    const h=removalHarness(override); await h.run(booking); assert.equal(h.confirmations.length,0); assert.equal(h.calls.length,0);
  }
  for(const status of ['completed','cancelled','no_show']){
    const h=removalHarness(); await h.run({...booking,status}); assert.equal(h.confirmations.length,0); assert.equal(h.calls.length,0);
  }
});
test('double tap during confirmation produces only one cancellation request',async()=>{
  let decide;
  const h=removalHarness({confirm:()=>new Promise(resolve=>{decide=resolve;})});
  const first=h.run(booking); await h.run(booking);
  decide({confirmed:true,value:''}); await first;
  assert.equal(h.calls.length,1); assert.equal(h.scope.removalInFlightRef.current,false);
});
