import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">About Me</h1>
        <p className="text-[var(--text-secondary)] max-w-2xl mx-auto text-lg">
          A self-taught developer building practical software across the full stack.
        </p>
      </section>

      <section className="card p-8">
        <h2 className="text-2xl font-bold mb-4">My Approach</h2>
        <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
          I focus on building real, working software — not just prototypes. Every feature in this platform is backed by
          a Django REST API, PostgreSQL database and proper authentication. I believe the best way to demonstrate
          engineering ability is to build things that actually work.
        </p>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          My experience spans frontend development (React, TypeScript, Tailwind), backend systems (Django, DRF, PostgreSQL),
          infrastructure (Docker, Caddy, GitHub Actions) and security (CSRF protection, workspace isolation, rate limiting).
        </p>
      </section>

      <section className="card p-8">
        <h2 className="text-2xl font-bold mb-4">Core Skills</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { category: 'Frontend', skills: 'React, TypeScript, Vite, Tailwind CSS, Responsive Design' },
            { category: 'Backend', skills: 'Django, Django REST Framework, Python, REST APIs' },
            { category: 'Database', skills: 'PostgreSQL, Schema Design, Migrations, Constraints' },
            { category: 'Infrastructure', skills: 'Docker, Docker Compose, Caddy, GitHub Actions' },
            { category: 'Security', skills: 'Authentication, Authorization, CSRF, Rate Limiting, Workspace Isolation' },
            { category: 'Tools', skills: 'Git, DBeaver, Insomnia, Firefox DevTools, VS Code' },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-lg bg-[var(--bg-surface)]">
              <div className="font-semibold text-[var(--accent)] mb-1">{item.category}</div>
              <div className="text-sm text-[var(--text-secondary)]">{item.skills}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="text-center py-8">
        <Link to="/contact" className="btn btn-primary">Get In Touch</Link>
      </section>
    </div>
  );
}