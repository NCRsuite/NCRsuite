import { useEffect } from 'react';
import App from './App';
import { gsap } from './components/useReveal';
import css from './styles.scoped.css?inline';

let mountedHomes = 0;

/** Uses the application's React instance; no second React root or global
 * ReactDOM listeners. CSS belongs to this subtree and leaves with it. */
export function PublicHome({ navigate }: { navigate: (path: string) => void }) {
  useEffect(() => {
    mountedHomes++;
    return () => {
      mountedHomes--;
      // All child effect cleanups finish in this commit before sleeping GSAP.
      queueMicrotask(() => {
        if (mountedHomes === 0) { gsap.globalTimeline.clear(); gsap.ticker.sleep(); }
      });
    };
  }, []);
  const onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (!link || link.target || link.hasAttribute('download') || link.getAttribute('href')?.startsWith('#')) return;
    const url = new URL(link.href, location.href);
    if (url.origin === location.origin) { event.preventDefault(); navigate(url.pathname + url.search + url.hash); }
  };
  return <div onClick={onClick}><style data-ncr-public-home="true">{css}</style><App /></div>;
}
