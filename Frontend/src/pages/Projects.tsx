import { Link } from 'react-router-dom';

const projects = [
  { name: 'Karlin_ux Platform', desc: 'Full-stack portfolio and business management platform with Django backend, React frontend, PostgreSQL, Docker and Caddy.', tech: ['Django', 'React', 'TypeScript', 'PostgreSQL', 'Docker'], status: 'Active', path: '/' },
  { name: 'Customer Management System', desc: 'Customer accounts, profiles, order tracking and communication tools.', tech: ['Django', 'DRF', 'React'], status: 'Active', path: '/customer' },
  { name: 'Booking & Scheduling', desc: 'Calendar-based booking with conflict prevention and multi-duration support.', tech: ['Django', 'PostgreSQL', 'React'], status: 'Active', path: '/calendar' },
  { name: 'Media Management', desc: 'Secure file uploads, image processing, variant generation and storage tracking.', tech: ['Django', 'Pillow', 'React'], status: 'Active', path: '/media' },
];

export default function Projects() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Projects</h1>
        <p className="text-[var(--text-secondary)] max-w-2xl mx-auto text-lg">
          Real projects built with modern technologies. Each one demonstrates practical engineering.
        </p>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        {projects.map((p, i) => (
          <Link key={i} to={p.path} className="card p-6 hover:border-[var(--accent)]/30 transition-all duration-300 block">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-xl font-bold">{p.name}</h3>
              <span className="badge badge-success">{p.status}</span>
            </div>
            <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">{p.desc}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {p.tech.map((t, j) => (
                <span key={j} className="badge badge-info">{t}</span>
              ))}
            </div>
            <span className="text-[var(--accent)] text-sm font-medium hover:underline">
              View project →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}