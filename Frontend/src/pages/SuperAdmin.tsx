import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { RequireAuth, RequireSuper } from '../components/Protected';
import Icon from '../components/Icon';

function SuperInner() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [security, setSecurity] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [mediaHealth, setMediaHealth] = useState<any>(null);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [auditFilter, setAuditFilter] = useState('');
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/platform/analytics/').then(r => setAnalytics(r.data)).catch(() => {}),
      api.get('/platform/users/').then(r => setUsers(r.data.results || r.data)).catch(() => {}),
      api.get('/platform/audit/').then(r => setAudit(r.data.results || r.data)).catch(() => {}),
      api.get('/platform/security-events/').then(r => setSecurity(r.data.results || r.data)).catch(() => {}),
      api.get('/platform/health/').then(r => setHealth(r.data)).catch(() => {}),
      api.get('/platform/media-health/').then(r => setMediaHealth(r.data)).catch(() => {}),
      api.get('/platform/contact-messages/').then(r => setContactMessages(r.data.results || r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const tabs = ['overview', 'users', 'audit', 'security', 'health', 'contact'];

  async function suspendUser(id: string) {
    await api.post(`/platform/users/${id}/suspend/`);
    const r = await api.get('/platform/users/');
    setUsers(r.data.results || r.data);
  }

  async function reactivateUser(id: string) {
    await api.post(`/platform/users/${id}/reactivate/`);
    const r = await api.get('/platform/users/');
    setUsers(r.data.results || r.data);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-64" />
        <div className="grid md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Super Admin Control Centre</h1>
        <span className="badge badge-info">Genuine Platform Data</span>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-[var(--border)]">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Platform Events', value: analytics?.total_events || 0, icon: 'analytics-reporting' },
              { label: 'Registered Accounts', value: users.length, icon: 'metric-customers' },
              { label: 'Recent Registrations (30d)', value: analytics?.recent_registrations_30d || 0, icon: 'analytics-reporting' },
              { label: 'Audit Entries', value: audit.length, icon: 'content-management' },
            ].map((s, i) => (
              <div key={i} className="card p-5">
                <div className="mb-2"><Icon name={s.icon} size={24} /></div>
                <div className="text-2xl font-bold text-[var(--accent)]">{s.value}</div>
                <div className="text-sm text-[var(--text-muted)]">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="card p-4 text-xs text-[var(--text-muted)]">
            Registered accounts and login-based estimates are genuine platform data. Simulated workspace data is never included.
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="card p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 text-[var(--text-secondary)]">Email</th>
                <th className="text-left py-2 px-3 text-[var(--text-secondary)]">Role</th>
                <th className="text-left py-2 px-3 text-[var(--text-secondary)]">Active</th>
                <th className="text-left py-2 px-3 text-[var(--text-secondary)]">Created</th>
                <th className="text-left py-2 px-3 text-[var(--text-secondary)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-[var(--border)]">
                  <td className="py-2 px-3">{u.email}</td>
                  <td className="py-2 px-3"><span className={`badge ${u.is_superadmin ? 'badge-accent' : 'badge-info'}`}>{u.role}</span></td>
                  <td className="py-2 px-3">{u.is_active ? 'Yes' : 'No'}</td>
                  <td className="py-2 px-3 text-[var(--text-muted)]">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="py-2 px-3">
                    {!u.is_superadmin && (
                      u.is_active
                        ? <button onClick={() => suspendUser(u.id)} className="text-xs text-[var(--error)] hover:underline">Suspend</button>
                        : <button onClick={() => reactivateUser(u.id)} className="text-xs text-[var(--success)] hover:underline">Reactivate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'audit' && (
        <div className="card p-4">
          <input className="input mb-4" placeholder="Filter action" value={auditFilter} onChange={e => setAuditFilter(e.target.value)} />
          <div className="space-y-2">
            {audit.filter((a: any) => !auditFilter || a.action?.includes(auditFilter)).map((a: any) => (
              <div key={a.id} className="py-2 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{a.action}</span>
                  <span className="text-xs text-[var(--text-muted)]">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                <div className="text-xs text-[var(--text-secondary)]">{a.target} · {a.outcome}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-3">
          {security.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="mb-3 flex justify-center"><Icon name="security-infrastructure" size={48} /></div>
              <p className="text-[var(--text-muted)]">No security events.</p>
            </div>
          ) : security.map((s: any) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{s.event_type}</span>
                <span className="text-xs text-[var(--text-muted)]">{new Date(s.created_at).toLocaleString()}</span>
              </div>
              <div className="text-sm text-[var(--text-secondary)]">{s.ip_address} · {s.user_agent?.slice(0, 60)}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'contact' && (
        <div className="space-y-3">
          {contactMessages.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="mb-3 flex justify-center"><Icon name="content-management" size={48} /></div>
              <p className="text-[var(--text-muted)]">No contact messages yet.</p>
            </div>
          ) : contactMessages.map((m: any) => (
            <div key={m.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium">{m.name}</span>
                  <span className="text-sm text-[var(--text-secondary)] ml-2">&lt;{m.email}&gt;</span>
                </div>
                <span className="text-xs text-[var(--text-muted)]">{new Date(m.created_at).toLocaleString()}</span>
              </div>
              {m.subject && <div className="text-sm font-medium mb-1">{m.subject}</div>}
              <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{m.message}</div>
              <div className="mt-2 flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <span>IP: {m.ip_address}</span>
                <span className={m.email_sent ? 'text-[var(--success)]' : 'text-[var(--error)]'}>
                  {m.email_sent ? 'Email sent ✓' : 'Email not sent'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'health' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="font-semibold mb-3">Application Health</h3>
            {health ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Database</span><span className={`badge ${health.database === 'ok' ? 'badge-success' : 'badge-error'}`}>{health.database}</span></div>
              </div>
            ) : <p className="text-[var(--text-muted)]">Loading...</p>}
          </div>
          <div className="card p-5">
            <h3 className="font-semibold mb-3">Media Health</h3>
            {mediaHealth ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Total Assets</span><span className="font-medium">{mediaHealth.total_assets}</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Storage</span><span className="font-medium">{(mediaHealth.total_storage_bytes / 1024 / 1024).toFixed(2)} MB</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Images</span><span className="font-medium">{mediaHealth.image_count}</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Documents</span><span className="font-medium">{mediaHealth.document_count}</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Videos</span><span className="font-medium">{mediaHealth.video_count}</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Processing Failures</span><span className={`font-medium ${mediaHealth.processing_failures > 0 ? 'text-[var(--error)]' : ''}`}>{mediaHealth.processing_failures}</span></div>
              </div>
            ) : <p className="text-[var(--text-muted)]">Loading...</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuperAdmin() {
  return <RequireAuth><RequireSuper><SuperInner /></RequireSuper></RequireAuth>;
}