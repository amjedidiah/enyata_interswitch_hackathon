"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Building2, Copy, Check, ChevronDown, ChevronUp, Loader2, Minus, Plus } from "lucide-react";
import { AxiosError } from "axios";
import { paymentsApi } from "@/lib/api";
import { frequencyLabel } from "@/lib/pod-constants";

interface VirtualAccount {
  accountName: string;
  accountNumber: string;
  bankName: string;
}

interface Pod {
  id: string;
  name: string;
  contributionAmount: number;
  frequency: "daily" | "weekly" | "monthly";
  maxMembers: number;
  currentCycle: number;
  virtualAccount?: VirtualAccount;
}

interface JoinPodModalProps {
  pod: Pod;
  isOpen: boolean;
  onClose: () => void;
}

function CopyField({ label, value }: Readonly<{ label: string; value: string }>) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-brand-muted text-xs">{label}</p>
        <p className="font-mono font-semibold text-brand-text">{value}</p>
      </div>
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-lg hover:bg-brand-surface transition-colors text-brand-muted hover:text-brand-primary"
      >
        {copied ? <Check size={14} className="text-brand-success" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

function JoinPodModal({ pod, isOpen, onClose }: Readonly<JoinPodModalProps>) {
  const [accountOpen, setAccountOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remainingCycles = pod.maxMembers - pod.currentCycle + 1;
  const [cycles, setCycles] = useState(1);

  const totalAmount = pod.contributionAmount * cycles;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(n);

  const va = pod.virtualAccount;

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      await paymentsApi.join({ podId: pod.id, cycles });
      setSuccess(true);
    } catch (err: unknown) {
      const ax = err as AxiosError<{ error?: string }>;
      const message =
        ax.response?.data?.error ??
        (err instanceof Error ? err.message : "Failed to join pod");
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (success) {
      globalThis.location.reload();
    }
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 bg-brand-overlay z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={handleClose}
          >
            <div className="bg-brand-card rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-5" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-brand-primary">
                    {success ? "You're In!" : "Join Pod"}
                  </h2>
                  <p className="text-sm text-brand-muted mt-0.5">{pod.name}</p>
                </div>
                <button
                  onClick={handleClose}
                  className="text-brand-muted hover:text-brand-text transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {success ? (
                <>
                  <div className="bg-brand-success/10 rounded-xl p-4 text-center">
                    <p className="text-brand-success font-semibold">
                      Successfully joined {pod.name}
                    </p>
                    <p className="text-sm text-brand-muted mt-1">
                      Transfer {fmt(totalAmount)} to the account below to fund your contribution.
                    </p>
                  </div>

                  {va && (
                    <div className="bg-brand-surface rounded-xl p-4 flex flex-col gap-3">
                      <CopyField label="Account Number" value={va.accountNumber} />
                      <CopyField label="Bank" value={va.bankName} />
                      <CopyField label="Account Name" value={va.accountName} />
                      <CopyField label="Amount" value={fmt(totalAmount)} />
                    </div>
                  )}

                  <button
                    onClick={handleClose}
                    className="w-full py-2.5 rounded-xl bg-brand-primary text-brand-card text-sm font-semibold hover:bg-brand-primary/90 transition-colors"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  {/* Pod summary */}
                  <div className="bg-brand-surface rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-muted">Per-cycle contribution</span>
                      <span className="font-semibold text-brand-text">
                        {fmt(pod.contributionAmount)}
                        <span className="font-normal text-brand-muted">
                          {" "}/ {frequencyLabel[pod.frequency]}
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-muted">Current cycle</span>
                      <span className="font-semibold text-brand-text">
                        {pod.currentCycle} of {pod.maxMembers}
                      </span>
                    </div>
                  </div>

                  {/* Cycle pre-pay selector */}
                  {remainingCycles > 1 && (
                    <div className="bg-brand-surface rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-brand-text">Pre-pay cycles</p>
                          <p className="text-xs text-brand-muted mt-0.5">
                            Pay ahead to boost your trust score
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCycles((c) => Math.max(1, c - 1))}
                            disabled={cycles <= 1}
                            className="w-7 h-7 rounded-full border border-brand-border flex items-center justify-center text-brand-muted hover:border-brand-primary hover:text-brand-primary disabled:opacity-30 transition-colors"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-6 text-center font-bold text-brand-primary text-sm">
                            {cycles}
                          </span>
                          <button
                            onClick={() => setCycles((c) => Math.min(remainingCycles, c + 1))}
                            disabled={cycles >= remainingCycles}
                            className="w-7 h-7 rounded-full border border-brand-border flex items-center justify-center text-brand-muted hover:border-brand-primary hover:text-brand-primary disabled:opacity-30 transition-colors"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                      {cycles > 1 && (
                        <p className="text-xs text-brand-accent font-medium">
                          Pre-paying {cycles} cycles — this will be visible to the AI trust agent
                        </p>
                      )}
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm text-brand-muted">Total contribution</span>
                    <span className="text-lg font-bold text-brand-primary">{fmt(totalAmount)}</span>
                  </div>

                  {/* Virtual account transfer details */}
                  {va && (
                    <div className="border border-brand-accent/40 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setAccountOpen((o) => !o)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-brand-accent/10 text-sm font-semibold text-brand-accent"
                      >
                        <span className="flex items-center gap-2">
                          <Building2 size={15} />
                          Transfer Details
                        </span>
                        {accountOpen ? (
                          <ChevronUp size={15} />
                        ) : (
                          <ChevronDown size={15} />
                        )}
                      </button>

                      <AnimatePresence initial={false}>
                        {accountOpen && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 py-3 flex flex-col gap-3">
                              <CopyField label="Account Number" value={va.accountNumber} />
                              <CopyField label="Bank" value={va.bankName} />
                              <CopyField label="Account Name" value={va.accountName} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {error && (
                    <p className="text-sm text-brand-danger bg-brand-danger/10 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 py-2.5 rounded-xl border border-brand-border text-sm font-semibold text-brand-muted hover:bg-brand-surface transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={loading}
                      className="flex-1 py-2.5 rounded-xl bg-brand-primary text-brand-card text-sm font-semibold hover:bg-brand-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 size={15} className="animate-spin" />}
                      {loading ? "Joining…" : `Join & Pay ${fmt(totalAmount)}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default JoinPodModal;
