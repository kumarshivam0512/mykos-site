"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const orbY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const orbScale = useTransform(scrollYProgress, [0, 1], [1, 1.4]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center px-6 pt-32 pb-24"
    >
      {/* glowing orb */}
      <motion.div
        style={{ y: orbY, scale: orbScale }}
        className="orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[420px] w-[420px] sm:h-[560px] sm:w-[560px] rounded-full opacity-40 -z-10"
      />

      <motion.div
        style={{ y, opacity }}
        className="relative max-w-3xl mx-auto text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur text-xs text-white/70 mb-8"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Private beta — opening soon
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight gradient-text"
        >
          AI ad creatives<br />
          <span className="italic">that ship</span>{" "}
          <span className="gradient-accent italic">themselves.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
          className="mt-7 text-lg sm:text-xl text-white/55 max-w-xl mx-auto leading-relaxed"
        >
          One-line brief in. A week's worth of video ads — generated, A/B tested,
          and live across Meta, TikTok, Google, and LinkedIn — out.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.5 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <a
            href="#cta"
            className="px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-white/90 transition shadow-2xl shadow-white/10"
          >
            Get early access
          </a>
          <a
            href="#how"
            className="px-6 py-3 rounded-lg border border-white/15 hover:bg-white/5 text-white/80 hover:text-white transition"
          >
            See how it works ↓
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-16 text-xs text-white/30 tracking-wider uppercase"
        >
          Built for the next million performance marketers
        </motion.div>
      </motion.div>
    </section>
  );
}
