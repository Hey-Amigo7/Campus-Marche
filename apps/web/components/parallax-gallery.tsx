"use client";

import { motion, MotionValue, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const COLUMNS: string[][] = [
  [
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=600&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1603201667141-5a2d4c673b26?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=600&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&w=600&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80",
  ],
];

// Each column starts this far above the container, then slides down at the matching rate.
// This creates the staggered parallax depth effect.
const COLUMN_MARGINS = ["-30vh", "-55vh", "-20vh", "-45vh"];

function GalleryColumn({
  images,
  y,
  marginTop,
}: {
  images: string[];
  y: MotionValue<number>;
  marginTop: string;
}) {
  return (
    <motion.div
      className="relative flex w-1/4 min-w-[160px] flex-col gap-[2vw]"
      style={{ y, marginTop }}
    >
      {images.map((src, i) => (
        <div key={i} className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: "3/4" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Campus life"
            className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            loading="lazy"
          />
          <div
            className="absolute inset-0 rounded-2xl"
            style={{ background: "linear-gradient(to top, rgba(15,23,42,0.40) 0%, transparent 60%)" }}
          />
        </div>
      ))}
    </motion.div>
  );
}

export function ParallaxGallery() {
  const galleryRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    function onResize() { setHeight(window.innerHeight); }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { scrollYProgress } = useScroll({
    target: galleryRef,
    offset: ["start end", "end start"],
  });

  // Each column moves downward by exactly its negative margin amount — revealing
  // hidden content from above while keeping something visible throughout scroll.
  const y1 = useTransform(scrollYProgress, [0, 1], [0, height * 0.30]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, height * 0.55]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, height * 0.20]);
  const y4 = useTransform(scrollYProgress, [0, 1], [0, height * 0.45]);

  return (
    <section className="overflow-hidden" style={{ borderTop: "1px solid var(--surface-border)" }}>
      {/* Label */}
      <div className="container-shell pt-10 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: "var(--sage)" }}>
            Campus life
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight" style={{ color: "var(--on-surface)" }}>
            Real students. Real deals.
          </h2>
        </div>
      </div>

      {/* Parallax grid */}
      <div
        ref={galleryRef}
        className="relative box-border flex gap-[2vw] overflow-hidden p-[2vw]"
        style={{ height: "160vh" }}
      >
        <GalleryColumn images={COLUMNS[0]!} y={y1} marginTop={COLUMN_MARGINS[0]!} />
        <GalleryColumn images={COLUMNS[1]!} y={y2} marginTop={COLUMN_MARGINS[1]!} />
        <GalleryColumn images={COLUMNS[2]!} y={y3} marginTop={COLUMN_MARGINS[2]!} />
        <GalleryColumn images={COLUMNS[3]!} y={y4} marginTop={COLUMN_MARGINS[3]!} />
      </div>
    </section>
  );
}
