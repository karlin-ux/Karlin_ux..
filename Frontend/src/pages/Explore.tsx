import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Icon from '../components/Icon';
import Reveal from '../components/Reveal';

/* ============================================
   CAPABILITY GROUPS
   ============================================ */
const capabilityGroups = [
  {
    title: 'Customer Experience',
    desc: 'Registration, authentication, profiles, orders, bookings and self-service.',
    icon: 'customer-experiences',
    size: 'large',
    color: 'var(--accent)',
    features: ['Customer Accounts', 'Registration & Auth', 'User Profiles', 'Shopping Cart', 'Order Tracking', 'Notifications'],
    link: '/customer',
  },
  {
    title: 'Business Management',
    desc: 'Product catalogues, order processing, customer management and workspace admin.',
    icon: 'business-management',
    size: 'large',
    color: 'var(--accent-2)',
    features: ['Business Dashboard', 'Product Management', 'Order Management', 'Customer Management', 'Application Management', 'Manager Accounts'],
    link: '/admin',
  },
  {
    title: 'Analytics & Reporting',
    desc: 'Business dashboards with charts, metrics and activity tracking.',
    icon: 'analytics-reporting',
    size: 'medium',
    color: 'var(--accent-3)',
    features: ['Interactive Charts', 'Sales Reporting', 'Customer Statistics', 'Activity Feed', 'Data Export'],
    link: '/reports',
  },
  {
    title: 'Content & Media',
    desc: 'Website builder, media library, secure uploads and image processing.',
    icon: 'content-management',
    size: 'medium',
    color: 'var(--info)',
    features: ['Website Builder', 'Content Management', 'Page Revisions', 'Media Library', 'Secure Uploads', 'Image Processing'],
    link: '/builder',
  },
  {
    title: 'Booking & Applications',
    desc: 'Calendar scheduling, conflict prevention and application workflows.',
    icon: 'booking-systems',
    size: 'medium',
    color: 'var(--warning)',
    features: ['Calendar Scheduling', 'Conflict Prevention', 'Booking Management', 'Application Submission', 'Status Tracking'],
    link: '/calendar',
  },
  {
    title: 'Administration & Security',
    desc: 'Role-based access, workspace isolation, audit logging and security controls.',
    icon: 'security-infrastructure',
    size: 'medium',
    color: 'var(--error)',
    features: ['Role-Based Access', 'Workspace Isolation', 'Audit Logging', 'Authentication', 'Rate Limiting', 'CSRF Protection'],
    link: '/superadmin',
  },
  {
    title: 'Advanced Experiences',
    desc: 'AI interfaces, voice navigation, search and 3D product viewers.',
    icon: 'ai-assisted-interfaces',
    size: 'small',
    color: 'var(--accent)',
    features: ['Voice Navigation', 'Command Palette', '3D Product & Object Viewer', 'Search', 'PWA Support'],
    link: '/3d',
  },
];

export default function Explore() {
  const [_activePreview, setActivePreview] = useState<string | null>(null);
  const [demoData, setDemoData] = useState<any>(null);

  // Load demo data for live preview
  useEffect(() => {
    api.get('/demo/analytics-summary/').then(r => setDemoData(r.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-0">
      {/* ============================================
          HERO
          ============================================ */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-soft)] via-transparent to-[var(--accent-2-soft)] opacity-40" />
        <div className="absolute inset-0 opacity-[0.0375] pointer-events-none">
          <img src="/illustrations/ai-assisted-interfaces.svg" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--accent)] rounded-full blur-[200px] opacity-[0.06]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-xs font-medium text-[var(--accent)] uppercase tracking-widest mb-4">Interactive Showroom</div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Explore What Can Be <span className="text-gradient">Built</span>
            </h1>
            <p className="mx-auto text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl">
              Discover the systems, experiences and engineering solutions that can bring a business idea to life.
              Every capability links to a working demonstration backed by real API endpoints.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================
          CAPABILITY GROUPS — Bento Layout
          ============================================ */}
      <section className="py-16 bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[280px]">
            {capabilityGroups.map((group, i) => {
              const isLarge = group.size === 'large';
              return (
                <Reveal key={i} delay={i * 60} className={isLarge ? 'md:col-span-2 md:row-span-2' : ''}>
                <div
                  className={`spotlight-card tilt-card group relative h-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 transition-all duration-500 hover:border-[var(--border-strong)] hover:shadow-lg cursor-pointer ${
                    isLarge ? 'md:col-span-2 md:row-span-2' : ''
                  }`}
                  onMouseEnter={() => setActivePreview(group.title)}
                  onMouseLeave={() => setActivePreview(null)}
                >
                  {/* Background SVG illustration */}
                  <div className="absolute inset-0 opacity-[0.075] group-hover:opacity-[0.15] transition-opacity duration-500 pointer-events-none">
                    <img src={`/illustrations/${group.icon}.svg`} alt="" className="w-full h-full object-cover" />
                  </div>
                  {/* Background gradient */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                    background: `radial-gradient(circle at 30% 30%, ${group.color}15, transparent 70%)`,
                  }} />

                  <div className="relative z-10 h-full flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${group.color}15`, color: group.color }}>
                        <Icon name={group.icon} size={24} />
                      </div>
                      <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{group.size === 'large' ? 'Featured' : 'Capability'}</span>
                    </div>

                    <h3 className={`font-bold mb-2 group-hover:text-[var(--accent)] transition-colors ${isLarge ? 'text-2xl' : 'text-lg'}`}>
                      {group.title}
                    </h3>
                    <p className={`text-[var(--text-secondary)] mb-4 ${isLarge ? 'text-base' : 'text-sm'}`}>
                      {group.desc}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {group.features.slice(0, isLarge ? 6 : 4).map((f, j) => (
                        <span key={j} className="px-2 py-0.5 rounded-md text-xs bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)]">
                          {f}
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto">
                      <Link
                        to={group.link}
                        className="inline-flex items-center gap-1 text-sm font-medium transition-all group-hover:gap-2"
                        style={{ color: group.color }}
                      >
                        Explore
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                      </Link>
                    </div>
                  </div>
                </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================
          LIVE PLATFORM PREVIEW
          ============================================ */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none">
          <img src="/illustrations/analytics-reporting.svg" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Live Platform Preview</h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto text-lg">
              An interactive demonstration of the platform's dashboard capabilities.
              <span className="text-[var(--warning)] ml-1">(Interactive demonstration — sample data)</span>
            </p>
          </div>

          <div className="card p-0 overflow-hidden border-[var(--border-strong)] shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-surface)] border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--error)]" />
                <div className="w-3 h-3 rounded-full bg-[var(--warning)]" />
                <div className="w-3 h-3 rounded-full bg-[var(--success)]" />
              </div>
              <span className="text-xs text-[var(--text-muted)] font-mono">karlin_ux — workspace dashboard</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                <span className="text-xs text-[var(--text-muted)]">Live</span>
              </div>
            </div>

            <div className="p-6 bg-[var(--bg-elevated)]">
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Orders', value: demoData?.total_orders || 0, icon: 'orders' },
                  { label: 'Revenue', value: `£${demoData?.total_revenue || '0.00'}`, icon: 'metric-revenue' },
                  { label: 'Customers', value: demoData?.total_customers || 0, icon: 'metric-customers' },
                  { label: 'Products', value: demoData?.product_count || 0, icon: 'catalogue' },
                ].map((s, i) => (
                  <div key={i} className="bg-[var(--bg-surface)] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Icon name={s.icon} size={18} />
                      <span className="text-xs text-[var(--text-muted)]">{s.label}</span>
                    </div>
                    <div className="text-2xl font-bold text-[var(--accent)]">{s.value}</div>
                  </div>
                ))}
              </div>

              <div className="bg-[var(--bg-surface)] rounded-xl p-4">
                <div className="text-xs text-[var(--text-muted)] mb-3">Recent Activity</div>
                <div className="space-y-2">
                  {[
                    { action: 'New order placed', time: '2 min ago', icon: 'orders' },
                    { action: 'Customer registered', time: '5 min ago', icon: 'customer-experiences' },
                    { action: 'Product updated', time: '12 min ago', icon: 'catalogue' },
                    { action: 'Booking confirmed', time: '18 min ago', icon: 'booking-systems' },
                    { action: 'Media uploaded', time: '25 min ago', icon: 'media-management' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                      <Icon name={item.icon} size={16} />
                      <span className="flex-1 text-sm">{item.action}</span>
                      <span className="text-xs text-[var(--text-muted)]">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          ENGINEERING SHOWCASE
          ============================================ */}
      <section className="py-24 bg-[var(--bg-secondary)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none">
          <img src="/illustrations/security-infrastructure.svg" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Engineering Showcase</h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto text-lg">
              How the platform is constructed — from frontend to database.
            </p>
          </div>

          <div className="card p-8 bg-[var(--bg-elevated)]">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {[
                { name: 'React + Vite', svg: 'architecture-react-vite', desc: 'TypeScript SPA with Vite, Tailwind and React Router' },
                { name: 'Django REST API', svg: 'architecture-django-rest-api', desc: 'DRF with session auth, CSRF, throttling and permissions' },
                { name: 'Django Backend', svg: 'architecture-django-backend', desc: 'Business logic, models, serializers and views' },
                { name: 'PostgreSQL', svg: 'architecture-postgresql', desc: 'Relational database with exclusion constraints' },
              ].map((item, i) => (
                <div key={i} className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--accent)]/30 transition-all duration-300">
                  <img src={`/illustrations/${item.svg}.svg`} alt={item.name} className="w-full h-auto" />
                  <div className="p-3">
                    <div className="font-semibold text-sm">{item.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-[var(--border)]">
              <div className="text-sm text-[var(--text-muted)] mb-3 text-center">Infrastructure & Tooling</div>
              <div className="flex flex-wrap justify-center gap-2">
                {['Docker Compose', 'Caddy (HTTPS)', 'GitHub Actions', 'Gitleaks', 'Bandit', 'WhiteNoise', 'PostgreSQL 18', 'Gunicorn'].map((item, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          FINAL CTA
          ============================================ */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-soft)] via-transparent to-[var(--accent-2-soft)] opacity-30" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to <span className="text-gradient">Explore?</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-lg mb-10 max-w-2xl mx-auto">
            Discover what can be built. Every capability links to a working demonstration.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/customer" className="btn btn-primary text-lg px-8 py-3.5">Try Customer Demo</Link>
            <Link to="/admin" className="btn btn-primary text-lg px-8 py-3.5">Try Admin Demo</Link>
            <Link to="/contact" className="btn btn-primary text-lg px-8 py-3.5">Contact Me</Link>
          </div>
        </div>
      </section>
    </div>
  );
}