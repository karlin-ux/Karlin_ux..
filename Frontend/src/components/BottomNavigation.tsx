import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

/**
 * Fixed bottom portfolio navigation dock.
 * Preserves existing top header/auth controls in Layout.
 */
const navLinks = [
  { key: 'home', label: 'Home', short: 'Home', to: '/' },
  { key: 'explore', label: 'Explore', short: 'Explore', to: '/explore' },
  { key: 'technologies', label: 'Technologies and Skills', short: 'Skills', to: '/technologies' },
  { key: 'projects', label: 'Featured Projects', short: 'Projects', to: '/projects' },
  { key: 'engineering', label: 'Engineering', short: 'Eng', to: '/engineering' },
  { key: 'about', label: 'About', short: 'About', to: '/about' },
  { key: 'contact', label: 'Contact', short: 'Contact', to: '/contact' },
];

function isActivePath(pathname: string, to: string) {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function BottomNavigationDock() {
  const location = useLocation();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4">
      <nav
        aria-label="Portfolio sections"
        className="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between gap-1 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]/92 p-1.5 shadow-lg backdrop-blur-xl sm:justify-center sm:gap-2 sm:p-2"
      >
        {navLinks.map((link) => {
          const active = isActivePath(location.pathname, link.to);
          return (
            <NavLink
              key={link.key}
              to={link.to}
              end={link.to === '/'}
              aria-current={active ? 'page' : undefined}
              className={({ isActive }) => {
                const on = active || isActive;
                return [
                  'relative shrink-0 rounded-xl border px-2.5 py-2 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 sm:px-3 sm:text-sm',
                  reducedMotion ? '' : 'transition-colors duration-200',
                  on
                    ? 'border-[var(--accent)]/35 bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--bg-surface)] hover:text-[var(--text)]',
                ].join(' ');
              }}
            >
              <span className="sm:hidden">{link.short}</span>
              <span className="hidden sm:inline">{link.label}</span>
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-[var(--accent)] sm:inset-x-4"
                />
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

export default BottomNavigationDock;
