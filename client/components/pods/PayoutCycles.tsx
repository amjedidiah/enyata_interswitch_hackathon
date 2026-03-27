"use client";

import { useState, useEffect } from "react";
import { Trophy, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { podsApi } from "@/lib/api";
import { ngn } from "@/lib/helpers";

interface PayoutCycle {
  cycle: number;
  recipientId: string | null;
  recipientName: string;
  amount: number;
  timestamp: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PayoutCyclesExpanded({
  error,
  cycles,
}: Readonly<{
  error: boolean;
  cycles: PayoutCycle[];
}>) {
  if (error)
    return (
      <div className="flex items-center gap-2 text-sm text-brand-danger mt-3">
        <AlertTriangle size={14} className="shrink-0" />
        Could not load payout history.
      </div>
    );

  if (cycles.length === 0)
    return (
      <p className="text-sm text-brand-muted mt-3">
        No payouts completed yet — the first cycle is still in progress.
      </p>
    );

  return (
    <ol className="flex flex-col gap-3 mt-4">
      {cycles.map((c) => (
        <li
          key={c.cycle}
          className="flex items-center justify-between bg-brand-card rounded-xl px-4 py-3 border border-brand-border"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 flex items-center justify-center rounded-full bg-brand-accent/15 text-brand-accent text-xs font-bold shrink-0">
              {c.cycle}
            </span>
            <div>
              <p className="text-sm font-semibold text-brand-text">
                {c.recipientName}
              </p>
              <p className="text-xs text-brand-muted">
                {formatDate(c.timestamp)}
              </p>
            </div>
          </div>
          <span className="text-sm font-bold text-brand-success">
            +{ngn(c.amount)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function PayoutCycles({ podId }: Readonly<{ podId: string }>) {
  const [cycles, setCycles] = useState<PayoutCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    podsApi
      .payoutHistory(podId)
      .then(({ data }) => setCycles(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [podId]);

  if (loading) {
    return (
      <div className="bg-brand-surface rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 bg-brand-muted/20 rounded animate-pulse" />
          <div className="h-4 w-36 bg-brand-muted/20 rounded animate-pulse" />
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 bg-brand-muted/10 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-surface rounded-2xl p-6">
      <button
        className="w-full flex items-center justify-between mb-1"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-brand-accent" />
          <span className="font-semibold text-brand-text">Payout Cycles</span>
          {cycles.length > 0 && (
            <span className="text-xs bg-brand-accent/15 text-brand-accent font-semibold px-2 py-0.5 rounded-full">
              {cycles.length} completed
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-brand-muted" />
        ) : (
          <ChevronDown size={16} className="text-brand-muted" />
        )}
      </button>

      {expanded && <PayoutCyclesExpanded error={error} cycles={cycles} />}
    </div>
  );
}

export default PayoutCycles;
