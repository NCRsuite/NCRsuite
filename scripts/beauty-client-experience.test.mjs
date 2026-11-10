import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/beautyClientExperience.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { readableBrand, bookingError, isBookingConfirmation, createSubmissionGate, clientReturnPath, durationBetween, canonicalBeautyBookingPath } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('one submission reaches the server while another is pending', async () => {
  const submit = createSubmissionGate();
  let release; let requests = 0;
  const first = submit(async () => { requests++; await new Promise(resolve => { release = resolve; }); });
  assert.equal(await submit(async () => { requests++; }), false);
  assert.equal(requests, 1);
  release(); assert.equal(await first, true);
  assert.equal(await submit(async () => { requests++; }), true);
  assert.equal(requests, 2);
});
test('failed submission unlocks the existing form', async () => {
  const submit = createSubmissionGate();
  await assert.rejects(submit(async () => { throw new Error('slot unavailable'); }));
  assert.equal(await submit(async () => {}), true);
});
test('an error, incomplete response or cancelled appointment is never a new confirmation', () => {
  const booking = { appointment_id: 'test-id', token: 'test-management-link', status: 'pending', starts_at: '2026-10-16T08:00:00Z', ends_at: '2026-10-16T08:30:00Z' };
  assert.equal(isBookingConfirmation(booking), true);
  assert.equal(isBookingConfirmation({...booking, status:'confirmed'}), true);
  for (const invalid of [null, {}, {error:'network'}, {...booking, token:''}, {...booking, status:'cancelled'}, {...booking, starts_at:'invalid'}]) assert.equal(isBookingConfirmation(invalid), false);
});
test('a network failure warns of uncertain persistence instead of promising success', () => {
  assert.match(bookingError(new TypeError('Failed to fetch')), /vérifiée/);
  assert.match(bookingError({message:'Network timeout'}), /double/);
  assert.equal(bookingError({message:'Ce créneau n’est plus disponible.'}), 'Ce créneau n’est plus disponible.');
});
test('login returns only to a supported internal client journey', () => {
  for (const valid of ['/salon/nail?site=test&services=one,two#reserver','/reserver/test#reservation','/reservation/test-token?action=reschedule']) assert.equal(clientReturnPath(valid), valid);
  for (const invalid of [null,'https://foreign.example','//foreign.example','/dashboard','/salon/../../dashboard','/salon/nail/../../dashboard','javascript:alert(1)']) assert.equal(clientReturnPath(invalid), null);
});
test('brand actions remain readable while the configured identity is retained', () => {
  for (const color of ['#ffcc41','#ffaeff','#ffffff','#5c194b','#001122']) {
    const brand = readableBrand(color);
    assert.equal(brand.color, color);
    const rgb=[1,3,5].map(i=>parseInt(brand.ink.slice(i,i+2),16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);
    const lum=rgb.reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
    assert.ok(1.05/(lum+.05)>=4.5, `${color} action contrast`);
  }
  assert.equal(readableBrand('url(untrusted)').color,'#36433e');
});
test('duration is measured from instants, including a daylight-saving transition', () => {
  assert.equal(durationBetween('2026-10-16T08:00:00Z','2026-10-16T08:15:00Z'),'15 min');
  assert.equal(durationBetween('2026-10-25T02:30:00+02:00','2026-10-25T03:00:00+01:00'),'1 h 30');
});

test('legacy QR links preserve every query parameter and translate only known anchors', () => {
  const legacy = {id: 'company-a', slug: 'salon-a'};
  const company = {id: 'company-a', public_slug: 'salon-a'};
  const query = '?site=site-a&service=cut&staff=staff-a&date=2026-11-12&src=qr&ref=ABC&embed=1&extra=a%2Bb';
  assert.equal(canonicalBeautyBookingPath(legacy, company, query, '#reservation'), `/salon/salon-a${query}#reserver`);
  assert.equal(canonicalBeautyBookingPath(legacy, company, '', '#salon-infos'), '/salon/salon-a#infos');
  assert.equal(canonicalBeautyBookingPath(legacy, company, '?services=a,b', '#prestations'), '/salon/salon-a?services=a,b#prestations');
  assert.equal(canonicalBeautyBookingPath(legacy, company, '', ''), '/salon/salon-a');
});
test('no redirect to a namesake company or an unverified public page', () => {
  const legacy = {id: 'org-a', slug: 'salon-a'};
  for (const company of [null, undefined, {id:'other-company', public_slug:'salon-a'}, {id:'org-a', public_slug:'other-salon'}]) {
    assert.equal(canonicalBeautyBookingPath(legacy, company, '', ''), null);
  }
  assert.equal(canonicalBeautyBookingPath({id:'a',slug:'../admin'}, {id:'a',public_slug:'../admin'}, '', ''), null);
});
