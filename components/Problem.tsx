"use client";

import { motion } from "framer-motion";
import { WordReveal } from "./WordReveal";

const pains = [
  {
    n: "01",
    title: "Briefs sit in Notion for weeks",
    body: "Performance is dying while creative waits on agency turnaround.",
  },
  {
    n: "02",
    title: "Every platform speaks a different language",
    body: "Meta's 9:16 isn't TikTok's 9:16. Google demands its own copy. LinkedIn wants something else entirely.",
  },
  {
    n: "03",
    title: "Testing 50 variants is a fantasy",
    body: "You ship 2, hope one works, and call it optimisation.",
  },
];

export function Problem() {
  return (
    <section className="relative px-6 py-32 sm:py-40">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-3xl mb-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-xs uppercase tracking-[0.25em] text-white/40 mb-5"
          >
            The problem
          </motion.div>
          <WordReveal
            as="h2"
            text="Great paid teams are bottlenecked by creative."
            italicWords={["bottlenecked", "creative"]}
            accentWords={["creative"]}
            className="font-display text-5xl sm:text-6xl md:text-7xl leading-[0.95] tracking-tight gradient-text"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {pains.map((p, i) => (
            <motion.div
              key={p.n}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, margin: "-50px" }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: [0.25, 1, 0.5, 1] }}
              className="p-7 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm hover:border-white/20 hover:bg-white/[0.04] transition group"
            >
              <div className="font-display italic text-3xl text-white/30 group-hover:text-white/60 transition mb-4">
                {p.n}
              </div>
              <h3 className="text-lg font-medium mb-2">{p.title}</h3>
              <p className="text-sm text-white/55 leading-relaxed">{p.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
