import { useEffect } from 'react';

const CANONICAL_ORIGIN = 'https://ncr-suite.fr';

type PageMetadataProps = {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  index?: boolean;
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
  index = false
}: PageMetadataProps) {
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
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
  }, [description, image, index, path, title]);

  return null;
}
