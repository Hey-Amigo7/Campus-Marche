import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Campus Marche — the student marketplace for Ho Technical University.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <div className="bg-brand-navy py-14 text-white">
        <div className="container-shell text-center">
          <h1 className="text-4xl font-black tracking-tight">Terms of Service</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/60">
            Please read these terms carefully before using Campus Marche.
          </p>
        </div>
      </div>

      <div className="container-shell py-16">
        <div className="mx-auto max-w-2xl space-y-10 text-slate-700">

          <Section title="1. Who We Are">
            <p>
              Campus Marche is a student-to-student and student-to-vendor marketplace platform
              operated for the benefit of the Ho Technical University (HTU) community in Ho, Ghana.
              By creating an account or using any part of the platform you agree to these Terms of Service.
            </p>
          </Section>

          <Section title="2. Eligibility">
            <p>
              You must be at least 16 years old to use Campus Marche. By using the platform you confirm
              that you are a current student, staff member, or trusted local vendor affiliated with Ho
              Technical University, or a guest browsing listings. We reserve the right to require
              proof of affiliation at any time.
            </p>
          </Section>

          <Section title="3. Accounts">
            <ul>
              <li>You are responsible for keeping your password confidential and for all activity under your account.</li>
              <li>You must provide accurate information when registering. Do not impersonate another person.</li>
              <li>Accounts are personal and non-transferable.</li>
              <li>We may suspend or permanently ban accounts that violate these Terms.</li>
            </ul>
          </Section>

          <Section title="4. Listings and Products">
            <ul>
              <li>You may list physical goods, digital items, and campus services that are legal under Ghanaian law and HTU campus policy.</li>
              <li>
                <strong>Prohibited listings include (but are not limited to):</strong> weapons, illegal drugs or controlled substances,
                counterfeit or stolen goods, pirated software or academic material, services that violate HTU regulations,
                items that facilitate illegal activity.
              </li>
              <li>Listing prices must be honest. Bait-and-switch pricing is not permitted.</li>
              <li>We reserve the right to remove any listing without notice.</li>
            </ul>
          </Section>

          <Section title="5. Transactions, Payments, and Escrow">
            <p>
              Campus Marche uses an escrow model for paid transactions. When a buyer pays, funds are
              held securely until the buyer confirms receipt of the item or service.
            </p>
            <ul>
              <li>
                A <strong>service fee</strong> (currently 2.5 %, subject to change) is added to the buyer&apos;s payment
                to cover the cost of escrow protection and platform operations. Sellers receive their full listed price.
              </li>
              <li>All card and mobile money payments are processed securely by Paystack. Campus Marche does not store card numbers.</li>
              <li>
                Funds are released to the seller only after buyer confirmation or after a review period expires.
                If a dispute is raised, funds may be held pending resolution.
              </li>
              <li>Campus Marche facilitates transactions but is not a party to the contract between buyer and seller.</li>
            </ul>
          </Section>

          <Section title="6. Premium Plans and Subscriptions">
            <p>
              Optional paid plans (Daily Boost, Seller Pro, Featured) unlock additional features.
              Subscriptions are billed in Ghanaian cedis (GHS) and renew automatically unless cancelled.
              Cancel any time from your profile — your features remain active until the end of the paid period.
              No refunds are issued for unused portions of a subscription period.
            </p>
          </Section>

          <Section title="7. User Conduct">
            <p>You agree not to:</p>
            <ul>
              <li>Harass, threaten, or discriminate against any other user.</li>
              <li>Post false or misleading information about products, prices, or your identity.</li>
              <li>Attempt to circumvent the escrow system or conduct off-platform transactions to avoid fees after using our messaging or matchmaking.</li>
              <li>Use automated bots, scrapers, or scripts without written permission.</li>
              <li>Attempt to access, modify, or disrupt the platform&apos;s technical systems.</li>
            </ul>
          </Section>

          <Section title="8. Intellectual Property">
            <p>
              All platform code, design, branding, and non-user content is owned by Campus Marche or its licensors.
              You retain ownership of content you post (listings, photos, messages) and grant Campus Marche a
              non-exclusive licence to display and distribute it solely to operate the service.
            </p>
          </Section>

          <Section title="9. Privacy">
            <p>
              Your use of Campus Marche is also governed by our{" "}
              <a href="/privacy" className="font-semibold text-brand-green hover:underline">Privacy Policy</a>,
              which describes how we collect, use, and protect your personal data.
            </p>
          </Section>

          <Section title="10. Disclaimers and Limitation of Liability">
            <p>
              Campus Marche is provided <strong>as is</strong> without warranties of any kind.
              We do not guarantee the accuracy of listings, the quality of goods or services, or the
              conduct of any user. To the maximum extent permitted by law, Campus Marche and its
              operators shall not be liable for any indirect, incidental, or consequential damages
              arising from transactions between users, disputes, or platform downtime.
            </p>
            <p className="mt-3">
              Campus Marche is not responsible for items lost, damaged, or not delivered.
              We encourage buyers to inspect goods before confirming receipt.
            </p>
          </Section>

          <Section title="11. Dispute Resolution">
            <p>
              If a dispute arises between buyer and seller, either party may contact support
              at <a href="mailto:support@campusmarche.com" className="font-semibold text-brand-green hover:underline">support@campusmarche.com</a>.
              Campus Marche may, at its sole discretion, mediate disputes and determine the outcome of
              any held escrow funds. Decisions made by Campus Marche in good faith are final.
            </p>
          </Section>

          <Section title="12. Changes to These Terms">
            <p>
              We may update these Terms at any time. Material changes will be announced in-app.
              Continued use of Campus Marche after changes are posted constitutes acceptance of the updated Terms.
            </p>
          </Section>

          <Section title="13. Governing Law">
            <p>
              These Terms are governed by the laws of the Republic of Ghana.
              Any disputes shall be subject to the jurisdiction of Ghanaian courts.
            </p>
          </Section>

          <Section title="14. Contact">
            <p>
              Questions about these Terms?{" "}
              <a href="/contact" className="font-semibold text-brand-green hover:underline">Contact us</a> or
              email <a href="mailto:support@campusmarche.com" className="font-semibold text-brand-green hover:underline">support@campusmarche.com</a>.
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
