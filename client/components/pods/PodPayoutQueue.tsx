"use client";

import { useState, useEffect } from "react";
import { Users, CheckCircle2, CircleDot } from "lucide-react";
import { podsApi } from "@/lib/api";
import TrustScoreCard from "@/components/pods/TrustScoreCard";
import { AnimatePresence } from "framer-motion";
import Motion from "@/components/shared/Motion";
import { isIso8601DateTime } from "@/lib/iso";

interface Member {
  _id: string;
  name: string;
  email: string;
}

export interface TrustScoreData {
  score: number;
  reasoning: string;
  riskFlag: boolean;
  movedByAI: boolean;
}

interface PodPayoutQueueProps {
  podId: string;
  payoutQueue: Member[];
  paidOutMembers: Member[];
  partialPayoutMemberIds?: string[];
  nextRecipientMissedCycles?: number[];
  refreshKey?: number;
  lastEvaluatedAt?: string;
}

function timeAgo(dateStr: string): string {
  if (!isIso8601DateTime(dateStr)) return "unknown";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "unknown";
  const diff = Date.now() - date.getTime();
  if (diff < 0) return "just now";

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function PodPayoutQueue({
  podId,
  payoutQueue,
  paidOutMembers,
  partialPayoutMemberIds = [],
  nextRecipientMissedCycles = [],
  refreshKey = 0,
  lastEvaluatedAt,
}: Readonly<PodPayoutQueueProps>) {
  const safeLastEvaluatedAt =
    lastEvaluatedAt && isIso8601DateTime(lastEvaluatedAt)
      ? lastEvaluatedAt
      : undefined;

  const [trustScores, setTrustScores] = useState<
    Record<string, TrustScoreData>
  >({});

  useEffect(() => {
    podsApi
      .trustScores(podId)
      .then(({ data }) => setTrustScores(data))
      .catch(() => {});
  }, [podId, refreshKey]);

  return (
    <div className="bg-brand-card rounded-2xl border border-brand-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-brand-text flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-primary/8 flex items-center justify-center">
            <Users size={14} className="text-brand-primary" />
          </div>
          Payout Queue
        </h2>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-brand-success">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-success" />
            {""}
            Active
          </span>
          <span className="text-xs text-brand-muted">
            {payoutQueue.length} remaining
          </span>
        </div>
      </div>
      {safeLastEvaluatedAt && (
        <p className="text-[11px] text-brand-muted mb-3 -mt-2">
          Queue ranked by AI · updated {timeAgo(safeLastEvaluatedAt)}
        </p>
      )}

      {payoutQueue.length === 0 ? (
        <p className="text-sm text-brand-muted">
          All members have been paid out this cycle.
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-brand-border">
          <AnimatePresence>
            {payoutQueue.map((member, i) => {
              const ts = trustScores[member._id];
              return (
                <Motion
                  as="li"
                  key={member._id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="py-4 first:pt-0 last:pb-0"
                >
                  <TrustScoreCard
                    position={i + 1}
                    name={member.name}
                    email={member.email}
                    score={ts?.score}
                    reasoning={ts?.reasoning}
                    riskFlag={ts?.riskFlag ?? false}
                    movedByAI={ts?.movedByAI ?? false}
                    isNext={i === 0}
                    isPartialPayout={
                      i === 0 && nextRecipientMissedCycles.length > 0
                    }
                  />
                </Motion>
              );
            })}
          </AnimatePresence>
        </ol>
      )}

      {paidOutMembers.length > 0 && (
        <div className="mt-5 pt-5 border-t border-brand-border">
          <p className="text-xs text-brand-muted font-semibold uppercase tracking-widest mb-3">
            Paid Out
          </p>
          <ul className="flex flex-col gap-2">
            {paidOutMembers.map((m) => {
              const isPartial = partialPayoutMemberIds.includes(m._id);
              return (
                <li
                  key={m._id}
                  className="flex items-center gap-2 text-sm text-brand-muted"
                >
                  {isPartial ? (
                    <CircleDot
                      size={14}
                      className="text-brand-warning shrink-0"
                    />
                  ) : (
                    <CheckCircle2
                      size={14}
                      className="text-brand-success shrink-0"
                    />
                  )}
                  {m.name}
                  {isPartial && (
                    <span className="text-[10px] font-semibold text-brand-warning bg-brand-warning/10 px-1.5 py-0.5 rounded-full">
                      partial
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default PodPayoutQueue;
