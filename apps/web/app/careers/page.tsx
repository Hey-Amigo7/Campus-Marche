import Link from "next/link";
import { BriefcaseBusiness, GraduationCap, HeartHandshake } from "lucide-react";
import { SectionHeading } from "@/components/ui";

const roles = [
  {
    icon: GraduationCap,
    title: "Campus ambassadors",
    body: "Help students list better items, report suspicious activity, and keep marketplace standards high.",
  },
  {
    icon: HeartHandshake,
    title: "Trust support volunteers",
    body: "Support safe meetup education and help the team improve buyer and seller guidance.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Vendor partnerships",
    body: "Work with local vendors who want to serve students responsibly without crowding the marketplace.",
  },
];

export default function CareersPage() {
  return (
    <div className="container-shell py-8 md:py-10">
      <SectionHeading
        title="Careers"
        subtitle="Campus Marche is growing with student operators, community-minded volunteers, and local partnership support."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <article key={role.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="h-6 w-6 text-brand-green" />
              <h2 className="mt-4 text-lg font-black text-slate-950">{role.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{role.body}</p>
            </article>
          );
        })}
      </div>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-xl font-black text-slate-950">Interested in helping?</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Send a short note with your program, availability, and the role you are interested in.
        </p>
        <Link href="/contact" className="btn-primary mt-5">
          Contact the team
        </Link>
      </div>
    </div>
  );
}
