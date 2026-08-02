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

  if (canonicalRedirectEnabled && (legacyHost || wwwHost)) {
    url.protocol = 'https:';
    url.hostname = 'ncr-suite.fr';
    url.port = '';
    return Response.redirect(url.toString(), 301);
  }

  const response = await context.next();
  const headers = new Headers(response.headers);
  const contentType = (headers.get('Content-Type') || '').toLowerCase();
  const isHtmlResponse = contentType.includes('text/html');

  // Le noindex doit protéger uniquement les écrans HTML privés de l'application.
  // Il ne doit jamais être envoyé sur les favicons, images, fichiers CSS/JS,
  // robots.txt, sitemap.xml ou autres ressources publiques.
  if (isHtmlResponse && !indexablePaths.has(normalizedPath)) {
    headers.set('X-Robots-Tag', 'noindex, nofollow');
  } else if (!isHtmlResponse) {
    headers.delete('X-Robots-Tag');
  }

  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
