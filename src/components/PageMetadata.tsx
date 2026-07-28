import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { captureAcquisitionContext } from '../features/acquisition';

const CANONICAL_ORIGIN = 'https://ncr-suite.fr';

type PageMetadataProps = {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  imageAlt?: string;
  index?: boolean;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
};

function upsertMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function PageMetadata({
  title,
  description = 'NCR Suite centralise la gestion de votre entreprise dans une plateforme métier simple, modulaire et sécurisée.',
  path = '/',
  image = '/og/ncr-suite-og.png',
  imageAlt = 'NCR Suite, plateforme de gestion métier',
  index = false,
  structuredData
}: PageMetadataProps) {
  const location = useLocation();

  useEffect(() => {
    const canonicalUrl = new URL(path, CANONICAL_ORIGIN).href;
    const imageUrl = new URL(image, CANONICAL_ORIGIN).href;
    document.title = title;

    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[name="robots"]', 'name', 'robots', index ? 'index,follow,max-image-preview:large' : 'noindex,nofollow');
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'NCR Suite');
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', imageUrl);
    upsertMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', imageAlt);
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);
    upsertMeta('meta[name="twitter:image:alt"]', 'name', 'twitter:image:alt', imageAlt);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const existingStructuredData = document.head.querySelector<HTMLScriptElement>('script[data-ncr-page-structured-data]');
    if (structuredData) {
      const script = existingStructuredData ?? document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.ncrPageStructuredData = 'true';
      script.textContent = JSON.stringify(structuredData);
      if (!existingStructuredData) document.head.appendChild(script);
    } else {
      existingStructuredData?.remove();
    }
  }, [description, image, imageAlt, index, path, structuredData, title]);

  useEffect(() => {
    if (index) captureAcquisitionContext(location.pathname, location.search);
  }, [index, location.pathname, location.search]);

  return null;
}
