"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Check, CheckCircle2, Loader2,
  Package, ShoppingBag, Store, Tag, X,
} from "lucide-react";
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { useToast } from "@/providers/toast-provider";
import { AuthGate } from "@/components/auth-gate";
import { useBusiness, useCategories } from "@/hooks/use-api";
import { AnimatedUploadCloud, AnimatedLoader } from "@/components/animated-icons";

const snap  = { type: "spring", stiffness: 380, damping: 22 } as const;
const slide = { type: "spring", stiffness: 300, damping: 30 } as const;
const MAX_IMAGES = 4;

type Step = "welcome" | "business" | "listing" | "done";

/* ── Step indicator ────────────────────────────────────────────── */
const STEPS: { key: Step; label: string }[] = [
  { key: "welcome",  label: "Welcome"  },
  { key: "business", label: "Your store" },
  { key: "listing",  label: "First listing" },
  { key: "done",     label: "Done!" },
];

function StepBar({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.key === current);
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const done   = i < idx;
        const active = i === idx;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black transition-all"
                style={
                  done   ? { background: "var(--green)", color: "#fff" } :
                  active ? { background: "#0F172A", color: "var(--green)", border: "2px solid var(--green)" } :
                           { background: "var(--surface-raised)", color: "var(--muted)", border: "1px solid var(--border)" }
                }
              >
                {done ? <Check size={12} /> : i + 1}
              </div>
              <span className="hidden text-[10px] font-semibold sm:block" style={{ color: active ? "var(--on-surface)" : "var(--muted)" }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="mb-4 h-px w-8 flex-shrink-0 sm:w-12" style={{ background: done ? "var(--green)" : "var(--border)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Image uploader (mini) ─────────────────────────────────────── */
function ImageUploader({ images, onAdd, onRemove, uploading }: {
  images: string[];
  onAdd: (f: File) => void;
  onRemove: (i: number) => void;
  uploading: boolean;
}) {
  const canAdd = images.length < MAX_IMAGES;
  return (
    <div>
      <label className="mb-1.5 block text-sm font-black" style={{ color: "var(--on-surface)" }}>
        Photos <span className="font-normal text-xs" style={{ color: "var(--muted)" }}>(optional)</span>
      </label>
      <div className="grid grid-cols-4 gap-2">
        <AnimatePresence mode="popLayout">
          {images.map((url, i) => (
            <motion.div key={url} layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }} transition={snap}
              className="relative aspect-square overflow-hidden rounded-xl"
              style={{ border: i === 0 ? "2px solid var(--green)" : "1px solid var(--border)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => onRemove(i)}
                className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full shadow"
                style={{ background: "rgba(9,9,11,0.72)" }}>
                <X size={9} className="text-white" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {canAdd && (
          <label className="aspect-square cursor-pointer">
            <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp"
              onChange={e => { const f = e.target.files?.[0]; if (f) onAdd(f); }} />
            <div className="grid h-full w-full place-items-center rounded-xl border border-dashed transition-colors hover:border-[var(--green)]"
              style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
              {uploading ? <AnimatedLoader size={20} color="var(--green)" /> : <AnimatedUploadCloud size={20} color="var(--green)" />}
            </div>
          </label>
        )}
      </div>
    </div>
  );
}

/* ── Skip link ─────────────────────────────────────────────────── */
function SkipLink({ to, label = "Skip for now" }: { to: string; label?: string }) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.push(to)}
      className="text-xs font-semibold transition-colors hover:underline" style={{ color: "var(--muted)" }}>
      {label}
    </button>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("welcome");

  const { data: business, mutate: refreshBusiness } = useBusiness();
  const { data: categoriesData } = useCategories();
  const ALL_CATEGORIES = [
    "Electronics", "Textbooks", "Clothing", "Furniture",
    "Notes", "Sports", "Stationery", "Services", "Other",
  ];
  const categories = ALL_CATEGORIES.map(name => ({
    name,
    count: categoriesData?.find(c => c.name === name)?.count ?? 0,
  }));

  // Business form state
  const [bizSaving, setBizSaving] = useState(false);

  // Listing form state
  const [listingType, setListingType] = useState<"product" | "service">("product");
  const [negotiable, setNegotiable] = useState(true);
  const [rawPrice, setRawPrice] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [listingSaving, setListingSaving] = useState(false);

  // If user already has a business, skip straight to listing step
  if (business && step === "welcome") setStep("listing");
  if (business && step === "business") setStep("listing");

  async function uploadImage(file: File) {
    if (file.size > 5 * 1024 * 1024) { toast("Image must be under 5 MB."); return; }
    setUploadingImage(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
      const token = getAuthToken();
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${apiBase}/uploads/image`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = (await res.json()) as { url: string };
      setImages(prev => [...prev, data.url]);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleBusinessSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBizSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      await api.saveBusiness({
        name: String(form.get("name")),
        type: String(form.get("type")) as never,
        location: String(form.get("location")),
        description: String(form.get("description") || ""),
        phone: String(form.get("phone") || ""),
      });
      await refreshBusiness();
      setStep("listing");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save business profile.");
    } finally {
      setBizSaving(false);
    }
  }

  async function handleListingSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setListingSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      await api.createProduct({
        title: String(form.get("title")),
        price: Number(form.get("price")),
        category: String(form.get("category")) as never,
        location: String(form.get("location")),
        description: String(form.get("description")),
        condition: listingType === "product" ? String(form.get("condition")) as never : undefined,
        negotiable,
        listingType,
        imageUrls: images.length > 0 ? images : undefined,
        imageUrl: images[0] ?? undefined,
        imageStyle: String(form.get("category") || "Other").toLowerCase(),
        tags: [],
      } as never);
      setStep("done");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not publish listing.");
    } finally {
      setListingSaving(false);
    }
  }

  return (
    <AuthGate>
      <div className="min-h-screen" style={{ background: "var(--background)" }}>

        {/* Header */}
        <div className="relative overflow-hidden py-10 text-white"
          style={{ background: "linear-gradient(135deg, #0F172A 0%, #102542 55%, #1a3a2a 100%)" }}>
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(114,204,35,0.18), transparent 65%)" }} />
          <div className="container-shell">
            <div className="mb-6">
              <StepBar current={step} />
            </div>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">
              {step === "welcome"  && "Welcome to Campus Marche"}
              {step === "business" && "Set up your store"}
              {step === "listing"  && "Add your first listing"}
              {step === "done"     && "You're all set!"}
            </h1>
            <p className="mt-2 text-sm leading-6" style={{ color: "#94A3B8" }}>
              {step === "welcome"  && "Tell us what you'd like to do — you can always change this later."}
              {step === "business" && "Buyers need to know who they're dealing with. Takes 60 seconds."}
              {step === "listing"  && "List your first product or service and start earning."}
              {step === "done"     && "Your listing is live. Start selling on campus!"}
            </p>
          </div>
        </div>

        <div className="container-shell py-8">
          <AnimatePresence mode="wait">

            {/* ── Welcome ─────────────────────────────────────────── */}
            {step === "welcome" && (
              <motion.div key="welcome"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }} transition={slide}
                className="mx-auto max-w-xl space-y-4"
              >
                {/* Sell option */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={snap}
                  onClick={() => setStep("business")}
                  className="w-full rounded-2xl p-6 text-left transition-all"
                  style={{ background: "var(--surface)", border: "2px solid var(--green)" }}
                >
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
                      style={{ background: "rgba(114,204,35,0.12)" }}>
                      <Store size={22} style={{ color: "var(--green)" }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-black" style={{ color: "var(--on-surface)" }}>
                        I want to sell on campus
                      </p>
                      <p className="mt-1 text-sm leading-5" style={{ color: "var(--muted)" }}>
                        Set up your seller profile and publish your first listing in minutes.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {["Products", "Services", "Textbooks", "Food"].map(tag => (
                          <span key={tag} className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                            style={{ background: "rgba(114,204,35,0.10)", color: "var(--green)" }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ArrowRight size={18} style={{ color: "var(--green)" }} className="mt-1 shrink-0" />
                  </div>
                </motion.button>

                {/* Browse option */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={snap}
                  onClick={() => router.push("/products")}
                  className="w-full rounded-2xl p-6 text-left transition-all"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
                      style={{ background: "var(--surface-raised)" }}>
                      <ShoppingBag size={22} style={{ color: "var(--muted)" }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-black" style={{ color: "var(--on-surface)" }}>
                        I just want to browse and buy
                      </p>
                      <p className="mt-1 text-sm leading-5" style={{ color: "var(--muted)" }}>
                        Skip setup and explore listings right away. You can start selling anytime later.
                      </p>
                    </div>
                    <ArrowRight size={18} style={{ color: "var(--muted)" }} className="mt-1 shrink-0" />
                  </div>
                </motion.button>
              </motion.div>
            )}

            {/* ── Business setup ───────────────────────────────────── */}
            {step === "business" && (
              <motion.div key="business"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }} transition={slide}
                className="mx-auto max-w-2xl"
              >
                <form onSubmit={handleBusinessSubmit}
                  className="rounded-2xl p-6 space-y-5"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(9,9,11,0.06)" }}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-black" style={{ color: "var(--on-surface)" }}>
                        Business / seller name
                      </label>
                      <input name="name" required placeholder="e.g. Ama Campus Braids" className="input-shell" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-black" style={{ color: "var(--on-surface)" }}>Type</label>
                      <select name="type" required className="input-shell">
                        <option>Student business</option>
                        <option>Teacher service</option>
                        <option>Local vendor</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-black" style={{ color: "var(--on-surface)" }}>Location</label>
                      <input name="location" required placeholder="HTU campus, Ho market…" className="input-shell" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-black" style={{ color: "var(--on-surface)" }}>WhatsApp / phone</label>
                      <input name="phone" type="tel" placeholder="+233 244 123 456" className="input-shell" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-sm font-black" style={{ color: "var(--on-surface)" }}>What do you offer?</label>
                      <textarea name="description" rows={3}
                        placeholder="Tutoring, hair styling, food delivery, repairs, design services…"
                        className="input-shell resize-none" />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <motion.button type="submit" disabled={bizSaving}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={snap}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white disabled:opacity-50"
                      style={{ background: "var(--green)" }}>
                      {bizSaving ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                      Continue
                    </motion.button>
                    <SkipLink to="/products" label="Skip setup" />
                  </div>
                </form>
              </motion.div>
            )}

            {/* ── First listing ────────────────────────────────────── */}
            {step === "listing" && (
              <motion.div key="listing"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }} transition={slide}
                className="mx-auto max-w-2xl"
              >
                {/* Type toggle */}
                <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-2xl p-1.5"
                  style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
                  {(["product", "service"] as const).map(t => (
                    <motion.button key={t} type="button" onClick={() => setListingType(t)}
                      whileTap={{ scale: 0.97 }} transition={snap}
                      className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-black transition-colors"
                      style={listingType === t
                        ? { background: "var(--on-surface)", color: "var(--background)" }
                        : { color: "var(--muted)" }}>
                      {t === "product" ? <Package size={14} /> : <Tag size={14} />}
                      {t === "product" ? "Product" : "Service"}
                    </motion.button>
                  ))}
                </div>

                <form onSubmit={handleListingSubmit}
                  className="rounded-2xl p-6 space-y-5"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(9,9,11,0.06)" }}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-sm font-black" style={{ color: "var(--on-surface)" }}>
                        {listingType === "product" ? "What are you selling?" : "What service do you offer?"}
                      </label>
                      <input name="title" required minLength={3}
                        placeholder={listingType === "product" ? "e.g. Clean HP Pavilion Laptop" : "e.g. Maths Tutoring (SHS & University)"}
                        className="input-shell" />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-black" style={{ color: "var(--on-surface)" }}>Price (GHS)</label>
                      <input name="price" required type="number" min={1} step="0.01" placeholder="0.00"
                        value={rawPrice} onChange={e => setRawPrice(e.target.value)} className="input-shell" />
                      {(() => {
                        const p = parseFloat(rawPrice);
                        if (!rawPrice || isNaN(p) || p <= 0) return null;
                        const serviceFee = Math.round(p * 0.025 * 100) / 100;
                        return (
                          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                            You receive GHS {p.toFixed(2)} · buyer pays GHS {(p + serviceFee).toFixed(2)} (includes 2.5% service fee)
                          </p>
                        );
                      })()}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-black" style={{ color: "var(--on-surface)" }}>Category</label>
                      <select name="category" required className="input-shell">
                        <option value="">Select category</option>
                        {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-black" style={{ color: "var(--on-surface)" }}>Meetup / service location</label>
                      <input name="location" required placeholder="e.g. SRC Cafeteria" className="input-shell" />
                    </div>

                    {listingType === "product" && (
                      <div>
                        <label className="mb-1.5 block text-sm font-black" style={{ color: "var(--on-surface)" }}>Condition</label>
                        <select name="condition" required className="input-shell">
                          <option>New</option>
                          <option>Like new</option>
                          <option>Good</option>
                          <option>Fair</option>
                        </select>
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-sm font-black" style={{ color: "var(--on-surface)" }}>Description</label>
                      <textarea name="description" required rows={3}
                        placeholder={listingType === "product"
                          ? "Condition details, what's included, pickup arrangements…"
                          : "What you offer, your experience, availability…"}
                        className="input-shell resize-none" />
                    </div>

                    <div className="md:col-span-2">
                      <ImageUploader images={images} onAdd={uploadImage} onRemove={i => setImages(p => p.filter((_, j) => j !== i))} uploading={uploadingImage} />
                    </div>

                    {/* Negotiable toggle */}
                    <label className="md:col-span-2 flex cursor-pointer items-center justify-between gap-4 rounded-2xl p-4"
                      style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
                      <span>
                        <span className="block text-sm font-black" style={{ color: "var(--on-surface)" }}>Allow negotiation</span>
                        <span className="block text-xs" style={{ color: "var(--muted)" }}>Buyers can make a polite offer before meetup.</span>
                      </span>
                      <button type="button" role="switch" aria-checked={negotiable}
                        onClick={() => setNegotiable(v => !v)}
                        className="relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200"
                        style={{ background: negotiable ? "var(--green)" : "var(--border)" }}>
                        <motion.span animate={{ x: negotiable ? 26 : 2 }} transition={snap}
                          className="absolute top-1 left-0 h-4 w-4 rounded-full bg-white shadow-sm" />
                      </button>
                    </label>
                  </div>

                  <div className="flex items-center gap-4">
                    <motion.button type="submit" disabled={listingSaving}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={snap}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white disabled:opacity-50"
                      style={{ background: "var(--green)" }}>
                      {listingSaving ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                      Publish listing
                    </motion.button>
                    <SkipLink to="/products" label="Skip for now" />
                  </div>
                </form>
              </motion.div>
            )}

            {/* ── Done ─────────────────────────────────────────────── */}
            {step === "done" && (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }} transition={slide}
                className="mx-auto max-w-md text-center"
              >
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                  className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl"
                  style={{ background: "rgba(114,204,35,0.12)", border: "2px solid rgba(114,204,35,0.30)" }}
                >
                  <CheckCircle2 size={38} style={{ color: "var(--green)" }} />
                </motion.div>

                <h2 className="text-2xl font-black" style={{ color: "var(--on-surface)" }}>Listing is live!</h2>
                <p className="mt-3 text-sm leading-6" style={{ color: "var(--muted)" }}>
                  Students on campus can now find and contact you. You can manage all your listings from the Sell page anytime.
                </p>

                <div className="mt-8 flex flex-col gap-3">
                  <motion.button type="button"
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={snap}
                    onClick={() => router.push("/sell")}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white"
                    style={{ background: "var(--green)" }}>
                    <Store size={15} /> Go to my store
                  </motion.button>
                  <button type="button" onClick={() => router.push("/products")}
                    className="text-sm font-semibold transition-colors hover:underline" style={{ color: "var(--muted)" }}>
                    Browse the marketplace
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </AuthGate>
  );
}
