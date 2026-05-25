"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useProfile } from "@/hooks/use-api";
import { AuthGate } from "@/components/auth-gate";
import { useToast } from "@/providers/toast-provider";

const AVATAR_EMOJIS = [
  "😊","😎","🤓","🧑‍💻","👨‍🎓","👩‍🎓","🧑‍🏫","👨‍💼","👩‍💼",
  "🦁","🐯","🦊","🐧","🦅","🌟","⚡","🔥","🌿","🎯","🎓",
];

export default function ProfileEditPage() {
  return (
    <AuthGate>
      <EditForm />
    </AuthGate>
  );
}

function EditForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: profile, isLoading, mutate } = useProfile();

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setAvatar(profile.avatar ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast("Name is required."); return; }
    setSaving(true);
    try {
      await api.updateProfile({ name: name.trim(), avatar: avatar.trim(), bio: bio.trim() });
      await mutate();
      setSaved(true);
      toast("Profile updated!");
      setTimeout(() => { setSaved(false); router.push("/profile"); }, 1200);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container-shell flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#7FB685" }} />
      </div>
    );
  }

  return (
    <div className="container-shell max-w-2xl py-8 md:py-10">
      <div className="mb-8 flex items-center gap-3">
        <button onClick={() => router.back()}
          className="grid h-9 w-9 place-items-center rounded-xl transition-colors hover:bg-slate-100"
          style={{ color: "#64748B" }}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#1E293B" }}>Edit profile</h1>
          <p className="text-sm" style={{ color: "#64748B" }}>Update your public profile information</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar preview */}
        <div className="flex items-center gap-5">
          <div className="grid h-20 w-20 place-items-center rounded-2xl text-4xl"
            style={{ background: "linear-gradient(135deg, #0F172A, #1a3a2a)", border: "2px solid rgba(127,182,133,0.30)" }}>
            {avatar || name.charAt(0).toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-sm font-black" style={{ color: "#1E293B" }}>Profile avatar</p>
            <p className="mt-0.5 text-xs" style={{ color: "#64748B" }}>Choose an emoji or type a letter</p>
          </div>
        </div>

        {/* Emoji picker */}
        <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.88)", border: "1px solid rgba(226,232,240,0.70)" }}>
          <p className="mb-3 text-xs font-black uppercase tracking-wide" style={{ color: "#94A3B8" }}>Quick pick</p>
          <div className="flex flex-wrap gap-2">
            {AVATAR_EMOJIS.map((em) => (
              <button key={em} type="button" onClick={() => setAvatar(em)}
                className="grid h-10 w-10 place-items-center rounded-xl text-xl transition-all hover:scale-110"
                style={{
                  background: avatar === em ? "#0F172A" : "rgba(248,245,239,0.80)",
                  border: avatar === em ? "none" : "1px solid rgba(226,232,240,0.70)",
                }}>
                {em}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold" style={{ color: "#64748B" }}>Custom (emoji or 1-2 letters)</label>
            <input type="text" maxLength={4} value={avatar} onChange={(e) => setAvatar(e.target.value)}
              className="w-32 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400/40"
              style={{ background: "#F8FAFC", border: "1px solid rgba(226,232,240,0.80)", color: "#1E293B" }}
              placeholder="🦁 or AB" />
          </div>
        </div>

        {/* Name */}
        <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.88)", border: "1px solid rgba(226,232,240,0.70)" }}>
          <label className="mb-2 block text-sm font-black" style={{ color: "#1E293B" }}>
            Display name <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            maxLength={80} required
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-green-400/40"
            style={{ background: "#F8FAFC", border: "1px solid rgba(226,232,240,0.80)", color: "#1E293B" }}
            placeholder="Your full name" />
          <p className="mt-1.5 text-xs" style={{ color: "#94A3B8" }}>Shown on your profile, listings, and messages</p>
        </div>

        {/* Bio */}
        <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.88)", border: "1px solid rgba(226,232,240,0.70)" }}>
          <label className="mb-2 block text-sm font-black" style={{ color: "#1E293B" }}>Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)}
            maxLength={500} rows={4}
            className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-400/40"
            style={{ background: "#F8FAFC", border: "1px solid rgba(226,232,240,0.80)", color: "#1E293B" }}
            placeholder="Tell buyers a bit about yourself — what you sell, your course, your campus location…" />
          <p className="mt-1.5 flex justify-between text-xs" style={{ color: "#94A3B8" }}>
            <span>Builds trust with buyers</span>
            <span>{bio.length}/500</span>
          </p>
        </div>

        {/* Read-only info */}
        {profile && (
          <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(248,245,239,0.70)", border: "1px solid rgba(226,232,240,0.60)" }}>
            <p className="text-xs font-black uppercase tracking-wide" style={{ color: "#94A3B8" }}>Account info (read-only)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Email", value: profile.email ?? "—" },
                { label: "Account type", value: profile.accountType ?? "—" },
                { label: "Member since", value: profile.joined },
                { label: "Role", value: profile.role ?? "USER" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-semibold" style={{ color: "#94A3B8" }}>{label}</p>
                  <p className="mt-0.5 text-sm font-bold" style={{ color: "#1E293B" }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="flex-1 rounded-2xl px-5 py-3 text-sm font-bold transition-colors"
            style={{ background: "#F1F5F9", color: "#475569" }}>
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
            style={{ background: saved ? "#7FB685" : "#0F172A", boxShadow: "0 6px 20px rgba(15,23,42,0.20)" }}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              : saved ? <><Check className="h-4 w-4" /> Saved!</>
              : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
