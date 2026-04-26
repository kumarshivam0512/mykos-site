"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { WordReveal } from "./WordReveal";

interface Slide {
  title: string;
  body: string;
  accent: string; // tailwind from-x to-y classes
}

const slides: Slide[] = [
  {
    title: "Brief in plain English.",
    body: "“Promote our new yoga mat to women 25–45 who like wellness brands.” That's the brief. Mykos extracts audience, channel, tone, and offer.",
    accent: "from-violet-500/55 via-indigo-500/40 to-blue-500/25",
  },
  {
    title: "Generate a creative wave.",
    body: "12+ video concepts. Different hooks, different lengths, different aspect ratios. Each tuned to the platform that'll run it.",
    accent: "from-fuchsia-500/60 via-pink-500/40 to-rose-500/25",
  },
  {
    title: "Test in parallel. Learn fast.",
    body: "Variants ship simultaneously across Meta, TikTok, Google, LinkedIn. Mykos watches CPA, CTR, ROAS — kills losers, scales winners, automatically.",
    accent: "from-orange-400/55 via-amber-400/40 to-rose-500/30",
  },
  {
    title: "You only see what worked.",
    body: "The dashboard surfaces the 3 ads doing the heavy lifting and the next batch already in the oven. Approve. Repeat. Compound.",
    accent: "from-emerald-400/55 via-teal-400/40 to-cyan-500/30",
  },
];

export function StickyShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section id="how" ref={ref} className="relative px-6 py-32 sm:py-40">
      <div className="max-w-6xl mx-auto">
        <div className="mb-24 max-w-3xl">
          <div className="text-xs uppercase tracking-[0.25em] text-white/40 mb-5">
            How it works
          </div>
          <WordReveal
            as="h2"
            text="From a sentence to a campaign."
            italicWords={["sentence", "campaign"]}
            accentWords={["campaign"]}
            className="font-display text-5xl sm:text-6xl md:text-7xl leading-[0.95] tracking-tight gradient-text"
          />
        </div>

        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20 relative">
          {/* progress rail */}
          <div className="absolute left-[-22px] sm:left-[-30px] top-0 bottom-0 hidden lg:block w-px bg-white/10">
            <motion.div
              style={{ height: lineHeight }}
              className="absolute top-0 left-0 w-px bg-gradient-to-b from-indigo-400 via-fuchsia-500 to-emerald-400 origin-top"
            />
          </div>

          {/* sticky text column */}
          <div className="lg:sticky lg:top-32 self-start">
            <div className="text-xs font-mono text-white/30 mb-4 uppercase tracking-wider">
              The four moves
            </div>
            <h3 className="font-display text-3xl sm:text-4xl gradient-text mb-5 leading-tight">
              We replaced the 6-week<br />
              <span className="italic gradient-accent">creative pipeline.</span>
            </h3>
            <p className="text-white/55 leading-relaxed max-w-md">
              Briefing, drafting, asset cutting, A/B planning, post-launch
              optimisation — Mykos collapses all of it into one continuous loop.
            </p>
          </div>

          {/* scrolling cards column */}
          <div className="space-y-6">
            {slides.map((s, i) => (
              <motion.article
                key={s.title}
                initial={{ opacity: 0, y: 80 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, margin: "-100px" }}
                transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
                className="relative group"
              >
                <div
                  className={`relative aspect-[4/3] rounded-3xl border border-white/15 bg-gradient-to-br ${s.accent} overflow-hidden backdrop-blur-sm shadow-2xl shadow-black/40`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent" />
                  <div className="absolute top-6 left-6 text-xs font-mono text-white/40 uppercase tracking-widest">
                    Step 0{i + 1}
                  </div>
                  <div className="absolute bottom-7 left-7 right-7">
                    <h4 className="font-display text-3xl sm:text-4xl gradient-text leading-tight mb-3">
                      {s.title}
                    </h4>
                    <p className="text-white/65 text-sm sm:text-base leading-relaxed max-w-md">
                      {s.body}
                    </p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
