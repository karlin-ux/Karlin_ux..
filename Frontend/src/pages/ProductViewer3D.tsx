import { useEffect, useRef, useState } from 'react';

export default function ProductViewer3D() {
  const mount = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [rotationPaused, setRotationPaused] = useState(false);
  const rotationPausedRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let renderer: any;
    let cancelled = false;
    let animationId: number;
    let isInteracting = false;
    let resumeTimeout: any;

    (async () => {
      try {
        const THREE = await import('three');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

        const container = mount.current;
        if (!container) return;

        const width = container.clientWidth || 600;
        const height = Math.min(width, 600);

        // Scene
        const scene = new THREE.Scene();

        // Camera
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.z = 3.5;

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        if (cancelled) return;
        container.appendChild(renderer.domElement);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 2;
        controls.maxDistance = 8;
        controls.enablePan = false;

        // Track interaction
        controls.addEventListener('start', () => {
          isInteracting = true;
          clearTimeout(resumeTimeout);
        });
        controls.addEventListener('end', () => {
          isInteracting = false;
          resumeTimeout = setTimeout(() => {}, 2000);
        });

        // Lighting
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sunLight.position.set(5, 3, 5);
        scene.add(sunLight);

        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        scene.add(ambientLight);

        const rimLight = new THREE.DirectionalLight(0x5C9DFF, 0.3);
        rimLight.position.set(-5, 0, -5);
        scene.add(rimLight);

        // Create Earth texture using canvas
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;

        // Ocean base
        const oceanGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        oceanGradient.addColorStop(0, '#0a2a4a');
        oceanGradient.addColorStop(0.3, '#0d3a5c');
        oceanGradient.addColorStop(0.5, '#1a5a7a');
        oceanGradient.addColorStop(0.7, '#0d3a5c');
        oceanGradient.addColorStop(1, '#0a2a4a');
        ctx.fillStyle = oceanGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add continents (simplified procedural landmasses)
        ctx.fillStyle = '#1a6b3a';
        // North America
        ctx.beginPath();
        ctx.ellipse(180, 140, 80, 60, -0.3, 0, Math.PI * 2);
        ctx.fill();
        // South America
        ctx.beginPath();
        ctx.ellipse(220, 320, 40, 80, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Europe
        ctx.beginPath();
        ctx.ellipse(420, 120, 35, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        // Africa
        ctx.beginPath();
        ctx.ellipse(440, 240, 50, 80, 0, 0, Math.PI * 2);
        ctx.fill();
        // Asia
        ctx.beginPath();
        ctx.ellipse(520, 140, 90, 60, 0.1, 0, Math.PI * 2);
        ctx.fill();
        // Australia
        ctx.beginPath();
        ctx.ellipse(580, 320, 35, 25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Add some green variation to land
        ctx.fillStyle = '#2a7b4a';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.ellipse(190, 130, 50, 40, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(430, 110, 25, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(510, 130, 60, 40, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Add polar ice caps
        ctx.fillStyle = '#e8f0f8';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(0, 0, canvas.width, 30);
        ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.globalAlpha = 1.0;

        // Add some cloud wisps
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        for (let i = 0; i < 20; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          const w = 40 + Math.random() * 80;
          const h = 10 + Math.random() * 20;
          ctx.beginPath();
          ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }

        const earthTexture = new THREE.CanvasTexture(canvas);
        earthTexture.wrapS = THREE.RepeatWrapping;
        earthTexture.wrapT = THREE.RepeatWrapping;

        // Earth sphere
        const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
        const earthMaterial = new THREE.MeshPhongMaterial({
          map: earthTexture,
          specular: new THREE.Color(0x333333),
          shininess: 25,
        });
        const earth = new THREE.Mesh(earthGeometry, earthMaterial);
        scene.add(earth);

        // Cloud layer
        const cloudCanvas = document.createElement('canvas');
        cloudCanvas.width = 1024;
        cloudCanvas.height = 512;
        const cloudCtx = cloudCanvas.getContext('2d')!;
        cloudCtx.fillStyle = 'transparent';
        cloudCtx.fillRect(0, 0, cloudCanvas.width, cloudCanvas.height);
        cloudCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        for (let i = 0; i < 30; i++) {
          const x = Math.random() * cloudCanvas.width;
          const y = Math.random() * cloudCanvas.height;
          const w = 60 + Math.random() * 120;
          const h = 15 + Math.random() * 30;
          cloudCtx.beginPath();
          cloudCtx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
          cloudCtx.fill();
        }
        const cloudTexture = new THREE.CanvasTexture(cloudCanvas);
        const cloudGeometry = new THREE.SphereGeometry(1.01, 64, 64);
        const cloudMaterial = new THREE.MeshPhongMaterial({
          map: cloudTexture,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
        });
        const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
        scene.add(clouds);

        // Atmosphere glow
        const atmosphereGeometry = new THREE.SphereGeometry(1.15, 64, 64);
        const atmosphereMaterial = new THREE.ShaderMaterial({
          vertexShader: `
            varying vec3 vNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec3 vNormal;
            void main() {
              float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
              gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
            }
          `,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          transparent: true,
        });
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        scene.add(atmosphere);

        // Stars
        const starsGeometry = new THREE.BufferGeometry();
        const starsVertices = [];
        for (let i = 0; i < 2000; i++) {
          const x = (Math.random() - 0.5) * 200;
          const y = (Math.random() - 0.5) * 200;
          const z = (Math.random() - 0.5) * 200;
          starsVertices.push(x, y, z);
        }
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, sizeAttenuation: true });
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        scene.add(stars);

        // Animation loop
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let autoRotate = !prefersReducedMotion;

        function animate() {
          if (cancelled) return;
          animationId = requestAnimationFrame(animate);

          if (autoRotate && !isInteracting && !rotationPausedRef.current) {
            earth.rotation.y += 0.002;
            clouds.rotation.y += 0.0025;
          }

          controls.update();
          renderer.render(scene, camera);
        }
        animate();

        // Handle resize
        const handleResize = () => {
          if (!container) return;
          const newWidth = container.clientWidth;
          const newHeight = Math.min(newWidth, 600);
          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
        };
        window.addEventListener('resize', handleResize);

        // Store cleanup
        (container as any).__threeCleanup = () => {
          cancelled = true;
          cancelAnimationFrame(animationId);
          clearTimeout(resumeTimeout);
          window.removeEventListener('resize', handleResize);
          controls.dispose();
          renderer.dispose();
          earthGeometry.dispose();
          earthMaterial.dispose();
          cloudGeometry.dispose();
          cloudMaterial.dispose();
          atmosphereGeometry.dispose();
          atmosphereMaterial.dispose();
          starsGeometry.dispose();
          starsMaterial.dispose();
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
  }, []);

  function toggleRotation() {
    setRotationPaused(prev => {
      const next = !prev;
      rotationPausedRef.current = next;
      return next;
    });
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
        <h1 className="text-3xl font-bold">3D Earth Viewer</h1>
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
        Interactive 3D Earth globe. Drag to rotate, scroll to zoom. Auto-rotates when idle.
      </p>
      {error && <p className="text-[var(--error)] text-sm mb-3">{error}</p>}
      <div ref={mount} className="mx-auto rounded-xl overflow-hidden bg-[var(--bg-secondary)]" style={{ minHeight: '400px' }} />
      <p className="text-xs text-[var(--text-muted)] mt-3 text-center">
        Procedural Earth rendering using Three.js. Drag to rotate, scroll to zoom.
      </p>
    </div>
  );
}