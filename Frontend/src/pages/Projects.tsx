import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal';

const projects = [
  { name: 'Karlin_ux Platform', desc: 'Full-stack portfolio and business management platform with Django backend, React frontend, PostgreSQL, Docker and Caddy.', tech: ['Django', 'React', 'TypeScript', 'PostgreSQL', 'Docker'], status: 'Active', path: '/' },
  { name: 'Customer Management System', desc: 'Customer accounts, profiles, order tracking and communication tools.', tech: ['Django', 'DRF', 'React'], status: 'Active', path: '/customer' },
  { name: 'Booking & Scheduling', desc: 'Calendar-based booking with conflict prevention and multi-duration support.', tech: ['Django', 'PostgreSQL', 'React'], status: 'Active', path: '/calendar' },
  { name: 'Media Management', desc: 'Secure file uploads, image processing, variant generation and storage tracking.', tech: ['Django', 'Pillow', 'React'], status: 'Active', path: '/media' },
];

export default function Projects() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="text-center py-12">
        <h1 className="text-glow-white mb-4 text-4xl font-bold text-white md:text-5xl">Projects</h1>
        <p className="text-glow-white mx-auto max-w-2xl text-lg text-white">
          Sample projects built with modern technologies. Each one demonstrates practical engineering.
        </p>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        {projects.map((p, i) => (
          <Reveal key={i} delay={i * 70}>
          <Link to={p.path} className="spotlight-card tilt-card sheen card block h-full p-6 text-center transition-all duration-300 hover:border-[var(--accent)]/30">
            <div className="mb-3 flex flex-col items-center gap-2">
              <h3 className="text-glow-white text-xl font-bold text-white">{p.name}</h3>
              <span className="badge badge-success">{p.status}</span>
            </div>
            <p className="text-glow-white mb-4 leading-relaxed text-white">{p.desc}</p>
            <div className="mb-4 flex flex-wrap justify-center gap-2">
              {p.tech.map((t, j) => (
                <span key={j} className="btn hero-cta-btn !min-w-0 px-3 py-1.5 text-xs text-glow-white text-white">
                  {t}
                </span>
              ))}
            </div>
            <span className="text-sm font-medium text-[var(--accent)] hover:underline">
              View project →
            </span>
          </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}