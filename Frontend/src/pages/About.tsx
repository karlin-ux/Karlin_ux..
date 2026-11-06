import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';

/* ============================================
   EXPERIENCE DATA (from CV)
   ============================================ */
const experience = [
  { area: 'Web Development', years: 7, color: 'var(--accent)', icon: 'customer-experiences' },
  { area: 'Database Development', years: 4, color: 'var(--accent-2)', icon: 'metric-orders' },
  { area: 'Software Testing', years: 2, color: 'var(--accent-3)', icon: 'application-management' },
  { area: 'Android Development', years: 1, color: 'var(--warning)', icon: 'customer-experiences' },
];

/* ============================================
   SKILLS DATA (from CV)
   ============================================ */
type SkillStatus = 'used' | 'additional' | 'learning';

interface Skill {
  name: string;
  category: string;
  description: string;
  status: SkillStatus;
  related: string[];
}

const skills: Skill[] = [
  // Programming Languages
  { name: 'Python', category: 'Languages', description: 'High-level language powering Django backend and automation scripts.', status: 'used', related: ['Django', 'PostgreSQL', 'Pytest'] },
  { name: 'Java', category: 'Languages', description: 'Object-oriented language for enterprise and Android development.', status: 'additional', related: ['Android SDK', 'Kotlin'] },
  { name: 'Kotlin', category: 'Languages', description: 'Modern language for Android and JVM applications.', status: 'additional', related: ['Android Studio', 'Java'] },
  { name: 'JavaScript', category: 'Languages', description: 'Core web language for frontend interactivity.', status: 'used', related: ['React', 'TypeScript', 'HTML5'] },
  { name: 'TypeScript', category: 'Languages', description: 'Typed JavaScript for safer, maintainable frontend code.', status: 'used', related: ['React', 'Vite', 'JavaScript'] },
  { name: 'C', category: 'Languages', description: 'Low-level systems programming language.', status: 'additional', related: ['C++', 'Linux'] },
  { name: 'C++', category: 'Languages', description: 'High-performance language for systems and applications.', status: 'additional', related: ['C', 'Game Engines'] },
  { name: 'C#', category: 'Languages', description: 'Modern language for .NET ecosystem and Unity.', status: 'additional', related: ['.NET', 'Unity'] },
  { name: 'Ruby', category: 'Languages', description: 'Dynamic language with elegant syntax.', status: 'learning', related: ['Rails', 'Scripting'] },
  { name: 'SQL', category: 'Languages', description: 'Query language for relational databases.', status: 'used', related: ['PostgreSQL', 'MySQL'] },
  { name: 'Lua', category: 'Languages', description: 'Lightweight scripting for embedded systems and games.', status: 'additional', related: ['Roblox Luau'] },
  { name: 'Roblox Luau', category: 'Languages', description: 'Typed Lua variant for Roblox game development.', status: 'additional', related: ['Lua'] },

  // Frontend
  { name: 'HTML5', category: 'Frontend', description: 'Semantic markup for web content structure.', status: 'used', related: ['CSS3', 'JavaScript', 'Accessibility'] },
  { name: 'CSS3', category: 'Frontend', description: 'Styling language for visual presentation.', status: 'used', related: ['Tailwind CSS', 'HTML5', 'Responsive Design'] },
  { name: 'Tailwind CSS', category: 'Frontend', description: 'Utility-first CSS framework for rapid UI development.', status: 'used', related: ['CSS3', 'React', 'Responsive Design'] },
  { name: 'Responsive Web Design', category: 'Frontend', description: 'Building interfaces that adapt to all screen sizes.', status: 'additional', related: ['CSS3', 'HTML5', 'Mobile-First'] },
  { name: 'Frontend Development', category: 'Frontend', description: 'Building user interfaces with modern frameworks.', status: 'additional', related: ['React', 'TypeScript', 'Tailwind CSS'] },
  { name: 'User Interface Development', category: 'Frontend', description: 'Designing and implementing user-facing interfaces.', status: 'additional', related: ['Frontend Development', 'UX Design'] },

  // Backend & API
  { name: 'Django', category: 'Backend', description: 'Full-featured Python web framework with ORM and security.', status: 'used', related: ['Python', 'PostgreSQL', 'DRF'] },
  { name: 'Django REST Framework', category: 'Backend', description: 'Toolkit for building Web APIs with serializers and permissions.', status: 'used', related: ['Django', 'REST APIs', 'Python'] },
  { name: 'Backend Development', category: 'Backend', description: 'Server-side application logic and data processing.', status: 'additional', related: ['Django', 'Python', 'APIs'] },
  { name: 'Full-Stack Development', category: 'Backend', description: 'End-to-end application development from database to UI.', status: 'additional', related: ['Frontend', 'Backend', 'Database'] },
  { name: 'REST APIs', category: 'Backend', description: 'Designing and implementing RESTful web services.', status: 'used', related: ['Django REST Framework', 'JSON', 'HTTP'] },
  { name: 'GraphQL', category: 'Backend', description: 'Query language for flexible API data fetching.', status: 'additional', related: ['REST APIs', 'API Design'] },
  { name: 'WebSockets', category: 'Backend', description: 'Real-time bidirectional communication protocol.', status: 'additional', related: ['Real-time Apps', 'Chat', 'Live Updates'] },
  { name: 'JSON', category: 'Backend', description: 'Lightweight data interchange format.', status: 'used', related: ['REST APIs', 'JavaScript', 'Python'] },
  { name: 'XML', category: 'Backend', description: 'Markup language for data storage and transport.', status: 'additional', related: ['Data Exchange', 'Configuration'] },
  { name: 'Third-Party API Integration', category: 'Backend', description: 'Integrating external services and APIs.', status: 'additional', related: ['REST APIs', 'OAuth', 'Webhooks'] },

  // Databases
  { name: 'PostgreSQL', category: 'Database', description: 'Advanced relational database with exclusion constraints.', status: 'used', related: ['SQL', 'Django ORM', 'Docker'] },
  { name: 'MySQL', category: 'Database', description: 'Popular open-source relational database.', status: 'additional', related: ['SQL', 'Web Applications'] },
  { name: 'Database Design', category: 'Database', description: 'Designing efficient database schemas and relationships.', status: 'used', related: ['PostgreSQL', 'SQL', 'Migrations'] },
  { name: 'Database Development', category: 'Database', description: 'Building and maintaining database systems.', status: 'additional', related: ['SQL', 'PostgreSQL', 'MySQL'] },
  { name: 'Schema Design', category: 'Database', description: 'Creating database table structures and relationships.', status: 'used', related: ['Database Design', 'Migrations'] },
  { name: 'Database Migrations', category: 'Database', description: 'Managing database schema changes over time.', status: 'used', related: ['Django', 'PostgreSQL', 'Schema Design'] },
  { name: 'Database Constraints', category: 'Database', description: 'Enforcing data integrity at the database level.', status: 'used', related: ['PostgreSQL', 'Exclusion Constraints'] },

  // Operating Systems
  { name: 'Windows', category: 'Operating Systems', description: 'Microsoft operating system for desktop and server.', status: 'additional', related: ['Development', 'Administration'] },
  { name: 'Linux', category: 'Operating Systems', description: 'Open-source operating system for servers and development.', status: 'used', related: ['Ubuntu', 'Docker', 'Servers'] },
  { name: 'Ubuntu', category: 'Operating Systems', description: 'Popular Debian-based Linux distribution.', status: 'used', related: ['Linux', 'Docker', 'Servers'] },
  { name: 'Debian', category: 'Operating Systems', description: 'Stable Linux distribution for servers.', status: 'additional', related: ['Linux', 'Servers'] },
  { name: 'Arch Linux', category: 'Operating Systems', description: 'Rolling-release Linux for advanced users.', status: 'additional', related: ['Linux', 'Package Management'] },

  // Infrastructure & Cloud
  { name: 'Docker', category: 'Infrastructure', description: 'Container platform for consistent environments.', status: 'used', related: ['Docker Compose', 'Linux', 'Caddy'] },
  { name: 'Kubernetes', category: 'Infrastructure', description: 'Container orchestration for automated deployment.', status: 'additional', related: ['Docker', 'Cloud', 'Scaling'] },
  { name: 'Google Cloud', category: 'Infrastructure', description: 'Cloud computing platform for hosting and services.', status: 'additional', related: ['Cloud', 'Hosting', 'Compute'] },
  { name: 'Linux Server Administration', category: 'Infrastructure', description: 'Managing and configuring Linux servers.', status: 'used', related: ['Linux', 'Docker', 'SSH'] },
  { name: 'Web Hosting', category: 'Infrastructure', description: 'Deploying and managing web applications.', status: 'additional', related: ['Docker', 'Caddy', 'Domains'] },
  { name: 'Domain Management', category: 'Infrastructure', description: 'DNS configuration and domain management.', status: 'additional', related: ['Web Hosting', 'Caddy'] },
  { name: 'CI/CD Pipelines', category: 'Infrastructure', description: 'Automated build, test and deployment workflows.', status: 'used', related: ['GitHub Actions', 'Docker', 'Testing'] },
  { name: 'WireGuard', category: 'Infrastructure', description: 'Modern VPN protocol for secure networking.', status: 'additional', related: ['Networking', 'Security', 'VPN'] },
  { name: 'OPNsense', category: 'Infrastructure', description: 'Open-source firewall and routing platform.', status: 'learning', related: ['Firewalls', 'Networking', 'Security'] },
  { name: 'Firewalls', category: 'Infrastructure', description: 'Network security and access control.', status: 'additional', related: ['OPNsense', 'WireGuard', 'Security'] },
  { name: 'VPNs', category: 'Infrastructure', description: 'Virtual private networks for secure connections.', status: 'additional', related: ['WireGuard', 'Networking'] },

  // Testing & QA
  { name: 'Test-Driven Development', category: 'Testing', description: 'Writing tests before implementation code.', status: 'used', related: ['Pytest', 'Django Tests', 'Unit Testing'] },
  { name: 'Unit Testing', category: 'Testing', description: 'Testing individual components in isolation.', status: 'used', related: ['Pytest', 'Django Tests', 'TDD'] },
  { name: 'Integration Testing', category: 'Testing', description: 'Testing component interactions and systems.', status: 'used', related: ['Django Tests', 'API Testing'] },
  { name: 'End-to-End Testing', category: 'Testing', description: 'Testing complete user workflows.', status: 'additional', related: ['Selenium', 'Cypress', 'Playwright'] },
  { name: 'Regression Testing', category: 'Testing', description: 'Ensuring changes don\'t break existing functionality.', status: 'additional', related: ['Unit Testing', 'Integration Testing'] },
  { name: 'Manual Testing', category: 'Testing', description: 'Human-driven testing for usability and edge cases.', status: 'additional', related: ['Exploratory Testing', 'QA'] },
  { name: 'Load Testing', category: 'Testing', description: 'Testing performance under heavy load.', status: 'additional', related: ['Performance Testing', 'Stress Testing'] },
  { name: 'Performance Testing', category: 'Testing', description: 'Measuring and optimizing application speed.', status: 'additional', related: ['Load Testing', 'Profiling'] },
  { name: 'Static Code Analysis', category: 'Testing', description: 'Automated code quality and security scanning.', status: 'used', related: ['Bandit', 'Gitleaks', 'Oxlint'] },
  { name: 'Pytest', category: 'Testing', description: 'Python testing framework with fixtures.', status: 'additional', related: ['Python', 'Unit Testing', 'TDD'] },
  { name: 'Selenium', category: 'Testing', description: 'Browser automation for web testing.', status: 'additional', related: ['E2E Testing', 'Browser Automation'] },
  { name: 'Cypress', category: 'Testing', description: 'Modern E2E testing framework for web apps.', status: 'additional', related: ['E2E Testing', 'Component Testing'] },
  { name: 'Debugging', category: 'Testing', description: 'Systematic problem identification and resolution.', status: 'used', related: ['Error Diagnosis', 'Logging'] },
  { name: 'Error Diagnosis', category: 'Testing', description: 'Identifying and fixing application errors.', status: 'used', related: ['Debugging', 'Logging', 'Monitoring'] },

  // Android
  { name: 'Android Studio', category: 'Mobile', description: 'Official IDE for Android development.', status: 'additional', related: ['Android SDK', 'Kotlin'] },
  { name: 'Android SDK', category: 'Mobile', description: 'Software development kit for Android apps.', status: 'additional', related: ['Android Studio', 'Kotlin'] },
  { name: 'Android Application Development', category: 'Mobile', description: 'Building native Android applications.', status: 'additional', related: ['Kotlin', 'Android SDK', 'Android Studio'] },

  // Creative & 3D
  { name: 'Blender', category: 'Creative', description: '3D creation suite for modelling and rendering.', status: 'additional', related: ['3D Modelling', '3D Development'] },
  { name: '3D Modelling', category: 'Creative', description: 'Creating three-dimensional digital models.', status: 'additional', related: ['Blender', '3D Development'] },
  { name: '3D Development', category: 'Creative', description: 'Building 3D interactive experiences.', status: 'used', related: ['Three.js', '3D Modelling', 'WebGL'] },

  // Development Tools
  { name: 'Git', category: 'Tools', description: 'Version control system for tracking changes.', status: 'used', related: ['GitHub', 'Version Control'] },
  { name: 'GitHub', category: 'Tools', description: 'Code hosting and collaboration platform.', status: 'used', related: ['Git', 'CI/CD', 'Actions'] },
  { name: 'VS Code', category: 'Tools', description: 'Popular code editor with extensions.', status: 'used', related: ['Development', 'Debugging'] },
  { name: 'Insomnia', category: 'Tools', description: 'API testing and debugging tool.', status: 'used', related: ['API Testing', 'REST', 'GraphQL'] },
  { name: 'DBeaver', category: 'Tools', description: 'Database management and SQL client.', status: 'used', related: ['PostgreSQL', 'SQL', 'Database Design'] },
  { name: 'Firefox Developer Tools', category: 'Tools', description: 'Browser debugging and profiling tools.', status: 'used', related: ['Debugging', 'Performance', 'Accessibility'] },

  // Learning
  { name: 'API Development', category: 'Backend', description: 'Advanced API design patterns and best practices.', status: 'learning', related: ['REST APIs', 'GraphQL', 'WebSockets'] },
];

const categories = ['All', 'Languages', 'Frontend', 'Backend', 'Database', 'Operating Systems', 'Infrastructure', 'Testing', 'Mobile', 'Creative', 'Tools'];

export default function About() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<SkillStatus | 'all'>('all');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [countsVisible, setCountsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setCountsVisible(true); },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const filtered = useMemo(() => {
    return skills.filter(s => {
      if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [search, categoryFilter, statusFilter]);

  const usedCount = skills.filter(s => s.status === 'used').length;
  const additionalCount = skills.filter(s => s.status === 'additional').length;
  const learningCount = skills.filter(s => s.status === 'learning').length;
  void usedCount;
  void additionalCount;
  void learningCount;

  const statusColors = {
    used: { bg: 'rgba(83,245,176,0.10)', text: '#53F5B0', border: '#53F5B0', label: 'Used in Karlin_ux' },
    additional: { bg: 'rgba(240,120,131,0.08)', text: '#F07883', border: '#F07883', label: 'Additional capability' },
    learning: { bg: 'rgba(245,189,88,0.10)', text: '#F5BD58', border: '#F5BD58', label: 'Currently learning' },
  };

  const techIcons: Record<string, string> = {
    'Python': 'security-infrastructure', 'Java': 'security-infrastructure', 'Kotlin': 'security-infrastructure',
    'JavaScript': 'ai-assisted-interfaces', 'TypeScript': 'content-management', 'C': 'security-infrastructure',
    'C++': 'security-infrastructure', 'C#': 'security-infrastructure', 'Ruby': 'ai-assisted-interfaces',
    'SQL': 'metric-orders', 'Lua': 'ai-assisted-interfaces', 'Roblox Luau': 'ai-assisted-interfaces',
    'HTML5': 'content-management', 'CSS3': 'media-management', 'Tailwind CSS': 'media-management',
    'Responsive Web Design': 'customer-experiences', 'Frontend Development': 'customer-experiences',
    'User Interface Development': 'customer-experiences',
    'Django': 'business-management', 'Django REST Framework': 'role-based-access',
    'Backend Development': 'business-management', 'Full-Stack Development': 'business-management',
    'REST APIs': 'role-based-access', 'GraphQL': 'role-based-access', 'WebSockets': 'role-based-access',
    'JSON': 'content-management', 'XML': 'content-management', 'Third-Party API Integration': 'security-infrastructure',
    'PostgreSQL': 'metric-orders', 'MySQL': 'metric-orders', 'Database Design': 'metric-orders',
    'Database Development': 'metric-orders', 'Schema Design': 'metric-orders', 'Database Migrations': 'metric-orders',
    'Database Constraints': 'metric-orders',
    'Windows': 'security-infrastructure', 'Linux': 'security-infrastructure', 'Ubuntu': 'security-infrastructure',
    'Debian': 'security-infrastructure', 'Arch Linux': 'security-infrastructure',
    'Docker': 'security-infrastructure', 'Kubernetes': 'security-infrastructure', 'Google Cloud': 'analytics-reporting',
    'Linux Server Administration': 'security-infrastructure', 'Web Hosting': 'security-infrastructure',
    'Domain Management': 'security-infrastructure', 'CI/CD Pipelines': 'analytics-reporting',
    'WireGuard': 'security-infrastructure', 'OPNsense': 'security-infrastructure', 'Firewalls': 'security-infrastructure',
    'VPNs': 'security-infrastructure',
    'Test-Driven Development': 'application-management', 'Unit Testing': 'application-management',
    'Integration Testing': 'application-management', 'End-to-End Testing': 'application-management',
    'Regression Testing': 'application-management', 'Manual Testing': 'application-management',
    'Load Testing': 'application-management', 'Performance Testing': 'application-management',
    'Static Code Analysis': 'application-management', 'Pytest': 'application-management',
    'Selenium': 'application-management', 'Cypress': 'application-management',
    'Debugging': 'application-management', 'Error Diagnosis': 'application-management',
    'Android Studio': 'customer-experiences', 'Android SDK': 'customer-experiences',
    'Android Application Development': 'customer-experiences',
    'Blender': '3d-product-experiences', '3D Modelling': '3d-product-experiences',
    '3D Development': '3d-product-experiences',
    'Git': 'content-management', 'GitHub': 'content-management', 'VS Code': 'content-management',
    'Insomnia': 'content-management', 'DBeaver': 'content-management', 'Firefox Developer Tools': 'content-management',
    'API Development': 'role-based-access',
  };

  return (
    <div className="space-y-0">
      {/* ============================================
          HERO
          ============================================ */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-soft)] via-transparent to-[var(--accent-2-soft)] opacity-40" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--accent)] rounded-full blur-[200px] opacity-[0.06]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[var(--accent-2)] rounded-full blur-[180px] opacity-[0.05]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-medium text-[var(--accent)] uppercase tracking-widest mb-4">About the Developer</div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Building Software.
                <br />
                <span className="text-gradient">Solving Problems.</span>
                <br />
                Connecting Ideas.
              </h1>
              <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-8 max-w-xl">
                I'm a self-taught developer with experience across web development, databases, software testing and Android applications.
                I enjoy building practical software, exploring new technologies and understanding how everything works together.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#skills" className="btn btn-primary">Explore Skills</a>
                <Link to="/projects" className="btn btn-secondary">View Projects</Link>
                <Link to="/contact" className="btn btn-ghost">Contact Me</Link>
              </div>
            </div>

            {/* Abstract developer visual */}
            <div className="relative hidden lg:block">
              <div className="card p-8 bg-[var(--bg-elevated)]/60 backdrop-blur-xl">
                <div className="grid grid-cols-3 gap-3">
                  {['Python', 'Django', 'React', 'PostgreSQL', 'Docker', 'TypeScript', 'Tailwind', 'Git', 'Linux'].map((tech, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--accent)]/30 transition-all">
                      <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                      <span className="text-xs font-medium">{tech}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center text-xs text-[var(--text-muted)]">
                  Technologies used in Karlin_ux and beyond
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          EXPERIENCE OVERVIEW
          ============================================ */}
      <section ref={sectionRef} className="py-20 bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Experience Overview</h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              Years of hands-on experience across different areas of software development.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {experience.map((exp, i) => (
              <div key={i} className="card p-6 text-center hover:border-[var(--accent)]/30 transition-all duration-300">
                <div className="mb-4 flex justify-center">
                  <Icon name={exp.icon} size={32} />
                </div>
                <div className="text-4xl font-bold mb-2" style={{ color: exp.color }}>
                  {countsVisible ? exp.years : 0}
                  <span className="text-2xl text-[var(--text-muted)]">+</span>
                </div>
                <div className="text-sm text-[var(--text-secondary)] font-medium">{exp.area}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">years experience</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          SKILLS EXPLORER
          ============================================ */}
      <section id="skills" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Skills & Technologies</h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              A comprehensive view of my technical capabilities. Search, filter and explore.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <input
              className="input max-w-md"
              placeholder="Search skills..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="flex gap-2 flex-wrap">
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
                  {s === 'all' ? 'All' : s === 'used' ? 'Used in Karlin_ux' : s === 'additional' ? 'Additional' : 'Learning'}
                </button>
              ))}
            </div>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-6">
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

          {/* Results count */}
          <div className="text-sm text-[var(--text-muted)] mb-4">
            Showing {filtered.length} of {skills.length} skills
          </div>

          {/* Skills grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((skill, i) => {
              const colors = statusColors[skill.status];
              return (
                <div
                  key={i}
                  onClick={() => setSelectedSkill(skill)}
                  className="card p-4 cursor-pointer hover:border-[var(--border-strong)] transition-all duration-300 group"
                  style={{ borderLeft: `3px solid ${colors.border}` }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: colors.bg }}>
                      <Icon name={techIcons[skill.name] || 'content-management'} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-[var(--text)] group-hover:text-[var(--accent)] transition-colors truncate">{skill.name}</h3>
                      <span className="text-xs text-[var(--text-muted)]">{skill.category}</span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{skill.description}</p>
                  <div className="mt-2 text-xs font-medium px-2 py-0.5 rounded inline-block" style={{ background: colors.bg, color: colors.text }}>
                    {colors.label}
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="card p-12 text-center">
              <div className="mb-3 flex justify-center"><Icon name="search" size={48} /></div>
              <p className="text-[var(--text-muted)]">No skills match your filters.</p>
            </div>
          )}
        </div>
      </section>

      {/* ============================================
          SKILL DETAIL MODAL
          ============================================ */}
      {selectedSkill && (
        <div className="modal-overlay" onClick={() => setSelectedSkill(null)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: statusColors[selectedSkill.status].bg }}>
                  <Icon name={techIcons[selectedSkill.name] || 'content-management'} size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedSkill.name}</h2>
                  <span className="text-sm text-[var(--text-muted)]">{selectedSkill.category}</span>
                </div>
              </div>
              <button onClick={() => setSelectedSkill(null)} className="text-[var(--text-muted)] hover:text-[var(--text)] text-xl">✕</button>
            </div>

            <div className="mb-4">
              <div className="text-xs font-medium px-2 py-1 rounded-md inline-block" style={{ background: statusColors[selectedSkill.status].bg, color: statusColors[selectedSkill.status].text }}>
                {statusColors[selectedSkill.status].label}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-1">Description</h4>
                <p className="text-[var(--text)]">{selectedSkill.description}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-1">Related Technologies</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedSkill.related.map((r, i) => (
                    <span key={i} className="px-2 py-1 rounded-md text-xs bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)]">{r}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          DEVELOPMENT JOURNEY
          ============================================ */}
      <section className="py-20 bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Development Journey</h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              A technical progression across different areas of software engineering.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {experience.map((exp, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${exp.color}20` }}>
                  <Icon name={exp.icon} size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{exp.area}</span>
                    <span className="text-sm font-bold" style={{ color: exp.color }}>{countsVisible ? exp.years : 0}+ years</span>
                  </div>
                  <div className="h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: countsVisible ? `${(exp.years / 7) * 100}%` : '0%',
                        background: exp.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          WHAT I ENJOY BUILDING
          ============================================ */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What I Enjoy Building</h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              The types of systems and applications I can develop.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Full-Stack Web Applications', desc: 'Complete applications from database to UI.', icon: 'customer-experiences', link: '/explore' },
              { title: 'Backend APIs', desc: 'RESTful services with authentication and permissions.', icon: 'role-based-access', link: '/explore' },
              { title: 'Database-Driven Platforms', desc: 'Data models, constraints and optimized queries.', icon: 'metric-orders', link: '/explore' },
              { title: 'Business Management Systems', desc: 'Dashboards, CRUD operations and reporting.', icon: 'business-management', link: '/admin' },
              { title: 'Customer Portals', desc: 'Self-service interfaces for end users.', icon: 'customer-experiences', link: '/customer' },
              { title: 'Android Applications', desc: 'Native mobile apps with Kotlin.', icon: 'customer-experiences', link: '/explore' },
              { title: 'Automated Testing Systems', desc: 'Test suites, CI/CD and quality assurance.', icon: 'application-management', link: '/explore' },
              { title: 'Deployment & Infrastructure', desc: 'Docker, cloud hosting and CI/CD pipelines.', icon: 'security-infrastructure', link: '/explore' },
              { title: 'Networking & Security', desc: 'Firewalls, VPNs and secure configurations.', icon: 'security-infrastructure', link: '/explore' },
              { title: '3D Interactive Experiences', desc: '3D viewers and interactive visualizations.', icon: '3d-product-experiences', link: '/3d' },
            ].map((item, i) => (
              <Link key={i} to={item.link} className="card p-5 hover:border-[var(--accent)]/30 transition-all duration-300 group">
                <div className="flex items-center gap-3 mb-2">
                  <Icon name={item.icon} size={20} />
                  <h3 className="font-semibold text-sm group-hover:text-[var(--accent)] transition-colors">{item.title}</h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{item.desc}</p>
              </Link>
            ))}
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
            Have a project in mind?{' '}
            <span className="text-gradient">Let's build it.</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-lg mb-10 max-w-2xl mx-auto">
            From web applications to mobile apps, databases to infrastructure — I can help bring your idea to life.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/explore" className="btn btn-primary text-lg px-8 py-3.5">Explore Capabilities</Link>
            <Link to="/projects" className="btn btn-secondary text-lg px-8 py-3.5">View Projects</Link>
            <Link to="/contact" className="btn btn-ghost text-lg px-8 py-3.5">Contact Me</Link>
          </div>
        </div>
      </section>
    </div>
  );
}