import fs from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import './test-public-home-motion.mjs';
const read = path => fs.readFileSync(path,'utf8');
const base='src/components/public-home';
const page=read('src/pages/PublicHomePage.tsx');
assert.ok(page.includes('import(/* @vite-ignore */ publicHomeModuleUrl)'), 'Marketing runtime must remain a public-page-only request');
assert.ok(page.includes('cancelled = true') && page.includes('delete bridgeHost[bridgeKey]'), 'Unmount and pending import must be handled');
assert.ok(page.includes('id="ncr-public-home"'), 'Isolated style root is required');
assert.ok(page.includes('PageMetadata') && page.includes(' index'), 'Indexable public metadata required');
for(const destination of ['/connexion','/demande-acces?essai=7']) assert.ok(page.includes(destination));
const runtime=read(`${base}/runtime.tsx`);
for(const cleanup of ['queueMicrotask', 'gsap.ticker.sleep()', 'data-ncr-public-home', 'useEffect']) assert.ok(runtime.includes(cleanup), cleanup);
assert.ok(!runtime.includes('createRoot'), 'Use the app React tree, not a second root');
assert.ok(!runtime.includes('document.body.style') && !runtime.includes('document.documentElement.style'), 'No global HTML/body style mutation');
assert.ok(read(`${base}/components/useReveal.ts`).includes('observer.disconnect(); context.revert()'));
assert.ok(!read(`${base}/components/useReveal.ts`).includes('gsap/ScrollTrigger'));
const css=postcss.parse(read(`${base}/styles.scoped.css`));
let rules=0;
css.walkRules(rule=>{
 for(let p=rule.parent;p;p=p.parent) if(p.type==='rule' || (p.type==='atrule' && p.name.includes('keyframes'))) return;
 for(const selector of rule.selectors) {
   if (['html:has(#ncr-public-home)', 'body:has(#ncr-public-home)', '#root:has(#ncr-public-home)'].includes(selector)) {
     assert.deepEqual(rule.nodes.map(n => [n.prop, n.value]), [['overflow-x','clip'], ['overflow-y','visible']], 'Ancestor exception must only restore prototype scrolling');
   } else assert.ok(selector.startsWith('#ncr-public-home'), `CSS escape: ${selector}`);
 }
 rules++;
});
assert.ok(rules>100,'Full scoped design must be present');
css.walkAtRules('keyframes',rule=>assert.ok(rule.params.startsWith('ncr-home-')));
css.walkAtRules('property',rule=>assert.ok(rule.params.startsWith('--ncr-home-')));
const data=read(`${base}/data.ts`);
assert.ok(data.includes('export const SITE_URL = ""'), 'CTAs must remain same-origin');
assert.ok(data.includes('/connexion') && data.includes('/demande-acces?essai=7'));
assert.ok(read(`${base}/offers.ts`).includes('publicOfferCatalog as OFFERS'), 'Use the official price catalog');
for(const key of ['formation','securite','nettoyage','restauration','coiffure']) assert.ok(read(`${base}/verticals.ts`).includes(key));
const app=read('src/App.tsx');
assert.ok(app.includes("location.pathname === '/' && !runsAsInstalledPwa()"));
assert.ok(app.includes('if (!user)') && app.includes('return <AppShell />'));
for(const route of ['/connexion','/demande-acces','/mot-de-passe-oublie','/activation','/mentions-legales','/confidentialite','/reserver/:slug','/reservation/:token','/invitation/:token','/espace-formation','/espace-securite','/espace-nettoyage','/espace-client-coiffure','/logiciel-gestion-formation','/logiciel-securite-privee','/logiciel-entreprise-nettoyage','/logiciel-gestion-restaurant','/logiciel-coiffure']) assert.ok(app.includes(`path="${route}"`),route);
assert.ok(read('vite.config.ts').includes('codeSplitting: false'), 'Historic SaaS/PWA bundle must stay unchanged');
assert.ok(!read('public/sw.js').includes('/public-home/'), 'Marketing runtime must not be added to installed PWA precache');
const url=read(`${base}/moduleUrl.ts`).match(/'([^']+)'/)?.[1];
assert.ok(url && /^\/public-home\/runtime-[a-f0-9]{16}\.js$/.test(url));
assert.ok(fs.statSync(`public${url}`).size>100000,'Generated runtime must exist');


// Equivalent coverage for the former homepage's branding, showcase and offer checks.
assert.ok(page.includes('/og/ncr-suite-og-v2221.webp'));
for (const [file, markers] of Object.entries({
  'components/Header.tsx': ['<Logo', 'LOGIN_URL', 'TRIAL_URL'],
  'components/Story.tsx': ['<canvas', 'HeroText', 'StoryScene', 'CHAPTERS.map'],
  'components/Offres.tsx': ['role="tablist"', 'role="tabpanel"', 'OFFERS.map', 'TRIAL_URL'],
  'components/Metiers.tsx': ['metier-grid'],
  'components/Produit.tsx': ['IntersectionObserver', 'translate3d', 'cancelAnimationFrame', 'removeEventListener'],
})) for (const marker of markers) assert.ok(read(`${base}/${file}`).includes(marker), `${file}: ${marker}`);
const sourceCss = read(`${base}/styles.source.css`);
for (const marker of ['grid-column:2/span 2', 'grid-column:4/span 2', 'scroll-snap-type:x mandatory']) {
  assert.ok(sourceCss.replaceAll(' ', '').includes(marker.replaceAll(' ', '')), `Prototype layout missing: ${marker}`);
}
for (const selector of ['html:has(#ncr-public-home)', 'body:has(#ncr-public-home)', '#root:has(#ncr-public-home)']) {
  assert.ok(css.toString().includes(selector), `Sticky scroll ancestor missing: ${selector}`);
}
const integratedCss = css.toString();
assert.ok(integratedCss.includes('.product-carousel.is-pinned{height:332dvh}'), 'Pinned carousel must end after four compact transitions');
assert.ok(integratedCss.includes('.is-pinned .product-sticky{flex-direction:column;height:100dvh'), 'Pinned viewport must use dynamic viewport height');
const story = read(`${base}/components/Story.tsx`);
assert.ok(story.includes('calc(100dvh + 5 * 72dvh)'), 'Story scroll length must match its five stages');
assert.ok(story.includes('sstep(0.35, 0.75, Math.abs(s - i))'), 'Story chapters must overlap during transitions');
assert.ok(story.includes('1 - sstep(0.18, 0.68, s)'), 'Hero and first chapter must overlap');
const chapterOpacity = (stage, chapter) => 1 - Math.max(0, Math.min(1, (Math.abs(stage - chapter) - 0.35) / 0.4)) ** 2 * (3 - 2 * Math.max(0, Math.min(1, (Math.abs(stage - chapter) - 0.35) / 0.4)));
for (let stage = 0.5; stage <= 5; stage += 0.01) {
  assert.ok(Math.max(...[1, 2, 3, 4, 5].map(chapter => chapterOpacity(stage, chapter))) >= 0.5, `Empty story transition at ${stage.toFixed(2)}`);
}
assert.equal(chapterOpacity(5, 5), 1, 'Last story chapter must remain fully visible at release');
const product = read(`${base}/components/Produit.tsx`);
assert.ok(product.includes('(window.scrollY - g.top) / g.travel * 4'), 'Four product transitions must fill the exact sticky travel');
assert.ok(product.includes('1 - distance * 0.45'), 'At least one product mockup must remain visible throughout the travel');
assert.ok(read(`${base}/components/Faq.tsx`).includes('pb-16 pt-24 lg:pb-20 lg:pt-28'), 'FAQ exit spacing must stay compact');
assert.ok(read(`${base}/components/Final.tsx`).includes('min-h-[100svh]') && read(`${base}/components/Final.tsx`).includes('justify-center'), 'Final CTA must be visible when its section enters');

// Fingerprints originate from the final V3 source, not from the integrated scene.
const prototype = JSON.parse(read('scripts/public-home-prototype.json'));
for (const [file, expected] of Object.entries(prototype.files)) {
  const source = read(`${base}/${file}`);
  let canonical = file === 'three/ui.ts' ? source.replaceAll('NCRHomeInter', 'Inter') : source;
  if (file === 'components/Story.tsx') canonical = canonical
    .replace('        // Keep neighbouring chapters overlapped: at the midpoint both remain\n        // visible, so fast and slow scrolling can never expose an empty stage.\n        const op = i === 0 ? 1 - sstep(0.18, 0.68, s) : 1 - sstep(0.35, 0.75, Math.abs(s - i));', '        const op = i === 0 ? 1 - sstep(0.1, 0.4, s) : 1 - sstep(0.2, 0.42, Math.abs(s - i));')
    .replace('style={{ height: "calc(100dvh + 5 * 72dvh)" }}', 'style={{ height: `${100 + 5 * 95}svh` }}')
    .replace('h-[100dvh]', 'h-[100svh]');
  if (file === 'components/Final.tsx') canonical = canonical.replace('min-h-[100svh] w-[min(92vw,900px)] flex-col items-center justify-center pb-16 pt-24 text-center', 'min-h-[100svh] w-[min(92vw,900px)] flex-col items-center justify-end pb-20 pt-32 text-center lg:min-h-[108svh]');
  assert.equal(createHash('sha256').update(canonical).digest('hex'), prototype.optimizedFiles?.[file] ?? expected, `Validated public home differs: ${file}`);
}
assert.ok(integratedCss.includes('.h-\\[100svh\\]{height:100svh}') && integratedCss.includes('.min-h-\\[100svh\\]{min-height:100svh}'), 'Stable viewport utilities must exist in generated CSS');
console.log(`Public home isolation contract passed: ${rules} scoped CSS rules, routes, shared catalog, lazy runtime and cleanup.`);
