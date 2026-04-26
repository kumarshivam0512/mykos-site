"use client";

import { motion } from "framer-motion";

const platforms = [
  { name: "Meta", note: "Facebook & Instagram Reels, Stories, Feed" },
  { name: "TikTok", note: "Spark Ads + native creator-style video" },
  { name: "Google", note: "YouTube Shorts, Demand Gen, Performance Max" },
  { name: "LinkedIn", note: "Sponsored video for B2B audiences" },
];

export function Platforms() {
  return (
    <section id="platforms" className="relative px-6 py-32 sm:py-40">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20 max-w-2xl mx-auto"
        >
          <div className="text-xs uppercase tracking-widest text-white/40 mb-4">
            Where it ships
          </div>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl leading-tight gradient-text">
            One brief.
            <br />
            <span className="italic gradient-accent">Every channel that matters.</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {platforms.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="group relative p-6 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm hover:border-white/25 hover:bg-white/[0.04] transition-all overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-400/20 to-fuchsia-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="font-display text-3xl mb-2 gradient-text">{p.name}</div>
                <div className="text-sm text-white/50 leading-relaxed">{p.note}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 text-center text-sm text-white/40"
        >
          More channels coming. Snapchat, Reddit, Pinterest on the roadmap.
        </motion.div>
      </div>
    </section>
  );
}
