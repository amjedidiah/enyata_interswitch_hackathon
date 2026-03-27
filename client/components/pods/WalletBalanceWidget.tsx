"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
  Building2,
} from "lucide-react";
import { AxiosError } from "axios";
import { podsApi } from "@/lib/api";
import { ngn } from "@/lib/helpers";
import { useAuthContext } from "@/contexts/AuthContext";

type WidgetState = "loading" | "hidden" | "error" | "ready" | "not_provisioned";

interface VirtualAccount {
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
  accountPayableCode: string;
}

function CopyButton({ text }: Readonly<{ text: string }>) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-all"
      style={{
        background: copied
          ? "color-mix(in srgb, var(--color-brand-success) 12%, transparent)"
          : "color-mix(in srgb, var(--color-brand-accent) 10%, transparent)",
        color: copied
          ? "var(--color-brand-success)"
          : "var(--color-brand-accent)",
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function WalletBalanceWidget({
  podId,
  refreshKey = 0,
  onProvisionWallet = async () => {},
  provisionLoading = false,
  isAdmin = false,
}: Readonly<{
  podId: string;
  refreshKey?: number;
  onProvisionWallet?: () => Promise<void>;
  provisionLoading?: boolean;
  isAdmin?: boolean;
}>) {
  const { hasToken, isInitialized } = useAuthContext();
  const [balance, setBalance] = useState<number | null>(null);
  const [ledgerBalance, setLedgerBalance] = useState<number | null>(null);
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null);
  const [widgetState, setWidgetState] = useState<WidgetState>("loading");

  const load = useCallback(async () => {
    setWidgetState("loading");
    try {
      const { data } = await podsApi.walletBalance(podId);
      if (data.balance === null) {
        // Wallet not provisioned - admin interaction
        setWidgetState("not_provisioned");
      } else {
        setBalance(data.balance);
        setLedgerBalance(data.ledgerBalance ?? null);
        setVirtualAccount(data.virtualAccount ?? null);
        setWidgetState("ready");
      }
    } catch (err: unknown) {
      const status = (err as AxiosError).response?.status;
      // 401 = not logged in, 403 = not a member — hide silently
      setWidgetState(status === 401 || status === 403 ? "hidden" : "error");
    }
  }, [podId]);

  useEffect(() => {
    // Don't call the authenticated endpoint if the user has no session.
    // api.ts would intercept the 401, attempt a refresh, and redirect to /login.
    if (!isInitialized || !hasToken) return;
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
    // refreshKey increment triggers a re-fetch without any other state change
  }, [load, isInitialized, hasToken, refreshKey]);

  // Derive hidden state from auth — avoids calling setState inside the effect
  if (!isInitialized || !hasToken || widgetState === "hidden") return null;

  if (widgetState === "loading") {
    return (
      <div className="bg-brand-card rounded-2xl border border-brand-border p-6 relative overflow-hidden animate-pulse">
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-brand-accent/30" />
        <div className="pl-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-brand-muted/20 rounded" />
              <div className="h-4 w-28 bg-brand-muted/20 rounded" />
            </div>
            <div className="h-3 w-14 bg-brand-muted/10 rounded" />
          </div>
          <div className="h-10 w-36 bg-brand-muted/20 rounded" />
          <div className="h-2.5 w-48 bg-brand-muted/10 rounded mt-2" />
        </div>
      </div>
    );
  }

  const header = (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Wallet size={16} className="text-brand-accent" />
        <span className="font-bold text-brand-text">Wallet</span>
      </div>
      <button
        onClick={load}
        className="text-xs text-brand-muted hover:text-brand-primary flex items-center gap-1 transition-colors"
      >
        <RefreshCw size={12} />
        Refresh
      </button>
    </div>
  );

  if (widgetState === "not_provisioned") {
    return (
      <div className="bg-brand-card rounded-2xl border border-brand-border p-6 relative overflow-hidden">
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{
            background:
              "linear-gradient(180deg, var(--color-brand-accent), var(--color-brand-accent-light))",
          }}
        />
        <div className="pl-3">
          {header}
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-brand-muted">
              No wallet provisioned yet.
            </p>
            {isAdmin && (
              <button
                onClick={onProvisionWallet}
                disabled={provisionLoading}
                className="shrink-0 hero-cta-primary px-4 py-2 rounded-xl font-semibold text-sm text-brand-primary relative overflow-hidden disabled:opacity-50"
              >
                <span className="relative z-10">
                  {provisionLoading ? "Provisioning…" : "Provision Wallet"}
                </span>
                <span className="hero-cta-shine" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (widgetState === "error") {
    return (
      <div className="bg-brand-card rounded-2xl border border-brand-border p-6 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-brand-danger" />
        <div className="pl-3">
          {header}
          <div className="flex items-center gap-2 text-sm text-brand-danger">
            <AlertTriangle size={14} className="shrink-0" />
            Could not fetch wallet balance.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-card rounded-2xl border border-brand-border p-6 relative overflow-hidden">
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{
          background:
            "linear-gradient(180deg, var(--color-brand-accent), var(--color-brand-accent-light))",
        }}
      />
      <div className="pl-3">
        {header}
        <p className="text-4xl font-black text-brand-primary">
          {ngn(balance ?? 0)}
        </p>
        <p className="text-xs text-brand-muted mt-1.5">
          Live balance held in a wallet — not in any admin account.
        </p>
        {ledgerBalance !== null && (
          <p className="text-xs text-brand-muted mt-1">
            DB Ledger:{" "}
            <span className="font-semibold text-brand-text">
              {ngn(ledgerBalance)}
            </span>
          </p>
        )}

        {virtualAccount && (
          <div
            className="mt-5 rounded-xl p-4"
            style={{
              background:
                "color-mix(in srgb, var(--color-brand-accent) 6%, var(--color-brand-surface))",
              border:
                "1px solid color-mix(in srgb, var(--color-brand-accent) 20%, transparent)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <Building2 size={13} className="text-brand-accent" />
              <span className="text-xs font-semibold text-brand-accent uppercase tracking-wider">
                Pay via Bank Transfer
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xl font-black text-brand-primary tracking-wide">
                  {virtualAccount.accountNumber}
                </p>
                <p className="text-xs text-brand-muted mt-0.5">
                  {virtualAccount.bankName} · {virtualAccount.accountName}
                </p>
              </div>
              <CopyButton text={virtualAccount.accountNumber} />
            </div>
            <p className="text-xs text-brand-muted mt-3 leading-relaxed">
              Transfer your contribution directly to this account. Funds are
              credited automatically to the pod wallet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WalletBalanceWidget;
