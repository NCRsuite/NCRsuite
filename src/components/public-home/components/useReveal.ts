import { useEffect, type RefObject } from 'react';
import { gsap } from 'gsap';

// Importing the marketing module must not leave a ticker running if navigation
// cancels the mount. Individual tweens wake it only when needed.
gsap.ticker.sleep();

/** Same one-time entrances as V3, with a locally owned observer instead of
 * ScrollTrigger's process-wide scroll listeners. */
export function useReveal(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    const context = gsap.context(() => { gsap.set(items, { y: 28, opacity: 0 }); }, root);
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const element = entry.target as HTMLElement;
        context.add(() => {
          gsap.to(element, { y: 0, opacity: 1, duration: 0.9, delay: Number(element.dataset.delay || 0), ease: 'power3.out', clearProps: 'transform,opacity' });
        });
      }
    }, { rootMargin: `0px 0px -${Math.round(window.innerHeight * 0.1)}px 0px` });
    items.forEach(element => observer.observe(element));
    return () => { observer.disconnect(); context.revert(); };
  }, [ref]);
}

export { gsap };
