"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Building2,
  Copy,
  Check,
  Loader2,
  Minus,
  Plus,
  Banknote,
} from "lucide-react";
import { AxiosError } from "axios";
import { paymentsApi, podsApi } from "@/lib/api";
import { ngn } from "@/lib/helpers";

interface VirtualAccount {
  accountName: string;
  accountNumber: string;
  bankName: string;
}

interface Props {
  podId: string;
  podName: string;
  contributionAmount: number;
  maxMembers: number;
  currentCycle: number;
  virtualAccount?: VirtualAccount;
  userId: string | null;
  memberIds: string[];
}

function CopyField({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
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
        {copied ? (
          <Check size={14} className="text-brand-success" />
        ) : (
          <Copy size={14} />
        )}
      </button>
    </div>
  );
}

function ContributeButton({
  podId,
  podName,
  contributionAmount,
  maxMembers,
  currentCycle,
  virtualAccount,
  userId,
  memberIds,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cycles, setCycles] = useState(1);
  const [paidCurrentCycle, setPaidCurrentCycle] = useState<boolean | null>(
    null,
  );

  const isMember = !!userId && memberIds.includes(userId);
  const maxPrepay = Math.max(1, maxMembers - currentCycle);
  const totalAmount = contributionAmount * cycles;

  // Check if current cycle is already paid
  useEffect(() => {
    if (!isMember) return;
    podsApi
      .myContributions(podId)
      .then(({ data }) => {
        const paid = (data as { cycleNumber?: number; status: string }[]).some(
          (tx) =>
            tx.cycleNumber === currentCycle &&
            (tx.status === "success" || tx.status === "manual"),
        );
        setPaidCurrentCycle(paid);
      })
      .catch(() => setPaidCurrentCycle(false));
  }, [podId, currentCycle, isMember]);

  if (!isMember || paidCurrentCycle === null) return null;

  // If already paid current cycle, check if there are future cycles to pre-pay
  if (paidCurrentCycle && currentCycle >= maxMembers) return null;

  async function handleContribute() {
    setLoading(true);
    setError(null);
    try {
      await paymentsApi.contribute({ podId, cycles });
      setSuccess(true);
    } catch (err: unknown) {
      const ax = err as AxiosError<{ error?: string }>;
      setError(
        ax.response?.data?.error ??
          (err instanceof Error ? err.message : "Failed to contribute"),
      );
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (success) {
      globalThis.location.reload();
    }
    setOpen(false);
    setSuccess(false);
    setError(null);
    setCycles(1);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hero-cta-primary w-full py-3.5 rounded-xl text-brand-primary font-bold text-sm relative overflow-hidden group"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          <Banknote size={16} />
          {paidCurrentCycle
            ? "Pre-pay Next Cycle"
            : `Contribute ${ngn(contributionAmount)}`}
        </span>
        <span className="hero-cta-shine" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 bg-brand-overlay z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
            />

            <motion.div
              key="modal"
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={handleClose}
            >
              <div
                className="bg-brand-card rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-brand-primary">
                      {success ? "Contribution Recorded" : "Make Contribution"}
                    </h2>
                    <p className="text-sm text-brand-muted mt-0.5">{podName}</p>
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
                        Contribution of {ngn(totalAmount)} recorded
                      </p>
                      <p className="text-sm text-brand-muted mt-1">
                        Transfer the amount to the account below to complete
                        your payment.
                      </p>
                    </div>

                    {virtualAccount && (
                      <div className="bg-brand-surface rounded-xl p-4 flex flex-col gap-3">
                        <CopyField
                          label="Account Number"
                          value={virtualAccount.accountNumber}
                        />
                        <CopyField
                          label="Bank"
                          value={virtualAccount.bankName}
                        />
                        <CopyField
                          label="Account Name"
                          value={virtualAccount.accountName}
                        />
                        <CopyField label="Amount" value={ngn(totalAmount)} />
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
                    {/* Current cycle info */}
                    <div className="bg-brand-surface rounded-xl p-4 flex flex-col gap-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-brand-muted">Current cycle</span>
                        <span className="font-semibold text-brand-text">
                          {currentCycle} of {maxMembers}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-brand-muted">Per-cycle amount</span>
                        <span className="font-semibold text-brand-text">
                          {ngn(contributionAmount)}
                        </span>
                      </div>
                      {paidCurrentCycle && (
                        <p className="text-xs text-brand-success font-medium mt-1">
                          Cycle {currentCycle} already paid — this will pre-pay
                          future cycles
                        </p>
                      )}
                    </div>

                    {/* Cycle selector */}
                    {maxPrepay > 1 && (
                      <div className="bg-brand-surface rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-brand-text">
                              Cycles to pay
                            </p>
                            <p className="text-xs text-brand-muted mt-0.5">
                              Pre-pay to boost your trust score
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                setCycles((c) => Math.max(1, c - 1))
                              }
                              disabled={cycles <= 1}
                              className="w-7 h-7 rounded-full border border-brand-border flex items-center justify-center text-brand-muted hover:border-brand-primary hover:text-brand-primary disabled:opacity-30 transition-colors"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="w-6 text-center font-bold text-brand-primary text-sm">
                              {cycles}
                            </span>
                            <button
                              onClick={() =>
                                setCycles((c) => Math.min(maxPrepay, c + 1))
                              }
                              disabled={cycles >= maxPrepay}
                              className="w-7 h-7 rounded-full border border-brand-border flex items-center justify-center text-brand-muted hover:border-brand-primary hover:text-brand-primary disabled:opacity-30 transition-colors"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                        {cycles > 1 && (
                          <p className="text-xs text-brand-accent font-medium">
                            Pre-paying {cycles} cycles — this will be visible to
                            the AI trust agent
                          </p>
                        )}
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex items-center justify-between px-1">
                      <span className="text-sm text-brand-muted">Total</span>
                      <span className="text-lg font-bold text-brand-primary">
                        {ngn(totalAmount)}
                      </span>
                    </div>

                    {/* Virtual account details */}
                    {virtualAccount && (
                      <div className="bg-brand-surface rounded-xl p-4 flex flex-col gap-3">
                        <p className="text-xs font-semibold text-brand-muted uppercase tracking-wide flex items-center gap-1.5">
                          <Building2 size={13} />
                          Transfer to
                        </p>
                        <CopyField
                          label="Account Number"
                          value={virtualAccount.accountNumber}
                        />
                        <CopyField
                          label="Bank"
                          value={virtualAccount.bankName}
                        />
                        <CopyField
                          label="Account Name"
                          value={virtualAccount.accountName}
                        />
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
                        onClick={handleClose}
                        className="flex-1 py-2.5 rounded-xl border border-brand-border text-sm font-semibold text-brand-muted hover:bg-brand-surface transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleContribute}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl bg-brand-primary text-brand-card text-sm font-semibold hover:bg-brand-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {loading && (
                          <Loader2 size={15} className="animate-spin" />
                        )}
                        {loading ? "Processing…" : `Pay ${ngn(totalAmount)}`}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default ContributeButton;
