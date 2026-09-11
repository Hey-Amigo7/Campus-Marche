import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How to Install Campus Marche",
  description: "Install Campus Marche on your phone or computer for a faster, app-like experience.",
};

const steps = {
  android: [
    "Open Campus Marche in Chrome on your Android device.",
    "If Chrome detects the app can be installed, it will show an Install prompt — tap Install.",
    "If the prompt doesn't appear automatically, tap the three-dot menu (⋮) in the top-right corner of Chrome.",
    "Look for Add to Home screen or Install app and select it.",
    "Confirm by tapping Install or Add.",
    "Campus Marche will appear as an app icon on your home screen.",
  ],
  desktop: [
    "Open Campus Marche in Chrome or Microsoft Edge on your computer.",
    "Look for an install icon (⊕) in the browser address bar — click it.",
    "Alternatively, open the browser menu and look for Install Campus Marche or Add to Desktop.",
    "Click Install to confirm.",
    "Campus Marche will open as a standalone app and may appear in your taskbar or Start menu.",
  ],
  ios: [
    "Open Campus Marche in Safari on your iPhone or iPad.",
    "Tap the Share button (the square with an arrow pointing up) at the bottom of the screen.",
    "Scroll down the share sheet and tap Add to Home Screen.",
    "Edit the name if you like, then tap Add in the top-right corner.",
    "Campus Marche will appear as an app icon on your home screen.",
  ],
};

function StepList({ items }: { items: string[] }) {
  return (
    <ol className="mt-4 space-y-3">
      {items.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white"
            style={{ background: "#72CC23", minWidth: "1.25rem" }}
          >
            {i + 1}
          </span>
          <span className="text-sm leading-relaxed" style={{ color: "var(--on-surface)" }}>
            {step}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-base font-bold" style={{ color: "var(--on-surface)" }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function HowToInstallPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Hero */}
      <div className="py-14" style={{ background: "#0F172A" }}>
        <div className="container-shell text-center">
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black text-white"
            style={{ background: "linear-gradient(145deg, #223A6A 0%, #0E1E42 100%)", border: "1px solid rgba(114,204,35,0.3)" }}
          >
            CM
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            How to Install Campus Marche
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
            Install Campus Marche on your phone or computer for a faster,
            app-like experience — no App Store required.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container-shell py-14">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* Android */}
          <Card title="Android — Chrome" icon="🤖">
            <StepList items={steps.android} />
          </Card>

          {/* Desktop */}
          <Card title="Windows / Mac — Chrome or Edge" icon="💻">
            <StepList items={steps.desktop} />
            <p className="mt-4 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
              The exact menu label varies slightly between browser versions.
              Look for wording like <em>Install Campus Marche</em>, <em>Install app</em>, or <em>Add to Desktop</em>.
            </p>
          </Card>

          {/* iOS */}
          <Card title="iPhone / iPad — Safari" icon="🍎">
            <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
              iOS Safari does not support the automatic install prompt — you must use the Share menu manually.
            </p>
            <StepList items={steps.ios} />
          </Card>

          {/* Reinstallation */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: "rgba(114,204,35,0.06)",
              border: "1px solid rgba(114,204,35,0.2)",
            }}
          >
            <h2 className="text-base font-bold" style={{ color: "var(--on-surface)" }}>
              Already installed Campus Marche before?
            </h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              If you removed the app from your device, simply return to{" "}
              <strong style={{ color: "var(--on-surface)" }}>campusmarche.com</strong> and follow the
              installation steps for your device again. Your Campus Marche account remains intact —
              uninstalling the app does not delete your account, listings, or order history.
            </p>
          </div>

          {/* CTA */}
          <div className="pt-2 text-center">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "#72CC23" }}
            >
              Browse Campus Marche
            </Link>
            <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
              Need help?{" "}
              <Link href="/contact" className="underline underline-offset-2 hover:text-[#72CC23] transition-colors">
                Contact us
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
