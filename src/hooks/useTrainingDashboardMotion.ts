import { useEffect, useRef, useState, type RefObject } from 'react';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function rounded(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function useAnimatedNumber(
  target: number | null,
  active: boolean,
  options: { duration?: number; decimals?: number } = {}
) {
  const duration = options.duration ?? 650;
  const decimals = options.decimals ?? 0;
  const previous = useRef(target ?? 0);
  const [display, setDisplay] = useState<number | null>(target);

  useEffect(() => {
    if (target == null) {
      setDisplay(null);
      return;
    }

    const from = previous.current;
    previous.current = target;

    if (!active || prefersReducedMotion() || from === target) {
      setDisplay(rounded(target, decimals));
      return;
    }

    let frame = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - ((1 - progress) ** 3);
      setDisplay(rounded(from + ((target - from) * eased), decimals));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, decimals, duration, target]);

  return display;
}

export function useTrainingDashboardMotion(rootRef: RefObject<HTMLElement | null>, periodKey: number) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    root.classList.add('ncr-dashboard-enhanced');
    const reduced = prefersReducedMotion();
    const revealTargets = Array.from(root.querySelectorAll<HTMLElement>(
      '.training-quality-alerts-panel, .training-quality-trend-panel, .training-quality-score-panel'
    ));

    revealTargets.forEach((element) => element.classList.add('ncr-dashboard-reveal'));

    let observer: IntersectionObserver | null = null;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      revealTargets.forEach((element) => element.classList.add('ncr-dashboard-inview'));
    } else {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).classList.add('ncr-dashboard-inview');
          observer?.unobserve(entry.target);
        });
      }, { threshold: 0.14, rootMargin: '0px 0px -7% 0px' });
      revealTargets.forEach((element) => observer?.observe(element));
    }

    const finePointer = !reduced && window.matchMedia('(pointer: fine)').matches;
    const tiltTargets = finePointer
      ? Array.from(root.querySelectorAll<HTMLElement>('.training-quality-stats .stat-card, .training-quality-trend-panel, .training-quality-score-panel'))
      : [];
    const cleanups: Array<() => void> = [];

    tiltTargets.forEach((element) => {
      element.classList.add('ncr-dashboard-tilt');
      const onMove = (event: PointerEvent) => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / Math.max(rect.width, 1);
        const y = (event.clientY - rect.top) / Math.max(rect.height, 1);
        element.style.setProperty('--ncr-dashboard-tilt-x', `${((0.5 - y) * 2.1).toFixed(2)}deg`);
        element.style.setProperty('--ncr-dashboard-tilt-y', `${((x - 0.5) * 2.1).toFixed(2)}deg`);
        element.classList.add('is-tilting');
      };
      const onLeave = () => {
        element.classList.remove('is-tilting');
        element.style.removeProperty('--ncr-dashboard-tilt-x');
        element.style.removeProperty('--ncr-dashboard-tilt-y');
      };
      element.addEventListener('pointermove', onMove);
      element.addEventListener('pointerleave', onLeave);
      cleanups.push(() => {
        element.removeEventListener('pointermove', onMove);
        element.removeEventListener('pointerleave', onLeave);
      });
    });

    return () => {
      observer?.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      root.classList.remove('ncr-dashboard-enhanced');
    };
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;

    root.classList.remove('ncr-dashboard-period-shift');
    void root.offsetWidth;
    root.classList.add('ncr-dashboard-period-shift');
    const timer = window.setTimeout(() => root.classList.remove('ncr-dashboard-period-shift'), 620);
    return () => window.clearTimeout(timer);
  }, [periodKey, rootRef]);
}
