/** Cache layout outside the render loop. Scroll frames read only scrollY. */
export function scrollGeometry(element: HTMLElement) {
  let top = 0, height = 1;
  const measure = () => { const r = element.getBoundingClientRect(); top = r.top + window.scrollY; height = r.height; };
  const observer = new ResizeObserver(measure);
  observer.observe(document.body); observer.observe(element);
  window.addEventListener("resize", measure, { passive: true });
  measure();
  return {
    story: () => Math.max(0, Math.min(1, (window.scrollY - top) / Math.max(1, height - window.innerHeight))),
    final: () => Math.max(0, Math.min(1, (window.innerHeight + window.scrollY - top) / Math.max(1, height))),
    dispose: () => { observer.disconnect(); window.removeEventListener("resize", measure); },
  };
}
