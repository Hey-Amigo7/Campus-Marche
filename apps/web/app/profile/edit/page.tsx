"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, User } from "lucide-react";
import { api } from "@/lib/api";
import { useProfile } from "@/hooks/use-api";
import { useToast } from "@/providers/toast-provider";

export default function ProfileEditPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: profile, mutate } = useProfile();

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setAvatar(profile.avatar ?? "");
    }
  }, [profile]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateProfile({ name: name.trim(), avatar: avatar.trim() || undefined });
      await mutate();
      toast("Profile updated successfully.");
      router.push("/profile");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not update profile.");
    } finally {
      setLoading(false);
    }
  }

  const initials = name.trim().charAt(0).toUpperCase() || "?";
  const isImageUrl = avatar.startsWith("http") || avatar.startsWith("/");

  return (
    <div className="container-shell py-10">
      <Link href="/profile" className="btn-ghost mb-6 inline-flex items-center gap-2 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to profile
      </Link>

      <div className="mx-auto max-w-lg">
        <div className="card p-8">
          <h1 className="text-2xl font-black text-slate-900">Edit profile</h1>
          <p className="mt-1 text-sm text-slate-500">Update your name and avatar.</p>

          {/* Avatar preview */}
          <div className="mt-6 flex items-center gap-5">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-black text-white shadow-md shadow-indigo-200/50">
              {isImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="Avatar preview" className="h-full w-full object-cover" />
              ) : (
                avatar || initials
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Avatar preview</p>
              <p className="mt-0.5 text-xs text-slate-400">Enter a single emoji, letter, or image URL below</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-900">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="input-shell mt-2"
                required
                minLength={2}
                maxLength={80}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900">
                Avatar <span className="font-normal text-slate-400">(emoji, letter, or image URL)</span>
              </label>
              <div className="relative mt-2">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="😊 or https://..."
                  className="input-shell pl-9"
                  maxLength={200}
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">Leave blank to use your initial.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 justify-center py-3"
              >
                {loading ? "Saving…" : "Save changes"}
              </button>
              <Link href="/profile" className="btn-secondary px-6 py-3">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
