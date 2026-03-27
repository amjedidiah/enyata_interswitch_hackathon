import MemberWalletSection from "@/components/pods/MemberWalletSection";
import MemberActivitySection from "@/components/pods/MemberActivitySection";
import ContributeButton from "@/components/pods/ContributeButton";
import PodAdminLink from "@/components/pods/PodAdminLink";
import { getPod } from "@/lib/fetchers";
import { getServerUser } from "@/lib/server-auth";
import TaxShieldBanner from "@/components/pods/TaxShieldBanner";
import PodHeroHeader, { Pod } from "@/components/pods/PodHeroHeader";
import PodContributionAmount from "@/components/pods/PodContributionAmount";
import PoolProgress from "@/components/pods/PoolProgress";

async function MyPodPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const [pod, serverUser] = await Promise.all([
    getPod<Pod>(id),
    getServerUser(),
  ]);
  const isFull = pod.members.length >= pod.maxMembers;
  const isMember = pod.members.some((m) => m._id === serverUser?.id);

  return (
    <main className="min-h-screen">
      {/* ── Hero header ── */}
      <PodHeroHeader
        pod={pod}
        podsLink={{ href: "/my-pods", text: "My Pods" }}
      />

      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Tax Shield Banner */}
        <TaxShieldBanner />

        {/* Contribution amount */}
        <PodContributionAmount pod={pod} isMember={isMember} />

        {/* Pool progress */}
        <PoolProgress pod={pod} />

        {/* Live wallet balance — admin sees provision button */}
        <MemberWalletSection
          podId={pod._id}
          isAdmin={pod.createdBy === serverUser?.id}
        />

        {/* Payout queue + activity */}
        <MemberActivitySection
          podId={pod._id}
          payoutQueue={pod.payoutQueue}
          paidOutMembers={pod.paidOutMembers}
          memberIds={pod.members.map((m) => m._id)}
          isFull={isFull}
          userId={serverUser?.id ?? null}
        />

        {/* Contribute button (only for members) */}
        <ContributeButton
          podId={pod._id}
          podName={pod.name}
          contributionAmount={pod.contributionAmount}
          maxMembers={pod.maxMembers}
          currentCycle={pod.currentCycle}
          virtualAccount={pod.virtualAccount}
          userId={serverUser?.id ?? null}
          memberIds={pod.members.map((m) => m._id)}
        />

        {/* Admin link (only for pod creator) */}
        <PodAdminLink
          podId={pod._id}
          createdBy={pod.createdBy}
          userId={serverUser?.id ?? null}
        />
      </div>
    </main>
  );
}

export default MyPodPage;
