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
