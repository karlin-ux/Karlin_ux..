import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ensureCsrf } from '../api/client';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);
  const [status, setStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [message, setMessage] = useState('Confirming your email...');

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token) {
        setStatus('error');
        setMessage('Invalid or expired verification token.');
        return;
      }
      setStatus('loading');
      try {
        await ensureCsrf();
        const r = await api.post('/auth/verify-email/confirm/', { token });
        if (cancelled) return;
        setStatus('success');
        setMessage(r?.data?.detail || 'Email verified successfully.');
      } catch (e: any) {
        if (cancelled) return;
        setStatus('error');
        setMessage(e?.response?.data?.detail || 'Invalid or expired verification token.');
      }
    }
    run();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Verify Email</h1>
          <p className="text-[var(--text-secondary)]">Confirm your email address</p>
        </div>
        <div className="card p-8 space-y-4">
          <div className={`p-3 rounded-lg border text-sm ${status === 'success' ? 'bg-[var(--success-soft,rgba(34,197,94,0.1))] border-[var(--success,#22c55e)]/20' : status === 'error' ? 'bg-[var(--error-soft)] border-[var(--error)]/20 text-[var(--error)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>
            {message}
          </div>
          <Link to="/signin" className="btn btn-primary w-full text-center">Go to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
