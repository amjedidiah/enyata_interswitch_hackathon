import { ngn } from "@/lib/helpers";
import { Pod } from "./PodHeroHeader";
import { frequencyLabel } from "@/lib/pod-constants";

function PodContributionAmount({
  pod,
  isMember,
}: Readonly<{ pod: Pod; isMember: boolean }>) {
  return (
    <div className="bg-brand-primary rounded-2xl p-6 relative overflow-hidden">
      <div
        className="absolute top-0 inset-x-0 h-0.5"
        style={{
          background:
            "linear-gradient(90deg, var(--color-brand-accent), var(--color-brand-accent-light), transparent)",
        }}
      />
      <p className="text-brand-card/50 text-xs font-semibold uppercase tracking-wider mb-2">
        Contribution per cycle
      </p>
      <p className="text-5xl font-black text-brand-card">
        {ngn(pod.contributionAmount)}
      </p>
      {isMember && (
        <p className="text-brand-card/50 text-sm mt-2">
          {frequencyLabel[pod.frequency].toLowerCase()} · cycle{" "}
          {pod.currentCycle} of {pod.maxMembers}
        </p>
      )}
      {!isMember && (
        <p className="text-brand-card/50 text-sm mt-2">
          {frequencyLabel[pod.frequency]} · {pod.maxMembers} members max
        </p>
      )}
    </div>
  );
}
export default PodContributionAmount;
