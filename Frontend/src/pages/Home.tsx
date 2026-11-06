import { Link } from 'react-router-dom';

export default function Home() {
  const capabilities = [
    { title: 'Customer Experiences', desc: 'Registration, authentication, profiles, orders, bookings and customer self-service.', icon: '👤' },
    { title: 'Business Management', desc: 'Product catalogues, order processing, customer management and workspace administration.', icon: '📊' },
    { title: 'Analytics & Reporting', desc: 'Real-time dashboards, trend analysis and business intelligence from live data.', icon: '📈' },
    { title: 'Content Management', desc: 'Page builder, content revisions, media management and SEO-friendly content.', icon: '📝' },
    { title: 'Media Management', desc: 'Secure file uploads, image processing, variant generation and storage tracking.', icon: '🖼️' },
    { title: 'Booking Systems', desc: 'Calendar-based scheduling with conflict prevention and multi-duration support.', icon: '📅' },
    { title: 'Application Management', desc: 'Customer applications, review workflows and status tracking.', icon: '📋' },
    { title: 'Role-Based Access', desc: 'Multi-tier authorization: customer, workspace admin and platform super admin.', icon: '🔐' },
    { title: 'AI-Assisted Interfaces', desc: 'Voice navigation, command palette and assistant integration.', icon: '🤖' },
    { title: 'Search', desc: 'Full-text search across products, customers and content.', icon: '🔍' },
    { title: '3D Product Experiences', desc: 'Interactive 3D product viewers with model loading and controls.', icon: '🎨' },
    { title: 'Security & Infrastructure', desc: 'CSRF protection, workspace isolation, rate limiting, Docker and Caddy.', icon: '🛡️' },
  ];

  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 md:py-32">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-soft)] via-transparent to-[var(--accent-2-soft)] opacity-50" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--accent)] rounded-full blur-[128px] opacity-10" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--accent-2)] rounded-full blur-[128px] opacity-10" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-soft)] border border-[var(--accent)]/20 text-[var(--accent)] text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
              Full-Stack Platform
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Building <span className="text-gradient">Modern Digital Platforms</span> That Work
            </h1>
            <p className="text-xl md:text-2xl text-[var(--text-secondary)] mb-8 max-w-3xl leading-relaxed">
              A self-taught developer crafting full-stack web applications with Django, React, PostgreSQL and modern infrastructure.
              From customer experiences to business management systems — built to work, not just to look good.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/explore" className="btn btn-primary text-lg px-8 py-3">
                Explore Capabilities
              </Link>
              <Link to="/projects" className="btn btn-secondary text-lg px-8 py-3">
                View Projects
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Capability Showcase */}
      <section className="py-20 bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Can Be Built</h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              A modern website can do much more than display information. Explore the systems and features
              that can be developed for real business applications.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {capabilities.map((cap, i) => (
              <div
                key={i}
                className="card p-6 hover:border-[var(--accent)]/30 transition-all duration-300 group cursor-default"
              >
                <div className="text-3xl mb-3">{cap.icon}</div>
                <h3 className="font-semibold text-[var(--text)] mb-2 group-hover:text-[var(--accent)] transition-colors">
                  {cap.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {cap.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engineering Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Engineering Behind the Platform</h2>
              <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
                This portfolio isn't just a showcase — it's a working full-stack application with real backend integration,
                database-backed data, authentication, authorization and infrastructure.
              </p>
              <div className="space-y-4">
                {[
                  { label: 'Frontend', value: 'React 19, TypeScript, Vite, Tailwind CSS' },
                  { label: 'Backend', value: 'Django 5.2, Django REST Framework' },
                  { label: 'Database', value: 'PostgreSQL 18 with exclusion constraints' },
                  { label: 'Infrastructure', value: 'Docker Compose, Caddy, GitHub Actions' },
                  { label: 'Security', value: 'CSRF, session auth, workspace isolation, rate limiting' },
                  { label: 'Testing', value: '56 backend tests, TypeScript, ESLint, Gitleaks' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-2 shrink-0" />
                    <div>
                      <span className="font-semibold text-[var(--text)]">{item.label}:</span>
                      <span className="text-[var(--text-secondary)] ml-2">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-8 bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-surface)]">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { num: '56', label: 'Backend Tests' },
                  { num: '13', label: 'Django Apps' },
                  { num: '4', label: 'User Roles' },
                  { num: '100%', label: 'TypeScript' },
                ].map((stat, i) => (
                  <div key={i} className="text-center p-4">
                    <div className="text-3xl font-bold text-gradient">{stat.num}</div>
                    <div className="text-sm text-[var(--text-muted)] mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[var(--bg-secondary)]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Explore?</h2>
          <p className="text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto">
            Sign in to experience the customer dashboard, workspace administration and platform management features.
            All data is real and backed by PostgreSQL.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/signin" className="btn btn-primary text-lg px-8 py-3">Sign In</Link>
            <Link to="/register" className="btn btn-secondary text-lg px-8 py-3">Create Account</Link>
          </div>
        </div>
      </section>
    </div>
  );
}