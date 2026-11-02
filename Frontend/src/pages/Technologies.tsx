import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Technologies() {
  const [techs, setTechs] = useState<any[]>([]);
  useEffect(() => { api.get('/showcase/technologies/').then(r => setTechs(r.data.results || r.data)); }, []);
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Technologies</h1>
      <div className="flex flex-wrap gap-2">
        {techs.map(t => (
          <span key={t.id} className="px-3 py-1 rounded-full bg-[var(--surface-2)] text-sm">{t.name}</span>
        ))}
      </div>
    </div>
  );
}