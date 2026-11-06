import { Link } from 'react-router-dom';

const features = [
  { name: 'Customer Accounts', desc: 'Registration, login, profile management and session handling.', path: '/customer' },
  { name: 'Product Catalogue', desc: 'Product listing, search, filtering and detail views.', path: '/customer' },
  { name: 'Shopping Cart', desc: 'Add to cart, update quantities, remove items and checkout demo.', path: '/customer' },
  { name: 'Order Management', desc: 'Order tracking, status updates and order history.', path: '/admin' },
  { name: 'Booking System', desc: 'Calendar scheduling with conflict prevention.', path: '/calendar' },
  { name: 'Media Library', desc: 'File uploads, image processing and storage management.', path: '/media' },
  { name: 'Website Builder', desc: 'Content management with page revisions.', path: '/builder' },
  { name: 'Reports & Analytics', desc: 'Business dashboards with charts and metrics.', path: '/reports' },
  { name: 'Admin Dashboard', desc: 'Workspace administration with full CRUD operations.', path: '/admin' },
  { name: 'Super Admin', desc: 'Platform oversight and user management (restricted).', path: '/superadmin' },
  { name: '3D Product Viewer', desc: 'Interactive 3D model viewer with controls.', path: '/3d' },
  { name: 'Voice Navigation', desc: 'Voice-activated navigation and commands.', path: '/' },
];

export default function Explore() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Explore Capabilities</h1>
        <p className="text-[var(--text-secondary)] max-w-2xl mx-auto text-lg">
          Discover what can be built. Each capability links to a working demonstration.
        </p>
      </section>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f, i) => (
          <Link
            key={i}
            to={f.path}
            className="card p-6 hover:border-[var(--accent)]/30 transition-all duration-300 group"
          >
            <h3 className="font-semibold text-[var(--text)] mb-2 group-hover:text-[var(--accent)] transition-colors">
              {f.name}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}