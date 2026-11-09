import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../auth/ThemeContext';
import GeometricParticleNetwork from '../components/effects/GeometricParticleNetwork';

// Karlin_ux design tokens: --accent, --accent-2, --accent-3
const NETWORK_COLORS = ['#53F5B0', '#5C9DFF', '#9B85FF'];

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/explore', label: 'Explore' },
  { to: '/projects', label: 'Projects' },
  { to: '/technologies', label: 'Technologies' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="karlin-particle-backdrop relative isolate min-h-screen flex flex-col">
      {/* Viewport-sized backdrop. The inner wrapper is position:relative so the
          canvas can fill it; the outer layer keeps the effect behind content. */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
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
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 font-bold text-xl">
              <span className="text-gradient">Karlin_ux</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)]'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Theme toggle */}
              <button
                onClick={toggle}
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)] transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? '☀' : '☾'}
              </button>

              {user ? (
                <div className="flex items-center gap-2">
                  {user.is_superadmin && (
                    <Link to="/superadmin" className="px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)] transition-colors">Super Admin</Link>
                  )}
                  <Link to="/customer" className="px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)] transition-colors">Dashboard</Link>
                  <button onClick={logout} className="px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)] transition-colors">Logout</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/signin" className="btn-ghost text-sm">Sign In</Link>
                  <Link to="/register" className="btn-primary text-sm">Get Started</Link>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)]"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg)]">
            <nav className="px-4 py-3 space-y-1">
              {navLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive
                        ? 'text-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              {user && (
                <>
                  <Link to="/customer" className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)] transition-colors" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                  {user.is_superadmin && (
                    <Link to="/superadmin" className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)] transition-colors" onClick={() => setMobileMenuOpen(false)}>Super Admin</Link>
                  )}
                  <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-surface)] transition-colors">Logout</button>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
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