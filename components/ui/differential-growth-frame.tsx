"use client";

import { useEffect, useRef } from "react";

export function rng(seed: number | string): () => number {
  let a = typeof seed === "number" ? seed >>> 0 : hashString(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

const GRAD3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]] as const;

export function simplex3(seed: number | string = 1) {
  const r = rng(seed);
  const p = new Uint8Array(512);
  const base = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  const F3 = 1 / 3, G3 = 1 / 6;
  return (x: number, y: number, z: number): number => {
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
    const t = (i + j + k) * G3;
    const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }
    const pts = [[x0, y0, z0, 0, 0, 0], [x0 - i1 + G3, y0 - j1 + G3, z0 - k1 + G3, i1, j1, k1], [x0 - i2 + 2 * G3, y0 - j2 + 2 * G3, z0 - k2 + 2 * G3, i2, j2, k2], [x0 - 1 + 3 * G3, y0 - 1 + 3 * G3, z0 - 1 + 3 * G3, 1, 1, 1]] as const;
    let n = 0;
    for (const [dx, dy, dz, a, b, c] of pts) {
      let tt = 0.6 - dx * dx - dy * dy - dz * dz;
      if (tt < 0) continue;
      const g = GRAD3[p[(i + a + p[(j + b + p[(k + c) & 255]) & 255]) & 255] % 12];
      tt *= tt;
      n += tt * tt * (g[0] * dx + g[1] * dy + g[2] * dz);
    }
    return 32 * n;
  };
}

export function fbm3(noise: (x: number, y: number, z: number) => number, x: number, y: number, z: number, octaves = 4): number {
  let sum = 0, amp = 0.5, f = 1;
  for (let o = 0; o < octaves; o++) { sum += amp * noise(x * f, y * f, z * f); f *= 2; amp *= 0.5; }
  return sum;
}

export function loopCircle(frame: number, duration: number, radius = 1): [number, number] {
  const a = (frame / duration) * Math.PI * 2;
  return [Math.cos(a) * radius, Math.sin(a) * radius];
}

export default function DifferentialGrowthFrame({ className, seed = "mykos-growth" }: { className?: string; seed?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Mykos differential growth: Canvas 2D is unavailable.");
      canvas.dataset.status = "unavailable";
      return;
    }
    const noise = simplex3(seed);
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0, height = 0, elapsed = 0, last = 0, frame = 0;
    let visible = true;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      if (!width || !height) return;
      const mobile = width < 700;
      const centerX = width * 0.72;
      const centerY = height * (mobile ? 0.77 : 0.52);
      const innerX = Math.min(width * 0.11, mobile ? 62 : 112);
      const innerY = mobile ? 18 : 28;
      const outerX = Math.min(width * 0.46, mobile ? 300 : 690);
      const outerY = Math.min(height * 0.42, mobile ? 260 : 390);
      const [u, v] = loopCircle(elapsed, 24000, 0.35);
      const count = mobile ? 160 : 320;
      const steps = mobile ? 36 : 56;
      for (let ray = 0; ray < count; ray++) {
        const angle = ray / count * Math.PI * 2;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const start = (Math.abs(cos / innerX) ** 8 + Math.abs(sin / innerY) ** 8) ** (-1 / 8);
        const end = (cos ** 2 / outerX ** 2 + sin ** 2 / outerY ** 2) ** (-1 / 2);
        const accent = ray % 15 === 0;
        ctx.beginPath();
        for (let step = 0; step <= steps; step++) {
          const progress = step / steps;
          const distance = start + (end - start) * progress;
          const envelope = Math.min(1, progress * 5);
          const drift = (
            noise(cos * distance / 72 + u, sin * distance / 72 + v, u + v) * 13
            + Math.sin(distance / 20 + angle * 9 + v) * 4
          ) * envelope;
          const x = centerX + cos * distance - sin * drift;
          const y = centerY + sin * distance + cos * drift;
          if (step === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = accent ? "#d79782" : "#7894d8";
        ctx.globalAlpha = accent ? 0.58 : 0.4;
        ctx.lineWidth = mobile ? 0.8 : 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      ctx.beginPath();
      for (let point = 0; point <= 160; point++) {
        const angle = point / 160 * Math.PI * 2;
        const radius = (Math.abs(Math.cos(angle) / innerX) ** 8 + Math.abs(Math.sin(angle) / innerY) ** 8) ** (-1 / 8);
        const drift = noise(Math.cos(angle) + u, Math.sin(angle) + v, u - v) * 2.5;
        const x = centerX + Math.cos(angle) * (radius + drift);
        const y = centerY + Math.sin(angle) * (radius + drift);
        if (point === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = "#2f4b79";
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = mobile ? 1 : 1.25;
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; last = 0; };
    const animate = (time: number) => {
      if (!last || time - last >= 1000 / 30) {
        if (last) elapsed += Math.min(time - last, 100);
        last = time;
        draw();
      }
      frame = requestAnimationFrame(animate);
    };
    const sync = () => {
      stop();
      if (motion.matches) {
        elapsed = 0;
        draw();
        canvas.dataset.status = "static";
      } else if (visible && !document.hidden) {
        canvas.dataset.status = "running";
        frame = requestAnimationFrame(animate);
      } else canvas.dataset.status = "paused";
    };
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
      sync();
    };
    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    resize();
    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
    };
  }, [seed]);
  return <canvas ref={ref} className={className} aria-hidden="true" data-status="loading"
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: -2 }} />;
}
