export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <div className="py-12 text-white" style={{ background: "linear-gradient(135deg, #0F172A 0%, #102542 55%, #1a3a2a 100%)" }}>
        <div className="container-shell text-center">
          <h1 className="text-4xl font-black tracking-tight">Get in Touch</h1>
          <p className="mt-3" style={{ color: "#A8D4AE" }}>Have questions? We would love to hear from you.</p>
        </div>
      </div>

      <div className="container-shell py-16">
        <div className="mx-auto max-w-md space-y-8">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Email</h2>
            <p className="mt-2 text-slate-700">support@campusmarche.com</p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Address</h2>
            <p className="mt-2 text-slate-700">Ho Technical University, Ghana</p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Response Time</h2>
            <p className="mt-2 text-slate-700">We typically respond within 24 hours during business days.</p>
          </div>

          <form className="space-y-4 rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(18px)", border: "1px solid rgba(226,232,240,0.70)", boxShadow: "0 4px 24px rgba(15,23,42,0.07)" }}>
            <input type="text" placeholder="Your name" className="input-shell" />
            <input type="email" placeholder="Your email" className="input-shell" />
            <textarea placeholder="Your message" rows={5} className="input-shell" />
            <button type="submit" className="btn-primary w-full">Send message</button>
          </form>
        </div>
      </div>
    </div>
  );
}
