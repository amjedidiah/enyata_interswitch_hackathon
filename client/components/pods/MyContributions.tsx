"use client";

import { useState, useEffect } from "react";
import { Receipt, AlertTriangle } from "lucide-react";
import { AxiosError } from "axios";
import { podsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ngn } from "@/lib/helpers";

interface Transaction {
  _id: string;
  amount: number;
  status: "pending" | "success" | "failed" | "manual";
  type: "contribution" | "disbursement";
  cycleNumber?: number;
  timestamp: string;
}

const statusStyle: Record<Transaction["status"], string> = {
  success: "bg-brand-success/10 text-brand-success",
  pending: "bg-brand-warning/10 text-brand-warning",
  failed: "bg-brand-danger/10 text-brand-danger",
  manual: "bg-brand-muted/10 text-brand-muted",
};

function MyContributions({ podId }: Readonly<{ podId: string }>) {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [state, setState] = useState<
    "loading" | "hidden" | "empty" | "error" | "ready"
  >("loading");

  useEffect(() => {
    podsApi
      .myContributions(podId)
      .then(({ data }) => {
        setTxns(data);
        setState(data.length > 0 ? "ready" : "empty");
      })
      .catch((err: AxiosError) => {
        const status = err.response?.status;
        // 401 = not logged in, 403 = not a member — hide silently
        setState(status === 401 || status === 403 ? "hidden" : "error");
      });
  }, [podId]);

  if (state === "loading") {
    return (
      <div className="bg-brand-surface rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 bg-brand-muted/20 rounded animate-pulse" />
          <div className="h-4 w-36 bg-brand-muted/20 rounded animate-pulse" />
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="h-3 w-24 bg-brand-muted/20 rounded animate-pulse" />
                <div className="h-2.5 w-16 bg-brand-muted/10 rounded animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="h-3 w-16 bg-brand-muted/20 rounded animate-pulse" />
                <div className="h-5 w-14 bg-brand-muted/10 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (state === "hidden") return null;

  if (state === "error") {
    return (
      <div className="bg-brand-surface rounded-2xl p-6">
        <h2 className="font-semibold text-brand-text mb-4 flex items-center gap-2">
          <Receipt size={16} />
          My Contributions
        </h2>
        <div className="flex items-center gap-2 text-sm text-brand-danger">
          <AlertTriangle size={14} className="shrink-0" />
          Could not load your contribution history.
        </div>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="bg-brand-surface rounded-2xl p-6">
        <h2 className="font-semibold text-brand-text mb-4 flex items-center gap-2">
          <Receipt size={16} />
          My Contributions
        </h2>
        <p className="text-sm text-brand-muted">
          No contributions recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-brand-surface rounded-2xl p-6">
      <h2 className="font-semibold text-brand-text mb-4 flex items-center gap-2">
        <Receipt size={16} />
        My Contributions
      </h2>
      <ul className="flex flex-col gap-3">
        {txns.map((tx) => (
          <li key={tx._id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-brand-text capitalize">
                {tx.type === "contribution" && tx.cycleNumber
                  ? `Cycle ${tx.cycleNumber}`
                  : tx.type}
              </p>
              <p className="text-xs text-brand-muted">
                {new Date(tx.timestamp).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-semibold text-brand-text">
                {ngn(tx.amount)}
              </span>
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                  statusStyle[tx.status],
                )}
              >
                {tx.status}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MyContributions;
