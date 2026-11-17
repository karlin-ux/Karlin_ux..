import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import GeometricParticleNetwork from '../components/effects/GeometricParticleNetwork';
import ScrollProgress from '../components/ScrollProgress';

// Karlin_ux design tokens: --accent, --accent-2, --accent-3
const NETWORK_COLORS = ['#53F5B0', '#5C9DFF', '#9B85FF'];

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/projects', label: 'Projects' },
  { to: '/technologies', label: 'Skills' },
  { to: '/contact', label: 'Contact' },
];

// Every header action shares the same pill shape and the same hover border so
// navigation and auth controls read as one consistent set.
const navItemBase =
  'btn hero-cta-btn !min-w-0 inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors';

const navItemClass = (_isActive: boolean) =>
  `${navItemBase} nav-magnetic`;

const authLinkClass =
  'btn hero-cta-btn !min-w-0 inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors';

const authPrimaryClass =
  'btn hero-cta-btn !min-w-0 inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
  const [routeKey, setRouteKey] = useState(location.pathname);
  const [lightsOn, setLightsOn] = useState(
    typeof document !== 'undefined' && document.documentElement.classList.contains('lights-on')
  );

  useEffect(() => {
    const root = document.documentElement;
    // Ensure lights start off on load
    root.classList.remove('lights-on');
    root.classList.remove('lights-ready');
    const update = () => setLightsOn(root.classList.contains('lights-on'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const toggleLights = () => {
    const root = document.documentElement;
    const next = !root.classList.contains('lights-on');
    if (next) {
      root.classList.remove('lights-on');
      void root.offsetHeight;
      root.classList.add('lights-on');
    } else {
      root.classList.remove('lights-on');
      root.classList.remove('lights-ready');
    }
  };

  useEffect(() => {
    setRouteKey(location.pathname);
    mainRef.current?.scrollTo?.({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  // (warm-up animations start on toggle; no global loop sync needed)

  // Magnetic cursor on CTAs/buttons (respects reduced motion)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const selectors = '.btn, .nav-magnetic, a.neon-perimeter, button';
    let active: HTMLElement | null = null;
    const onMove = (e: MouseEvent) => {
      const t = (e.target as HTMLElement | null)?.closest?.(selectors) as HTMLElement | null;
      if (t !== active) {
        if (active) {
          active.style.setProperty('--mag-x', '0px');
          active.style.setProperty('--mag-y', '0px');
          active.classList.remove('is-magnetic');
        }
        active = t;
      }
      if (!active) return;
      const r = active.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 10;
      const y = ((e.clientY - r.top) / r.height - 0.5) * 8;
      active.style.setProperty('--mag-x', `${x.toFixed(2)}px`);
      active.style.setProperty('--mag-y', `${y.toFixed(2)}px`);
      active.classList.add('is-magnetic');
    };
    const onLeave = () => {
      if (active) {
        active.style.setProperty('--mag-x', '0px');
        active.style.setProperty('--mag-y', '0px');
        active.classList.remove('is-magnetic');
        active = null;
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseout', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
    };
  }, []);

  // Spotlight + tilt + parallax (delegated, respects reduced motion)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let lastY = 0;
    const onMove = (e: MouseEvent) => {
      const spot = (e.target as HTMLElement | null)?.closest?.('.spotlight-card') as HTMLElement | null;
      if (spot) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty('--spot-x', `${((e.clientX - r.left) / r.width) * 100}%`);
        spot.style.setProperty('--spot-y', `${((e.clientY - r.top) / r.height) * 100}%`);
      }
      const tilt = (e.target as HTMLElement | null)?.closest?.('.tilt-card') as HTMLElement | null;
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const rx = ((e.clientY - r.top) / r.height - 0.5) * -6;
        const ry = ((e.clientX - r.left) / r.width - 0.5) * 8;
        tilt.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
      }
    };
    const onOut = (e: MouseEvent) => {
      const tilt = (e.target as HTMLElement | null)?.closest?.('.tilt-card') as HTMLElement | null;
      if (tilt && !tilt.contains(e.relatedTarget as Node)) tilt.style.transform = '';
    };
    const onScroll = () => {
      lastY = window.scrollY || 0;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        document.querySelectorAll<HTMLElement>('.parallax-slow').forEach((el) => {
          const speed = Number(el.dataset.parallaxSpeed || 0.08);
          el.style.transform = `translate3d(0, ${Math.round(lastY * speed)}px, 0)`;
        });
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseout', onOut);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onOut);
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="karlin-particle-backdrop relative isolate min-h-screen flex flex-col">
      <ScrollProgress />
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[1]" aria-hidden="true" />
      {/* Viewport-sized backdrop. The inner wrapper is position:relative so the
          canvas can fill it; the outer layer keeps the effect behind content. */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="aurora-bg absolute inset-0" aria-hidden="true" />
        <div className="relative h-full w-full">
          {lightsOn && (
            <GeometricParticleNetwork
              colors={NETWORK_COLORS}
              className="absolute inset-0 h-full w-full"
              density={1}
              opacity={0.9}
              interactive
            />
          )}
        </div>
      </div>
      {/* Gradual reveal: hides everything (except lights switch) until lights warm up */}
      <div className="lights-blackout fixed inset-0 bg-[var(--bg)]" aria-hidden="true" />
      {!lightsOn && (
        <button
          type="button"
          onClick={toggleLights}
          className="fixed bottom-6 left-1/2 z-[1001] -translate-x-1/2 whitespace-nowrap rounded-2xl border-4 border-[#53F5B0] bg-black px-8 py-4 text-lg font-extrabold text-white shadow-[0_0_24px_rgba(83,245,176,0.7),0_0_48px_rgba(83,245,176,0.35)] sm:text-xl"
          style={{ color: '#FFFFFF', textShadow: '0 2px 0 #000, 0 0 4px #000' }}
          aria-pressed={lightsOn}
        >
          Turn the lights on
        </button>
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex min-h-16 w-full flex-wrap items-center justify-evenly gap-2 py-3 sm:gap-3" aria-label="Primary">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) => `${navItemClass(isActive)} whitespace-nowrap`}
              >
                {link.label}
              </NavLink>
            ))}
            {user ? (
              <>
                {user.is_superadmin && (
                  <Link to="/superadmin" className={`${authLinkClass} whitespace-nowrap`}>
                    Super Admin
                  </Link>
                )}
                <Link to="/customer" className={`${authLinkClass} whitespace-nowrap`}>
                  Dashboard
                </Link>
                <button onClick={logout} className={`${authLinkClass} whitespace-nowrap`}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/signin" className={`${authLinkClass} whitespace-nowrap`}>
                  Sign In
                </Link>
                <Link to="/register" className={`${authPrimaryClass} whitespace-nowrap`}>
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main ref={mainRef} className="flex-1">
        <div key={routeKey} className="route-transition">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 mt-12">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-[var(--text-muted)] sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Karlin_ux. Built with Django, React, PostgreSQL, and Tailwind CSS.</p>
        </div>
      </footer>
    </div>
  );
}
