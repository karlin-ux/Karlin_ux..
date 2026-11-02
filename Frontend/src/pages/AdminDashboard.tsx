import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { RequireAuth } from '../components/Protected';

function AdminInner() {
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [tab, setTab] = useState('dashboard');

  useEffect(() => {
    api.get('/demo/dashboard/').then(r => setStats(r.data));
    api.get('/demo/products/').then(r => setProducts(r.data.results || r.data));
    api.get('/demo/orders/').then(r => setOrders(r.data.results || r.data));
    api.get('/demo/customers/').then(r => setCustomers(r.data.results || r.data));
    api.get('/demo/managers/').then(r => setManagers(r.data.results || r.data));
  }, []);

  const tabs = ['dashboard','products','orders','customers','managers','settings'];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Workspace Admin (Simulated Data)</h1>
      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map(t => <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1 rounded ${tab===t?'bg-[var(--accent)] text-white':'bg-[var(--surface-2)]'}`}>{t}</button>)}
      </div>

      {tab === 'dashboard' && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(stats).filter(([k])=>k!=='simulated').map(([k,v]) => (
            <div key={k} className="card p-3">
              <div className="text-xs text-[var(--muted)]">{k.replace(/_/g,' ')}</div>
              <div className="text-xl font-bold">{String(v)}</div>
            </div>
          ))}
          <div className="col-span-full text-xs text-yellow-300">All figures are simulated demonstration data.</div>
        </div>
      )}

      {tab === 'products' && (
        <div className="card p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th className="text-left">Name</th><th>Price</th><th>Stock</th><th>Active</th></tr></thead>
            <tbody>
              {products.map(p => <tr key={p.id} className="border-t border-[var(--border)]"><td>{p.name}</td><td>${p.price}</td><td>{p.stock}</td><td>{p.is_active?'Yes':'No'}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'orders' && (
        <div className="card p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th>ID</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
            <tbody>
              {orders.map(o => <tr key={o.id} className="border-t border-[var(--border)]"><td>{o.id}</td><td>{o.status}</td><td>${o.total}</td><td>{new Date(o.order_date).toLocaleDateString()}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'customers' && (
        <div className="card p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th>Name</th><th>Email</th><th>Category</th><th>Active</th></tr></thead>
            <tbody>
              {customers.map(c => <tr key={c.id} className="border-t border-[var(--border)]"><td>{c.name}</td><td>{c.email}</td><td>{c.category}</td><td>{c.is_active?'Yes':'No'}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'managers' && (
        <div className="card p-4">
          <ul className="text-sm">
            {managers.map(m => <li key={m.id}>{m.name} — {m.email} (active: {String(m.is_active)})</li>)}
          </ul>
          <p className="text-xs text-[var(--muted)] mt-2">Permissions matrix is configurable via API; demo managers are simulated identities.</p>
        </div>
      )}

      {tab === 'settings' && (
        <div className="card p-4 text-sm text-[var(--muted)]">
          Demonstration workspace settings (business name, logo, colours, etc.) affect only this workspace.
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return <RequireAuth><AdminInner /></RequireAuth>;
}