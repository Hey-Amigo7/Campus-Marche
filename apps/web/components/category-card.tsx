"use client";

import Link from "next/link";
import { Tag } from "lucide-react";
import { motion } from "framer-motion";
import type { Category } from "@/types";

const ACCENT_COLORS = [
  { icon: "var(--green)",    bg: "var(--green-surface)",  border: "rgba(22,163,74,0.18)"  },
  { icon: "var(--caramel)",  bg: "rgba(217,119,6,0.06)",  border: "rgba(217,119,6,0.16)"  },
  { icon: "var(--green)",    bg: "var(--green-tint)",     border: "rgba(22,163,74,0.15)"  },
  { icon: "var(--caramel)",  bg: "rgba(217,119,6,0.08)",  border: "rgba(217,119,6,0.14)"  },
];

const snap = { type: "spring", stiffness: 360, damping: 24 } as const;

export function CategoryCard({ category, index = 0 }: { category: Category; index?: number }) {
  const Icon   = category.icon ?? Tag;
  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length]!;

  return (
    <motion.div whileHover={{ y: -4 }} whileTap={{ y: 0, scale: 0.99 }} transition={snap}>
      <Link
        href={`/search?q=${encodeURIComponent(category.name)}`}
        className="group block rounded-xl p-5 transition-shadow hover:shadow-md"
        style={{
          background:  "var(--surface)",
          border:      `1px solid ${accent.border}`,
          boxShadow:   "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <motion.span
            whileHover={{ scale: 1.14, rotate: -5 }}
            transition={{ type: "spring", stiffness: 420, damping: 18 }}
            className="grid h-11 w-11 place-items-center rounded-xl"
            style={{ background: accent.bg, color: accent.icon }}
          >
            <Icon className="h-5 w-5" />
          </motion.span>

          <svg
            className="mt-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            style={{ color: "var(--subtle)" }}
            fill="none" stroke="currentColor" strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <h3 className="mt-4 text-base font-bold" style={{ color: "var(--on-surface)" }}>
          {category.name}
        </h3>

        {category.description && (
          <p className="mt-1 text-sm leading-5" style={{ color: "var(--muted)" }}>
            {category.description}
          </p>
        )}

        <p className="mt-3 text-xs font-semibold" style={{ color: accent.icon }}>
          {category.count} active listing{category.count !== 1 ? "s" : ""}
        </p>
      </Link>
    </motion.div>
  );
}
