import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { api } from '../api/client';
import Icon from '../components/Icon';

/* ============================================
   CAPABILITIES DATA
   ============================================ */
const capabilities = [
  { title: 'Customer Experiences', desc: 'Registration, authentication, profiles, orders, bookings and customer self-service portals.', icon: 'customer-experiences', size: 'large', category: 'Core' },
  { title: 'Business Management', desc: 'Product catalogues, order processing, customer management and workspace administration.', icon: 'business-management', size: 'large', category: 'Core' },
  { title: 'Analytics & Reporting', desc: 'Real-time dashboards, trend analysis and business intelligence from live data.', icon: 'analytics-reporting', size: 'large', category: 'Core' },
  { title: 'Content Management', desc: 'Page builder, content revisions, media management and SEO-friendly content.', icon: 'content-management', size: 'large', category: 'Core' },
  { title: 'Media Management', desc: 'Secure file uploads, image processing, variant generation and storage tracking.', icon: 'media-management', size: 'small', category: 'Supporting' },
  { title: 'Booking Systems', desc: 'Calendar-based scheduling with conflict prevention and multi-duration support.', icon: 'booking-systems', size: 'small', category: 'Supporting' },
  { title: 'Application Management', desc: 'Customer applications, review workflows and status tracking.', icon: 'application-management', size: 'small', category: 'Supporting' },
  { title: 'Role-Based Access', desc: 'Multi-tier authorization: customer, workspace admin and platform super admin.', icon: 'role-based-access', size: 'small', category: 'Supporting' },
  { title: 'AI-Assisted Interfaces', desc: 'Voice navigation, command palette and assistant integration.', icon: 'ai-assisted-interfaces', size: 'small', category: 'Supporting' },
  { title: 'Search', desc: 'Full-text search across products, customers and content.', icon: 'search', size: 'small', category: 'Supporting' },
  { title: '3D Product Experiences', desc: 'Interactive 3D product viewers with model loading and controls.', icon: '3d-product-experiences', size: 'small', category: 'Supporting' },
  { title: 'Security & Infrastructure', desc: 'CSRF protection, workspace isolation, rate limiting, Docker and Caddy.', icon: 'security-infrastructure', size: 'small', category: 'Supporting' },
];

const projects = [
  { name: 'Karlin_ux Platform', desc: 'Full-stack portfolio and business management platform with Django backend, React frontend, PostgreSQL, Docker and Caddy.', tech: ['Django', 'React', 'TypeScript', 'PostgreSQL', 'Docker'], status: 'Active' },
  { name: 'Customer Management System', desc: 'Customer accounts, profiles, order tracking and communication tools.', tech: ['Django', 'DRF', 'React'], status: 'Active' },
  { name: 'Booking & Scheduling', desc: 'Calendar-based booking with conflict prevention and multi-duration support.', tech: ['Django', 'PostgreSQL', 'React'], status: 'Active' },
  { name: 'Media Management', desc: 'Secure file uploads, image processing, variant generation and storage tracking.', tech: ['Django', 'Pillow', 'React'], status: 'Active' },
];

const techStack = [
  { category: 'Frontend', items: ['React 19', 'TypeScript', 'Vite', 'Tailwind CSS', 'React Router'] },
  { category: 'Backend', items: ['Django 5.2', 'Django REST Framework', 'Python', 'Gunicorn'] },
  { category: 'Database', items: ['PostgreSQL 18', 'Exclusion Constraints', 'Migrations'] },
  { category: 'Infrastructure', items: ['Docker Compose', 'Caddy', 'GitHub Actions', 'WhiteNoise'] },
  { category: 'Security', items: ['CSRF Protection', 'Session Auth', 'Rate Limiting', 'Workspace Isolation'] },
  { category: 'Testing', items: ['56 Backend Tests', 'TypeScript', 'ESLint', 'Gitleaks', 'Bandit'] },
];

export default function Home() {
  const [hoveredCap, setHoveredCap] = useState<number | null>(null);
  const [demoTab, setDemoTab] = useState('overview');
  const [demoData, setDemoData] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(true);
    // Load demo data for the live preview
    api.get('/demo/analytics-summary/').then(r => setDemoData(r.data)).catch(() => {});
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* ============================================
          ANIMATED BACKGROUND
          ============================================ */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        {/* Radial gradients */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[var(--accent)] rounded-full blur-[200px] opacity-[0.07] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-[var(--accent-2)] rounded-full blur-[180px] opacity-[0.06] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-[var(--accent-3)] rounded-full blur-[160px] opacity-[0.05] animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Floating particles */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-[var(--accent)] rounded-full opacity-30 animate-bounce" style={{ animationDuration: '6s' }} />
        <div className="absolute top-40 right-20 w-1.5 h-1.5 bg-[var(--accent-2)] rounded-full opacity-20 animate-bounce" style={{ animationDuration: '8s', animationDelay: '1s' }} />
        <div className="absolute bottom-32 left-1/4 w-1 h-1 bg-[var(--accent-3)] rounded-full opacity-25 animate-bounce" style={{ animationDuration: '7s', animationDelay: '3s' }} />
        <div className="absolute top-60 right-1/3 w-2 h-2 bg-[var(--accent)] rounded-full opacity-20 animate-bounce" style={{ animationDuration: '9s', animationDelay: '2s' }} />
      </div>

      {/* ============================================
          HERO SECTION — Two Column
          ============================================ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-20 pb-16 overflow-hidden">
        {/* Background SVG */}
        <div className="absolute inset-0 opacity-[0.0375] pointer-events-none">
          <img src="/illustrations/customer-experiences.svg" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Content */}
            <div className={`space-y-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {/* Status indicator */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-soft)] border border-[var(--accent)]/20 text-[var(--accent)] text-sm font-medium">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--accent)]" />
                </span>
                Available for new projects
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
                Building Modern
                <br />
                <span className="text-gradient">Digital Platforms</span>
              </h1>

              <p className="text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed max-w-xl">
                A self-taught full-stack developer crafting real, working software — from customer experiences to business management systems.
                Every feature backed by Django, PostgreSQL, and modern infrastructure.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link to="/explore" className="btn btn-primary text-base px-8 py-3.5">
                  Explore Capabilities
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
                <Link to="/projects" className="btn btn-secondary text-base px-8 py-3.5">
                  View Projects
                </Link>
              </div>

              {/* Tech indicators */}
              <div className="flex flex-wrap gap-3 pt-4">
                {['React', 'Django', 'PostgreSQL', 'Docker', 'TypeScript'].map((tech, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)]">
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Interactive Visual Composition */}
            <div className={`relative transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
              {/* Main dashboard panel */}
              <div className="relative">
                {/* Floating panels */}
                <div className="absolute -top-6 -left-6 w-48 h-32 card p-4 bg-[var(--bg-elevated)]/80 backdrop-blur-xl border-[var(--accent)]/20 shadow-2xl animate-float z-10" style={{ animationDuration: '6s' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="analytics-reporting" size={16} />
                    <span className="text-xs font-medium text-[var(--text-secondary)]">Analytics</span>
                  </div>
                  <div className="text-2xl font-bold text-[var(--accent)]">£12.4k</div>
                  <div className="text-xs text-[var(--text-muted)]">Revenue this month</div>
                  <div className="mt-2 h-8 flex items-end gap-1">
                    {[30, 50, 35, 60, 45, 70, 55].map((h, i) => (
                      <div key={i} className="flex-1 bg-[var(--accent)]/30 rounded-t" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>

                <div className="absolute -bottom-4 -right-4 w-44 h-28 card p-4 bg-[var(--bg-elevated)]/80 backdrop-blur-xl border-[var(--accent-2)]/20 shadow-2xl animate-float z-10" style={{ animationDuration: '7s', animationDelay: '1s' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="metric-customers" size={16} />
                    <span className="text-xs font-medium text-[var(--text-secondary)]">Customers</span>
                  </div>
                  <div className="text-2xl font-bold text-[var(--accent-2)]">248</div>
                  <div className="text-xs text-[var(--text-muted)]">+12 this week</div>
                </div>

                <div className="absolute top-1/2 -right-8 w-40 h-24 card p-4 bg-[var(--bg-elevated)]/80 backdrop-blur-xl border-[var(--accent-3)]/20 shadow-2xl animate-float z-10" style={{ animationDuration: '8s', animationDelay: '2s' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="security-infrastructure" size={16} />
                    <span className="text-xs font-medium text-[var(--text-secondary)]">System</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
                    <span className="text-sm font-medium text-[var(--success)]">All healthy</span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">56 tests passing</div>
                </div>

                {/* Main panel */}
                <div className="card p-6 bg-[var(--bg-elevated)]/60 backdrop-blur-xl border-[var(--border-strong)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[var(--error)]" />
                      <div className="w-3 h-3 rounded-full bg-[var(--warning)]" />
                      <div className="w-3 h-3 rounded-full bg-[var(--success)]" />
                    </div>
                    <span className="text-xs text-[var(--text-muted)] font-mono">karlin_ux dashboard</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[var(--bg-surface)] rounded-lg p-3">
                      <div className="text-xs text-[var(--text-muted)] mb-1">Products</div>
                      <div className="text-xl font-bold">24</div>
                    </div>
                    <div className="bg-[var(--bg-surface)] rounded-lg p-3">
                      <div className="text-xs text-[var(--text-muted)] mb-1">Orders</div>
                      <div className="text-xl font-bold">156</div>
                    </div>
                    <div className="bg-[var(--bg-surface)] rounded-lg p-3">
                      <div className="text-xs text-[var(--text-muted)] mb-1">Customers</div>
                      <div className="text-xl font-bold">89</div>
                    </div>
                    <div className="bg-[var(--bg-surface)] rounded-lg p-3">
                      <div className="text-xs text-[var(--text-muted)] mb-1">Bookings</div>
                      <div className="text-xl font-bold">34</div>
                    </div>
                  </div>
                  <div className="mt-4 h-24 bg-[var(--bg-surface)] rounded-lg flex items-end gap-1 p-2">
                    {[20, 35, 25, 45, 30, 55, 40, 65, 50, 70, 45, 60].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-[var(--accent)] to-[var(--accent-2)] rounded-t opacity-70" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Icon name="notifications" size={12} />
                    <span>3 new notifications</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          CAPABILITIES — Bento Grid
          ============================================ */}
      <section className="py-24 bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Can Be Built</h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto text-lg">
              A modern website can do much more than display information. Explore the systems and features
              that can be developed for real business applications.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[180px]">
            {capabilities.map((cap, i) => {
              const isLarge = cap.size === 'large';
              return (
                <div
                  key={i}
                  className={`group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 transition-all duration-500 hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-glow)] cursor-pointer ${isLarge ? 'md:col-span-2 md:row-span-2' : ''}`}
                  onMouseEnter={() => setHoveredCap(i)}
                  onMouseLeave={() => setHoveredCap(null)}
                >
                  {/* Background SVG illustration */}
                  <div className="absolute inset-0 opacity-[0.05] group-hover:opacity-[0.10] transition-opacity duration-500 pointer-events-none">
                    <img src={`/illustrations/${cap.icon}.svg`} alt="" className="w-full h-full object-cover" />
                  </div>
                  {/* Background gradient on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br from-[var(--accent-soft)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                  <div className="relative z-10 h-full flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`transition-transform duration-500 ${hoveredCap === i ? 'scale-110' : ''}`}>
                        <Icon name={cap.icon} size={isLarge ? 40 : 28} />
                      </div>
                      <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{cap.category}</span>
                    </div>

                    <h3 className={`font-bold mb-2 group-hover:text-[var(--accent)] transition-colors duration-300 ${isLarge ? 'text-xl' : 'text-base'}`}>
                      {cap.title}
                    </h3>

                    <p className={`text-[var(--text-secondary)] leading-relaxed transition-all duration-300 ${hoveredCap === i ? 'opacity-100' : 'opacity-70'} ${isLarge ? 'text-sm' : 'text-xs line-clamp-2'}`}>
                      {cap.desc}
                    </p>

                    {/* Hover reveal */}
                    <div className={`mt-auto pt-3 transition-all duration-300 ${hoveredCap === i ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                      <span className="text-xs text-[var(--accent)] font-medium flex items-center gap-1">
                        Explore
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </span>
                    </div>
                  </div>
                </div>
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
              <span className="text-[var(--warning)] ml-1">(Simulated demonstration data)</span>
            </p>
          </div>

          {/* Dashboard window */}
          <div className="card p-0 overflow-hidden border-[var(--border-strong)] shadow-2xl">
            {/* Title bar */}
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

            {/* Dashboard content */}
            <div className="p-6 bg-[var(--bg-elevated)]">
              {/* Tabs */}
              <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
                {['overview', 'analytics', 'activity'].map(t => (
                  <button
                    key={t}
                    onClick={() => setDemoTab(t)}
                    className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 ${
                      demoTab === t
                        ? 'text-[var(--accent)] border-[var(--accent)]'
                        : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {demoTab === 'overview' && (
                <div className="grid md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Orders', value: demoData?.total_orders || 0, icon: 'orders', color: 'var(--accent)' },
                    { label: 'Revenue', value: `£${demoData?.total_revenue || '0.00'}`, icon: 'metric-revenue', color: 'var(--accent-2)' },
                    { label: 'Customers', value: demoData?.total_customers || 0, icon: 'metric-customers', color: 'var(--accent-3)' },
                    { label: 'Products', value: demoData?.product_count || 0, icon: 'catalogue', color: 'var(--info)' },
                  ].map((s, i) => (
                    <div key={i} className="bg-[var(--bg-surface)] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Icon name={s.icon} size={20} />
                        <span className="text-xs text-[var(--text-muted)]">{s.label}</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {demoTab === 'analytics' && (
                <div className="space-y-4">
                  <div className="bg-[var(--bg-surface)] rounded-xl p-4 h-48 flex items-end gap-2">
                    {[20, 35, 25, 45, 30, 55, 40, 65, 50, 70, 45, 60, 55, 75, 50, 65].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-[var(--accent)] to-[var(--accent-2)] rounded-t opacity-60 hover:opacity-100 transition-opacity" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                    <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
                  </div>
                </div>
              )}

              {demoTab === 'activity' && (
                <div className="space-y-3">
                  {[
                    { action: 'New order placed', time: '2 min ago', icon: 'orders' },
                    { action: 'Customer registered', time: '5 min ago', icon: 'customer-experiences' },
                    { action: 'Product updated', time: '12 min ago', icon: 'catalogue' },
                    { action: 'Booking confirmed', time: '18 min ago', icon: 'bookings' },
                    { action: 'Media uploaded', time: '25 min ago', icon: 'media-management' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                      <Icon name={item.icon} size={16} />
                      <span className="flex-1 text-sm">{item.action}</span>
                      <span className="text-xs text-[var(--text-muted)]">{item.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          PROJECT SHOWCASE
          ============================================ */}
      <section className="py-24 bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Projects</h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto text-lg">
              Real projects built with modern technologies. Each one demonstrates practical engineering.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {projects.map((p, i) => {
              const svgMap: Record<string, string> = {
                'Karlin_ux Platform': 'featured-karlin-ux-platform',
                'Customer Management System': 'featured-customer-management',
                'Booking & Scheduling': 'featured-booking-scheduling',
                'Media Management': 'featured-media-management',
              };
              const svgName = svgMap[p.name] || 'featured-karlin-ux-platform';
              return (
              <div key={i} className="group card p-0 overflow-hidden hover:border-[var(--accent)]/30 transition-all duration-300">
                <div className="h-48 bg-[var(--bg-surface)] relative overflow-hidden">
                  <img src={`/illustrations/${svgName}.svg`} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute bottom-4 left-4">
                    <span className="badge badge-success">{p.status}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 group-hover:text-[var(--accent)] transition-colors">{p.name}</h3>
                  <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">{p.desc}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {p.tech.map((t, j) => (
                      <span key={j} className="px-2 py-1 rounded-md text-xs font-medium bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)]">
                        {t}
                      </span>
                    ))}
                  </div>
                  <Link to="/explore" className="text-[var(--accent)] text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
                    Explore capabilities
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </Link>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </section>

      {/* ============================================
          ENGINEERING ARCHITECTURE
          ============================================ */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none">
          <img src="/illustrations/security-infrastructure.svg" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Engineering Architecture</h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto text-lg">
              A visual overview of the technology stack and how everything connects.
            </p>
          </div>

          {/* Architecture diagram */}
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

            {/* Infrastructure items */}
            <div className="mt-8 pt-8 border-t border-[var(--border)]">
              <div className="text-sm text-[var(--text-muted)] mb-4 text-center">Infrastructure & Tooling</div>
              <div className="flex flex-wrap justify-center gap-3">
                {['Docker Compose', 'Caddy (HTTPS)', 'GitHub Actions', 'Gitleaks', 'Bandit', 'WhiteNoise', 'PostgreSQL 18'].map((item, i) => (
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
          TECHNOLOGY STACK
          ============================================ */}
      <section className="py-24 bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Technology Stack</h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto text-lg">
              Real technologies from the repository. Grouped by domain.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {techStack.map((group, i) => (
              <div key={i} className="card p-6 hover:border-[var(--accent)]/20 transition-all duration-300">
                <h3 className="text-lg font-bold mb-4 text-[var(--accent)]">{group.category}</h3>
                <div className="space-y-2">
                  {group.items.map((item, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          FINAL CTA
          ============================================ */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-soft)] via-transparent to-[var(--accent-2-soft)] opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--accent)] rounded-full blur-[200px] opacity-[0.08]" />

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Have an idea?{' '}
            <span className="text-gradient">Let's build something remarkable.</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-lg mb-10 max-w-2xl mx-auto">
            From customer experiences to business management systems — I build software that works.
            Explore the capabilities, create an account, or get in touch.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/explore" className="btn btn-primary text-lg px-8 py-3.5">
              Explore Capabilities
            </Link>
            <Link to="/register" className="btn btn-secondary text-lg px-8 py-3.5">
              Create Account
            </Link>
            <Link to="/contact" className="btn btn-ghost text-lg px-8 py-3.5">
              Contact Me
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================
          FOOTER
          ============================================ */}
      <footer className="border-t border-[var(--border)] py-12 bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="font-bold text-xl text-gradient mb-3">Karlin_ux</div>
              <p className="text-sm text-[var(--text-muted)]">
                Full-stack development portfolio and interactive showcase platform.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3 text-[var(--text)]">Navigation</h4>
              <div className="space-y-2">
                {['Home', 'Explore', 'Projects', 'Technologies', 'About', 'Contact'].map((item, i) => (
                  <Link key={i} to={`/${item.toLowerCase() === 'home' ? '' : item.toLowerCase()}`} className="block text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                    {item}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3 text-[var(--text)]">Platform</h4>
              <div className="space-y-2">
                {[
                  { label: 'Customer Dashboard', path: '/customer' },
                  { label: 'Workspace Admin', path: '/admin' },
                  { label: 'Media Library', path: '/media' },
                  { label: 'Reports', path: '/reports' },
                ].map((item, i) => (
                  <Link key={i} to={item.path} className="block text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3 text-[var(--text)]">Technology</h4>
              <div className="space-y-2 text-sm text-[var(--text-muted)]">
                <div>Django + DRF</div>
                <div>React + TypeScript</div>
                <div>PostgreSQL</div>
                <div>Docker + Caddy</div>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-[var(--border)] text-center text-sm text-[var(--text-muted)]">
            © {new Date().getFullYear()} Karlin_ux. Built with Django, React, PostgreSQL, and Tailwind CSS.
          </div>
        </div>
      </footer>
    </div>
  );
}