"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownCircle, CheckCircle2, Clock, Loader2, TrendingUp, Wallet,
  Pencil, X, Smartphone, AlertCircle, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getMomoWarning } from "@/lib/momo-detect";
import { useWallet, usePayouts, useBusiness } from "@/hooks/use-api";
import { PAYOUT_METHOD_LABELS, PAYOUT_STATUS_LABELS, type PayoutMethod } from "@/types";
import { AuthGate } from "@/components/auth-gate";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { useToast } from "@/providers/toast-provider";
import type { BusinessProfile } from "@/types";

const spring = { type: "spring", stiffness: 340, damping: 26 } as const;

const STATUS_COLORS: Record<string, string> = {
  PENDING:    "bg-amber-100 text-amber-800",
  APPROVED:   "bg-blue-100 text-blue-800",
  PROCESSING: "bg-sky-100 text-sky-800",
  COMPLETED:  "bg-green-100 text-green-800",
  FAILED:     "bg-red-100 text-red-800",
  CANCELLED:  "bg-slate-100 text-slate-600",
};

const STATUS_DOTS: Record<string, string> = {
  PENDING:    "#F59E0B",
  APPROVED:   "#3B82F6",
  PROCESSING: "#0EA5E9",
  COMPLETED:  "#16A34A",
  FAILED:     "#EF4444",
  CANCELLED:  "#94A3B8",
};

const PAYOUT_METHODS: { value: PayoutMethod; label: string }[] = [
  { value: "MTN_MOMO",         label: "MTN MoMo" },
  { value: "TELECEL_CASH",     label: "Telecel Cash" },
  { value: "AIRTELTIGO_MONEY", label: "AirtelTigo Money" },
  { value: "BANK_TRANSFER",    label: "Bank Transfer" },
];

const MOMO_PROVIDER_MAP: Partial<Record<PayoutMethod, "mtn" | "vod" | "tgo">> = {
  MTN_MOMO:         "mtn",
  TELECEL_CASH:     "vod",
  AIRTELTIGO_MONEY: "tgo",
};

const PROVIDER_TO_METHOD: Record<string, PayoutMethod> = {
  mtn: "MTN_MOMO",
  vod: "TELECEL_CASH",
  tgo: "AIRTELTIGO_MONEY",
};

/* ── Balance card ─────────────────────────────────────────────────── */
function BalanceCard({
  label, amount, icon, accent, subtitle, prominent,
}: {
  label: string; amount: number; icon: React.ReactNode;
  accent: string; subtitle?: string; prominent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-5 transition-shadow hover:shadow-md"
      style={{
        background: prominent ? `linear-gradient(135deg, ${accent}18 0%, ${accent}08 100%)` : "var(--surface)",
        border: prominent ? `1.5px solid ${accent}35` : "1px solid var(--border)",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</p>
          <p className="mt-2 text-2xl font-black" style={{ color: "var(--on-surface)" }}>{formatCurrency(amount)}</p>
          {subtitle ? <p className="mt-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>{subtitle}</p> : null}
        </div>
        <div
          className="grid h-11 w-11 place-items-center rounded-2xl"
          style={{ background: accent + "18", color: accent }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ── Payout destination card ──────────────────────────────────────── */
function PayoutDestinationCard({
  business,
  onSaved,
}: {
  business: BusinessProfile | null | undefined;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [provider, setProvider] = useState(business?.momoProvider ?? "");
  const [phone,    setPhone]    = useState(business?.momoPhone ?? "");

  const configured = !!(business?.momoProvider && business?.momoPhone);

  const PROVIDER_LABELS: Record<string, string> = {
    mtn: "MTN MoMo",
    vod: "Telecel Cash",
    tgo: "AirtelTigo Money",
  };

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!business) return;
    setSaving(true);
    try {
      await api.saveBusiness({
        name: business.name,
        type: business.type,
        location: business.location,
        description: business.description ?? undefined,
        phone: business.phone ?? undefined,
        momoProvider: provider || undefined,
        momoPhone: phone || undefined,
      });
      onSaved();
      setEditing(false);
      toast("Payout destination saved.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save payout details.");
    } finally {
      setSaving(false);
    }
  }

  /* No business profile yet */
  if (!business) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
            style={{ background: "rgba(245,158,11,0.10)", color: "#F59E0B" }}>
            <AlertCircle size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black" style={{ color: "var(--on-surface)" }}>Set up your seller profile</p>
            <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
              You need a business profile before you can request payouts.
            </p>
            <Link
              href="/sell"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold"
              style={{ color: "#72CC23" }}
            >
              Complete setup <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "var(--surface)", border: `1.5px solid ${configured ? "rgba(114,204,35,0.30)" : "var(--border)"}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
            style={{ background: configured ? "rgba(114,204,35,0.10)" : "rgba(148,163,184,0.10)", color: configured ? "#5EB81B" : "var(--muted)" }}
          >
            <Smartphone size={15} />
          </div>
          <div>
            <p className="text-sm font-black" style={{ color: "var(--on-surface)" }}>Payout destination</p>
            {configured ? (
              <p className="mt-0.5 text-xs font-semibold" style={{ color: "#5EB81B" }}>
                {PROVIDER_LABELS[business.momoProvider!] ?? business.momoProvider} · {business.momoPhone}
              </p>
            ) : (
              <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>No MoMo configured</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setEditing(v => !v); setProvider(business.momoProvider ?? ""); setPhone(business.momoPhone ?? ""); }}
          className="grid h-8 w-8 place-items-center rounded-xl transition-colors hover:bg-[var(--surface-raised)]"
          style={{ color: "var(--muted)" }}
        >
          {editing ? <X size={14} /> : <Pencil size={14} />}
        </button>
      </div>

      {!configured && !editing && (
        <p className="mt-3 text-xs leading-5" style={{ color: "var(--muted)" }}>
          Add your Mobile Money number so funds are sent to you automatically when buyers confirm delivery.
        </p>
      )}

      <AnimatePresence>
        {editing && (
          <motion.form
            key="edit"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={handleSave}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              <div>
                <label className="mb-1.5 block text-xs font-bold" style={{ color: "var(--on-surface)" }}>Network</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="input-shell text-sm"
                  required
                >
                  <option value="">— Select network —</option>
                  <option value="mtn">MTN Mobile Money</option>
                  <option value="vod">Telecel Cash</option>
                  <option value="tgo">AirtelTigo Money</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold" style={{ color: "var(--on-surface)" }}>MoMo phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0244 123 456"
                  className="input-shell text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={saving || !provider || !phone}
                className="btn-primary w-full justify-center text-sm disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Save destination
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function WalletPage() {
  const { data: wallet,  mutate: mutateWallet  } = useWallet();
  const { data: rawPayouts, mutate: mutatePayouts } = usePayouts();
  const { data: business,   mutate: mutateBusiness } = useBusiness();
  const payouts = rawPayouts ?? [];
  const { toast } = useToast();

  const [amount,      setAmount]      = useState("");
  const [method,      setMethod]      = useState<PayoutMethod>("MTN_MOMO");
  const [momoPhone,   setMomoPhone]   = useState("");
  const [momoWarning, setMomoWarning] = useState<string | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isMomoMethod    = method !== "BANK_TRANSFER";
  const momoProvider    = MOMO_PROVIDER_MAP[method];
  const available       = wallet?.availableBalance ?? 0;
  const amountNum       = parseFloat(amount) || 0;
  const savedMomoPhone  = business?.momoPhone ?? "";
  const savedMomoMethod = business?.momoProvider ? (PROVIDER_TO_METHOD[business.momoProvider] ?? "MTN_MOMO") : null;
  const usingOverride   = isMomoMethod && momoPhone.trim() !== "";
  const effectivePhone  = usingOverride ? momoPhone.trim() : savedMomoPhone;

  async function handleRequestPayout(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (isMomoMethod && !effectivePhone) {
      setSubmitError("Please add a MoMo number above or enter one here.");
      return;
    }

    if (isMomoMethod && momoProvider && usingOverride) {
      const warning = getMomoWarning(effectivePhone, momoProvider);
      if (warning && !momoWarning) {
        setMomoWarning(warning);
        return;
      }
    }
    setMomoWarning(null);

    if (amountNum <= 0) { setSubmitError("Enter a valid amount."); return; }
    if (amountNum > available) {
      setSubmitError(`You can only withdraw up to ${formatCurrency(available)}.`);
      return;
    }

    setSubmitting(true);
    try {
      await api.requestPayout({
        amount:       amountNum,
        payoutMethod: method,
        ...(isMomoMethod && usingOverride ? { momoPhone: effectivePhone } : {}),
      });
      setSubmitted(true);
      setAmount("");
      setMomoPhone("");
      toast("Payout requested! You'll receive the funds shortly.");
      await Promise.all([mutateWallet(), mutatePayouts()]);
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not request payout. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthGate>
      <div className="container-shell py-8 md:py-10">

        {/* ── Header ── */}
        <div className="mb-7">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold"
            style={{ background: "rgba(114,204,35,0.10)", color: "#5A9460", border: "1px solid rgba(114,204,35,0.25)" }}
          >
            <Wallet className="h-3 w-3" /> Seller wallet
          </div>
          <h1 className="mt-2 text-2xl font-black" style={{ color: "var(--on-surface)" }}>Earnings &amp; payouts</h1>
          <p className="mt-1 text-sm font-semibold" style={{ color: "var(--muted)" }}>
            Funds from completed sales are held here and released to your MoMo or bank.
          </p>
        </div>

        {/* ── Balance cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BalanceCard
            label="Available to withdraw"
            amount={wallet?.availableBalance ?? 0}
            icon={<ArrowDownCircle className="h-5 w-5" />}
            accent="#5A9460"
            subtitle="Ready for payout"
            prominent
          />
          <BalanceCard
            label="Pending"
            amount={wallet?.pendingBalance ?? 0}
            icon={<Clock className="h-5 w-5" />}
            accent="#C68B59"
            subtitle="Awaiting buyer confirmation"
          />
          <BalanceCard
            label="Total earnings"
            amount={wallet?.totalEarnings ?? 0}
            icon={<TrendingUp className="h-5 w-5" />}
            accent="var(--on-surface)"
            subtitle="All time"
          />
          <BalanceCard
            label="Total withdrawn"
            amount={wallet?.totalWithdrawn ?? 0}
            icon={<CheckCircle2 className="h-5 w-5" />}
            accent="#6366F1"
            subtitle="Paid out to you"
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">

          {/* ── Payout history ── */}
          <section>
            <h2 className="mb-4 text-base font-black" style={{ color: "var(--on-surface)" }}>Payout history</h2>

            {payouts.length === 0 ? (
              <div
                className="rounded-2xl p-10 text-center"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <ArrowDownCircle className="mx-auto h-10 w-10" style={{ color: "var(--border)" }} />
                <p className="mt-3 text-sm font-black" style={{ color: "var(--on-surface)" }}>No payouts yet</p>
                <p className="mt-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>
                  Once buyers confirm delivery, your earnings appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {payouts.map((payout) => {
                  const statusClass = STATUS_COLORS[payout.status] ?? "bg-slate-100 text-slate-600";
                  const dotColor    = STATUS_DOTS[payout.status] ?? "#94A3B8";
                  const label       = PAYOUT_STATUS_LABELS[payout.status] ?? payout.status;
                  const isProcessing = payout.status === "PROCESSING" || payout.status === "PENDING";
                  return (
                    <motion.div
                      key={payout.id}
                      layout
                      className="flex items-center justify-between gap-4 rounded-2xl px-5 py-4"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            background: dotColor,
                            boxShadow: isProcessing ? `0 0 0 3px ${dotColor}25` : undefined,
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-black" style={{ color: "var(--on-surface)" }}>
                            {PAYOUT_METHOD_LABELS[payout.payoutMethod] ?? payout.payoutMethod}
                          </p>
                          <p className="mt-0.5 text-xs font-semibold" style={{ color: "var(--muted)" }}>
                            {formatRelativeDate(payout.createdAt)}
                            {payout.failureReason ? ` · ${payout.failureReason}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusClass}`}>{label}</span>
                        <span className="text-base font-black" style={{ color: "var(--on-surface)" }}>
                          {formatCurrency(payout.amount)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Right sidebar ── */}
          <aside className="space-y-4">

            {/* Payout destination card */}
            <div>
              <h2 className="mb-3 text-base font-black" style={{ color: "var(--on-surface)" }}>Payout destination</h2>
              <PayoutDestinationCard
                business={business}
                onSaved={() => mutateBusiness()}
              />
            </div>

            {/* Request payout */}
            <div>
              <h2 className="mb-3 text-base font-black" style={{ color: "var(--on-surface)" }}>Request payout</h2>
              <div
                className="rounded-2xl p-5"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                {available <= 0 ? (
                  <div className="py-4 text-center">
                    <Clock className="mx-auto h-8 w-8" style={{ color: "var(--border)" }} />
                    <p className="mt-3 text-sm font-black" style={{ color: "var(--on-surface)" }}>Nothing to withdraw yet</p>
                    <p className="mt-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>
                      Your available balance grows as buyers confirm deliveries.
                    </p>
                  </div>
                ) : submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={spring}
                    className="flex flex-col items-center gap-3 py-8"
                  >
                    <div className="grid h-14 w-14 place-items-center rounded-full"
                      style={{ background: "rgba(114,204,35,0.12)" }}>
                      <CheckCircle2 className="h-7 w-7" style={{ color: "#5A9460" }} />
                    </div>
                    <p className="text-sm font-black" style={{ color: "var(--on-surface)" }}>Payout requested!</p>
                    <p className="text-center text-xs font-semibold" style={{ color: "var(--muted)" }}>
                      Funds are on their way. Check payout history for status updates.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleRequestPayout} className="space-y-4">
                    {/* Amount */}
                    <div>
                      <label className="text-xs font-bold" style={{ color: "var(--on-surface)" }}>Amount</label>
                      <div
                        className="input-shell mt-1.5 flex items-center overflow-hidden p-0"
                      >
                        <span
                          className="flex h-full shrink-0 items-center px-3 text-sm font-bold"
                          style={{ color: "var(--muted)", borderRight: "1.5px solid var(--border)" }}
                        >
                          GH₵
                        </span>
                        <input
                          type="number"
                          min="1"
                          max={available}
                          step="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          required
                          className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
                          style={{ color: "var(--on-surface)" }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setAmount(available.toFixed(2))}
                        className="mt-1.5 text-xs font-semibold hover:underline"
                        style={{ color: "#5A9460" }}
                      >
                        Withdraw all ({formatCurrency(available)})
                      </button>
                    </div>

                    {/* Payout method */}
                    <div>
                      <label className="text-xs font-bold" style={{ color: "var(--on-surface)" }}>Method</label>
                      <select
                        value={method}
                        onChange={(e) => {
                          setMethod(e.target.value as PayoutMethod);
                          setMomoWarning(null);
                        }}
                        className="input-shell mt-1.5 text-sm"
                      >
                        {PAYOUT_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Saved MoMo indicator (when method matches saved provider) */}
                    {isMomoMethod && savedMomoPhone && savedMomoMethod === method && (
                      <div
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                        style={{ background: "rgba(114,204,35,0.08)", border: "1px solid rgba(114,204,35,0.20)" }}
                      >
                        <CheckCircle2 size={13} style={{ color: "#5EB81B" }} />
                        <p className="text-xs font-semibold" style={{ color: "#5EB81B" }}>
                          Will pay to {savedMomoPhone}
                        </p>
                      </div>
                    )}

                    {/* Override phone (if method has no saved MoMo, or user wants to override) */}
                    {isMomoMethod && (
                      <div>
                        <label className="text-xs font-bold" style={{ color: "var(--on-surface)" }}>
                          {savedMomoPhone && savedMomoMethod === method ? "Override phone (optional)" : "MoMo phone number"}
                        </label>
                        <input
                          type="tel"
                          value={momoPhone}
                          onChange={(e) => { setMomoPhone(e.target.value); setMomoWarning(null); }}
                          placeholder={savedMomoPhone && savedMomoMethod === method ? savedMomoPhone : "0244 123 456"}
                          required={!savedMomoPhone || savedMomoMethod !== method}
                          className="input-shell mt-1.5 text-sm"
                        />
                      </div>
                    )}

                    {/* MoMo network warning */}
                    {momoWarning && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                        ⚠️ {momoWarning}
                        <p className="mt-1 font-normal text-amber-700">Tap "Request payout" again to continue anyway.</p>
                      </div>
                    )}

                    {/* Error */}
                    {submitError && (
                      <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
                        <AlertCircle size={13} className="mt-0.5 shrink-0" />
                        {submitError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary w-full justify-center disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4" />
                      )}
                      {momoWarning ? "Continue anyway" : "Request payout"}
                    </button>

                    <p className="text-center text-xs font-semibold" style={{ color: "var(--muted)" }}>
                      Payouts are typically processed within a few minutes.
                    </p>
                  </form>
                )}
              </div>
            </div>

          </aside>
        </div>
      </div>
    </AuthGate>
  );
}
