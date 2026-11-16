import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal';

const projects = [
  { name: 'Karlin_ux Platform', desc: 'Full-stack portfolio and business management platform with Django backend, React frontend, PostgreSQL, Docker and Caddy.', tech: ['Django', 'React', 'TypeScript', 'PostgreSQL', 'Docker'], status: 'Active', path: '/', background: '/karlin_ux_platform.svg' },
  { name: 'Customer Management System', desc: 'Customer accounts, profiles, order tracking and communication tools.', tech: ['Django', 'DRF', 'React'], status: 'Active', path: '/customer', background: '/customer_management_system.svg' },
  { name: 'Booking & Scheduling', desc: 'Calendar-based booking with conflict prevention and multi-duration support.', tech: ['Django', 'PostgreSQL', 'React'], status: 'Active', path: '/calendar', background: '/booking_scheduling.svg' },
  { name: 'Media Management', desc: 'Secure file uploads, image processing, variant generation and storage tracking.', tech: ['Django', 'Pillow', 'React'], status: 'Active', path: '/media', background: '/media_management.svg' },
];

export default function Projects() {
  return (
    <div
      className="mx-auto max-w-7xl space-y-8 rounded-2xl p-4 sm:p-6"
      style={{
        backgroundImage: 'linear-gradient(rgba(8,17,31,0.35), rgba(8,17,31,0.35)), url(/background.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <section className="text-center py-12">
        <h1 className="text-glow-white mb-4 text-4xl font-bold text-white md:text-5xl">Projects</h1>
        <p className="text-glow-white mx-auto max-w-2xl text-lg text-white">
          Sample projects built with modern technologies. Each one demonstrates practical engineering.
        </p>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        {projects.map((p, i) => (
          <Reveal key={i} delay={i * 70}>
          <Link
            to={p.path}
            className="spotlight-card tilt-card sheen card flex h-full min-h-[360px] flex-col justify-end p-6 text-center transition-all duration-300 hover:border-[var(--accent)]/30"
            style={{ backgroundImage: `linear-gradient(rgba(8,17,31,0.25), rgba(8,17,31,0.45)), url(${p.background})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
            aria-label={p.name}
          >
            <div className="flex flex-wrap justify-center gap-2">
              {p.tech.map((t, j) => (
                <span key={j} className="btn hero-cta-btn !min-w-0 px-3 py-1.5 text-xs text-glow-white text-white">
                  {t}
                </span>
              ))}
            </div>
          </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}