"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AgentReport } from "@/lib/api";
import { claimWebGL, onWebGLFreed, releaseWebGL, releaseWebGL as free, webglBudget } from "@/lib/webgl-lock";
import { useTheme } from "@/components/theme-provider";

/**
 * The board as an orbitable ring, and the conviction spread as a 3D scatter.
 *
 * Both share one renderer and one lock. Drag to rotate; there is no zoom and
 * no pan, because an orbit control with six degrees of freedom on a data
 * view mostly produces disorientation rather than insight.
 */

function scoreColor(score: number): [number, number, number] {
  if (score >= 85) return [0.11, 0.44, 0.37];
  if (score >= 70) return [0.36, 0.48, 0.84];
  if (score >= 50) return [0.72, 0.79, 0.36];
  return [0.83, 0.37, 0.23];
}

export function BoardRing({
  reports,
  mode: shape = "ring",
  height = 320,
  id = "board-ring",
}: {
  reports: AgentReport[];
  mode?: "ring" | "scatter";
  height?: number;
  id?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, x: 0, target: 0, current: 0 });
  const { mode } = useTheme();
  const [granted, setGranted] = useState(false);
  const [budget] = useState(() => webglBudget());

  const data = useMemo(
    () =>
      reports.slice(0, 12).map((report) => ({
        agent: report.agent,
        score: report.score,
      })),
    [reports],
  );

  useEffect(() => {
    if (!budget.enabled || !data.length) return;
    if (claimWebGL(id)) {
      setGranted(true);
      return () => releaseWebGL(id);
    }
    const stop = onWebGLFreed(() => {
      if (claimWebGL(id)) setGranted(true);
    });
    return () => {
      stop();
      free(id);
    };
  }, [budget.enabled, data.length, id]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!granted || !mount || !data.length || budget.tier === "off") return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    async function init() {
      const THREE = await import("three");
      if (cancelled || !mount) return;

      const width = mount.clientWidth || 480;
      const dark = mode === "dark";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
      camera.position.set(0, shape === "ring" ? 5.5 : 7, 15);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: budget.tier === "high" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
      renderer.setSize(width, height);
      mount.appendChild(renderer.domElement);

      const group = new THREE.Group();
      scene.add(group);

      const disposables: { dispose: () => void }[] = [];
      const sphere = new THREE.SphereGeometry(0.42, 20, 16);
      disposables.push(sphere);

      const max = Math.max(...data.map((entry) => entry.score), 1);

      data.forEach((entry, index) => {
        const [r, g, b] = scoreColor(entry.score);
        const material = new THREE.MeshBasicMaterial({
          color: new THREE.Color(r, g, b),
          transparent: true,
          opacity: 0.9,
        });
        disposables.push(material);

        const node = new THREE.Mesh(sphere, material);
        const normalised = entry.score / max;

        if (shape === "ring") {
          const angle = (index / data.length) * Math.PI * 2;
          node.position.set(Math.cos(angle) * 6, (normalised - 0.5) * 5, Math.sin(angle) * 6);
          node.scale.setScalar(0.7 + normalised * 0.7);
        } else {
          node.position.set(
            (index / Math.max(1, data.length - 1) - 0.5) * 12,
            (normalised - 0.5) * 8,
            Math.sin(index * 1.7) * 3.5,
          );
          node.scale.setScalar(0.6 + normalised * 0.8);
        }

        group.add(node);

        // Stem down to the base plane, so height reads as a value.
        const stemGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(node.position.x, node.position.y, node.position.z),
          new THREE.Vector3(node.position.x, -4, node.position.z),
        ]);
        const stemMaterial = new THREE.LineBasicMaterial({
          color: new THREE.Color(r, g, b),
          transparent: true,
          opacity: 0.28,
        });
        group.add(new THREE.Line(stemGeometry, stemMaterial));
        disposables.push(stemGeometry, stemMaterial);
      });

      // Reflective-feeling floor: a faint grid, not a real reflection.
      const grid = new THREE.GridHelper(
        22,
        16,
        new THREE.Color(dark ? 0.28 : 0.55, dark ? 0.33 : 0.58, dark ? 0.4 : 0.64),
        new THREE.Color(dark ? 0.18 : 0.72, dark ? 0.21 : 0.75, dark ? 0.26 : 0.8),
      );
      grid.position.y = -4;
      (grid.material as THREE.Material).transparent = true;
      (grid.material as THREE.Material).opacity = dark ? 0.18 : 0.26;
      scene.add(grid);
      disposables.push(grid.geometry, grid.material as THREE.Material);

      let frameId = 0;
      let last = 0;
      let running = true;

      function animate(time: number) {
        frameId = requestAnimationFrame(animate);
        if (!running || time - last < 1000 / 30) return;
        last = time;

        const drag = dragRef.current;
        if (!drag.active) drag.target += 0.0016;
        drag.current += (drag.target - drag.current) * 0.09;
        group.rotation.y = drag.current;

        renderer.render(scene, camera);
      }

      frameId = requestAnimationFrame(animate);

      function onDown(event: PointerEvent) {
        dragRef.current.active = true;
        dragRef.current.x = event.clientX;
      }
      function onMove(event: PointerEvent) {
        if (!dragRef.current.active) return;
        const dx = event.clientX - dragRef.current.x;
        dragRef.current.x = event.clientX;
        dragRef.current.target += dx * 0.006;
      }
      function onUp() {
        dragRef.current.active = false;
      }

      const canvas = renderer.domElement;
      canvas.style.touchAction = "pan-y";
      canvas.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);

      function onResize() {
        if (!mount) return;
        const w = mount.clientWidth || 480;
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
        canvas.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("resize", onResize);
        disposables.forEach((item) => item.dispose());
        renderer.dispose();
        if (canvas.parentNode === mount) mount.removeChild(canvas);
      };
    }

    init();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [budget.tier, data, granted, height, id, mode, shape]);

  if (!budget.enabled || !data.length) return null;

  return (
    <div className="br-wrap">
      <div ref={mountRef} style={{ height }} className="br-canvas" />
      <p className="br-hint">Drag to rotate</p>
    </div>
  );
}
