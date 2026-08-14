"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { claimWebGL, onWebGLFreed, releaseWebGL, webglBudget } from "@/lib/webgl-lock";

/**
 * Point-cloud portrait.
 *
 * Samples an image on a 2D canvas, keeps pixels above a brightness cut, and
 * places one instanced point per surviving pixel. The cloud drifts, reacts
 * to the pointer, and settles back — so the face resolves and dissolves.
 *
 * Sampling happens once at a fixed grid, not per frame; the animation only
 * moves already-computed points.
 */
export function PointCloudPortrait({
  src,
  id = "portrait-cloud",
  height = 420,
  density = 3,
}: {
  src: string;
  id?: string;
  height?: number;
  density?: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });
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

      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = src;

      await new Promise<void>((resolve) => {
        if (image.complete) resolve();
        else {
          image.onload = () => resolve();
          image.onerror = () => resolve();
        }
      });

      if (cancelled || !mount || !image.naturalWidth) return;

      const step = budget.tier === "high" ? density : density * 2;
      const sampleWidth = 150;
      const sampleHeight = Math.round((image.naturalHeight / image.naturalWidth) * sampleWidth);

      const canvas = document.createElement("canvas");
      canvas.width = sampleWidth;
      canvas.height = sampleHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;

      context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
      const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;

      const points: { x: number; y: number; z: number; b: number }[] = [];

      for (let y = 0; y < sampleHeight; y += step) {
        for (let x = 0; x < sampleWidth; x += step) {
          const offset = (y * sampleWidth + x) * 4;
          const brightness =
            (pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722) / 255;

          if (brightness < 0.16) continue;

          points.push({
            x: (x / sampleWidth - 0.5) * 16,
            y: -(y / sampleHeight - 0.5) * 16 * (sampleHeight / sampleWidth),
            z: (brightness - 0.5) * 2.4,
            b: brightness,
          });
        }
      }

      if (!points.length) return;

      const width = mount.clientWidth || 420;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
      camera.position.z = 22;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(width, height);
      mount.appendChild(renderer.domElement);

      const [ar, ag, ab] = accent.split(" ").map((c) => Number(c.trim()) || 0);
      const accentColor = new THREE.Color(ar / 255, ag / 255, ab / 255);
      const base = mode === "dark" ? new THREE.Color(0.85, 0.88, 0.93) : new THREE.Color(0.1, 0.13, 0.18);

      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(points.length * 3);
      const colors = new Float32Array(points.length * 3);
      const home = new Float32Array(points.length * 3);

      points.forEach((point, index) => {
        home[index * 3] = point.x;
        home[index * 3 + 1] = point.y;
        home[index * 3 + 2] = point.z;

        positions[index * 3] = point.x;
        positions[index * 3 + 1] = point.y;
        positions[index * 3 + 2] = point.z;

        const tone = base.clone().lerp(accentColor, point.b * 0.55);
        colors[index * 3] = tone.r;
        colors[index * 3 + 1] = tone.g;
        colors[index * 3 + 2] = tone.b;
      });

      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.13,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        sizeAttenuation: true,
      });

      const cloud = new THREE.Points(geometry, material);
      scene.add(cloud);

      let frameId = 0;
      let last = 0;
      let running = true;
      const attribute = geometry.getAttribute("position") as THREE.BufferAttribute;

      function animate(time: number) {
        frameId = requestAnimationFrame(animate);
        if (!running || time - last < 1000 / 30) return;
        last = time;

        const t = time * 0.0004;
        const px = (pointerRef.current.x - 0.5) * 18;
        const py = (0.5 - pointerRef.current.y) * 12;

        for (let index = 0; index < points.length; index += 1) {
          const hx = home[index * 3];
          const hy = home[index * 3 + 1];
          const hz = home[index * 3 + 2];

          const dx = hx - px;
          const dy = hy - py;
          const distSq = dx * dx + dy * dy;

          let push = 0;
          if (distSq < 26) push = (1 - Math.sqrt(distSq) / 5.1) * 2.6;

          attribute.setXYZ(
            index,
            hx + Math.sin(t + index * 0.05) * 0.12 + (dx / (Math.sqrt(distSq) || 1)) * push,
            hy + Math.cos(t * 1.2 + index * 0.04) * 0.12 + (dy / (Math.sqrt(distSq) || 1)) * push,
            hz + Math.sin(t * 0.8 + index * 0.03) * 0.3,
          );
        }

        attribute.needsUpdate = true;
        cloud.rotation.y = Math.sin(t * 0.5) * 0.09;

        renderer.render(scene, camera);
      }

      frameId = requestAnimationFrame(animate);

      function onPointer(event: PointerEvent) {
        if (!mount) return;
        const rect = mount.getBoundingClientRect();
        pointerRef.current = {
          x: (event.clientX - rect.left) / rect.width,
          y: (event.clientY - rect.top) / rect.height,
        };
      }
      window.addEventListener("pointermove", onPointer, { passive: true });

      function onResize() {
        if (!mount) return;
        const w = mount.clientWidth || 420;
        camera.aspect = w / height;
        camera.updateProjectionMatrix();
        renderer.setSize(w, height);
      }
      window.addEventListener("resize", onResize);

      const observer = new IntersectionObserver(([entry]) => {
        running = entry.isIntersecting && document.visibilityState === "visible";
      });
      observer.observe(mount);

      cleanup = () => {
        cancelAnimationFrame(frameId);
        observer.disconnect();
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("resize", onResize);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    }

    init();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [accent, budget.tier, density, granted, height, id, mode, src]);

  if (!budget.enabled) return null;

  return <div ref={mountRef} style={{ height }} className="w-full" aria-hidden />;
}
