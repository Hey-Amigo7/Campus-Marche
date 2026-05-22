export default function HelpPage() {
  return (
    <div className="min-h-screen">
      <div className="bg-brand-navy py-12 text-white">
        <div className="container-shell text-center">
          <h1 className="text-4xl font-black tracking-tight">Help Center</h1>
          <p className="mt-3 text-blue-100">Find answers to common questions</p>
        </div>
      </div>

      <div className="container-shell py-16">
        <div className="mx-auto max-w-2xl space-y-8">
          <div>
            <h3 className="text-lg font-bold text-slate-950">How do I buy an item?</h3>
            <p className="mt-2 text-slate-700">Browse products, add items to your cart, and arrange a safe meetup with the seller on campus.</p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-950">How do I sell items?</h3>
            <p className="mt-2 text-slate-700">Click Sell, add product details and photos, set your price, and wait for interested buyers to contact you.</p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-950">Is my account secure?</h3>
            <p className="mt-2 text-slate-700">We use verified student emails and secure authentication to protect your account. Never share your password.</p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-950">What if I have an issue?</h3>
            <p className="mt-2 text-slate-700">Contact our support team at support@campusmarche.com or use the help option in your account menu.</p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-950">Is there a fee?</h3>
            <p className="mt-2 text-slate-700">Browsing and buying are free. Sellers can list items free or choose premium features for enhanced visibility.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
