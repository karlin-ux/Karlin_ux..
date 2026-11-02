import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function ProductViewer3D() {
  const mount = useRef<HTMLDivElement>(null);
  const [search] = useSearchParams();
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { const m = search.get('model'); if (m) setModelUrl(`/api/media/${m}/file/`); }, [search]);

  useEffect(() => {
    let renderer: any;
    let cancelled = false;
    (async () => {
      try {
        const THREE = await import('three');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.z = 3;
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(400, 400);
        if (cancelled) return;
        mount.current?.appendChild(renderer.domElement);
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(2, 2, 2);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0x404040));
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        if (modelUrl) {
          const loader = new GLTFLoader();
          loader.load(modelUrl, (gltf: any) => {
            scene.add(gltf.scene);
          }, undefined, () => setError('Failed to load model.'));
        } else {
          const geometry = new THREE.TorusKnotGeometry(1, 0.3, 100, 16);
          const material = new THREE.MeshStandardMaterial({ color: 0x6c8cff });
          scene.add(new THREE.Mesh(geometry, material));
        }

        function animate() {
          if (cancelled) return;
          requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        }
        animate();
      } catch (e: any) {
        setError('WebGL/3D not available.');
      }
    })();
    return () => { cancelled = true; renderer?.dispose(); };
  }, [modelUrl]);

  function onFile(e: any) {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.toLowerCase();
    if (!ext.endsWith('.glb') && !ext.endsWith('.gltf')) { setError('Only GLB/GLTF allowed.'); return; }
    if (f.size > 20 * 1024 * 1024) { setError('File too large (max 20MB).'); return; }
    setError('');
    setModelUrl(URL.createObjectURL(f));
  }

  return (
    <div className="card p-6">
      <h1 className="text-3xl font-bold mb-4">3D Product Viewer (Demo)</h1>
      <p className="text-[var(--muted)] mb-4">Load a GLB/GLTF model or view the sample model. Rotate, zoom and pan. Fallback shown if unavailable.</p>
      <input type="file" accept=".glb,.gltf" onChange={onFile} className="mb-3" />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div ref={mount} className="mx-auto" />
      {!modelUrl && <p className="text-xs text-[var(--muted)] mt-2">Sample demonstration model (TorusKnot). No real product model loaded.</p>}
    </div>
  );
}