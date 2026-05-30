"use client";

import Link from "next/link";
import { useId } from "react";
import { motion } from "framer-motion";

const spring = { type: "spring", stiffness: 340, damping: 26 } as const;

/**
 * LogoMark — the Campus Marche shopping-bag icon.
 *
 * Structure (viewBox 0 0 80 80):
 *   - Deep navy bag body with arch handles
 *   - White campus building silhouette (clock tower + side wings)
 *   - Lime-green swoosh hill at base
 *   - Lime-green price tag hanging from right handle
 */
export function LogoMark({ size = 40 }: { size?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "_");

  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}bag`} x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#223A6A" />
          <stop offset="100%" stopColor="#142248" />
        </linearGradient>
        <linearGradient id={`${uid}shine`} x1="0" y1="0" x2="0" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <linearGradient id={`${uid}tag`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8FE03A" />
          <stop offset="100%" stopColor="#5EB81B" />
        </linearGradient>
      </defs>

      {/* Bag body */}
      <rect x="6" y="26" width="56" height="46" rx="6" fill={`url(#${uid}bag)`} />
      <rect x="6" y="26" width="56" height="46" rx="6" fill={`url(#${uid}shine)`} />
      <rect x="6" y="26" width="56" height="46" rx="6" stroke="#0D1A3A" strokeWidth="1" />

      {/* Handles */}
      <path d="M 19,26 C 19,14 31,10 34,10 C 37,10 34,14 34,26" stroke="#0D1A3A" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M 34,26 C 34,14 46,10 49,10 C 52,10 49,14 49,26" stroke="#0D1A3A" strokeWidth="4" strokeLinecap="round" fill="none" />

      {/* Lime-green swoosh hill */}
      <ellipse cx="34" cy="72" rx="28" ry="7" fill="#72CC23" opacity="0.90" />
      <ellipse cx="34" cy="72" rx="22" ry="4" fill="#5EB81B" opacity="0.60" />

      {/* Left wing */}
      <rect x="11" y="45" width="10" height="18" rx="1" fill="white" opacity="0.88" />
      <rect x="13" y="47" width="3" height="3" rx="0.5" fill="#1B3462" opacity="0.5" />
      <rect x="17" y="47" width="2" height="3" rx="0.5" fill="#1B3462" opacity="0.5" />
      <rect x="13" y="52" width="3" height="3" rx="0.5" fill="#1B3462" opacity="0.5" />
      <rect x="17" y="52" width="2" height="3" rx="0.5" fill="#1B3462" opacity="0.5" />

      {/* Right wing */}
      <rect x="47" y="48" width="10" height="15" rx="1" fill="white" opacity="0.85" />
      <rect x="49" y="50" width="2.5" height="2.5" rx="0.5" fill="#1B3462" opacity="0.5" />
      <rect x="53" y="50" width="2.5" height="2.5" rx="0.5" fill="#1B3462" opacity="0.5" />
      <rect x="49" y="55" width="2.5" height="2.5" rx="0.5" fill="#1B3462" opacity="0.5" />
      <rect x="53" y="55" width="2.5" height="2.5" rx="0.5" fill="#1B3462" opacity="0.5" />

      {/* Central connector */}
      <rect x="21" y="51" width="26" height="12" rx="0" fill="white" opacity="0.80" />

      {/* Clock tower */}
      <rect x="28" y="38" width="12" height="25" rx="1" fill="white" opacity="0.95" />
      <path d="M 26,38 L 34,29 L 42,38 Z" fill="white" opacity="0.95" />
      <line x1="34" y1="29" x2="34" y2="24" stroke="white" strokeWidth="1" opacity="0.8" />
      <path d="M 34,24 L 40,26 L 34,28 Z" fill="#72CC23" />
      <circle cx="34" cy="45" r="3.5" fill="#1B3462" opacity="0.7" />
      <circle cx="34" cy="45" r="2.5" fill="white" opacity="0.6" />
      <line x1="34" y1="45" x2="34" y2="43" stroke="#1B3462" strokeWidth="0.7" strokeLinecap="round" />
      <line x1="34" y1="45" x2="36" y2="45" stroke="#1B3462" strokeWidth="0.7" strokeLinecap="round" />
      <rect x="31" y="57" width="6" height="6" rx="1.5" fill="#1B3462" opacity="0.5" />
      <rect x="30" y="50" width="3" height="3" rx="0.5" fill="#1B3462" opacity="0.4" />
      <rect x="35" y="50" width="3" height="3" rx="0.5" fill="#1B3462" opacity="0.4" />

      {/* Price tag hanging from right handle */}
      <g transform="translate(53, 14) rotate(12)">
        <line x1="3" y1="-4" x2="3" y2="2" stroke="#5EB81B" strokeWidth="1" strokeLinecap="round" />
        <rect x="0" y="2" width="18" height="13" rx="2" fill={`url(#${uid}tag)`} />
        <circle cx="3" cy="5.5" r="1.3" fill="white" opacity="0.7" />
        <line x1="7" y1="5.5" x2="16" y2="5.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        <line x1="7" y1="8.5" x2="14" y2="8.5" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        <line x1="7" y1="11" x2="15" y2="11" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      </g>
    </svg>
  );
}

interface LogoProps {
  showText?: boolean;
  showTagline?: boolean;
  size?: number;
  animate?: boolean;
}

export function Logo({ showText = true, showTagline = false, size = 36, animate = true }: LogoProps) {
  const mark = <LogoMark size={size} />;

  return (
    <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="Campus Marche">
      {animate ? (
        <motion.div
          whileHover={{ scale: 1.07, rotate: -4 }}
          whileTap={{ scale: 0.93 }}
          transition={spring}
          className="shrink-0"
        >
          {mark}
        </motion.div>
      ) : (
        <div className="shrink-0">{mark}</div>
      )}

      {showText && (
        <div className="hidden sm:block leading-tight">
          <div className="font-extrabold tracking-tight" style={{ fontSize: "1.0rem", color: "var(--on-surface)" }}>
            Campus<span style={{ color: "#72CC23" }}>Marche</span>
          </div>
          {showTagline && (
            <div className="mt-0.5 text-[9px] font-bold tracking-widest uppercase" style={{ color: "#72CC23", opacity: 0.75 }}>
              Buy. Sell. Connect.
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
