"use client";

import { motion, useScroll, useTransform } from "framer-motion";

export function Nav() {
  const { scrollY } = useScroll();
  const top = useTransform(scrollY, [0, 80], [24, 16]);
  const scale = useTransform(scrollY, [0, 200], [1, 0.96]);

  return (
    <motion.header
      style={{ top, scale }}
      className="fixed left-1/2 -translate-x-1/2 z-50 w-[min(960px,calc(100%-32px))]"
    >
      <div className="rounded-full border border-white/10 bg-black/55 backdrop-blur-xl backdrop-saturate-150 shadow-2xl shadow-black/50 px-3 py-2 flex items-center justify-between gap-2">
        <a href="#" className="flex items-center gap-2.5 pl-2.5 pr-1">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-indigo-400 to-fuchsia-500 grid place-items-center font-bold text-white text-[11px] shadow-lg shadow-indigo-500/30">
            M
          </div>
          <span className="text-[15px] font-semibold tracking-tight">Mykos</span>
        </a>

        <nav className="hidden md:flex items-center gap-1 text-sm text-white/65">
          <a href="#how" className="px-3 py-1.5 rounded-full hover:text-white hover:bg-white/5 transition">
            How it works
          </a>
          <a href="#platforms" className="px-3 py-1.5 rounded-full hover:text-white hover:bg-white/5 transition">
            Platforms
          </a>
          <a href="mailto:kumar@mykos.ai" className="px-3 py-1.5 rounded-full hover:text-white hover:bg-white/5 transition">
            Contact
          </a>
        </nav>

        <div className="flex items-center gap-1.5">
          <a
            href="https://app.mykos.ai"
            className="hidden sm:inline-block text-[13px] text-white/70 hover:text-white px-3 py-1.5 transition"
          >
            Sign in
          </a>
          <a
            href="#cta"
            className="text-[13px] px-4 py-2 rounded-full bg-white text-black font-medium hover:bg-white/90 transition"
          >
            Get access
          </a>
        </div>
      </div>
    </motion.header>
  );
}
