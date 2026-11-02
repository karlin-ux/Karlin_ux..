import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Explore() {
  const [features, setFeatures] = useState<any[]>([]);
  useEffect(() => {
    api.get('/showcase/features/').then(r => setFeatures(r.data.results || r.data));
  }, []);
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Explore Capabilities</h1>
      <p className="text-[var(--muted)] mb-6">Central directory of what can be built.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map(f => (
          <div key={f.id} className="card p-4">
            <h3 className="font-semibold">{f.title}</h3>
            <p className="text-sm text-[var(--muted)]">{f.summary || f.description}</p>
            <div className="mt-2 text-xs">
              {f.is_simulated && <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-300">Simulated demo</span>}
              {f.is_available && <span className="ml-2 px-2 py-1 rounded bg-green-500/20 text-green-300">Available</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}