import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { RequireAuth, RequireSuper } from '../components/Protected';

function SuperInner() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [security, setSecurity] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [mediaHealth, setMediaHealth] = useState<any>(null);
  const [auditFilter, setAuditFilter] = useState('');
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    api.get('/platform/analytics/').then(r => setAnalytics(r.data));
    api.get('/platform/users/').then(r => setUsers(r.data.results || r.data));
    api.get('/platform/audit/').then(r => setAudit(r.data.results || r.data));
    api.get('/platform/security-events/').then(r => setSecurity(r.data.results || r.data));
    api.get('/platform/health/').then(r => setHealth(r.data));
    api.get('/platform/media-health/').then(r => setMediaHealth(r.data));
  }, []);

  const tabs = ['overview','users','audit','security','health'];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Super Admin Control Centre (Genuine Platform Data)</h1>
      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map(t => <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1 rounded ${tab===t?'bg-[var(--accent)] text-white':'bg-[var(--surface-2)]'}`}>{t}</button>)}
      </div>

      {tab === 'overview' && analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card p-3"><div className="text-xs text-[var(--muted)]">Total platform events</div><div className="text-xl font-bold">{analytics.total_events}</div></div>
          <div className="card p-3"><div className="text-xs text-[var(--muted)]">Registered accounts (confirmed)</div><div className="text-xl font-bold">{users.length}</div></div>
          {analytics && <div className="card p-3"><div className="text-xs text-[var(--muted)]">Recent registrations (30d)</div><div className="text-xl font-bold">{analytics.recent_registrations_30d}</div></div>}
          {analytics && <div className="card p-3"><div className="text-xs text-[var(--muted)]">Active users estimate (login-based)</div><div className="text-xl font-bold">{analytics.active_users_estimate_30d}</div></div>}
          {analytics && <div className="card p-3"><div className="text-xs text-[var(--muted)]">Active sessions estimate</div><div className="text-xl font-bold">{analytics.active_sessions_estimate}</div></div>}
          <div className="card p-3"><div className="text-xs text-[var(--muted)]">Audit entries</div><div className="text-xl font-bold">{audit.length}</div></div>
          <div className="card p-3"><div className="text-xs text-[var(--muted)]">Security events</div><div className="text-xl font-bold">{security.length}</div></div>
          {mediaHealth && <div className="card p-3"><div className="text-xs text-[var(--muted)]">Platform media assets</div><div className="text-xl font-bold">{mediaHealth.total_assets}</div></div>}
          <div className="col-span-full text-xs text-[var(--muted)]">Registered accounts and login-based estimates are genuine platform data. Anonymous visitor analytics are only recorded when tracked events exist. Simulated workspace data is never included.</div>
        </div>
      )}

      {tab === 'users' && (
        <div className="card p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th>Email</th><th>Role</th><th>Active</th><th>Created</th></tr></thead>
            <tbody>
              {users.map(u => <tr key={u.id} className="border-t border-[var(--border)]"><td>{u.email}</td><td>{u.role}</td><td>{u.is_active?'Yes':'No'}</td><td>{new Date(u.created_at).toLocaleDateString()}</td><td>{!u.is_superadmin && (u.is_active ? <button className="text-xs text-red-400" onClick={async()=>{await api.post(`/platform/users/${u.id}/suspend/`); const r=await api.get('/platform/users/'); setUsers(r.data.results||r.data);}}>Suspend</button> : <button className="text-xs" onClick={async()=>{await api.post(`/platform/users/${u.id}/reactivate/`); const r=await api.get('/platform/users/'); setUsers(r.data.results||r.data);}}>Reactivate</button>)}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'audit' && (
        <div className="card p-4">
          <input className="input mb-3" placeholder="Filter action" value={auditFilter} onChange={e=>setAuditFilter(e.target.value)} />
          <ul className="text-sm space-y-1">
            {audit.filter(a => !auditFilter || a.action.includes(auditFilter)).map(a => <li key={a.id}>{new Date(a.created_at).toLocaleString()} — {a.actor?.email || 'system'} — {a.action} — {a.target}</li>)}
          </ul>
        </div>
      )}

      {tab === 'security' && (
        <div className="card p-4">
          <ul className="text-sm space-y-1">
            {security.map(s => <li key={s.id}>{new Date(s.created_at).toLocaleString()} — {s.event_type} — {s.ip_address}</li>)}
          </ul>
        </div>
      )}

      {tab === 'health' && health && (
        <div className="card p-4">
          <pre className="text-sm">{JSON.stringify(health, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default function SuperAdmin() {
  return <RequireAuth><RequireSuper><SuperInner /></RequireSuper></RequireAuth>;
}