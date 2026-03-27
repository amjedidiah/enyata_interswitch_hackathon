import { ArrowLeft, Calendar, Users } from "lucide-react";
import Link from "next/link";
import { HexPattern } from "@/components/home/HomeHero";
import { frequencyLabel } from "@/lib/pod-constants";

export interface Member {
  _id: string;
  name: string;
  email: string;
}

export interface Pod {
  _id: string;
  name: string;
  contributionAmount: number;
  frequency: "daily" | "weekly" | "monthly";
  maxMembers: number;
  currentCycle: number;
  members: Member[];
  payoutQueue: Member[];
  paidOutMembers: Member[];
  contributionTotal: number;
  currentCycleTotal: number;
  status: "active" | "completed";
  createdBy: string;
  virtualAccount?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
  };
}

function PodHeroHeader({
  pod,
  podsLink,
}: Readonly<{ pod: Pod; podsLink: { text: string; href: string } }>) {
  return (
    <div className="relative bg-brand-primary text-brand-card overflow-hidden">
      <HexPattern />
      <div className="absolute left-0 top-0 h-full w-1 bg-brand-accent" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 100% 50%, color-mix(in srgb, var(--color-brand-accent) 8%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 max-w-2xl mx-auto px-6 pt-28 pb-8">
        <Link
          href={podsLink.href}
          className="inline-flex items-center gap-1.5 text-brand-card/50 text-xs hover:text-brand-card/80 transition-colors mb-5"
        >
          <ArrowLeft size={12} />
          {podsLink.text}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl md:text-4xl font-black leading-tight">
            {pod.name}
          </h1>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
              pod.status === "active"
                ? "bg-brand-success/15 text-brand-success border-brand-success/30"
                : "bg-brand-card/10 text-brand-card/60 border-brand-card/20"
            }`}
          >
            {pod.status === "active" ? "Active" : "Completed"}
          </span>
        </div>
        <div className="flex items-center gap-5 mt-3 text-sm text-brand-card/50">
          <span className="flex items-center gap-1.5">
            <Calendar size={14} />
            {frequencyLabel[pod.frequency]} contributions
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={14} />
            {pod.members.length}/{pod.maxMembers} members
          </span>
        </div>
      </div>
    </div>
  );
}

export default PodHeroHeader;
