"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";

interface Props {
  text: string;
  speed?: number; // higher = moves more
  reverse?: boolean;
  className?: string;
  decoration?: ReactNode; // centered overlay element
}

/**
 * Giant text that drifts horizontally as you scroll past.
 * Mimics the duyvenvoorde "huge word behind a flower" effect.
 */
export function Marquee({
  text,
  speed = 800,
  reverse = false,
  className = "",
  decoration,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const x = useTransform(
    scrollYProgress,
    [0, 1],
    reverse ? [-speed, speed] : [speed, -speed]
  );

  const repeated = `${text}  ·  ${text}  ·  ${text}  ·  ${text}  ·  `;

  return (
    <section ref={ref} className={`relative overflow-hidden py-32 ${className}`}>
      <motion.div
        style={{ x, willChange: "transform" }}
        className="font-display italic text-[18vw] sm:text-[16vw] leading-[0.9] whitespace-nowrap select-none gradient-text opacity-90"
      >
        {repeated}
      </motion.div>
      {decoration && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          {decoration}
        </div>
      )}
    </section>
  );
}
