import Link from "next/link";
import { type Variants } from "framer-motion";
import { Brain, ArrowRight, ChevronDown } from "lucide-react";
import Motion from "@/components/shared/Motion";

/* ─── animation helpers ─── */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" as const },
  },
};
const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.11 } },
};

/* ─── decorative background pattern ─── */
export function HexPattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.05]"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <pattern
          id="hex"
          x="0"
          y="0"
          width="56"
          height="48"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M28 4 L52 18 L52 30 L28 44 L4 30 L4 18 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)" />
    </svg>
  );
}

/* ─── ambient floating orbs ─── */
function AmbientOrbs() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden
    >
      {/* Large gold orb — top right */}
      <Motion
        className="absolute -top-48 -right-48 w-[560px] h-[560px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-brand-accent) 18%, transparent) 0%, transparent 65%)",
        }}
        animate={{ y: [0, -24, 0], x: [0, 14, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Medium orb — bottom left */}
      <Motion
        className="absolute -bottom-40 -left-40 w-[460px] h-[460px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-brand-accent) 11%, transparent) 0%, transparent 65%)",
        }}
        animate={{ y: [0, 22, 0], x: [0, -16, 0], scale: [1, 1.09, 1] }}
        transition={{
          duration: 11,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
      {/* Small accent orb — centre */}
      <Motion
        className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-brand-card) 4%, transparent) 0%, transparent 70%)",
        }}
        animate={{ y: [0, -32, 0], opacity: [0.3, 0.7, 0.3] }}
        transition={{
          duration: 13,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5,
        }}
      />
    </div>
  );
}

/* ─── pod preview card ─── */
function PodPreviewCard() {
  return (
    <div className="relative">
      {/* Pulsing ambient glow */}
      <Motion
        className="absolute -inset-8 rounded-3xl"
        style={{
          background:
            "radial-gradient(ellipse, color-mix(in srgb, var(--color-brand-accent) 22%, transparent) 0%, transparent 68%)",
        }}
        animate={{ opacity: [0.4, 0.9, 0.4], scale: [0.95, 1.03, 0.95] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <Motion
        initial={{ opacity: 0, y: 40, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
        className="relative bg-brand-card rounded-2xl p-6 w-72"
        style={{
          boxShadow:
            "0 30px 70px color-mix(in srgb, black 30%, transparent), 0 0 0 1px color-mix(in srgb, var(--color-brand-accent) 15%, transparent), inset 0 1px 0 color-mix(in srgb, var(--color-brand-card) 6%, transparent)",
        }}
      >
        {/* card header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-brand-muted font-medium uppercase tracking-wider">
              Active Pod
            </p>
            <p className="text-brand-text font-bold text-lg leading-tight mt-0.5">
              Lagos Gig Workers
            </p>
          </div>
          <span className="bg-brand-success/10 text-brand-success text-xs font-semibold px-2 py-1 rounded-full border border-brand-success/20">
            Active
          </span>
        </div>

        {/* amount */}
        <p className="text-3xl font-black text-brand-primary mb-1">₦5,000</p>
        <p className="text-xs text-brand-muted mb-4">daily, weekly, or monthly · 4 members</p>

        {/* progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-brand-muted mb-1.5">
            <span>Pool progress</span>
            <span className="font-semibold text-brand-text">
              ₦150,000 / ₦200,000
            </span>
          </div>
          <div className="h-2 bg-brand-surface rounded-full overflow-hidden">
            <Motion
              className="h-full rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, var(--color-brand-accent), color-mix(in srgb, var(--color-brand-accent) 55%, var(--color-brand-card)), var(--color-brand-accent))",
                backgroundSize: "200% auto",
                animation: "shimmer 2.5s linear infinite",
              }}
              initial={{ width: 0 }}
              animate={{ width: "75%" }}
              transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* member avatars */}
        <div className="flex items-center gap-2 mt-4">
          {["A", "B", "C", "D"].map((letter, i) => (
            <div
              key={letter}
              className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-brand-card text-xs font-bold -ml-2 first:ml-0 border-2 border-brand-card"
              style={{ zIndex: 4 - i }}
            >
              {letter}
            </div>
          ))}
          <span className="text-xs text-brand-muted ml-1">4 members</span>
        </div>

        {/* Floating AI badge */}
        <Motion
          className="absolute -top-3 -right-3 bg-brand-primary text-brand-card text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5"
          style={{
            boxShadow:
              "0 4px 18px color-mix(in srgb, var(--color-brand-primary) 50%, transparent)",
          }}
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Brain size={12} className="text-brand-accent" />
          AI Trust Active
        </Motion>

        {/* Payout notification chip */}
        <Motion
          className="absolute -bottom-5 -left-5 bg-brand-card border border-brand-border text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-2"
          style={{
            boxShadow: "0 8px 28px color-mix(in srgb, black 12%, transparent)",
          }}
          initial={{ opacity: 0, x: -14, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.5, ease: "easeOut" }}
        >
          <span className="w-2 h-2 rounded-full bg-brand-success animate-pulse shrink-0" />
          <span className="text-brand-text whitespace-nowrap">
            Payout sent · ₦20,000
          </span>
        </Motion>
      </Motion>
    </div>
  );
}

function HomeHero({ hasToken }: Readonly<{ hasToken: boolean }>) {
  return (
    <section className="relative min-h-screen bg-brand-primary flex items-center text-brand-card overflow-hidden">
      <HexPattern />
      <AmbientOrbs />

      {/* gold accent line */}
      <div className="absolute left-0 top-0 h-full w-1 bg-brand-accent" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-32 grid md:grid-cols-2 gap-16 items-center w-full">
        {/* left */}
        <Motion variants={stagger} initial="hidden" animate="visible">
          <Motion
            as="p"
            variants={fadeUp}
            className="text-brand-accent text-sm font-semibold uppercase tracking-[0.2em] mb-6"
          >
            Powered by AI · Secured by Interswitch
          </Motion>

          <Motion
            as="h1"
            variants={fadeUp}
            className="text-5xl md:text-6xl font-black leading-[1.05] mb-6"
          >
            Your <span className="text-shimmer">Ajo</span>,<br />
            Reimagined.
          </Motion>

          <Motion
            as="p"
            variants={fadeUp}
            className="text-brand-card/70 text-lg leading-relaxed mb-10 max-w-md"
          >
            The trusted savings circle your community has run for generations —
            now with trustless wallet, AI-powered fairness, and automated
            payouts. No spreadsheets. No disputes. No missing funds.
          </Motion>

          <Motion variants={fadeUp} className="flex flex-wrap gap-4">
            <Link
              href={hasToken ? "/pods" : "/register"}
              className="hero-cta-primary inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm relative overflow-hidden group text-brand-primary"
            >
              <span className="relative z-10">Start a Pod</span>
              <ArrowRight
                size={16}
                className="relative z-10 transition-transform duration-200 group-hover:translate-x-1"
              />
              <span className="hero-cta-shine" />
            </Link>
            {!hasToken && (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 border border-brand-card/30 text-brand-card px-7 py-3.5 rounded-xl font-semibold hover:bg-brand-card/10 hover:border-brand-card/50 transition-all text-sm"
              >
                Sign In
              </Link>
            )}
          </Motion>
        </Motion>

        {/* right — pod preview card */}
        <div className="flex justify-center items-center pt-12 pb-4 md:pt-0 md:pb-0">
          <PodPreviewCard />
        </div>
      </div>

      {/* Scroll indicator */}
      <Motion
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-brand-card/35 cursor-default select-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.8 }}
      >
        <span className="text-[10px] tracking-[0.2em] uppercase font-medium">
          Scroll
        </span>
        <Motion
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown size={14} />
        </Motion>
      </Motion>

      {/* bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-24 bg-linear-to-t from-brand-surface to-transparent" />
    </section>
  );
}

export default HomeHero;
