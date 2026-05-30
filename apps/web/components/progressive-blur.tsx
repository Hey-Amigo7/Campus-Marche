import type { CSSProperties } from "react";

type ProgressiveBlurProps = {
  className?: string;
  /** CSS color of the page/container background at the fade edge */
  color?: string;
  position?: "top" | "bottom" | "left" | "right";
  size?: string;
  blurAmount?: string;
};

/**
 * Progressive blur overlay (skiper41 pattern).
 * Creates a smooth glass-blur fade at any edge of a scroll container.
 * Place inside a `relative overflow-hidden` parent.
 */
export function ProgressiveBlur({
  className = "",
  color = "var(--background)",
  position = "bottom",
  size = "120px",
  blurAmount = "6px",
}: ProgressiveBlurProps) {
  const isVertical = position === "top" || position === "bottom";

  const placement: CSSProperties = isVertical
    ? { [position]: 0, left: 0, right: 0, height: size }
    : { [position]: 0, top: 0, bottom: 0, width: size };

  const gradientDir: Record<typeof position, string> = {
    top:    "to bottom",
    bottom: "to top",
    left:   "to right",
    right:  "to left",
  };

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute select-none z-10 ${className}`}
      style={{
        ...placement,
        background: `linear-gradient(${gradientDir[position]}, ${color}, transparent)`,
        maskImage: `linear-gradient(${gradientDir[position]}, black 40%, transparent)`,
        WebkitMaskImage: `linear-gradient(${gradientDir[position]}, black 40%, transparent)`,
        backdropFilter: `blur(${blurAmount})`,
        WebkitBackdropFilter: `blur(${blurAmount})`,
      }}
    />
  );
}
