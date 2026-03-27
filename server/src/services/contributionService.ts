import Transaction from "../models/Transaction";
import { creditWallet } from "./wallet";

export interface ContributionResult {
  cycles: number;
  totalAmount: number;
  cycleNumbers: number[];
}

/**
 * Records one or more contribution cycles for a user in a pod.
 *
 * Handles: contribution cap validation, smart cycle assignment (skips
 * already-paid cycles), duplicate guard, transaction creation, and
 * wallet credit. Used by both `/join` and `/contribute` routes.
 *
 * @throws Error with a `.statusCode` property for HTTP-level errors
 */
export async function recordContribution(opts: {
  podId: string;
  userId: string;
  cycles: number;
  currentCycle: number;
  maxMembers: number;
  contributionAmount: number;
}): Promise<ContributionResult> {
  const { podId, userId, cycles, currentCycle, maxMembers, contributionAmount } = opts;

  // ── Contribution cap ──
  const maxContributions = maxMembers - 1;
  const paidCyclesCount = await Transaction.countDocuments({
    pod: podId,
    user: userId,
    type: "contribution",
    status: { $in: ["success", "manual"] },
  });

  const remainingAllowed = maxContributions - paidCyclesCount;

  if (remainingAllowed <= 0) {
    throw httpError(400, "You have already contributed for all your cycles.");
  }

  if (cycles > remainingAllowed) {
    throw httpError(
      400,
      `You can only pay ${remainingAllowed} more cycle(s).`,
    );
  }

  // ── Duplicate guard for single-cycle request on current cycle ──
  const alreadyPaidCurrent = await Transaction.findOne({
    pod: podId,
    user: userId,
    cycleNumber: currentCycle,
    type: "contribution",
    status: { $in: ["success", "manual"] },
  });

  if (alreadyPaidCurrent && cycles === 1) {
    throw httpError(
      409,
      `You have already contributed for cycle ${currentCycle}.`,
    );
  }

  // ── Smart cycle assignment — skip already-paid cycles ──
  const paidCycles = await Transaction.distinct("cycleNumber", {
    pod: podId,
    user: userId,
    type: "contribution",
    status: { $in: ["success", "manual"] },
  });
  const paidSet = new Set(paidCycles.map(Number));

  const txDocs: Array<{
    pod: string;
    user: string;
    amount: number;
    status: string;
    type: string;
    cycleNumber: number;
  }> = [];

  for (
    let cycle = currentCycle;
    cycle <= maxMembers && txDocs.length < cycles;
    cycle++
  ) {
    if (!paidSet.has(cycle)) {
      txDocs.push({
        pod: podId,
        user: userId,
        amount: contributionAmount,
        status: "success",
        type: "contribution",
        cycleNumber: cycle,
      });
    }
  }

  if (txDocs.length === 0) {
    throw httpError(400, "No unpaid cycles remaining.");
  }

  // ── Persist ──
  const totalAmount = contributionAmount * txDocs.length;
  const inserted = await Transaction.insertMany(txDocs);
  const interswitchRef = await creditWallet(podId, totalAmount);

  // Back-fill the Interswitch reference on the Transaction documents so they
  // can be reconciled against Interswitch records. All transactions in this
  // batch share the same callback reference (one API call for the total amount).
  if (interswitchRef) {
    const insertedIds = inserted.map((t) => t._id);
    await Transaction.updateMany(
      { _id: { $in: insertedIds } },
      { $set: { interswitchRef } },
    );
  }

  return {
    cycles: txDocs.length,
    totalAmount,
    cycleNumbers: txDocs.map((t) => t.cycleNumber),
  };
}

/** Convenience: creates an Error with a statusCode for route-level handling. */
function httpError(statusCode: number, message: string): Error & { statusCode: number } {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}
