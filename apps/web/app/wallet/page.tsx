"use client";

import { useState, type FormEvent } from "react";
import { ArrowDownCircle, CheckCircle2, Clock, Loader2, TrendingUp, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { getMomoWarning } from "@/lib/momo-detect";
import { useWallet, usePayouts } from "@/hooks/use-api";
import { PAYOUT_METHOD_LABELS, PAYOUT_STATUS_LABELS, type PayoutMethod } from "@/types";
import { AuthGate } from "@/components/auth-gate";
import { formatCurrency, formatRelativeDate } from "@/lib/format";

const GLASS = {
  background: "rgba(255,255,255,0.82)",
  backdropFilter: "blur(18px)",
  border: "1px solid rgba(226,232,240,0.70)",
  boxShadow: "0 4px 24px rgba(15,23,42,0.07)",
} as const;

const STATUS_COLORS: Record<string, string> = {
  PENDING:    "bg-amber-100 text-amber-800",
  APPROVED:   "bg-blue-100 text-blue-800",
  PROCESSING: "bg-sky-100 text-sky-800",
  COMPLETED:  "bg-green-100 text-green-800",
  FAILED:     "bg-red-100 text-red-800",
  CANCELLED:  "bg-slate-100 text-slate-600",
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

function BalanceCard({
  label,
  amount,
  icon,
  accent,
  subtitle,
}: {
  label: string;
  amount: number;
  icon: React.ReactNode;
  accent: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl p-5" style={GLASS}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#94A3B8" }}>{label}</p>
          <p className="mt-2 text-2xl font-black" style={{ color: "#0F172A" }}>{formatCurrency(amount)}</p>
          {subtitle ? <p className="mt-1 text-xs font-semibold" style={{ color: "#94A3B8" }}>{subtitle}</p> : null}
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: accent + "18" }}>
          <div style={{ color: accent }}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { data: wallet, mutate: mutateWallet } = useWallet();
  const { data: rawPayouts, mutate: mutatePayouts } = usePayouts();
  const payouts = rawPayouts ?? [];

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayoutMethod>("MTN_MOMO");
  const [momoPhone, setMomoPhone] = useState("");
  const [momoWarning, setMomoWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isMomoMethod = method !== "BANK_TRANSFER";
  const momoProvider = MOMO_PROVIDER_MAP[method];
  const available = wallet?.availableBalance ?? 0;
  const amountNum = parseFloat(amount) || 0;

  async function handleRequestPayout(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    // Soft MoMo network validation
    if (isMomoMethod && momoProvider && momoPhone) {
      const warning = getMomoWarning(momoPhone, momoProvider);
      if (warning && !momoWarning) {
        setMomoWarning(warning);
        return;
      }
    }
    setMomoWarning(null);

    if (amountNum <= 0) {
      setSubmitError("Enter a valid amount.");
      return;
    }
    if (amountNum > available) {
      setSubmitError(`You can only withdraw up to ${formatCurrency(available)}.`);
      return;
    }

    setSubmitting(true);
    try {
      await api.requestPayout({
        amount: amountNum,
        payoutMethod: method,
        ...(isMomoMethod && momoPhone ? { momoPhone } : {}),
      });
      setSubmitted(true);
      setAmount("");
      setMomoPhone("");
      await mutateWallet();
      await mutatePayouts();
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not request payout.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthGate>
      <div className="container-shell py-8 md:py-10">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold"
            style={{ background: "rgba(127,182,133,0.12)", color: "#5A9460", border: "1px solid rgba(127,182,133,0.30)" }}>
            <Wallet className="h-3 w-3" /> Your wallet
          </div>
          <h1 className="mt-2 text-2xl font-black" style={{ color: "#0F172A" }}>Earnings &amp; payouts</h1>
          <p className="mt-1 text-sm font-semibold" style={{ color: "#64748B" }}>
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
            accent="#0F172A"
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
            <h2 className="mb-4 text-base font-black" style={{ color: "#0F172A" }}>Payout history</h2>

            {payouts.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={GLASS}>
                <ArrowDownCircle className="mx-auto h-10 w-10" style={{ color: "#E2E8F0" }} />
                <p className="mt-3 text-sm font-black" style={{ color: "#1E293B" }}>No payouts yet</p>
                <p className="mt-1 text-xs font-semibold" style={{ color: "#94A3B8" }}>
                  Once buyers confirm delivery, your earnings appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {payouts.map((payout) => {
                  const statusClass = STATUS_COLORS[payout.status] ?? "bg-slate-100 text-slate-600";
                  const label = PAYOUT_STATUS_LABELS[payout.status] ?? payout.status;
                  return (
                    <div
                      key={payout.id}
                      className="flex items-center justify-between gap-4 rounded-2xl px-5 py-4"
                      style={GLASS}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-black" style={{ color: "#0F172A" }}>
                          {PAYOUT_METHOD_LABELS[payout.payoutMethod] ?? payout.payoutMethod}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold" style={{ color: "#94A3B8" }}>
                          {formatRelativeDate(payout.createdAt)}
                          {payout.failureReason ? ` · ${payout.failureReason}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusClass}`}>{label}</span>
                        <span className="text-base font-black" style={{ color: "#0F172A" }}>{formatCurrency(payout.amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Request payout ── */}
          <aside>
            <h2 className="mb-4 text-base font-black" style={{ color: "#0F172A" }}>Request payout</h2>
            <div className="rounded-2xl p-5" style={GLASS}>
              {available <= 0 ? (
                <div className="py-6 text-center">
                  <Clock className="mx-auto h-8 w-8" style={{ color: "#E2E8F0" }} />
                  <p className="mt-3 text-sm font-black" style={{ color: "#1E293B" }}>Nothing to withdraw yet</p>
                  <p className="mt-1 text-xs font-semibold" style={{ color: "#94A3B8" }}>
                    Your available balance will grow as buyers confirm their deliveries.
                  </p>
                </div>
              ) : submitted ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <CheckCircle2 className="h-10 w-10" style={{ color: "#5A9460" }} />
                  <p className="text-sm font-black" style={{ color: "#0F172A" }}>Payout requested!</p>
                  <p className="text-center text-xs font-semibold" style={{ color: "#64748B" }}>
                    You&apos;ll receive the funds shortly. Check your payout history for updates.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRequestPayout} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold" style={{ color: "#475569" }}>Amount</label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: "#94A3B8" }}>GH₵</span>
                      <input
                        type="number"
                        min="1"
                        max={available}
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                        className="input-shell pl-10 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setAmount(String(available))}
                      className="mt-1 text-xs font-semibold hover:underline"
                      style={{ color: "#5A9460" }}
                    >
                      Withdraw all ({formatCurrency(available)})
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-bold" style={{ color: "#475569" }}>Payout method</label>
                    <select
                      value={method}
                      onChange={(e) => { setMethod(e.target.value as PayoutMethod); setMomoWarning(null); }}
                      className="input-shell mt-1 text-sm"
                    >
                      {PAYOUT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  {isMomoMethod ? (
                    <div>
                      <label className="text-xs font-bold" style={{ color: "#475569" }}>MoMo phone number</label>
                      <input
                        type="tel"
                        value={momoPhone}
                        onChange={(e) => { setMomoPhone(e.target.value); setMomoWarning(null); }}
                        placeholder="0244 123 456"
                        required
                        className="input-shell mt-1 text-sm"
                      />
                    </div>
                  ) : null}

                  {momoWarning ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                      ⚠️ {momoWarning}
                      <p className="mt-1 text-xs font-normal text-amber-700">
                        Tap "Request payout" again to continue anyway.
                      </p>
                    </div>
                  ) : null}

                  {submitError ? (
                    <p className="text-sm font-semibold text-red-600">{submitError}</p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary w-full justify-center disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownCircle className="h-4 w-4" />}
                    {momoWarning ? "Continue anyway" : "Request payout"}
                  </button>

                  <p className="text-center text-xs font-semibold" style={{ color: "#94A3B8" }}>
                    Payouts are typically processed within a few minutes.
                  </p>
                </form>
              )}
            </div>
          </aside>
        </div>
      </div>
    </AuthGate>
  );
}
