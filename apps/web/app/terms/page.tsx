export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <div className="bg-brand-navy py-12 text-white">
        <div className="container-shell text-center">
          <h1 className="text-4xl font-black tracking-tight">Terms of Service</h1>
        </div>
      </div>

      <div className="container-shell py-16">
        <div className="mx-auto max-w-2xl space-y-6 text-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-950">1. Acceptance of Terms</h2>
            <p className="mt-2">By using Campus Marche, you accept these terms and agree to follow all applicable laws and regulations.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-950">2. User Accounts</h2>
            <p className="mt-2">You are responsible for maintaining the confidentiality of your account. You agree not to share your password or allow unauthorized access.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-950">3. Prohibited Content</h2>
            <p className="mt-2">You may not list illegal items, weapons, controlled substances, or items that violate campus policies. All listings must comply with local laws.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-950">4. User Conduct</h2>
            <p className="mt-2">You agree not to engage in harassment, discrimination, fraud, or misleading practices. Violations may result in account termination.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-950">5. Liability Disclaimer</h2>
            <p className="mt-2">Campus Marche is provided as is. We are not liable for transactions between users or any resulting disputes.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-950">6. Changes to Terms</h2>
            <p className="mt-2">We may update these terms at any time. Continued use of the platform constitutes acceptance of new terms.</p>
          </div>

          <p className="mt-8 text-sm text-slate-600">Last updated: May 2026</p>
        </div>
      </div>
    </div>
  );
}
