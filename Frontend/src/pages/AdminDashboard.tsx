import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { RequireAuth } from '../components/Protected';

function AdminInner() {
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [tab, setTab] = useState('dashboard');
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', stock: '', category: '', is_published: true, is_featured: false, primary_image: '', gallery: [] as string[] });
  const [editingProduct, setEditingProduct] = useState<any>(null);

  async function load() {
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
  }
  useEffect(() => { load(); const t=setInterval(load,30000); return ()=>clearInterval(t); }, []);

  const tabs = ['dashboard','products','orders','bookings','applications','customers','managers'];

  async function saveProduct(e: any) {
    e.preventDefault();
    const payload = { ...productForm, price: Number(productForm.price), stock: Number(productForm.stock), primary_image: productForm.primary_image || null, gallery: productForm.gallery };
    if (editingProduct) await api.patch(`/demo/products/${editingProduct.id}/`, payload);
    else await api.post('/demo/products/', payload);
    setProductForm({ name: '', description: '', price: '', stock: '', category: '', is_published: true, is_featured: false, primary_image: '', gallery: [] });
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

  async function updateBookingStatus(id: string, status: string) {
    await api.patch(`/demo/bookings/${id}/`, { status });
    load();
  }

  async function updateApplication(id: string, status: string, notes?: string) {
    await api.patch(`/demo/applications/${id}/`, { status, internal_notes: notes });
    load();
  }

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
        <div className="space-y-4">
          <form onSubmit={saveProduct} className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-2">
            <input className="input" placeholder="Name" value={productForm.name} onChange={e=>setProductForm({...productForm, name: e.target.value})} required />
            <input className="input" placeholder="Price" type="number" step="0.01" value={productForm.price} onChange={e=>setProductForm({...productForm, price: e.target.value})} required />
            <input className="input" placeholder="Stock" type="number" value={productForm.stock} onChange={e=>setProductForm({...productForm, stock: e.target.value})} required />
            <input className="input" placeholder="Category" value={productForm.category} onChange={e=>setProductForm({...productForm, category: e.target.value})} />
            <input className="input md:col-span-2" placeholder="Description" value={productForm.description} onChange={e=>setProductForm({...productForm, description: e.target.value})} />
            <label className="text-xs">Primary image
              <select className="input" value={productForm.primary_image} onChange={e=>setProductForm({...productForm, primary_image: e.target.value})}>
                <option value="">None</option>
                {mediaAssets.filter(m=>m.category==='image').map(m => <option key={m.id} value={m.id}>{m.original_filename}</option>)}
              </select>
            </label>
            <label className="text-xs">Gallery
              <select multiple className="input" value={productForm.gallery} onChange={e=>setProductForm({...productForm, gallery: Array.from(e.target.selectedOptions, o=>o.value)})}>
                {mediaAssets.filter(m=>m.category==='image').map(m => <option key={m.id} value={m.id}>{m.original_filename}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={productForm.is_published} onChange={e=>setProductForm({...productForm, is_published: e.target.checked})} /> Published</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={productForm.is_featured} onChange={e=>setProductForm({...productForm, is_featured: e.target.checked})} /> Featured</label>
            <button className="btn" type="submit">{editingProduct ? 'Update' : 'Create'} product</button>
          </form>
          <div className="card p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th>Name</th><th>Price</th><th>Stock</th><th>Published</th><th></th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-t border-[var(--border)]">
                    <td>{p.name}</td><td>${p.price}</td><td>{p.stock}</td><td>{p.is_published?'Yes':'No'}</td>
                    <td className="space-x-2">
                      <button className="text-xs" onClick={()=>{setEditingProduct(p); setProductForm({name:p.name, description:p.description||'', price:p.price, stock:p.stock, category:p.category||'', is_published:p.is_published, is_featured:p.is_featured, primary_image: p.primary_image || '', gallery: p.gallery || []});}}>Edit</button>
                      <button className="text-xs text-red-400" onClick={()=>deleteProduct(p.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="card p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th>ID</th><th>Status</th><th>Total</th><th>Date</th><th>Update</th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-t border-[var(--border)]">
                  <td>{o.id}</td><td>{o.status}</td><td>${o.total}</td><td>{new Date(o.order_date).toLocaleDateString()}</td>
                  <td>
                    <select className="input text-xs" value={o.status} onChange={e=>updateOrderStatus(o.id, e.target.value)}>
                      {['new','pending','processing','paid','shipped','completed','cancelled','refunded'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'bookings' && (
        <div className="card p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th>Service</th><th>Date</th><th>Time</th><th>Status</th><th>Update</th></tr></thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} className="border-t border-[var(--border)]">
                  <td>{b.service_name}</td><td>{b.date}</td><td>{b.time}</td><td>{b.status}</td>
                  <td>
                    <select className="input text-xs" value={b.status} onChange={e=>updateBookingStatus(b.id, e.target.value)}>
                      {['pending','confirmed','rescheduled','cancelled','completed'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'applications' && (
        <div className="card p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th>Type</th><th>Applicant</th><th>Status</th><th>Update</th></tr></thead>
            <tbody>
              {applications.map(a => (
                <tr key={a.id} className="border-t border-[var(--border)]">
                  <td>{a.application_type}</td><td>{a.applicant_name}</td><td>{a.status}</td>
                  <td>
                    <select className="input text-xs" value={a.status} onChange={e=>updateApplication(a.id, e.target.value, a.internal_notes)}>
                      {['new','reviewing','approved','rejected','closed'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-[var(--muted)] mt-2">Internal notes are managed via API and never exposed to customers.</p>
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
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return <RequireAuth><AdminInner /></RequireAuth>;
}