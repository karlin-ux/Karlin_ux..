import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setErr('Passwords do not match.');
      return;
    }
    if (password.length < 10) {
      setErr('Password must be at least 10 characters.');
      return;
    }
    setLoading(true);
    setErr('');
    try {
      await register(email, password);
      nav('/customer');
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Account</h1>
          <p className="text-[var(--text-secondary)]">Join the platform</p>
        </div>
        <div className="card p-8">
          {err && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--error-soft)] border border-[var(--error)]/20 text-[var(--error)] text-sm">
              {err}
            </div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Password</label>
              <input className="input" type="password" placeholder="Min. 10 characters" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Confirm Password</label>
              <input className="input" type="password" placeholder="Repeat password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-[var(--text-muted)] mt-6">
            Already have an account? <a href="/signin" className="text-[var(--accent)] hover:underline">Sign In</a>
          </p>
        </div>
      </div>
    </div>
  );
}