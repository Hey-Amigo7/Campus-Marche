"use client";

import { ImagePlus, Loader2, Plus, Tag, UploadCloud, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { DragEvent, FormEvent, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { BoostProductModal } from "@/components/modal";
import { PremiumUpsellCard } from "@/components/premium";
import { SectionHeading } from "@/components/ui";
import { useToast } from "@/providers/toast-provider";
import { AuthGate } from "@/components/auth-gate";
import { useBusiness, useCategories } from "@/hooks/use-api";
import type { BusinessProfile } from "@/types";

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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-slate-950">MoMo payout</h3>
        <button onClick={() => setOpen((v) => !v)} className="text-xs font-bold hover:underline" style={{ color: "#5A9460" }}>
          {open ? "Cancel" : configured ? "Edit" : "Set up"}
        </button>
      </div>
      {!open ? (
        configured ? (
          <p className="mt-2 text-sm font-semibold text-slate-600">
            {business.momoProvider?.toUpperCase()} · {business.momoPhone}
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            Add your MoMo details so buyers can pay and you receive funds automatically on delivery confirmation.
          </p>
        )
      ) : (
        <form onSubmit={handleSave} className="mt-3 space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700">Provider</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className="input-shell mt-1 text-sm">
              <option value="">— Select —</option>
              <option value="mtn">MTN Mobile Money</option>
              <option value="vod">Telecel Cash</option>
              <option value="tgo">AirtelTigo Money</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">MoMo phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0244 123 456"
              className="input-shell mt-1 text-sm"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full justify-center text-sm disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save payout details
          </button>
        </form>
      )}
    </div>
  );
}

export default function SellPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [negotiable, setNegotiable] = useState(true);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if (!file.type.startsWith("image/")) {
      setUploadError("Only image files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5 MB.");
      return;
    }

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
      setUploadedImageUrl(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) void uploadFile(file);
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
        condition: String(form.get("condition")) as never,
        tags: String(form.get("tags")).split(",").map((tag) => tag.trim()).filter(Boolean),
        negotiable,
        imageUrl: uploadedImageUrl ?? (String(form.get("imageUrl") || "") || undefined),
        imageStyle: String(form.get("category") || "Other").toLowerCase(),
      });

      toast("Listing published successfully. Redirecting to marketplace...");
      setTimeout(() => router.push("/products"), 900);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not publish listing.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGate>
    <div className="container-shell py-8 md:py-10">
      <SectionHeading title="Sell a product or service" subtitle="Create a trusted listing for campus items, tutoring, hair styling, repairs, design work, and Ho-area student businesses." />
      {businessLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-600 shadow-sm">Checking your business profile...</div>
      ) : !business ? (
        <form onSubmit={handleBusinessSubmit} className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Create your business profile first</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Buyer accounts can browse and order immediately. To sell products or services, create a business profile so students know who they are dealing with.
          </p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label>
              <span className="text-sm font-black text-slate-950">Business or service name</span>
              <input name="name" required placeholder="e.g. Ama Campus Braids" className="input-shell mt-2" />
            </label>
            <label>
              <span className="text-sm font-black text-slate-950">Business type</span>
              <select name="type" required className="input-shell mt-2">
                <option>Student business</option>
                <option>Teacher service</option>
                <option>Local vendor</option>
              </select>
            </label>
            <label>
              <span className="text-sm font-black text-slate-950">Location</span>
              <input name="location" required placeholder="HTU campus, Ho market, hostel area..." className="input-shell mt-2" />
            </label>
            <label>
              <span className="text-sm font-black text-slate-950">Phone or WhatsApp</span>
              <input name="phone" placeholder="+233..." className="input-shell mt-2" />
            </label>
            <label className="md:col-span-2">
              <span className="text-sm font-black text-slate-950">What do you offer?</span>
              <textarea name="description" rows={4} placeholder="Tutoring, hair styling, food delivery, repairs, products, design services..." className="input-shell mt-2 resize-none" />
            </label>
            <div className="md:col-span-2 rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-black text-slate-950">MoMo payout details <span className="font-semibold text-slate-400">(optional)</span></p>
              <p className="mt-1 text-xs text-slate-500">When buyers release escrow, funds are automatically sent to this number.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="text-xs font-bold text-slate-700">Provider</span>
                  <select name="momoProvider" className="input-shell mt-1">
                    <option value="">— Select provider —</option>
                    <option value="mtn">MTN Mobile Money</option>
                    <option value="vod">Telecel Cash</option>
                    <option value="tgo">AirtelTigo Money</option>
                  </select>
                </label>
                <label>
                  <span className="text-xs font-bold text-slate-700">MoMo phone</span>
                  <input name="momoPhone" type="tel" placeholder="0244 123 456" className="input-shell mt-1" />
                </label>
              </div>
            </div>
          </div>
          <button type="submit" disabled={businessLoadingSave} className="btn-primary mt-6 w-full justify-center bg-brand-green hover:bg-green-700">
            {businessLoadingSave ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            Create business profile
          </button>
        </form>
      ) : (
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className="text-sm font-black text-slate-950">Title</span>
              <input name="title" required minLength={3} placeholder="e.g. Clean HP Pavilion Laptop" className="input-shell mt-2" />
            </label>
            <label>
              <span className="text-sm font-black text-slate-950">Price</span>
              <input name="price" required type="number" min={1} placeholder="GHS" className="input-shell mt-2" />
            </label>
            <label>
              <span className="text-sm font-black text-slate-950">Category</span>
              <select name="category" required className="input-shell mt-2">
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.name} value={category.name}>{category.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm font-black text-slate-950">Location</span>
              <input name="location" required placeholder="e.g. SRC Cafeteria" className="input-shell mt-2" />
            </label>
            <label>
              <span className="text-sm font-black text-slate-950">Condition</span>
              <select name="condition" required className="input-shell mt-2">
                <option>New</option>
                <option>Like new</option>
                <option>Good</option>
                <option>Fair</option>
              </select>
            </label>
            <label className="md:col-span-2">
              <span className="text-sm font-black text-slate-950">Description</span>
              <textarea name="description" required rows={5} placeholder="Mention condition, pickup or service details, availability, included items, and any known issues." className="input-shell mt-2 resize-none" />
            </label>
            <label className="md:col-span-2">
              <span className="text-sm font-black text-slate-950">Image URL</span>
              <input name="imageUrl" type="url" placeholder="https://example.com/photo.jpg" className="input-shell mt-2" />
            </label>
            <label className="md:col-span-2">
              <span className="text-sm font-black text-slate-950">Tags</span>
              <div className="relative mt-2">
                <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input name="tags" placeholder="laptop, coding, hostel" className="input-shell pl-10" />
              </div>
            </label>
            <div className="md:col-span-2">
              <span className="text-sm font-black text-slate-950">Product image</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f); }}
              />
              {uploadedImageUrl ? (
                <div className="relative mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <Image src={uploadedImageUrl} alt="Product preview" width={640} height={320} className="h-52 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setUploadedImageUrl(null)}
                    className="absolute right-2 top-2 rounded-full bg-white/90 p-1 shadow hover:bg-white"
                  >
                    <X className="h-4 w-4 text-slate-700" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`mt-2 grid min-h-52 w-full place-items-center rounded-2xl border border-dashed p-6 text-center transition-colors ${dragOver ? "border-brand-green bg-green-50" : "border-slate-300 bg-slate-50 hover:border-brand-green hover:bg-green-50/40"}`}
                >
                  {uploadingImage ? (
                    <span className="flex flex-col items-center gap-3">
                      <Loader2 className="h-10 w-10 animate-spin text-brand-green" />
                      <span className="text-sm font-black text-slate-950">Uploading...</span>
                    </span>
                  ) : (
                    <span>
                      <UploadCloud className="mx-auto h-10 w-10 text-brand-green" />
                      <span className="mt-3 block text-sm font-black text-slate-950">Drag and drop or click to upload</span>
                      <span className="mt-1 block text-xs font-semibold text-slate-500">JPEG, PNG, WebP or GIF — max 5 MB</span>
                    </span>
                  )}
                </button>
              )}
              {uploadError ? <p className="mt-2 text-xs font-semibold text-red-600">{uploadError}</p> : null}
              {!uploadedImageUrl && (
                <p className="mt-2 text-xs text-slate-500">
                  Or paste a URL below instead of uploading a file
                </p>
              )}
              <ImagePlus className="sr-only" />
            </div>
            <label className="md:col-span-2 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
              <span>
                <span className="block text-sm font-black text-slate-950">Allow negotiation</span>
                <span className="block text-sm text-slate-500">Buyers can make a polite offer before meetup.</span>
              </span>
              <input type="checkbox" checked={negotiable} onChange={(event) => setNegotiable(event.target.checked)} className="h-5 w-5 accent-green-600" />
            </label>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              Publish listing
            </button>
            <button type="button" onClick={() => setBoostOpen(true)} className="btn-secondary flex-1">Boost Listing</button>
          </div>
        </form>
        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Selling as</p>
            <h3 className="mt-2 text-xl font-black text-slate-950">{business.name}</h3>
            <p className="mt-1 text-sm font-semibold text-brand-green">{business.type}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{business.description || "Business profile ready for listings."}</p>
          </div>
          <MomoPayoutPanel business={business} onSaved={refreshBusiness} />
          <PremiumUpsellCard />
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-black text-slate-950">Listing quality checklist</h3>
            <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
              <p>Clear price and condition</p>
              <p>Safe campus meetup point</p>
              <p>Honest photos and description</p>
              <p>Fast reply after students message you</p>
            </div>
          </div>
        </aside>
      </div>
      )}
      <BoostProductModal open={boostOpen} onClose={() => setBoostOpen(false)} />
    </div>
    </AuthGate>
  );
}
