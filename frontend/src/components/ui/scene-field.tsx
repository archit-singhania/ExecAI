"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { claimWebGL, onWebGLFreed, releaseWebGL, webglBudget } from "@/lib/webgl-lock";
import { getAmbient, subscribeAmbient } from "@/lib/ambient-state";

export type SceneVariant =
  | "aurora"
  | "reveal"
  | "shafts"
  | "cloud"
  | "topography"
  | "caustics"
  | "constellation"
  | "ribbons"
  | "depthgrid"
  | "vortex"
  | "liquid"
  | "glass"
  | "iridescent"
  | "volumetric"
  | "repel";

const AURORA_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const CAUSTICS_FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec3 uAccent;
uniform vec3 uSecondary;
uniform float uDark;

vec2 wave(vec2 p, float t) {
  return vec2(
    sin(p.x * 3.1 + t) + sin(p.y * 2.3 - t * 0.7),
    cos(p.y * 2.8 - t * 0.9) + cos(p.x * 3.4 + t * 0.5)
  );
}

void main() {
  vec2 uv = vUv * 3.0;
  float t = uTime * 0.28;

  vec2 w = wave(uv, t);
  w += wave(uv + w * 0.4, t * 1.3) * 0.5;

  float caustic = pow(max(0.0, 1.0 - length(w) * 0.34), 3.2);
  float secondary = pow(max(0.0, 1.0 - length(wave(uv * 1.7 + 4.0, t * 0.8)) * 0.4), 4.0);

  vec3 color = mix(uSecondary, uAccent, caustic);
  color += uAccent * secondary * 0.5;

  float vignette = smoothstep(1.2, 0.3, length(vUv - 0.5));
  float alpha = (caustic * 0.5 + secondary * 0.3) * vignette * mix(0.5, 0.42, uDark);

  gl_FragColor = vec4(color, alpha);
}
`;

const LIQUID_FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec3 uAccent;
uniform vec3 uSecondary;
uniform float uDark;

float blob(vec2 p, vec2 c, float r) {
  return r / (length(p - c) + 0.001);
}

void main() {
  vec2 uv = (vUv - 0.5) * vec2(1.7, 1.0);
  float t = uTime * 0.16;

  float field = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 c = vec2(
      sin(t * (0.7 + fi * 0.13) + fi * 2.1) * 0.42,
      cos(t * (0.5 + fi * 0.17) + fi * 1.7) * 0.3
    );
    field += blob(uv, c, 0.052);
  }

  float surface = smoothstep(0.9, 1.9, field);
  float rim = smoothstep(1.7, 0.95, field) * smoothstep(0.85, 1.4, field);

  vec3 color = mix(uSecondary, uAccent, surface);
  color += rim * 0.7;

  float alpha = (surface * 0.42 + rim * 0.3) * mix(0.55, 0.46, uDark);
  gl_FragColor = vec4(color, alpha);
}
`;

const GLASS_FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec3 uAccent;
uniform vec3 uSecondary;
uniform float uDark;

float panel(vec2 uv, float offset, float t) {
  float x = fract(uv.x * 2.4 + offset + t * 0.03);
  float edge = smoothstep(0.0, 0.06, x) * smoothstep(1.0, 0.94, x);
  return edge;
}

void main() {
  float t = uTime;
  vec2 uv = vUv;

  float a = panel(uv, 0.0, t);
  float b = panel(uv + vec2(0.13, 0.0), 0.37, t * 1.4);
  float c = panel(uv + vec2(0.29, 0.0), 0.71, t * 0.7);

  float glass = a * 0.4 + b * 0.3 + c * 0.3;
  float sheen = pow(1.0 - abs(uv.y - 0.5) * 2.0, 2.0);

  vec3 color = mix(uSecondary, uAccent, glass * 0.7);
  float alpha = glass * sheen * mix(0.3, 0.24, uDark);

  gl_FragColor = vec4(color, alpha);
}
`;

const IRIDESCENT_FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uPointer;
uniform vec3 uAccent;
uniform float uDark;

// Thin-film interference. The colour shift comes from path difference
// across a film thickness, which is why it reads as oil on water or
// anodised metal rather than a rainbow gradient.
vec3 thinFilm(float cosTheta, float thickness) {
  vec3 wavelength = vec3(680.0, 550.0, 440.0);
  vec3 phase = (4.0 * 3.14159 * thickness * cosTheta) / wavelength;
  return 0.5 + 0.5 * cos(phase);
}

float sphere(vec2 uv, vec2 c, float r) {
  float d = length(uv - c);
  return smoothstep(r, r - 0.004, d);
}

void main() {
  vec2 uv = (vUv - 0.5) * vec2(1.8, 1.0);
  float t = uTime * 0.22;

  vec2 center = uPointer * 0.16;
  float radius = 0.3 + sin(t * 0.6) * 0.012;

  float d = length(uv - center);
  float mask = sphere(uv, center, radius);

  // Fake a normal so we get a believable fresnel and view angle.
  float z = sqrt(max(0.0, radius * radius - d * d)) / radius;
  vec3 normal = normalize(vec3((uv - center) / radius, z));
  vec3 view = normalize(vec3(0.0, 0.0, 1.0));
  float cosTheta = clamp(dot(normal, view), 0.0, 1.0);

  float thickness = 320.0 + sin(uv.x * 5.0 + t) * 90.0 + cos(uv.y * 6.0 - t * 1.3) * 70.0;
  vec3 film = thinFilm(cosTheta, thickness);

  float fresnel = pow(1.0 - cosTheta, 3.0);
  vec3 color = mix(film * uAccent * 1.5, vec3(1.0), fresnel * 0.55);

  // Specular pip, offset toward the light.
  float spec = pow(max(0.0, dot(normal, normalize(vec3(-0.45, 0.55, 0.8)))), 42.0);
  color += spec * 0.9;

  float glow = smoothstep(radius + 0.22, radius, d) * 0.28;
  float alpha = mask * mix(0.72, 0.62, uDark) + glow * 0.5;

  gl_FragColor = vec4(color, alpha);
}
`;

const VOLUMETRIC_FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec3 uAccent;
uniform vec3 uSecondary;
uniform float uDark;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float total = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    total += noise(p) * amp;
    p *= 2.03;
    amp *= 0.5;
  }
  return total;
}

void main() {
  vec2 uv = vUv;
  float t = uTime * 0.05;

  // Light source above and to the left; rays scatter through the medium.
  vec2 light = vec2(0.24, -0.12);
  vec2 dir = uv - light;
  float dist = length(dir);

  float scatter = 0.0;
  for (int i = 0; i < 12; i++) {
    float s = float(i) / 12.0;
    vec2 p = light + dir * s;
    scatter += fbm(p * 3.4 + vec2(t, t * 0.6)) * (1.0 - s);
  }
  scatter /= 12.0;

  float shaft = pow(max(0.0, 1.0 - dist * 0.85), 2.2) * scatter * 2.4;
  float fog = fbm(uv * 2.2 + vec2(-t * 0.7, t * 0.4)) * 0.5;

  vec3 color = mix(uSecondary, uAccent, shaft);
  color += shaft * 0.4;

  float alpha = (shaft * 0.5 + fog * 0.16) * mix(0.5, 0.44, uDark);
  gl_FragColor = vec4(color, alpha);
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

const SHADER_VARIANTS = new Set<SceneVariant>([
  "aurora",
  "caustics",
  "liquid",
  "glass",
  "iridescent",
  "volumetric",
]);

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
        antialias: high && !SHADER_VARIANTS.has(variant),
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

      const SHADERS: Partial<Record<SceneVariant, string>> = {
        aurora: AURORA_FRAG,
        caustics: CAUSTICS_FRAG,
        liquid: LIQUID_FRAG,
        glass: GLASS_FRAG,
        iridescent: IRIDESCENT_FRAG,
        volumetric: VOLUMETRIC_FRAG,
      };

      const shaderSource = SHADERS[variant];

      if (shaderSource) {
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        const geometry = new THREE.PlaneGeometry(2, 2);
        const uniforms = {
          uTime: { value: 0 },
          uWarmth: { value: 0.5 },
          uFog: { value: 0.2 },
          uBrightness: { value: 0.7 },
          uPointer: { value: new THREE.Vector2(0, 0) },
          uAccent: { value: accentColor },
          uSecondary: { value: secondary },
          uDark: { value: dark ? 1 : 0 },
        };

        const material = new THREE.ShaderMaterial({
          vertexShader: AURORA_VERT,
          fragmentShader: shaderSource,
          uniforms,
          transparent: true,
          depthWrite: false,
        });

        scene.add(new THREE.Mesh(geometry, material));
        disposables.push(geometry, material);

        update = (time) => {
          uniforms.uTime.value = time * 0.001;

          uniforms.uPointer.value.x +=
            ((pointerRef.current.x - 0.5) * 2 - uniforms.uPointer.value.x) * 0.045;
          uniforms.uPointer.value.y +=
            ((0.5 - pointerRef.current.y) * 2 - uniforms.uPointer.value.y) * 0.045;

          if (reactive) {
            const health = ambientRef.current.health / 100;
            uniforms.uWarmth.value += (health - uniforms.uWarmth.value) * 0.02;
            uniforms.uBrightness.value += (0.4 + health * 0.5 - uniforms.uBrightness.value) * 0.02;
          }
        };
      } else if (variant === "depthgrid") {
        camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 200);
        camera.position.set(0, 4, 18);
        camera.lookAt(0, 0, -40);

        const group = new THREE.Group();
        const lineMaterial = new THREE.LineBasicMaterial({
          color: accentColor,
          transparent: true,
          opacity: dark ? 0.22 : 0.3,
        });
        disposables.push(lineMaterial);

        const rows = high ? 26 : 16;
        const spacing = 4;

        for (let index = 0; index < rows; index += 1) {
          const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-60, 0, 0),
            new THREE.Vector3(60, 0, 0),
          ]);
          const line = new THREE.Line(geometry, lineMaterial);
          line.position.z = -index * spacing;
          group.add(line);
          disposables.push(geometry);
        }

        for (let index = -12; index <= 12; index += 1) {
          const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(index * 5, 0, 4),
            new THREE.Vector3(index * 5, 0, -rows * spacing),
          ]);
          group.add(new THREE.Line(geometry, lineMaterial));
          disposables.push(geometry);
        }

        scene.add(group);

        update = (time) => {
          const offset = (time * 0.004) % spacing;
          group.position.z = offset;
          group.position.x = (pointerRef.current.x - 0.5) * -4;
        };
      } else if (
        variant === "constellation" ||
        variant === "vortex" ||
        variant === "ribbons" ||
        variant === "repel"
      ) {
        camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 160);
        camera.position.z = variant === "vortex" ? 34 : 30;

        const count = high ? 300 : 170;
        const geometry = new THREE.IcosahedronGeometry(variant === "ribbons" ? 0.2 : 0.26, 0);
        const material = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: dark ? 0.7 : 0.6,
          vertexColors: true,
        });

        const mesh = new THREE.InstancedMesh(geometry, material, count);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        const colors = new Float32Array(count * 3);
        const seeds = new Float32Array(count * 4);
        const dummy = new THREE.Object3D();

        for (let index = 0; index < count; index += 1) {
          const color = Math.random() > 0.5 ? accentColor : secondary;
          colors[index * 3] = color.r;
          colors[index * 3 + 1] = color.g;
          colors[index * 3 + 2] = color.b;

          if (variant === "vortex") {
            seeds[index * 4] = Math.random() * Math.PI * 2;
            seeds[index * 4 + 1] = 3 + Math.random() * 26;
            seeds[index * 4 + 2] = (Math.random() - 0.5) * 26;
            seeds[index * 4 + 3] = 0.35 + Math.random() * 0.9;
          } else {
            seeds[index * 4] = (Math.random() - 0.5) * 54;
            seeds[index * 4 + 1] = (Math.random() - 0.5) * 34;
            seeds[index * 4 + 2] = (Math.random() - 0.5) * 30;
            seeds[index * 4 + 3] = Math.random() * Math.PI * 2;
          }
        }

        geometry.setAttribute("color", new THREE.InstancedBufferAttribute(colors, 3));
        scene.add(mesh);
        disposables.push(geometry, material);

        let links: THREE.LineSegments | null = null;
        let linkPositions: Float32Array | null = null;
        const maxLinks = high ? 200 : 90;

        if (variant === "constellation") {
          const linkGeometry = new THREE.BufferGeometry();
          linkPositions = new Float32Array(maxLinks * 6);
          linkGeometry.setAttribute("position", new THREE.BufferAttribute(linkPositions, 3));
          const linkMaterial = new THREE.LineBasicMaterial({
            color: accentColor,
            transparent: true,
            opacity: dark ? 0.2 : 0.26,
          });
          links = new THREE.LineSegments(linkGeometry, linkMaterial);
          scene.add(links);
          disposables.push(linkGeometry, linkMaterial);
        }

        const positions = variant === "constellation" ? new Float32Array(count * 3) : null;
        const velocities = variant === "repel" ? new Float32Array(count * 2) : null;

        update = (time) => {
          const t = time * 0.0002;
          const px = (pointerRef.current.x - 0.5) * 54;
          const py = (0.5 - pointerRef.current.y) * 34;

          for (let index = 0; index < count; index += 1) {
            let x: number;
            let y: number;
            let z: number;

            if (variant === "repel" && velocities) {
              // Verlet-lite: push away from the pointer, spring back home,
              // damp each frame. Cheap enough for 300 instances and it
              // settles rather than oscillating.
              const homeX = seeds[index * 4];
              const homeY = seeds[index * 4 + 1];

              let vx = velocities[index * 2];
              let vy = velocities[index * 2 + 1];

              const curX = homeX + vx * 8;
              const curY = homeY + vy * 8;

              const dx = curX - px;
              const dy = curY - py;
              const distSq = dx * dx + dy * dy;

              if (distSq < 210 && distSq > 0.01) {
                const dist = Math.sqrt(distSq);
                const force = (1 - dist / 14.5) * 0.42;
                vx += (dx / dist) * force;
                vy += (dy / dist) * force;
              }

              vx *= 0.9;
              vy *= 0.9;
              vx -= vx * 0.06;
              vy -= vy * 0.06;

              velocities[index * 2] = vx;
              velocities[index * 2 + 1] = vy;

              x = homeX + vx * 8;
              y = homeY + vy * 8;
              z = seeds[index * 4 + 2];
            } else if (variant === "vortex") {
              const angle = seeds[index * 4] + t * seeds[index * 4 + 3];
              const radius = seeds[index * 4 + 1] * (0.72 + Math.sin(t * 0.8 + index) * 0.06);
              x = Math.cos(angle) * radius;
              y = Math.sin(angle) * radius * 0.55;
              z = seeds[index * 4 + 2];
            } else if (variant === "ribbons") {
              const phase = seeds[index * 4 + 3];
              x = seeds[index * 4] + Math.sin(t * 1.6 + phase) * 5.5;
              y = seeds[index * 4 + 1] + Math.cos(t * 1.1 + phase * 1.7) * 4.2;
              z = seeds[index * 4 + 2] + Math.sin(t + phase) * 3;
            } else {
              const phase = seeds[index * 4 + 3];
              x = seeds[index * 4] + Math.cos(t * 0.8 + phase) * 1.6;
              y = seeds[index * 4 + 1] + Math.sin(t + phase) * 1.9;
              z = seeds[index * 4 + 2];
            }

            if (positions) {
              positions[index * 3] = x;
              positions[index * 3 + 1] = y;
              positions[index * 3 + 2] = z;
            }

            dummy.position.set(x, y, z);
            dummy.rotation.set(t * 1.4 + index, t + index, 0);
            dummy.scale.setScalar(0.5 + Math.sin(t * 2 + index) * 0.15);
            dummy.updateMatrix();
            mesh.setMatrixAt(index, dummy.matrix);
          }

          mesh.instanceMatrix.needsUpdate = true;

          if (links && linkPositions && positions) {
            let link = 0;
            for (let a = 0; a < count && link < maxLinks; a += 4) {
              for (let b = a + 4; b < count && link < maxLinks; b += 4) {
                const dx = positions[a * 3] - positions[b * 3];
                const dy = positions[a * 3 + 1] - positions[b * 3 + 1];
                const dz = positions[a * 3 + 2] - positions[b * 3 + 2];
                if (dx * dx + dy * dy + dz * dz < 90) {
                  const offset = link * 6;
                  linkPositions[offset] = positions[a * 3];
                  linkPositions[offset + 1] = positions[a * 3 + 1];
                  linkPositions[offset + 2] = positions[a * 3 + 2];
                  linkPositions[offset + 3] = positions[b * 3];
                  linkPositions[offset + 4] = positions[b * 3 + 1];
                  linkPositions[offset + 5] = positions[b * 3 + 2];
                  link += 1;
                }
              }
            }
            for (let index = link; index < maxLinks; index += 1) {
              linkPositions.fill(0, index * 6, index * 6 + 6);
            }
            links.geometry.attributes.position.needsUpdate = true;
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

      const needsPointer =
        variant === "reveal" ||
        variant === "shafts" ||
        variant === "iridescent" ||
        variant === "repel" ||
        variant === "depthgrid";
      if (needsPointer) window.addEventListener("pointermove", onPointer, { passive: true });

      let frameId = 0;
      let last = 0;
      let running = true;
      const step = 1000 / 30;

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
