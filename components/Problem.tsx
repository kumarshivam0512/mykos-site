"use client";

import { motion } from "framer-motion";

const pains = [
  {
    n: "01",
    title: "Briefs sit in Notion for weeks",
    body: "Performance is dying while creative waits on agency turnaround.",
  },
  {
    n: "02",
    title: "Every platform speaks a different language",
    body: "Meta's 9:16 isn't TikTok's 9:16. Google demands its own copy. LinkedIn wants something else.",
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
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl mb-20"
        >
          <div className="text-xs uppercase tracking-widest text-white/40 mb-4">
            The problem
          </div>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl leading-tight gradient-text">
            Great paid teams are
            <br />
            <span className="italic gradient-accent">bottlenecked by creative.</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {pains.map((p, i) => (
            <motion.div
              key={p.n}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              className="p-7 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm hover:border-white/20 hover:bg-white/[0.04] transition group"
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
