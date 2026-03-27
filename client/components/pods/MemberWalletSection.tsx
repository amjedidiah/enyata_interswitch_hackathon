"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { podsApi } from "@/lib/api";
import WalletBalanceWidget from "./WalletBalanceWidget";

/**
 * Thin client wrapper around WalletBalanceWidget that adds wallet provisioning
 * capability for pod admins. Replaces the bare <WalletBalanceWidget podId={…} />
 * on member and public pod views so the admin sees a "Provision Wallet" button
 * wherever the widget appears — not only on the manage page.
 */
function MemberWalletSection({
  podId,
  isAdmin,
}: Readonly<{
  podId: string;
  isAdmin: boolean;
}>) {
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleProvisionWallet = useCallback(async () => {
    setProvisionLoading(true);
    try {
      await podsApi.provisionWallet(podId);
      setRefreshKey((k) => k + 1);
      toast.success("Wallet provisioned.");
    } catch (error) {
      toast.error("Failed to provision wallet.");
      console.error(error);
    } finally {
      setProvisionLoading(false);
    }
  }, [podId]);

  return (
    <WalletBalanceWidget
      podId={podId}
      refreshKey={refreshKey}
      onProvisionWallet={handleProvisionWallet}
      provisionLoading={provisionLoading}
      isAdmin={isAdmin}
    />
  );
}

export default MemberWalletSection;
