import { useState } from 'react';
import { api } from '../api/client';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      await api.post('/contact/submit/', form);
      setStatus('success');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (e: any) {
      setStatus('error');
      setError(e?.response?.data?.detail || 'Failed to send message. Please try again.');
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact</h1>
        <p className="text-[var(--text-secondary)] text-lg">
          Get in touch. I'd love to hear from you.
        </p>
      </section>

      <div className="card p-8">
        {status === 'success' && (
          <div className="mb-6 p-4 rounded-lg bg-[var(--success-soft)] border border-[var(--success)]/20 text-[var(--success)]">
            ✓ Message sent successfully! I'll get back to you soon.
          </div>
        )}
        {status === 'error' && (
          <div className="mb-6 p-4 rounded-lg bg-[var(--error-soft)] border border-[var(--error)]/20 text-[var(--error)]">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Name</label>
              <input className="input" placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Email</label>
              <input className="input" type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Subject</label>
            <input className="input" placeholder="What's this about?" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">Message</label>
            <textarea className="input" rows={5} placeholder="Your message..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
}