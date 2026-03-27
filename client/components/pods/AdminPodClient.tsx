"use client";

import { useState, useEffect, SubmitEvent, useMemo } from "react";
import {
  TrendingUp,
  RotateCcw,
  Trophy,
  ArrowLeft,
  Brain,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { HexPattern } from "@/components/home/HomeHero";
import { AxiosError } from "axios";
import { toast } from "sonner";
import api, { podsApi, paymentsApi } from "@/lib/api";
import { ngn } from "@/lib/helpers";
import WalletBalanceWidget from "@/components/pods/WalletBalanceWidget";
import PodPayoutQueue, {
  TrustScoreData,
} from "@/components/pods/PodPayoutQueue";
import { useAuthContext } from "@/contexts/AuthContext";
import TaxShieldBanner from "./TaxShieldBanner";
import { frequencyLabel } from "@/lib/pod-constants";

interface Member {
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
  resetCount: number;
  members: Member[];
  payoutQueue: Member[];
  paidOutMembers: Member[];
  contributionTotal: number;
  currentCycleTotal: number;
  status: "active" | "completed";
  walletId?: string;
  createdBy: string;
}


function axErrMsg(e: unknown): string {
  const ax = e as AxiosError<{ error?: string }>;
  return ax.response?.data?.error ?? (e as Error).message;
}

function AdminPodClient({ pod: initialPod }: Readonly<{ pod: Pod }>) {
  const { user } = useAuthContext();
  const [pod, setPod] = useState(initialPod);
  const [walletRefreshKey, setWalletRefreshKey] = useState(0);
  const [trustRefreshKey, setTrustRefreshKey] = useState(0);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalCoolDown, setEvalCoolDown] = useState(0); // seconds remaining
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [manualForm, setManualForm] = useState({
    userId: "",
    cycleNumber: String(initialPod.currentCycle),
  });
  const [manualLoading, setManualLoading] = useState(false);
  const evalButtonText = useMemo(() => {
    if (evalLoading) return "Evaluating…";
    return evalCoolDown > 0
      ? `Cool-down — ${evalCoolDown}s`
      : "Run AI Evaluation";
  }, [evalCoolDown, evalLoading]);

  // Tick the evaluate cool down down one second at a time.
  useEffect(() => {
    if (evalCoolDown <= 0) return;
    const t = setTimeout(() => setEvalCoolDown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [evalCoolDown]);

  // Poll for pod updates every 15 seconds so the queue reflects changes
  // during the demo without requiring a manual refresh.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get<Pod>(`/api/pods/${pod._id}`);
        setPod(data);
      } catch {
        // silently ignore — manual refresh is always available
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [pod._id]);

  async function handlePayout() {
    setPayoutLoading(true);
    try {
      const { data } = await podsApi.payout(pod._id);
      setPod(data.pod);
      if (data.pod.walletId) setWalletRefreshKey((k) => k + 1);
      toast.success("Payout triggered successfully.");
    } catch (e) {
      toast.error(axErrMsg(e));
    } finally {
      setPayoutLoading(false);
    }
  }

  async function handleEvaluate() {
    setEvalLoading(true);
    try {
      const { data } = await podsApi.evaluate(pod._id);
      setPod(data.pod ?? data);
      const scoreMap: Record<string, TrustScoreData> = {};
      for (const ts of data.trustScores ?? []) {
        scoreMap[ts.userId] = ts;
      }
      setTrustRefreshKey((k) => k + 1);
      toast.success("AI evaluation complete — queue updated.");
    } catch (e: unknown) {
      const axErr = e as AxiosError<{ error?: string; retryAfter?: number }>;
      if (axErr.response?.status === 429) {
        const secs = axErr.response.data?.retryAfter ?? 60;
        setEvalCoolDown(secs);
        toast.error(
          axErr.response.data?.error ?? "Please wait before running again.",
        );
      } else {
        toast.error(axErrMsg(e));
      }
    } finally {
      setEvalLoading(false);
    }
  }

  async function handleReset() {
    setResetLoading(true);
    try {
      const { data } = await podsApi.reset(pod._id);
      setPod(data.pod);
      setTrustRefreshKey((k) => k + 1);
      toast.success("Pod reset — new rotation started.");
    } catch (e) {
      toast.error(axErrMsg(e));
    } finally {
      setResetLoading(false);
    }
  }

  async function handleProvisionWallet() {
    setProvisionLoading(true);
    try {
      const { data } = await podsApi.provisionWallet(pod._id);
      setPod((prev) => (prev ? { ...prev, walletId: data.walletId } : prev));
      setWalletRefreshKey((k) => k + 1);
      toast.success("Wallet provisioned.");
    } catch (e) {
      toast.error(axErrMsg(e));
    } finally {
      setProvisionLoading(false);
    }
  }

  async function handleManualPayment(e: SubmitEvent) {
    e.preventDefault();
    setManualLoading(true);
    try {
      await paymentsApi.manual({
        podId: pod._id,
        userId: manualForm.userId,
        cycleNumber: Number(manualForm.cycleNumber),
      });
      const { data } = await api.get<Pod>(`/api/pods/${pod._id}`);
      setPod(data);
      if (data.walletId) setWalletRefreshKey((k) => k + 1);
      setManualForm({ userId: "", cycleNumber: String(pod.currentCycle) });
      toast.success("Manual payment recorded.");
    } catch (e) {
      toast.error(axErrMsg(e));
    } finally {
      setManualLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      {/* ── Hero header ── */}
      <div className="relative bg-brand-primary text-brand-card overflow-hidden">
        <HexPattern />
        <div className="absolute left-0 top-0 h-full w-1 bg-brand-accent" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, color-mix(in srgb, var(--color-brand-accent) 7%, transparent) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 max-w-2xl mx-auto px-6 pt-32 pb-10">
          <Link
            href={`/my-pods/${pod._id}`}
            className="inline-flex items-center gap-1.5 text-brand-card/50 hover:text-brand-card/80 text-xs font-medium transition-colors mb-4"
          >
            <ArrowLeft size={13} />
            Member View
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-brand-accent text-xs font-semibold uppercase tracking-widest">
              Admin View
            </span>
          </div>
          <h1 className="text-4xl font-black leading-tight">{pod.name}</h1>
          <p className="text-brand-card/60 mt-2 text-sm">
            {frequencyLabel[pod.frequency]} · {ngn(pod.contributionAmount)}
            /cycle · {pod.members.length}/{pod.maxMembers} members
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-12 flex flex-col gap-6 pt-8">
        {/* Tax Shield Banner */}
        <TaxShieldBanner />

        {/* Community Impact */}
        {pod.contributionTotal > 0 && (
          <div className="bg-brand-primary rounded-2xl p-6 text-brand-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-brand-accent" />
              <span className="text-xs font-semibold text-brand-accent uppercase tracking-widest">
                Community Impact
              </span>
            </div>
            <p className="text-lg font-semibold leading-snug">
              This pod has successfully rotated{" "}
              <span className="text-brand-accent">
                {ngn(pod.contributionTotal)}
              </span>
              , empowering{" "}
              <span className="text-brand-accent">{pod.members.length}</span>{" "}
              members.
            </p>
          </div>
        )}

        {/* Pod Completed Banner */}
        {pod.status === "completed" && (
          <div className="bg-brand-success/10 border border-brand-success/30 rounded-2xl p-6 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Trophy size={20} className="text-brand-success shrink-0" />
              <div>
                <p className="font-semibold text-brand-success">
                  All {pod.maxMembers} cycles complete!
                </p>
                <p className="text-xs text-brand-muted mt-0.5">
                  Every member has received their payout.
                  {pod.resetCount > 0 &&
                    ` This pod has run ${pod.resetCount + 1} rotation(s).`}
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              disabled={resetLoading}
              className="w-full py-3 rounded-xl font-semibold bg-brand-success text-brand-card hover:bg-brand-success/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              {resetLoading ? "Resetting…" : "Start New Rotation"}
            </button>
          </div>
        )}

        {/* Live wallet balance */}
        <WalletBalanceWidget
          podId={pod._id}
          refreshKey={walletRefreshKey}
          onProvisionWallet={handleProvisionWallet}
          provisionLoading={provisionLoading}
          isAdmin={pod.createdBy === user?.id}
        />

        <PodPayoutQueue
          podId={pod._id}
          payoutQueue={pod.payoutQueue}
          paidOutMembers={pod.paidOutMembers}
          refreshKey={trustRefreshKey}
        />

        {/* Admin Actions */}
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 flex flex-col gap-3">
          <h2 className="font-semibold text-brand-text mb-1">Actions</h2>
          <button
            onClick={handlePayout}
            disabled={
              payoutLoading ||
              pod.payoutQueue.length === 0 ||
              pod.status === "completed"
            }
            className="hero-cta-primary w-full py-3 rounded-xl font-bold text-brand-primary relative overflow-hidden group disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {payoutLoading ? "Processing…" : "Trigger Payout"}
              {!payoutLoading && (
                <ArrowRight
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              )}
            </span>
            {!payoutLoading && <span className="hero-cta-shine" />}
          </button>
          <button
            onClick={handleEvaluate}
            disabled={
              evalLoading || evalCoolDown > 0 || pod.status === "completed"
            }
            className="w-full py-3 rounded-xl font-semibold border-2 border-brand-primary text-brand-primary hover:bg-brand-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Brain size={15} />
            {evalButtonText}
          </button>
        </div>

        {/* Record Manual Payment */}
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6">
          <h2 className="font-semibold text-brand-text mb-4">
            Record Manual Payment
          </h2>
          <form onSubmit={handleManualPayment} className="flex flex-col gap-3">
            <div>
              <label
                className="text-sm font-medium text-brand-text block mb-1"
                htmlFor="names"
              >
                Member
              </label>
              <select
                id="names"
                required
                value={manualForm.userId}
                onChange={(e) =>
                  setManualForm({ ...manualForm, userId: e.target.value })
                }
                className="w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm bg-brand-card focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                <option value="">Select member…</option>
                {pod.members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="text-sm font-medium text-brand-text block mb-1"
                htmlFor="cycleNumber"
              >
                Cycle
              </label>
              <select
                id="cycleNumber"
                required
                value={manualForm.cycleNumber}
                onChange={(e) =>
                  setManualForm({ ...manualForm, cycleNumber: e.target.value })
                }
                className="w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm bg-brand-card focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                {Array.from({ length: pod.currentCycle }, (_, i) => i + 1).map(
                  (c) => (
                    <option key={c} value={c}>
                      Cycle {c} — {ngn(pod.contributionAmount)}
                    </option>
                  ),
                )}
              </select>
            </div>
            <button
              type="submit"
              disabled={manualLoading}
              className="py-2.5 rounded-xl font-semibold bg-brand-primary text-brand-card hover:bg-brand-primary/90 disabled:opacity-50 transition-colors"
            >
              {manualLoading ? "Recording…" : "Record Payment"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default AdminPodClient;
