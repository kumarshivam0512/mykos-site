"use client";

import { useEffect, useRef } from "react";

interface MatrixRainProps {
  fontSize?: number;
  color?: string;
  characters?: string;
  fadeOpacity?: number;
  speed?: number;
  backgroundColor?: string;
  className?: string;
}

export default function MatrixRain({
  fontSize = 20,
  color = "#00ff00",
  characters = "01",
  fadeOpacity = 0.1,
  speed = 1,
  backgroundColor = "#000000",
  className,
}: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!Number.isFinite(fontSize) || fontSize <= 0 || !characters.length ||
      !Number.isFinite(fadeOpacity) || fadeOpacity <= 0 || fadeOpacity > 1 ||
      !Number.isFinite(speed) || speed <= 0) {
      console.error("Mykos matrix: invalid font size, characters, fade opacity, or speed.");
      canvas.dataset.status = "error";
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Mykos matrix: canvas rendering is unavailable.");
      canvas.dataset.status = "unavailable";
      return;
    }
    const chars = Array.from(characters);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let drops: number[] = [];
    let frame = 0;
    let lastTime = 0;
    let visible = true;

    const draw = (advance: boolean) => {
      ctx.globalAlpha = fadeOpacity;
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.font = `${fontSize}px monospace`;
      drops.forEach((drop, i) => {
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * fontSize, drop * fontSize);
        if (advance) {
          drops[i] = drop * fontSize > height && Math.random() > 0.975 ? 0 : drop + speed;
        }
      });
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
    };
    const animate = (time: number) => {
      if (!lastTime || time - lastTime >= 1000 / 30) {
        draw(true);
        lastTime = time;
      }
      frame = requestAnimationFrame(animate);
    };
    const sync = () => {
      stop();
      if (motion.matches) {
        canvas.dataset.status = "static";
      } else if (visible && !document.hidden && width && height) {
        canvas.dataset.status = "running";
        frame = requestAnimationFrame(animate);
      } else {
        canvas.dataset.status = "paused";
      }
    };
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
      drops = Array.from({ length: Math.ceil(width / fontSize) }, () => Math.random() * height / fontSize);
      // Seed trails so reduced motion still has a complete backdrop.
      for (let i = 0; i < 24; i++) draw(true);
      sync();
    };
    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", resize);
    resize();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", resize);
    };
  }, [fontSize, color, characters, fadeOpacity, speed, backgroundColor]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" data-status="loading"
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: -2 }} />;
}
