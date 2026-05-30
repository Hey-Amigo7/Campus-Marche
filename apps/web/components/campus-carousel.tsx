"use client";

import { motion } from "framer-motion";
import { Autoplay, EffectCreative, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

const CAMPUS_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=85",
    alt: "Students on campus",
  },
  {
    src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=85",
    alt: "Students collaborating",
  },
  {
    src: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=85",
    alt: "Campus marketplace",
  },
  {
    src: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85",
    alt: "Students at market",
  },
  {
    src: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=1200&q=85",
    alt: "University campus",
  },
  {
    src: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=85",
    alt: "Students studying",
  },
];

const swiperCss = `
  /* ── Swiper base ── */
  .swiper{margin-left:auto;margin-right:auto;position:relative;overflow:hidden;list-style:none;padding:0;z-index:1;display:block}
  .swiper-wrapper{position:relative;width:100%;height:100%;z-index:1;display:flex;transition-property:transform;box-sizing:content-box}
  .swiper-slide{flex-shrink:0;width:100%;height:100%;position:relative;transition-property:transform;display:block}
  .swiper-horizontal{touch-action:pan-y}
  /* ── Creative effect ── */
  .swiper-creative .swiper-slide{backface-visibility:hidden;overflow:hidden;transition-property:transform,opacity,height}
  /* ── Pagination ── */
  .swiper-pagination{position:absolute;text-align:center;transition:300ms opacity;transform:translate3d(0,0,0);z-index:10}
  .swiper-horizontal>.swiper-pagination-bullets,.swiper-pagination-bullets.swiper-pagination-horizontal{bottom:8px;left:0;width:100%}
  .swiper-pagination-bullet{width:8px;height:8px;display:inline-block;border-radius:50%;background:#000;opacity:.2}
  .swiper-pagination-bullet{margin:0 4px}
  .swiper-pagination-bullet-active{opacity:1;background:var(--swiper-theme-color,#007aff)}
  /* ── Campus overrides ── */
  :root { --swiper-theme-color: #7FB685; }
  .campus-swiper{width:100%;height:480px;padding-bottom:52px !important}
  .campus-swiper .swiper-slide{border-radius:20px;overflow:hidden}
  .campus-swiper .swiper-pagination-bullet{background:#7FB685;opacity:.45}
  .campus-swiper .swiper-pagination-bullet-active{opacity:1;width:20px;border-radius:4px;transition:width .3s ease}
`;

export function CampusCarousel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full"
    >
      <style>{swiperCss}</style>
      <Swiper
        effect="creative"
        grabCursor
        centeredSlides
        loop
        slidesPerView="auto"
        autoplay={{ delay: 3000, disableOnInteraction: true }}
        pagination={{ clickable: true }}
        creativeEffect={{
          prev: { shadow: true, translate: [0, 0, -380] },
          next: { translate: ["100%", 0, 0] },
        }}
        modules={[EffectCreative, Pagination, Autoplay]}
        className="campus-swiper"
      >
        {CAMPUS_IMAGES.map((img, i) => (
          <SwiperSlide key={i}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.src}
              alt={img.alt}
              className="h-full w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to top, rgba(15,23,42,0.55) 0%, transparent 55%)" }}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </motion.div>
  );
}
