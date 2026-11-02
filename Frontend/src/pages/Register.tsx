import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  async function submit(e: any) {
    e.preventDefault();
    try { await register(email, password); nav('/'); } catch (e: any) { setErr(JSON.stringify(e?.response?.data || 'Register failed')); }
  }
  return (
    <div className="max-w-md mx-auto card p-6">
      <h1 className="text-2xl font-bold mb-4">Register</h1>
      <p className="text-xs text-[var(--muted)] mb-3">Every account gets Customer + Workspace Admin access automatically.</p>
      <form onSubmit={submit} className="space-y-3">
        <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Password (min 10)" value={password} onChange={e=>setPassword(e.target.value)} />
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <button className="btn w-full" type="submit">Create Account</button>
      </form>
    </div>
  );
}