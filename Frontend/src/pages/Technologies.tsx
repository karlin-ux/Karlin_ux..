import { useState, useMemo } from 'react';
import Icon from '../components/Icon';

/* ============================================
   TECHNOLOGY DATA MODEL
   ============================================ */
type TechStatus = 'used' | 'additional' | 'learning';

interface Technology {
  name: string;
  category: string;
  description: string;
  status: TechStatus;
  capabilities: string;
  icon?: string;
}

const technologies: Technology[] = [
  // === USED IN KARLIN_UX ===
  // Frontend
  { name: 'React', category: 'Frontend', description: 'Component-based UI library with hooks and context for building interactive interfaces.', status: 'used', capabilities: 'SPA development, component architecture, state management, hooks', icon: 'customer-experiences' },
  { name: 'TypeScript', category: 'Frontend', description: 'Typed superset of JavaScript for safer, more maintainable code.', status: 'used', capabilities: 'Type safety, interface definitions, compile-time error checking', icon: 'content-management' },
  { name: 'JavaScript', category: 'Frontend', description: 'Core programming language for web interactivity and logic.', status: 'used', capabilities: 'DOM manipulation, async operations, event handling', icon: 'ai-assisted-interfaces' },
  { name: 'Vite', category: 'Frontend', description: 'Next-generation frontend build tool with instant HMR and optimized production builds.', status: 'used', capabilities: 'Fast dev server, optimized bundling, code splitting', icon: 'analytics-reporting' },
  { name: 'Tailwind CSS', category: 'Frontend', description: 'Utility-first CSS framework for rapid UI development.', status: 'used', capabilities: 'Responsive design, design tokens, utility classes', icon: 'media-management' },
  { name: 'HTML5', category: 'Frontend', description: 'Semantic markup language for structuring web content.', status: 'used', capabilities: 'Semantic elements, accessibility, forms, media embedding', icon: 'content-management' },
  { name: 'CSS3', category: 'Frontend', description: 'Styling language for visual presentation and animations.', status: 'used', capabilities: 'Flexbox, Grid, animations, custom properties, responsive design', icon: 'media-management' },
  // Backend
  { name: 'Python', category: 'Backend', description: 'High-level programming language powering the Django backend.', status: 'used', capabilities: 'Server-side logic, data processing, API development', icon: 'security-infrastructure' },
  { name: 'Django', category: 'Backend', description: 'Full-featured Python web framework with ORM, admin and security built in.', status: 'used', capabilities: 'MVC architecture, ORM, authentication, migrations, middleware', icon: 'business-management' },
  { name: 'Django REST Framework', category: 'Backend', description: 'Toolkit for building Web APIs with serialization, authentication and permissions.', status: 'used', capabilities: 'RESTful APIs, serializers, viewsets, throttling, permissions', icon: 'role-based-access' },
  // Database
  { name: 'PostgreSQL', category: 'Database', description: 'Advanced open-source relational database with exclusion constraints.', status: 'used', capabilities: 'Relational data, ACID transactions, JSON support, GiST indexes', icon: 'metric-orders' },
  { name: 'SQL', category: 'Database', description: 'Structured Query Language for database operations and schema design.', status: 'used', capabilities: 'Queries, joins, aggregations, constraints, migrations', icon: 'metric-orders' },
  // Infrastructure
  { name: 'Docker', category: 'Infrastructure', description: 'Container platform for consistent development and deployment environments.', status: 'used', capabilities: 'Containerization, image building, multi-stage builds', icon: 'security-infrastructure' },
  { name: 'Docker Compose', category: 'Infrastructure', description: 'Multi-container orchestration for local and production deployment.', status: 'used', capabilities: 'Service orchestration, networking, volumes, health checks', icon: 'security-infrastructure' },
  { name: 'Caddy', category: 'Infrastructure', description: 'Modern reverse proxy with automatic HTTPS and simple configuration.', status: 'used', capabilities: 'Reverse proxy, TLS termination, static file serving', icon: 'security-infrastructure' },
  // CI/CD & Security
  { name: 'GitHub Actions', category: 'CI/CD', description: 'Automated CI/CD workflows for testing and deployment.', status: 'used', capabilities: 'Automated testing, linting, secret scanning, builds', icon: 'analytics-reporting' },
  { name: 'Gitleaks', category: 'Security', description: 'Secret scanning tool to prevent credential leaks in repositories.', status: 'used', capabilities: 'Secret detection, pre-commit hooks, CI integration', icon: 'security-infrastructure' },
  { name: 'Bandit', category: 'Security', description: 'Python security linter for finding common vulnerabilities.', status: 'used', capabilities: 'Static analysis, security scanning, vulnerability detection', icon: 'security-infrastructure' },
  // Testing
  { name: 'Django Test Framework', category: 'Testing', description: 'Built-in testing framework for Django applications.', status: 'used', capabilities: 'Unit tests, integration tests, test client, fixtures', icon: 'application-management' },
  { name: 'TypeScript Compiler', category: 'Testing', description: 'Static type checking for TypeScript code.', status: 'used', capabilities: 'Type checking, compile-time error detection', icon: 'content-management' },
  { name: 'ESLint (Oxlint)', category: 'Testing', description: 'JavaScript/TypeScript linter for code quality and consistency.', status: 'used', capabilities: 'Code quality, style enforcement, best practices', icon: 'content-management' },
  { name: 'WhiteNoise', category: 'Infrastructure', description: 'Simplified static file serving for Python web applications.', status: 'used', capabilities: 'Static file compression, manifest hashing, caching', icon: 'security-infrastructure' },
  { name: 'Gunicorn', category: 'Infrastructure', description: 'Python WSGI HTTP server for production deployment.', status: 'used', capabilities: 'Production serving, worker management, graceful restarts', icon: 'security-infrastructure' },
  { name: 'Pillow', category: 'Backend', description: 'Python imaging library for image processing and manipulation.', status: 'used', capabilities: 'Image resizing, format conversion, EXIF handling', icon: 'media-management' },

  // === ADDITIONAL CAPABILITIES ===
  // Web development
  { name: 'Responsive Web Design', category: 'Frontend', description: 'Building interfaces that adapt to all screen sizes and devices.', status: 'additional', capabilities: 'Mobile-first design, media queries, flexible layouts', icon: 'customer-experiences' },
  { name: 'Frontend Development', category: 'Frontend', description: 'Building user interfaces with modern frameworks and tools.', status: 'additional', capabilities: 'Component architecture, state management, routing', icon: 'customer-experiences' },
  { name: 'Backend Development', category: 'Backend', description: 'Server-side application development and API design.', status: 'additional', capabilities: 'Business logic, data processing, authentication', icon: 'business-management' },
  { name: 'Full-Stack Development', category: 'Backend', description: 'End-to-end application development from database to UI.', status: 'additional', capabilities: 'Complete application architecture, deployment', icon: 'business-management' },
  // Programming languages
  { name: 'Java', category: 'Languages', description: 'Object-oriented programming language for enterprise applications.', status: 'additional', capabilities: 'Enterprise software, Android apps, server applications', icon: 'security-infrastructure' },
  { name: 'Kotlin', category: 'Languages', description: 'Modern programming language for Android and server development.', status: 'additional', capabilities: 'Native Android applications, JVM applications', icon: 'security-infrastructure' },
  { name: 'C', category: 'Languages', description: 'Low-level systems programming language.', status: 'additional', capabilities: 'Systems programming, embedded systems, performance-critical code', icon: 'security-infrastructure' },
  { name: 'C++', category: 'Languages', description: 'High-performance programming language for systems and applications.', status: 'additional', capabilities: 'Game engines, systems software, high-performance applications', icon: 'security-infrastructure' },
  { name: 'C#', category: 'Languages', description: 'Modern object-oriented language for .NET ecosystem.', status: 'additional', capabilities: '.NET applications, Unity games, Windows services', icon: 'security-infrastructure' },
  { name: 'Lua', category: 'Languages', description: 'Lightweight scripting language for embedded systems and game logic.', status: 'additional', capabilities: 'Game scripting, configuration, embedded systems', icon: 'ai-assisted-interfaces' },
  { name: 'Roblox Luau', category: 'Languages', description: 'Typed variant of Lua used in Roblox game development.', status: 'additional', capabilities: 'Roblox game development, scripting, UI', icon: 'ai-assisted-interfaces' },
  // Databases and APIs
  { name: 'MySQL', category: 'Database', description: 'Popular open-source relational database management system.', status: 'additional', capabilities: 'Web applications, data storage, relational queries', icon: 'metric-orders' },
  { name: 'REST APIs', category: 'API', description: 'Representational State Transfer for building web services.', status: 'additional', capabilities: 'API design, CRUD operations, authentication, versioning', icon: 'role-based-access' },
  { name: 'GraphQL', category: 'API', description: 'Query language for APIs with flexible data fetching.', status: 'additional', capabilities: 'Flexible API queries, real-time subscriptions, schema design', icon: 'role-based-access' },
  { name: 'WebSockets', category: 'API', description: 'Full-duplex communication protocol for real-time applications.', status: 'additional', capabilities: 'Real-time chat, live updates, collaborative features', icon: 'role-based-access' },
  { name: 'JSON', category: 'Data', description: 'Lightweight data interchange format.', status: 'additional', capabilities: 'Data serialization, API responses, configuration', icon: 'content-management' },
  { name: 'XML', category: 'Data', description: 'Markup language for data storage and transport.', status: 'additional', capabilities: 'Data exchange, configuration, document storage', icon: 'content-management' },
  { name: 'Third-Party Integration', category: 'API', description: 'Integrating external services and APIs into applications.', status: 'additional', capabilities: 'Payment gateways, social login, cloud services', icon: 'security-infrastructure' },
  // Operating systems and infrastructure
  { name: 'Windows', category: 'Operating Systems', description: 'Microsoft operating system for desktop and server environments.', status: 'additional', capabilities: 'Desktop applications, system administration', icon: 'security-infrastructure' },
  { name: 'Linux', category: 'Operating Systems', description: 'Open-source operating system kernel and ecosystem.', status: 'additional', capabilities: 'Server administration, development environments', icon: 'security-infrastructure' },
  { name: 'Ubuntu', category: 'Operating Systems', description: 'Popular Debian-based Linux distribution.', status: 'additional', capabilities: 'Server deployment, development, package management', icon: 'security-infrastructure' },
  { name: 'Debian', category: 'Operating Systems', description: 'Stable Linux distribution known for reliability.', status: 'additional', capabilities: 'Server infrastructure, package management', icon: 'security-infrastructure' },
  { name: 'Arch Linux', category: 'Operating Systems', description: 'Rolling-release Linux distribution for advanced users.', status: 'additional', capabilities: 'Custom system configuration, package building', icon: 'security-infrastructure' },
  { name: 'Linux Servers', category: 'Infrastructure', description: 'Server administration and deployment on Linux systems.', status: 'additional', capabilities: 'SSH, systemd, nginx, firewall configuration', icon: 'security-infrastructure' },
  { name: 'Kubernetes', category: 'Infrastructure', description: 'Container orchestration platform for automated deployment and scaling.', status: 'additional', capabilities: 'Container orchestration, auto-scaling, service mesh', icon: 'security-infrastructure' },
  { name: 'Google Cloud', category: 'Cloud', description: 'Cloud computing platform for hosting and services.', status: 'additional', capabilities: 'Cloud hosting, storage, compute, managed services', icon: 'analytics-reporting' },
  { name: 'WireGuard', category: 'Infrastructure', description: 'Modern VPN protocol for secure network connections.', status: 'additional', capabilities: 'VPN setup, secure networking, tunneling', icon: 'security-infrastructure' },
  { name: 'CI/CD Pipelines', category: 'CI/CD', description: 'Automated build, test and deployment pipelines.', status: 'additional', capabilities: 'GitHub Actions, automated testing, deployment automation', icon: 'analytics-reporting' },
  // Android development
  { name: 'Android Studio', category: 'Mobile', description: 'Official IDE for Android application development.', status: 'additional', capabilities: 'Android app development, debugging, profiling', icon: 'customer-experiences' },
  { name: 'Android SDK', category: 'Mobile', description: 'Software development kit for Android applications.', status: 'additional', capabilities: 'Native Android apps, API integration, UI components', icon: 'customer-experiences' },
  { name: 'Kotlin Android Development', category: 'Mobile', description: 'Building native Android applications with Kotlin.', status: 'additional', capabilities: 'Native mobile apps, Android UI, coroutines', icon: 'customer-experiences' },
  // Software testing
  { name: 'Unit Testing', category: 'Testing', description: 'Testing individual components in isolation.', status: 'additional', capabilities: 'Test-driven development, code coverage, assertions', icon: 'application-management' },
  { name: 'Integration Testing', category: 'Testing', description: 'Testing interactions between components and systems.', status: 'additional', capabilities: 'API testing, database integration, service testing', icon: 'application-management' },
  { name: 'End-to-End Testing', category: 'Testing', description: 'Testing complete user workflows from start to finish.', status: 'additional', capabilities: 'Browser automation, user journey testing', icon: 'application-management' },
  { name: 'Regression Testing', category: 'Testing', description: 'Ensuring new changes don\'t break existing functionality.', status: 'additional', capabilities: 'Test suites, change impact analysis', icon: 'application-management' },
  { name: 'Manual Testing', category: 'Testing', description: 'Human-driven testing for usability and edge cases.', status: 'additional', capabilities: 'Exploratory testing, usability validation', icon: 'application-management' },
  { name: 'Load Testing', category: 'Testing', description: 'Testing application performance under heavy load.', status: 'additional', capabilities: 'Performance benchmarking, stress testing', icon: 'application-management' },
  { name: 'Performance Testing', category: 'Testing', description: 'Measuring and optimizing application speed and resource usage.', status: 'additional', capabilities: 'Profiling, optimization, bottleneck identification', icon: 'application-management' },
  { name: 'Pytest', category: 'Testing', description: 'Python testing framework with fixtures and parametrization.', status: 'additional', capabilities: 'Python unit tests, fixtures, mocking', icon: 'application-management' },
  { name: 'Selenium', category: 'Testing', description: 'Browser automation for testing web applications.', status: 'additional', capabilities: 'E2E testing, browser automation, scraping', icon: 'application-management' },
  { name: 'Cypress', category: 'Testing', description: 'End-to-end testing framework for web applications.', status: 'additional', capabilities: 'E2E testing, component testing, network stubbing', icon: 'application-management' },
  { name: 'Static Code Analysis', category: 'Testing', description: 'Automated analysis of source code for quality and security.', status: 'additional', capabilities: 'Linting, security scanning, code quality', icon: 'application-management' },
  { name: 'Debugging', category: 'Testing', description: 'Systematic problem identification and resolution.', status: 'additional', capabilities: 'Breakpoint debugging, log analysis, profiling', icon: 'application-management' },
  // Creative and 3D
  { name: 'Blender', category: 'Creative', description: '3D creation suite for modelling, rendering and animation.', status: 'additional', capabilities: '3D modelling, rendering, animation, asset creation', icon: '3d-product-experiences' },
  { name: '3D Modelling', category: 'Creative', description: 'Creating three-dimensional digital models and assets.', status: 'additional', capabilities: '3D assets, product visualization, game assets', icon: '3d-product-experiences' },

  // === CURRENTLY LEARNING ===
  { name: 'Ruby', category: 'Languages', description: 'Dynamic programming language with elegant syntax.', status: 'learning', capabilities: 'Web development, scripting, automation', icon: 'ai-assisted-interfaces' },
  { name: 'OPNsense', category: 'Infrastructure', description: 'Open-source firewall and routing platform.', status: 'learning', capabilities: 'Firewall administration, network security, routing', icon: 'security-infrastructure' },
  { name: 'API Development', category: 'Backend', description: 'Advanced API design patterns and best practices.', status: 'learning', capabilities: 'REST, GraphQL, API versioning, documentation', icon: 'role-based-access' },
  { name: 'Software Deployment', category: 'Infrastructure', description: 'Advanced deployment strategies and infrastructure management.', status: 'learning', capabilities: 'CI/CD, container orchestration, monitoring', icon: 'analytics-reporting' },
  { name: 'AI Integrations', category: 'Backend', description: 'Integrating AI and machine learning capabilities into applications.', status: 'learning', capabilities: 'LLM APIs, embeddings, AI-powered features', icon: 'ai-assisted-interfaces' },
];

const categories = ['All', 'Frontend', 'Backend', 'Languages', 'Database', 'API', 'Data', 'Infrastructure', 'Operating Systems', 'Cloud', 'Mobile', 'Testing', 'Creative', 'CI/CD', 'Security'];

export default function Technologies() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<TechStatus | 'all'>('all');
  const [selectedTech, setSelectedTech] = useState<Technology | null>(null);

  const filtered = useMemo(() => {
    return technologies.filter(t => {
      if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.capabilities.toLowerCase().includes(q);
      }
      return true;
    });
  }, [search, categoryFilter, statusFilter]);

  const usedCount = technologies.filter(t => t.status === 'used').length;
  const additionalCount = technologies.filter(t => t.status === 'additional').length;
  const learningCount = technologies.filter(t => t.status === 'learning').length;

  const statusColors = {
    used: { bg: 'rgba(83,245,176,0.10)', text: '#53F5B0', border: '#53F5B0', label: 'USED IN THIS BUILD' },
    additional: { bg: 'rgba(240,120,131,0.08)', text: '#F07883', border: '#F07883', label: 'NOT CURRENTLY USED IN THIS BUILD' },
    learning: { bg: 'rgba(245,189,88,0.10)', text: '#F5BD58', border: '#F5BD58', label: 'CURRENTLY LEARNING' },
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      {/* Hero */}
      <section className="text-center py-12">
        <div className="text-xs font-medium text-[var(--accent)] uppercase tracking-widest mb-3">Engineering Toolkit</div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Technologies & Capabilities</h1>
        <p className="text-[var(--text-secondary)] max-w-2xl mx-auto text-lg mb-8">
          From full-stack development and database engineering to mobile applications, cloud infrastructure and software testing — explore the technologies I use and the tools I can bring to a project.
        </p>

        {/* Counters */}
        <div className="flex justify-center gap-8 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-[var(--accent)]">{usedCount}</div>
            <div className="text-xs text-[var(--text-muted)]">Used in this platform</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: '#F07883' }}>{additionalCount}</div>
            <div className="text-xs text-[var(--text-muted)]">Additional capabilities</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[var(--warning)]">{learningCount}</div>
            <div className="text-xs text-[var(--text-muted)]">Currently learning</div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#53F5B0' }} />
            <span className="text-[var(--text-secondary)]">Used in Karlin_ux</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#F07883' }} />
            <span className="text-[var(--text-secondary)]">Not currently used in this build</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#F5BD58' }} />
            <span className="text-[var(--text-secondary)]">Currently learning</span>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <input
            className="input max-w-md"
            placeholder="Search technologies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {/* Status filter */}
          <div className="flex gap-2">
            {(['all', 'used', 'additional', 'learning'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {s === 'all' ? 'All Status' : s === 'used' ? 'Used' : s === 'additional' ? 'Additional' : 'Learning'}
              </button>
            ))}
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                categoryFilter === c
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text)] border border-[var(--border)]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Results count */}
      <div className="text-sm text-[var(--text-muted)]">
        Showing {filtered.length} of {technologies.length} technologies
      </div>

      {/* Technology Grid */}
      <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((tech, i) => {
          const colors = statusColors[tech.status];
          return (
            <div
              key={i}
              onClick={() => setSelectedTech(tech)}
              className="card p-5 cursor-pointer hover:border-[var(--border-strong)] transition-all duration-300 group"
              style={{ borderLeft: `3px solid ${colors.border}` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: colors.bg }}>
                    <Icon name={tech.icon || 'content-management'} size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{tech.name}</h3>
                    <span className="text-xs text-[var(--text-muted)]">{tech.category}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">{tech.description}</p>
              <div className="text-xs font-medium px-2 py-1 rounded-md inline-block" style={{ background: colors.bg, color: colors.text }}>
                {colors.label}
              </div>
            </div>
          );
        })}
      </section>

      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <div className="mb-3 flex justify-center"><Icon name="search" size={48} /></div>
          <p className="text-[var(--text-muted)]">No technologies match your filters.</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedTech && (
        <div className="modal-overlay" onClick={() => setSelectedTech(null)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: statusColors[selectedTech.status].bg }}>
                  <Icon name={selectedTech.icon || 'content-management'} size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedTech.name}</h2>
                  <span className="text-sm text-[var(--text-muted)]">{selectedTech.category}</span>
                </div>
              </div>
              <button onClick={() => setSelectedTech(null)} className="text-[var(--text-muted)] hover:text-[var(--text)] text-xl">✕</button>
            </div>

            <div className="mb-4">
              <div className="text-xs font-medium px-2 py-1 rounded-md inline-block mb-3" style={{ background: statusColors[selectedTech.status].bg, color: statusColors[selectedTech.status].text }}>
                {statusColors[selectedTech.status].label}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-1">Description</h4>
                <p className="text-[var(--text)]">{selectedTech.description}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-1">What it can be used to build</h4>
                <p className="text-[var(--text)]">{selectedTech.capabilities}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-1">Part of Karlin_ux?</h4>
                <p className="text-[var(--text)]">
                  {selectedTech.status === 'used' ? 'Yes — actively used in this platform.' : selectedTech.status === 'learning' ? 'Not yet — currently being explored.' : 'No — available as an additional capability.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}