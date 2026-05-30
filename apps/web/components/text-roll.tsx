"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";

const STAGGER = 0.03;

export function TextRoll({
  children,
  className,
  style,
  charClassName,
}: {
  children: string;
  className?: string;
  style?: CSSProperties;
  charClassName?: string;
}) {
  const chars = children.split("");
  const mid = (chars.length - 1) / 2;

  return (
    <motion.span
      initial="initial"
      whileHover="hovered"
      className={`relative inline-flex overflow-hidden ${className ?? ""}`}
      style={style}
    >
      {/* Accessible text — hidden visually but readable by screen readers */}
      <span className="sr-only">{children}</span>

      {/* Top layer — visible at rest, rolls up on hover */}
      <span className="flex" aria-hidden="true">
        {chars.map((char, i) => (
          <motion.span
            key={i}
            variants={{ initial: { y: 0 }, hovered: { y: "-100%" } }}
            transition={{
              ease: "easeInOut",
              duration: 0.28,
              delay: STAGGER * Math.abs(i - mid),
            }}
            className={`inline-block ${charClassName ?? ""}`}
          >
            {char === " " ? " " : char}
          </motion.span>
        ))}
      </span>

      {/* Bottom layer — starts below, rolls in on hover */}
      <span className="absolute inset-0 flex" aria-hidden="true">
        {chars.map((char, i) => (
          <motion.span
            key={i}
            variants={{ initial: { y: "100%" }, hovered: { y: 0 } }}
            transition={{
              ease: "easeInOut",
              duration: 0.28,
              delay: STAGGER * Math.abs(i - mid),
            }}
            className={`inline-block ${charClassName ?? ""}`}
          >
            {char === " " ? " " : char}
          </motion.span>
        ))}
      </span>
    </motion.span>
  );
}
