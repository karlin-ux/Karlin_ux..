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
  const [preview, setPreview] = useState(false);
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
        <button className="btn text-xs" onClick={()=>setPreview(p=>!p)}>{preview?'Edit':'Preview'}</button>
        <button className="btn text-xs" onClick={()=>save(true)}>Save draft</button>
        <button className="btn text-xs" onClick={()=>save(false)}>Publish</button>
      </div>

      {preview ? (
        <div className="card p-4">
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
      <p className="text-xs text-[var(--muted)]">Published: {String(published)}. Content is sanitized (text only) and workspace-scoped.</p>
    </div>
  );
}