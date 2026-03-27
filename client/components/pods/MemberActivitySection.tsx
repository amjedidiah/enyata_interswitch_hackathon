import { Lock } from "lucide-react";
import PodPayoutQueue from "@/components/pods/PodPayoutQueue";
import ActivityFeed from "@/components/pods/ActivityFeed";
import PayoutCycles from "@/components/pods/PayoutCycles";
import MyContributions from "@/components/pods/MyContributions";
import ContributionMatrix from "@/components/pods/ContributionMatrix";

interface Member {
  _id: string;
  name: string;
  email: string;
}

interface Props {
  podId: string;
  payoutQueue: Member[];
  paidOutMembers: Member[];
  memberIds: string[];
  isFull: boolean;
  userId: string | null;
}

/**
 * Wraps PodPayoutQueue and ActivityFeed behind an auth gate on the pod
 * detail page. Receives the verified user identity from the parent Server
 * Component (via middleware headers) — no client-side auth needed here.
 */
function MemberActivitySection({
  podId,
  payoutQueue,
  paidOutMembers,
  memberIds,
  isFull,
  userId,
}: Readonly<Props>) {
  const isMember = !!userId && memberIds.includes(userId);

  if (!isMember) {
    return (
      <div className="rounded-2xl border border-brand-primary/15 bg-brand-primary/5 p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
          <Lock size={20} className="text-brand-primary" />
        </div>
        <div>
          <p className="font-bold text-brand-primary">Member-only content</p>
          {!isFull && (
            <p className="text-sm text-brand-muted mt-1.5 max-w-xs mx-auto leading-relaxed">
              Join this pod to see the payout queue, AI trust scores, and
              activity feed.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <PodPayoutQueue
        podId={podId}
        payoutQueue={payoutQueue}
        paidOutMembers={paidOutMembers}
      />
      <ActivityFeed podId={podId} />

      {/* Contribution Matrix — member × cycle payment status */}
      <ContributionMatrix podId={podId} />

      {/* Payout cycle history */}
      <PayoutCycles podId={podId} />

      {/* Contribution ledger — only renders for authenticated members with history */}
      <MyContributions podId={podId} />
    </>
  );
}

export default MemberActivitySection;
