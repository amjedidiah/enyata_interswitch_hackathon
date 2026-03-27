"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Clock,
  Activity,
} from "lucide-react";
import { podsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ActivityEvent {
  id: string;
  type: "contribution" | "disbursement" | "trust_evaluation";
  status: string;
  text: string;
  timestamp: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getEventStyle(type: string, status: string) {
  if (type === "disbursement")
    return { Icon: ArrowUpRight, cls: "text-brand-accent bg-brand-accent/10" };
  if (type === "trust_evaluation" && status === "flagged")
    return { Icon: AlertTriangle, cls: "text-brand-warning bg-brand-warning/10" };
  if (type === "trust_evaluation")
    return { Icon: Sparkles, cls: "text-brand-primary bg-brand-primary/10" };
  if (status === "failed")
    return { Icon: AlertTriangle, cls: "text-brand-danger bg-brand-danger/10" };
  if (status === "pending")
    return { Icon: Clock, cls: "text-brand-muted bg-brand-muted/10" };
  return { Icon: CheckCircle, cls: "text-brand-success bg-brand-success/10" };
}

function ActivityFeed({ podId }: Readonly<{ podId: string }>) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [state, setState] = useState<"loading" | "empty" | "error" | "ready">("loading");

  useEffect(() => {
    podsApi
      .activity(podId)
      .then(({ data }: { data: ActivityEvent[] }) => {
        setEvents(data);
        setState(data.length > 0 ? "ready" : "empty");
      })
      .catch(() => setState("error"));
  }, [podId]);

  if (state === "loading") {
    return (
      <div className="bg-brand-card rounded-2xl border border-brand-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 bg-brand-muted/20 rounded animate-pulse" />
          <div className="h-4 w-24 bg-brand-muted/20 rounded animate-pulse" />
        </div>
        <ul className="flex flex-col divide-y divide-brand-border">
          {[1, 2, 3].map((i) => (
            <li key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div className="w-7 h-7 rounded-full bg-brand-muted/20 animate-pulse shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5 pt-0.5">
                <div className="h-3 w-3/4 bg-brand-muted/20 rounded animate-pulse" />
                <div className="h-2.5 w-16 bg-brand-muted/10 rounded animate-pulse" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="bg-brand-card rounded-2xl border border-brand-border p-6">
        <h2 className="font-semibold text-brand-text mb-4 flex items-center gap-2">
          <Activity size={16} />
          Pod Activity
        </h2>
        <p className="text-sm text-brand-muted">No activity recorded yet.</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="bg-brand-card rounded-2xl border border-brand-border p-6">
        <h2 className="font-semibold text-brand-text mb-4 flex items-center gap-2">
          <Activity size={16} />
          Pod Activity
        </h2>
        <div className="flex items-center gap-2 text-sm text-brand-danger">
          <AlertTriangle size={14} className="shrink-0" />
          Could not load activity. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-surface rounded-2xl p-6">
      <h2 className="font-semibold text-brand-text mb-4 flex items-center gap-2">
        <Activity size={16} />
        Pod Activity
      </h2>
      <ul className="flex flex-col divide-y divide-brand-border">
        {events.map((event) => {
          const { Icon, cls } = getEventStyle(event.type, event.status);
          return (
            <li key={event.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  cls,
                )}
              >
                <Icon size={13} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-brand-text leading-snug">
                  {event.text}
                </p>
                <p className="text-xs text-brand-muted mt-0.5">
                  {timeAgo(event.timestamp)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default ActivityFeed;
