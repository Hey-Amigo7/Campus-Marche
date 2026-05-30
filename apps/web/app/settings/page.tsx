"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Bell, Lock, Shield, Trash2,
  ChevronRight, Check, AlertTriangle,
  Eye, EyeOff,
} from "lucide-react";
import { api } from "@/lib/api";
import { clearAuthToken } from "@/lib/auth";
import { useProfile } from "@/hooks/use-api";
import { useToast } from "@/providers/toast-provider";
import { useTheme, THEMES } from "@/providers/theme-provider";
import { PageEnter, FadeUp } from "@/components/motion-primitives";
import { AuthGate } from "@/components/auth-gate";

const spring = { type: "spring", stiffness: 340, damping: 26 } as const;

/* ── Section card ────────────────────────────────────────────── */
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid var(--border)" }}>
      <div className="px-5 py-3" style={{ background: "var(--surface-raised)", borderBottom: "1px solid var(--border)" }}>
        <p className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>{title}</p>
      </div>
      <div style={{ background: "var(--surface)" }}>{children}</div>
    </div>
  );
}

/* ── Toggle row ──────────────────────────────────────────────── */
function ToggleRow({
  label, desc, checked, onChange, last,
}: {
  label: string; desc?: string; checked: boolean;
  onChange: (v: boolean) => void; last?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-5 py-4"
      style={!last ? { borderBottom: "1px solid var(--border)" } : undefined}
    >
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>{label}</p>
        {desc && <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>{desc}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative h-6 w-11 shrink-0 rounded-full overflow-hidden transition-colors duration-200"
        style={{ background: checked ? "#72CC23" : "var(--border)" }}
      >
        <motion.span
          animate={{ x: checked ? 20 : 2 }}
          transition={spring}
          className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
        />
      </button>
    </div>
  );
}

/* ── Link row ────────────────────────────────────────────────── */
function LinkRow({ label, desc, href, last }: { label: string; desc?: string; href: string; last?: boolean }) {
  return (
    <Link href={href}>
      <div
        className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[var(--surface-raised)]"
        style={!last ? { borderBottom: "1px solid var(--border)" } : undefined}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>{label}</p>
          {desc && <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>{desc}</p>}
        </div>
        <ChevronRight size={15} style={{ color: "var(--muted)" }} />
      </div>
    </Link>
  );
}

/* ── Settings content ────────────────────────────────────────── */
function SettingsContent() {
  const router  = useRouter();
  const { data: profile } = useProfile();
  const { success, error: toastError } = useToast();
  const { theme, setTheme } = useTheme();

  // Notification toggles (local-only — no API endpoint for these yet)
  const [notifMessages,  setNotifMessages]  = useState(true);
  const [notifOrders,    setNotifOrders]    = useState(true);
  const [notifOffers,    setNotifOffers]    = useState(true);
  const [notifSaves,     setNotifSaves]     = useState(false);
  const [notifMarketing, setNotifMarketing] = useState(false);

  // Privacy toggles (local-only)
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  // Password change
  const [showPwSection, setShowPwSection] = useState(false);
  const [currentPw,     setCurrentPw]     = useState("");
  const [newPw,         setNewPw]         = useState("");
  const [showPw,        setShowPw]        = useState(false);
  const [pwSaving,      setPwSaving]      = useState(false);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading,     setDeleteLoading]     = useState(false);

  async function handlePasswordSave() {
    if (!currentPw || newPw.length < 8) {
      toastError("New password must be at least 8 characters.");
      return;
    }
    setPwSaving(true);
    // Password change via forgot-password reset flow
    try {
      await api.auth.forgotPassword(profile?.email ?? "");
      success("Password reset link sent to your email.");
      setShowPwSection(false);
      setCurrentPw("");
      setNewPw("");
    } catch {
      toastError("Could not send reset email. Try again.");
    } finally {
      setPwSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    try {
      await api.deleteAccount();
      clearAuthToken();
      success("Account deleted. Goodbye!");
      router.push("/");
      router.refresh();
    } catch {
      toastError("Could not delete account. Please try again.");
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <PageEnter className="min-h-screen pb-20">

      {/* Sticky header */}
      <div
        className="sticky top-16 z-20 border-b"
        style={{ background: "var(--background)", borderColor: "var(--border)" }}
      >
        <div className="container-shell flex h-14 items-center gap-3">
          <Link
            href="/profile"
            className="grid h-8 w-8 place-items-center rounded-xl transition-colors hover:bg-[var(--surface-raised)]"
            style={{ color: "var(--muted)" }}
          >
            <motion.span whileHover={{ x: -3 }} whileTap={{ scale: 0.82 }} transition={spring} className="inline-flex">
              <ArrowLeft size={16} />
            </motion.span>
          </Link>
          <h1 className="font-black text-base" style={{ color: "var(--on-surface)" }}>Settings</h1>
        </div>
      </div>

      <div className="container-shell max-w-lg pt-8 space-y-6">

        {/* ── Appearance ── */}
        <FadeUp>
          <SectionCard title="Appearance">
            <div className="flex gap-2 p-4">
              {THEMES.map(({ id, label, accent }) => {
                const active = theme === id;
                return (
                  <motion.button
                    key={id}
                    type="button"
                    onClick={() => setTheme(id)}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.94 }}
                    transition={spring}
                    className="flex flex-1 flex-col items-center gap-2 rounded-xl py-3.5"
                    style={{
                      background: active ? "rgba(114,204,35,0.10)" : "var(--surface-raised)",
                      border:     `1.5px solid ${active ? "#72CC23" : "var(--border)"}`,
                    }}
                  >
                    <motion.span
                      animate={{ scale: active ? 1.18 : 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 16 }}
                      className="inline-flex h-5 w-5 rounded-full"
                      style={{ background: accent, outline: active ? `2px solid #72CC23` : "2px solid transparent", outlineOffset: "2px" }}
                    />
                    <span className="text-[10px] font-semibold leading-tight text-center px-0.5"
                      style={{ color: active ? "#72CC23" : "var(--muted)" }}>
                      {label.replace("Campus ", "")}
                    </span>
                    <AnimatePresence>
                      {active && (
                        <motion.span
                          initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                          transition={spring}
                          className="grid h-4 w-4 place-items-center rounded-full"
                          style={{ background: "#72CC23" }}
                        >
                          <Check size={9} className="text-white" strokeWidth={3} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </SectionCard>
        </FadeUp>

        {/* ── Notifications ── */}
        <FadeUp delay={0.05}>
          <SectionCard title="Notifications">
            <ToggleRow label="New messages"         desc="When someone messages you"               checked={notifMessages}  onChange={setNotifMessages}  />
            <ToggleRow label="Order updates"        desc="Shipping, delivery, and cancellations"   checked={notifOrders}    onChange={setNotifOrders}    />
            <ToggleRow label="Offers received"      desc="When a buyer makes an offer"             checked={notifOffers}    onChange={setNotifOffers}    />
            <ToggleRow label="Saves on listings"    desc="When someone saves your listing"         checked={notifSaves}     onChange={setNotifSaves}     />
            <ToggleRow label="Campus news & tips"   desc="Occasional updates from Campus Marche"   checked={notifMarketing} onChange={setNotifMarketing} last />
          </SectionCard>
        </FadeUp>

        {/* ── Privacy ── */}
        <FadeUp delay={0.08}>
          <SectionCard title="Privacy">
            <ToggleRow label="Show phone number"  desc="Visible to buyers on your listings"  checked={showPhone} onChange={setShowPhone} />
            <ToggleRow label="Show email address" desc="Only campus-verified users see it"   checked={showEmail} onChange={setShowEmail} last />
          </SectionCard>
        </FadeUp>

        {/* ── Security ── */}
        <FadeUp delay={0.10}>
          <SectionCard title="Security">
            {/* Change password expandable */}
            <button
              type="button"
              onClick={() => setShowPwSection((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-[var(--surface-raised)]"
              style={showPwSection ? { borderBottom: "1px solid var(--border)" } : undefined}
            >
              <div className="flex items-center gap-3">
                <Lock size={15} style={{ color: "var(--muted)" }} />
                <div className="text-left">
                  <p className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>Change password</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Update your account password</p>
                </div>
              </div>
              <motion.div animate={{ rotate: showPwSection ? 90 : 0 }} transition={spring}>
                <ChevronRight size={15} style={{ color: "var(--muted)" }} />
              </motion.div>
            </button>

            <AnimatePresence>
              {showPwSection && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="space-y-3 px-5 py-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold" style={{ color: "var(--on-surface)" }}>
                        Current password
                      </label>
                      <input
                        type={showPw ? "text" : "password"}
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                        style={{ background: "var(--surface-raised)", border: "1.5px solid var(--border)", color: "var(--on-surface)" }}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold" style={{ color: "var(--on-surface)" }}>
                        New password
                      </label>
                      <div className="relative">
                        <input
                          type={showPw ? "text" : "password"}
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                          placeholder="At least 8 characters"
                          className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none"
                          style={{ background: "var(--surface-raised)", border: "1.5px solid var(--border)", color: "var(--on-surface)" }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((v) => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2"
                          style={{ color: "var(--muted)" }}
                        >
                          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                    <motion.button
                      type="button"
                      onClick={handlePasswordSave}
                      disabled={pwSaving}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={spring}
                      className="w-full rounded-xl py-3 text-sm font-black text-white disabled:opacity-40"
                      style={{ background: "#72CC23" }}
                    >
                      {pwSaving ? "Updating…" : "Update password"}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Verified badge */}
            <div style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3 px-5 py-4">
                <Shield size={15} style={{ color: "var(--green)" }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>
                    {profile?.verified ? "HTU Email verified" : "Email not verified"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {profile?.verified ? "Your campus email is confirmed" : "Verify your email to build trust"}
                  </p>
                </div>
                {profile?.verified ? (
                  <span className="ml-auto rounded-full px-2.5 py-1 text-[10px] font-black"
                    style={{ background: "rgba(22,163,74,0.10)", color: "var(--green)" }}>
                    ✓ Verified
                  </span>
                ) : (
                  <Link href={`/verify-email?email=${encodeURIComponent(profile?.email ?? "")}`}
                    className="ml-auto rounded-full px-2.5 py-1 text-[10px] font-black"
                    style={{ background: "rgba(217,119,6,0.10)", color: "var(--caramel)" }}>
                    Verify →
                  </Link>
                )}
              </div>
            </div>
          </SectionCard>
        </FadeUp>

        {/* ── Account ── */}
        <FadeUp delay={0.12}>
          <SectionCard title="Account">
            <LinkRow label="Edit Profile"      desc="Update your name, avatar, and bio"    href="/profile/edit"    />
            <LinkRow label="Wallet & Payouts"  desc="Balance, MoMo payouts, history"       href="/wallet"          />
            <LinkRow label="Verify Phone"      desc="Add phone verification"               href="/verify-phone"    last />
          </SectionCard>
        </FadeUp>

        {/* ── About ── */}
        <FadeUp delay={0.13}>
          <SectionCard title="About">
            <LinkRow label="Privacy Policy"   desc="How we handle your data"       href="/privacy" />
            <LinkRow label="Terms of Service" desc="Campus Marche usage terms"     href="/terms"   />
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>Version</p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Campus Marche Beta</p>
              </div>
              <span className="text-xs font-mono font-semibold" style={{ color: "var(--subtle)" }}>v1.0.0</span>
            </div>
          </SectionCard>
        </FadeUp>

        {/* ── Danger zone ── */}
        <FadeUp delay={0.14}>
          <div className="overflow-hidden rounded-2xl" style={{ border: "1.5px solid rgba(239,68,68,0.25)" }}>
            <div className="flex items-center gap-2 px-5 py-3"
              style={{ background: "rgba(239,68,68,0.05)", borderBottom: "1px solid rgba(239,68,68,0.15)" }}>
              <AlertTriangle size={13} style={{ color: "#EF4444" }} />
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: "#EF4444" }}>Danger Zone</p>
            </div>
            <div style={{ background: "var(--surface)" }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-[rgba(239,68,68,0.04)]"
              >
                <div className="flex items-center gap-3">
                  <Trash2 size={15} style={{ color: "#EF4444" }} />
                  <div className="text-left">
                    <p className="text-sm font-semibold" style={{ color: "#EF4444" }}>Delete account</p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      Permanently remove your account and listings
                    </p>
                  </div>
                </div>
                <ChevronRight size={15} style={{ color: "var(--muted)" }} />
              </button>
            </div>
          </div>
        </FadeUp>
      </div>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }} transition={spring}
              className="w-full max-w-sm rounded-3xl p-6"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full"
                style={{ background: "rgba(239,68,68,0.10)" }}>
                <Trash2 size={24} style={{ color: "#EF4444" }} />
              </div>
              <h3 className="text-center text-lg font-black" style={{ color: "var(--on-surface)" }}>
                Delete your account?
              </h3>
              <p className="mt-2 text-center text-sm" style={{ color: "var(--muted)" }}>
                This will permanently delete your profile, listings, and order history. This cannot be undone.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-xl py-3 text-sm font-semibold transition-colors hover:bg-[var(--surface-raised)]"
                  style={{ background: "var(--surface-raised)", color: "var(--on-surface)", border: "1px solid var(--border)" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1 rounded-xl py-3 text-sm font-black text-white disabled:opacity-50 transition-opacity"
                  style={{ background: "#EF4444" }}
                >
                  {deleteLoading ? "Deleting…" : "Yes, delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageEnter>
  );
}

export default function SettingsPage() {
  return (
    <AuthGate>
      <SettingsContent />
    </AuthGate>
  );
}
