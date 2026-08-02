type PagesContext = {
  request: Request;
  env: { NCR_CANONICAL_REDIRECT_ENABLED?: string };
  next: () => Promise<Response>;
};

export const onRequest = async (context: PagesContext) => {
  const url = new URL(context.request.url);
  const canonicalRedirectEnabled = context.env.NCR_CANONICAL_REDIRECT_ENABLED === 'true';
  const legacyHost = url.hostname === 'ncrsuite.pages.dev';
  const wwwHost = url.hostname === 'www.ncr-suite.fr';
  const normalizedPath = url.pathname.replace(/\/+$/, '') || '/';
  const indexablePaths = new Set([
    '/',
    '/logiciel-gestion-formation',
    '/logiciel-securite-privee',
    '/logiciel-entreprise-nettoyage',
    '/logiciel-gestion-restaurant',
    '/logiciel-coiffure',
  ]);
  const publicAssetPrefixes = ['/assets/', '/brand/', '/icons/', '/og/'];
  const publicAssetPaths = new Set([
    '/favicon.ico',
    '/favicon.png',
    '/favicon-48x48.png',
    '/favicon-96x96.png',
    '/apple-touch-icon.png',
    '/manifest.webmanifest',
    '/robots.txt',
    '/sitemap.xml',
    '/sw.js',
  ]);
  const publicAssetExtension = /\.(?:css|js|mjs|png|jpe?g|webp|gif|svg|ico|xml|txt|webmanifest|woff2?|ttf|map)$/i;
  const isPublicAsset = publicAssetPaths.has(normalizedPath)
    || publicAssetPrefixes.some((prefix) => normalizedPath.startsWith(prefix))
    || publicAssetExtension.test(normalizedPath);

  if (canonicalRedirectEnabled && (legacyHost || wwwHost)) {
    url.protocol = 'https:';
    url.hostname = 'ncr-suite.fr';
    url.port = '';
    return Response.redirect(url.toString(), 301);
  }

  const response = await context.next();
  const headers = new Headers(response.headers);
  if (!indexablePaths.has(normalizedPath) && !isPublicAsset) headers.set('X-Robots-Tag', 'noindex, nofollow');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
