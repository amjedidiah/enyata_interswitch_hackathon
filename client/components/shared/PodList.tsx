import PodCard from "@/components/shared/PodCard";
import Motion from "@/components/shared/Motion";

export interface PodSummary {
  _id: string;
  name: string;
  contributionAmount: number;
  frequency: "daily" | "weekly" | "monthly";
  members: unknown[];
  maxMembers: number;
  status: "active" | "completed";
}

function PodList({
  pods,
  userId,
}: Readonly<{ pods: PodSummary[]; userId?: string | null }>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {pods.map((pod, i) => {
        const isMember =
          !!userId &&
          Array.isArray(pod.members) &&
          pod.members.includes(userId);

        return (
          <Motion
            key={pod._id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06, ease: "easeOut" }}
            className="h-full"
          >
            <PodCard
              id={pod._id}
              name={pod.name}
              contributionAmount={pod.contributionAmount}
              frequency={pod.frequency}
              memberCount={pod.members.length}
              maxMembers={pod.maxMembers}
              status={pod.status}
              isMember={isMember}
            />
          </Motion>
        );
      })}
    </div>
  );
}

export default PodList;
