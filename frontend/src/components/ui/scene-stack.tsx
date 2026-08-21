"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { claimWebGL, onWebGLFreed, releaseWebGL, webglBudget } from "@/lib/webgl-lock";
import { getAmbient, subscribeAmbient } from "@/lib/ambient-state";

export type StackLayer =
  | "aurora"
  | "constellation"
  | "ribbons"
  | "liquid"
  | "vortex"
  | "caustics"
  | "volumetric"
  | "grid";

/**
 * Composites several backgrounds into ONE WebGL context.
 *
 * Stacking six <SceneField> components would mean six contexts. Browsers
 * cap those at roughly eight to sixteen and start dropping the oldest, so
 * the practical result is flickering and context-loss errors. Instead every
 * layer renders into the same renderer with autoClear off, back to front,
 * each with its own opacity and blend. One context, one rAF loop, one
 * device-capability gate.
 */

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const COMMON = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uOpacity;
uniform vec3 uAccent;
uniform vec3 uSecondary;
uniform float uDark;
uniform float uEnergy;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}

float fbm(vec2 p) {
  float t = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++) { t += noise(p) * a; p *= 2.03; a *= 0.5; }
  return t;
}
`;

const LAYER_SHADERS: Record<StackLayer, string> = {
  aurora: `${COMMON}
void main() {
  float t = uTime * 0.045;
  float warp = fbm(vUv * 1.7 + vec2(t, t * 0.6));
  float band = fbm(vUv * 2.4 + warp * 0.6 + vec2(-t * 0.4, t * 0.25));
  float ribbon = smoothstep(0.05, 0.85, band + (1.0 - vUv.y) * 0.55);
  vec3 color = mix(uSecondary * 0.4, uAccent, ribbon);
  float vig = smoothstep(1.15, 0.25, length(vUv - 0.5));
  gl_FragColor = vec4(color, ribbon * 0.34 * vig * uOpacity);
}`,

  caustics: `${COMMON}
vec2 wave(vec2 p, float t) {
  return vec2(sin(p.x * 3.1 + t) + sin(p.y * 2.3 - t * 0.7),
              cos(p.y * 2.8 - t * 0.9) + cos(p.x * 3.4 + t * 0.5));
}
void main() {
  vec2 uv = vUv * 3.0;
  float t = uTime * 0.26;
  vec2 w = wave(uv, t);
  w += wave(uv + w * 0.4, t * 1.3) * 0.5;
  float c = pow(max(0.0, 1.0 - length(w) * 0.34), 3.2);
  float vig = smoothstep(1.2, 0.3, length(vUv - 0.5));
  gl_FragColor = vec4(mix(uSecondary, uAccent, c) + c * 0.3, c * 0.42 * vig * uOpacity);
}`,

  liquid: `${COMMON}
float blob(vec2 p, vec2 c, float r) { return r / (length(p - c) + 0.001); }
void main() {
  vec2 uv = (vUv - 0.5) * vec2(1.7, 1.0);
  float t = uTime * 0.15;
  float field = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 c = vec2(sin(t * (0.7 + fi * 0.13) + fi * 2.1) * 0.42,
                  cos(t * (0.5 + fi * 0.17) + fi * 1.7) * 0.3);
    field += blob(uv, c, 0.05);
  }
  float surface = smoothstep(0.9, 1.9, field);
  float rim = smoothstep(1.7, 0.95, field) * smoothstep(0.85, 1.4, field);
  vec3 color = mix(uSecondary, uAccent, surface) + rim * 0.7;
  gl_FragColor = vec4(color, (surface * 0.3 + rim * 0.26) * uOpacity);
}`,

  volumetric: `${COMMON}
void main() {
  float t = uTime * 0.05;
  vec2 light = vec2(0.24, -0.12);
  vec2 dir = vUv - light;
  float dist = length(dir);
  float scatter = 0.0;
  for (int i = 0; i < 8; i++) {
    float s = float(i) / 8.0;
    scatter += fbm((light + dir * s) * 3.4 + vec2(t, t * 0.6)) * (1.0 - s);
  }
  scatter /= 8.0;
  float shaft = pow(max(0.0, 1.0 - dist * 0.85), 2.2) * scatter * 2.4;
  gl_FragColor = vec4(mix(uSecondary, uAccent, shaft) + shaft * 0.4, shaft * 0.4 * uOpacity);
}`,

  constellation: `${COMMON}
void main() {
  vec2 uv = vUv * vec2(2.2, 1.4);
  float t = uTime * 0.03;
  float stars = 0.0;
  for (int i = 0; i < 3; i++) {
    vec2 g = uv * (6.0 + float(i) * 5.0) + vec2(t * (1.0 + float(i)), -t);
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float r = hash(id + float(i) * 31.0);
    vec2 off = (vec2(hash(id), hash(id + 7.0)) - 0.5) * 0.55;
    float d = length(f - off);
    float tw = 0.6 + 0.4 * sin(uTime * (0.7 + r) + r * 20.0);
    stars += smoothstep(0.09, 0.0, d) * step(0.82, r) * tw;
  }
  gl_FragColor = vec4(mix(uSecondary, uAccent, 0.7) + stars * 0.6, stars * 0.85 * uOpacity);
}`,

  ribbons: `${COMMON}
void main() {
  float t = uTime * 0.07;
  float acc = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float y = 0.5 + sin(vUv.x * (2.2 + fi * 0.8) + t * (1.0 + fi * 0.3) + fi * 2.0) * (0.16 + fi * 0.05);
    float w = 0.035 + fi * 0.012;
    acc += smoothstep(w, 0.0, abs(vUv.y - y));
  }
  gl_FragColor = vec4(mix(uSecondary, uAccent, 0.8), acc * 0.3 * uOpacity);
}`,

  vortex: `${COMMON}
void main() {
  vec2 uv = (vUv - 0.5) * vec2(1.8, 1.0);
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  float t = uTime * 0.1;
  float spiral = sin(a * 3.0 + r * 14.0 - t * 3.0) * 0.5 + 0.5;
  float ring = smoothstep(0.6, 0.05, r) * smoothstep(0.0, 0.14, r);
  gl_FragColor = vec4(mix(uSecondary, uAccent, spiral), spiral * ring * 0.3 * uOpacity);
}`,

  grid: `${COMMON}
void main() {
  vec2 uv = vUv;
  float t = uTime * 0.04;
  float persp = 1.0 / max(0.06, 1.0 - uv.y);
  vec2 g = vec2(uv.x * persp * 8.0, fract(persp * 1.4 + t) * 1.0);
  float lx = smoothstep(0.03, 0.0, abs(fract(g.x) - 0.5) - 0.47);
  float ly = smoothstep(0.05, 0.0, abs(fract(g.y * 6.0) - 0.5) - 0.45);
  float fade = smoothstep(0.0, 0.55, uv.y) * smoothstep(1.0, 0.6, uv.y);
  gl_FragColor = vec4(uAccent, (lx + ly) * 0.16 * fade * uOpacity);
}`,
};

const DEFAULT_OPACITY: Record<StackLayer, number> = {
  aurora: 0.9,
  caustics: 0.5,
  liquid: 0.55,
  volumetric: 0.6,
  constellation: 0.85,
  ribbons: 0.5,
  vortex: 0.45,
  grid: 0.5,
};

export function SceneStack({
  layers,
  id,
  className = "",
  reactive = false,
  intensity = 1,
}: {
  layers: StackLayer[];
  id: string;
  className?: string;
  reactive?: boolean;
  intensity?: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
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

      const high = budget.tier === "high";
      const dark = mode === "dark";

      const active = high ? layers : layers.slice(0, 4);

      const [ar, ag, ab] = accent.split(" ").map((c) => Number(c.trim()) || 0);
      const accentColor = new THREE.Color(ar / 255, ag / 255, ab / 255);
      const secondary = dark
        ? new THREE.Color(0.16, 0.26, 0.4)
        : new THREE.Color(0.14, 0.2, 0.3);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 1.0 : 0.75));
      renderer.setSize(mount.clientWidth || window.innerWidth, mount.clientHeight || window.innerHeight);
      renderer.autoClear = false;
      mount.appendChild(renderer.domElement);

      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const geometry = new THREE.PlaneGeometry(2, 2);

      const scenes = active.map((layer) => {
        const uniforms = {
          uTime: { value: Math.random() * 40 },
          uOpacity: { value: DEFAULT_OPACITY[layer] * intensity },
          uAccent: { value: accentColor },
          uSecondary: { value: secondary },
          uDark: { value: dark ? 1 : 0 },
          uEnergy: { value: 0.5 },
        };

        const material = new THREE.ShaderMaterial({
          vertexShader: VERT,
          fragmentShader: LAYER_SHADERS[layer],
          uniforms,
          transparent: true,
          depthWrite: false,
          depthTest: false,
          blending: THREE.NormalBlending,
        });

        const scene = new THREE.Scene();
        scene.add(new THREE.Mesh(geometry, material));
        return { scene, uniforms, material };
      });

      let frameId = 0;
      let last = 0;
      let running = true;
      const step = 1000 / 30;

      function animate(time: number) {
        frameId = requestAnimationFrame(animate);
        if (!running || time - last < step) return;
        last = time;

        const energy = reactive ? ambientRef.current.health / 100 : 0.5;

        renderer.clear();
        scenes.forEach(({ scene, uniforms }) => {
          uniforms.uTime.value = time * 0.001;
          uniforms.uEnergy.value += (energy - uniforms.uEnergy.value) * 0.02;
          renderer.render(scene, camera);
        });
      }

      frameId = requestAnimationFrame(animate);

      function onResize() {
        if (!mount) return;
        renderer.setSize(mount.clientWidth || window.innerWidth, mount.clientHeight || window.innerHeight);
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
        scenes.forEach(({ material }) => material.dispose());
        geometry.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    }

    init();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [accent, budget.tier, granted, id, intensity, layers, mode, reactive]);

  if (!budget.enabled) return null;

  return <div ref={mountRef} className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden />;
}
