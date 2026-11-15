import { useEffect, useRef, useState } from 'react';

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

export function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reveal = () => setInView(true);
    if (typeof IntersectionObserver === 'undefined') {
      reveal();
      return;
    }
    // Fallback: if already in/near viewport on mount, reveal immediately
    const check = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.bottom > 0 && r.top < vh) reveal();
    };
    check();
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        reveal();
        obs.disconnect();
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px', ...options });
    obs.observe(el);
    // Extra safety for above-the-fold content
    const t = window.setTimeout(check, 60);
    const safety = window.setTimeout(reveal, 900);
    return () => { obs.disconnect(); window.clearTimeout(t); window.clearTimeout(safety); };
  }, [options?.root, options?.rootMargin, options?.threshold]);
  return { ref, inView };
}

export function useCountUp(target: number, active: boolean, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
}
