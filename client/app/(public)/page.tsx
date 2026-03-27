import Link from "next/link";
import {
  Brain,
  Lock,
  Zap,
  ShieldCheck,
  Users,
  TrendingUp,
  CheckCircle2,
  Star,
} from "lucide-react";
import Section from "@/components/ui/Section";
import Motion from "@/components/shared/Motion";
import PodList from "@/components/shared/PodList";
import Faq from "@/components/home/FAQ";
import HomeHero, { fadeUp, HexPattern } from "@/components/home/HomeHero";
import HomeCTA from "@/components/home/HomeCTA";
import { getServerUser } from "@/lib/server-auth";

const currentYear = new Date().getFullYear();

interface PodSummary {
  _id: string;
  name: string;
  contributionAmount: number;
  frequency: "daily" | "weekly" | "monthly";
  members: unknown[];
  maxMembers: number;
  status: "active" | "completed";
}

async function getFeaturedPods(): Promise<PodSummary[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/pods`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const pods: PodSummary[] = await res.json();
    return pods.slice(0, 6);
  } catch {
    return [];
  }
}

/* ─── page ─── */
async function LandingPage() {
  const [featuredPods, serverUser] = await Promise.all([
    getFeaturedPods(),
    getServerUser(),
  ]);
  const hasToken = !!serverUser;

  return (
    <main className="overflow-x-hidden">
      {/* ── HERO ── */}
      <HomeHero hasToken={hasToken} />

      {/* ── STAT BAR ── */}
      <section className="relative bg-brand-card border-y border-brand-border overflow-hidden">
        {/* Subtle gold top rule */}
        <div
          className="absolute top-0 inset-x-0 h-0.5"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-brand-accent) 50%, transparent), transparent)",
          }}
        />
        <Section className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-0">
          {[
            {
              value: "₦0",
              label: "lost to fraud — ever",
              sub: "Trustless wallet",
            },
            {
              value: "₦8M+",
              label: "secured across all pods",
              sub: "Growing every cycle",
            },
            {
              value: "180+",
              label: "AI-evaluated pods",
              sub: "DeepSeek trust scoring",
            },
          ].map(({ value, label, sub }, i) => (
            <Motion
              key={label}
              variants={fadeUp}
              className="flex flex-col items-center gap-1.5 text-center relative px-8 py-4"
            >
              {/* Vertical divider (except first) */}
              {i > 0 && (
                <span className="hidden sm:block absolute left-0 top-1/4 h-1/2 w-px bg-brand-accent/20" />
              )}
              <span
                className="text-4xl font-black"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, var(--color-brand-primary) 0%, var(--color-brand-primary-light) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {value}
              </span>
              <span className="text-sm font-semibold text-brand-text">
                {label}
              </span>
              <span className="text-xs text-brand-muted">{sub}</span>
            </Motion>
          ))}
        </Section>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-6 bg-brand-primary text-brand-card relative overflow-hidden">
        <HexPattern />
        <div className="absolute left-0 top-0 h-full w-1 bg-brand-accent" />

        {/* Subtle radial glow centre */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, color-mix(in srgb, var(--color-brand-accent) 6%, transparent) 0%, transparent 70%)",
          }}
        />

        <Section className="relative z-10 max-w-5xl mx-auto">
          <Motion variants={fadeUp} className="text-center mb-16">
            <p className="text-brand-accent text-sm font-semibold uppercase tracking-widest mb-3">
              Why AjoFlow
            </p>
            <h2 className="text-4xl font-black">
              Built for trust. Built for Africa.
            </h2>
          </Motion>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                icon: Brain,
                title: "AI Trust Scoring",
                desc: "Our AI agent monitors every member's payment history and flags unreliable contributors — automatically moving them to the back of the payout queue with a clear explanation.",
                accent: true,
              },
              {
                icon: Lock,
                title: "Interswitch Wallet",
                desc: "In a traditional Ajo, the admin holds the pool in their personal account — there's no audit trail and no recourse if they disappear or mismanage it. AjoFlow's funds live in a dedicated Interswitch wallet that no individual can access or withdraw from. Payouts are only triggered once the full amount is verified.",
                accent: false,
              },
              {
                icon: ShieldCheck,
                title: "Tax Shield",
                desc: "Under the 2026 Nigeria Tax Act, payouts from unregistered savings circles are now classified as taxable income. AjoFlow pods are structured as Micro-Cooperatives under the same Act, making all payouts fully tax-exempt. Every naira goes to the member.",
                accent: false,
              },
              {
                icon: Zap,
                title: "Automated Payouts",
                desc: "When your turn arrives, funds are disbursed to your bank account without anyone pressing a button. Fully automated via Interswitch Disbursement API.",
                accent: false,
              },
            ].map(({ icon: Icon, title, desc, accent }) => (
              <Motion
                key={title}
                variants={fadeUp}
                className={`rounded-2xl p-7 border flex flex-col gap-4 ${
                  accent
                    ? "bg-brand-accent border-brand-accent feature-card feature-card-accent"
                    : "bg-brand-card/5 border-brand-card/10 feature-card"
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent ? "bg-brand-card/15" : "bg-brand-accent/12"}`}
                >
                  <Icon
                    size={22}
                    className={accent ? "text-brand-card" : "text-brand-accent"}
                  />
                </div>
                <h3 className="font-bold text-lg text-brand-card">{title}</h3>
                <p className="text-brand-card/70 text-sm leading-relaxed">
                  {desc}
                </p>
              </Motion>
            ))}
          </div>
        </Section>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-6 bg-brand-surface">
        <Section className="max-w-5xl mx-auto">
          <Motion variants={fadeUp} className="text-center mb-16">
            <p className="text-brand-accent text-sm font-semibold uppercase tracking-widest mb-3">
              Simple by design
            </p>
            <h2 className="text-4xl font-black text-brand-primary">
              How it works
            </h2>
          </Motion>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* connecting line (desktop only) */}
            <div
              className="hidden md:block absolute top-[52px] left-[16.66%] right-[16.66%] h-px z-0"
              style={{
                background:
                  "linear-gradient(90deg, color-mix(in srgb, var(--color-brand-accent) 15%, transparent), color-mix(in srgb, var(--color-brand-accent) 50%, transparent), color-mix(in srgb, var(--color-brand-accent) 15%, transparent))",
              }}
            />

            {[
              {
                step: "01",
                icon: Users,
                title: "Join a Pod",
                desc: "Browse open savings circles or create your own. Set the amount, frequency, and member limit.",
              },
              {
                step: "02",
                icon: TrendingUp,
                title: "Contribute Weekly",
                desc: "Your card is debited automatically on schedule. Funds go directly into an Interswitch wallet — never an admin's account.",
              },
              {
                step: "03",
                icon: CheckCircle2,
                title: "Get Paid Out",
                desc: "When your turn arrives, the full pool is disbursed to your bank account automatically. The AI ensures the queue stays fair.",
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <Motion
                key={step}
                variants={fadeUp}
                className="step-card relative z-10 bg-brand-card rounded-2xl border border-brand-border p-7 flex flex-col gap-4"
              >
                {/* Gold top accent */}
                <div className="absolute top-0 left-6 right-6 h-0.5 rounded-full bg-brand-accent/30" />

                <div className="flex flex-col items-center gap-2">
                  <span className="w-12 h-12 rounded-full flex items-center justify-center border-2 text-sm font-black border-brand-accent/30 text-brand-accent bg-brand-accent/6">
                    {step}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/8 flex items-center justify-center">
                    <Icon size={20} className="text-brand-primary" />
                  </div>
                </div>
                <h3 className="font-bold text-brand-text text-lg text-center">
                  {title}
                </h3>
                <p className="text-brand-muted text-sm leading-relaxed text-center">
                  {desc}
                </p>
              </Motion>
            ))}
          </div>
        </Section>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-6 bg-brand-card">
        <Section className="max-w-5xl mx-auto">
          <Motion variants={fadeUp} className="text-center mb-16">
            <p className="text-brand-accent text-sm font-semibold uppercase tracking-widest mb-3">
              Real stories
            </p>
            <h2 className="text-4xl font-black text-brand-primary">
              Trusted by our members
            </h2>
          </Motion>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote:
                  "I've been in three traditional ajo groups and lost money in two of them. With AjoFlow, I can see every naira that enters and leaves the pot. That transparency alone is worth everything.",
                name: "Adaeze Nwosu",
                role: "Graphic designer, Port Harcourt",
                initial: "A",
              },
              {
                quote:
                  "The AI flagged a member who'd been delaying payments and moved them down the queue before it became a problem. The whole group agreed it was the right call — and no one had to say a word.",
                name: "Tunde Oladipo",
                role: "Small business owner, Ibadan",
                initial: "T",
              },
              {
                quote:
                  "My payout hit my account the same morning it was due. I didn't have to chase the admin or wait for anyone to transfer manually. That kind of reliability changes how you plan your finances.",
                name: "Ngozi Eze",
                role: "Nurse, Abuja",
                initial: "N",
              },
            ].map(({ quote, name, role, initial }) => (
              <Motion
                key={name}
                variants={fadeUp}
                className="testimonial-card bg-brand-surface rounded-2xl border border-brand-border p-7 flex flex-col gap-5"
              >
                {/* Stars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={`key-${i.toString()}`}
                      size={14}
                      className="text-brand-accent fill-brand-accent"
                    />
                  ))}
                </div>

                {/* Quote mark */}
                <span
                  className="text-5xl leading-none font-serif select-none -mb-3 text-brand-accent/30"
                  aria-hidden="true"
                >
                  &ldquo;
                </span>
                <p className="text-brand-text text-sm leading-relaxed flex-1">
                  {quote}
                </p>
                <div className="flex items-center gap-3 pt-3 border-t border-brand-border">
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center text-brand-card text-sm font-bold shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--color-brand-primary) 0%, var(--color-brand-primary-light) 100%)",
                    }}
                  >
                    {initial}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-brand-text">
                      {name}
                    </p>
                    <p className="text-xs text-brand-muted">{role}</p>
                  </div>
                </div>
              </Motion>
            ))}
          </div>
        </Section>
      </section>

      {/* ── FEATURED PODS ── */}
      {featuredPods.length > 0 && (
        <section className="py-24 px-6 bg-brand-surface">
          <Section className="max-w-5xl mx-auto">
            <Motion variants={fadeUp} className="mb-10">
              <p className="text-brand-accent text-sm font-semibold uppercase tracking-widest mb-3">
                Open now
              </p>
              <div className="flex items-end justify-between gap-4">
                <h2 className="text-4xl font-black text-brand-primary">
                  Featured Pods
                </h2>
                <Link
                  href="/pods"
                  className="text-sm text-brand-primary font-semibold hover:text-brand-accent transition-colors shrink-0 group flex items-center gap-1"
                >
                  Browse all{""}
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              </div>
            </Motion>

            <PodList pods={featuredPods} userId={serverUser?.id ?? null} />
          </Section>
        </section>
      )}

      {/* ── FAQ ── */}
      <Faq />

      {/* ── CTA ── */}
      <HomeCTA hasToken={hasToken} />

      {/* ── FOOTER ── */}
      <footer className="relative bg-brand-primary text-brand-card/50 text-center text-xs py-8 px-6 overflow-hidden">
        <div
          className="absolute top-0 inset-x-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-brand-accent) 35%, transparent), transparent)",
          }}
        />
        <p>
          © {currentYear} AjoFlow · Built for the Interswitch × Enyata Hackathon
          · Payments · Social Services · AI
        </p>
      </footer>
    </main>
  );
}

export default LandingPage;
