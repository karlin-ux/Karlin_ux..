import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { RequireAuth } from '../components/Protected';
import Icon from '../components/Icon';

function AdminInner() {
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  // mediaAssets loaded but not currently displayed in UI
  const [_mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [tab, setTab] = useState('dashboard');
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', stock: '', category: '', is_published: true, is_featured: false, primary_image: '', gallery: [] as string[], model_3d: '' });
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [s, p, o, c, b, a, m, med] = await Promise.all([
        api.get('/demo/dashboard/'),
        api.get('/demo/products/'),
        api.get('/demo/orders/'),
        api.get('/demo/customers/'),
        api.get('/demo/bookings/'),
        api.get('/demo/applications/'),
        api.get('/demo/managers/'),
        api.get('/media/'),
      ]);
      setStats(s.data);
      setProducts(p.data.results || p.data);
      setOrders(o.data.results || o.data);
      setCustomers(c.data.results || c.data);
      setBookings(b.data.results || b.data);
      setApplications(a.data.results || a.data);
      setManagers(m.data.results || m.data);
      setMediaAssets(med.data.results || med.data);
    } catch (e) {
      console.error('Failed to load admin data', e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'analytics-reporting' },
    { id: 'products', label: 'Products', icon: 'catalogue' },
    { id: 'orders', label: 'Orders', icon: 'orders' },
    { id: 'bookings', label: 'Bookings', icon: 'bookings' },
    { id: 'applications', label: 'Applications', icon: 'applications' },
    { id: 'customers', label: 'Customers', icon: 'metric-customers' },
    { id: 'managers', label: 'Managers', icon: 'customer-experiences' },
  ];

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...productForm, price: Number(productForm.price), stock: Number(productForm.stock), primary_image: productForm.primary_image || null, gallery: productForm.gallery };
    if (editingProduct) await api.patch(`/demo/products/${editingProduct.id}/`, payload);
    else await api.post('/demo/products/', payload);
    setProductForm({ name: '', description: '', price: '', stock: '', category: '', is_published: true, is_featured: false, primary_image: '', gallery: [], model_3d: '' });
    setEditingProduct(null);
    load();
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete product?')) return;
    await api.delete(`/demo/products/${id}/`);
    load();
  }

  async function updateOrderStatus(id: string, status: string) {
    await api.patch(`/demo/orders/${id}/`, { status });
    load();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="grid md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workspace Admin</h1>
        <span className="badge badge-info">Simulated Data</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-[var(--border)]">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            <Icon name={t.icon} size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {tab === 'dashboard' && stats && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Products', value: stats.product_count || products.length, icon: 'catalogue' },
              { label: 'Orders', value: stats.order_count || orders.length, icon: 'orders' },
              { label: 'Customers', value: stats.customer_count || customers.length, icon: 'metric-customers' },
              { label: 'Revenue', value: `£${stats.revenue || '0.00'}`, icon: 'metric-revenue' },
            ].map((s, i) => (
              <div key={i} className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <Icon name={s.icon} size={24} />
                </div>
                <div className="text-2xl font-bold text-[var(--accent)]">{s.value}</div>
                <div className="text-sm text-[var(--text-muted)]">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="font-semibold mb-3">Recent Orders</h3>
              {orders.slice(0, 5).map((o: any) => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <span className="text-sm">#{o.id?.slice(0, 8)}</span>
                  <span className={`badge ${o.status === 'completed' ? 'badge-success' : o.status === 'cancelled' ? 'badge-error' : 'badge-warning'}`}>{o.status}</span>
                </div>
              ))}
              {orders.length === 0 && <p className="text-sm text-[var(--text-muted)]">No orders yet.</p>}
            </div>
            <div className="card p-5">
              <h3 className="font-semibold mb-3">Recent Bookings</h3>
              {bookings.slice(0, 5).map((b: any) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <span className="text-sm">{b.service_name}</span>
                  <span className={`badge ${b.status === 'cancelled' ? 'badge-error' : 'badge-info'}`}>{b.status}</span>
                </div>
              ))}
              {bookings.length === 0 && <p className="text-sm text-[var(--text-muted)]">No bookings yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {tab === 'products' && (
        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="font-semibold mb-4">{editingProduct ? 'Edit Product' : 'New Product'}</h3>
            <form onSubmit={saveProduct} className="grid md:grid-cols-2 gap-3">
              <input className="input" placeholder="Name" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} required />
              <input className="input" placeholder="Category" value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })} />
              <input className="input" placeholder="Price" type="number" step="0.01" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} required />
              <input className="input" placeholder="Stock" type="number" value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })} required />
              <textarea className="input md:col-span-2" placeholder="Description" rows={3} value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} />
              <div className="md:col-span-2 flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={productForm.is_published} onChange={e => setProductForm({ ...productForm, is_published: e.target.checked })} />
                  Published
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={productForm.is_featured} onChange={e => setProductForm({ ...productForm, is_featured: e.target.checked })} />
                  Featured
                </label>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <button type="submit" className="btn btn-primary">{editingProduct ? 'Update' : 'Create'}</button>
                {editingProduct && <button type="button" onClick={() => { setEditingProduct(null); setProductForm({ name: '', description: '', price: '', stock: '', category: '', is_published: true, is_featured: false, primary_image: '', gallery: [], model_3d: '' }); }} className="btn btn-secondary">Cancel</button>}
              </div>
            </form>
          </div>

          <div className="space-y-2">
            {products.map((p: any) => (
              <div key={p.id} className="card p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-[var(--text-secondary)]">£{p.price} · Stock: {p.stock} · {p.category}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingProduct(p); setProductForm({ name: p.name, description: p.description || '', price: p.price, stock: p.stock, category: p.category || '', is_published: p.is_published, is_featured: p.is_featured, primary_image: p.primary_image || '', gallery: p.gallery || [], model_3d: p.model_3d || '' }); }} className="btn btn-ghost text-sm">Edit</button>
                  <button onClick={() => deleteProduct(p.id)} className="btn btn-danger text-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="mb-3 flex justify-center"><Icon name="orders" size={48} /></div>
              <p className="text-[var(--text-muted)]">No orders yet.</p>
            </div>
          ) : orders.map((o: any) => (
            <div key={o.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Order #{o.id?.slice(0, 8)}</span>
                <select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)} className="input max-w-[140px] text-sm py-1">
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                {o.items?.length || 0} items · £{o.total || '0.00'} · {new Date(o.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bookings Tab */}
      {tab === 'bookings' && (
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="mb-3 flex justify-center"><Icon name="bookings" size={48} /></div>
              <p className="text-[var(--text-muted)]">No bookings yet.</p>
            </div>
          ) : bookings.map((b: any) => (
            <div key={b.id} className="card p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{b.service_name}</div>
                <div className="text-sm text-[var(--text-secondary)]">{b.date} at {b.time} · {b.duration_minutes}min · {b.status}</div>
              </div>
              <span className={`badge ${b.status === 'cancelled' ? 'badge-error' : b.status === 'completed' ? 'badge-success' : 'badge-info'}`}>{b.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Applications Tab */}
      {tab === 'applications' && (
        <div className="space-y-3">
          {applications.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="mb-3 flex justify-center"><Icon name="applications" size={48} /></div>
              <p className="text-[var(--text-muted)]">No applications yet.</p>
            </div>
          ) : applications.map((a: any) => (
            <div key={a.id} className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{a.subject || a.application_type}</span>
                <span className={`badge ${a.status === 'approved' ? 'badge-success' : a.status === 'rejected' ? 'badge-error' : 'badge-warning'}`}>{a.status}</span>
              </div>
              <div className="text-sm text-[var(--text-secondary)]">{a.applicant_name} · {a.applicant_email}</div>
            </div>
          ))}
        </div>
      )}

      {/* Customers Tab */}
      {tab === 'customers' && (
        <div className="space-y-3">
          {customers.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="mb-3 flex justify-center"><Icon name="metric-customers" size={48} /></div>
              <p className="text-[var(--text-muted)]">No customers yet.</p>
            </div>
          ) : customers.map((c: any) => (
            <div key={c.id} className="card p-4">
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-[var(--text-secondary)]">{c.email} · {c.category}</div>
            </div>
          ))}
        </div>
      )}

      {/* Managers Tab */}
      {tab === 'managers' && (
        <div className="space-y-3">
          {managers.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="mb-3 flex justify-center"><Icon name="customer-experiences" size={48} /></div>
              <p className="text-[var(--text-muted)]">No managers yet.</p>
            </div>
          ) : managers.map((m: any) => (
            <div key={m.id} className="card p-4">
              <div className="font-medium">{m.name}</div>
              <div className="text-sm text-[var(--text-secondary)]">{m.email} (active: {String(m.is_active)})</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return <RequireAuth><AdminInner /></RequireAuth>;
}