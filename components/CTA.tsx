"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export function CTA() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "ok" | "err">(
    "idle"
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setState("submitting");
    try {
      // Replace REPLACE_WITH_FORM_ID after creating a free Formspree form.
      const res = await fetch("https://formspree.io/f/REPLACE_WITH_FORM_ID", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ email, _subject: "Mykos early access request" }),
      });
      setState(res.ok ? "ok" : "err");
    } catch {
      setState("err");
    }
  }

  return (
    <section id="cta" className="relative px-6 py-32 sm:py-40">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="relative max-w-3xl mx-auto rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur p-10 sm:p-16 text-center overflow-hidden"
      >
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[120%] rounded-full bg-gradient-to-br from-indigo-500/20 via-fuchsia-500/15 to-transparent blur-3xl" />

        <div className="relative">
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl leading-tight gradient-text mb-6">
            Be in the first <span className="italic gradient-accent">100</span>.
          </h2>
          <p className="text-white/55 max-w-xl mx-auto mb-10 leading-relaxed">
            We're letting in a small batch of brands and agencies each week.
            Drop your email — we'll reach out when there's a seat.
          </p>

          {state === "ok" ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
            >
              <span>✓</span> You're on the list. We'll be in touch.
            </motion.div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex-1 px-4 py-3 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-indigo-400/60 focus:bg-white/[0.06] transition"
              />
              <button
                type="submit"
                disabled={state === "submitting"}
                className="px-5 py-3 rounded-lg bg-white text-black font-medium hover:bg-white/90 disabled:opacity-60 transition shadow-lg shadow-white/10"
              >
                {state === "submitting" ? "Sending…" : "Get access"}
              </button>
            </form>
          )}

          {state === "err" && (
            <p className="mt-3 text-sm text-rose-300">
              Hit a snag. Email us directly:{" "}
              <a className="underline" href="mailto:kumar@mykos.ai">
                kumar@mykos.ai
              </a>
            </p>
          )}

          <p className="mt-4 text-xs text-white/35">
            No spam. Unsubscribe in one click.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
