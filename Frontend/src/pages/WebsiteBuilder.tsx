import { useEffect, useState } from 'react';
import { api } from '../api/client';

interface Section { id: string; type: 'heading'|'text'|'image'|'button'; content: string; settings?: any; }

export default function WebsiteBuilder() {
  const [pages, setPages] = useState<any[]>([]);
  void pages;
  const [pageId, setPageId] = useState<string | null>(null);
  const [title, setTitle] = useState('New Page');
  const [slug, setSlug] = useState('new-page');
  const [sections, setSections] = useState<Section[]>([]);
  const [published, setPublished] = useState(false);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [previewRevision, setPreviewRevision] = useState<any>(null);
  const [preview, setPreview] = useState(false);
  const [device, setDevice] = useState<'desktop'|'tablet'|'mobile'>('desktop');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => { api.get('/demo/pages/').then(r => setPages(r.data.results || r.data)); }, []);

  function addSection(type: Section['type']) {
    setSections(s => [...s, { id: crypto.randomUUID(), type, content: type === 'heading' ? 'Heading' : type === 'text' ? 'Text block' : type === 'image' ? '' : 'Click me' }]);
  }
  function move(i: number, dir: -1|1) {
    setSections(s => {
      const arr = [...s];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }
  function update(id: string, content: string) { setSections(s => s.map(x => x.id === id ? { ...x, content } : x)); }
  function updateSettings(id: string, settings: any) { setSections(s => s.map(x => x.id === id ? { ...x, settings: { ...(x as any).settings, ...settings } } : x)); }
  function remove(id: string) { setSections(s => s.filter(x => x.id !== id)); }

  async function save(draft: boolean) {
    const payload = { title, slug, content: JSON.stringify(sections), is_published: !draft };
    if (pageId) await api.patch(`/demo/pages/${pageId}/`, payload);
    else {
      const r = await api.post('/demo/pages/', payload);
      setPageId(r.data.id);
    }
    setPublished(!draft);
    const r = await api.get('/demo/pages/');
    setPages(r.data.results || r.data);
    if (pageId) { const rv = await api.get(`/demo/page-revisions/?page=${pageId}`); setRevisions(rv.data.results || rv.data); }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Visual Website Builder (Demo)</h1>
      <div className="flex gap-2 flex-wrap">
        <input className="input max-w-xs" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" />
        <input className="input max-w-xs" value={slug} onChange={e=>setSlug(e.target.value)} placeholder="Slug" />
        <button className="btn text-xs" onClick={()=>addSection('heading')}>+ Heading</button>
        <button className="btn text-xs" onClick={()=>addSection('text')}>+ Text</button>
        <button className="btn text-xs" onClick={()=>addSection('image')}>+ Image</button>
        <button className="btn text-xs" onClick={()=>addSection('button')}>+ Button</button>
        <select className="input max-w-xs" value={device} onChange={e=>setDevice(e.target.value as any)}><option value="desktop">Desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></select>
        <button className="btn text-xs" onClick={()=>setPreview(p=>!p)}>{preview?'Edit':'Preview'}</button>
        <button className="btn text-xs" onClick={()=>save(true)}>Save draft</button>
        <button className="btn text-xs" onClick={()=>save(false)}>Publish</button>
      </div>

      {preview ? (
        <div className="card p-4 mx-auto" style={{width: device==='mobile'?'375px':device==='tablet'?'768px':'100%'}}>
          {sections.map(s => (
            <div key={s.id} className="mb-3">
              {s.type === 'heading' && <h2 className="text-2xl font-bold">{s.content}</h2>}
              {s.type === 'text' && <p>{s.content}</p>}
              {s.type === 'image' && <img src={s.content || '/favicon.svg'} alt="" className="max-w-md" />}
              {s.type === 'button' && <button className="btn">{s.content}</button>}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sections.map((s, i) => (
            <div key={s.id} className="card p-3 flex items-center gap-2" draggable onDragStart={()=>setDragIndex(i)} onDragOver={e=>e.preventDefault()} onDrop={()=>{ if(dragIndex===null||dragIndex===i) return; setSections(arr=>{ const a=[...arr]; const [m]=a.splice(dragIndex,1); a.splice(i,0,m); return a;}); setDragIndex(null); }}>
              <span className="text-xs text-[var(--muted)]">{s.type}</span>
              <input className="input flex-1" value={s.content} onChange={e=>update(s.id, e.target.value)} />
              <input className="input w-20" type="number" placeholder="size" onChange={e=>updateSettings(s.id, {fontSize: e.target.value})} />
              <button className="text-xs" onClick={()=>move(i,-1)}>↑</button>
              <button className="text-xs" onClick={()=>move(i,1)}>↓</button>
              <button className="text-xs text-red-400" onClick={()=>remove(s.id)}>×</button>
            </div>
          ))}
        </div>
      )}
      <div className="card p-3">
        <h3 className="font-semibold mb-2">Revisions</h3>
        <ul className="text-xs space-y-1">
          {revisions.map(r => (
            <li key={r.id} className="flex justify-between gap-2">
              <span>{new Date(r.created_at).toLocaleString()} — {r.title}</span>
              <div className="flex gap-1">
                <button className="text-xs" onClick={()=>setPreviewRevision(r)}>Preview</button>
                <button className="text-xs" onClick={async()=>{ if(!confirm('Restore this revision?')) return; await api.post(`/demo/page-revisions/${r.id}/restore/`); const p = await api.get(`/demo/pages/${pageId}/`); setTitle(p.data.title); setSlug(p.data.slug); setSections(JSON.parse(p.data.content||'[]')); setPublished(p.data.is_published); const rv = await api.get(`/demo/page-revisions/?page=${pageId}`); setRevisions(rv.data.results||rv.data); }}>Restore</button>
              </div>
            </li>
          ))}
        </ul>
        {previewRevision && (
          <div className="card p-2 mt-2">
            <div className="flex justify-between"><span className="text-xs font-semibold">Preview revision</span><button className="text-xs" onClick={()=>setPreviewRevision(null)}>Close</button></div>
            {(() => { let secs: any[] = []; try { secs = JSON.parse(previewRevision.content || '[]'); } catch {} return secs.map((s:any) => <div key={s.id}>{s.type}: {s.content}</div>); })()}
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--muted)]">Published: {String(published)}. Content is sanitized (text only) and workspace-scoped.</p>
    </div>
  );
}