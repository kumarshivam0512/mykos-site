"use client";

import { motion } from "framer-motion";
import type { CSSProperties, JSX } from "react";

interface Props {
  text: string;
  className?: string;
  italicWords?: string[];
  accentWords?: string[];
  as?: "h1" | "h2" | "h3" | "p";
  style?: CSSProperties;
  delay?: number;
}

/**
 * Splits text into words and reveals each with a staggered rise + fade.
 * Re-triggers each time the heading enters the viewport.
 */
export function WordReveal({
  text,
  className = "",
  italicWords = [],
  accentWords = [],
  as = "h2",
  style,
  delay = 0,
}: Props) {
  const Tag = as as keyof JSX.IntrinsicElements;
  const words = text.split(" ");

  return (
    <Tag className={className} style={style}>
      {words.map((word, i) => {
        const clean = word.replace(/[.,!?]/g, "");
        const italic = italicWords.includes(clean);
        const accent = accentWords.includes(clean);
        return (
          <span
            key={i}
            className="inline-block overflow-hidden align-bottom"
            style={{ marginRight: "0.25em" }}
          >
            <motion.span
              className={`inline-block ${italic ? "italic font-display" : ""} ${
                accent ? "gradient-accent" : ""
              }`}
              initial={{ y: "110%", opacity: 0 }}
              whileInView={{ y: "0%", opacity: 1 }}
              viewport={{ once: false, margin: "-80px" }}
              transition={{
                duration: 0.7,
                ease: [0.25, 1, 0.5, 1],
                delay: delay + i * 0.06,
              }}
            >
              {word}
            </motion.span>
          </span>
        );
      })}
    </Tag>
  );
}
