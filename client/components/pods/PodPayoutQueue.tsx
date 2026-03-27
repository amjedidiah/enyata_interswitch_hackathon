"use client";

import { useState, useEffect } from "react";
import { Users, CheckCircle2 } from "lucide-react";
import { podsApi } from "@/lib/api";
import TrustScoreCard from "@/components/pods/TrustScoreCard";
import { AnimatePresence } from "framer-motion";
import Motion from "@/components/shared/Motion";

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
  refreshKey?: number;
}

function PodPayoutQueue({
  podId,
  payoutQueue,
  paidOutMembers,
  refreshKey = 0,
}: Readonly<PodPayoutQueueProps>) {
  const [trustScores, setTrustScores] = useState<
    Record<string, TrustScoreData>
  >({});

  useEffect(() => {
    podsApi
      .trustScores(podId)
      .then(({ data }) => setTrustScores(data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <span className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse" />
            {""}
            Live
          </span>
          <span className="text-xs text-brand-muted">
            {payoutQueue.length} remaining
          </span>
        </div>
      </div>

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
                    movedByAI={ts?.movedByAI ?? false}
                    isNext={i === 0}
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
            {paidOutMembers.map((m) => (
              <li
                key={m._id}
                className="flex items-center gap-2 text-sm text-brand-muted"
              >
                <CheckCircle2
                  size={14}
                  className="text-brand-success shrink-0"
                />
                {m.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default PodPayoutQueue;
