import { useState } from 'react';

const KB: { keys: string[]; answer: string }[] = [
  { keys: ['product', 'catalogue', 'browse'], answer: 'Browse products in Customer Experience → Catalogue. Use search, filters and sorting. Add items to your persistent cart.' },
  { keys: ['checkout', 'order', 'payment'], answer: 'Checkout is a simulated demonstration. The backend calculates authoritative totals and creates a simulated order. No card details are collected.' },
  { keys: ['booking', 'schedule', 'appointment'], answer: 'Choose a service, date and time. The backend prevents double bookings and past dates.' },
  { keys: ['application', 'enquiry', 'job'], answer: 'Submit applications/enquiries from Customer Experience → Applications. Track status in your account. Internal notes remain private.' },
  { keys: ['media', 'upload', 'image'], answer: 'Workspace Admin → Media Library supports secure uploads, thumbnails, editing and variants. Files are private by default.' },
  { keys: ['admin', 'workspace'], answer: 'Every registered account gets a private simulated workspace with admin tools. Data is isolated per user.' },
  { keys: ['builder', 'cms', 'page'], answer: 'The visual builder saves workspace-scoped drafts and publishes pages. Drafts stay private.' },
  { keys: ['security', 'isolation', 'real data'], answer: 'Demo business data is simulated and isolated. Super Admin sees genuine platform data only. Roles are enforced server-side.' },
];

export default function Assistant() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState('Ask me about products, checkout, bookings, applications, media, admin or security.');
  function ask(e?: any) {
    e?.preventDefault();
    const lower = q.toLowerCase();
    const found = KB.find(k => k.keys.some(key => lower.includes(key)));
    setAnswer(found ? found.answer : 'I am a local demonstration assistant. Try asking about products, checkout, bookings, applications, media, admin or security.');
  }
  if (!open) return <button className="fixed bottom-4 right-4 btn z-40" onClick={()=>setOpen(true)}>Assistant</button>;
  return (
    <div className="fixed bottom-4 right-4 w-80 card p-4 z-40">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">Local Assistant (Demo)</h3>
        <button onClick={()=>setOpen(false)}>×</button>
      </div>
      <form onSubmit={ask} className="space-y-2">
        <input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Ask a question…" />
        <button className="btn text-xs" type="submit">Ask</button>
      </form>
      <p className="text-sm mt-3 text-[var(--muted)]">{answer}</p>
    </div>
  );
}