"use client";

import { useState, useEffect, PropsWithChildren, ElementType } from "react";
import { Layers, Sparkles, ArrowUpRight, CalendarClock } from "lucide-react";
import { statsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ngn } from "@/lib/helpers";

interface UpcomingPayment {
  podId: string;
  podName: string;
  amount: number;
  frequency: "daily" | "weekly" | "monthly";
}

interface UserStats {
  podsCount: number;
  trustScore: number | null;
  trustReasoning: string | null;
  riskFlag: boolean;
  nextPayout: {
    podId: string;
    podName: string;
    position: number;
  } | null;
  avgTrustScore: number | null;
  bestPodTrust: { podId: string; podName: string; score: number } | null;
  worstPodTrust: { podId: string; podName: string; score: number } | null;
  upcomingPayments: UpcomingPayment[];
}

function StatCard({
  icon: Icon,
  label,
  children,
}: Readonly<
  PropsWithChildren<{
    icon: ElementType;
    label: string;
  }>
>) {
  return (
    <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md bg-brand-primary/8 flex items-center justify-center">
          <Icon size={12} className="text-brand-primary" />
        </div>
        <span className="text-xs text-brand-muted font-medium">{label}</span>
      </div>
      {children}
    </div>
  );
}

function SkeletonStatCard() {
  return (
    <div className="bg-brand-card border border-brand-border rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 bg-brand-muted/15 rounded-md" />
        <div className="h-3 w-20 bg-brand-muted/15 rounded" />
      </div>
      <div className="h-8 w-16 bg-brand-muted/15 rounded" />
    </div>
  );
}

function UserQuickStats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsApi
      .me()
      .then(({ data }) => setStats(data))
      .catch(() => {}) // not logged in — hide silently
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
    );
  }

  if (!stats) return null;

  let scoreColor = "text-brand-muted";
  if (stats.trustScore !== null) {
    if (stats.trustScore >= 75) {
      scoreColor = "text-brand-success";
    } else if (stats.trustScore >= 50) {
      scoreColor = "text-brand-warning";
    } else {
      scoreColor = "text-brand-danger";
    }
  }

  const freqLabel = { daily: "daily", weekly: "weekly", monthly: "monthly" };

  return (
    <div className="flex flex-col gap-4 mb-8">
      {/* Row 1: core stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Layers} label="My Active Pods">
          <p className="text-2xl font-bold text-brand-primary">
            {stats.podsCount}
          </p>
        </StatCard>

        <StatCard icon={Sparkles} label="Latest Trust Score">
          {stats.trustScore === null ? (
            <>
              <p className="text-base font-semibold text-brand-muted">
                Not scored yet
              </p>
              <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                AI evaluates after your first contribution cycle.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <p className={cn("text-2xl font-bold", scoreColor)}>
                  {stats.trustScore}
                </p>
                <span className="text-xs font-semibold text-brand-accent">
                  AI
                </span>
              </div>
              {stats.trustReasoning && (
                <p className="text-xs text-brand-muted mt-1 leading-relaxed line-clamp-2">
                  {stats.trustReasoning}
                </p>
              )}
            </>
          )}
        </StatCard>

        <StatCard icon={Sparkles} label="Avg Trust (All Pods)">
          {stats.avgTrustScore === null ? (
            <p className="text-sm text-brand-muted">No scores yet</p>
          ) : (
            <>
              <p
                className={cn("text-2xl font-bold", {
                  "text-brand-success": stats.avgTrustScore >= 75,
                  "text-brand-warning":
                    stats.avgTrustScore >= 50 && stats.avgTrustScore < 75,
                  "text-brand-danger": stats.avgTrustScore < 50,
                })}
              >
                {stats.avgTrustScore}
              </p>
              {stats.bestPodTrust && stats.worstPodTrust && (
                <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                  Best: {stats.bestPodTrust.podName.split(" ")[0]} (
                  {stats.bestPodTrust.score})
                  {stats.bestPodTrust.podId !== stats.worstPodTrust.podId && (
                    <>
                      {" · "}Lowest: {stats.worstPodTrust.podName.split(" ")[0]}{" "}
                      ({stats.worstPodTrust.score})
                    </>
                  )}
                </p>
              )}
            </>
          )}
        </StatCard>

        <StatCard icon={ArrowUpRight} label="Next Payout">
          {stats.nextPayout ? (
            <>
              <p className="text-sm font-semibold text-brand-text truncate">
                {stats.nextPayout.podName}
              </p>
              <p className="text-xs text-brand-muted mt-0.5">
                Position {stats.nextPayout.position} in queue
              </p>
            </>
          ) : (
            <p className="text-sm text-brand-muted">No upcoming payout</p>
          )}
        </StatCard>
      </div>

      {/* Row 2: upcoming payments */}
      {stats.upcomingPayments.length > 0 && (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-brand-primary/8 flex items-center justify-center">
              <CalendarClock size={12} className="text-brand-primary" />
            </div>
            <span className="text-xs text-brand-muted font-medium">
              Upcoming Payments
            </span>
          </div>
          <ul className="divide-y divide-brand-border">
            {stats.upcomingPayments.map((p) => (
              <li
                key={p.podId}
                className="flex items-center justify-between text-sm py-2.5 first:pt-0 last:pb-0"
              >
                <span className="text-brand-text font-medium truncate max-w-[60%]">
                  {p.podName}
                </span>
                <span className="text-brand-muted shrink-0">
                  {ngn(p.amount)}{" "}
                  <span className="text-xs">/ {freqLabel[p.frequency]}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default UserQuickStats;
