"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const orbY = useTransform(scrollYProgress, [0, 1], [0, 240]);
  const orbScale = useTransform(scrollYProgress, [0, 1], [1, 1.45]);
  const orbRotate = useTransform(scrollYProgress, [0, 1], [0, 60]);

  // word stagger
  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
  };
  const word = {
    hidden: { y: "110%", opacity: 0 },
    visible: {
      y: "0%",
      opacity: 1,
      transition: { duration: 0.85, ease: [0.25, 1, 0.5, 1] as const },
    },
  };

  return (
    <section
      ref={ref}
      className="relative min-h-[100svh] flex items-center justify-center px-6 pt-44 pb-20"
    >
      {/* glowing orb */}
      <motion.div
        style={{ y: orbY, scale: orbScale, rotate: orbRotate, willChange: "transform" }}
        className="orb absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 h-[460px] w-[460px] sm:h-[640px] sm:w-[640px] rounded-full opacity-70 -z-10"
      />

      {/* drifting decoration — small floating tag */}
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="hidden lg:block absolute top-44 left-[12%] -rotate-6 select-none"
      >
        <div className="px-3 py-1.5 rounded-md border border-white/15 bg-white/5 backdrop-blur text-xs text-white/70">
          ⚡ 12 ad variants generated
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: -60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1.4 }}
        className="hidden lg:block absolute top-72 right-[10%] rotate-3 select-none"
      >
        <div className="px-3 py-1.5 rounded-md border border-emerald-400/30 bg-emerald-400/10 backdrop-blur text-xs text-emerald-200">
          ↑ ROAS +38% this week
        </div>
      </motion.div>

      <motion.div
        style={{ y, opacity }}
        className="relative max-w-4xl mx-auto text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur text-xs text-white/70 mb-9"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Private beta — opening soon
        </motion.div>

        <motion.h1
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="font-display text-[14vw] sm:text-7xl md:text-8xl lg:text-9xl leading-[0.92] tracking-tight gradient-text"
        >
          {["AI", "ad", "creatives"].map((w, i) => (
            <span key={i} className="inline-block overflow-hidden align-bottom mr-[0.18em]">
              <motion.span variants={word} className="inline-block">
                {w}
              </motion.span>
            </span>
          ))}
          <br />
          {["that", "ship"].map((w, i) => (
            <span key={i} className="inline-block overflow-hidden align-bottom mr-[0.18em]">
              <motion.span variants={word} className="inline-block italic">
                {w}
              </motion.span>
            </span>
          ))}
          <span className="inline-block overflow-hidden align-bottom">
            <motion.span variants={word} className="inline-block italic gradient-accent">
              themselves.
            </motion.span>
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 1.1 }}
          className="mt-9 text-lg sm:text-xl text-white/55 max-w-xl mx-auto leading-relaxed"
        >
          One-line brief in. A week of video ads — generated, A/B tested, and
          live across Meta, TikTok, Google &amp; LinkedIn — out.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 1.3 }}
          className="mt-11 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <a
            href="#cta"
            className="px-7 py-3.5 rounded-full bg-white text-black font-medium hover:bg-white/90 transition shadow-2xl shadow-white/10"
          >
            Get early access
          </a>
          <a
            href="#how"
            className="px-7 py-3.5 rounded-full border border-white/15 hover:bg-white/5 text-white/80 hover:text-white transition"
          >
            See how it works ↓
          </a>
        </motion.div>
      </motion.div>

      {/* scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.8 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-white/35 flex flex-col items-center gap-2"
      >
        Scroll
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="h-6 w-px bg-gradient-to-b from-white/40 to-transparent"
        />
      </motion.div>
    </section>
  );
}
