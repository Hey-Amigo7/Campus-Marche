"use client";

import { ImagePlus, Loader2, Save, Tag, UploadCloud, X, ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { useCategories, useProduct } from "@/hooks/use-api";
import { useToast } from "@/providers/toast-provider";
import { AuthGate } from "@/components/auth-gate";
import type { ProductCondition, CategoryName } from "@/types";

export default function EditListingPage() {
  return (
    <AuthGate>
      <EditListingContent />
    </AuthGate>
  );
}

function EditListingContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { data: product, isLoading: productLoading } = useProduct(id);
  const { data: categoriesData } = useCategories();
  const categories = categoriesData ?? [];

  const [saving, setSaving] = useState(false);
  const [negotiable, setNegotiable] = useState(true);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill state from fetched product
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<CategoryName | "">("");
  const [location, setLocation] = useState("");
  const [condition, setCondition] = useState<ProductCondition>("Good");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [manualImageUrl, setManualImageUrl] = useState("");

  useEffect(() => {
    if (product) {
      setTitle(product.title);
      setPrice(String(product.price));
      setCategory(product.category);
      setLocation(product.location);
      setCondition(product.condition);
      setDescription(product.description);
      setTags(Array.isArray(product.tags) ? product.tags.join(", ") : "");
      setNegotiable(product.negotiable);
      if (product.imageUrl) {
        setUploadedImageUrl(product.imageUrl);
      }
    }
  }, [product]);

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !price || !category || !location || !description.trim()) {
      toast("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      await api.updateProduct(id, {
        title: title.trim(),
        price: Number(price),
        category: category as CategoryName,
        location: location.trim(),
        condition,
        description: description.trim(),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        negotiable,
        imageUrl: uploadedImageUrl ?? (manualImageUrl.trim() || undefined),
        imageStyle: (category || "other").toLowerCase(),
      });
      toast("Listing updated successfully.");
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
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#7FB685" }} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-shell py-16 text-center">
        <p className="text-lg font-bold" style={{ color: "#1E293B" }}>Listing not found</p>
        <button onClick={() => router.push("/profile/listings")} className="btn-primary mt-4">
          Back to listings
        </button>
      </div>
    );
  }

  const currentImage = uploadedImageUrl;

  return (
    <div className="container-shell max-w-3xl py-8 md:py-10">
      <div className="mb-8 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="grid h-9 w-9 place-items-center rounded-xl transition-colors hover:bg-slate-100"
          style={{ color: "#64748B" }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#1E293B" }}>Edit listing</h1>
          <p className="text-sm" style={{ color: "#64748B" }}>Update every detail of your listing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}
        className="rounded-2xl p-5 md:p-7"
        style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(18px)", border: "1px solid rgba(226,232,240,0.70)", boxShadow: "0 4px 24px rgba(15,23,42,0.07)" }}
      >
        <div className="grid gap-5 md:grid-cols-2">
          {/* Title */}
          <label className="md:col-span-2">
            <span className="text-sm font-black text-slate-950">Title <span className="text-red-500">*</span></span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required minLength={3}
              placeholder="e.g. Clean HP Pavilion Laptop"
              className="input-shell mt-2"
            />
          </label>

          {/* Price */}
          <label>
            <span className="text-sm font-black text-slate-950">Price (GHS) <span className="text-red-500">*</span></span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required type="number" min={1}
              placeholder="GHS"
              className="input-shell mt-2"
            />
          </label>

          {/* Category */}
          <label>
            <span className="text-sm font-black text-slate-950">Category <span className="text-red-500">*</span></span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryName)}
              required className="input-shell mt-2"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </label>

          {/* Location */}
          <label>
            <span className="text-sm font-black text-slate-950">Location <span className="text-red-500">*</span></span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required placeholder="e.g. SRC Cafeteria"
              className="input-shell mt-2"
            />
          </label>

          {/* Condition */}
          <label>
            <span className="text-sm font-black text-slate-950">Condition</span>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as ProductCondition)}
              className="input-shell mt-2"
            >
              <option>New</option>
              <option>Like new</option>
              <option>Good</option>
              <option>Fair</option>
            </select>
          </label>

          {/* Description */}
          <label className="md:col-span-2">
            <span className="text-sm font-black text-slate-950">Description <span className="text-red-500">*</span></span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required rows={5}
              placeholder="Describe your item honestly — condition, included extras, pickup info…"
              className="input-shell mt-2 resize-none"
            />
          </label>

          {/* Tags */}
          <label className="md:col-span-2">
            <span className="text-sm font-black text-slate-950">Tags</span>
            <div className="relative mt-2">
              <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="laptop, coding, hostel"
                className="input-shell pl-10"
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">Comma-separated</p>
          </label>

          {/* Image upload */}
          <div className="md:col-span-2">
            <span className="text-sm font-black text-slate-950">Product image</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f); }}
            />
            {currentImage ? (
              <div className="relative mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentImage} alt="Product preview" className="h-52 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setUploadedImageUrl(null)}
                  className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow-md hover:bg-white"
                >
                  <X className="h-4 w-4 text-slate-700" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-md hover:bg-white"
                >
                  Change image
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className="mt-2 grid min-h-52 w-full place-items-center rounded-2xl border border-dashed p-6 text-center transition-colors"
                style={dragOver
                  ? { borderColor: "#7FB685", background: "rgba(223,243,227,0.35)" }
                  : { borderColor: "rgba(226,232,240,0.80)", background: "rgba(248,245,239,0.50)" }}
              >
                {uploadingImage ? (
                  <span className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#7FB685" }} />
                    <span className="text-sm font-black text-slate-950">Uploading…</span>
                  </span>
                ) : (
                  <span>
                    <UploadCloud className="mx-auto h-10 w-10" style={{ color: "#7FB685" }} />
                    <span className="mt-3 block text-sm font-black text-slate-950">Drag and drop or click to upload</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-500">JPEG, PNG, WebP or GIF — max 5 MB</span>
                  </span>
                )}
              </button>
            )}
            {uploadError && <p className="mt-2 text-xs font-semibold text-red-600">{uploadError}</p>}

            {!currentImage && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">Or paste an image URL</p>
                <input
                  type="url"
                  value={manualImageUrl}
                  onChange={(e) => setManualImageUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="input-shell text-sm"
                />
                <ImagePlus className="sr-only" />
              </div>
            )}
          </div>

          {/* Negotiable toggle */}
          <label className="md:col-span-2 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
            <span>
              <span className="block text-sm font-black text-slate-950">Allow negotiation</span>
              <span className="block text-sm text-slate-500">Buyers can make a polite offer before meetup.</span>
            </span>
            <input
              type="checkbox"
              checked={negotiable}
              onChange={(e) => setNegotiable(e.target.checked)}
              className="h-5 w-5 accent-green-600"
            />
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="rounded-2xl px-6 py-3 text-sm font-bold transition-colors"
            style={{ background: "#F1F5F9", color: "#475569" }}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
