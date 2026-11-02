import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function CustomerHome() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingForm, setBookingForm] = useState({ service_name: 'Consultation', date: '', time: '10:00', customer_name: '', customer_email: '' });

  useEffect(() => {
    api.get('/demo/products/').then(r => setProducts(r.data.results || r.data));
    api.get('/demo/bookings/').then(r => setBookings(r.data.results || r.data));
  }, []);

  function addToCart(p: any) { setCart(c => [...c, p]); }

  async function submitBooking(e: any) {
    e.preventDefault();
    await api.post('/demo/bookings/', bookingForm);
    const r = await api.get('/demo/bookings/');
    setBookings(r.data.results || r.data);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Customer Experience (Demo)</h1>

      <section className="card p-4">
        <h2 className="text-xl font-semibold mb-3">Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {products.slice(0,6).map(p => (
            <div key={p.id} className="border border-[var(--border)] rounded p-3">
              <h3 className="font-semibold">{p.name}</h3>
              <p className="text-sm text-[var(--muted)]">{p.description}</p>
              <p className="mt-1 font-bold">${p.price}</p>
              <button className="btn text-xs mt-2" onClick={() => addToCart(p)}>Add to cart</button>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="text-xl font-semibold mb-3">Cart ({cart.length})</h2>
        <ul className="text-sm">
          {cart.map((c,i) => <li key={i}>{c.name} - ${c.price}</li>)}
        </ul>
        {cart.length > 0 && <button className="btn text-xs mt-2" onClick={()=>{alert('Checkout is a simulated demonstration. No payment processed.'); setCart([]);}}>Checkout (simulated)</button>}
      </section>

      <section className="card p-4">
        <h2 className="text-xl font-semibold mb-3">Book a service</h2>
        <form onSubmit={submitBooking} className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
          <input className="input" placeholder="Service" value={bookingForm.service_name} onChange={e=>setBookingForm({...bookingForm, service_name: e.target.value})} />
          <input className="input" type="date" value={bookingForm.date} onChange={e=>setBookingForm({...bookingForm, date: e.target.value})} />
          <input className="input" type="time" value={bookingForm.time} onChange={e=>setBookingForm({...bookingForm, time: e.target.value})} />
          <input className="input" placeholder="Your name" value={bookingForm.customer_name} onChange={e=>setBookingForm({...bookingForm, customer_name: e.target.value})} />
          <input className="input" placeholder="Your email" value={bookingForm.customer_email} onChange={e=>setBookingForm({...bookingForm, customer_email: e.target.value})} />
          <button className="btn" type="submit">Submit booking</button>
        </form>
        <div className="mt-4">
          <h3 className="font-semibold">My bookings</h3>
          <ul className="text-sm">
            {bookings.map(b => <li key={b.id}>{b.service_name} — {b.date} {b.time} ({b.status})</li>)}
          </ul>
        </div>
      </section>
    </div>
  );
}