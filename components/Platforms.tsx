"use client";

import { motion } from "framer-motion";
import { WordReveal } from "./WordReveal";

const platforms = [
  { name: "Meta", note: "Facebook & Instagram Reels, Stories, Feed" },
  { name: "TikTok", note: "Spark Ads + native creator-style video" },
  { name: "Google", note: "YouTube Shorts, Demand Gen, Performance Max" },
  { name: "LinkedIn", note: "Sponsored video for B2B audiences" },
];

export function Platforms() {
  return (
    <section id="platforms" className="relative px-6 py-32 sm:py-40">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-xs uppercase tracking-[0.25em] text-white/40 mb-5"
          >
            Where it ships
          </motion.div>
          <WordReveal
            as="h2"
            text="One brief. Every channel that matters."
            italicWords={["Every", "channel", "that", "matters"]}
            accentWords={["matters"]}
            className="font-display text-5xl sm:text-6xl md:text-7xl leading-[0.95] tracking-tight gradient-text"
          />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {platforms.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.25, 1, 0.5, 1] }}
              whileHover={{ y: -6 }}
              className="group relative p-7 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm hover:border-white/25 hover:bg-white/[0.04] transition-all overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-400/30 to-fuchsia-500/30 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="font-display text-4xl mb-3 gradient-text">{p.name}</div>
                <div className="text-sm text-white/50 leading-relaxed">{p.note}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 text-center text-sm text-white/40"
        >
          More channels coming. Snapchat, Reddit, Pinterest on the roadmap.
        </motion.div>
      </div>
    </section>
  );
}
