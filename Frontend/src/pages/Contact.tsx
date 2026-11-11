import { useMemo, useState } from 'react';
import { api } from '../api/client';
import Reveal from '../components/Reveal';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const charged = useMemo(() => !!(form.name && form.email && form.message), [form]);

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
      <Reveal><section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact</h1>
        <p className="text-[var(--text-secondary)] text-lg">
          Get in touch. I'd love to hear from you.
        </p>
      </section></Reveal>

      <Reveal delay={120}><div className={`neon-perimeter ${charged || status === 'sending' ? 'neon-perimeter--charged' : ''} card relative overflow-hidden rounded-[var(--radius-lg)] border-[var(--border-strong)] bg-[var(--bg-elevated)]/90 p-8 shadow-lg backdrop-blur-sm`}>
        {status === 'success' && (
          <div className="relative mb-6 overflow-visible rounded-lg border border-[var(--success)]/20 bg-[var(--success-soft)] p-4 text-[var(--success)]" role="status">
            <span aria-hidden="true" />
            <span className="relative z-10">Message sent successfully! I'll get back to you soon.</span>
          </div>
        )}
        {status === 'error' && (
          <div className="mb-6 p-4 rounded-lg bg-[var(--error-soft)] border border-[var(--error)]/20 text-[var(--error)]" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4" noValidate={false}>
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
      </div></Reveal>
    </div>
  );
}