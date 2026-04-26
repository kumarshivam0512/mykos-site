"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export function SmoothScroll() {
  useEffect(() => {
    // Skip on touch devices (native scroll is smoother) + respect reduced-motion preference
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isTouch || reduced) return;

    const lenis = new Lenis({
      duration: 0.9,
      // Tighter lerp = fewer interpolated frames = less work for every useScroll/useTransform downstream
      lerp: 0.18,
      smoothWheel: true,
      wheelMultiplier: 1,
    });

    let frame: number;
    function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    }
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}
