"use client";

import { useAuthContext } from "@/contexts/AuthContext";
import JoinButton from "@/components/pods/JoinButton";
import ContributeButton from "@/components/pods/ContributeButton";
import MemberWalletSection from "@/components/pods/MemberWalletSection";
import MemberActivitySection from "@/components/pods/MemberActivitySection";
import PodAdminLink from "@/components/pods/PodAdminLink";
import TaxShieldBanner from "@/components/pods/TaxShieldBanner";
import PodContributionAmount from "@/components/pods/PodContributionAmount";
import PoolProgress from "@/components/pods/PoolProgress";
import type { Pod } from "@/components/pods/PodHeroHeader";

/**
 * Client wrapper for pod detail pages. Reads userId from AuthContext
 * so it works in cross-origin deployments where getServerUser() returns null.
 *
 * `variant` controls which bottom action is shown:
 *   - "public"  → JoinButton (for /pods/[id])
 *   - "member"  → PodAdminLink (for /my-pods/[id])
 */
function PodDetailClient({
  pod,
  variant,
}: Readonly<{ pod: Pod; variant: "public" | "member" }>) {
  const { user } = useAuthContext();
  const userId = user?.id ?? null;

  const isFull = pod.members.length >= pod.maxMembers;
  const isMember = pod.members.some((m) => m._id === userId);
  const isAdmin = pod.createdBy === userId;

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 flex flex-col gap-5">
      <TaxShieldBanner />

      <PodContributionAmount pod={pod} isMember={isMember} />

      <PoolProgress pod={pod} />

      <MemberWalletSection podId={pod._id} isAdmin={isAdmin} />

      <MemberActivitySection
        podId={pod._id}
        payoutQueue={pod.payoutQueue}
        paidOutMembers={pod.paidOutMembers}
        partialPayoutMemberIds={pod.partialPayoutMemberIds}
        nextRecipientMissedCycles={pod.nextRecipientMissedCycles}
        lastEvaluatedAt={pod.lastEvaluatedAt}
        memberIds={pod.members.map((m) => m._id)}
        isFull={isFull}
        userId={userId}
      />

      <ContributeButton
        podId={pod._id}
        podName={pod.name}
        contributionAmount={pod.contributionAmount}
        maxMembers={pod.maxMembers}
        currentCycle={pod.currentCycle}
        virtualAccount={pod.virtualAccount}
        userId={userId}
        memberIds={pod.members.map((m) => m._id)}
      />

      {variant === "public" ? (
        <JoinButton
          pod={{
            id: pod._id,
            name: pod.name,
            contributionAmount: pod.contributionAmount,
            frequency: pod.frequency,
            maxMembers: pod.maxMembers,
            currentCycle: pod.currentCycle,
            createdBy: pod.createdBy,
            virtualAccount: pod.virtualAccount,
          }}
          isFull={isFull}
          memberIds={pod.members.map((m) => m._id)}
          userId={userId}
        />
      ) : (
        <PodAdminLink
          podId={pod._id}
          createdBy={pod.createdBy}
          userId={userId}
        />
      )}
    </div>
  );
}

export default PodDetailClient;
