export default function Contact() {
  return (
    <div className="card p-6">
      <h1 className="text-3xl font-bold mb-4">Contact</h1>
      <p className="text-[var(--muted)]">Get in touch via the contact form (demonstration).</p>
      <form className="space-y-3 mt-4 max-w-md">
        <input className="input" placeholder="Name" />
        <input className="input" placeholder="Email" />
        <textarea className="input" placeholder="Message" rows={4} />
        <button className="btn" type="button">Send (demo)</button>
      </form>
    </div>
  );
}