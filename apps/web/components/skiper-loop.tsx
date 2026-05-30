"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * LoopText — cycles through an array of strings with a y-axis slide animation.
 * Inspired by Skiper UI skiper62 (loop animation hook).
 *
 * The exiting text slides up (-100%), entering text slides in from below (+100%).
 * Wraps in an inline container so it sits naturally inside a heading.
 */
export function LoopText({
  items,
  interval = 2200,
  className,
}: {
  items: string[];
  interval?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), interval);
    return () => clearInterval(t);
  }, [items.length, interval]);

  return (
    <span
      className={`relative inline-flex overflow-hidden align-middle leading-none ${className ?? ""}`}
      style={{ verticalAlign: "baseline" }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={index}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
        >
          {items[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
