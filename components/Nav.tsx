"use client";

import { motion, useScroll, useTransform } from "framer-motion";

export function Nav() {
  const { scrollY } = useScroll();
  const bg = useTransform(
    scrollY,
    [0, 100],
    ["rgba(7,7,10,0)", "rgba(7,7,10,0.7)"]
  );
  const blur = useTransform(scrollY, [0, 100], ["blur(0px)", "blur(12px)"]);
  const border = useTransform(
    scrollY,
    [0, 100],
    ["rgba(255,255,255,0)", "rgba(255,255,255,0.06)"]
  );

  return (
    <motion.header
      style={{
        backgroundColor: bg,
        backdropFilter: blur,
        WebkitBackdropFilter: blur,
        borderBottom: "1px solid",
        borderBottomColor: border,
      }}
      className="fixed top-0 inset-x-0 z-50"
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-400 to-fuchsia-500 grid place-items-center font-bold text-white text-sm shadow-lg shadow-indigo-500/30">
            M
          </div>
          <span className="text-lg font-semibold tracking-tight">Mykos</span>
        </a>

        <nav className="hidden sm:flex items-center gap-7 text-sm text-white/60">
          <a href="#how" className="hover:text-white transition-colors">
            How it works
          </a>
          <a href="#platforms" className="hover:text-white transition-colors">
            Platforms
          </a>
          <a href="mailto:kumar@mykos.ai" className="hover:text-white transition-colors">
            Contact
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="https://app.mykos.ai"
            className="hidden sm:inline-block text-sm text-white/70 hover:text-white transition"
          >
            Sign in
          </a>
          <a
            href="#cta"
            className="text-sm px-3.5 py-1.5 rounded-md bg-white text-black font-medium hover:bg-white/90 transition shadow"
          >
            Get access
          </a>
        </div>
      </div>
    </motion.header>
  );
}
