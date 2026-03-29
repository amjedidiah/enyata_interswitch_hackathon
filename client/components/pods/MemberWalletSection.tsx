"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { podsApi } from "@/lib/api";
import WalletBalanceWidget from "./WalletBalanceWidget";
import consola from "consola";

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
  const queryClient = useQueryClient();

  const handleProvisionWallet = useCallback(async () => {
    setProvisionLoading(true);
    try {
      await podsApi.provisionWallet(podId);
      queryClient.invalidateQueries({ queryKey: ["wallet-balance", podId] });
      toast.success("Wallet provisioned.");
    } catch (error) {
      toast.error("Failed to provision wallet.");
      consola.error(error);
    } finally {
      setProvisionLoading(false);
    }
  }, [podId, queryClient]);

  return (
    <WalletBalanceWidget
      podId={podId}
      onProvisionWallet={handleProvisionWallet}
      provisionLoading={provisionLoading}
      isAdmin={isAdmin}
    />
  );
}

export default MemberWalletSection;
