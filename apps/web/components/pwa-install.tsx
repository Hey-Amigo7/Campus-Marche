"use client";

// The install prompt is now surfaced via the Install App button in the
// sidebar (navbar.tsx) using the usePwaInstall hook. This component is
// kept as a named export so existing layout.tsx imports remain valid,
// but it renders nothing — the automatic floating banner is intentionally
// removed in favour of the user-triggered sidebar button.
export function PwaInstall() {
  return null;
}
