import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Icon from '../components/Icon';

export default function Reports() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/demo/analytics-summary/').then(r => setAnalytics(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports & Analytics</h1>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: 'Total Orders', value: analytics?.total_orders || 0, icon: 'orders' },
          { label: 'Total Revenue', value: `£${analytics?.total_revenue || '0.00'}`, icon: 'metric-revenue' },
          { label: 'Total Customers', value: analytics?.total_customers || 0, icon: 'metric-customers' },
        ].map((s, i) => (
          <div key={i} className="card p-5">
            <div className="mb-2"><Icon name={s.icon} size={24} /></div>
            <div className="text-2xl font-bold text-[var(--accent)]">{s.value}</div>
            <div className="text-sm text-[var(--text-muted)]">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-4">Analytics Summary</h3>
        <pre className="text-sm text-[var(--text-secondary)] overflow-auto bg-[var(--bg-surface)] p-4 rounded-lg">
          {JSON.stringify(analytics, null, 2)}
        </pre>
      </div>
    </div>
  );
}