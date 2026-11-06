import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function MediaLibrary() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  async function load() {
    try {
      const r = await api.get('/media/');
      setAssets(r.data.results || r.data);
    } catch (e) {
      console.error('Failed to load media', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', f);
      try {
        await api.post('/media/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } catch (err) {
        console.error('Upload failed', err);
      }
    }
    setUploading(false);
    load();
  }

  async function deleteAsset(id: string) {
    if (!confirm('Delete this file?')) return;
    await api.delete(`/media/${id}/`);
    load();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="skeleton h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Media Library</h1>
        <label className="btn btn-primary cursor-pointer">
          {uploading ? 'Uploading...' : 'Upload Files'}
          <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {assets.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🖼️</div>
          <p className="text-[var(--text-muted)]">No media files yet. Upload your first file.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map((a: any) => (
            <div key={a.id} className="card p-3 group">
              <div className="aspect-square bg-[var(--bg-surface)] rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                {a.category === 'image' ? (
                  <img src={`/api/media/${a.id}/file/`} alt={a.original_filename} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">{a.category === 'video' ? '🎬' : a.category === 'document' ? '📄' : '📁'}</span>
                )}
              </div>
              <div className="text-sm font-medium truncate mb-1">{a.original_filename}</div>
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>{(a.file_size / 1024).toFixed(1)} KB</span>
                <button onClick={() => deleteAsset(a.id)} className="text-[var(--error)] hover:underline opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}