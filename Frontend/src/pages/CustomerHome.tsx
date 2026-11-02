import { useEffect, useState } from 'react';
import { api } from '../api/client';

interface Product { id: string; name: string; description: string; price: string; stock: number; category: string; is_published: boolean; is_featured: boolean; primary_image?: any; }

export default function CustomerHome() {
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [cart, setCart] = useState<any>(null);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('name');
  const [view, setView] = useState<'grid'|'list'>('grid');
  const [tab, setTab] = useState('catalogue');
  const [bookingForm, setBookingForm] = useState({ service_name: '', service: '', date: '', time: '10:00', customer_name: '', customer_email: '' });
  const [appForm, setAppForm] = useState({ application_type: 'enquiry', applicant_name: '', applicant_email: '', subject: '', message: '' });
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
  const [checkoutInfo, setCheckoutInfo] = useState({ customer_name: '', delivery_option: 'collection', delivery_details: '' });
  const [status, setStatus] = useState('');

  useEffect(() => { localStorage.setItem('cart', JSON.stringify(cart)); }, [cart]);

  async function loadCart() { try { const c = await api.get('/demo/cart/'); setCart(c.data); } catch {} }
  async function load() {
    const p = await api.get('/demo/products/');
    setProducts((p.data.results || p.data).filter((x: any) => x.is_published !== false));
    const s = await api.get('/demo/services/');
    setServices(s.data.results || s.data);
    const o = await api.get('/demo/orders/');
    setOrders(o.data.results || o.data);
    const b = await api.get('/demo/bookings/');
    setBookings(b.data.results || b.data);
    const n = await api.get('/demo/notifications/');
    setNotifications((n.data.results || n.data).filter((x: any) => x.recipient_type === 'customer'));
  }
  useEffect(() => { load(); loadCart(); const t=setInterval(()=>{load();loadCart();},30000); return ()=>clearInterval(t); }, []);

  async function addToCart(p: Product) {
    await api.post('/demo/cart/add/', { product_id: p.id, quantity: 1 });
    loadCart();
  }

  async function updateQty(id: string, qty: number) {
    // find cart item id
    const item = cart?.items?.find((i: any) => i.product === id || i.product?.id === id);
    if (!item) return;
    if (qty < 1) { await api.delete(`/demo/cart/item/${item.id}/delete/`); }
    else { await api.patch(`/demo/cart/item/${item.id}/`, { quantity: qty }); }
    loadCart();
  }

  const filtered = products
    .filter(p => (!q || p.name.toLowerCase().includes(q.toLowerCase())) && (!category || p.category === category))
    .sort((a, b) => sort === 'price' ? Number(a.price) - Number(b.price) : a.name.localeCompare(b.name));

  const cartItems = cart?.items || [];
  const cartTotal = cartItems.reduce((s: number, c: any) => s + Number(c.unit_price) * c.quantity, 0);

  async function submitBooking(e: any) {
    e.preventDefault();
    try {
      await api.post('/demo/bookings/', {
        service_name: bookingForm.service_name,
        service: bookingForm.service || null,
        customer_name: bookingForm.customer_name,
        customer_email: bookingForm.customer_email,
        date: bookingForm.date,
        time: bookingForm.time,
      });
      setStatus('Booking submitted.');
      load();
    } catch (e: any) { setStatus(e?.response?.data?.detail || JSON.stringify(e?.response?.data) || 'Booking failed.'); }
  }

  async function uploadAttachment(e: any) {
    const files = e.target.files;
    if (!files) return;
    for (const f of Array.from(files) as File[]) {
      const fd = new FormData();
      fd.append('file', f);
      try { const r = await api.post('/media/upload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); setAttachmentIds(ids => [...ids, r.data.id]); }
      catch (err: any) { setStatus(err?.response?.data?.detail || 'Upload failed'); }
    }
  }
  async function submitApplication(e: any) {
    e.preventDefault();
    try {
      await api.post('/demo/customer-applications/', { ...appForm, attachments: attachmentIds });
      setStatus('Application submitted.');
      setAppForm({ application_type: 'enquiry', applicant_name: '', applicant_email: '', subject: '', message: '' });
      setAttachmentIds([]);
      load();
    } catch (e: any) { setStatus(e?.response?.data?.detail || JSON.stringify(e?.response?.data) || 'Application failed.'); }
  }

  async function checkout(e: any) {
    e.preventDefault();
    if (cart.length === 0) { setStatus('Cart is empty.'); return; }
    try {
      const r = await api.post('/demo/checkout/', {
        use_cart: true,
        customer_name: checkoutInfo.customer_name,
        delivery_option: checkoutInfo.delivery_option,
        delivery_details: checkoutInfo.delivery_details,
      });
      setStatus(`Order created: ${r.data.id} (simulated).`);
      setCart([]);
      load();
    } catch (e: any) { setStatus(e?.response?.data?.detail || 'Checkout failed.'); }
  }

  async function cancelBooking(id: string) {
    try { await api.patch(`/demo/bookings/${id}/`, { status: 'cancelled' }); load(); }
    catch (e: any) { setStatus('Cancel failed.'); }
  }

  async function markRead(id: string) {
    await api.post(`/demo/notifications/${id}/mark_read/`);
    load();
  }

  const tabs = ['catalogue','cart','checkout','orders','bookings','applications','notifications','account'];

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Customer Experience (Demo)</h1>
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1 rounded text-sm ${tab===t?'bg-[var(--accent)] text-white':'bg-[var(--surface-2)]'}`}>{t}</button>)}
      </div>
      {status && <p className="text-sm text-green-400">{status}</p>}

      {tab === 'catalogue' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input className="input max-w-xs" placeholder="Search products" value={q} onChange={e=>setQ(e.target.value)} />
            <select className="input max-w-xs" value={category} onChange={e=>setCategory(e.target.value)}>
              <option value="">All categories</option>
              {[...new Set(products.map(p=>p.category))].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="input max-w-xs" value={sort} onChange={e=>setSort(e.target.value)}>
              <option value="name">Sort: Name</option>
              <option value="price">Sort: Price</option>
            </select>
            <button className="btn text-xs" onClick={()=>setView(v=>v==='grid'?'list':'grid')}>View: {view}</button>
          </div>
          {view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {filtered.map(p => (
                <div key={p.id} className="card p-3">
                  {p.primary_image && <img src={`/api/media/${p.primary_image}/file/`} alt={p.name} className="w-full h-32 object-cover rounded mb-2" />}
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-sm text-[var(--muted)]">{p.description}</p>
                  <p className="mt-1 font-bold">${p.price} {p.stock <= 0 && <span className="text-red-400 text-xs">(Out of stock)</span>}</p>
                  <button className="btn text-xs mt-2" disabled={p.stock <= 0} onClick={()=>addToCart(p)}>Add to cart</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-2">
              <table className="w-full text-sm">
                <thead><tr><th>Name</th><th>Price</th><th>Stock</th><th></th></tr></thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-t border-[var(--border)]">
                      <td>{p.name}</td><td>${p.price}</td><td>{p.stock}</td>
                      <td><button className="btn text-xs" disabled={p.stock<=0} onClick={()=>addToCart(p)}>Add</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'cart' && (
        <div className="card p-4">
          <h2 className="text-xl font-semibold mb-3">Cart</h2>
          {cartItems.length === 0 && <p className="text-[var(--muted)]">Empty.</p>}
          <ul className="space-y-2">
            {cartItems.map((c: any) => (
              <li key={c.id} className="flex items-center gap-3">
                <span className="flex-1">{c.product_name}</span>
                <input type="number" min={1} className="input w-16" value={c.quantity} onChange={e=>updateQty(c.product, Number(e.target.value))} />
                <span>${(Number(c.unit_price)*c.quantity).toFixed(2)}</span>
                <button className="text-red-400 text-xs" onClick={()=>updateQty(c.product, 0)}>Remove</button>
              </li>
            ))}
          </ul>
          {cartItems.length > 0 && <p className="mt-3 font-bold">Subtotal: ${cartTotal.toFixed(2)}</p>}
        </div>
      )}

      {tab === 'checkout' && (
        <div className="card p-4 max-w-xl">
          <h2 className="text-xl font-semibold mb-3">Checkout (Simulated)</h2>
          <form onSubmit={checkout} className="space-y-3">
            <input className="input" placeholder="Customer name" value={checkoutInfo.customer_name} onChange={e=>setCheckoutInfo({...checkoutInfo, customer_name: e.target.value})} />
            <select className="input" value={checkoutInfo.delivery_option} onChange={e=>setCheckoutInfo({...checkoutInfo, delivery_option: e.target.value})}>
              <option value="collection">Collection</option>
              <option value="delivery">Delivery</option>
            </select>
            {checkoutInfo.delivery_option === 'delivery' && <textarea className="input" placeholder="Delivery details" value={checkoutInfo.delivery_details} onChange={e=>setCheckoutInfo({...checkoutInfo, delivery_details: e.target.value})} />}
            <p className="text-sm">Total: ${cartTotal.toFixed(2)} (simulated, no payment collected)</p>
            <button className="btn" type="submit" disabled={cart.length===0}>Confirm order</button>
          </form>
        </div>
      )}

      {tab === 'orders' && (
        <div className="card p-4">
          <h2 className="text-xl font-semibold mb-3">My Orders</h2>
          <ul className="space-y-2 text-sm">
            {orders.map(o => (
              <li key={o.id} className="border border-[var(--border)] rounded p-2">
                <div className="font-semibold">{o.id} — {o.status} — ${o.total}</div>
                <div className="text-[var(--muted)]">{new Date(o.order_date).toLocaleString()}</div>
                <ul className="ml-4 list-disc">
                  {o.items?.map((it: any) => <li key={it.id}>{it.product_name} x{it.quantity} @ ${it.unit_price}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'bookings' && (
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="text-xl font-semibold mb-3">Book a service</h2>
            <form onSubmit={submitBooking} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select className="input" value={bookingForm.service} onChange={e=>{const s=services.find(x=>x.id===e.target.value); setBookingForm({...bookingForm, service: e.target.value, service_name: s?.name || ''});}}>
                <option value="">Select service</option>
                {services.filter(s=>s.is_active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input className="input" type="date" value={bookingForm.date} onChange={e=>setBookingForm({...bookingForm, date: e.target.value})} required />
              <input className="input" type="time" value={bookingForm.time} onChange={e=>setBookingForm({...bookingForm, time: e.target.value})} required />
              <input className="input" placeholder="Your name" value={bookingForm.customer_name} onChange={e=>setBookingForm({...bookingForm, customer_name: e.target.value})} />
              <input className="input" placeholder="Your email" value={bookingForm.customer_email} onChange={e=>setBookingForm({...bookingForm, customer_email: e.target.value})} />
              <button className="btn" type="submit">Submit booking</button>
            </form>
          </div>
          <div className="card p-4">
            <h2 className="text-xl font-semibold mb-3">Calendar</h2>
            <div className="grid grid-cols-7 gap-1 text-xs">
              {Array.from({length: 30}, (_,i) => {
                const d = new Date(); d.setDate(d.getDate() + i);
                const iso = d.toISOString().slice(0,10);
                const has = bookings.some(b => b.date === iso);
                return <div key={iso} className={`p-2 rounded ${has?'bg-[var(--accent)] text-white':'bg-[var(--surface-2)]'}`}>{d.getDate()}</div>;
              })}
            </div>
          </div>
          <div className="card p-4">
            <h2 className="text-xl font-semibold mb-3">My bookings</h2>
            <ul className="space-y-2 text-sm">
              {bookings.map(b => (
                <li key={b.id} className="border border-[var(--border)] rounded p-2 flex justify-between">
                  <span>{b.service_name} — {b.date} {b.time} ({b.status})</span>
                  {b.status !== 'cancelled' && <button className="text-red-400 text-xs" onClick={()=>cancelBooking(b.id)}>Cancel</button>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === 'applications' && (
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="text-xl font-semibold mb-3">Submit application / enquiry</h2>
            <form onSubmit={submitApplication} className="space-y-3 max-w-xl">
              <select className="input" value={appForm.application_type} onChange={e=>setAppForm({...appForm, application_type: e.target.value})}>
                <option value="enquiry">Enquiry</option>
                <option value="job">Job</option>
                <option value="service">Service</option>
                <option value="membership">Membership</option>
              </select>
              <input className="input" placeholder="Name" value={appForm.applicant_name} onChange={e=>setAppForm({...appForm, applicant_name: e.target.value})} required />
              <input className="input" type="email" placeholder="Email" value={appForm.applicant_email} onChange={e=>setAppForm({...appForm, applicant_email: e.target.value})} required />
              <input className="input" placeholder="Subject" value={appForm.subject} onChange={e=>setAppForm({...appForm, subject: e.target.value})} />
              <textarea className="input" placeholder="Message" rows={4} value={appForm.message} onChange={e=>setAppForm({...appForm, message: e.target.value})} required />
              <input type="file" multiple onChange={uploadAttachment} />
              {attachmentIds.length > 0 && <p className="text-xs">{attachmentIds.length} attachment(s)</p>}
              <button className="btn" type="submit">Submit</button>
            </form>
          </div>
          <div className="card p-4">
            <h2 className="text-xl font-semibold mb-3">My applications</h2>
            <ul className="space-y-2 text-sm">
              {notifications.length === 0 && <li className="text-[var(--muted)]">None.</li>}
            </ul>
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="card p-4">
          <h2 className="text-xl font-semibold mb-3">Notifications</h2>
          <ul className="space-y-2 text-sm">
            {notifications.map(n => (
              <li key={n.id} className={`border border-[var(--border)] rounded p-2 ${n.is_read?'opacity-60':''}`}>
                <div className="font-semibold">{n.title}</div>
                <div className="text-[var(--muted)]">{n.message}</div>
                {!n.is_read && <button className="text-xs mt-1" onClick={()=>markRead(n.id)}>Mark read</button>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'account' && (
        <div className="card p-4 space-y-3">
          <h2 className="text-xl font-semibold mb-3">Account</h2>
          <form onSubmit={async (e)=>{e.preventDefault(); try { await api.patch('/auth/profile/', { display_name: (e.target as any).display_name.value }); setStatus('Profile updated.'); } catch { setStatus('Update failed.'); } }} className="space-y-2">
            <input name="display_name" className="input" placeholder="Display name" />
            <button className="btn text-xs" type="submit">Update profile</button>
          </form>
          <form onSubmit={async (e)=>{e.preventDefault(); const f=e.target as any; try { await api.post('/auth/change-password/', { old_password: f.old.value, new_password: f.new.value }); setStatus('Password changed.'); } catch { setStatus('Password change failed.'); } }} className="space-y-2">
            <input name="old" type="password" className="input" placeholder="Old password" />
            <input name="new" type="password" className="input" placeholder="New password" />
            <button className="btn text-xs" type="submit">Change password</button>
          </form>
          <button className="btn text-xs" style={{background:'#dc2626'}} onClick={async ()=>{ await api.post('/auth/request-deletion/'); setStatus('Deletion requested.'); }}>Request account deletion</button>
        </div>
      )}
    </div>
  );
}