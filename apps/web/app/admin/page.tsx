"use client";

import { useState, useCallback } from "react";
import NumberFlow from "@number-flow/react";
import useSWR, { mutate as globalMutate } from "swr";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownCircle,
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ExternalLink,
  Inbox,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Megaphone,
  Package,
  Plus,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { PAYOUT_METHOD_LABELS, PAYOUT_STATUS_LABELS, type Payout } from "@/types";
import { isEnvAdminToken, clearAuthToken } from "@/lib/auth";
import { formatCurrency, formatRelativeDate } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "overview" | "users" | "listings" | "reports" | "events" | "messages" | "payouts" | "broadcast";

type AdminStats = {
  users: number;
  products: number;
  orders: number;
  pendingReports: number;
  revenue: number;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  verified: boolean;
  premium: boolean;
  canEditEvents: boolean;
  createdAt: string;
  business: { name: string } | null;
  _count: { products: number; orders: number };
};

type AdminProduct = {
  id: string;
  title: string;
  price: number;
  category: string | null;
  active: boolean;
  featured: boolean;
  views: number;
  createdAt: string;
  seller: { id: string; name: string };
};

type AdminReport = {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  reporter: { id: string; name: string } | null;
  reportedUser: { id: string; name: string } | null;
  product: { id: string; title: string } | null;
};

type AdminEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  eventDate: string;
  category: string;
  opportunity?: string | null;
  imageUrl?: string | null;
  featured?: boolean;
};

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
};

// ─── Design tokens ─────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #E2E8F0",
  boxShadow: "0 1px 6px rgba(15,23,42,0.05)",
};

const ROW_HOVER = "transition-colors hover:bg-slate-50";

// ─── Gate ─────────────────────────────────────────────────────────────────────

function AdminGate({ children }: { children: React.ReactNode }) {
  const { data: profile, isLoading } = useProfile();
  const envAdmin = typeof window !== "undefined" ? isEnvAdminToken() : false;

  if (!envAdmin && isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!envAdmin && (!profile || profile.role !== "ADMIN")) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-5 bg-slate-50">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100">
          <Shield className="h-8 w-8 text-slate-400" />
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-slate-800">Admin access required</p>
          <p className="mt-1 text-sm text-slate-500">This area is restricted to platform administrators.</p>
        </div>
        <Link
          href="/admin/login"
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white"
        >
          <Shield className="h-4 w-4" /> Go to admin login
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  accent,
  trend,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent: string;
  trend?: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl p-5" style={CARD}>
      <div className="flex items-center justify-between">
        <div
          className="grid h-11 w-11 place-items-center rounded-xl"
          style={{ background: accent + "14" }}
        >
          <div style={{ color: accent }}>{icon}</div>
        </div>
        {trend && (
          <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-600">
            <TrendingUp className="h-3.5 w-3.5" />
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-slate-800">
          {typeof value === "number" ? (
            <NumberFlow
              value={value}
              transformTiming={{ duration: 700, easing: "cubic-bezier(0.22,1,0.36,1)" }}
            />
          ) : (
            value
          )}
        </p>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: stats, isLoading } = useSWR<AdminStats>("admin-stats", api.admin.getStats);

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`h-32 animate-pulse rounded-2xl bg-slate-100 ${i === 4 ? "sm:col-span-2 xl:col-span-4" : ""}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total users"
          value={stats.users}
          icon={<Users className="h-5 w-5" />}
          accent="#7FB685"
        />
        <StatCard
          label="Active listings"
          value={stats.products}
          icon={<Package className="h-5 w-5" />}
          accent="#3B82F6"
        />
        <StatCard
          label="Total orders"
          value={stats.orders}
          icon={<BarChart3 className="h-5 w-5" />}
          accent="#C68B59"
        />
        <StatCard
          label="Pending reports"
          value={stats.pendingReports}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent={stats.pendingReports > 0 ? "#EF4444" : "#94A3B8"}
        />
      </div>

      <div className="rounded-2xl p-6" style={CARD}>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Platform revenue</p>
        <p className="mt-2 text-4xl font-black text-slate-800">
          <NumberFlow
            value={stats.revenue}
            format={{ style: "currency", currency: "GHS", maximumFractionDigits: 0 }}
            transformTiming={{ duration: 900, easing: "cubic-bezier(0.22,1,0.36,1)" }}
          />
        </p>
        <p className="mt-1 text-xs text-slate-400">Total from completed Paystack transactions</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: "68%", background: "linear-gradient(90deg, #7FB685, #5A9460)" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Users tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [skip, setSkip] = useState(0);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const take = 20;
  const [warnTarget, setWarnTarget] = useState<{ id: string; name: string } | null>(null);
  const [warnMessage, setWarnMessage] = useState("");
  const [warnLoading, setWarnLoading] = useState(false);
  const [warnError, setWarnError] = useState<string | null>(null);
  const [warnSent, setWarnSent] = useState(false);

  const { data, isLoading, mutate } = useSWR(
    ["admin-users", skip, debouncedQ],
    () => api.admin.getUsers(skip, take, debouncedQ || undefined),
    { keepPreviousData: true },
  );

  const users: AdminUser[] = data?.users ?? [];
  const total: number = data?.total ?? 0;

  function handleSearch(val: string) {
    setQ(val);
    clearTimeout((window as Window & { _userSearchTimer?: ReturnType<typeof setTimeout> })._userSearchTimer);
    (window as Window & { _userSearchTimer?: ReturnType<typeof setTimeout> })._userSearchTimer = setTimeout(() => {
      setDebouncedQ(val);
      setSkip(0);
    }, 300);
  }

  async function suspend(userId: string) {
    await api.admin.suspendUser(userId);
    await mutate();
  }

  async function setRole(userId: string, role: string) {
    await api.admin.setUserRole(userId, role);
    await mutate();
  }

  async function toggleEventsPermission(userId: string, current: boolean) {
    await api.admin.grantEventsPermission(userId, !current);
    await mutate();
  }

  async function sendWarn() {
    if (!warnTarget || !warnMessage.trim()) return;
    setWarnLoading(true);
    setWarnError(null);
    try {
      await api.admin.sendWarning(warnTarget.id, warnMessage.trim());
      setWarnSent(true);
      setTimeout(() => {
        setWarnTarget(null);
        setWarnMessage("");
        setWarnSent(false);
      }, 1500);
    } catch (err) {
      setWarnError(err instanceof Error ? err.message : "Failed to send warning.");
    } finally {
      setWarnLoading(false);
    }
  }

  function closeWarn() {
    setWarnTarget(null);
    setWarnMessage("");
    setWarnError(null);
    setWarnSent(false);
  }

  return (
    <div className="space-y-4">
      {warnTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.50)", backdropFilter: "blur(8px)" }}
        >
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50">
                  <Megaphone className="h-4 w-4 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">Send warning</p>
                  <p className="text-xs text-slate-400">{warnTarget.name}</p>
                </div>
              </div>
              <button onClick={closeWarn} className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <div className="p-5">
              {warnSent ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50">
                    <Check className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="font-bold text-slate-800">Warning sent</p>
                </div>
              ) : (
                <>
                  <label className="mb-1.5 block text-xs font-black text-slate-500">Warning message</label>
                  <textarea
                    rows={4}
                    placeholder="Describe the policy violation and expected corrective action…"
                    value={warnMessage}
                    onChange={(e) => setWarnMessage(e.target.value)}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400"
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">{warnMessage.length}/1000</p>
                  {warnError && (
                    <p className="mt-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{warnError}</p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <button onClick={closeWarn} className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600">
                      Cancel
                    </button>
                    <button
                      onClick={sendWarn}
                      disabled={warnLoading || warnMessage.trim().length < 10}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                    >
                      {warnLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
                      Send
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-400"
          />
        </div>
        <span className="text-sm font-semibold text-slate-500">{total.toLocaleString()} users</span>
      </div>

      <div className="overflow-hidden rounded-2xl" style={CARD}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["User", "Role", "Listings", "Orders", "Joined", "Events editor", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded-full bg-slate-100" style={{ width: j === 0 ? "80%" : "50%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">No users found</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className={`border-b border-slate-50 ${ROW_HOVER}`}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                      {user.business && <p className="text-xs font-semibold text-emerald-600">{user.business.name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => setRole(user.id, e.target.value)}
                        className="rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                        style={{
                          background: user.role === "ADMIN" ? "#0F172A" : user.role === "MODERATOR" ? "#7FB685" : "#F1F5F9",
                          color: user.role === "ADMIN" || user.role === "MODERATOR" ? "#fff" : "#475569",
                          border: "none",
                        }}
                      >
                        <option value="USER">USER</option>
                        <option value="MODERATOR">MODERATOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{user._count.products}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{user._count.orders}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatRelativeDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleEventsPermission(user.id, user.canEditEvents)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all hover:opacity-80"
                        style={{
                          background: user.canEditEvents ? "rgba(127,182,133,0.12)" : "#F1F5F9",
                          color: user.canEditEvents ? "#4A7C59" : "#94A3B8",
                        }}
                      >
                        <CalendarDays className="h-3.5 w-3.5" />
                        {user.canEditEvents ? "Yes" : "No"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setWarnTarget({ id: user.id, name: user.name })}
                          title="Send warning"
                          className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 transition-all hover:scale-110"
                        >
                          <Megaphone className="h-4 w-4 text-amber-700" />
                        </button>
                        <button
                          onClick={() => suspend(user.id)}
                          title={user.verified ? "Suspend user" : "User already suspended"}
                          className="grid h-8 w-8 place-items-center rounded-lg transition-all hover:scale-110"
                          style={{ background: user.verified ? "rgba(239,68,68,0.08)" : "#F1F5F9" }}
                        >
                          <ShieldOff className="h-4 w-4" style={{ color: user.verified ? "#EF4444" : "#CBD5E1" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination skip={skip} take={take} total={total} onPage={setSkip} />
    </div>
  );
}

// ─── Listings tab ─────────────────────────────────────────────────────────────

function ListingsTab() {
  const [skip, setSkip] = useState(0);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const take = 20;

  const { data, isLoading, mutate } = useSWR(
    ["admin-products", skip, debouncedQ],
    () => api.admin.getProducts(skip, take, debouncedQ || undefined),
    { keepPreviousData: true },
  );

  const products: AdminProduct[] = data?.products ?? [];
  const total: number = data?.total ?? 0;

  function handleSearch(val: string) {
    setQ(val);
    clearTimeout((window as Window & { _productSearchTimer?: ReturnType<typeof setTimeout> })._productSearchTimer);
    (window as Window & { _productSearchTimer?: ReturnType<typeof setTimeout> })._productSearchTimer = setTimeout(() => {
      setDebouncedQ(val);
      setSkip(0);
    }, 300);
  }

  async function toggle(id: string, currentlyActive: boolean) {
    if (currentlyActive) await api.admin.deactivateProduct(id);
    else await api.admin.activateProduct(id);
    await mutate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search listings…"
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-400"
          />
        </div>
        <span className="text-sm font-semibold text-slate-500">{total.toLocaleString()} listings</span>
      </div>

      <div className="overflow-hidden rounded-2xl" style={CARD}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Title", "Seller", "Category", "Price", "Views", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded-full bg-slate-100" style={{ width: j === 0 ? "80%" : "50%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">No listings found</td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className={`border-b border-slate-50 ${ROW_HOVER}`}>
                    <td className="max-w-[200px] px-4 py-3">
                      <p className="truncate font-bold text-slate-800">{p.title}</p>
                      <p className="text-xs text-slate-400">{formatRelativeDate(p.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600">{p.seller.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{p.category ?? "—"}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{formatCurrency(p.price)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-500">{p.views}</td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2.5 py-1 text-[10px] font-black"
                        style={{
                          background: p.active ? "rgba(127,182,133,0.12)" : "rgba(239,68,68,0.08)",
                          color: p.active ? "#5A9460" : "#EF4444",
                        }}
                      >
                        {p.active ? "Active" : "Inactive"}
                      </span>
                      {p.featured && (
                        <span className="ml-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">
                          Featured
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggle(p.id, p.active)}
                        className="grid h-8 w-8 place-items-center rounded-lg transition-all hover:scale-110"
                        style={{ background: p.active ? "rgba(239,68,68,0.08)" : "rgba(127,182,133,0.10)" }}
                        title={p.active ? "Deactivate" : "Activate"}
                      >
                        {p.active
                          ? <EyeOff className="h-4 w-4 text-red-500" />
                          : <Eye className="h-4 w-4 text-emerald-600" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination skip={skip} take={take} total={total} onPage={setSkip} />
    </div>
  );
}

// ─── Reports tab ──────────────────────────────────────────────────────────────

const REPORT_STATUS_COLORS: Record<string, string> = {
  pending: "#EF4444",
  resolved: "#7FB685",
  dismissed: "#94A3B8",
  actioned: "#C68B59",
};

function ReportsTab() {
  const [skip, setSkip] = useState(0);
  const take = 20;
  const { data, isLoading, mutate } = useSWR(
    ["admin-reports", skip],
    () => api.admin.getReports(skip, take),
    { keepPreviousData: true },
  );

  const reports: AdminReport[] = data?.reports ?? [];
  const total: number = data?.total ?? 0;

  async function resolve(id: string, status: string) {
    await api.admin.resolveReport(id, status);
    await mutate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500">{total} reports total</span>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))
        ) : reports.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={CARD}>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50">
              <Check className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="mt-4 font-bold text-slate-800">No reports</p>
            <p className="mt-1 text-sm text-slate-400">The platform is clear.</p>
          </div>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="rounded-2xl p-4" style={CARD}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-black capitalize"
                      style={{
                        background: (REPORT_STATUS_COLORS[r.status] ?? "#94A3B8") + "14",
                        color: REPORT_STATUS_COLORS[r.status] ?? "#94A3B8",
                      }}
                    >
                      {r.status}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{r.reason}</span>
                    <span className="text-xs text-slate-400">{formatRelativeDate(r.createdAt)}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-slate-500">
                    {r.reporter && <span>Reporter: <strong>{r.reporter.name}</strong></span>}
                    {r.reportedUser && <span>Reported: <strong>{r.reportedUser.name}</strong></span>}
                    {r.product && <span>Listing: <strong>{r.product.title}</strong></span>}
                  </div>
                </div>
                {r.status === "pending" && (
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => resolve(r.id, "resolved")}
                      className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-all hover:-translate-y-0.5">
                      Resolve
                    </button>
                    <button onClick={() => resolve(r.id, "actioned")}
                      className="rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 transition-all hover:-translate-y-0.5">
                      Action
                    </button>
                    <button onClick={() => resolve(r.id, "dismissed")}
                      className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500 transition-all hover:-translate-y-0.5">
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Pagination skip={skip} take={take} total={total} onPage={setSkip} />
    </div>
  );
}

// ─── Events tab ───────────────────────────────────────────────────────────────

const EMPTY_EVENT = { title: "", description: "", location: "", eventDate: "", category: "", opportunity: "", imageUrl: "" };

function EventsTab() {
  const { data: events = [], isLoading, mutate } = useSWR<AdminEvent[]>("admin-events", api.admin.getEvents);
  const [editing, setEditing] = useState<(typeof EMPTY_EVENT & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function save() {
    if (!editing) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (editing.id) {
        await api.admin.updateEvent(editing.id, { ...editing, eventDate: editing.eventDate });
      } else {
        await api.admin.createEvent({ ...editing });
      }
      await mutate();
      setEditing(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save event.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    try {
      await api.admin.deleteEvent(id);
      await mutate();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500">{events.length} events</span>
        <button
          onClick={() => setEditing(EMPTY_EVENT)}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" /> New event
        </button>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.50)", backdropFilter: "blur(8px)" }}
        >
          <div className="flex w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl" style={{ maxHeight: "90vh" }}>
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-5">
              <h3 className="font-black text-slate-800">{editing.id ? "Edit event" : "New event"}</h3>
              <button onClick={() => { setEditing(null); setSaveError(null); }} className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto p-5">
              {[
                { key: "title", label: "Title", type: "text" },
                { key: "location", label: "Location", type: "text" },
                { key: "category", label: "Category", type: "text" },
                { key: "eventDate", label: "Event date", type: "datetime-local" },
                { key: "imageUrl", label: "Image URL (optional)", type: "text" },
                { key: "opportunity", label: "Opportunity tag (optional)", type: "text" },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-black text-slate-500">{label}</label>
                  <input
                    type={type}
                    value={(editing as Record<string, string>)[key] ?? ""}
                    onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400"
                  />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs font-black text-slate-500">Description</label>
                <textarea
                  rows={3}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400"
                />
              </div>
            </div>
            {saveError && (
              <div className="mx-5 mb-1 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600">
                {saveError}
              </div>
            )}
            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 p-5">
              <button onClick={() => { setEditing(null); setSaveError(null); }}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-black text-white disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editing.id ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))
        ) : events.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={CARD}>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100">
              <CalendarDays className="h-7 w-7 text-slate-400" />
            </div>
            <p className="mt-4 font-bold text-slate-800">No events yet</p>
          </div>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="flex items-start gap-4 rounded-2xl p-4" style={CARD}>
              {ev.imageUrl && (
                <img src={ev.imageUrl} alt={ev.title} className="h-14 w-20 shrink-0 rounded-xl object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-800">{ev.title}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {new Date(ev.eventDate).toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {" · "}{ev.location}{" · "}{ev.category}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() => setEditing({ title: ev.title, description: ev.description, location: ev.location, eventDate: ev.eventDate.slice(0, 16), category: ev.category, opportunity: ev.opportunity ?? "", imageUrl: ev.imageUrl ?? "", id: ev.id })}
                  className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all hover:-translate-y-0.5"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(ev.id)}
                  disabled={deleting === ev.id}
                  className="grid h-8 w-8 place-items-center rounded-xl bg-red-50 transition-all hover:scale-110"
                >
                  {deleting === ev.id
                    ? <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                    : <Trash2 className="h-4 w-4 text-red-500" />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Messages tab ─────────────────────────────────────────────────────────────

function MessagesTab() {
  const [skip, setSkip] = useState(0);
  const take = 20;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  const { data, isLoading, mutate } = useSWR(
    ["admin-contact-messages", skip],
    () => api.admin.getContactMessages(skip, take),
    { keepPreviousData: true },
  );

  const messages: ContactMessage[] = data?.messages ?? [];
  const total: number = data?.total ?? 0;

  async function resolve(id: string) {
    setResolving(id);
    try {
      await api.admin.resolveContactMessage(id);
      await mutate();
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="space-y-4">
      <span className="text-sm font-semibold text-slate-500">{total} messages total</span>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))
        ) : messages.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={CARD}>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100">
              <Inbox className="h-7 w-7 text-slate-400" />
            </div>
            <p className="mt-4 font-bold text-slate-800">No messages yet</p>
            <p className="mt-1 text-sm text-slate-400">Contact form submissions will appear here.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="overflow-hidden rounded-2xl" style={CARD}>
              <button
                className="flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-slate-50"
                onClick={() => setExpanded(expanded === msg.id ? null : msg.id)}
              >
                <div
                  className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                  style={{ background: msg.status === "new" ? "rgba(127,182,133,0.12)" : "#F1F5F9" }}
                >
                  <Inbox className="h-4 w-4" style={{ color: msg.status === "new" ? "#7FB685" : "#94A3B8" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-black capitalize"
                      style={{
                        background: msg.status === "new" ? "rgba(127,182,133,0.12)" : "#F1F5F9",
                        color: msg.status === "new" ? "#7FB685" : "#94A3B8",
                      }}
                    >
                      {msg.status}
                    </span>
                    <span className="truncate font-bold text-slate-800">{msg.subject}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {msg.name} · {msg.email} · {formatRelativeDate(msg.createdAt)}
                  </p>
                </div>
              </button>

              {expanded === msg.id && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                  <p className="text-sm leading-6 text-slate-600 whitespace-pre-wrap">{msg.message}</p>
                  {msg.status !== "resolved" && (
                    <button
                      onClick={() => resolve(msg.id)}
                      disabled={resolving === msg.id}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 disabled:opacity-60"
                    >
                      {resolving === msg.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Mark resolved
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Pagination skip={skip} take={take} total={total} onPage={setSkip} />
    </div>
  );
}

// ─── Payouts tab ──────────────────────────────────────────────────────────────

const PAYOUT_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  PENDING:    { bg: "bg-amber-50",  text: "text-amber-800" },
  APPROVED:   { bg: "bg-blue-50",   text: "text-blue-800" },
  PROCESSING: { bg: "bg-sky-50",    text: "text-sky-800" },
  COMPLETED:  { bg: "bg-emerald-50", text: "text-emerald-800" },
  FAILED:     { bg: "bg-red-50",    text: "text-red-800" },
  CANCELLED:  { bg: "bg-slate-100", text: "text-slate-600" },
};

function PayoutsTab() {
  const { data: payouts, isLoading, mutate } = useSWR<Payout[]>(
    "admin-all-payouts",
    api.admin.getAllPayouts,
    { fallbackData: [] },
  );
  const [acting, setActing] = useState<string | null>(null);

  async function handleApprove(id: string) {
    setActing(id);
    try { await api.admin.approvePayout(id); await mutate(); } finally { setActing(null); }
  }

  async function handleCancel(id: string) {
    setActing(id);
    try { await api.admin.cancelPayout(id); await mutate(); } finally { setActing(null); }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
      </div>
    );
  }

  if (!payouts || payouts.length === 0) {
    return (
      <div className="rounded-2xl p-10 text-center" style={CARD}>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100">
          <ArrowDownCircle className="h-7 w-7 text-slate-400" />
        </div>
        <p className="mt-4 text-sm font-black text-slate-800">No payouts yet</p>
        <p className="mt-1 text-xs text-slate-400">All seller payout requests will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payouts.map((payout) => {
        const isActing = acting === payout.id;
        const style = PAYOUT_STATUS_STYLE[payout.status] ?? { bg: "bg-slate-100", text: "text-slate-600" };
        return (
          <div key={payout.id} className="rounded-2xl p-4" style={CARD}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-slate-800">{formatCurrency(payout.amount)}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${style.bg} ${style.text}`}>
                    {PAYOUT_STATUS_LABELS[payout.status] ?? payout.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-semibold text-slate-400">
                  {PAYOUT_METHOD_LABELS[payout.payoutMethod] ?? payout.payoutMethod}
                  {payout.orderId ? ` · Order ${payout.orderId.slice(0, 8).toUpperCase()}` : ""}
                  {" · "}{formatRelativeDate(payout.createdAt)}
                </p>
                {(payout as Payout & { failureReason?: string }).failureReason && (
                  <p className="mt-1 text-xs font-semibold text-red-500">
                    ✗ {(payout as Payout & { failureReason?: string }).failureReason}
                  </p>
                )}
              </div>
              {payout.status === "PENDING" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(payout.id)}
                    disabled={isActing}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
                  >
                    {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleCancel(payout.id)}
                    disabled={isActing}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Broadcast tab ────────────────────────────────────────────────────────────

function BroadcastTab() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number } | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);
    try {
      const res = await api.admin.broadcast(title.trim(), message.trim());
      setResult(res);
      setTitle("");
      setMessage("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="rounded-2xl p-6" style={CARD}>
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Broadcast notification</h3>
        <p className="mt-1 text-xs text-slate-400">
          Sends an in-app notification to every registered user immediately.
        </p>
        <form onSubmit={handleSend} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-black text-slate-600">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Platform maintenance tonight at 11 PM"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-black text-slate-600">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
              placeholder="Details of the announcement…"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400"
            />
          </div>
          {result && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              ✓ Sent to {result.sent} users
            </div>
          )}
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
            {sending ? "Sending…" : "Send broadcast"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ skip, take, total, onPage }: { skip: number; take: number; total: number; onPage: (s: number) => void }) {
  const page = Math.floor(skip / take) + 1;
  const pages = Math.ceil(total / take);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between">
      <button
        disabled={page <= 1}
        onClick={() => onPage(skip - take)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" /> Prev
      </button>
      <span className="text-sm font-semibold text-slate-500">Page {page} of {pages}</span>
      <button
        disabled={page >= pages}
        onClick={() => onPage(skip + take)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-40"
      >
        Next <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Sidebar nav config ───────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    label: "Dashboard",
    items: [
      { tab: "overview" as Tab, icon: <LayoutDashboard className="h-4 w-4" />, label: "Overview" },
    ],
  },
  {
    label: "Platform",
    items: [
      { tab: "users" as Tab,     icon: <Users className="h-4 w-4" />,           label: "Users" },
      { tab: "listings" as Tab,  icon: <Package className="h-4 w-4" />,          label: "Listings" },
      { tab: "reports" as Tab,   icon: <AlertTriangle className="h-4 w-4" />,    label: "Reports" },
      { tab: "payouts" as Tab,   icon: <ArrowDownCircle className="h-4 w-4" />,  label: "Payouts" },
    ],
  },
  {
    label: "Content",
    items: [
      { tab: "events" as Tab,    icon: <CalendarDays className="h-4 w-4" />,     label: "Events" },
      { tab: "messages" as Tab,  icon: <Inbox className="h-4 w-4" />,            label: "Messages" },
      { tab: "broadcast" as Tab, icon: <Megaphone className="h-4 w-4" />,        label: "Broadcast" },
    ],
  },
];

const TAB_LABELS: Record<Tab, string> = {
  overview:  "Overview",
  users:     "Users",
  listings:  "Listings",
  reports:   "Reports",
  events:    "Events",
  messages:  "Messages",
  payouts:   "Payouts",
  broadcast: "Broadcast",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  function handleLogout() {
    clearAuthToken();
    router.push("/admin/login");
  }

  return (
    <AdminGate>
      <div className="flex h-screen overflow-hidden bg-slate-50">

        {/* ── Mobile sidebar overlay ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 transition-transform duration-300 ease-out lg:relative lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Brand */}
          <div className="flex items-center gap-3 border-b border-white/8 px-5 py-5">
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
              style={{ background: "linear-gradient(135deg, #7FB685, #5A9460)" }}
            >
              <Shield className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-white">Campus Marche</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Admin Panel</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label} className="mb-5">
                <p className="mb-1.5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map(({ tab: t, icon, label }) => (
                    <button
                      key={t}
                      onClick={() => { setTab(t); setSidebarOpen(false); }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                        tab === t
                          ? "bg-white/10 text-white font-bold"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      }`}
                    >
                      <span
                        className={`shrink-0 transition-colors ${
                          tab === t ? "text-emerald-400" : ""
                        }`}
                      >
                        {icon}
                      </span>
                      {label}
                      {tab === t && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-white/8 px-3 py-3 space-y-0.5">
            <Link
              href="/"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 transition-all hover:bg-white/5 hover:text-slate-200"
            >
              <ExternalLink className="h-4 w-4" />
              View site
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </aside>

        {/* ── Main content area ── */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Topbar */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100 lg:hidden"
              >
                <Menu className="h-5 w-5 text-slate-600" />
              </button>
              <div>
                <p className="text-sm font-black text-slate-800">{TAB_LABELS[tab]}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide"
                style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.15)" }}
              >
                <Shield className="h-3 w-3" /> Admin
              </div>
            </div>
          </header>

          {/* Scrollable content */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-6xl px-5 py-6">
              {tab === "overview"  && <OverviewTab />}
              {tab === "users"     && <UsersTab />}
              {tab === "listings"  && <ListingsTab />}
              {tab === "reports"   && <ReportsTab />}
              {tab === "events"    && <EventsTab />}
              {tab === "messages"  && <MessagesTab />}
              {tab === "payouts"   && <PayoutsTab />}
              {tab === "broadcast" && <BroadcastTab />}
            </div>
          </main>
        </div>
      </div>
    </AdminGate>
  );
}
