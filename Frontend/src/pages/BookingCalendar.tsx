import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function BookingCalendar() {
  const [view, setView] = useState<'month'|'week'|'day'>('month');
  const [cursor, setCursor] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [service, setService] = useState('');
  const [services, setServices] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    api.get('/demo/bookings/').then(r => setBookings(r.data.results || r.data));
    api.get('/demo/services/').then(r => setServices(r.data.results || r.data));
  }, []);

  const filtered = bookings.filter(b => !service || b.service === service || b.service_name === service);

  function fmt(d: Date) { return d.toISOString().slice(0,10); }

  function prev() {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth()-1);
    else if (view === 'week') d.setDate(d.getDate()-7);
    else d.setDate(d.getDate()-1);
    setCursor(d);
  }
  function next() {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth()+1);
    else if (view === 'week') d.setDate(d.getDate()+7);
    else d.setDate(d.getDate()+1);
    setCursor(d);
  }

  // month grid
  const monthDays: Date[] = [];
  if (view === 'month') {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(start.getDate() - start.getDay());
    for (let i=0;i<42;i++){ const d=new Date(start); d.setDate(start.getDate()+i); monthDays.push(d); }
  }

  async function cancel(id: string) { await api.patch(`/demo/bookings/${id}/`, { status: 'cancelled' }); const r = await api.get('/demo/bookings/'); setBookings(r.data.results || r.data); setSelected(null); }
  async function reschedule(id: string, date: string, time: string) {
    try { await api.patch(`/demo/bookings/${id}/`, { date, time, status: 'rescheduled' }); const r = await api.get('/demo/bookings/'); setBookings(r.data.results || r.data); setSelected(null); }
    catch (e: any) { alert(e?.response?.data?.detail || 'Reschedule failed (conflict?)'); }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Booking Calendar</h1>
      <div className="flex gap-2 flex-wrap items-center">
        <button className="btn text-xs" onClick={prev}>Prev</button>
        <button className="btn text-xs" onClick={next}>Next</button>
        <span className="font-semibold">{cursor.toDateString()}</span>
        <select className="input max-w-xs" value={view} onChange={e=>setView(e.target.value as any)}>
          <option value="month">Month</option><option value="week">Week</option><option value="day">Day</option>
        </select>
        <select className="input max-w-xs" value={service} onChange={e=>setService(e.target.value)}>
          <option value="">All services</option>
          {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {view === 'month' && (
        <div className="grid grid-cols-7 gap-1">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-xs font-semibold text-center">{d}</div>)}
          {monthDays.map(d => {
            const iso = fmt(d);
            const dayBookings = filtered.filter(b => b.date === iso);
            return (
              <div key={iso} className="card p-1 min-h-[60px] text-xs">
                <div className="font-semibold">{d.getDate()}</div>
                {dayBookings.map(b => (
                  <div key={b.id} className={`mt-1 px-1 rounded ${b.status==='cancelled'?'bg-red-500/30':'bg-[var(--accent)]/30'} cursor-pointer`} onClick={()=>setSelected(b)}>
                    {b.service_name} {b.time?.slice(0,5)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {view === 'week' && (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({length:7}, (_,i) => {
            const d = new Date(cursor); d.setDate(cursor.getDate() - cursor.getDay() + i);
            const iso = fmt(d);
            const dayBookings = filtered.filter(b => b.date === iso);
            return (
              <div key={iso} className="card p-2">
                <div className="font-semibold text-sm">{d.toDateString()}</div>
                {dayBookings.map(b => <div key={b.id} className="text-xs mt-1 cursor-pointer" onClick={()=>setSelected(b)}>{b.service_name} {b.time?.slice(0,5)} ({b.status})</div>)}
              </div>
            );
          })}
        </div>
      )}

      {view === 'day' && (
        <div className="card p-4">
          <h3 className="font-semibold mb-2">{cursor.toDateString()}</h3>
          <ul className="space-y-2 text-sm">
            {filtered.filter(b => b.date === fmt(cursor)).map(b => (
              <li key={b.id} className="border border-[var(--border)] rounded p-2 cursor-pointer" onClick={()=>setSelected(b)}>
                {b.time?.slice(0,5)} — {b.service_name} ({b.status})
              </li>
            ))}
            {filtered.filter(b => b.date === fmt(cursor)).length === 0 && <li className="text-[var(--muted)]">No bookings.</li>}
          </ul>
        </div>
      )}

      {selected && (
        <div className="card p-4 space-y-2">
          <h3 className="font-semibold">Booking details</h3>
          <p className="text-sm">{selected.service_name} — {selected.date} {selected.time} ({selected.status})</p>
          <div className="flex gap-2">
            <button className="btn text-xs" style={{background:'#dc2626'}} onClick={()=>cancel(selected.id)}>Cancel</button>
            <button className="btn text-xs" onClick={()=>{ const d=prompt('New date (YYYY-MM-DD)', selected.date); const t=prompt('New time (HH:MM)', selected.time?.slice(0,5)); if(d&&t) reschedule(selected.id, d, t+':00'); }}>Reschedule</button>
            <button className="btn text-xs" style={{background:'var(--surface-2)', color:'var(--text)'}} onClick={()=>setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}