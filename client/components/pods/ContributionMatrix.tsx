"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Minus,
  Grid3x3,
  AlertTriangle,
} from "lucide-react";
import { AxiosError } from "axios";
import { podsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

type CycleStatus = "success" | "failed" | "pending" | "upcoming";

interface MemberRow {
  userId: string;
  name: string;
  cycles: { cycle: number; status: CycleStatus }[];
}

interface MatrixData {
  totalCycles: number;
  currentCycle: number;
  members: MemberRow[];
}

function StatusCell({
  status,
  isCurrent,
}: Readonly<{ status: CycleStatus; isCurrent: boolean }>) {
  if (status === "success") {
    return (
      <CheckCircle2
        size={16}
        className="text-brand-success mx-auto"
        aria-label="Paid"
      />
    );
  }
  if (status === "failed") {
    return (
      <XCircle
        size={16}
        className="text-brand-danger mx-auto"
        aria-label="Missed"
      />
    );
  }
  if (status === "pending") {
    return (
      <Clock
        size={16}
        className="text-brand-warning mx-auto animate-pulse"
        aria-label="Pending"
      />
    );
  }
  // upcoming
  return (
    <Minus
      size={16}
      className={cn(
        "mx-auto",
        isCurrent ? "text-brand-muted" : "text-brand-muted/30",
      )}
      aria-label="Upcoming"
    />
  );
}

function ContributionMatrix({ podId }: Readonly<{ podId: string }>) {
  const [data, setData] = useState<MatrixData | null>(null);
  const [state, setState] = useState<"loading" | "error" | "hidden" | "ready">(
    "loading",
  );

  useEffect(() => {
    podsApi
      .contributionMatrix(podId)
      .then(({ data: d }) => {
        setData(d);
        setState("ready");
      })
      .catch((err: AxiosError) => {
        const status = err.response?.status;
        // 401/403 means not admin — hide silently
        setState(status === 401 || status === 403 ? "hidden" : "error");
      });
  }, [podId]);

  if (state === "hidden") return null;

  if (state === "loading") {
    return (
      <div className="bg-brand-surface rounded-2xl p-6 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 bg-brand-muted/20 rounded" />
          <div className="h-4 w-40 bg-brand-muted/20 rounded" />
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-3 w-24 bg-brand-muted/20 rounded" />
              <div className="flex gap-4 flex-1">
                {[1, 2, 3, 4].map((j) => (
                  <div
                    key={j}
                    className="h-3 w-6 bg-brand-muted/10 rounded mx-auto"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="bg-brand-surface rounded-2xl p-6">
        <h2 className="font-semibold text-brand-text mb-3 flex items-center gap-2">
          <Grid3x3 size={16} />
          Contribution Matrix
        </h2>
        <div className="flex items-center gap-2 text-sm text-brand-danger">
          <AlertTriangle size={14} className="shrink-0" />
          Could not load contribution data.
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-brand-surface rounded-2xl p-6">
        <h2 className="font-semibold text-brand-text mb-3 flex items-center gap-2">
          <Grid3x3 size={16} />
          Contribution Matrix
        </h2>
        <p className="text-sm text-brand-muted">
          No contribution data yet — the matrix will populate once members start
          contributing.
        </p>
      </div>
    );
  }

  const cycles = Array.from({ length: data.totalCycles }, (_, i) => i + 1);

  return (
    <div className="bg-brand-surface rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-brand-text flex items-center gap-2">
          <Grid3x3 size={16} />
          Contribution Matrix
        </h2>
        <div className="flex items-center gap-3 text-xs text-brand-muted">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={11} className="text-brand-success" /> Paid
          </span>
          <span className="flex items-center gap-1">
            <XCircle size={11} className="text-brand-danger" /> Missed
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} className="text-brand-warning" /> Pending
          </span>
          <span className="flex items-center gap-1">
            <Minus size={11} className="text-brand-muted" /> Upcoming
          </span>
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-brand-muted pb-3 pr-4 min-w-[100px]">
                Member
              </th>
              {cycles.map((c) => (
                <th
                  key={c}
                  className={cn(
                    "text-center text-xs font-semibold pb-3 px-2 min-w-[48px]",
                    c === data.currentCycle
                      ? "text-brand-primary"
                      : "text-brand-muted",
                  )}
                >
                  C{c}
                  {c === data.currentCycle && (
                    <span className="block w-1 h-1 rounded-full bg-brand-accent mx-auto mt-0.5" />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border/50">
            {data.members.map((member) => (
              <tr key={member.userId}>
                <td className="py-2.5 pr-4 text-xs font-medium text-brand-text truncate max-w-[110px]">
                  {member.name.split(" ")[0]}
                </td>
                {member.cycles.map(({ cycle, status }) => (
                  <td key={cycle} className="py-2.5 px-2 text-center">
                    <StatusCell
                      status={status}
                      isCurrent={cycle === data.currentCycle}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ContributionMatrix;
