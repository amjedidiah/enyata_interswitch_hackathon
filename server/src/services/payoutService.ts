import Pod, { IPod } from "../models/Pod";
import User from "../models/User";
import Transaction from "../models/Transaction";
import * as interswitch from "./interswitch";
import { evaluateAndReorderQueue } from "./queueService";

/**
 * Triggers a payout for the next recipient in the pod's payout queue.
 *
 * Steps:
 * 1. Fetch the pod and validate it has a queue and a wallet.
 * 2. Run AI queue evaluation so the queue is always fresh before money moves.
 * 3. Identify the first user in the queue (current payout recipient).
 * 4. Verify the recipient has bank account details.
 * 5. Check the wallet balance is sufficient for a full cycle payout.
 * 6. Call Interswitch Disbursement API.
 * 7. On success, remove recipient from front of queue and save.
 * 8. Record a disbursement Transaction.
 */
export async function triggerPayout(podId: string): Promise<IPod> {
  const pod = await Pod.findById(podId);
  if (!pod) throw new Error("Pod not found");

  if (pod.payoutQueue.length === 0) {
    throw new Error("Payout queue is empty — all members have been paid out");
  }

  if (!pod.walletId) {
    throw new Error(
      "Pod has no wallet — cannot disburse funds. Create a wallet first.",
    );
  }

  // Always re-evaluate the queue before disbursing so the AI order is fresh
  // and the deterministic payment-status sort reflects the latest contributions.
  console.info(`[payout] Running pre-payout AI evaluation for pod ${podId}`);
  try {
    await evaluateAndReorderQueue(podId);
  } catch (err) {
    // Evaluation failure should not block payout — log and proceed with existing order
    console.warn(`[payout] Pre-payout evaluation failed, using existing queue order: ${err}`);
  }

  // Re-fetch pod after evaluation so we have the updated queue
  const freshPod = await Pod.findById(podId);
  if (!freshPod) throw new Error("Pod not found after evaluation");

  const recipientId = freshPod.payoutQueue[0];
  const recipient = await User.findById(recipientId);
  if (!recipient) throw new Error("Recipient user not found");

  if (!recipient.bankAccountNumber || !recipient.bankCode) {
    throw new Error(
      `Recipient ${recipient.name} has no bank account details on file`,
    );
  }

  // Gross payout = one full cycle (all members contribute once).
  // The recipient does not contribute in their own payout cycle — that is by design.
  const payoutAmount = freshPod.contributionAmount * freshPod.members.length;

  // Debt deduction: if the recipient missed contributions in any prior cycle,
  // their payout is reduced by that amount. The shortfall is recovered here
  // rather than blocking the payout entirely (debt carry-forward model).
  const paidPriorCycles: number[] = await Transaction.distinct("cycleNumber", {
    pod: podId,
    user: recipientId,
    type: "contribution",
    status: { $in: ["success", "manual"] },
    cycleNumber: { $lt: freshPod.currentCycle },
  });

  let debtAmount = 0;
  for (let cycle = 1; cycle < freshPod.currentCycle; cycle++) {
    if (!paidPriorCycles.includes(cycle)) {
      debtAmount += freshPod.contributionAmount;
    }
  }

  const netPayoutAmount = Math.max(0, payoutAmount - debtAmount);

  if (debtAmount > 0) {
    console.info(
      `[payout] Debt deduction — ${recipient.name} missed ${debtAmount / freshPod.contributionAmount} prior cycle(s). ` +
        `Gross: ₦${payoutAmount.toLocaleString()}, debt: ₦${debtAmount.toLocaleString()}, net: ₦${netPayoutAmount.toLocaleString()}`,
    );
  }

  console.info(
    `[payout] Initiating — pod: "${freshPod.name}" (${podId}), recipient: ${recipient.name}, ` +
      `gross: ₦${payoutAmount.toLocaleString()}, net: ₦${netPayoutAmount.toLocaleString()}`,
  );

  // Check the Interswitch wallet balance first (authoritative for real funds).
  // Fall back to the DB ledger if the API call fails (sandbox instability).
  let walletBalance: number;
  try {
    walletBalance = await interswitch.getWalletBalance(freshPod.walletId!);
  } catch (err) {
    console.warn(`[payout] Interswitch balance check failed, falling back to DB ledger:`, err);
    walletBalance = freshPod.contributionTotal;
  }

  if (walletBalance < netPayoutAmount) {
    throw new Error(
      `Insufficient wallet balance: ₦${walletBalance.toLocaleString()} available, ₦${netPayoutAmount.toLocaleString()} required`,
    );
  }

  const reference = interswitch.generateReference("PAYOUT", podId);

  if (netPayoutAmount > 0) {
    // Debit the Interswitch wallet (real fund movement)
    try {
      await interswitch.disburseFunds(
        freshPod.walletId!,
        netPayoutAmount,
        reference,
        freshPod.walletPin,
        `AjoFlow payout - ${freshPod.name} cycle ${freshPod.currentCycle}`,
      );
    } catch (err) {
      // On timeout or network error, re-query Interswitch to check if the
      // transaction actually went through before reporting failure.
      if (isTimeoutOrNetworkError(err)) {
        console.warn(`[payout] disburseFunds threw a timeout/network error for ref ${reference} — re-querying status`);
        try {
          const status = await interswitch.requeryTransaction(reference);
          const txStatus = String(status.status).toLowerCase();
          if (txStatus === "successful" || txStatus === "completed" || txStatus === "approved") {
            console.info(`[payout] Re-query confirms transaction ${reference} succeeded despite timeout`);
            // Fall through to success path below
          } else {
            throw new Error(
              `Disbursement failed (re-query status: ${status.status}). Ref: ${reference}. Original error: ${(err as Error).message}`,
            );
          }
        } catch (reqErr) {
          // Re-query itself failed — report both errors so admin can investigate
          console.error(`[payout] Re-query also failed for ref ${reference}:`, reqErr);
          throw new Error(
            `Disbursement status unknown — re-query failed. Ref: ${reference}. Do NOT retry without checking Interswitch dashboard. Original error: ${(err as Error).message}`,
          );
        }
      } else {
        // Clear rejection (4xx) — safe to surface directly
        throw err;
      }
    }
    // Also debit the internal DB ledger to keep it in sync
    freshPod.contributionTotal -= netPayoutAmount;
    console.info(
      `[payout] Disbursement successful — ₦${netPayoutAmount.toLocaleString()} → ${recipient.name} (${recipient.bankAccountNumber}), ref: ${reference}`,
    );
  } else {
    console.info(
      `[payout] Net payout is ₦0 after debt deduction — disbursement skipped, queue advanced for ${recipient.name}`,
    );
  }

  // Move recipient from front of queue to paidOutMembers for history tracking
  freshPod.payoutQueue.shift();
  freshPod.paidOutMembers.push(recipientId);

  if (freshPod.payoutQueue.length === 0) {
    // All cycles done — mark completed. currentCycle is NOT incremented here;
    // it correctly stays at the last cycle number (e.g. 4 of 4).
    freshPod.status = "completed";
  } else {
    freshPod.currentCycle += 1;
  }

  await freshPod.save();

  try {
    await Transaction.create({
      pod: podId,
      user: recipientId,
      amount: netPayoutAmount,
      status: "success",
      type: "disbursement",
      interswitchRef: reference,
    });
  } catch (err) {
    // Disbursement already succeeded — log the failure but don't re-throw.
    // A missing Transaction record is recoverable; re-throwing here would
    // misreport the payout as failed after money has already moved.
    console.error(
      `[payout] WARNING: disbursement succeeded but Transaction record failed to save (ref: ${reference}):`,
      err,
    );
  }

  return freshPod;
}

/**
 * Returns true for axios timeout and network errors where the request may or
 * may not have reached Interswitch — i.e. the transaction outcome is unknown.
 * Returns false for clear HTTP rejections (4xx/5xx with a response body).
 */
function isTimeoutOrNetworkError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const axiosErr = err as { code?: string; response?: unknown };
  // ECONNABORTED = axios timeout, ECONNRESET/ETIMEDOUT = network-level
  if (["ECONNABORTED", "ECONNRESET", "ETIMEDOUT", "ENETUNREACH"].includes(axiosErr.code ?? "")) {
    return true;
  }
  // No HTTP response at all means the request may not have completed
  return axiosErr.code !== undefined && !axiosErr.response;
}
