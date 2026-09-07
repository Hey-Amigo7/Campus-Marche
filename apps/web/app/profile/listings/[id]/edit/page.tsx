"use client";

import { ArrowLeft, Camera, Clock, Loader2, Save, Tag, UploadCloud, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { useCategories, useProduct } from "@/hooks/use-api";
import { useToast } from "@/providers/toast-provider";
import { AuthGate } from "@/components/auth-gate";
import type { CategoryName, ProductCondition } from "@/types";

export default function EditListingPage() {
  return (
    <AuthGate>
      <EditListingContent />
    </AuthGate>
  );
}

function formatHour(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

function EditListingContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { toast } = useToast();
  const { data: product, isLoading: productLoading } = useProduct(id);
  const { data: categoriesData } = useCategories();
  const ALL_CATEGORIES = [
    "Electronics", "Textbooks", "Clothing", "Furniture",
    "Notes", "Sports", "Stationery", "Services", "Other",
  ];
  const categories = ALL_CATEGORIES.map(name => ({
    name,
    count: categoriesData?.find(c => c.name === name)?.count ?? 0,
  }));

  const [saving, setSaving]                     = useState(false);
  const [negotiable, setNegotiable]             = useState(true);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage]     = useState(false);
  const [uploadError, setUploadError]           = useState<string | null>(null);
  const [dragOver, setDragOver]                 = useState(false);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Core fields
  const [title, setTitle]           = useState("");
  const [price, setPrice]           = useState("");
  const [category, setCategory]     = useState<CategoryName | "">("");
  const [location, setLocation]     = useState("");
  const [condition, setCondition]   = useState<ProductCondition>("Good");
  const [description, setDescription] = useState("");
  const [tags, setTags]             = useState("");

  // Service availability fields
  const [durationMin, setDurationMin]               = useState(60);
  const [priceType, setPriceType]                   = useState<"session" | "hour">("session");
  const [availableDays, setAvailableDays]           = useState<string[]>(["1", "2", "3", "4", "5"]);
  const [startHour, setStartHour]                   = useState(8);
  const [endHour, setEndHour]                       = useState(18);
  const [maxBookingsPerDay, setMaxBookingsPerDay]   = useState(3);
  const [advanceNoticeHours, setAdvanceNoticeHours] = useState(24);

  const isService = product?.listingType === "service" || product?.category === "Services";

  useEffect(() => {
    if (!product) return;
    setTitle(product.title);
    setPrice(String(product.price));
    setCategory(product.category);
    setLocation(product.location);
    setCondition(product.condition ?? "Good");
    setDescription(product.description);
    setTags(Array.isArray(product.tags) ? product.tags.join(", ") : "");
    setNegotiable(product.negotiable);
    if (product.imageUrl && /^https?:\/\/.+/.test(product.imageUrl)) {
      setUploadedImageUrl(product.imageUrl);
    }
    if (product.availability) {
      const av = product.availability;
      setDurationMin(av.durationMin);
      setPriceType(av.priceType);
      setAvailableDays(av.availableDays.split(",").filter(Boolean));
      setStartHour(av.startHour);
      setEndHour(av.endHour);
      setMaxBookingsPerDay(av.maxBookingsPerDay);
      setAdvanceNoticeHours(av.advanceNoticeHours);
    }
  }, [product]);

  function toggleDay(day: string) {
    setAvailableDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  }

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) { setUploadError("Only image files are allowed."); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadError("Image must be under 5 MB."); return; }
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !price || !category || !location || !description.trim()) {
      toast("Please fill in all required fields.");
      return;
    }
    if (isService && availableDays.length === 0) {
      toast("Please select at least one available day.");
      return;
    }
    if (isService && endHour <= startHour) {
      toast("End time must be after start time.");
      return;
    }
    setSaving(true);
    try {
      await api.updateProduct(id, {
        title: title.trim(),
        price: Number(price),
        category: category as CategoryName,
        location: location.trim(),
        condition: isService ? undefined : condition,
        description: description.trim(),
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        negotiable,
        imageUrl: uploadedImageUrl ?? undefined,
        imageStyle: (category || "other").toLowerCase(),
      });
      if (isService) {
        await api.saveServiceAvailability(id, {
          durationMin,
          priceType,
          availableDays: availableDays.join(","),
          startHour,
          endHour,
          maxBookingsPerDay,
          advanceNoticeHours,
        });
      }
      toast("Listing updated successfully.");
      void mutate("my-listings");
      void mutate(`product-${id}`);
      setTimeout(() => router.push("/profile/listings"), 800);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not update listing.");
    } finally {
      setSaving(false);
    }
  }

  if (productLoading) {
    return (
      <div className="container-shell flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: "var(--green)" }} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-shell py-16 text-center">
        <p className="text-lg font-bold" style={{ color: "var(--on-surface)" }}>Listing not found</p>
        <button onClick={() => router.push("/profile/listings")} className="btn-primary mt-4">
          Back to listings
        </button>
      </div>
    );
  }

  return (
    <div className="container-shell max-w-3xl py-8 md:py-10">
      <div className="mb-8 flex items-center gap-3">
        <button onClick={() => router.back()}
          className="grid h-9 w-9 place-items-center rounded-xl transition-colors"
          style={{ color: "var(--muted)" }}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--on-surface)" }}>
            Edit {isService ? "service" : "listing"}
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {isService ? "Update your service details and availability schedule" : "Update every detail of your listing"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}
        className="rounded-2xl p-5 md:p-7 space-y-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(9,9,11,0.05)" }}>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Title */}
          <label className="md:col-span-2">
            <span className="text-sm font-black" style={{ color: "var(--on-surface)" }}>
              {isService ? "Service name" : "Title"} <span style={{ color: "#EF4444" }}>*</span>
            </span>
            <input value={title} onChange={e => setTitle(e.target.value)}
              required minLength={3}
              placeholder={isService ? "e.g. Maths Tutoring (SHS & University)" : "e.g. Clean HP Pavilion Laptop"}
              className="input-shell mt-2" />
          </label>

          {/* Price */}
          <label>
            <span className="text-sm font-black" style={{ color: "var(--on-surface)" }}>
              Price (GHS) <span style={{ color: "#EF4444" }}>*</span>
            </span>
            <input value={price} onChange={e => setPrice(e.target.value)}
              required type="number" min={0.01} step="0.01" placeholder="0.00"
              className="input-shell mt-2" />
          </label>

          {/* Category */}
          <label>
            <span className="text-sm font-black" style={{ color: "var(--on-surface)" }}>
              Category <span style={{ color: "#EF4444" }}>*</span>
            </span>
            <select value={category} onChange={e => setCategory(e.target.value as CategoryName)}
              required className="input-shell mt-2">
              <option value="">Select category</option>
              {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </label>

          {/* Location */}
          <label>
            <span className="text-sm font-black" style={{ color: "var(--on-surface)" }}>
              {isService ? "Service location" : "Location"} <span style={{ color: "#EF4444" }}>*</span>
            </span>
            <input value={location} onChange={e => setLocation(e.target.value)}
              required placeholder={isService ? "e.g. Library Block A, Room 12" : "e.g. SRC Cafeteria"}
              className="input-shell mt-2" />
          </label>

          {/* Condition — products only */}
          {!isService && (
            <label>
              <span className="text-sm font-black" style={{ color: "var(--on-surface)" }}>Condition</span>
              <select value={condition} onChange={e => setCondition(e.target.value as ProductCondition)}
                className="input-shell mt-2">
                <option>New</option>
                <option>Like new</option>
                <option>Good</option>
                <option>Fair</option>
              </select>
            </label>
          )}

          {/* Service availability fields */}
          {isService && (
            <>
              <div>
                <label className="text-sm font-black" style={{ color: "var(--on-surface)" }}>Session duration</label>
                <select value={durationMin} onChange={e => setDurationMin(Number(e.target.value))} className="input-shell mt-2">
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-black" style={{ color: "var(--on-surface)" }}>Price type</label>
                <select value={priceType} onChange={e => setPriceType(e.target.value as "session" | "hour")} className="input-shell mt-2">
                  <option value="session">Per session</option>
                  <option value="hour">Per hour</option>
                </select>
              </div>

              {/* Available days */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-black" style={{ color: "var(--on-surface)" }}>Available days</label>
                <div className="flex flex-wrap gap-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
                    const val = String(i + 1);
                    const active = availableDays.includes(val);
                    return (
                      <button key={day} type="button" onClick={() => toggleDay(val)}
                        className="rounded-xl px-3.5 py-1.5 text-xs font-black transition-all"
                        style={active
                          ? { background: "var(--green)", color: "#fff", border: "1.5px solid var(--green)" }
                          : { background: "var(--surface-raised)", color: "var(--muted)", border: "1.5px solid var(--border)" }}>
                        {day}
                      </button>
                    );
                  })}
                </div>
                {availableDays.length === 0 && (
                  <p className="mt-1.5 text-xs font-semibold" style={{ color: "#EF4444" }}>Select at least one available day</p>
                )}
              </div>

              {/* Start / end hours */}
              <div>
                <label className="mb-2 block text-sm font-black" style={{ color: "var(--on-surface)" }}>
                  <Clock size={13} className="inline mr-1.5 align-middle" style={{ color: "var(--green)" }} />
                  Start time
                </label>
                <select value={startHour} onChange={e => setStartHour(Number(e.target.value))} className="input-shell">
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>{formatHour(h)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-black" style={{ color: "var(--on-surface)" }}>
                  <Clock size={13} className="inline mr-1.5 align-middle" style={{ color: "var(--green)" }} />
                  End time
                </label>
                <select value={endHour} onChange={e => setEndHour(Number(e.target.value))} className="input-shell">
                  {Array.from({ length: 24 }, (_, h) => h + 1).map(h => (
                    <option key={h} value={h} disabled={h <= startHour}>{formatHour(h)}</option>
                  ))}
                </select>
              </div>

              {/* Max bookings & advance notice */}
              <div>
                <label className="mb-2 block text-sm font-black" style={{ color: "var(--on-surface)" }}>Max bookings per day</label>
                <select value={maxBookingsPerDay} onChange={e => setMaxBookingsPerDay(Number(e.target.value))} className="input-shell">
                  {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? "booking" : "bookings"}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-black" style={{ color: "var(--on-surface)" }}>Advance notice required</label>
                <select value={advanceNoticeHours} onChange={e => setAdvanceNoticeHours(Number(e.target.value))} className="input-shell">
                  <option value={0}>No notice needed</option>
                  <option value={2}>2 hours</option>
                  <option value={6}>6 hours</option>
                  <option value={12}>12 hours</option>
                  <option value={24}>1 day</option>
                  <option value={48}>2 days</option>
                  <option value={72}>3 days</option>
                </select>
              </div>
            </>
          )}

          {/* Description */}
          <label className="md:col-span-2">
            <span className="text-sm font-black" style={{ color: "var(--on-surface)" }}>
              Description <span style={{ color: "#EF4444" }}>*</span>
            </span>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              required rows={5}
              placeholder={isService
                ? "What you offer, your experience, how sessions work, what to bring…"
                : "Describe your item honestly — condition, included extras, pickup info…"}
              className="input-shell mt-2 resize-none" />
          </label>

          {/* Tags */}
          <label className="md:col-span-2">
            <span className="text-sm font-black" style={{ color: "var(--on-surface)" }}>Tags</span>
            <div className="relative mt-2">
              <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--muted)" }} />
              <input value={tags} onChange={e => setTags(e.target.value)}
                placeholder="laptop, coding, hostel" className="input-shell pl-10" />
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--subtle)" }}>Comma-separated</p>
          </label>

          {/* Image upload */}
          <div className="md:col-span-2">
            <span className="text-sm font-black" style={{ color: "var(--on-surface)" }}>
              {isService ? "Service photo" : "Product image"}
            </span>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={e => { const f = e.target.files?.[0]; if (f) void uploadFile(f); e.currentTarget.value = ""; }} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
              className="sr-only"
              onChange={e => { const f = e.target.files?.[0]; if (f) void uploadFile(f); e.currentTarget.value = ""; }} />
            {uploadedImageUrl ? (
              <div className="relative mt-2 overflow-hidden rounded-2xl"
                style={{ border: "1px solid var(--border)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uploadedImageUrl} alt="Preview" className="h-52 w-full object-cover" />
                <button type="button" onClick={() => setUploadedImageUrl(null)}
                  className="absolute right-2 top-2 rounded-full p-1.5 shadow-md"
                  style={{ background: "rgba(255,255,255,0.92)" }}>
                  <X className="h-4 w-4" style={{ color: "var(--on-surface)" }} />
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 rounded-xl px-3 py-1.5 text-xs font-bold shadow-md"
                  style={{ background: "rgba(255,255,255,0.92)", color: "var(--on-surface)" }}>
                  Change image
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className="mt-2 grid min-h-52 w-full place-items-center rounded-2xl border border-dashed p-6 text-center transition-colors"
                style={dragOver
                  ? { borderColor: "var(--green)", background: "rgba(114,204,35,0.06)" }
                  : { borderColor: "var(--border)", background: "var(--surface-raised)" }}>
                {uploadingImage ? (
                  <span className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin" style={{ color: "var(--green)" }} />
                    <span className="text-sm font-black" style={{ color: "var(--on-surface)" }}>Uploading…</span>
                  </span>
                ) : (
                  <span>
                    <UploadCloud className="mx-auto h-10 w-10" style={{ color: "var(--green)" }} />
                    <span className="mt-3 block text-sm font-black" style={{ color: "var(--on-surface)" }}>Drag and drop or click to upload</span>
                    <span className="mt-1 block text-xs font-semibold" style={{ color: "var(--muted)" }}>JPEG, PNG, WebP or GIF — max 5 MB</span>
                  </span>
                )}
              </button>
            )}
            {uploadError && <p className="mt-2 text-xs font-semibold" style={{ color: "#EF4444" }}>{uploadError}</p>}

            {!uploadedImageUrl && (
              <button type="button" onClick={() => cameraInputRef.current?.click()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors"
                style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>
                <Camera size={15} /> Take a photo
              </button>
            )}
          </div>

          {/* Negotiable toggle */}
          <label className="md:col-span-2 flex items-center justify-between gap-4 rounded-2xl p-4 cursor-pointer"
            style={{ border: "1px solid var(--border)", background: "var(--surface-raised)" }}>
            <span>
              <span className="block text-sm font-black" style={{ color: "var(--on-surface)" }}>Allow negotiation</span>
              <span className="block text-sm" style={{ color: "var(--muted)" }}>
                {isService ? "Buyers can discuss the rate before booking." : "Buyers can make a polite offer before meetup."}
              </span>
            </span>
            <input type="checkbox" checked={negotiable} onChange={e => setNegotiable(e.target.checked)}
              className="h-5 w-5 accent-green-600" />
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="rounded-2xl px-6 py-3 text-sm font-bold transition-colors"
            style={{ background: "var(--surface-raised)", color: "var(--muted)", border: "1px solid var(--border)" }}>
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black text-white disabled:opacity-50"
            style={{ background: "var(--green)" }}>
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
