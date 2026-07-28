import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const baseHtmlPath = path.join(dist, 'index.html');
const seoPagesPath = path.join(root, 'src', 'config', 'publicSeoPages.json');
const canonicalOrigin = 'https://ncr-suite.fr';
const lastModified = '2026-07-28';

if (!fs.existsSync(baseHtmlPath)) {
  throw new Error('Le build Vite doit etre termine avant la generation des pages SEO.');
}

const baseHtml = fs.readFileSync(baseHtmlPath, 'utf8');
const pages = JSON.parse(fs.readFileSync(seoPagesPath, 'utf8'));

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

function replaceMeta(html, selector, value) {
  const escaped = escapeHtml(value);
  const pattern = selector.startsWith('property:')
    ? new RegExp(`<meta\\s+property="${selector.slice(9)}"\\s+content="[^"]*"\\s*\\/?>`, 'i')
    : new RegExp(`<meta\\s+name="${selector.slice(5)}"\\s+content="[^"]*"\\s*\\/?>`, 'i');
  const attribute = selector.startsWith('property:') ? 'property' : 'name';
  const key = selector.slice(selector.indexOf(':') + 1);
  const replacement = `<meta ${attribute}="${key}" content="${escaped}" />`;
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace('</head>', `    ${replacement}\n  </head>`);
}

function buildStructuredData(page) {
  const url = `${canonicalOrigin}${page.path}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'NCR Suite', item: `${canonicalOrigin}/` },
          { '@type': 'ListItem', position: 2, name: page.label, item: url }
        ]
      },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: page.title,
        description: page.description,
        inLanguage: 'fr-FR',
        breadcrumb: { '@id': `${url}#breadcrumb` },
        about: { '@id': `${url}#software` }
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${url}#software`,
        name: `NCR Suite ${page.name}`,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, iOS, Android, Windows, macOS',
        description: page.description,
        url,
        image: `${canonicalOrigin}/og/ncr-suite-og-v2221.webp`,
        publisher: { '@id': `${canonicalOrigin}/#organization` }
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: page.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer }
        }))
      }
    ]
  };
}

function buildPrerenderedContent(page) {
  const requestUrl = `/demande-acces?metier=${encodeURIComponent(page.key)}&offre=${encodeURIComponent(page.defaultPlan)}`;
  const featureMarkup = page.features.map((feature) => `
          <article>
            <h2>${escapeHtml(feature.title)}</h2>
            <p>${escapeHtml(feature.text)}</p>
          </article>`).join('');
  const faqMarkup = page.faq.map((item) => `
          <details>
            <summary>${escapeHtml(item.question)}</summary>
            <p>${escapeHtml(item.answer)}</p>
          </details>`).join('');
  const otherPages = pages.filter((item) => item.key !== page.key).map((item) =>
    `<a href="${escapeHtml(item.path)}">${escapeHtml(item.name)}</a>`
  ).join('');

  return `
      <article class="ncr-seo-prerender" style="--solution-color:${escapeHtml(page.color)}">
        <header>
          <a class="ncr-seo-brand" href="/">
            <img src="/brand/ncr-suite-logo-header-v2221.png" alt="NCR Suite" width="243" height="58" />
          </a>
          <p>${escapeHtml(page.eyebrow)}</p>
          <h1>${escapeHtml(page.headline)}</h1>
          <p class="ncr-seo-lead">${escapeHtml(page.lead)}</p>
          <a class="ncr-seo-action" href="${escapeHtml(requestUrl)}">Demander un accès</a>
        </header>
        <main>
          <section>
            <h2>${escapeHtml(page.outcome)}</h2>
            <p>Chaque action alimente la suivante pour conserver une information claire, exploitable et adaptée à votre métier.</p>
          </section>
          <section class="ncr-seo-feature-grid">${featureMarkup}
          </section>
          <section>
            <h2>Questions fréquentes</h2>
            <div class="ncr-seo-faq">${faqMarkup}
            </div>
          </section>
          <nav aria-label="Autres solutions métier NCR Suite">${otherPages}</nav>
        </main>
      </article>`;
}

const prerenderStyle = `
    <style data-ncr-seo-prerender>
      .ncr-seo-prerender{max-width:1180px;margin:0 auto;padding:32px 28px 72px;color:#0b1117;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .ncr-seo-prerender>header{padding:48px 0 56px;border-bottom:1px solid #dfe6ec}
      .ncr-seo-brand img{display:block;width:220px;height:auto;margin-bottom:72px}
      .ncr-seo-prerender header>p:first-of-type{color:var(--solution-color);font-size:13px;font-weight:800;text-transform:uppercase}
      .ncr-seo-prerender h1{max-width:900px;margin:14px 0 20px;font-size:clamp(42px,7vw,86px);line-height:.98;letter-spacing:0}
      .ncr-seo-lead{max-width:760px;color:#536170;font-size:21px;line-height:1.55}
      .ncr-seo-action{display:inline-block;margin-top:24px;padding:14px 20px;border-radius:7px;color:#fff;background:#0b1117;text-decoration:none;font-weight:750}
      .ncr-seo-prerender main>section{padding:58px 0;border-bottom:1px solid #dfe6ec}
      .ncr-seo-prerender h2{font-size:30px;letter-spacing:0}
      .ncr-seo-feature-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:#dfe6ec;padding:1px!important}
      .ncr-seo-feature-grid article{padding:30px;background:#fff}
      .ncr-seo-feature-grid h2{font-size:20px}
      .ncr-seo-feature-grid p,.ncr-seo-faq p{color:#5f6b78;line-height:1.65}
      .ncr-seo-faq details{padding:20px 0;border-top:1px solid #dfe6ec}
      .ncr-seo-faq summary{font-weight:750}
      .ncr-seo-prerender nav{display:flex;flex-wrap:wrap;gap:20px;padding-top:36px}
      .ncr-seo-prerender nav a{color:#0b1117;font-weight:700}
      @media(max-width:720px){.ncr-seo-prerender{padding:20px 20px 52px}.ncr-seo-brand img{width:178px;margin-bottom:48px}.ncr-seo-prerender h1{font-size:44px}.ncr-seo-lead{font-size:18px}.ncr-seo-feature-grid{grid-template-columns:1fr}}
    </style>`;

for (const page of pages) {
  const pageUrl = `${canonicalOrigin}${page.path}`;
  let html = baseHtml;
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
  html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${escapeHtml(pageUrl)}" />`);
  html = replaceMeta(html, 'name:description', page.description);
  html = replaceMeta(html, 'name:robots', 'index, follow, max-image-preview:large');
  html = replaceMeta(html, 'property:og:url', pageUrl);
  html = replaceMeta(html, 'property:og:title', page.title);
  html = replaceMeta(html, 'property:og:description', page.description);
  html = replaceMeta(html, 'property:og:image:alt', `NCR Suite ${page.name}, logiciel de gestion métier`);
  html = replaceMeta(html, 'name:twitter:title', page.title);
  html = replaceMeta(html, 'name:twitter:description', page.description);
  html = html.replace('</head>', `${prerenderStyle}\n    <script type="application/ld+json" data-ncr-page-structured-data>${escapeJsonForHtml(buildStructuredData(page))}</script>\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${buildPrerenderedContent(page)}</div>`);

  const outputName = `${page.path.replace(/^\/+/, '')}.html`;
  fs.writeFileSync(path.join(dist, outputName), html);
}

const sitemapEntries = [
  { path: '/', priority: '1.0' },
  ...pages.map((page) => ({ path: page.path, priority: '0.9' }))
].map((entry) => `  <url>
    <loc>${canonicalOrigin}${entry.path}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n');

fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</urlset>
`);

console.log(`SEO NCR Suite : ${pages.length} pages metier et sitemap generes.`);
