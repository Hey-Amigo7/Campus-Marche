"use client";

import {
  motion,
  useInView,
  useScroll,
  useTransform,
  AnimatePresence,
  type HTMLMotionProps,
  type Variants,
  type MotionValue,
} from "framer-motion";
import { useRef, type ReactNode, type CSSProperties } from "react";

// ─── Spring configs (Watermelon UI–style) ─────────────────────────────────────
const snap   = { type: "spring", stiffness: 420, damping: 26 } as const;
const soft   = { type: "spring", stiffness: 280, damping: 22 } as const;
const bouncy = { type: "spring", stiffness: 380, damping: 18 } as const;
const ease   = [0.22, 1, 0.36, 1] as const;

// ─── MotionButton — spring-physics button wrapper ─────────────────────────────
// Inspired by Watermelon UI's animated-button.tsx (whileTap + whileHover)
export function MotionButton({
  children,
  className,
  style,
  hoverScale = 1.03,
  tapScale   = 0.95,
  hoverY     = -2,
  asDiv      = false,
  onClick,
}: {
  children:   ReactNode;
  className?: string;
  style?:     CSSProperties;
  hoverScale?: number;
  tapScale?:  number;
  hoverY?:    number;
  asDiv?:     boolean;
  onClick?:   () => void;
}) {
  const Tag = asDiv ? motion.div : motion.div;
  return (
    <Tag
      whileHover={{ scale: hoverScale, y: hoverY }}
      whileTap={{   scale: tapScale,   y: 0       }}
      transition={snap}
      className={className}
      style={style}
      onClick={onClick}
    >
      {children}
    </Tag>
  );
}

// ─── FadeUp — fades + slides up on mount ─────────────────────────────────────
export function FadeUp({
  children,
  delay     = 0,
  duration  = 0.5,
  className,
  style,
}: {
  children:  ReactNode;
  delay?:    number;
  duration?: number;
  className?: string;
  style?:    CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0  }}
      transition={{ duration, delay, ease }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ─── ScrollFadeUp — triggers when element enters viewport ─────────────────────
export function ScrollFadeUp({
  children,
  delay     = 0,
  duration  = 0.55,
  className,
  style,
  amount    = 0.15,
}: {
  children:  ReactNode;
  delay?:    number;
  duration?: number;
  className?: string;
  style?:    CSSProperties;
  amount?:   number;
}) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration, delay, ease }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ─── StaggerList + StaggerItem — staggered children entrance ─────────────────
// Bento-grid style stagger from Watermelon UI bento components
const staggerVariants: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1,
    transition: { duration: 0.45, ease } },
};

export function StaggerList({
  children,
  className,
  style,
  staggerDelay = 0.08,
}: {
  children:     ReactNode;
  className?:   string;
  style?:       CSSProperties;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={{
        hidden: {},
        show:   { transition: { staggerChildren: staggerDelay, delayChildren: 0.05 } },
      }}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  style,
}: {
  children:  ReactNode;
  className?: string;
  style?:    CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={itemVariants}
    >
      {children}
    </motion.div>
  );
}

// ─── ScrollStaggerList — stagger triggered on scroll ─────────────────────────
export function ScrollStaggerList({
  children,
  className,
  style,
  staggerDelay = 0.07,
  amount       = 0.1,
}: {
  children:     ReactNode;
  className?:   string;
  style?:       CSSProperties;
  staggerDelay?: number;
  amount?:      number;
}) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount });

  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      variants={{
        hidden: {},
        show:   { transition: { staggerChildren: staggerDelay, delayChildren: 0.02 } },
      }}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
    >
      {children}
    </motion.div>
  );
}

// ─── HoverCard — Watermelon bento-style hover lift + depth ───────────────────
export function HoverCard({
  children,
  className,
  style,
  liftY     = -5,
  liftScale = 1.015,
}: {
  children:  ReactNode;
  className?: string;
  style?:    CSSProperties;
  liftY?:    number;
  liftScale?: number;
}) {
  return (
    <motion.div
      whileHover={{ y: liftY, scale: liftScale,
        transition: { type: "spring", stiffness: 300, damping: 20 } }}
      whileTap={{ y: 0, scale: 0.99, transition: snap }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ─── PremiumCard — stacked reveal on hover (Watermelon bento card 2 pattern) ─
// Front card blurs out, back cards reveal
export function PremiumCardReveal({
  front,
  back,
  className,
}: {
  front:     ReactNode;
  back:      ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="initial"
      whileHover="hover"
      className={`group relative ${className ?? ""}`}
    >
      <motion.div
        variants={{
          initial: { opacity: 1, filter: "blur(0px)", y: 0  },
          hover:   { opacity: 0, filter: "blur(8px)",  y: 6  },
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="absolute inset-0"
      >
        {front}
      </motion.div>
      <motion.div
        variants={{
          initial: { opacity: 0, filter: "blur(8px)", y: 10 },
          hover:   { opacity: 1, filter: "blur(0px)",  y: 0  },
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="absolute inset-0"
      >
        {back}
      </motion.div>
    </motion.div>
  );
}

// ─── AnimatedBadge — pulsing announcement badge ───────────────────────────────
// Adapted from Watermelon UI announcement component
export function AnimatedBadge({
  children,
  className,
  style,
}: {
  children:  ReactNode;
  className?: string;
  style?:    CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -8 }}
      animate={{ opacity: 1, scale: 1,   y: 0  }}
      transition={bouncy}
      whileHover={{ scale: 1.05, transition: snap }}
      className={`badge-glow ${className ?? ""}`}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ─── HeroTrustCard — trust card with staggered mount ─────────────────────────
export function HeroTrustCard({
  children,
  delay     = 0,
  className,
  style,
}: {
  children:  ReactNode;
  delay?:    number;
  className?: string;
  style?:    CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0  }}
      transition={{ duration: 0.55, delay, ease }}
      whileHover={{
        scale: 1.02,
        x:     4,
        transition: { type: "spring", stiffness: 300, damping: 22 },
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ─── CategoryPill — spring-animated category chip ────────────────────────────
export function CategoryPill({
  children,
  className,
  style,
  delay = 0,
}: {
  children:  ReactNode;
  className?: string;
  style?:    CSSProperties;
  delay?:    number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1    }}
      transition={{ ...bouncy, delay }}
      whileHover={{ scale: 1.06, y: -2, transition: snap }}
      whileTap={{   scale: 0.93,         transition: snap }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ─── SectionHeader — slides in from left on scroll ───────────────────────────
export function SectionHeader({
  children,
  className,
  style,
}: {
  children:  ReactNode;
  className?: string;
  style?:    CSSProperties;
}) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -16 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.45, ease }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ─── FloatingOrb — drifting ambient background glow ──────────────────────────
// Used in hero section for the "living" background feel
export function FloatingOrb({
  style,
  className,
  speed = 12,
  reverse = false,
}: {
  style?:    CSSProperties;
  className?: string;
  speed?:    number;
  reverse?:  boolean;
}) {
  return (
    <motion.div
      animate={{
        x:     [0,  16, -10,   6, 0],
        y:     [0, -10,  14, -6,  0],
        scale: [1, 1.04, 0.97, 1.02, 1],
      }}
      transition={{
        duration: speed,
        repeat:   Infinity,
        ease:     "easeInOut",
        ...(reverse ? { repeatType: "reverse" as const } : {}),
      }}
      className={`pointer-events-none absolute ${className ?? ""}`}
      style={style}
    />
  );
}

// ─── PageEnter — wraps a whole page for entrance animation ───────────────────
export function PageEnter({
  children,
  className,
}: {
  children:  ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── CountUp — animated number counter ───────────────────────────────────────
export function CountUp({
  from = 0,
  to,
  suffix = "",
  duration = 1.2,
  className,
}: {
  from?:     number;
  to:        number;
  suffix?:   string;
  duration?: number;
  className?: string;
}) {
  const ref    = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
    >
      <motion.span
        initial={{ innerText: from } as any}
        animate={inView ? { innerText: to } as any : {}}
        transition={{ duration, ease: "easeOut" }}
        onUpdate={(latest) => {
          if (ref.current) {
            const val = latest as { innerText?: number };
            if (val.innerText !== undefined) {
              ref.current.textContent = Math.round(val.innerText) + suffix;
            }
          }
        }}
      >
        {from}{suffix}
      </motion.span>
    </motion.span>
  );
}

// ─── ScrollRevealText — letters fan from center outward on scroll (skiper31) ──
// Each character animates from a scattered X + rotateX offset to its natural
// position as the element scrolls into the center of the viewport.

function ScrollRevealChar({
  char,
  index,
  center,
  spread,
  progress,
}: {
  char: string;
  index: number;
  center: number;
  spread: number;
  progress: MotionValue<number>;
}) {
  const dist = index - center;
  const x        = useTransform(progress, [0, 0.85], [dist * spread, 0]);
  const rotateX  = useTransform(progress, [0, 0.85], [dist * 32, 0]);
  const opacity  = useTransform(progress, [0, 0.25], [0, 1]);

  if (char === " ") return <span className="inline-block w-[0.28em]" />;

  return (
    <motion.span className="inline-block" style={{ x, rotateX, opacity }}>
      {char}
    </motion.span>
  );
}

export function ScrollRevealText({
  text,
  className,
  style,
  spread = 52,
}: {
  text: string;
  className?: string;
  style?: CSSProperties;
  spread?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center 62%"],
  });

  const chars  = text.split("");
  const center = Math.floor(chars.length / 2);

  return (
    <span
      ref={ref}
      className={`inline-block [perspective:500px] ${className ?? ""}`}
      style={style}
    >
      {chars.map((char, i) => (
        <ScrollRevealChar
          key={i}
          char={char}
          index={i}
          center={center}
          spread={spread}
          progress={scrollYProgress}
        />
      ))}
    </span>
  );
}

// ─── ScrollDrawLine — SVG path draws on scroll (skiper19) ─────────────────────
export function ScrollDrawLine({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const pathLength = useTransform(scrollYProgress, [0, 0.8], [0, 1]);
  const opacity    = useTransform(scrollYProgress, [0, 0.12], [0, 1]);

  return (
    <div ref={ref} className={`pointer-events-none${className ? ` ${className}` : ""}`}>
      <svg
        viewBox="0 0 1200 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full"
        aria-hidden
      >
        <motion.path
          d="M0,40 C200,10 400,70 600,40 C800,10 1000,70 1200,40"
          stroke="var(--green)"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ pathLength, opacity }}
        />
      </svg>
    </div>
  );
}
