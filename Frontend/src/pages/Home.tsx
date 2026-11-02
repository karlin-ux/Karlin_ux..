import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="text-center py-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Building Practical Software. Turning Ideas Into Working Applications.</h1>
        <p className="max-w-2xl mx-auto text-[var(--muted)] mb-6">
          Hi, I'm Karlin — a self-taught developer with a passion for building useful, well-designed software.
          I enjoy working across the full development process, from designing user-friendly interfaces and developing backend systems
          to working with databases, APIs, automation, infrastructure and application security.
        </p>
        <p className="max-w-2xl mx-auto text-[var(--muted)] mb-8">
          My focus is on building practical solutions that solve real problems, whether that's a business website, a customer management system,
          an interactive dashboard or a complete web application. I'm continuously learning, experimenting and improving through real projects and hands-on development.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/explore" className="btn">Explore My Work</Link>
          <Link to="/explore" className="btn" style={{background:'var(--surface-2)', color:'var(--text)'}}>Explore Website Capabilities</Link>
          <Link to="/technologies" className="btn" style={{background:'var(--surface-2)', color:'var(--text)'}}>View Technologies</Link>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-2xl font-bold mb-2">More Than a Website. Explore What Can Be Built.</h2>
        <p className="text-[var(--muted)]">
          A modern website can do much more than display information. It can become a complete business management platform.
          This showcase demonstrates the different features and systems I can develop for websites and web applications — from customer accounts,
          product catalogues and booking systems to advanced admin dashboards, analytics, content management and security controls.
          Explore both sides of the experience: what customers interact with and what business owners manage behind the scenes.
          Everything is designed to be explored, tested and experienced through interactive demonstrations.
          Clearly identified simulated data is used where appropriate.
        </p>
      </section>
    </div>
  );
}