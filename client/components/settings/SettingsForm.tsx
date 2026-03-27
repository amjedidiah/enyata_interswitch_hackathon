"use client";

import { useState, SubmitEvent } from "react";
import {
  Loader2,
  Check,
  CreditCard,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { authApi } from "@/lib/api";

const NIGERIAN_BANKS = [
  { name: "Access Bank", code: "044" },
  { name: "Ecobank", code: "050" },
  { name: "Fidelity Bank", code: "070" },
  { name: "First Bank", code: "011" },
  { name: "FCMB", code: "214" },
  { name: "GTBank", code: "058" },
  { name: "Heritage Bank", code: "030" },
  { name: "Jaiz Bank", code: "301" },
  { name: "Keystone Bank", code: "082" },
  { name: "Kuda Bank", code: "090267" },
  { name: "Moniepoint", code: "100052" },
  { name: "OPay", code: "100004" },
  { name: "PalmPay", code: "100033" },
  { name: "Polaris Bank", code: "076" },
  { name: "Stanbic IBTC", code: "221" },
  { name: "Sterling Bank", code: "232" },
  { name: "UBA", code: "033" },
  { name: "Union Bank", code: "032" },
  { name: "Wema Bank", code: "035" },
  { name: "Zenith Bank", code: "057" },
];

function SettingsForm({
  initBankCode = "",
  initAccountNumber = "",
  initHasSaved,
}: Readonly<{
  initBankCode?: string;
  initAccountNumber?: string;
  initHasSaved: boolean;
}>) {
  const [bankCode, setBankCode] = useState(initBankCode);
  const [accountNumber, setAccountNumber] = useState(initAccountNumber);
  const [hasSaved, setHasSaved] = useState(initHasSaved);
  const [saving, setSaving] = useState(false);
  const selectedBank = NIGERIAN_BANKS.find((b) => b.code === bankCode);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!bankCode) {
      toast.error("Please select your bank.");
      return;
    }
    if (!/^\d{10}$/.test(accountNumber)) {
      toast.error("Account number must be exactly 10 digits.");
      return;
    }

    setSaving(true);
    try {
      await authApi.updateMe({
        bankAccountNumber: accountNumber,
        bankCode,
      });
      setHasSaved(true);
      toast.success("Bank details saved successfully.");
    } catch (err: unknown) {
      const ax = err as AxiosError<{ error?: string }>;
      toast.error(ax.response?.data?.error ?? "Failed to save bank details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {hasSaved && (
        <div
          className="flex items-center gap-2 mt-4 px-3 py-2 rounded-lg text-xs font-medium"
          style={{
            background:
              "color-mix(in srgb, var(--color-brand-success) 8%, transparent)",
            color: "var(--color-brand-success)",
          }}
        >
          <ShieldCheck size={14} />
          Bank details on file — you&apos;re eligible to receive payouts
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
        <div>
          <label
            className="text-sm font-medium text-brand-text block mb-1.5"
            htmlFor="bankCode"
          >
            Bank Name
          </label>
          <div className="relative">
            <select
              id="bankCode"
              required
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="w-full appearance-none border border-brand-border rounded-xl px-4 py-2.5 pr-10 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-primary/30 text-brand-text"
            >
              <option value="">Select your bank</option>
              {NIGERIAN_BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none"
            />
          </div>
          {selectedBank && (
            <p className="text-xs text-brand-muted mt-1">
              Bank code: {selectedBank.code}
            </p>
          )}
        </div>

        <div>
          <label
            className="text-sm font-medium text-brand-text block mb-1.5"
            htmlFor="accountNumber"
          >
            Account Number
          </label>
          <div className="relative">
            <input
              id="accountNumber"
              type="text"
              inputMode="numeric"
              required
              maxLength={10}
              value={accountNumber}
              onChange={(e) =>
                setAccountNumber(
                  e.target.value.replaceAll(/\D/g, "").slice(0, 10),
                )
              }
              placeholder="10-digit NUBAN"
              className="w-full border border-brand-border rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
            <CreditCard
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none"
            />
          </div>
          <p className="text-xs text-brand-muted mt-1">
            Your 10-digit Nigerian bank account number
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-full py-2.5 rounded-xl bg-brand-primary text-brand-card text-sm font-semibold hover:bg-brand-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Check size={15} />
              Save Bank Details
            </>
          )}
        </button>
      </form>
    </>
  );
}

export default SettingsForm;
