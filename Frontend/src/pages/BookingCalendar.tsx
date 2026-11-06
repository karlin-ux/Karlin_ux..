import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Icon from '../components/Icon';

export default function BookingCalendar() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ service_name: '', service: '', date: '', time: '10:00', customer_name: '', customer_email: '' });
  const [status, setStatus] = useState('');

  async function load() {
    try {
      const b = await api.get('/demo/bookings/');
      setBookings(b.data.results || b.data);
      const s = await api.get('/demo/services/');
      setServices(s.data.results || s.data);
    } catch (e) {
      console.error('Failed to load bookings', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/demo/bookings/', form);
      setStatus('Booking created.');
      setForm({ service_name: '', service: '', date: '', time: '10:00', customer_name: '', customer_email: '' });
      load();
    } catch (e: any) {
      setStatus(e?.response?.data?.detail || 'Booking failed.');
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Booking Calendar</h1>

      <div className="card p-6">
        <h3 className="font-semibold mb-4">New Booking</h3>
        <form onSubmit={submit} className="grid md:grid-cols-2 gap-3">
          <input className="input" placeholder="Service name" value={form.service_name} onChange={e => setForm({ ...form, service_name: e.target.value })} required />
          <select className="input" value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}>
            <option value="">Select service</option>
            {services.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--accent)] pointer-events-none">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <input className="input pl-11 text-center" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--accent)] pointer-events-none">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <input className="input pl-11 text-center" type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} required />
          </div>
          <input className="input" placeholder="Customer name" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
          <input className="input" placeholder="Customer email" value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} />
          <button type="submit" className="btn btn-primary md:col-span-2">Create Booking</button>
        </form>
        {status && <p className="text-sm mt-3 text-[var(--info)]">{status}</p>}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">Upcoming Bookings</h3>
        {bookings.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="mb-3 flex justify-center"><Icon name="booking-empty-state" size={48} /></div>
            <p className="text-[var(--text-muted)]">No bookings yet.</p>
          </div>
        ) : bookings.map((b: any) => (
          <div key={b.id} className="card p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{b.service_name}</div>
              <div className="text-sm text-[var(--text-secondary)]">{b.date} at {b.time} · {b.duration_minutes}min</div>
            </div>
            <span className={`badge ${b.status === 'cancelled' ? 'badge-error' : b.status === 'completed' ? 'badge-success' : 'badge-info'}`}>{b.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}