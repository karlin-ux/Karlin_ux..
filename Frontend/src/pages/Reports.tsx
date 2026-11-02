import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Reports() {
  const [orders, setOrders] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/demo/orders/'),
      api.get('/demo/bookings/'),
      api.get('/demo/applications/'),
      api.get('/demo/products/'),
    ]).then(([o,b,a,p]) => {
      setOrders(o.data.results || o.data);
      setBookings(b.data.results || b.data);
      setApplications(a.data.results || a.data);
      setProducts(p.data.results || p.data);
    });
  }, []);

  const orderData = Object.entries(
    orders.reduce((acc: any, o: any) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  function exportCSV() {
    const rows = [['id','status','total','date'], ...orders.map(o => [o.id, o.status, o.total, o.order_date])];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'orders.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Reports & Analytics (Workspace)</h1>
      <button className="btn text-xs" onClick={exportCSV}>Export orders CSV</button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Orders by status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={orderData}><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#6c8cff" /></BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Summary</h3>
          <ul className="text-sm space-y-1">
            <li>Orders: {orders.length}</li>
            <li>Bookings: {bookings.length}</li>
            <li>Applications: {applications.length}</li>
            <li>Products: {products.length}</li>
          </ul>
          <p className="text-xs text-yellow-300 mt-2">Workspace data only (simulated).</p>
        </div>
      </div>
    </div>
  );
}