import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

type ProductKey = 'shoe' | 'watch' | 'apple';

const PRODUCTS: Array<{ key: ProductKey; name: string; category: string; blurb: string }> = [
  { key: 'shoe', name: 'Shoe', category: 'Footwear', blurb: 'Procedural 3D demo model of a shoe — view it from every angle like a real product.' },
  { key: 'watch', name: 'Watch', category: 'Accessories', blurb: 'Procedural 3D demo model of a watch — inspect details in 3D.' },
  { key: 'apple', name: 'Apple', category: 'Produce', blurb: '3D Apple model — interactive with rotate, zoom, and ambient lighting.' },
];

export default function ProductViewer3D() {
  const mount = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = (searchParams.get('product') as ProductKey) || 'shoe';
  const active = PRODUCTS.find(p => p.key === selected) ? selected : 'shoe';
  const info = useMemo(() => PRODUCTS.find(p => p.key === active) || PRODUCTS[0], [active]);

  const [error, setError] = useState('');
  const [rotationPaused, setRotationPaused] = useState(false);
  const rotationPausedRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => { rotationPausedRef.current = rotationPaused; }, [rotationPaused]);

  useEffect(() => {
    let renderer: any;
    let cancelled = false;
    let animationId: number;
    let isInteracting = false;
    let resumeTimeout: any;

    (async () => {
      try {
        setError('');
        const THREE = await import('three');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');

        const container = mount.current;
        if (!container) return;
        container.innerHTML = '';

        const width = container.clientWidth || 600;
        const height = Math.min(width, 560);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0b1220);

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 1.2, 4.2);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        if (cancelled) return;
        container.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.minDistance = 2.2;
        controls.maxDistance = 8;
        controls.enablePan = false;
        controls.target.set(0, 0.2, 0);

        controls.addEventListener('start', () => { isInteracting = true; clearTimeout(resumeTimeout); });
        controls.addEventListener('end', () => { isInteracting = false; resumeTimeout = setTimeout(() => {}, 1200); });

        // Lights
        scene.add(new THREE.AmbientLight(0xffffff, 0.55));
        const key = new THREE.DirectionalLight(0xffffff, 1.4);
        key.position.set(4, 6, 4);
        key.castShadow = true;
        scene.add(key);
        const fill = new THREE.DirectionalLight(0x5c9dff, 0.5);
        fill.position.set(-4, 2, -3);
        scene.add(fill);
        const rim = new THREE.DirectionalLight(0x53f5b0, 0.35);
        rim.position.set(0, 3, -5);
        scene.add(rim);

        // Ground
        const floorGeo = new THREE.CircleGeometry(3.2, 64);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95, metalness: 0.05 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.9;
        floor.receiveShadow = true;
        scene.add(floor);

        const model = new THREE.Group();
        scene.add(model);

        const disposeList: Array<{ dispose: () => void }> = [];
        const track = (obj: any) => {
          if (obj?.geometry) disposeList.push(obj.geometry);
          if (obj?.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m: any) => disposeList.push(m));
            } else {
              disposeList.push(obj.material);
            }
          }
          return obj;
        };

        if (active === 'shoe') {
          // Simple procedural shoe (sole + upper + tongue + laces suggestion)
          const soleMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.6, metalness: 0.1 });
          const upperMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.75, metalness: 0.05 });
          const accentMat = new THREE.MeshStandardMaterial({ color: 0x53f5b0, roughness: 0.4, metalness: 0.2 });

          const sole = track(new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.28, 0.95), soleMat));
          sole.position.set(0, -0.55, 0);
          sole.castShadow = true; sole.receiveShadow = true; model.add(sole);

          const soleFront = track(new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.28, 32), soleMat));
          soleFront.rotation.z = Math.PI / 2;
          soleFront.position.set(1.1, -0.55, 0);
          model.add(soleFront);

          const upper = track(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 0.85), upperMat));
          upper.position.set(-0.1, -0.1, 0);
          upper.castShadow = true; model.add(upper);

          const toe = track(new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 24, 0, Math.PI), upperMat));
          toe.scale.set(1.2, 0.8, 0.95);
          toe.position.set(0.8, -0.2, 0);
          toe.castShadow = true; model.add(toe);

          const heel = track(new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.8), upperMat));
          heel.position.set(-0.85, -0.05, 0);
          heel.castShadow = true; model.add(heel);

          const tongue = track(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.45), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 })));
          tongue.position.set(0.15, 0.28, 0);
          tongue.rotation.z = -0.15;
          model.add(tongue);

          const stripe = track(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.88), accentMat));
          stripe.position.set(0.1, -0.05, 0);
          model.add(stripe);

          // laces
          const laceMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.8 });
          for (let i = 0; i < 3; i++) {
            const lace = track(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.015, 8, 24, Math.PI), laceMat));
            lace.position.set(-0.05 + i * 0.22, 0.26, 0);
            lace.rotation.x = Math.PI / 2;
            lace.rotation.z = Math.PI / 2;
            model.add(lace);
          }

          camera.position.set(0.2, 1.0, 4.0);
        } else if (active === 'watch') {
          // Simple procedural watch (case, bezel, dial, strap, crown)
          const metal = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.85 });
          const dark = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.2 });
          const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transmission: 0.2, transparent: true, opacity: 0.35 });
          const strapMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8, metalness: 0.05 });
          const accent = new THREE.MeshStandardMaterial({ color: 0x53f5b0, emissive: 0x113322, roughness: 0.3, metalness: 0.4 });

          const caseMesh = track(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.28, 64), metal));
          caseMesh.rotation.x = Math.PI / 2;
          caseMesh.castShadow = true; model.add(caseMesh);

          const bezel = track(new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.07, 16, 64), metal));
          bezel.position.z = 0.12;
          model.add(bezel);

          const dial = track(new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.06, 64), dark));
          dial.rotation.x = Math.PI / 2;
          dial.position.z = 0.12;
          model.add(dial);

          const crystal = track(new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.04, 64), glass));
          crystal.rotation.x = Math.PI / 2;
          crystal.position.z = 0.17;
          model.add(crystal);

          // markers
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            const isMain = i % 3 === 0;
            const mk = track(new THREE.Mesh(new THREE.BoxGeometry(isMain ? 0.06 : 0.03, isMain ? 0.18 : 0.1, 0.02), isMain ? accent : metal));
            mk.position.set(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0.16);
            mk.rotation.z = a;
            model.add(mk);
          }
          // hands
          const hour = track(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.02), metal));
          hour.position.set(0, 0.12, 0.18); hour.rotation.z = -0.6; model.add(hour);
          const minute = track(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.02), metal));
          minute.position.set(0, 0.2, 0.19); minute.rotation.z = 0.9; model.add(minute);
          const pin = track(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 24), accent));
          pin.rotation.x = Math.PI / 2; pin.position.z = 0.2; model.add(pin);

          // crown
          const crown = track(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.18, 24), metal));
          crown.rotation.z = Math.PI / 2; crown.position.set(1.02, 0, 0); model.add(crown);

          // straps
          const strapGeo = new THREE.BoxGeometry(0.9, 1.6, 0.12);
          const topStrap = track(new THREE.Mesh(strapGeo, strapMat));
          topStrap.position.set(0, 1.55, 0); topStrap.castShadow = true; model.add(topStrap);
          const botStrap = track(new THREE.Mesh(strapGeo, strapMat));
          botStrap.position.set(0, -1.55, 0); botStrap.castShadow = true; model.add(botStrap);
          const buckle = track(new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 12, 24), metal));
          buckle.position.set(0, -2.2, 0.05); model.add(buckle);

          camera.position.set(0, 1.4, 4.4);
        } else {
          // Apple: load GLB model
          const loader = new GLTFLoader();
          try {
            const { MeshoptDecoder } = await import('meshoptimizer');
            await MeshoptDecoder.ready;
            loader.setMeshoptDecoder(MeshoptDecoder);
          } catch (e) {
            console.warn('Meshopt decoder could not be loaded, loading GLB without it');
          }
          const apple = track(model.add(new THREE.Group()));
          loader.load(
            '/assets/apple.glb',
            (gltf) => {
              const loaded = gltf.scene;
              // Scale the apple to a reasonable size
              loaded.scale.set(0.01, 0.01, 0.01);
              // Position the apple slightly above center
              loaded.position.set(0, 0.5, 0);
              // Rotate to a nice display angle
              loaded.rotation.y = 0.2;
              loaded.rotation.x = -0.1;
              model.add(loaded);
              // Add subtle rotation animation
              apple.disposed = false;
              const rotate = () => {
                if (cancelled || apple.disposed) return;
                loaded.rotation.y += 0.005;
                apple.disposed = true; // prevent double-rotation
                requestAnimationFrame(rotate);
              };
              rotate();
            },
            undefined,
            (error) => {
              console.error('Error loading apple GLB:', error);
              // Fallback: procedural apple if GLB fails to load
              const skin = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45, metalness: 0.05 });
              const appleMesh = track(new THREE.Mesh(new THREE.SphereGeometry(1.05, 64, 48), skin));
              appleMesh.scale.set(1, 0.92, 1);
              appleMesh.castShadow = true; model.add(appleMesh);

              // dimple top/bottom
              const dimpleMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 });
              const topDip = track(new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), dimpleMat));
              topDip.scale.set(1.4, 0.5, 1.4);
              topDip.position.set(0, 0.88, 0); model.add(topDip);

              const stem = track(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.45, 12), new THREE.MeshStandardMaterial({ color: 0x5b3a1e, roughness: 0.9 })));
              stem.position.set(0.05, 1.1, 0); stem.rotation.z = -0.15; stem.castShadow = true; model.add(stem);

              const leafGeo = new THREE.SphereGeometry(0.28, 24, 16);
              const leaf = track(new THREE.Mesh(leafGeo, new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6, metalness: 0.0 })));
              leaf.scale.set(1.6, 0.18, 0.7);
              leaf.position.set(0.32, 1.18, 0); leaf.rotation.z = -0.6; leaf.castShadow = true; model.add(leaf);

              // highlight
              const hl = track(new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffaaaa, roughness: 0.2, transparent: true, opacity: 0.35 })));
              hl.position.set(-0.35, 0.35, 0.75); model.add(hl);
            }
          );
        }

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let autoRotate = !prefersReducedMotion;

        function animate() {
          if (cancelled) return;
          animationId = requestAnimationFrame(animate);
          if (autoRotate && !isInteracting && !rotationPausedRef.current) {
            model.rotation.y += 0.008;
          }
          controls.update();
          renderer.render(scene, camera);
        }
        animate();

        const handleResize = () => {
          if (!container) return;
          const newWidth = container.clientWidth;
          const newHeight = Math.min(newWidth, 560);
          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
        };
        window.addEventListener('resize', handleResize);

        (container as any).__threeCleanup = () => {
          cancelled = true;
          cancelAnimationFrame(animationId);
          clearTimeout(resumeTimeout);
          window.removeEventListener('resize', handleResize);
          controls.dispose();
          renderer.dispose();
          scene.traverse((obj: any) => {
            if (obj.geometry) obj.geometry.dispose?.();
            if (obj.material) {
              if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose?.());
              else obj.material.dispose?.();
            }
          });
        };
      } catch (e: any) {
        setError('WebGL/3D not available. Your browser may not support 3D rendering.');
      }
    })();

    return () => {
      cancelled = true;
      if (animationId) cancelAnimationFrame(animationId);
      const cleanup = (mount.current as any)?.__threeCleanup;
      if (cleanup) cleanup();
    };
  }, [active]);

  function toggleRotation() {
    setRotationPaused(prev => !prev);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      mount.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">3D Product Viewer</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Demo: {info.name} · {info.category}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleRotation} className="btn btn-secondary text-sm px-3 py-1.5">
            {rotationPaused ? '▶ Play' : '⏸ Pause'}
          </button>
          <button onClick={toggleFullscreen} className="btn btn-secondary text-sm px-3 py-1.5">
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      <p className="text-[var(--text-secondary)] mb-4">
        {info.blurb} Drag to rotate, scroll to zoom. Auto-rotates when idle.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {PRODUCTS.map(p => (
          <button
            key={p.key}
            onClick={() => setSearchParams({ product: p.key })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${active === p.key ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(var(--border)] hover:border-[var(--accent)]/30'}`}
          >
            {p.name} <span className="text-[var(--text-muted)]">· {p.category}</span>
          </button>
        ))}
      </div>

      {error && <p className="text-[var(--error)] text-sm mb-3">{error}</p>}
      <div ref={mount} className="mx-auto rounded-xl overflow-hidden" style={{ minHeight: '420px' }} />
      <p className="text-xs text-[var(--text-muted)] mt-3 text-center">
        Interactive 3D product model. Drag to rotate, scroll to zoom. Auto-rotates when idle.
      </p>
      <div className="mt-3 text-center">
        <Link to="/projects" className="text-sm text-[var(--accent)] hover:underline">Back to Projects</Link>
      </div>
    </div>
  );
}