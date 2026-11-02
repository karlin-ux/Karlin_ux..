import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  useEffect(() => { api.get('/showcase/projects/').then(r => setProjects(r.data.results || r.data)); }, []);
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Projects</h1>
      <div className="space-y-4">
        {projects.map(p => (
          <div key={p.id} className="card p-4">
            <h3 className="font-semibold">{p.title}</h3>
            <p className="text-sm text-[var(--muted)]">{p.summary}</p>
            <p className="text-xs mt-2">{p.technologies}</p>
          </div>
        ))}
      </div>
    </div>
  );
}