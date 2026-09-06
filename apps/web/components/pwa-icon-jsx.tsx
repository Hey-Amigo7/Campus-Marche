/** Shared icon JSX used by app/icon.tsx, app/apple-icon.tsx, and the maskable route handler */
export function CampusIconJsx({ size, pad = 0 }: { size: number; pad?: number }) {
  const inner = size - pad * 2;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #223A6A 0%, #0E1E42 100%)",
      }}
    >
      <div
        style={{
          width: inner,
          height: inner,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
        }}
      >
        <div
          style={{
            fontSize: Math.round(inner * 0.44),
            fontWeight: 700,
            color: "#FFFFFF",
            lineHeight: 1,
            letterSpacing: -inner * 0.02,
            fontFamily: "sans-serif",
          }}
        >
          CM
        </div>

        <div
          style={{
            width: Math.round(inner * 0.38),
            height: Math.max(3, Math.round(inner * 0.022)),
            background: "#72CC23",
            borderRadius: 99,
            marginTop: Math.round(inner * 0.06),
          }}
        />

        <div
          style={{
            fontSize: Math.round(inner * 0.068),
            fontWeight: 600,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: inner * 0.018,
            marginTop: Math.round(inner * 0.04),
            fontFamily: "sans-serif",
          }}
        >
          CAMPUS MARCHE
        </div>
      </div>
    </div>
  );
}
