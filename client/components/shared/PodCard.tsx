import Link from "next/link";
import { Users, Calendar, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { frequencyLabel } from "@/lib/pod-constants";

interface PodCardProps {
  id: string;
  name: string;
  contributionAmount: number;
  frequency: "daily" | "weekly" | "monthly";
  memberCount: number;
  maxMembers: number;
  status: "active" | "completed";
  isMember: boolean;
}
function PodCard({
  id,
  name,
  contributionAmount,
  frequency,
  memberCount,
  maxMembers,
  status,
  isMember,
}: Readonly<PodCardProps>) {
  const spotsLeft = maxMembers - memberCount;
  const isFull = spotsLeft === 0;
  const spotsLabel = spotsLeft === 1 ? "spot" : "spots";
  const fillPct = Math.round((memberCount / maxMembers) * 100);

  const renderAction = () => {
    if (isMember) {
      return (
        <Link
          href={`/my-pods/${id}`}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold bg-brand-primary text-brand-card hover:bg-brand-primary/90 transition-colors group"
        >
          View my pod
          <ArrowRight
            size={16}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </Link>
      );
    }

    if (!isFull) {
      return (
        <Link
          href={`/pods/${id}`}
          className="hero-cta-primary w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold relative overflow-hidden group text-brand-primary"
        >
          <span className="relative z-10">
            {spotsLeft} {spotsLabel} left — View
          </span>
          <ArrowRight
            size={16}
            className="relative z-10 transition-transform duration-200 group-hover:translate-x-1"
          />
          <span className="hero-cta-shine" />
        </Link>
      );
    }

    return (
      <Link
        href={`/pods/${id}`}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold border border-brand-border text-brand-muted hover:border-brand-primary/30 hover:text-brand-primary transition-colors"
      >
        View pod
        <ArrowRight size={16} />
      </Link>
    );
  };

  return (
    <div className="feature-card h-full bg-brand-card rounded-2xl border border-brand-border p-6 flex flex-col gap-4 relative overflow-hidden">
      {/* Gold top accent */}
      <div className="absolute top-0 left-6 right-6 h-0.5 rounded-full bg-brand-accent/30" />

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-brand-text text-base leading-tight min-h-10">
          {name}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full border",
              status === "active"
                ? "bg-brand-success/10 text-brand-success border-brand-success/20"
                : "bg-brand-muted/10 text-brand-muted border-brand-border",
            )}
          >
            {status === "active" ? "Active" : "Completed"}
          </span>
          {isFull && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-danger/10 text-brand-danger border border-brand-danger/20">
              Full
            </span>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="leading-none">
        <span className="text-3xl font-black text-brand-primary">
          {new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
          }).format(contributionAmount)}
        </span>
        <span className="text-sm font-normal text-brand-muted ml-1">
          / {frequencyLabel[frequency].toLowerCase()}
        </span>
      </div>

      {/* Member progress meter */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-brand-muted">
            <Users size={12} />
            {memberCount}/{maxMembers} members
          </span>
          {!isFull && (
            <span className="font-semibold text-brand-accent">
              {spotsLeft} {spotsLabel} left
            </span>
          )}
        </div>
        <div className="h-1.5 bg-brand-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-accent rounded-full transition-all duration-700"
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>

      {/* Frequency */}
      <div className="flex items-center gap-1 text-xs text-brand-muted">
        <Calendar size={12} />
        <span>{frequencyLabel[frequency]} contributions</span>
      </div>

      <div className="mt-auto">{renderAction()}</div>
    </div>
  );
}

export default PodCard;
