"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import PodList from "@/components/shared/PodList";
import CreatePodModal from "@/components/pods/CreatePodModal";
import { useAuthContext } from "@/contexts/AuthContext";
import Link from "next/link";

interface PodSummary {
  _id: string;
  name: string;
  contributionAmount: number;
  frequency: "daily" | "weekly" | "monthly";
  members: unknown[];
  maxMembers: number;
  status: "active" | "completed";
}

const FREQUENCIES = ["all", "daily", "weekly", "monthly"] as const;
type FreqFilter = (typeof FREQUENCIES)[number];

type AmountFilter = "all" | "lte5k" | "5k-20k" | "gte20k";
const AMOUNT_PRESETS: { value: AmountFilter; label: string }[] = [
  { value: "all", label: "Any amount" },
  { value: "lte5k", label: "≤ ₦5k" },
  { value: "5k-20k", label: "₦5k – ₦20k" },
  { value: "gte20k", label: "₦20k+" },
];

function matchesAmount(amount: number, filter: AmountFilter): boolean {
  if (filter === "lte5k") return amount <= 5000;
  if (filter === "5k-20k") return amount > 5000 && amount <= 20000;
  if (filter === "gte20k") return amount > 20000;
  return true;
}

function PodBrowser({
  initialPods,
  initialCreateOpen = false,
}: Readonly<{ initialPods: PodSummary[]; initialCreateOpen?: boolean }>) {
  const [query, setQuery] = useState("");
  const [freq, setFreq] = useState<FreqFilter>("all");
  const [amountFilter, setAmountFilter] = useState<AmountFilter>("all");
  const [openOnly, setOpenOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
  const { hasToken, user } = useAuthContext();

  const filtered = useMemo(() => {
    return initialPods.filter((pod) => {
      const matchesName = pod.name
        .toLowerCase()
        .includes(query.toLowerCase().trim());
      const matchesFreq = freq === "all" || pod.frequency === freq;
      const amountOk = matchesAmount(pod.contributionAmount, amountFilter);
      const matchesAvailability =
        !openOnly || pod.members.length < pod.maxMembers;
      return matchesName && matchesFreq && amountOk && matchesAvailability;
    });
  }, [initialPods, query, freq, amountFilter, openOnly]);

  const hasActiveFilters =
    query || freq !== "all" || amountFilter !== "all" || openOnly;

  return (
    <>
      <CreatePodModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <section>
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <p className="text-sm text-brand-muted">
            <span className="font-semibold text-brand-text">
              {filtered.length}
            </span>{" "}
            {filtered.length === 1 ? "pod" : "pods"} available
          </p>
          {hasToken ? (
            <button
              onClick={() => setCreateOpen(true)}
              className="hero-cta-primary shrink-0 px-5 py-2.5 rounded-xl text-brand-primary text-sm font-bold relative overflow-hidden group"
            >
              <span className="relative z-10">+ Create Pod</span>
              <span className="hero-cta-shine" />
            </button>
          ) : (
            <Link
              href="/login?next=%2Fpods%3Fcreate%3D1"
              className="hero-cta-primary shrink-0 px-5 py-2.5 rounded-xl text-brand-primary text-sm font-bold relative overflow-hidden group"
            >
              <span className="relative z-10">+ Create Pod</span>
              <span className="hero-cta-shine" />
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="bg-brand-card border border-brand-border rounded-2xl p-4 flex flex-col gap-3 mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-muted uppercase tracking-wider">
            <SlidersHorizontal size={13} />
            Filters
          </div>

          {/* Search + open-only toggle */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"
              />
              <input
                type="text"
                placeholder="Search pods…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 bg-brand-surface"
              />
            </div>

            <button
              onClick={() => setOpenOnly((v) => !v)}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                openOnly
                  ? "bg-brand-primary text-brand-card border-brand-primary"
                  : "bg-brand-surface text-brand-muted border-brand-border hover:border-brand-primary/30 hover:text-brand-primary"
              }`}
            >
              Open spots only
            </button>
          </div>

          {/* Frequency + amount presets */}
          <div className="flex flex-wrap gap-2">
            {FREQUENCIES.map((f) => (
              <button
                key={f}
                onClick={() => setFreq(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border ${
                  freq === f
                    ? "bg-brand-primary text-brand-card border-brand-primary"
                    : "bg-brand-surface text-brand-muted border-brand-border hover:border-brand-primary/30 hover:text-brand-primary"
                }`}
              >
                {f}
              </button>
            ))}

            <div className="w-px bg-brand-border mx-1 self-stretch" />

            {AMOUNT_PRESETS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setAmountFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  amountFilter === value
                    ? "bg-brand-accent text-brand-primary border-brand-accent"
                    : "bg-brand-surface text-brand-muted border-brand-border hover:border-brand-accent/30 hover:text-brand-accent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-brand-primary/8 flex items-center justify-center">
              <Search size={24} className="text-brand-primary/40" />
            </div>
            <div>
              <p className="font-semibold text-brand-text">No pods found</p>
              <p className="text-sm text-brand-muted mt-1">
                {hasActiveFilters
                  ? "Try adjusting your filters."
                  : "No active pods yet. Be the first to create one."}
              </p>
            </div>
          </div>
        ) : (
          <PodList pods={filtered} userId={user?.id ?? null} />
        )}
      </section>
    </>
  );
}

export default PodBrowser;
