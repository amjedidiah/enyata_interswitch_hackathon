"use client";

import { SubmitEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { podsApi } from "@/lib/api";
import { frequencyLabel } from "@/lib/pod-constants";

interface CreatePodModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FREQUENCIES = Object.keys(frequencyLabel);

function CreatePodModal({ isOpen, onClose }: Readonly<CreatePodModalProps>) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    contributionAmount: "",
    frequency: "weekly" as (typeof FREQUENCIES)[number],
    maxMembers: "",
    walletPin: "",
  });
  const [loading, setLoading] = useState(false);

  function reset() {
    setForm({
      name: "",
      contributionAmount: "",
      frequency: "weekly",
      maxMembers: "",
      walletPin: "",
    });
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(form.walletPin)) {
      toast.error("Wallet PIN must be exactly 4 digits.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await podsApi.create({
        name: form.name.trim(),
        contributionAmount: Number(form.contributionAmount),
        frequency: form.frequency,
        maxMembers: Number(form.maxMembers),
        walletPin: form.walletPin || undefined,
      });
      toast.success(
        data.walletId
          ? "Pod created! Wallet provisioned."
          : "Pod created! Wallet could not be provisioned — retry from the manage page.",
      );
      handleClose();
      router.push(`/my-pods/${data._id}/manage`);
    } catch (err: unknown) {
      const ax = err as AxiosError<{ error?: string }>;
      const message =
        ax.response?.data?.error ??
        (err instanceof Error ? err.message : "Failed to create pod");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
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
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-brand-primary">
                    Create Pod
                  </h2>
                  <p className="text-sm text-brand-muted mt-0.5">
                    Start a new savings circle. A wallet will be provisioned
                    automatically.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="text-brand-muted hover:text-brand-text transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label
                    className="text-sm font-medium text-brand-text block mb-1"
                    htmlFor="podName"
                  >
                    Pod Name
                  </label>
                  <input
                    id="podName"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Lagos Gig Workers Pod"
                    className="w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className="text-sm font-medium text-brand-text block mb-1"
                      htmlFor="amount"
                    >
                      Contribution (₦)
                    </label>
                    <input
                      id="amount"
                      type="number"
                      required
                      min={100}
                      value={form.contributionAmount}
                      onChange={(e) =>
                        setForm({ ...form, contributionAmount: e.target.value })
                      }
                      placeholder="5000"
                      className="w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                  <div>
                    <label
                      className="text-sm font-medium text-brand-text block mb-1"
                      htmlFor="maxMembers"
                    >
                      Max Members
                    </label>
                    <input
                      id="maxMembers"
                      type="number"
                      required
                      min={2}
                      max={20}
                      value={form.maxMembers}
                      onChange={(e) =>
                        setForm({ ...form, maxMembers: e.target.value })
                      }
                      placeholder="4"
                      className="w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-brand-text block mb-2"
                    htmlFor="frequency"
                  >
                    Frequency
                  </label>
                  <div className="flex gap-2">
                    {FREQUENCIES.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setForm({ ...form, frequency: f })}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                          form.frequency === f
                            ? "bg-brand-primary text-brand-card"
                            : "bg-brand-surface border border-brand-border text-brand-muted hover:border-brand-primary/40"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    className="text-sm font-bold text-brand-primary block mb-3"
                    htmlFor="pin-"
                  >
                    Secure Your Wallet
                  </label>
                  <div className="flex gap-3 justify-center">
                    {[0, 1, 2, 3].map((i) => (
                      <input
                        key={i}
                        id={`pin-${i}`}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        required
                        value={form.walletPin[i] ?? ""}
                        onChange={(e) => {
                          const digit = e.target.value
                            .replaceAll(/\D/g, "")
                            .slice(0, 1);
                          const pins = form.walletPin.split("");
                          pins[i] = digit;
                          setForm({ ...form, walletPin: pins.join("") });
                          if (digit && i < 3) {
                            document.getElementById(`pin-${i + 1}`)?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Backspace" &&
                            !form.walletPin[i] &&
                            i > 0
                          ) {
                            document.getElementById(`pin-${i - 1}`)?.focus();
                          }
                        }}
                        className="w-14 h-16 text-center text-2xl font-black border-2 border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-brand-muted mt-2.5 text-center">
                    4-digit PIN to secure your pod&apos;s wallet. Keep it safe.
                  </p>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-2.5 rounded-xl border border-brand-border text-sm font-semibold text-brand-muted hover:bg-brand-surface transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-brand-primary text-brand-card text-sm font-semibold hover:bg-brand-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 size={15} className="animate-spin" />}
                    {loading ? "Creating…" : "Create Pod"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CreatePodModal;
