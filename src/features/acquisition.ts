export type AcquisitionContext = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  landingPath: string;
  referrer: string;
};

const STORAGE_KEY = 'ncr:acquisition-context-v1';

function clean(value: string | null | undefined, maxLength: number) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function externalReferrer() {
  try {
    if (!document.referrer) return '';
    const referrer = new URL(document.referrer);
    if (referrer.origin === window.location.origin) return '';
    return referrer.href;
  } catch {
    return '';
  }
}

export function captureAcquisitionContext(pathname: string, search: string) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(search);
  const hasCampaign = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']
    .some((key) => params.has(key));

  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing && !hasCampaign) return;

    const referrer = externalReferrer();
    const referrerHost = referrer ? new URL(referrer).hostname : '';
    const context: AcquisitionContext = {
      source: clean(params.get('utm_source') || referrerHost || 'direct', 80),
      medium: clean(params.get('utm_medium') || (referrerHost ? 'referral' : 'none'), 80),
      campaign: clean(params.get('utm_campaign'), 120),
      content: clean(params.get('utm_content'), 120),
      landingPath: clean(`${pathname}${search}`, 500),
      referrer: clean(referrer, 500)
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch {
    // Le suivi reste facultatif lorsque le stockage privé est indisponible.
  }
}

export function readAcquisitionContext(): AcquisitionContext {
  const fallback: AcquisitionContext = {
    source: 'direct',
    medium: 'none',
    campaign: '',
    content: '',
    landingPath: '',
    referrer: ''
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as Partial<AcquisitionContext>;
    return {
      source: clean(parsed.source, 80) || fallback.source,
      medium: clean(parsed.medium, 80) || fallback.medium,
      campaign: clean(parsed.campaign, 120),
      content: clean(parsed.content, 120),
      landingPath: clean(parsed.landingPath, 500),
      referrer: clean(parsed.referrer, 500)
    };
  } catch {
    return fallback;
  }
}
