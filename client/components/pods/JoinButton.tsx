"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import JoinPodModal from "@/components/pods/JoinPodModal";
import PodAdminLink from "@/components/pods/PodAdminLink";

interface Pod {
  id: string;
  name: string;
  contributionAmount: number;
  frequency: "daily" | "weekly" | "monthly";
  maxMembers: number;
  currentCycle: number;
  createdBy: string;
  virtualAccount?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
  };
}

function JoinButton({
  pod,
  isFull,
  memberIds,
  userId,
}: Readonly<{
  pod: Pod;
  isFull: boolean;
  memberIds: string[];
  userId: string | null;
}>) {
  const [open, setOpen] = useState(false);

  const isMember = !!userId && memberIds.includes(userId);

  if (isMember)
    return <PodAdminLink podId={pod.id} createdBy={pod.createdBy} userId={userId} />;

  if (isFull) {
    return (
      <button
        disabled
        className="w-full py-3.5 rounded-xl border border-brand-border text-brand-muted font-semibold text-sm cursor-not-allowed"
      >
        Pod Full
      </button>
    );
  }

  if (!userId) {
    return (
      <Link
        href={`/login?next=/pods/${pod.id}`}
        className="hero-cta-primary w-full py-3.5 rounded-xl text-brand-primary font-bold text-sm text-center block relative overflow-hidden group"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          Log in to Join
          <ArrowRight
            size={16}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </span>
        <span className="hero-cta-shine" />
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hero-cta-primary w-full py-3.5 rounded-xl text-brand-primary font-bold text-sm relative overflow-hidden group"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          Join This Pod
          <ArrowRight
            size={16}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </span>
        <span className="hero-cta-shine" />
      </button>
      <JoinPodModal pod={pod} isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default JoinButton;
