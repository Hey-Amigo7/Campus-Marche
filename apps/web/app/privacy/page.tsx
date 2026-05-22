export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <div className="bg-brand-navy py-12 text-white">
        <div className="container-shell text-center">
          <h1 className="text-4xl font-black tracking-tight">Privacy Policy</h1>
        </div>
      </div>

      <div className="container-shell py-16">
        <div className="mx-auto max-w-2xl space-y-6 text-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-950">1. Information We Collect</h2>
            <p className="mt-2">We collect your name, email, profile information, listings, and transaction history to operate the platform.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-950">2. How We Use Your Information</h2>
            <p className="mt-2">We use your information to facilitate transactions, improve the platform, and communicate with you about your account.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-950">3. Data Security</h2>
            <p className="mt-2">We implement security measures to protect your data. However, no system is completely secure. Use strong passwords and be cautious with personal information.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-950">4. Third-Party Sharing</h2>
            <p className="mt-2">We do not sell your data. We may share information with service providers who help operate the platform under confidentiality agreements.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-950">5. Your Rights</h2>
            <p className="mt-2">You can access, update, or delete your account data at any time through your account settings.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-950">6. Contact Us</h2>
            <p className="mt-2">For privacy concerns, contact: privacy@campusmarche.com</p>
          </div>

          <p className="mt-8 text-sm text-slate-600">Last updated: May 2026</p>
        </div>
      </div>
    </div>
  );
}
