import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import type { Category } from "@/types";

const CARD_PALETTES = [
  { bg: "bg-indigo-50", icon: "text-brand-navy", border: "hover:border-indigo-200", shadow: "hover:shadow-indigo-200/50" },
  { bg: "bg-amber-50", icon: "text-amber-600", border: "hover:border-amber-200", shadow: "hover:shadow-amber-200/50" },
  { bg: "bg-emerald-50", icon: "text-emerald-600", border: "hover:border-emerald-200", shadow: "hover:shadow-emerald-200/50" },
  { bg: "bg-purple-50", icon: "text-purple-600", border: "hover:border-purple-200", shadow: "hover:shadow-purple-200/50" },
];

export function CategoryCard({ category, index = 0 }: { category: Category; index?: number }) {
  const Icon = category.icon ?? Tag;
  const palette = CARD_PALETTES[index % CARD_PALETTES.length]!;

  return (
    <Link
      href={`/search?q=${encodeURIComponent(category.name)}`}
      className={`group rounded-2xl border border-indigo-100/60 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1.5 hover:shadow-xl ${palette.border} ${palette.shadow}`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className={`grid h-12 w-12 place-items-center rounded-2xl ${palette.bg} ${palette.icon}`}>
          <Icon className="h-6 w-6" />
        </span>
        <ArrowRight className={`h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1 ${palette.icon.replace("text-", "group-hover:text-")}`} />
      </div>
      <h3 className="mt-4 text-lg font-black text-slate-900">{category.name}</h3>
      {category.description ? (
        <p className="mt-1.5 text-sm leading-6 text-slate-500">{category.description}</p>
      ) : null}
      <p className="mt-3 text-sm font-bold text-brand-navy">{category.count} active listings</p>
    </Link>
  );
}
