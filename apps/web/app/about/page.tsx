export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <div className="bg-brand-navy py-12 text-white">
        <div className="container-shell text-center">
          <h1 className="text-4xl font-black tracking-tight">About Campus Marche</h1>
        </div>
      </div>

      <div className="container-shell py-16">
        <div className="mx-auto max-w-2xl space-y-8">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Our Mission</h2>
            <p className="mt-4 text-slate-700">Campus Marche is dedicated to creating a safer, calmer marketplace for students. We believe in community-driven commerce built on trust.</p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-950">Built for Students</h2>
            <p className="mt-4 text-slate-700">By students, for students. Campus Marche was created to solve real campus marketplace challenges with thoughtful design and genuine care.</p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-950">What We Value</h2>
            <ul className="mt-4 space-y-2 text-slate-700">
              <li>✓ Safe, verified student transactions</li>
              <li>✓ Fair pricing and transparency</li>
              <li>✓ Campus-first community focus</li>
              <li>✓ Trust and reliability</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
