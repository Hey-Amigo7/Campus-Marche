"use client";

import { useState } from "react";
import { CheckCircle2, Mail, MapPin, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.submitContact(form);
      setSuccess(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div
        className="relative overflow-hidden py-14 text-white"
        style={{ background: "linear-gradient(135deg, #0F172A 0%, #102542 55%, #1a3a2a 100%)" }}
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(127,182,133,0.20), transparent 65%)" }}
        />
        <div className="container-shell text-center">
          <h1 className="text-4xl font-black tracking-tight">Get in Touch</h1>
          <p className="mt-3 text-lg" style={{ color: "#A8D4AE" }}>
            Have a question, report, or partnership idea? We read every message.
          </p>
        </div>
      </div>

      <div className="container-shell py-14">
        <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-[1fr_1.4fr]">
          {/* Info column */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-black" style={{ color: "#0F172A" }}>Campus Marche Support</h2>
              <p className="mt-3 leading-7" style={{ color: "#64748B" }}>
                We are a small team based at Ho Technical University. We typically respond within 24 hours on business days.
              </p>
            </div>

            {[
              { icon: Mail, label: "Email", value: "campusmarche6@gmail.com" },
              { icon: MapPin, label: "Location", value: "Ho Technical University, Ghana" },
              { icon: MessageSquare, label: "Response time", value: "Within 24 hours (business days)" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-4">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
                  style={{ background: "rgba(127,182,133,0.12)", color: "#5A9460" }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#1E293B" }}>{label}</p>
                  <p className="mt-0.5 text-sm" style={{ color: "#64748B" }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Form column */}
          <div
            className="rounded-2xl p-6 md:p-8"
            style={{
              background: "rgba(255,255,255,0.88)",
              backdropFilter: "blur(20px) saturate(160%)",
              border: "1px solid rgba(226,232,240,0.70)",
              boxShadow: "0 8px 32px rgba(15,23,42,0.08)",
            }}
          >
            {success ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <span
                  className="grid h-16 w-16 place-items-center rounded-full"
                  style={{ background: "rgba(127,182,133,0.15)" }}
                >
                  <CheckCircle2 className="h-8 w-8" style={{ color: "#5A9460" }} />
                </span>
                <h3 className="text-xl font-black" style={{ color: "#0F172A" }}>Message sent!</h3>
                <p className="max-w-xs text-sm leading-6" style={{ color: "#64748B" }}>
                  Thank you for reaching out. We will get back to you within 24 hours.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className="btn-secondary mt-2"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <h3 className="text-lg font-black" style={{ color: "#0F172A" }}>Send us a message</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-bold" style={{ color: "#1E293B" }}>Full name</label>
                    <input
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Ama Mensah"
                      className="input-shell mt-1.5"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold" style={{ color: "#1E293B" }}>Email</label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@htu.edu.gh"
                      className="input-shell mt-1.5"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold" style={{ color: "#1E293B" }}>Subject</label>
                  <select
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    className="input-shell mt-1.5"
                    required
                  >
                    <option value="">Select a topic…</option>
                    <option>General question</option>
                    <option>Report a user or listing</option>
                    <option>Payment issue</option>
                    <option>Account problem</option>
                    <option>Partnership or vendor inquiry</option>
                    <option>Bug report</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold" style={{ color: "#1E293B" }}>Message</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Describe your question or issue in detail…"
                    rows={5}
                    className="input-shell mt-1.5"
                    required
                    minLength={10}
                  />
                </div>

                {error ? (
                  <p className="text-sm font-semibold text-red-600">{error}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-3 text-base font-bold disabled:opacity-60"
                >
                  {loading ? "Sending…" : "Send message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
