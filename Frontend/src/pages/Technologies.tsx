export default function Technologies() {
  const techs = [
    { name: 'React', category: 'Frontend', desc: 'Component-based UI with hooks and context' },
    { name: 'TypeScript', category: 'Frontend', desc: 'Type-safe JavaScript for reliability' },
    { name: 'Vite', category: 'Frontend', desc: 'Fast build tool with HMR' },
    { name: 'Tailwind CSS', category: 'Frontend', desc: 'Utility-first CSS framework' },
    { name: 'Django', category: 'Backend', desc: 'Python web framework with ORM' },
    { name: 'Django REST Framework', category: 'Backend', desc: 'Powerful API toolkit' },
    { name: 'PostgreSQL', category: 'Database', desc: 'Advanced relational database' },
    { name: 'Docker', category: 'Infrastructure', desc: 'Containerization and orchestration' },
    { name: 'Caddy', category: 'Infrastructure', desc: 'Reverse proxy with automatic HTTPS' },
    { name: 'GitHub Actions', category: 'CI/CD', desc: 'Automated testing and deployment' },
    { name: 'Gitleaks', category: 'Security', desc: 'Secret scanning' },
    { name: 'Bandit', category: 'Security', desc: 'Python security linting' },
  ];

  const categories = [...new Set(techs.map(t => t.category))];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Technologies</h1>
        <p className="text-[var(--text-secondary)] max-w-2xl mx-auto text-lg">
          The tools and technologies used to build this platform.
        </p>
      </section>

      {categories.map(cat => (
        <section key={cat}>
          <h2 className="text-xl font-bold mb-4 text-[var(--accent)]">{cat}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {techs.filter(t => t.category === cat).map((t, i) => (
              <div key={i} className="card p-5">
                <h3 className="font-semibold text-[var(--text)] mb-1">{t.name}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{t.desc}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}