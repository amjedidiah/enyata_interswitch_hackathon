import Pod from "../models/Pod";
import { creditWalletViaCallback } from "./interswitch";

/**
 * Credits a pod's Interswitch merchant wallet via the virtual account callback
 * and increments the local DB ledger.
 *
 * Design: DB ledger first, Interswitch best-effort. The ledger update always
 * runs so recorded contributions are never lost. The Interswitch call may fail
 * (especially in sandbox) — this is acceptable because:
 *
 * 1. A MongoDB transaction can't roll back an Interswitch API call — the real
 *    atomicity boundary is between two different systems (distributed txn).
 * 2. findByIdAndUpdate with $inc is already atomic at the document level.
 * 3. The DB ledger is the source of truth for what users contributed; Interswitch
 *    is the source of truth for what funds are available to disburse.
 * 4. A full saga/outbox pattern (Redis/BullMQ) is deferred to post-launch.
 */
export async function creditWallet(
  podId: string,
  amount: number,
  transactionRef?: string,
): Promise<string | undefined> {
  // Single DB operation: increment ledger and get the pre-update doc in one round-trip.
  const pod = await Pod.findByIdAndUpdate(
    podId,
    { $inc: { contributionTotal: amount } },
    { new: false },
  );
  if (!pod) throw new Error(`Pod ${podId} not found`);

  if (pod.virtualAccount?.accountNumber) {
    try {
      const ref = await creditWalletViaCallback(
        pod.virtualAccount.accountName,
        pod.virtualAccount.accountNumber,
        amount,
        transactionRef,
      );
      return ref;
    } catch (err) {
      console.error(`[wallet] Interswitch callback failed for pod ${podId}:`, err);
    }
  }
  return undefined;
}
