"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const steps = [
  {
    tag: "Step 01",
    title: "Brief in plain English.",
    body: "“Promote our new yoga mat to women 25–45 who like wellness brands.” That's it. Mykos extracts audience, channel, tone, offer.",
    accent: "from-indigo-400 to-blue-500",
  },
  {
    tag: "Step 02",
    title: "Generate a creative wave.",
    body: "Mykos drafts 12+ video concepts — different hooks, different lengths, different aspect ratios — each tuned to the platform that'll run it.",
    accent: "from-fuchsia-400 to-pink-500",
  },
  {
    tag: "Step 03",
    title: "Test in parallel, learn fast.",
    body: "Variants ship simultaneously across Meta, TikTok, Google, LinkedIn. Mykos watches CPA, CTR, ROAS — kills losers, scales winners, automatically.",
    accent: "from-amber-400 to-rose-500",
  },
  {
    tag: "Step 04",
    title: "You only see what worked.",
    body: "The dashboard surfaces the 3 ads doing the heavy lifting and the next batch already in the oven. Approve. Repeat. Compound.",
    accent: "from-emerald-400 to-cyan-500",
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section id="how" ref={ref} className="relative px-6 py-32 sm:py-40">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl mb-24"
        >
          <div className="text-xs uppercase tracking-widest text-white/40 mb-4">
            How it works
          </div>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl leading-tight gradient-text">
            From a sentence
            <br />
            to <span className="italic gradient-accent">a campaign</span>.
          </h2>
        </motion.div>

        <div className="relative">
          {/* timeline rail */}
          <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-white/10" />
          <motion.div
            style={{ height: lineHeight }}
            className="absolute left-4 sm:left-1/2 top-0 w-px -translate-x-1/2 bg-gradient-to-b from-indigo-400 via-fuchsia-500 to-emerald-400 origin-top"
          />

          <div className="space-y-24">
            {steps.map((s, i) => (
              <motion.div
                key={s.tag}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className={`relative grid sm:grid-cols-2 gap-8 items-center ${
                  i % 2 === 1 ? "sm:[&>*:first-child]:order-2" : ""
                }`}
              >
                {/* node */}
                <div className="absolute left-4 sm:left-1/2 top-6 sm:top-1/2 -translate-x-1/2 sm:-translate-y-1/2">
                  <div className={`h-3 w-3 rounded-full bg-gradient-to-br ${s.accent} shadow-lg`} />
                </div>

                {/* text */}
                <div className={`pl-12 sm:pl-0 ${i % 2 === 0 ? "sm:pr-16 sm:text-right" : "sm:pl-16"}`}>
                  <div className="text-xs uppercase tracking-widest text-white/40 mb-3">
                    {s.tag}
                  </div>
                  <h3 className="font-display text-3xl sm:text-4xl mb-3 gradient-text leading-tight">
                    {s.title}
                  </h3>
                  <p className="text-white/55 leading-relaxed">{s.body}</p>
                </div>

                {/* visual placeholder */}
                <div className={`pl-12 sm:pl-0 ${i % 2 === 0 ? "sm:pl-16" : "sm:pr-16"}`}>
                  <div
                    className={`relative aspect-[4/3] rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] overflow-hidden`}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${s.accent} opacity-10`}
                    />
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="font-display italic text-7xl text-white/20">
                        {s.tag.replace("Step ", "")}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
