import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Campus Marche — how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <div className="bg-brand-navy py-14 text-white">
        <div className="container-shell text-center">
          <h1 className="text-4xl font-black tracking-tight">Privacy Policy</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/60">
            We take your privacy seriously. Here is exactly what we collect and why.
          </p>
        </div>
      </div>

      <div className="container-shell py-16">
        <div className="mx-auto max-w-2xl space-y-10 text-slate-700">

          <Section title="1. Who Is Responsible for Your Data?">
            <p>
              Campus Marche operates as a student marketplace platform for the Ho Technical University
              (HTU) community in Ho, Ghana. When we say "Campus Marche," "we," or "us," we mean the
              operators of this platform. For questions about your data, contact us at{" "}
              <a href="mailto:privacy@campusmarche.com" className="font-semibold text-brand-green hover:underline">privacy@campusmarche.com</a>.
            </p>
          </Section>

          <Section title="2. Data We Collect">
            <p><strong>When you register:</strong></p>
            <ul>
              <li>Name and email address</li>
              <li>Optional phone number (used for account recovery)</li>
              <li>Optional profile photo</li>
            </ul>
            <p className="mt-3"><strong>When you use the platform:</strong></p>
            <ul>
              <li>Listings you create: title, description, price, photos, category</li>
              <li>Messages exchanged with other users (stored encrypted in transit, stored in our database)</li>
              <li>Orders placed and their status</li>
              <li>Payment references and transaction history (no card numbers — payments are processed by Paystack)</li>
              <li>Subscription plan and status</li>
              <li>Reports or contact messages you submit</li>
            </ul>
            <p className="mt-3"><strong>Automatically collected:</strong></p>
            <ul>
              <li>Device type and browser (for debugging and compatibility)</li>
              <li>IP address (for security and fraud prevention)</li>
              <li>Pages visited and features used (aggregated, not profiled individually)</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Data">
            <ul>
              <li>To operate the marketplace: show your listings, process orders, release escrow payments</li>
              <li>To send transactional emails: order confirmations, password resets, admin replies to your contact messages</li>
              <li>To prevent fraud and keep the community safe</li>
              <li>To investigate reports of prohibited content or behaviour</li>
              <li>To improve the platform through aggregated, anonymised usage analytics</li>
            </ul>
            <p className="mt-3">We do not use your data for advertising. We do not sell your data to third parties.</p>
          </Section>

          <Section title="4. Payments and Financial Data">
            <p>
              All payments are processed by <strong>Paystack</strong>, a PCI-DSS–compliant payment processor.
              Campus Marche never sees, stores, or transmits your card number, MoMo PIN, or bank credentials.
              We store only the payment reference, amount, and status that Paystack provides to us.
              Paystack&apos;s own privacy policy governs the data they handle.
            </p>
          </Section>

          <Section title="5. Data Sharing">
            <p>We share data only in these limited circumstances:</p>
            <ul>
              <li>
                <strong>With Paystack</strong> — your email is passed to Paystack when initialising a payment
                so they can send a receipt. No other financial data is shared beyond what Paystack requires.
              </li>
              <li>
                <strong>With other users</strong> — your public profile (name, avatar, verified status,
                listings) is visible to anyone on the platform. Your email and phone number are never
                publicly shown.
              </li>
              <li>
                <strong>With hosting and infrastructure providers</strong> — our servers and database are
                hosted on cloud infrastructure. These providers operate under confidentiality obligations
                and do not use your data independently.
              </li>
              <li>
                <strong>If required by law</strong> — we may disclose data if required by a Ghanaian court
                order or law enforcement authority.
              </li>
            </ul>
          </Section>

          <Section title="6. Data Retention">
            <p>
              We retain your account data for as long as your account is active. If you delete your account,
              your personal details (name, email, phone) are anonymised immediately — your transaction history
              is retained in anonymised form to preserve financial audit records, as required by law.
              Messages in conversations are retained for the lifetime of the conversation; deleting your account
              does not remove messages from your counterpart&apos;s view.
            </p>
          </Section>

          <Section title="7. Security">
            <p>
              Passwords are hashed using bcrypt and are never stored or transmitted in plain text.
              Communications between your browser and our servers use TLS encryption.
              Authentication tokens expire after 7 days.
              We apply rate limiting and input validation to defend against common attacks.
            </p>
            <p className="mt-3">
              No system is perfectly secure. If you discover a security vulnerability, please report it
              responsibly to{" "}
              <a href="mailto:security@campusmarche.com" className="font-semibold text-brand-green hover:underline">security@campusmarche.com</a>.
            </p>
          </Section>

          <Section title="8. Your Rights">
            <ul>
              <li><strong>Access:</strong> You can view and export your listings, orders, and profile data from your account settings.</li>
              <li><strong>Correction:</strong> Update your name, email, phone, and profile photo any time in Settings.</li>
              <li><strong>Deletion:</strong> Delete your account from Settings → Danger Zone. Anonymisation happens immediately.</li>
              <li><strong>Portability:</strong> Contact us if you need a structured export of your personal data.</li>
              <li><strong>Complaints:</strong> If you believe we have handled your data unlawfully, you may contact us or refer the matter to the relevant data protection authority in Ghana.</li>
            </ul>
          </Section>

          <Section title="9. Cookies and Local Storage">
            <p>
              Campus Marche uses browser local storage (not third-party cookies) to store your authentication
              token and user preferences such as theme and PWA install state. We do not use tracking pixels
              or third-party analytics cookies.
            </p>
          </Section>

          <Section title="10. Children">
            <p>
              Campus Marche is not directed at children under 16. We do not knowingly collect data from
              anyone under 16. If you believe a minor has created an account, contact us immediately.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. Material changes will be announced
              in-app at least 7 days before they take effect. The date at the bottom of this page
              always shows when it was last updated.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              Privacy questions or data requests:{" "}
              <a href="mailto:privacy@campusmarche.com" className="font-semibold text-brand-green hover:underline">privacy@campusmarche.com</a>
              {" "}or use our{" "}
              <a href="/contact" className="font-semibold text-brand-green hover:underline">contact form</a>.
            </p>
          </Section>

          <p className="border-t border-slate-100 pt-6 text-xs text-slate-400">Last updated: September 2026</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <div className="mt-3 space-y-2 text-sm leading-7 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </div>
  );
}
