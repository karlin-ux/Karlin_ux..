import { useEffect, useState } from 'react';
import { api } from '../api/client';

interface Product { id: string; name: string; description: string; price: string; stock: number; category: string; is_published: boolean; is_featured: boolean; primary_image?: any; model_3d?: any; }

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
  const [loading, setLoading] = useState(true);

  useEffect(() => { localStorage.setItem('cart', JSON.stringify(cart)); }, [cart]);

  async function loadCart() { try { const c = await api.get('/demo/cart/'); setCart(c.data); } catch {} }
  async function load() {
    try {
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
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); loadCart(); const t = setInterval(() => { load(); loadCart(); }, 30000); return () => clearInterval(t); }, []);

  async function addToCart(p: Product) {
    await api.post('/demo/cart/add/', { product_id: p.id, quantity: 1 });
    loadCart();
  }

  async function updateQty(id: string, qty: number) {
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

  async function submitBooking(e: React.FormEvent) {
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
      setStatus('Booking submitted successfully.');
      load();
    } catch (e: any) { setStatus(e?.response?.data?.detail || JSON.stringify(e?.response?.data) || 'Booking failed.'); }
  }

  async function uploadAttachment(e: any) {
    const files = e.target.files;
    if (!files) return;
    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', f as File);
      try {
        const r = await api.post('/demo/media/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setAttachmentIds(prev => [...prev, r.data.id]);
      } catch {}
    }
  }

  async function submitApplication(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/demo/customer-applications/', { ...appForm, attachment_ids: attachmentIds });
      setStatus('Application submitted.');
      setAttachmentIds([]);
    } catch (e: any) { setStatus(e?.response?.data?.detail || 'Application failed.'); }
  }

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await api.post('/demo/checkout/', checkoutInfo);
      setStatus(`Order created: ${r.data.order_id || 'success'}`);
      loadCart();
      load();
    } catch (e: any) { setStatus(e?.response?.data?.detail || 'Checkout failed.'); }
  }

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const tabs = [
    { id: 'catalogue', label: 'Catalogue', icon: '🛍️' },
    { id: 'cart', label: 'Cart', icon: '🛒', badge: cartItems.length },
    { id: 'orders', label: 'Orders', icon: '📦' },
    { id: 'bookings', label: 'Bookings', icon: '📅' },
    { id: 'applications', label: 'Applications', icon: '📋' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', badge: notifications.filter(n => !n.is_read).length },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customer Dashboard</h1>
        {status && (
          <div className="px-4 py-2 rounded-lg bg-[var(--info-soft)] text-[var(--info)] text-sm">
            {status}
          </div>
        )}
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
            {t.icon} {t.label}
            {t.badge ? <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[var(--accent)] text-[var(--text-inverse)] text-xs">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* Catalogue Tab */}
      {tab === 'catalogue' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <input className="input max-w-xs" placeholder="Search products..." value={q} onChange={e => setQ(e.target.value)} />
            <select className="input max-w-[180px]" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="input max-w-[140px]" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="name">Name</option>
              <option value="price">Price</option>
            </select>
            <div className="flex gap-1 ml-auto">
              <button onClick={() => setView('grid')} className={`px-3 py-1.5 rounded-lg text-sm ${view === 'grid' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>Grid</button>
              <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-lg text-sm ${view === 'list' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>List</button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-4xl mb-3">🛍️</div>
              <p className="text-[var(--text-muted)]">No products found.</p>
            </div>
          ) : view === 'grid' ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(p => (
                <div key={p.id} className="card p-5 hover:border-[var(--accent)]/30 transition-all">
                  <div className="aspect-video bg-[var(--bg-surface)] rounded-lg mb-3 flex items-center justify-center text-[var(--text-muted)]">
                    {p.primary_image ? <img src={p.primary_image?.url || p.primary_image} alt={p.name} className="w-full h-full object-cover rounded-lg" /> : '📦'}
                  </div>
                  <h3 className="font-semibold mb-1">{p.name}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-2 line-clamp-2">{p.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-[var(--accent)]">£{p.price}</span>
                    <button onClick={() => addToCart(p)} className="btn btn-primary text-sm px-3 py-1.5">Add to Cart</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(p => (
                <div key={p.id} className="card p-4 flex items-center gap-4">
                  <div className="w-16 h-16 bg-[var(--bg-surface)] rounded-lg flex items-center justify-center shrink-0">
                    {p.primary_image ? <img src={p.primary_image?.url || p.primary_image} alt={p.name} className="w-full h-full object-cover rounded-lg" /> : '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-sm text-[var(--text-secondary)] truncate">{p.description}</p>
                  </div>
                  <span className="font-bold text-[var(--accent)]">£{p.price}</span>
                  <button onClick={() => addToCart(p)} className="btn btn-primary text-sm px-3 py-1.5 shrink-0">Add</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cart Tab */}
      {tab === 'cart' && (
        <div className="space-y-4">
          {cartItems.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-4xl mb-3">🛒</div>
              <p className="text-[var(--text-muted)]">Your cart is empty.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {cartItems.map((item: any) => (
                  <div key={item.id} className="card p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="font-medium">{item.product_name || item.product?.name || 'Product'}</div>
                      <div className="text-sm text-[var(--text-muted)]">£{item.unit_price} × {item.quantity}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.product?.id || item.product, item.quantity - 1)} className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] text-[var(--text)] flex items-center justify-center hover:bg-[var(--bg-elevated)]">−</button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.product?.id || item.product, item.quantity + 1)} className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] text-[var(--text)] flex items-center justify-center hover:bg-[var(--bg-elevated)]">+</button>
                    </div>
                    <div className="font-bold text-[var(--accent)] w-20 text-right">£{(Number(item.unit_price) * item.quantity).toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div className="card p-4 flex items-center justify-between">
                <div className="text-lg font-bold">Total: £{cartTotal.toFixed(2)}</div>
                <button onClick={() => setTab('checkout')} className="btn btn-primary">Checkout</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-[var(--text-muted)]">No orders yet.</p>
            </div>
          ) : orders.map((o: any) => (
            <div key={o.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Order #{o.id?.slice(0, 8)}</span>
                <span className={`badge ${o.status === 'completed' ? 'badge-success' : o.status === 'cancelled' ? 'badge-error' : 'badge-warning'}`}>{o.status}</span>
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
        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="font-semibold mb-4">New Booking</h3>
            <form onSubmit={submitBooking} className="grid md:grid-cols-2 gap-3">
              <input className="input" placeholder="Service name" value={bookingForm.service_name} onChange={e => setBookingForm({ ...bookingForm, service_name: e.target.value })} required />
              <select className="input" value={bookingForm.service} onChange={e => setBookingForm({ ...bookingForm, service: e.target.value })}>
                <option value="">Select service</option>
                {services.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input className="input" type="date" value={bookingForm.date} onChange={e => setBookingForm({ ...bookingForm, date: e.target.value })} required />
              <input className="input" type="time" value={bookingForm.time} onChange={e => setBookingForm({ ...bookingForm, time: e.target.value })} required />
              <input className="input" placeholder="Your name" value={bookingForm.customer_name} onChange={e => setBookingForm({ ...bookingForm, customer_name: e.target.value })} />
              <input className="input" placeholder="Your email" value={bookingForm.customer_email} onChange={e => setBookingForm({ ...bookingForm, customer_email: e.target.value })} />
              <button type="submit" className="btn btn-primary md:col-span-2">Book Appointment</button>
            </form>
          </div>
          <div className="space-y-3">
            {bookings.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-4xl mb-3">📅</div>
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
        </div>
      )}

      {/* Applications Tab */}
      {tab === 'applications' && (
        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="font-semibold mb-4">New Application</h3>
            <form onSubmit={submitApplication} className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <select className="input" value={appForm.application_type} onChange={e => setAppForm({ ...appForm, application_type: e.target.value })}>
                  <option value="enquiry">Enquiry</option>
                  <option value="quote">Quote Request</option>
                  <option value="support">Support</option>
                </select>
                <input className="input" placeholder="Your name" value={appForm.applicant_name} onChange={e => setAppForm({ ...appForm, applicant_name: e.target.value })} required />
              </div>
              <input className="input" type="email" placeholder="Your email" value={appForm.applicant_email} onChange={e => setAppForm({ ...appForm, applicant_email: e.target.value })} required />
              <input className="input" placeholder="Subject" value={appForm.subject} onChange={e => setAppForm({ ...appForm, subject: e.target.value })} />
              <textarea className="input" rows={4} placeholder="Message..." value={appForm.message} onChange={e => setAppForm({ ...appForm, message: e.target.value })} required />
              <div>
                <label className="text-sm text-[var(--text-secondary)] mb-1 block">Attachments (optional)</label>
                <input type="file" multiple onChange={uploadAttachment} className="text-sm" />
                {attachmentIds.length > 0 && <div className="text-xs text-[var(--text-muted)] mt-1">{attachmentIds.length} file(s) attached</div>}
              </div>
              <button type="submit" className="btn btn-primary">Submit Application</button>
            </form>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-4xl mb-3">🔔</div>
              <p className="text-[var(--text-muted)]">No notifications.</p>
            </div>
          ) : notifications.map((n: any) => (
            <div key={n.id} className={`card p-4 ${!n.is_read ? 'border-[var(--accent)]/30' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{n.title}</div>
                  <div className="text-sm text-[var(--text-secondary)]">{n.message}</div>
                </div>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-[var(--accent)] mt-2" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Checkout (hidden, triggered from cart) */}
      {tab === 'checkout' && (
        <div className="card p-6 max-w-lg mx-auto">
          <h3 className="font-semibold mb-4">Checkout</h3>
          <form onSubmit={checkout} className="space-y-3">
            <input className="input" placeholder="Customer name" value={checkoutInfo.customer_name} onChange={e => setCheckoutInfo({ ...checkoutInfo, customer_name: e.target.value })} required />
            <select className="input" value={checkoutInfo.delivery_option} onChange={e => setCheckoutInfo({ ...checkoutInfo, delivery_option: e.target.value })}>
              <option value="collection">Collection</option>
              <option value="delivery">Delivery</option>
            </select>
            {checkoutInfo.delivery_option === 'delivery' && (
              <textarea className="input" placeholder="Delivery details" value={checkoutInfo.delivery_details} onChange={e => setCheckoutInfo({ ...checkoutInfo, delivery_details: e.target.value })} />
            )}
            <button type="submit" className="btn btn-primary w-full">Place Order (Simulated)</button>
          </form>
          <button onClick={() => setTab('cart')} className="btn btn-secondary w-full mt-2">Back to Cart</button>
        </div>
      )}
    </div>
  );
}