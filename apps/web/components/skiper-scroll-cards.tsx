"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";

export interface ScrollCard {
  title: string;
  tagline: string;
  href: string;
  image: string;
  cta?: string;
}

/**
 * SkiperScrollCards — Sticky-scroll deck of cards.
 * Each card sticks at progressively lower vertical offsets and scales + rotates
 * away as the user scrolls past it, revealing the card beneath.
 * Inspired by Skiper UI skiper34 (Scroll images reveal 003).
 *
 * Requires Lenis smooth scroll (already present via LenisProvider).
 */
export function SkiperScrollCards({ cards }: { cards: ScrollCard[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: `${cards.length * 100}vh` }}
    >
      {cards.map((card, i) => (
        <StickyCard
          key={card.title}
          card={card}
          index={i}
          total={cards.length}
          scrollYProgress={scrollYProgress}
        />
      ))}
    </div>
  );
}

function StickyCard({
  card,
  index,
  total,
  scrollYProgress,
}: {
  card: ScrollCard;
  index: number;
  total: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const vertMargin = 4 + index * 3;

  const start = index / total;
  const end   = (index + 1) / total;

  const scale = useTransform(scrollYProgress, [start, end], [1, 0.88]);
  const rotate = useTransform(scrollYProgress, [start, end], [0, -4]);
  const opacity = useTransform(scrollYProgress, [start, end], [1, 0]);

  return (
    <motion.div
      style={{
        position: "sticky",
        top:    `${vertMargin}vh`,
        scale,
        rotate,
        opacity,
        transformOrigin: "top center",
      }}
      className="mx-auto max-w-4xl overflow-hidden rounded-2xl"
    >
      <Link href={card.href} className="group block relative overflow-hidden rounded-2xl" style={{ height: "80vh" }}>
        {/* Background image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.image}
          alt={card.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(9,9,11,0.78) 0%, rgba(9,9,11,0.30) 50%, rgba(9,9,11,0.06) 100%)",
          }}
        />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.20em] text-white/60">
            {card.tagline}
          </p>
          <h3 className="mb-5 text-3xl font-black text-white md:text-5xl">{card.title}</h3>
          <span
            className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition-all group-hover:bg-white/20"
          >
            {card.cta ?? "Browse collection"}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
