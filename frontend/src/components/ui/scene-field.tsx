"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { claimWebGL, onWebGLFreed, releaseWebGL, webglBudget } from "@/lib/webgl-lock";
import { getAmbient, subscribeAmbient } from "@/lib/ambient-state";

export type SceneVariant = "aurora" | "reveal" | "shafts" | "cloud" | "topography";

const AURORA_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const AURORA_FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uWarmth;
uniform float uFog;
uniform float uBrightness;
uniform vec3 uAccent;
uniform vec3 uSecondary;
uniform float uDark;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865, 0.366025404, -0.577350269, 0.024390244);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float total = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    total += snoise(p) * amplitude;
    p *= 2.02;
    amplitude *= 0.5;
  }
  return total;
}

void main() {
  vec2 uv = vUv;
  float t = uTime * 0.045;

  float warp = fbm(uv * 1.7 + vec2(t, t * 0.6));
  float band = fbm(uv * 2.4 + warp * 0.6 + vec2(-t * 0.4, t * 0.25));

  float ribbon = smoothstep(0.05, 0.85, band + (1.0 - uv.y) * 0.55);
  float shimmer = smoothstep(0.35, 1.0, fbm(uv * 5.0 + t * 1.2)) * 0.18;

  vec3 warm = mix(uSecondary, uAccent, clamp(uWarmth, 0.0, 1.0));
  vec3 color = mix(uSecondary * 0.35, warm, ribbon);
  color += shimmer * uAccent;

  float haze = uFog * 0.35 * (1.0 - uv.y);
  color = mix(color, mix(vec3(0.28, 0.32, 0.4), vec3(0.62, 0.66, 0.72), uDark), haze);

  color *= mix(0.75, 1.25, clamp(uBrightness, 0.0, 1.0));

  float vignette = smoothstep(1.15, 0.25, length(uv - 0.5));
  float strength = mix(0.42, 0.24, uDark);
  float alpha = (mix(0.10, 0.16, uDark) + ribbon * strength) * vignette;

  gl_FragColor = vec4(color, alpha);
}
`;

export function SceneField({
  variant = "aurora",
  id,
  className = "",
  reactive = false,
}: {
  variant?: SceneVariant;
  id: string;
  className?: string;
  reactive?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });
  const ambientRef = useRef(getAmbient());
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
    if (!reactive) return;
    return subscribeAmbient((state) => {
      ambientRef.current = state;
    });
  }, [reactive]);

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
      const high = budget.tier === "high";
      const dark = mode === "dark";

      const [ar, ag, ab] = accent.split(" ").map((c) => Number(c.trim()) || 0);
      const accentColor = new THREE.Color(ar / 255, ag / 255, ab / 255);
      const secondary = dark
        ? new THREE.Color(0.16, 0.26, 0.4)
        : new THREE.Color(0.14, 0.2, 0.3);

      const renderer = new THREE.WebGLRenderer({
        antialias: high && variant !== "aurora",
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 1.75 : 1.25));
      renderer.setSize(width, height);
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const disposables: { dispose: () => void }[] = [];

      let camera: THREE.Camera;
      let update: (time: number) => void = () => undefined;

      if (variant === "aurora") {
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        const geometry = new THREE.PlaneGeometry(2, 2);
        const uniforms = {
          uTime: { value: 0 },
          uWarmth: { value: 0.5 },
          uFog: { value: 0.2 },
          uBrightness: { value: 0.7 },
          uAccent: { value: accentColor },
          uSecondary: { value: secondary },
          uDark: { value: dark ? 1 : 0 },
        };

        const material = new THREE.ShaderMaterial({
          vertexShader: AURORA_VERT,
          fragmentShader: AURORA_FRAG,
          uniforms,
          transparent: true,
          depthWrite: false,
        });

        scene.add(new THREE.Mesh(geometry, material));
        disposables.push(geometry, material);

        update = (time) => {
          uniforms.uTime.value = time * 0.001;
          if (reactive) {
            const health = ambientRef.current.health / 100;
            uniforms.uWarmth.value += (health - uniforms.uWarmth.value) * 0.02;
            uniforms.uBrightness.value += (0.4 + health * 0.5 - uniforms.uBrightness.value) * 0.02;
          }
        };
      } else if (variant === "topography") {
        camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 200);
        camera.position.set(0, 22, 34);
        camera.lookAt(0, 0, 0);

        const segments = high ? 88 : 52;
        const geometry = new THREE.PlaneGeometry(90, 90, segments, segments);
        geometry.rotateX(-Math.PI / 2);

        const material = new THREE.MeshBasicMaterial({
          color: accentColor,
          wireframe: true,
          transparent: true,
          opacity: dark ? 0.18 : 0.3,
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        disposables.push(geometry, material);

        const position = geometry.getAttribute("position") as THREE.BufferAttribute;
        const base = Float32Array.from(position.array as Float32Array);

        update = (time) => {
          const t = time * 0.00016;
          for (let index = 0; index < position.count; index += 1) {
            const x = base[index * 3];
            const z = base[index * 3 + 2];
            const height =
              Math.sin(x * 0.09 + t) * 2.1 +
              Math.cos(z * 0.11 - t * 1.3) * 1.7 +
              Math.sin((x + z) * 0.05 + t * 0.6) * 1.2;
            position.setY(index, height);
          }
          position.needsUpdate = true;
          mesh.rotation.y = Math.sin(t * 0.4) * 0.06;
        };
      } else if (variant === "shafts") {
        camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 120);
        camera.position.z = 30;

        const group = new THREE.Group();
        const count = high ? 9 : 5;

        for (let index = 0; index < count; index += 1) {
          const geometry = new THREE.PlaneGeometry(3.2 + Math.random() * 4, 70);
          const material = new THREE.MeshBasicMaterial({
            color: index % 2 ? accentColor : secondary,
            transparent: true,
            opacity: dark ? 0.055 : 0.075,
            blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
          });
          const shaft = new THREE.Mesh(geometry, material);
          shaft.position.set((index - count / 2) * 6.5, 0, -index * 1.6);
          shaft.rotation.z = 0.28 + Math.random() * 0.12;
          group.add(shaft);
          disposables.push(geometry, material);
        }

        scene.add(group);

        update = (time) => {
          const t = time * 0.0002;
          group.children.forEach((child, index) => {
            child.position.x += Math.sin(t + index) * 0.006;
            (child as THREE.Mesh).rotation.z = 0.28 + Math.sin(t * 1.4 + index) * 0.05;
          });
          group.position.x = (pointerRef.current.x - 0.5) * 6;
        };
      } else {
        camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 140);
        camera.position.z = 30;

        const count = variant === "cloud" ? (high ? 320 : 180) : high ? 420 : 240;
        const geometry = new THREE.IcosahedronGeometry(variant === "cloud" ? 0.3 : 0.24, 0);
        const material = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: dark ? 0.72 : 0.6,
          vertexColors: true,
        });

        const mesh = new THREE.InstancedMesh(geometry, material, count);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        const colors = new Float32Array(count * 3);
        const seeds = new Float32Array(count * 4);
        const dummy = new THREE.Object3D();

        for (let index = 0; index < count; index += 1) {
          const useAccent = Math.random() > 0.5;
          const color = useAccent ? accentColor : secondary;
          colors[index * 3] = color.r;
          colors[index * 3 + 1] = color.g;
          colors[index * 3 + 2] = color.b;

          seeds[index * 4] = (Math.random() - 0.5) * 52;
          seeds[index * 4 + 1] = (Math.random() - 0.5) * 34;
          seeds[index * 4 + 2] = (Math.random() - 0.5) * 38;
          seeds[index * 4 + 3] = Math.random() * Math.PI * 2;
        }

        geometry.setAttribute("color", new THREE.InstancedBufferAttribute(colors, 3));
        scene.add(mesh);
        disposables.push(geometry, material);

        const reveal = variant === "reveal";

        update = (time) => {
          const t = time * 0.0002;
          const px = (pointerRef.current.x - 0.5) * 52;
          const py = (0.5 - pointerRef.current.y) * 34;
          const filed = reactive ? ambientRef.current.filed / Math.max(1, ambientRef.current.total) : 0;

          for (let index = 0; index < count; index += 1) {
            const bx = seeds[index * 4];
            const by = seeds[index * 4 + 1];
            const bz = seeds[index * 4 + 2];
            const phase = seeds[index * 4 + 3];

            const x = bx + Math.cos(t * 0.9 + phase) * 1.1;
            const y = by + Math.sin(t + phase) * 1.4;

            dummy.position.set(x, y, bz);
            dummy.rotation.set(phase + t * 1.6, phase, 0);

            let scale = 0.5 + Math.sin(t * 2.2 + phase) * 0.16;

            if (reveal) {
              const distance = Math.hypot(x - px, y - py);
              scale *= 0.25 + Math.max(0, 1 - distance / 16) * 2.4;
            } else if (reactive) {
              scale *= 0.7 + filed * 0.9;
            }

            dummy.scale.setScalar(Math.max(0.04, scale));
            dummy.updateMatrix();
            mesh.setMatrixAt(index, dummy.matrix);
          }

          mesh.instanceMatrix.needsUpdate = true;
        };
      }

      function onPointer(event: PointerEvent) {
        if (!mount) return;
        const rect = mount.getBoundingClientRect();
        pointerRef.current = {
          x: (event.clientX - rect.left) / rect.width,
          y: (event.clientY - rect.top) / rect.height,
        };
      }

      const needsPointer = variant === "reveal" || variant === "shafts";
      if (needsPointer) window.addEventListener("pointermove", onPointer, { passive: true });

      let frameId = 0;
      let last = 0;
      let running = true;
      const step = 1000 / (variant === "aurora" ? 30 : 30);

      function animate(time: number) {
        frameId = requestAnimationFrame(animate);
        if (!running || time - last < step) return;
        last = time;
        update(time);
        renderer.render(scene, camera);
      }

      frameId = requestAnimationFrame(animate);

      function onResize() {
        if (!mount) return;
        const w = mount.clientWidth || window.innerWidth;
        const h = mount.clientHeight || window.innerHeight;
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
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
        if (needsPointer) window.removeEventListener("pointermove", onPointer);
        disposables.forEach((item) => item.dispose());
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    }

    init();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [accent, budget.tier, granted, mode, reactive, variant]);

  if (!budget.enabled) return null;

  return <div ref={mountRef} className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden />;
}
