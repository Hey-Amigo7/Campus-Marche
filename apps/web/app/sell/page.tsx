"use client";

import { CalendarCheck, Check, CheckCircle2, Loader2, Package, Plus, Tag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { DragEvent, FormEvent, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { BoostProductModal } from "@/components/modal";
import { SubscriptionBox } from "@/components/subscription-box";
import { useToast } from "@/providers/toast-provider";
import { AuthGate } from "@/components/auth-gate";
import { useBusiness, useCategories } from "@/hooks/use-api";
import { AnimatedUploadCloud, AnimatedLoader, AnimatedImagePlus } from "@/components/animated-icons";
import { FadeUp } from "@/components/motion-primitives";
import type { BusinessProfile } from "@/types";

const snap = { type: "spring", stiffness: 380, damping: 22 } as const;
const MAX_IMAGES = 6;

/* ── MoMo payout panel ───────────────────────────────────────────── */
function MomoPayoutPanel({ business, onSaved }: { business: BusinessProfile; onSaved: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState(business.momoProvider ?? "");
  const [phone, setPhone] = useState(business.momoPhone ?? "");

  async function handleSave(e: FormEvent) {
    e.preventDefault();
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
      setOpen(false);
      toast("Payout details saved.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save payout details.");
    } finally {
      setSaving(false);
    }
  }

  const configured = business.momoProvider && business.momoPhone;

  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black" style={{ color: "var(--on-surface)" }}>MoMo payout</h3>
          {configured && (
            <p className="mt-0.5 text-xs font-semibold" style={{ color: "var(--green)" }}>
              {business.momoProvider?.toUpperCase()} · {business.momoPhone}
            </p>
          )}
        </div>
        <button type="button" onClick={() => setOpen(v => !v)}
          className="text-xs font-bold transition-colors hover:underline" style={{ color: "var(--green)" }}>
          {open ? "Cancel" : configured ? "Edit" : "Set up"}
        </button>
      </div>

      {!open && !configured && (
        <p className="mt-2 text-xs leading-5" style={{ color: "var(--muted)" }}>
          Add your MoMo details so funds are automatically sent when buyers confirm delivery.
        </p>
      )}

      <AnimatePresence>
        {open && (
          <motion.form
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            onSubmit={handleSave} className="overflow-hidden"
          >
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold" style={{ color: "var(--on-surface)" }}>Provider</label>
                <select value={provider} onChange={e => setProvider(e.target.value)} className="input-shell text-sm">
                  <option value="">— Select —</option>
                  <option value="mtn">MTN Mobile Money</option>
                  <option value="vod">Telecel Cash</option>
                  <option value="tgo">AirtelTigo Money</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold" style={{ color: "var(--on-surface)" }}>MoMo phone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="0244 123 456" className="input-shell text-sm" />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full justify-center text-sm disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}
                Save payout details
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Multi-image uploader ─────────────────────────────────────────── */
function MultiImageUploader({ images, onAdd, onRemove, uploading, uploadError }: {
  images: string[];
  onAdd: (file: File) => void;
  onRemove: (index: number) => void;
  uploading: boolean;
  uploadError: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const canAddMore = images.length < MAX_IMAGES;

  function handleDrop(e: DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onAdd(file);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-black" style={{ color: "var(--on-surface)" }}>Product photos</span>
        <span className="text-xs font-semibold" style={{ color: "var(--subtle)" }}>
          {images.length}/{MAX_IMAGES} · first photo is the cover
        </span>
      </div>

      <label htmlFor="product-photo-input" className="sr-only">Upload product photo</label>
      <input id="product-photo-input" ref={fileInputRef} type="file"
        accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only"
        onChange={e => { const f = e.target.files?.[0]; if (f) onAdd(f); }} />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {images.map((url, i) => (
            <motion.div key={url} layout
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }} transition={snap}
              className="relative aspect-square overflow-hidden rounded-xl"
              style={{ border: i === 0 ? "2px solid var(--green)" : "1px solid var(--border)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute bottom-1 left-1 rounded-md px-1.5 py-0.5 text-[9px] font-black text-white"
                  style={{ background: "var(--green)" }}>Cover</span>
              )}
              <motion.button type="button" onClick={() => onRemove(i)}
                whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} transition={snap}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full shadow-md"
                style={{ background: "rgba(9,9,11,0.72)", backdropFilter: "blur(4px)" }}>
                <X size={11} className="text-white" />
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>

        {canAddMore && (
          <motion.div key="upload-slot" layout initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }} transition={snap} className="aspect-square">
            <button type="button" onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              disabled={uploading}
              className="grid h-full w-full place-items-center rounded-xl border border-dashed transition-colors disabled:opacity-60"
              style={dragOver
                ? { borderColor: "var(--green)", background: "rgba(114,204,35,0.08)" }
                : { borderColor: "var(--border)", background: "var(--surface-raised)" }}
            >
              {uploading ? <AnimatedLoader size={24} color="var(--green)" />
                : images.length === 0 ? (
                  <span className="flex flex-col items-center gap-1.5 p-2 text-center">
                    <AnimatedUploadCloud size={28} color="var(--green)" />
                    <span className="text-[10px] font-black leading-tight" style={{ color: "var(--on-surface)" }}>Drop or click</span>
                    <span className="text-[9px] font-semibold" style={{ color: "var(--subtle)" }}>JPEG · PNG · WebP</span>
                  </span>
                ) : (
                  <span className="flex flex-col items-center gap-1">
                    <AnimatedImagePlus size={22} color="var(--green)" />
                    <span className="text-[10px] font-black" style={{ color: "var(--on-surface)" }}>Add photo</span>
                  </span>
                )}
            </button>
          </motion.div>
        )}
      </div>

      {images.length === 0 && !uploading && (
        <p className="mt-2 text-xs" style={{ color: "var(--subtle)" }}>
          Up to {MAX_IMAGES} photos. More photos = faster sales. Max 5 MB each.
        </p>
      )}
      {uploadError && <p className="mt-2 text-xs font-semibold" style={{ color: "#EF4444" }}>{uploadError}</p>}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function SellPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [listingType, setListingType] = useState<"product" | "service">("product");
  const [negotiable, setNegotiable] = useState(true);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { data: business, mutate: refreshBusiness, isLoading: businessLoading } = useBusiness();
  const { data: categoriesData } = useCategories();
  const categories = categoriesData ?? [];
  const [businessLoadingSave, setBusinessLoadingSave] = useState(false);

  async function handleBusinessSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusinessLoadingSave(true);
    const form = new FormData(event.currentTarget);
    try {
      await api.saveBusiness({
        name: String(form.get("name")),
        type: String(form.get("type")) as never,
        location: String(form.get("location")),
        description: String(form.get("description") || ""),
        phone: String(form.get("phone") || ""),
        momoProvider: String(form.get("momoProvider") || "") || undefined,
        momoPhone: String(form.get("momoPhone") || "") || undefined,
      });
      await refreshBusiness();
      toast("Business profile created. You can now publish listings.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not create business profile.");
    } finally {
      setBusinessLoadingSave(false);
    }
  }

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) { setUploadError("Only image files are allowed."); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadError("Image must be under 5 MB."); return; }
    if (uploadedImageUrls.length >= MAX_IMAGES) { setUploadError(`Maximum ${MAX_IMAGES} photos allowed.`); return; }
    setUploadError(null);
    setUploadingImage(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
      const token = getAuthToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${apiBase}/uploads/image`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? "Upload failed");
      }
      const data = (await res.json()) as { url: string };
      setUploadedImageUrls(prev => [...prev, data.url]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  }

  function removeImage(index: number) {
    setUploadedImageUrls(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      await api.createProduct({
        title: String(form.get("title")),
        price: Number(form.get("price")),
        category: String(form.get("category")) as never,
        location: String(form.get("location")),
        description: String(form.get("description")),
        condition: listingType === "product" ? String(form.get("condition")) as never : undefined,
        tags: String(form.get("tags")).split(",").map(t => t.trim()).filter(Boolean),
        negotiable,
        listingType,
        imageUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
        imageUrl: uploadedImageUrls[0] ?? undefined,
        imageStyle: String(form.get("category") || "Other").toLowerCase(),
      } as never);
      toast("Listing published! Redirecting to marketplace…");
      setTimeout(() => router.push("/products"), 900);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not publish listing.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGate>
      <div className="min-h-screen" style={{ background: "var(--background)" }}>

        {/* Hero header */}
        <div className="relative overflow-hidden py-12 text-white"
          style={{ background: "linear-gradient(135deg, #0F172A 0%, #102542 55%, #1a3a2a 100%)" }}>
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(114,204,35,0.18), transparent 65%)" }} />
          <div className="container-shell">
            <p className="mb-2 text-xs font-black uppercase tracking-widest" style={{ color: "#72CC23" }}>
              Marketplace
            </p>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">Sell on Campus Marche</h1>
            <p className="mt-3 max-w-lg text-base leading-7" style={{ color: "#94A3B8" }}>
              List products, offer services, and reach every student on campus.
            </p>
          </div>
        </div>

        <div className="container-shell py-8 md:py-10">
          {businessLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={32} className="animate-spin" style={{ color: "var(--green)" }} />
            </div>

          ) : !business ? (
            /* ── Business setup ── */
            <FadeUp>
              <div className="mx-auto max-w-2xl">
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-black" style={{ color: "var(--on-surface)" }}>Set up your seller profile</h2>
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--muted)" }}>
                    Buyers need to know who they&apos;re dealing with. Take 60 seconds to create your seller identity.
                  </p>
                </div>
                <form onSubmit={handleBusinessSubmit}
                  className="rounded-2xl p-6 space-y-5"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(9,9,11,0.06)" }}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-black" style={{ color: "var(--on-surface)" }}>
                        Business or service name
                      </label>
                      <input name="name" required placeholder="e.g. Ama Campus Braids" className="input-shell" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-black" style={{ color: "var(--on-surface)" }}>Business type</label>
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
                      <label className="mb-1.5 block text-sm font-black" style={{ color: "var(--on-surface)" }}>Phone / WhatsApp</label>
                      <input name="phone" placeholder="+233 244 123 456" className="input-shell" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-sm font-black" style={{ color: "var(--on-surface)" }}>What do you offer?</label>
                      <textarea name="description" rows={3}
                        placeholder="Tutoring, hair styling, food delivery, repairs, design services…"
                        className="input-shell resize-none" />
                    </div>

                    {/* MoMo inline */}
                    <div className="md:col-span-2 rounded-2xl p-4 space-y-3"
                      style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
                      <div>
                        <p className="text-sm font-black" style={{ color: "var(--on-surface)" }}>
                          MoMo payout <span className="font-medium" style={{ color: "var(--subtle)" }}>(optional)</span>
                        </p>
                        <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
                          Funds are sent automatically when buyers confirm delivery.
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-bold" style={{ color: "var(--muted)" }}>Provider</label>
                          <select name="momoProvider" className="input-shell text-sm">
                            <option value="">— Select provider —</option>
                            <option value="mtn">MTN Mobile Money</option>
                            <option value="vod">Telecel Cash</option>
                            <option value="tgo">AirtelTigo Money</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold" style={{ color: "var(--muted)" }}>MoMo phone</label>
                          <input name="momoPhone" type="tel" placeholder="0244 123 456" className="input-shell text-sm" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <motion.button type="submit" disabled={businessLoadingSave}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={snap}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white disabled:opacity-50"
                    style={{ background: "var(--green)" }}>
                    {businessLoadingSave ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Create seller profile
                  </motion.button>
                </form>
              </div>
            </FadeUp>

          ) : (
            /* ── Listing form ── */
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <FadeUp>
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(9,9,11,0.05)" }}>

                  {/* Listing type toggle */}
                  <div className="p-5 pb-0">
                    <div className="grid grid-cols-2 gap-1.5 rounded-2xl p-1.5"
                      style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
                      {(["product", "service"] as const).map(type => (
                        <motion.button key={type} type="button" onClick={() => setListingType(type)}
                          whileTap={{ scale: 0.97 }} transition={snap}
                          className="relative flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-black transition-colors"
                          style={listingType === type
                            ? { background: "var(--on-surface)", color: "var(--background)" }
                            : { color: "var(--muted)" }}
                        >
                          {type === "product" ? <Package size={15} /> : <CalendarCheck size={15} />}
                          {type === "product" ? "Product" : "Service"}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="p-5 space-y-5">
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
                        <label className="mb-1.5 block text-sm font-black" style={{ color: "var(--on-surface)" }}>
                          Price (GHS)
                        </label>
                        <input name="price" required type="number" min={1} placeholder="0.00" className="input-shell" />
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
                        <textarea name="description" required rows={4}
                          placeholder={listingType === "product"
                            ? "Condition details, what's included, pickup arrangements, any known issues…"
                            : "What you offer, your experience, availability, how to book…"}
                          className="input-shell resize-none" />
                      </div>

                      {/* Photos */}
                      <div className="md:col-span-2">
                        <MultiImageUploader
                          images={uploadedImageUrls}
                          onAdd={uploadFile}
                          onRemove={removeImage}
                          uploading={uploadingImage}
                          uploadError={uploadError}
                        />
                      </div>

                      {/* Tags */}
                      <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-black" style={{ color: "var(--on-surface)" }}>Tags</label>
                        <div className="relative">
                          <Tag size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
                          <input name="tags" placeholder="laptop, coding, hostel" className="input-shell pl-9" />
                        </div>
                        <p className="mt-1 text-xs" style={{ color: "var(--subtle)" }}>Comma-separated · helps buyers find you</p>
                      </div>

                      {/* Negotiable toggle */}
                      <label className="md:col-span-2 flex cursor-pointer items-center justify-between gap-4 rounded-2xl p-4"
                        style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
                        <span>
                          <span className="block text-sm font-black" style={{ color: "var(--on-surface)" }}>Allow negotiation</span>
                          <span className="block text-xs" style={{ color: "var(--muted)" }}>
                            Buyers can make a polite offer before meetup.
                          </span>
                        </span>
                        <button type="button" role="switch" aria-checked={negotiable}
                          onClick={() => setNegotiable(v => !v)}
                          className="relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200"
                          style={{ background: negotiable ? "var(--green)" : "var(--border)" }}>
                          <motion.span animate={{ x: negotiable ? 20 : 2 }} transition={snap}
                            className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm" />
                        </button>
                      </label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <motion.button type="submit" disabled={loading}
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={snap}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white disabled:opacity-50"
                        style={{ background: "var(--green)" }}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Publish listing
                      </motion.button>
                      <motion.button type="button" onClick={() => setBoostOpen(true)}
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={snap}
                        className="rounded-2xl px-5 text-sm font-bold transition-colors"
                        style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--on-surface)" }}>
                        Boost
                      </motion.button>
                    </div>
                  </form>
                </div>
              </FadeUp>

              {/* ── Sidebar ── */}
              <aside className="space-y-4">
                {/* Selling as */}
                <FadeUp delay={0.05}>
                  <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--subtle)" }}>Selling as</p>
                    <h3 className="mt-2 text-lg font-black" style={{ color: "var(--on-surface)" }}>{business.name}</h3>
                    <p className="text-xs font-semibold" style={{ color: "var(--green)" }}>{business.type}</p>
                    {business.description && (
                      <p className="mt-2 text-sm leading-5 line-clamp-3" style={{ color: "var(--muted)" }}>
                        {business.description}
                      </p>
                    )}
                  </div>
                </FadeUp>

                {/* MoMo payout */}
                <FadeUp delay={0.08}>
                  <MomoPayoutPanel business={business} onSaved={refreshBusiness} />
                </FadeUp>

                {/* Subscription */}
                <FadeUp delay={0.11}>
                  <SubscriptionBox />
                </FadeUp>

                {/* Quality checklist */}
                <FadeUp delay={0.14}>
                  <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <p className="text-sm font-black" style={{ color: "var(--on-surface)" }}>Listing quality tips</p>
                    <ul className="mt-3 space-y-2.5">
                      {[
                        "Clear price and condition",
                        "Safe campus meetup point",
                        "Honest photos and description",
                        "Reply fast after students message you",
                      ].map(tip => (
                        <li key={tip} className="flex items-start gap-2 text-xs font-semibold" style={{ color: "var(--muted)" }}>
                          <CheckCircle2 size={13} className="mt-0.5 shrink-0" style={{ color: "var(--green)" }} />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeUp>
              </aside>
            </div>
          )}
        </div>
      </div>

      <BoostProductModal open={boostOpen} onClose={() => setBoostOpen(false)} />
    </AuthGate>
  );
}
