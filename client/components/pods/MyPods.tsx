"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Crown,
  Users,
  AlertTriangle,
  Layers,
  RefreshCw,
  ArrowRight,
  Settings2,
} from "lucide-react";
import { ngn } from "@/lib/helpers";
import api from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import CreatePodModal from "@/components/pods/CreatePodModal";

interface PodSummary {
  _id: string;
  name: string;
  contributionAmount: number;
  frequency: "daily" | "weekly" | "monthly";
  members: { _id?: string; toString?: () => string }[];
  maxMembers: number;
  status: "active" | "completed";
  createdBy: string;
}

const freqLabel = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };

function MyPods() {
  const [pods, setPods] = useState<PodSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const { user } = useAuthContext();
  const userId = user?.id;

  const load = useCallback((opts?: { reset?: boolean }) => {
    if (opts?.reset) {
      setLoading(true);
      setError(false);
    }
    api
      .get<PodSummary[]>("/api/pods?member=true")
      .then(({ data }) => setPods(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-brand-card border border-brand-border rounded-2xl p-5 animate-pulse flex flex-col gap-3"
          >
            <div className="h-4 w-2/3 bg-brand-muted/15 rounded" />
            <div className="h-3 w-1/2 bg-brand-muted/10 rounded" />
            <div className="h-3 w-1/3 bg-brand-muted/10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between gap-3 bg-brand-danger/5 border border-brand-danger/20 rounded-2xl px-5 py-4">
        <span className="flex items-center gap-2 text-sm text-brand-danger">
          <AlertTriangle size={16} className="shrink-0" />
          Could not load your pods.
        </span>
        <button
          onClick={() => load({ reset: true })}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-danger hover:text-brand-danger/80 transition-colors shrink-0"
        >
          <RefreshCw size={12} />
          Retry
        </button>
      </div>
    );
  }

  if (pods.length === 0) {
    return (
      <>
        <CreatePodModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
        />
        <div className="flex flex-col items-center gap-4 py-16 text-center bg-brand-card rounded-2xl border border-dashed border-brand-border">
          <div className="w-14 h-14 rounded-2xl bg-brand-primary/8 flex items-center justify-center">
            <Layers size={24} className="text-brand-primary" />
          </div>
          <div>
            <p className="font-bold text-brand-text">No pods yet</p>
            <p className="text-sm text-brand-muted mt-1">
              Join an existing pod or create your own savings circle.
            </p>
          </div>
          <div className="flex gap-3 mt-1">
            <Link
              href="/pods"
              className="px-5 py-2 rounded-xl border border-brand-border text-brand-muted text-sm font-semibold hover:bg-brand-surface transition-colors"
            >
              Browse Pods
            </Link>
            <button
              onClick={() => setCreateOpen(true)}
              className="hero-cta-primary px-5 py-2 rounded-xl text-sm font-bold relative overflow-hidden group text-brand-primary"
            >
              <span className="relative z-10">+ Create Pod</span>
              <span className="hero-cta-shine" />
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CreatePodModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pods.map((pod) => {
          const isAdmin = pod.createdBy === userId;
          const fillPct = Math.min(
            (pod.members.length / pod.maxMembers) * 100,
            100,
          );
          return (
            <div
              key={pod._id}
              className="feature-card h-full bg-brand-card rounded-2xl p-5 flex flex-col gap-3 border border-brand-border relative overflow-hidden"
            >
              {/* Gold top accent */}
              <div className="absolute top-0 left-5 right-5 h-0.5 rounded-full bg-brand-accent/30" />

              <div className="flex items-start justify-between gap-2 pt-1">
                <Link
                  href={`/my-pods/${pod._id}`}
                  className="font-semibold text-brand-text hover:text-brand-primary transition-colors leading-tight"
                >
                  {pod.name}
                </Link>
                {isAdmin ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-full shrink-0">
                    <Crown size={10} />
                    Admin
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-brand-muted bg-brand-primary/6 px-2 py-0.5 rounded-full shrink-0">
                    <Users size={10} />
                    Member
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-brand-muted">
                <span className="font-semibold text-brand-text">
                  {ngn(pod.contributionAmount)}
                </span>
                <span>·</span>
                <span>{freqLabel[pod.frequency]}</span>
                <span>·</span>
                <span>
                  {pod.members.length}/{pod.maxMembers} members
                </span>
              </div>

              {/* Member fill bar */}
              <div className="h-1 bg-brand-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-accent rounded-full transition-all duration-700"
                  style={{ width: `${fillPct}%` }}
                />
              </div>

              <div className="flex gap-2 mt-auto">
                <Link
                  href={`/my-pods/${pod._id}`}
                  className="flex-1 py-2 rounded-lg border border-brand-border text-xs font-semibold text-brand-muted hover:border-brand-primary/30 hover:text-brand-primary transition-colors text-center flex items-center justify-center gap-1 group"
                >
                  View
                  <ArrowRight
                    size={11}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
                {isAdmin && (
                  <Link
                    href={`/my-pods/${pod._id}/manage`}
                    className="flex-1 hero-cta-primary py-2 rounded-lg text-xs font-bold text-brand-primary relative overflow-hidden group text-center flex items-center justify-center gap-1"
                  >
                    <span className="relative z-10 flex items-center gap-1">
                      <Settings2 size={11} />
                      Manage
                    </span>
                    <span className="hero-cta-shine" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default MyPods;
