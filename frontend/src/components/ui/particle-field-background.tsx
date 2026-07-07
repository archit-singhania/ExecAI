"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";

export function ParticleFieldBackground() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { mode, accent } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const handleChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (reducedMotion || !mount) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    async function init() {
      const THREE = await import("three");
      if (cancelled || !mount) return;

      const width = mount.clientWidth || window.innerWidth;
      const height = mount.clientHeight || window.innerHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
      camera.position.z = 17;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      mount.appendChild(renderer.domElement);

      // Soft circular glow sprite, drawn once on a canvas
      const spriteCanvas = document.createElement("canvas");
      spriteCanvas.width = 64;
      spriteCanvas.height = 64;
      const spriteCtx = spriteCanvas.getContext("2d")!;
      const gradient = spriteCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.4, "rgba(255,255,255,0.55)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      spriteCtx.fillStyle = gradient;
      spriteCtx.fillRect(0, 0, 64, 64);
      const sprite = new THREE.CanvasTexture(spriteCanvas);

      const [r, g, b] = accent.split(" ").map((channel) => Number(channel.trim()) || 0);
      const accentColor = new THREE.Color(r / 255, g / 255, b / 255);
      const secondaryColor = mode === "dark" ? new THREE.Color(0xf6f4ee) : new THREE.Color(0x101317);

      const count = 640;
      const positions = new Float32Array(count * 3);
      const colorAttr = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 36;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 26;

        const useAccent = Math.random() > 0.35;
        const c = useAccent ? accentColor : secondaryColor;
        colorAttr[i * 3] = c.r;
        colorAttr[i * 3 + 1] = c.g;
        colorAttr[i * 3 + 2] = c.b;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colorAttr, 3));

      const material = new THREE.PointsMaterial({
        size: 0.17,
        map: sprite,
        vertexColors: true,
        transparent: true,
        opacity: mode === "dark" ? 0.85 : 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });

      const points = new THREE.Points(geometry, material);
      scene.add(points);

      let targetX = 0;
      let targetY = 0;

      function onPointerMove(event: PointerEvent) {
        targetX = (event.clientX / window.innerWidth - 0.5) * 1.4;
        targetY = (event.clientY / window.innerHeight - 0.5) * 1.4;
      }
      window.addEventListener("pointermove", onPointerMove);

      function onResize() {
        if (!mount) return;
        const w = mount.clientWidth || window.innerWidth;
        const h = mount.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
      window.addEventListener("resize", onResize);

      let frameId = 0;
      function animate() {
        points.rotation.y += 0.00055;
        points.rotation.x += 0.00018;
        camera.position.x += (targetX - camera.position.x) * 0.02;
        camera.position.y += (-targetY - camera.position.y) * 0.02;
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
        frameId = requestAnimationFrame(animate);
      }
      animate();

      cleanup = () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("resize", onResize);
        cancelAnimationFrame(frameId);
        geometry.dispose();
        material.dispose();
        sprite.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) {
          mount.removeChild(renderer.domElement);
        }
      };
    }

    init();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [mode, accent, reducedMotion]);

  if (reducedMotion) return null;

  return <div ref={mountRef} className="pointer-events-none absolute inset-0" aria-hidden />;
}
