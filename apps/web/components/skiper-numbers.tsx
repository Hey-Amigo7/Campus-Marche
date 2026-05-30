"use client";

import NumberFlow from "@number-flow/react";
import { animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * AnimatedStat — A single animated number counter that fires when the element
 * enters the viewport. Inspired by Skiper UI skiper37 (Animated number).
 *
 * Uses @number-flow/react for smooth digit transitions.
 */
export function AnimatedStat({
  value,
  prefix = "",
  suffix = "",
  label,
  duration = 1.8,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const triggered = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !triggered.current) {
          triggered.current = true;
          const controls = animate(0, value, {
            duration,
            ease: [0.22, 1, 0.36, 1],
            onUpdate: (v) => setCount(Math.round(v)),
          });
          return () => controls.stop();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-2 text-center">
      <div
        className="tabular-nums text-5xl font-black tracking-[-0.04em] md:text-6xl lg:text-7xl"
        style={{ color: "var(--on-surface)" }}
      >
        <span>{prefix}</span>
        <NumberFlow
          value={count}
          format={{ notation: "compact", compactDisplay: "short" }}
          trend={1}
          willChange
        />
        <span>{suffix}</span>
      </div>
      <p className="text-sm font-medium" style={{ color: "var(--on-surface-muted)" }}>
        {label}
      </p>
    </div>
  );
}

/**
 * StatsRow — Three animated stats side by side with a thin dividing line.
 */
export function StatsRow({
  stats,
}: {
  stats: { value: number; prefix?: string; suffix?: string; label: string }[];
}) {
  return (
    <div
      className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-0"
      style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="py-12"
          style={{
            borderRight:
              i < stats.length - 1 ? "1px solid var(--border)" : "none",
          }}
        >
          <AnimatedStat {...s} />
        </div>
      ))}
    </div>
  );
}
