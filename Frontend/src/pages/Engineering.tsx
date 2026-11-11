import { Link } from 'react-router-dom';

export default function Engineering() {
  return (
    <div className="space-y-0">
      <section className="relative overflow-hidden py-20">
        <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 20% 20%, var(--accent-soft), transparent 55%)' }} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Engineering</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Architecture, quality and delivery</h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-[var(--text-secondary)]">
            A practical view of how the platform is designed and built — from the React frontend and Django REST API to PostgreSQL, security controls, infrastructure and testing.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/explore" className="btn btn-primary">Explore platform</Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[var(--bg-secondary)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Engineering Showcase</h2>
            <p className="mx-auto max-w-2xl text-lg text-[var(--text-secondary)]">
              How the platform is constructed — from frontend to database.
            </p>
          </div>

          <div className="card bg-[var(--bg-elevated)] p-8">
            <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                { name: 'React + Vite', desc: 'TypeScript SPA with Vite, Tailwind and React Router' },
                { name: 'Django REST API', desc: 'DRF with session auth, CSRF, throttling and permissions' },
                { name: 'Django Backend', desc: 'Business logic, models, serializers and views' },
                { name: 'PostgreSQL', desc: 'Relational database with constraints and migrations' },
                { name: 'Security & Isolation', desc: 'Server-side permissions, workspace scoping and protected uploads' },
                { name: 'Testing & CI', desc: 'Automated checks, linting, security scanning and container validation' },
              ].map((item) => (
                <div key={item.name} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 text-center transition-all duration-300 hover:border-[var(--accent)]/30">
                  <div className="font-semibold text-sm">{item.name}</div>
                  <div className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">{item.desc}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--border)] pt-6">
              <div className="mb-3 text-center text-sm text-[var(--text-muted)]">Infrastructure & Tooling</div>
              <div className="flex flex-wrap justify-center gap-2">
                {['Docker Compose', 'Caddy', 'GitHub Actions', 'Gitleaks', 'Bandit', 'Trivy', 'WhiteNoise', 'PostgreSQL', 'Gunicorn'].map((item) => (
                  <span key={item} className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
