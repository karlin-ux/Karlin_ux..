import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import Reveal from '../components/Reveal';
import { useCountUp, useInView } from '../hooks/useAnimationUtils';

/* ============================================
   HOME CONTENT
   ============================================ */

const developmentJourney = [
  { area: 'Web Development', years: 7, color: 'var(--accent)', icon: 'customer-experiences' },
  { area: 'Database Development', years: 4, color: 'var(--accent-2)', icon: 'metric-orders' },
  { area: 'Software Testing', years: 7, color: 'var(--accent-3)', icon: 'application-management' },
  { area: 'Android Development', years: 1, color: 'var(--warning)', icon: 'customer-experiences' },
];

const aboutHighlights = [
  {
    title: 'End-to-end ownership',
    desc: 'From data model and API design through to the interface and deployment.',
  },
  {
    title: 'Architecture that lasts',
    desc: 'Clear boundaries, typed contracts and pragmatic, maintainable decisions.',
  },
  {
    title: 'Quality built in',
    desc: 'Automated tests, static analysis and careful manual verification.',
  },
  {
    title: 'Performance by default',
    desc: 'Lean payloads, considered rendering and accessible interactions.',
  },
];

const technicalDomains = [
  {
    title: 'Frontend',
    icon: 'customer-experiences',
    category: 'Frontend',
    blurb: 'Accessible, type-safe interfaces built to feel effortless.',
    items: ['React 19', 'TypeScript', 'Tailwind CSS', 'Vite', 'HTML5', 'CSS3'],
  },
  {
    title: 'Backend',
    icon: 'business-management',
    category: 'Backend',
    blurb: 'API-first services with clear contracts and secure defaults.',
    items: ['Python', 'Django', 'Django REST Framework', 'REST APIs'],
  },
  {
    title: 'Database',
    icon: 'metric-orders',
    category: 'Database',
    blurb: 'Relational modelling, constraints and dependable migrations.',
    items: ['PostgreSQL', 'SQL', 'Schema design', 'Migrations', 'Constraints'],
  },
  {
    title: 'Infrastructure',
    icon: 'security-infrastructure',
    category: 'Infrastructure',
    blurb: 'Containers, reverse proxy and repeatable delivery pipelines.',
    items: ['Docker', 'Docker Compose', 'Caddy', 'Linux', 'GitHub Actions'],
  },
  {
    title: 'Quality',
    icon: 'application-management',
    category: 'Testing',
    blurb: 'Automated checks backed by thoughtful manual verification.',
    items: ['Unit testing', 'Integration testing', 'E2E testing', 'Static analysis', 'Debugging'],
  },
  {
    title: 'Tooling & Creative',
    icon: '3d-product-experiences',
    category: 'Tools',
    blurb: 'Everyday engineering tools plus 3D and visual experiments.',
    items: ['Git', 'GitHub', 'VS Code', 'Insomnia', 'Blender', '3D modelling'],
  },
];

const skillsTicker = [
  'React', 'TypeScript', 'JavaScript', 'Vite', 'Tailwind CSS', 'HTML5', 'CSS3', 'Python', 'Django', 'Django REST Framework', 'PostgreSQL', 'SQL', 'Docker', 'Docker Compose', 'Caddy', 'GitHub Actions', 'Gitleaks', 'Bandit', 'CSRF Protection', 'Session Authentication', 'Rate Limiting', 'Workspace Isolation', 'CORS Configuration', 'HSTS', 'Django Test Framework', 'TypeScript Compiler', 'ESLint (Oxlint)', 'WhiteNoise', 'Gunicorn', 'Health Checks', 'Docker Security', 'Pillow', 'Git', 'GitHub', 'VS Code', 'Insomnia',
  'Responsive Web Design', 'Frontend Development', 'Backend Development', 'Full-Stack Development', 'Java', 'Kotlin', 'C', 'C++', 'C#', 'Lua', 'Roblox Luau', 'MySQL', 'REST APIs', 'GraphQL', 'WebSockets', 'JSON', 'XML', 'Third-Party Integration', 'Windows', 'Linux', 'Ubuntu', 'Debian', 'Arch Linux', 'Linux Servers', 'Kubernetes', 'Google Cloud', 'WireGuard', 'CI/CD Pipelines', 'Android Studio', 'Android SDK', 'Kotlin Android Development', 'Unit Testing', 'Integration Testing', 'End-to-End Testing', 'Regression Testing', 'Manual Testing', 'Load Testing', 'Performance Testing', 'Pytest', 'Selenium', 'Cypress', 'Static Code Analysis', 'Debugging', 'Blender', '3D Modelling', 'Ruby', 'OPNsense', 'API Development', 'Software Deployment', 'AI Integrations',
];

function JourneyStat({ item, active }: { item: typeof developmentJourney[number]; active: boolean }) {
  const years = useCountUp(item.years, active);
  return (
    <div className="spotlight-card rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/50 p-3 text-center transition-transform duration-300 hover:-translate-y-0.5">
      <div className="mb-1 flex justify-center icon-float">
        <Icon name={item.icon} size={18} />
      </div>
      <div className="text-lg font-bold leading-none" style={{ color: item.color }}>
        {years}+
      </div>
      <div className="mt-1 text-[10px] font-medium leading-snug text-[var(--text-secondary)]">
        {item.area}
      </div>
    </div>
  );
}

const featuredProject = {
  name: 'Karlin_ux Platform',
  summary:
    'A full-stack portfolio and business management platform with customer accounts, workspace administration, reporting and media tooling.',
  tech: ['Django', 'React', 'TypeScript', 'PostgreSQL', 'Docker'],
  points: [
    'Django REST API with session auth and workspace isolation',
    'React 19 and TypeScript frontend with a shared design system',
    'PostgreSQL data model, Docker images and CI-backed delivery',
  ],
};

export default function Home() {
  const journeyView = useInView<HTMLDivElement>();
  return (
    <div className="flex flex-col">
      {/* ============================================
          HERO
          ============================================ */}
      <section className="relative overflow-hidden pb-12 pt-14 sm:pb-16 sm:pt-20">
        <div className="parallax-slow pointer-events-none absolute -right-24 -top-40 h-[520px] w-[520px] rounded-full bg-[var(--accent)] opacity-[0.06] blur-[160px]" data-parallax-speed="0.06" />
        <div className="parallax-slow pointer-events-none absolute -left-24 top-32 h-[360px] w-[360px] rounded-full bg-[var(--accent-2)] opacity-[0.05] blur-[140px]" data-parallax-speed="0.1" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-12 text-center">
              <Reveal delay={40}><p className="flash-green-text inline-block text-base font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)] sm:text-lg">
                Hi I&apos;m
              </p></Reveal>

              <h1 className="mt-3 text-balance">
                <Reveal delay={100}><span className="flash-green-text block text-5xl font-bold leading-[0.98] tracking-tight text-[var(--text)] sm:text-6xl lg:text-7xl xl:text-8xl">
                  Karlheins Lourens
                </span></Reveal>
                <Reveal delay={180}><span className="mx-auto mt-4 block max-w-5xl text-2xl font-semibold leading-tight tracking-tight text-gradient sm:text-3xl lg:text-4xl">
                  Software Engineer &amp; Full Stack Developer
                </span></Reveal>
              </h1>

              <Reveal delay={260}><p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
                I design and build full-stack web applications, site-orientated business platforms and
                interactive engineering experiences — from data models and APIs to responsive
                interfaces and official Android and Apple apps coming in hot - no longer limited to
                web installed applications - and I&apos;m pretty hands on with the cybersecurity that
                is required to back these puppies up and secure databases. - PS I&apos;m not limited
                to do only that, feel free to{' '}
                <Link to="/contact" className="flash-green-text font-semibold underline-offset-4 hover:underline">
                  contact me
                </Link>{' '}
                for any requests!
              </p></Reveal>

              <Reveal delay={340}><div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/Karl-Heins_Lourens_Resume.docx"
                  className="btn btn-primary motion-reduce:transition-none"
                  download="Karl-Heins_Lourens_Resume.docx"
                  aria-label="Download Resume"
                >
                  Resume
                </a>
                <Link
                  to="/contact"
                  className="btn btn-primary motion-reduce:transition-none"
                  aria-label="Contact Me"
                >
                  Contact Me
                </Link>
              </div></Reveal>

              <Reveal delay={460}><div className="skills-marquee" aria-label="Skills and technologies">
                <div className="skills-marquee-viewport">
                  <div className="skills-marquee-track">
                    {[...skillsTicker, ...skillsTicker].map((skill, i) => (
                      <span key={`${skill}-${i}`} className="skills-marquee-item" style={{ ['--glint-delay' as any]: `${(i * 0.37) % 5.5}s` }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div></Reveal>
            </div>


          </div>
        </div>
      </section>

      {/* ============================================
          TECHNOLOGIES AND SKILLS
          ============================================ */}
      <section className="relative border-y border-[var(--border)] bg-[var(--bg-secondary)] py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                The stack I chose for my portfolio site
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
                Tools and areas I used them in — PS view my skills to see full tech stack and I will always be aiming to learn a few new ones!
              </p>
            </div>
            <Reveal delay={120}><Link
              to="/technologies"
              className="neon-perimeter flash-green relative inline-flex items-center justify-center overflow-visible rounded-xl border border-[var(--accent)]/25 bg-[var(--bg-elevated)] px-5 py-3 text-sm font-semibold text-[var(--text)] shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 sm:px-6 sm:py-3.5 sm:text-base"
            >
              <span className="relative z-10 inline-flex items-center">
                View My Skills
                <span aria-hidden="true" className="ml-2 text-[var(--accent)]">→</span>
              </span>
            </Link></Reveal>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {technicalDomains.map((domain, idx) => (
              <Reveal key={domain.title} delay={idx * 70}>
              <Link
                to={`/technologies?category=${encodeURIComponent(domain.category)}`}
                aria-label={`Explore ${domain.title} technologies`}
                className="spotlight-card tilt-card group flex h-full min-h-[13rem] flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]/80 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
              >
                <div className="flex items-center gap-3">
                  <div className="icon-float flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]" style={{ animationDelay: `${idx * 0.25}s` }}>
                    <Icon name={domain.icon} size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-[var(--text)]">
                      {domain.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-[var(--text-muted)]">
                        {domain.items.length} tools
                      </p>
                      <span
                        aria-hidden="true"
                        className="text-xs text-[var(--text-muted)] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                      >
                        →
                      </span>
                    </div>
                  </div>
                </div>

                <p className="mt-3 min-h-[2.5rem] text-xs leading-relaxed text-[var(--text-muted)]">
                  {domain.blurb}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {domain.items.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-surface)]/60 px-2 py-1 text-[11px] font-medium leading-none text-[var(--text-secondary)] transition-colors group-hover:border-[var(--accent)]/15 group-hover:text-[var(--text)]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          ABOUT ME
          ============================================ */}
      <section id="about" className="relative py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]/85">
            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-12 lg:gap-10">
              <div className="lg:col-span-12">
                <div className="mx-auto mb-8 flex w-full max-w-[220px] flex-col items-center">
                  <div
                    className="flex aspect-square w-full items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)]/60 text-center"
                    aria-label="Profile image placeholder"
                  >
                    <div className="px-4">
                      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] text-lg font-bold text-[var(--accent)]">
                        K
                      </div>
                      <p className="text-xs font-medium text-[var(--text-secondary)]">Image placeholder</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">Centered space for your profile image</p>
                    </div>
                  </div>
                </div>

                <div className="grid items-start gap-8 lg:grid-cols-2">
                  <div ref={journeyView.ref}>
                    <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                      Years Spent on My Developer Journey
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                      {developmentJourney.map((item) => (
                        <JourneyStat key={item.area} item={item} active={journeyView.inView} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                      About Me
                    </p>
                    <p className="mt-1 text-center text-sm font-medium text-[var(--text-secondary)]">
                      Senior Software Engineer &amp; Full Stack Developer
                    </p>
                    <h2 className="mt-5 text-center text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                      Practical systems.
                      <br />
                      Clean architecture.
                    </h2>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      {['Full-stack', 'API-first', 'Database-first', 'Accessible'].map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-surface)]/60 px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:col-span-12">
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    I&apos;m a self-taught developer with experience across web development,
                    databases, software testing and Android applications. I enjoy building
                    practical software, exploring new technologies and understanding how
                    everything works together.
                  </p>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    Across the stack, I favour clear boundaries, typed contracts and pragmatic
                    decisions — systems that are straightforward to extend, operate and hand over.
                  </p>
                </div>

                <ul className="space-y-4">
                  {aboutHighlights.map((item) => (
                    <li key={item.title} className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--accent)]/20 bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent)]">
                        ✓
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text)]">{item.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">
                          {item.desc}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* ============================================
          SELECTED WORK
          ============================================ */}
      <section className="relative py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                Selected Work
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Built end to end
              </h2>
            </div>
            <Link
              to="/projects"
              className="text-sm font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
            >
              All projects →
            </Link>
          </div>

          <Reveal delay={80}><article className="sheen spotlight-card tilt-card mt-8 grid overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]/85 lg:grid-cols-2">
            <div className="relative flex min-h-[260px] flex-col justify-between gap-8 overflow-hidden border-b border-[var(--border)] bg-[var(--bg-surface)] p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <div
                className="pointer-events-none absolute inset-0 opacity-80"
                style={{
                  background:
                    'radial-gradient(circle at 30% 20%, var(--accent-soft), transparent 60%)',
                }}
              />
              <div className="relative flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  Featured · Active
                </span>
              </div>
              <div className="relative">
                <div className="text-gradient text-3xl font-bold leading-tight sm:text-4xl">Karlheins Lourens</div>
                <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">
                  Full-stack platform
                </p>
              </div>
              <div className="relative flex flex-wrap gap-1.5">
                {featuredProject.tech.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-elevated)]/70 px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)]"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                Case study
              </p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight">{featuredProject.name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {featuredProject.summary}
              </p>

              <ul className="mt-5 space-y-2.5">
                {featuredProject.points.map((point) => (
                  <li
                    key={point}
                    className="flex gap-2 text-sm leading-relaxed text-[var(--text-secondary)]"
                  >
                    <span className="text-[var(--accent)]">—</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-6 text-center">
                <Link to="/projects" className="btn btn-primary text-sm">
                  View project
                </Link>
              </div>
            </div>
          </article></Reveal>
        </div>
      </section>

      {/* ============================================
          CONTACT CTA
          ============================================ */}
      <section className="relative pb-16 sm:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal><div className="sheen spotlight-card relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)]/85 px-6 py-12 text-center sm:px-12 sm:py-16">
            <div
              className="parallax-slow pointer-events-none absolute inset-0 opacity-70"
              data-parallax-speed="0.04"
              style={{
                background:
                  'radial-gradient(circle at 50% 0%, var(--accent-soft), transparent 55%)',
              }}
            />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                Let&apos;s build something
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Have a project in mind?{' '}
                <span className="text-gradient">Let&apos;s talk.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                Whether you need a customer portal, a business management system or a custom web
                application, I&apos;d be glad to help.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/contact" className="btn btn-primary">
                  Start a conversation
                </Link>
                <Link to="/projects" className="btn btn-secondary">
                  See my work
                </Link>
              </div>
            </div>
          </div></Reveal>
        </div>
      </section>
    </div>
  );
}
