import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const commands = [
    { label: 'Home', action: () => nav('/') },
    { label: 'Explore', action: () => nav('/explore') },
    { label: 'Customer Experience', action: () => nav('/customer') },
    { label: 'Projects', action: () => nav('/projects') },
    { label: 'Technologies', action: () => nav('/technologies') },
    { label: 'Contact', action: () => nav('/contact') },
    { label: 'Media Library', action: () => nav('/media') },
  ];
  if (user) {
    commands.push({ label: 'Workspace Admin', action: () => nav('/admin') });
    commands.push({ label: 'My Orders', action: () => nav('/customer') });
  }
  if (user?.is_superadmin) {
    commands.push({ label: 'Super Admin', action: () => nav('/superadmin') });
  }

  const filtered = commands.filter(c => c.label.toLowerCase().includes(q.toLowerCase()));

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-24" onClick={()=>setOpen(false)}>
      <div className="card p-4 w-full max-w-lg" onClick={e=>e.stopPropagation()}>
        <input className="input" autoFocus placeholder="Search commands…" value={q} onChange={e=>setQ(e.target.value)} />
        <ul className="mt-3 max-h-64 overflow-auto">
          {filtered.map((c, i) => (
            <li key={i}>
              <button className="w-full text-left px-3 py-2 hover:bg-[var(--surface-2)] rounded" onClick={()=>{ c.action(); setOpen(false); setQ(''); }}>
                {c.label}
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="text-[var(--muted)] text-sm px-3 py-2">No commands.</li>}
        </ul>
      </div>
    </div>
  );
}