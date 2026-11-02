import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

interface Asset {
  id: string;
  original_filename: string;
  category: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  alt_text: string;
  description: string;
  created_at: string;
  variants: any[];
}

export default function MediaLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [view, setView] = useState<'grid'|'list'>('grid');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Asset | null>(null);
  const [storage, setStorage] = useState<any>(null);
  const [editing, setEditing] = useState<Asset | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true); setError('');
    try {
      const r = await api.get('/media/', { params: { search: q, category: cat } });
      setAssets(r.data.results || r.data);
      const s = await api.get('/media/storage/');
      setStorage(s.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load media.');
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function uploadFiles(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', f);
      try { await api.post('/media/upload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); }
      catch (e: any) { setError(e?.response?.data?.detail || 'Upload failed.'); }
    }
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this file?')) return;
    await api.delete(`/media/${id}/`);
    setSelected(null);
    load();
  }

  async function updateMeta(id: string, data: any) {
    await api.patch(`/media/${id}/`, data);
    load();
  }

  const filtered = assets.filter(a =>
    (!q || a.original_filename.toLowerCase().includes(q.toLowerCase())) &&
    (!cat || a.category === cat)
  );

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Media Library (Workspace)</h1>
      {storage && (
        <div className="card p-3 text-sm">
          Storage: {(storage.total_bytes/1024/1024).toFixed(2)} MB — {storage.asset_count} assets
          (images {storage.image_count}, docs {storage.document_count}, videos {storage.video_count})
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <input className="input max-w-xs" placeholder="Search" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="input max-w-xs" value={cat} onChange={e=>setCat(e.target.value)}>
          <option value="">All</option>
          <option value="image">Images</option>
          <option value="document">Documents</option>
          <option value="video">Videos</option>
          <option value="other">Other</option>
        </select>
        <button className="btn text-xs" onClick={load}>Search</button>
        <button className="btn text-xs" onClick={()=>setView(v=>v==='grid'?'list':'grid')}>View: {view}</button>
        <button className="btn text-xs" onClick={()=>fileInput.current?.click()}>Upload</button>
        <input ref={fileInput} type="file" multiple hidden onChange={e=>uploadFiles(e.target.files)} />
      </div>
      <div
        className="card p-4 border-dashed"
        onDragOver={e=>e.preventDefault()}
        onDrop={e=>{e.preventDefault(); uploadFiles(e.dataTransfer.files);}}
      >
        Drag and drop files here to upload.
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {loading && <p>Loading…</p>}

      {view === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {filtered.map(a => (
            <div key={a.id} className="card p-2 cursor-pointer" onClick={()=>setSelected(a)}>
              {a.category === 'image' ? (
                <img src={`/api/media/${a.id}/file/`} alt={a.alt_text} className="w-full h-32 object-cover rounded" />
              ) : (
                <div className="w-full h-32 flex items-center justify-center bg-[var(--surface-2)] rounded">{a.category}</div>
              )}
              <p className="text-xs mt-1 truncate">{a.original_filename}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-2">
          <table className="w-full text-sm">
            <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Date</th></tr></thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="border-t border-[var(--border)] cursor-pointer" onClick={()=>setSelected(a)}>
                  <td>{a.original_filename}</td><td>{a.category}</td><td>{a.file_size}</td><td>{new Date(a.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="card p-4 space-y-3">
          <h2 className="text-xl font-semibold">{selected.original_filename}</h2>
          {selected.category === 'image' && (
            <img src={`/api/media/${selected.id}/file/`} alt={selected.alt_text} className="max-h-64 rounded" />
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input className="input" placeholder="Alt text" defaultValue={selected.alt_text} onBlur={e=>updateMeta(selected.id, { alt_text: e.target.value })} />
            <input className="input" placeholder="Description" defaultValue={selected.description} onBlur={e=>updateMeta(selected.id, { description: e.target.value })} />
          </div>
          <div className="flex gap-2">
            {selected.category === 'image' && <button className="btn text-xs" onClick={()=>setEditing(selected)}>Edit Image</button>}
            <button className="btn text-xs" style={{background:'#dc2626'}} onClick={()=>remove(selected.id)}>Delete</button>
            <button className="btn text-xs" style={{background:'var(--surface-2)', color:'var(--text)'}} onClick={()=>setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      {editing && <ImageEditor asset={editing} onClose={()=>setEditing(null)} onSaved={()=>{ setEditing(null); load(); }} />}
    </div>
  );
}

function ImageEditor({ asset, onClose, onSaved }: { asset: Asset; onClose: ()=>void; onSaved: ()=>void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);
  const [resizeW, setResizeW] = useState(asset.width || 0);
  const [resizeH, setResizeH] = useState(asset.height || 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = `/api/media/${asset.id}/file/`;
    image.onload = () => setImg(image);
  }, [asset]);

  useEffect(() => {
    if (!img || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rad = (rotation * Math.PI) / 180;
    const swap = rotation % 180 !== 0;
    const srcW = swap ? img.height : img.width;
    const srcH = swap ? img.width : img.height;
    const outW = resizeW > 0 ? resizeW : srcW;
    const outH = resizeH > 0 ? resizeH : srcH;
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0,0,outW,outH);
    ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
    ctx.save();
    ctx.translate(outW/2, outH/2);
    ctx.rotate(rad);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    // draw image scaled
    ctx.drawImage(img, -outW/2, -outH/2, outW, outH);
    ctx.restore();
  }, [img, rotation, flipH, flipV, brightness, contrast, saturation, resizeW, resizeH]);

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    canvas.toBlob(async (blob) => {
      if (!blob) { setSaving(false); return; }
      const fd = new FormData();
      fd.append('file', blob, 'edited.jpg');
      fd.append('operations', JSON.stringify({ rotation, flipH, flipV, brightness, contrast, saturation, resize: [resizeW, resizeH] }));
      try {
        await api.post(`/media/${asset.id}/edit/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        onSaved();
      } catch (e: any) {
        alert(e?.response?.data?.detail || 'Save failed');
      } finally { setSaving(false); }
    }, 'image/jpeg', 0.9);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="card p-4 max-w-3xl w-full max-h-[90vh] overflow-auto">
        <h2 className="text-xl font-semibold mb-3">Edit Image</h2>
        <canvas ref={canvasRef} className="max-w-full border border-[var(--border)]" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
          <label>Rotation
            <select className="input" value={rotation} onChange={e=>setRotation(Number(e.target.value))}>
              <option value={0}>0°</option><option value={90}>90°</option><option value={180}>180°</option><option value={270}>270°</option>
            </select>
          </label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={flipH} onChange={e=>setFlipH(e.target.checked)} /> Flip H</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={flipV} onChange={e=>setFlipV(e.target.checked)} /> Flip V</label>
          <label>Brightness <input type="range" min={0.5} max={2} step={0.1} value={brightness} onChange={e=>setBrightness(Number(e.target.value))} /></label>
          <label>Contrast <input type="range" min={0.5} max={2} step={0.1} value={contrast} onChange={e=>setContrast(Number(e.target.value))} /></label>
          <label>Saturation <input type="range" min={0} max={2} step={0.1} value={saturation} onChange={e=>setSaturation(Number(e.target.value))} /></label>
          <label>Width <input className="input" type="number" value={resizeW} onChange={e=>setResizeW(Number(e.target.value))} /></label>
          <label>Height <input className="input" type="number" value={resizeH} onChange={e=>setResizeH(Number(e.target.value))} /></label>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn" onClick={save} disabled={saving}>{saving?'Saving…':'Save as new variant'}</button>
          <button className="btn" style={{background:'var(--surface-2)', color:'var(--text)'}} onClick={onClose}>Cancel</button>
        </div>
        <p className="text-xs text-[var(--muted)] mt-2">Original image is preserved; edited result is saved as a new variant.</p>
      </div>
    </div>
  );
}