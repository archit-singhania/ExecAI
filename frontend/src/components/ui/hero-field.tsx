"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { claimWebGL, onWebGLFreed, releaseWebGL, webglBudget } from "@/lib/webgl-lock";

type Variant = "lattice" | "orbit" | "drift";

const COUNTS: Record<"high" | "medium", Record<Variant, number>> = {
  high: { lattice: 220, orbit: 260, drift: 300 },
  medium: { lattice: 120, orbit: 140, drift: 160 },
};

export function HeroField({
  variant = "lattice",
  id,
  className = "",
}: {
  variant?: Variant;
  id: string;
  className?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const { mode, accent } = useTheme();
  const [granted, setGranted] = useState(false);
  const [budget] = useState(() => webglBudget());

  useEffect(() => {
    if (!budget.enabled) return;

    if (claimWebGL(id)) {
      setGranted(true);
      return () => releaseWebGL(id);
    }

    const stop = onWebGLFreed(() => {
      if (claimWebGL(id)) setGranted(true);
    });
    return () => {
      stop();
      releaseWebGL(id);
    };
  }, [budget.enabled, id]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!granted || !mount || budget.tier === "off") return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    async function init() {
      const THREE = await import("three");
      if (cancelled || !mount) return;

      const width = mount.clientWidth || window.innerWidth;
      const height = mount.clientHeight || window.innerHeight;
      const count = COUNTS[budget.tier === "high" ? "high" : "medium"][variant];

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 120);
      camera.position.z = 26;

      const renderer = new THREE.WebGLRenderer({
        antialias: budget.tier === "high",
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, budget.tier === "high" ? 1.75 : 1.25));
      renderer.setSize(width, height);
      mount.appendChild(renderer.domElement);

      const [r, g, b] = accent.split(" ").map((channel) => Number(channel.trim()) || 0);
      const accentColor = new THREE.Color(r / 255, g / 255, b / 255);
      const secondary =
        mode === "dark" ? new THREE.Color(0.55, 0.68, 0.88) : new THREE.Color(0.12, 0.16, 0.22);

      const geometry = new THREE.IcosahedronGeometry(0.34, 0);
      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: mode === "dark" ? 0.62 : 0.38,
        vertexColors: true,
      });

      const mesh = new THREE.InstancedMesh(geometry, material, count);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      const colors = new Float32Array(count * 3);
      const seeds = new Float32Array(count * 4);
      const dummy = new THREE.Object3D();

      for (let index = 0; index < count; index += 1) {
        const useAccent = Math.random() > 0.55;
        const color = useAccent ? accentColor : secondary;
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;

        seeds[index * 4] = (Math.random() - 0.5) * 46;
        seeds[index * 4 + 1] = (Math.random() - 0.5) * 30;
        seeds[index * 4 + 2] = (Math.random() - 0.5) * 34;
        seeds[index * 4 + 3] = Math.random() * Math.PI * 2;
      }

      geometry.setAttribute("color", new THREE.InstancedBufferAttribute(colors, 3));
      scene.add(mesh);

      const lineGeometry = new THREE.BufferGeometry();
      const maxLinks = budget.tier === "high" ? 260 : 130;
      const linePositions = new Float32Array(maxLinks * 6);
      lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
      const lineMaterial = new THREE.LineBasicMaterial({
        color: accentColor,
        transparent: true,
        opacity: mode === "dark" ? 0.16 : 0.1,
      });
      const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(lines);

      let frameId = 0;
      let last = 0;
      let running = true;
      const targetStep = 1000 / 30;

      function place(time: number) {
        let link = 0;

        for (let index = 0; index < count; index += 1) {
          const baseX = seeds[index * 4];
          const baseY = seeds[index * 4 + 1];
          const baseZ = seeds[index * 4 + 2];
          const phase = seeds[index * 4 + 3];

          let x = baseX;
          let y = baseY;
          let z = baseZ;

          if (variant === "orbit") {
            const angle = time * 0.00008 + phase;
            x = baseX * Math.cos(angle) - baseZ * Math.sin(angle);
            z = baseX * Math.sin(angle) + baseZ * Math.cos(angle);
            y = baseY + Math.sin(time * 0.0004 + phase) * 0.8;
          } else if (variant === "drift") {
            y = baseY + Math.sin(time * 0.00035 + phase) * 1.6;
            x = baseX + Math.cos(time * 0.00022 + phase) * 1.1;
          } else {
            y = baseY + Math.sin(time * 0.0003 + phase) * 0.55;
          }

          dummy.position.set(x, y, z);
          dummy.rotation.set(phase + time * 0.0002, phase, 0);
          const scale = 0.55 + Math.sin(time * 0.0005 + phase) * 0.18;
          dummy.scale.setScalar(scale);
          dummy.updateMatrix();
          mesh.setMatrixAt(index, dummy.matrix);

          if (link < maxLinks && index % 3 === 0) {
            const partner = (index * 7 + 11) % count;
            const px = seeds[partner * 4];
            const py = seeds[partner * 4 + 1];
            const pz = seeds[partner * 4 + 2];
            const distance = Math.hypot(x - px, y - py, z - pz);

            if (distance < 9) {
              const offset = link * 6;
              linePositions[offset] = x;
              linePositions[offset + 1] = y;
              linePositions[offset + 2] = z;
              linePositions[offset + 3] = px;
              linePositions[offset + 4] = py;
              linePositions[offset + 5] = pz;
              link += 1;
            }
          }
        }

        for (let index = link; index < maxLinks; index += 1) {
          linePositions.fill(0, index * 6, index * 6 + 6);
        }

        mesh.instanceMatrix.needsUpdate = true;
        lineGeometry.attributes.position.needsUpdate = true;
      }

      function animate(time: number) {
        frameId = requestAnimationFrame(animate);
        if (!running) return;
        if (time - last < targetStep) return;
        last = time;

        place(time);
        camera.position.x += (Math.sin(time * 0.00012) * 2.4 - camera.position.x) * 0.02;
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
      }

      frameId = requestAnimationFrame(animate);

      function onResize() {
        if (!mount) return;
        const w = mount.clientWidth || window.innerWidth;
        const h = mount.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
      window.addEventListener("resize", onResize);

      function onVisibility() {
        running = document.visibilityState === "visible";
      }
      document.addEventListener("visibilitychange", onVisibility);

      const observer = new IntersectionObserver(
        ([entry]) => {
          running = entry.isIntersecting && document.visibilityState === "visible";
        },
        { threshold: 0 },
      );
      observer.observe(mount);

      cleanup = () => {
        cancelAnimationFrame(frameId);
        observer.disconnect();
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVisibility);
        geometry.dispose();
        material.dispose();
        lineGeometry.dispose();
        lineMaterial.dispose();
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
  }, [accent, budget.tier, granted, mode, variant]);

  if (!budget.enabled) return null;

  return (
    <div
      ref={mountRef}
      className={`pointer-events-none absolute inset-0 ${className}`}
      aria-hidden
    />
  );
}
