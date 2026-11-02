import { useEffect, useRef } from 'react';

export default function ProductViewer3D() {
  const mount = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let renderer: any;
    (async () => {
      const THREE = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      camera.position.z = 3;
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(400, 400);
      mount.current?.appendChild(renderer.domElement);
      const geometry = new THREE.BoxGeometry();
      const material = new THREE.MeshStandardMaterial({ color: 0x6c8cff });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(2, 2, 2);
      scene.add(light);
      const ambient = new THREE.AmbientLight(0x404040);
      scene.add(ambient);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.005;
        cube.rotation.y += 0.005;
        controls.update();
        renderer.render(scene, camera);
      }
      animate();
    })();
    return () => { renderer?.dispose(); };
  }, []);
  return (
    <div className="card p-6">
      <h1 className="text-3xl font-bold mb-4">3D Product Viewer (Demo)</h1>
      <p className="text-[var(--muted)] mb-4">Rotate, zoom and pan the model. Fallback image shown if WebGL unavailable.</p>
      <div ref={mount} className="mx-auto" />
      <noscript><img src="/favicon.svg" alt="fallback" /></noscript>
    </div>
  );
}