"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * CarouselNavigator — Pill-shaped carousel control with animated dot indicators.
 * Adapted from Watermelon UI carousel-navigator (registry.watermelon.sh).
 *
 * The active dot expands and shows a progress-fill sweep at the configured auto interval.
 * Dots spring-animate their width via layoutId shared transitions.
 */

interface ThemeConfig {
  bg: string;
  button: string;
  dot: string;
  progress: string;
}

const DEFAULT_THEME: ThemeConfig = {
  bg:       "bg-zinc-900",
  button:   "bg-zinc-800 text-white hover:bg-zinc-700",
  dot:      "bg-zinc-600",
  progress: "bg-white",
};

interface CarouselNavigatorProps {
  count: number;
  current: number;
  onChange: (index: number) => void;
  autoDelay?: number;
  theme?: ThemeConfig;
  className?: string;
}

export function CarouselNavigator({
  count,
  current,
  onChange,
  autoDelay,
  theme = DEFAULT_THEME,
  className,
}: CarouselNavigatorProps) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const currentRef = useRef(current);
  currentRef.current = current;

  useEffect(() => {
    if (!autoDelay) return;
    setProgress(0);
    startRef.current = null;

    function tick(now: number) {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const pct = Math.min(elapsed / autoDelay!, 1);
      setProgress(pct);
      if (pct < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onChange((currentRef.current + 1) % count);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [current, count, autoDelay, onChange]);

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 ${theme.bg} ${className ?? ""}`}
    >
      {/* Prev */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        onClick={() => onChange((current - 1 + count) % count)}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${theme.button}`}
        aria-label="Previous"
      >
        <ChevronLeft className="h-4 w-4" />
      </motion.button>

      {/* Dot indicators */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: count }).map((_, i) => (
          <motion.button
            key={i}
            layout
            layoutId={`dot-${i}`}
            onClick={() => onChange(i)}
            animate={{ width: i === current ? 40 : 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`relative h-2.5 shrink-0 overflow-hidden rounded-full ${theme.dot}`}
            aria-label={`Go to slide ${i + 1}`}
          >
            {i === current && autoDelay && (
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-full ${theme.progress}`}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.05, ease: "linear" }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Next */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        onClick={() => onChange((current + 1) % count)}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${theme.button}`}
        aria-label="Next"
      >
        <ChevronRight className="h-4 w-4" />
      </motion.button>
    </div>
  );
}

/**
 * useCarousel — Simple controlled carousel state hook.
 */
export function useCarousel(count: number) {
  const [current, setCurrent] = useState(0);
  const go = (i: number) => setCurrent(((i % count) + count) % count);
  return { current, go };
}
