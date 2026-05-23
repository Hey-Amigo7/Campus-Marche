import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import type { Category } from "@/types";

const PALETTES = [
  { icon: "#5A9460", bg: "rgba(127,182,133,0.10)", border: "rgba(127,182,133,0.25)" },
  { icon: "#C68B59", bg: "rgba(198,139,89,0.10)", border: "rgba(198,139,89,0.25)" },
  { icon: "#0F172A", bg: "rgba(15,23,42,0.07)",   border: "rgba(15,23,42,0.15)"    },
  { icon: "#5A9460", bg: "rgba(223,243,227,0.60)", border: "rgba(127,182,133,0.20)" },
];

export function CategoryCard({ category, index = 0 }: { category: Category; index?: number }) {
  const Icon    = category.icon ?? Tag;
  const palette = PALETTES[index % PALETTES.length]!;

  return (
    <Link
      href={`/search?q=${encodeURIComponent(category.name)}`}
      className="group rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1.5"
      style={{
        background:    "rgba(255,255,255,0.80)",
        backdropFilter:"blur(18px) saturate(150%)",
        WebkitBackdropFilter:"blur(18px) saturate(150%)",
        border:        `1px solid ${palette.border}`,
        boxShadow:     "0 2px 12px rgba(15,23,42,0.06)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className="grid h-12 w-12 place-items-center rounded-2xl"
          style={{ background: palette.bg, color: palette.icon }}
        >
          <Icon className="h-6 w-6" />
        </span>
        <ArrowRight
          className="h-5 w-5 transition-transform group-hover:translate-x-1"
          style={{ color: "#CBD5E1" }}
        />
      </div>

      <h3 className="mt-4 text-lg font-black" style={{ color: "#1E293B" }}>
        {category.name}
      </h3>

      {category.description ? (
        <p className="mt-1.5 text-sm leading-6" style={{ color: "#64748B" }}>
          {category.description}
        </p>
      ) : null}

      <p className="mt-3 text-sm font-bold" style={{ color: palette.icon }}>
        {category.count} active listings
      </p>
    </Link>
  );
}
