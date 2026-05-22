export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <div className="bg-brand-green py-12 text-white">
        <div className="container-shell text-center">
          <h1 className="text-4xl font-black tracking-tight">Get in Touch</h1>
          <p className="mt-3 text-green-100">Have questions? We would love to hear from you.</p>
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

          <form className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
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
