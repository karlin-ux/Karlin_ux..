import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../auth/ThemeContext';
import CommandPalette from '../components/CommandPalette';
import Assistant from '../components/Assistant';
import VoiceNav from '../components/VoiceNav';

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] sticky top-0 z-40 backdrop-blur bg-[var(--bg)]/80">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="font-bold text-lg">Karlin_ux</Link>
          <nav className="flex gap-3 text-sm">
            <Link to="/explore">Explore</Link>
            <Link to="/customer">Customer</Link>
            {user && <Link to="/admin">Admin</Link>}
            {user && <Link to="/media">Media</Link>}
            {user?.is_superadmin && <Link to="/superadmin">Super Admin</Link>}
            <Link to="/projects">Projects</Link>
            <Link to="/technologies">Technologies</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={toggle} className="text-sm">{theme === 'dark' ? 'Light' : 'Dark'}</button>
            {user ? (
              <>
                <span className="text-xs text-[var(--muted)]">{user.email}</span>
                <button className="btn text-xs" onClick={async ()=>{await logout(); nav('/');}}>Sign out</button>
              </>
            ) : (
              <>
                <Link to="/signin" className="btn text-xs">Sign In</Link>
                <Link to="/register" className="text-xs">Register</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
      <CommandPalette />
      <Assistant />
      <VoiceNav />
    </div>
  );
}