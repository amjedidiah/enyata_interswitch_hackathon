"use client";

import { ArrowRight, PartyPopper, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

function WelcomeBanner({
  initShowWelcome,
}: Readonly<{ initShowWelcome: boolean }>) {
  const [showWelcome, setShowWelcome] = useState(initShowWelcome);

  if (!showWelcome) return null;

  return (
    <div
      className="mb-6 rounded-2xl border p-5 flex items-start gap-4 relative"
      style={{
        background:
          "color-mix(in srgb, var(--color-brand-accent) 6%, var(--color-brand-card))",
        borderColor:
          "color-mix(in srgb, var(--color-brand-accent) 25%, transparent)",
      }}
    >
      <div className="w-10 h-10 rounded-xl bg-brand-accent/15 flex items-center justify-center shrink-0">
        <PartyPopper size={20} className="text-brand-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-brand-text">Welcome to AjoFlow!</p>
        <p className="text-sm text-brand-muted mt-0.5">
          Your account is ready. Browse pods to join your first savings circle,
          or create your own.
        </p>
        <Link
          href="/pods"
          className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-brand-accent hover:underline"
        >
          Browse Pods
          <ArrowRight size={14} />
        </Link>
      </div>
      <button
        onClick={() => setShowWelcome(false)}
        className="text-brand-muted hover:text-brand-text transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default WelcomeBanner;
