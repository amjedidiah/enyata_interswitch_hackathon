import Section from "@/components/ui/Section";
import Motion from "@/components/shared/Motion";
import { fadeUp } from "@/components/home/HomeHero";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const getDetails = (hasToken: boolean) => {
  if (!hasToken)
    return {
      title: "Get started today",
      subTitle: "Ready to join a savings circle?",
      description:
        "Create your pod in under two minutes. No paperwork. No middleman.",
      action: {
        href: "/register",
        text: "Create a Free Account",
      },
    };

  return {
    title: "Welcome back",
    subTitle: "Stay on top of your pods",
    description:
      "Jump into your dashboard to track contributions, manage payouts, and keep your savings circle running smoothly.",
    action: {
      href: "/dashboard",
      text: "Go to Dashboard",
    },
  };
};

function HomeCTA({ hasToken }: Readonly<{ hasToken: boolean }>) {
  const { title, subTitle, description, action } = getDetails(hasToken);

  return (
    <section className="relative py-28 px-6 text-center overflow-hidden">
      {/* Gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, var(--color-brand-surface) 0%, color-mix(in srgb, var(--color-brand-accent) 8%, var(--color-brand-card)) 40%, color-mix(in srgb, var(--color-brand-accent) 5%, var(--color-brand-card)) 60%, var(--color-brand-surface) 100%)",
        }}
      />

      {/* Decorative orb — top left */}
      <Motion
        className="absolute -top-32 -left-32 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-brand-accent) 13%, transparent) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Decorative orb — bottom right */}
      <Motion
        className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-brand-primary) 6%, transparent) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* Thin gold rule at top */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-brand-accent) 45%, transparent), transparent)",
        }}
      />

      <Section className="relative z-10 max-w-2xl mx-auto">
        <Motion
          as="p"
          variants={fadeUp}
          className="text-brand-accent text-sm font-semibold uppercase tracking-widest mb-4"
        >
          {title}
        </Motion>
        <Motion
          as="h2"
          variants={fadeUp}
          className="text-4xl md:text-5xl font-black text-brand-primary mb-6 leading-tight"
        >
          {subTitle}
        </Motion>
        <Motion
          as="p"
          variants={fadeUp}
          className="text-brand-muted text-lg mb-10"
        >
          {description}
        </Motion>
        <Motion variants={fadeUp}>
          <Link
            href={action.href}
            className="hero-cta-primary inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold relative overflow-hidden group text-brand-primary"
          >
            <span className="relative z-10">{action.text}</span>
            <ArrowRight
              size={18}
              className="relative z-10 transition-transform duration-200 group-hover:translate-x-1"
            />
            <span className="hero-cta-shine" />
          </Link>
        </Motion>
      </Section>
    </section>
  );
}

export default HomeCTA;
