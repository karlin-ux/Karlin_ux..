import { useState } from 'react';
import { api } from '../api/client';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: any) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const r = await api.post('/contact/submit/', form);
      setStatus({ ok: true, msg: r.data.detail || 'Message sent.' });
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (e: any) {
      const d = e?.response?.data;
      setStatus({ ok: false, msg: d?.detail || (d?.errors ? JSON.stringify(d.errors) : 'Failed to send message.') });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-4">Contact Me</h1>
      <div className="flex flex-wrap gap-3 mb-6 text-sm">
        <a className="btn" href="https://github.com/karlin-ux" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a className="btn" href="https://wa.me/27786033642" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a className="btn" href="mailto:yourheinskarl@gmail.com">Email</a>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input className="input" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} required />
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} required />
        <input className="input" placeholder="Subject" value={form.subject} onChange={e=>setForm({...form, subject: e.target.value})} />
        <textarea className="input" placeholder="Message" rows={4} value={form.message} onChange={e=>setForm({...form, message: e.target.value})} required />
        <button className="btn" type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send'}</button>
      </form>
      {status && <p className={`mt-3 text-sm ${status.ok ? 'text-green-400' : 'text-red-400'}`}>{status.msg}</p>}
      <p className="mt-4 text-xs text-[var(--muted)]">
        Privacy notice: Your name, email and message are used only to respond to your enquiry.
        Messages may be stored for support and security purposes. We do not share your information with third parties.
      </p>
    </div>
  );
}