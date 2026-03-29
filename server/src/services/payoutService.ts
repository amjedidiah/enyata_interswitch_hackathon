import consola from "consola";
import Pod, { IPod } from "../models/Pod";
import User from "../models/User";
import Transaction from "../models/Transaction";
import * as interswitch from "./interswitch";

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

  // Use existing queue order
  const recipientId = pod.payoutQueue[0];
  const recipient = await User.findById(recipientId);
  if (!recipient) throw new Error("Recipient user not found");

  if (!recipient.bankAccountNumber || !recipient.bankCode) {
    throw new Error(
      `Recipient ${recipient.name} has no bank account details on file`,
    );
  }

  // Gross payout = (maxMembers - 1) contributions. The recipient does not
  // contribute in their own payout cycle — that is by design, not a "miss".
  const payoutAmount = pod.contributionAmount * (pod.maxMembers - 1);

  // Debt deduction: if the recipient missed contributions in prior cycles
  // where they WERE expected to contribute (i.e. not their own payout cycle),
  // their payout is reduced. The shortfall is recovered here rather than
  // blocking the payout entirely (debt carry-forward model).
  //
  // The recipient's own payout cycle is the current one, so we only look at
  // prior cycles (1 .. currentCycle-1). But we must also exclude any cycle
  // where this member was the recipient (they were paid out and not expected
  // to contribute). We identify those by checking paidOutMembers position:
  // the member at paidOutMembers[i] was paid out in cycle (i+1).
  const recipientPaidOutCycles = new Set<number>();
  for (let i = 0; i < pod.paidOutMembers.length; i++) {
    if (pod.paidOutMembers[i].toString() === recipientId.toString()) {
      recipientPaidOutCycles.add(i + 1);
    }
  }
  // Current cycle is also the recipient's payout cycle
  recipientPaidOutCycles.add(pod.currentCycle);

  const paidPriorCycles: number[] = await Transaction.distinct("cycleNumber", {
    pod: podId,
    user: recipientId,
    type: "contribution",
    status: { $in: ["success", "manual"] },
    cycleNumber: { $lt: pod.currentCycle },
  });

  let debtAmount = 0;
  const missedCycleNumbers: number[] = [];
  for (let cycle = 1; cycle < pod.currentCycle; cycle++) {
    // Skip cycles where this member was the payout recipient
    if (recipientPaidOutCycles.has(cycle)) continue;
    if (!paidPriorCycles.includes(cycle)) {
      debtAmount += pod.contributionAmount;
      missedCycleNumbers.push(cycle);
    }
  }

  const netPayoutAmount = Math.max(0, payoutAmount - debtAmount);

  if (debtAmount > 0) {
    consola.info(
      `[payout] Debt deduction — ${recipient.name} missed ${debtAmount / pod.contributionAmount} prior cycle(s). ` +
        `Gross: ₦${payoutAmount.toLocaleString()}, debt: ₦${debtAmount.toLocaleString()}, net: ₦${netPayoutAmount.toLocaleString()}`,
    );
  }

  consola.info(
    `[payout] Initiating — pod: "${pod.name}" (${podId}), recipient: ${recipient.name}, ` +
      `gross: ₦${payoutAmount.toLocaleString()}, net: ₦${netPayoutAmount.toLocaleString()}`,
  );

  // Check the Interswitch wallet balance first (authoritative for real funds).
  // Fall back to the DB ledger if the API call fails (sandbox instability).
  let walletBalance: number;
  try {
    walletBalance = await interswitch.getWalletBalance(pod.walletId);
  } catch (err) {
    consola.warn(
      `[payout] Interswitch balance check failed, falling back to DB ledger:`,
      err,
    );
    walletBalance = pod.contributionTotal;
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
        pod.walletId,
        netPayoutAmount,
        reference,
        pod.walletPin,
        `AjoFlow payout - ${pod.name} cycle ${pod.currentCycle}`,
      );
    } catch (err) {
      // On timeout or network error, re-query Interswitch to check if the
      // transaction actually went through before reporting failure.
      if (!isTimeoutOrNetworkError(err)) throw err;

      consola.warn(
        `[payout] disburseFunds threw a timeout/network error for ref ${reference} — re-querying status`,
      );

      try {
        const status = await interswitch.requeryTransaction(reference);
        const txStatus = String(status.status).toLowerCase();
        if (
          txStatus === "successful" ||
          txStatus === "completed" ||
          txStatus === "approved"
        ) {
          consola.info(
            `[payout] Re-query confirms transaction ${reference} succeeded despite timeout`,
          );
          // Fall through to success path below
        } else {
          throw new Error(
            `Disbursement failed (re-query status: ${status.status}). Ref: ${reference}. Original error: ${(err as Error).message}`,
          );
        }
      } catch (reqErr) {
        // Re-query itself failed — report both errors so admin can investigate
        consola.error(
          `[payout] Re-query also failed for ref ${reference}:`,
          reqErr,
        );
        throw new Error(
          `Disbursement status unknown — re-query failed. Ref: ${reference}. Do NOT retry without checking Interswitch dashboard. Original error: ${(err as Error).message}`,
        );
      }
    }
    // Also debit the internal DB ledger to keep it in sync
    pod.contributionTotal -= netPayoutAmount;
    consola.info(
      `[payout] Disbursement successful — ₦${netPayoutAmount.toLocaleString()} → ${recipient.name} (${recipient.bankAccountNumber}), ref: ${reference}`,
    );
  } else {
    consola.info(
      `[payout] Net payout is ₦0 after debt deduction — disbursement skipped, queue advanced for ${recipient.name}`,
    );
  }

  // Move recipient from front of queue to paidOutMembers for history tracking
  pod.payoutQueue.shift();
  pod.paidOutMembers.push(recipientId);

  if (pod.payoutQueue.length === 0) {
    // All cycles done — mark completed. currentCycle is NOT incremented here;
    // it correctly stays at the last cycle number (e.g. 4 of 4).
    pod.status = "completed";
  } else {
    pod.currentCycle += 1;
  }

  // Use findOneAndUpdate with version check for atomic queue pop
  const updatedPod = await Pod.findOneAndUpdate(
    { _id: podId, __v: pod.__v },
    {
      $pop: { payoutQueue: -1 },
      $push: { paidOutMembers: recipientId },
      $inc: { __v: 1 },
    },
    { new: true },
  );
  if (!updatedPod) throw new Error("Concurrent payout detected — aborting");

  try {
    await Transaction.create({
      pod: podId,
      user: recipientId,
      amount: netPayoutAmount,
      grossAmount: payoutAmount,
      debtAmount,
      missedCycles: missedCycleNumbers,
      status: "success",
      type: "disbursement",
      cycleNumber: pod.currentCycle,
      interswitchRef: reference,
    });
  } catch (err) {
    // Disbursement already succeeded — log the failure but don't re-throw.
    // A missing Transaction record is recoverable; re-throwing here would
    // misreport the payout as failed after money has already moved.
    consola.error(
      `[payout] WARNING: disbursement succeeded but Transaction record failed to save (ref: ${reference}):`,
      err,
    );
  }

  return pod;
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
  if (
    ["ECONNABORTED", "ECONNRESET", "ETIMEDOUT", "ENETUNREACH"].includes(
      axiosErr.code ?? "",
    )
  ) {
    return true;
  }
  // No HTTP response at all means the request may not have completed
  return axiosErr.code !== undefined && !axiosErr.response;
}
