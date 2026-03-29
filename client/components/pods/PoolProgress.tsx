import { Wallet } from "lucide-react";
import { Pod } from "./PodHeroHeader";
import { ngn } from "@/lib/helpers";

function PoolProgress({ pod }: Readonly<{ pod: Pod }>) {
  // Each cycle, (members - 1) contribute and 1 receives the payout.
  // The recipient doesn't contribute in their own payout cycle.
  const contributors = Math.max(pod.maxMembers - 1, 1);
  const cycleGoal = pod.contributionAmount * contributors;
  const progress = Math.min((pod.currentCycleTotal / cycleGoal) * 100, 100);

  return (
    <div className="bg-brand-card border border-brand-border rounded-2xl p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-brand-muted">
          <Wallet size={14} />
          Cycle {pod.currentCycle} contributions
        </span>
        <span className="font-semibold text-brand-text">
          {ngn(pod.currentCycleTotal)}{" "}
          <span className="font-normal text-brand-muted">
            of {ngn(cycleGoal)}
          </span>
        </span>
      </div>
      <div className="w-full h-2.5 bg-brand-surface rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            background:
              "linear-gradient(90deg, var(--color-brand-accent), var(--color-brand-accent-light), var(--color-brand-accent))",
            backgroundSize: "200% auto",
            animation: "shimmer 2.5s linear infinite",
          }}
        />
      </div>
      <p className="text-xs text-brand-muted text-right">
        {Math.round(progress)}% funded
      </p>
    </div>
  );
}

export default PoolProgress;
