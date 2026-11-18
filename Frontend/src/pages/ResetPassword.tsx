import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ensureCsrf } from '../api/client';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { setErr('Invalid or expired reset token.'); return; }
    if (password !== confirm) { setErr('Passwords do not match.'); return; }
    if (password.length < 10) { setErr('Password must be at least 10 characters.'); return; }
    setLoading(true);
    setErr('');
    try {
      await ensureCsrf();
      await api.post('/auth/password-reset/confirm/', { token, new_password: password, new_password_confirm: confirm });
      setDone(true);
    } catch (e: any) {
      const data = e?.response?.data;
      setErr(data?.detail || data?.new_password?.[0] || data?.new_password_confirm?.[0] || data?.non_field_errors?.[0] || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
          <p className="text-[var(--text-secondary)]">Choose a new password</p>
        </div>
        <div className="card p-8">
          {done ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-[var(--success-soft,rgba(34,197,94,0.1))] border border-[var(--success,#22c55e)]/20 text-sm">Password has been reset successfully.</div>
              <Link to="/signin" className="btn btn-primary w-full text-center">Sign In</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {err && <div className="p-3 rounded-lg bg-[var(--error-soft)] border border-[var(--error)]/20 text-[var(--error)] text-sm">{err}</div>}
              {!token && <div className="p-3 rounded-lg bg-[var(--error-soft)] border border-[var(--error)]/20 text-[var(--error)] text-sm">Missing or invalid reset token.</div>}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">New Password</label>
                <div className="relative">
                  <input className="input pr-10" type={showPassword ? 'text' : 'password'} placeholder="Min. 10 characters" value={password} onChange={e => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Confirm Password</label>
                <div className="relative">
                  <input className="input pr-10" type={showConfirm ? 'text' : 'password'} placeholder="Repeat password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors" aria-label={showConfirm ? 'Hide password' : 'Show password'}>{showConfirm ? 'Hide' : 'Show'}</button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading || !token}>{loading ? 'Resetting...' : 'Reset Password'}</button>
              <p className="text-center text-sm text-[var(--text-muted)]"><Link to="/signin" className="text-[var(--accent)] hover:underline">Back to Sign In</Link></p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
