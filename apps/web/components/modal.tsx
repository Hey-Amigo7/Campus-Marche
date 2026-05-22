"use client";

import { X } from "lucide-react";
import { PremiumUpsellCard } from "@/components/premium";

export function BoostProductModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/40 p-4 sm:place-items-center">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">Boost Listing</h2>
            <p className="mt-1 text-sm text-slate-600">Choose how long your product should stay promoted.</p>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100" aria-label="Close modal">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5">
          <PremiumUpsellCard compact />
        </div>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
          <button onClick={onClose} className="btn-secondary flex-1">Maybe later</button>
          <button onClick={onClose} className="btn-primary flex-1">Continue</button>
        </div>
      </div>
    </div>
  );
}
