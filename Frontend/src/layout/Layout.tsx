import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../auth/ThemeContext';
import GeometricParticleNetwork from '../components/effects/GeometricParticleNetwork';
import ScrollProgress from '../components/ScrollProgress';

// Karlin_ux design tokens: --accent, --accent-2, --accent-3
const NETWORK_COLORS = ['#53F5B0', '#5C9DFF', '#9B85FF'];

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/projects', label: 'Projects' },
  { to: '/contact', label: 'Contact' },
];

// Every header action shares the same pill shape and the same hover border so
// navigation and auth controls read as one consistent set.
const navItemBase =
  'inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors';

const navItemClass = (isActive: boolean) =>
  `${navItemBase} nav-magnetic ${
    isActive
      ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)] hover:border-[var(--accent)]/50'
      : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--accent)]/50 hover:text-[var(--text)]'
  }`;

const authLinkClass =
  'inline-flex items-center rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--text)]';

const authPrimaryClass =
  'inline-flex items-center rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-2 text-sm font-semibold text-[var(--accent)] transition-colors hover:border-[var(--accent)]/50';

const iconButtonClass =
  'rounded-lg border border-transparent p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--text)]';

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
  const [routeKey, setRouteKey] = useState(location.pathname);

  useEffect(() => {
    setRouteKey(location.pathname);
    mainRef.current?.scrollTo?.({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

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
          <GeometricParticleNetwork
            colors={NETWORK_COLORS}
            className="absolute inset-0 h-full w-full"
            density={1}
            opacity={0.9}
            interactive
          />
        </div>
      </div>

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 font-bold text-xl">
              <span className="text-gradient">Karlin_ux</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) => navItemClass(isActive)}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggle}
                className={iconButtonClass}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? '☀' : '☾'}
              </button>

              <div className="hidden items-center gap-2 md:flex">
                {user ? (
                  <>
                    {user.is_superadmin && (
                      <Link to="/superadmin" className={authLinkClass}>
                        Super Admin
                      </Link>
                    )}
                    <Link to="/customer" className={authLinkClass}>
                      Dashboard
                    </Link>
                    <button onClick={logout} className={authLinkClass}>
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/signin" className={authLinkClass}>
                      Sign In
                    </Link>
                    <Link to="/register" className={authPrimaryClass}>
                      Get Started
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`${iconButtonClass} md:hidden`}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-[var(--border)] bg-[var(--bg)] md:hidden">
            <nav className="space-y-1 px-4 py-3">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => `${navItemClass(isActive)} w-full`}
                >
                  {link.label}
                </NavLink>
              ))}

              <div className="my-2 border-t border-[var(--border)]" />

              {user ? (
                <>
                  {user.is_superadmin && (
                    <Link
                      to="/superadmin"
                      className={`${authLinkClass} w-full`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Super Admin
                    </Link>
                  )}
                  <Link
                    to="/customer"
                    className={`${authLinkClass} w-full`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className={`${authLinkClass} w-full`}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/signin"
                    className={`${authLinkClass} w-full`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className={`${authPrimaryClass} w-full`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main ref={mainRef} className="flex-1">
        <div key={routeKey} className="route-transition">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-[var(--text-muted)]">
          <p>© {new Date().getFullYear()} Karlin_ux. Built with Django, React, PostgreSQL, and Tailwind CSS.</p>
        </div>
      </footer>
    </div>
  );
}
