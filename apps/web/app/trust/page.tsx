export default function TrustPage() {
  return (
    <div className="min-h-screen">
      <div className="py-12 text-white" style={{ background: "linear-gradient(135deg, #0F172A 0%, #102542 55%, #1a3a2a 100%)" }}>
        <div className="container-shell text-center">
          <h1 className="text-4xl font-black tracking-tight">Trust &amp; Safety</h1>
          <p className="mt-3" style={{ color: "#A8D4AE" }}>Your safety is our priority</p>
        </div>
      </div>

      <div className="container-shell py-16">
        <div className="mx-auto max-w-2xl space-y-8">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Safe Meetups</h2>
            <p className="mt-4 text-slate-700">Always meet in public campus locations. Never share personal information or arrange off-campus transactions through the app.</p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-950">Verified Accounts</h2>
            <p className="mt-4 text-slate-700">All users verify with their student email. We track seller ratings and buyer feedback to maintain community trust.</p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-950">Payment Security</h2>
            <p className="mt-4 text-slate-700">We recommend cash payments on campus. Never transfer money before inspecting items or meeting sellers.</p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-950">Reporting Issues</h2>
            <p className="mt-4 text-slate-700">Found suspicious activity? Use the report button on user profiles or contact support@campusmarche.com immediately.</p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-950">Community Guidelines</h2>
            <p className="mt-4 text-slate-700">We prohibit illegal items, hate speech, harassment, and spam. Violations result in account suspension or removal.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
