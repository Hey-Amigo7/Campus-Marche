export default function PressPage() {
  return (
    <div className="min-h-screen">
      <div className="bg-brand-navy py-12 text-white">
        <div className="container-shell text-center">
          <h1 className="text-4xl font-black tracking-tight">Press & Media</h1>
        </div>
      </div>

      <div className="container-shell py-16">
        <div className="mx-auto max-w-2xl space-y-8">
          <div>
            <h2 className="text-2xl font-black text-slate-950">About Campus Marche</h2>
            <p className="mt-4 text-slate-700">Campus Marche is a student-led marketplace for buying and selling items on campus. Founded to create a safer, fairer peer-to-peer marketplace for students.</p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-950">Key Facts</h2>
            <ul className="mt-4 space-y-2 text-slate-700">
              <li>• Serving Ho Technical University</li>
              <li>• Student-founded and operated</li>
              <li>• Verified buyer and seller protection</li>
              <li>• Campus-based meetups for safety</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-950">Media Inquiries</h2>
            <p className="mt-4 text-slate-700">For press inquiries, interviews, or media coverage requests, please contact: press@campusmarche.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
