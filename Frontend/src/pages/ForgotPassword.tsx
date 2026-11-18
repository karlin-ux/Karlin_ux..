import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ensureCsrf } from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      await ensureCsrf();
      await api.post('/auth/password-reset/', { email });
      setSubmitted(true);
    } catch {
      // Non-enumerating behavior; show generic success-like state on request completion issues too.
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Forgot Password</h1>
          <p className="text-[var(--text-secondary)]">Request a password reset link</p>
        </div>
        <div className="card p-8">
          {submitted ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[var(--success-soft,rgba(34,197,94,0.1))] border border-[var(--success,#22c55e)]/20 text-sm">
                If the request is valid, a password reset email will be sent.
              </div>
              <Link to="/signin" className="btn btn-primary w-full text-center">Back to Sign In</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {err && <div className="mb-2 p-3 rounded-lg bg-[var(--error-soft)] border border-[var(--error)]/20 text-[var(--error)] text-sm">{err}</div>}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Email</label>
                <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button>
              <p className="text-center text-sm text-[var(--text-muted)]"><Link to="/signin" className="text-[var(--accent)] hover:underline">Back to Sign In</Link></p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
