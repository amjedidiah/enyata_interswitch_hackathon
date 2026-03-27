import { Types } from "mongoose";
import Pod, { IPod } from "../models/Pod";
import User from "../models/User";
import Transaction from "../models/Transaction";
import TrustScore from "../models/TrustScore";
import { scoreTrust } from "./trustAgent";

export interface MemberEvaluation {
  userId: string;
  name: string;
  score: number;
  reasoning: string;
  riskFlag: boolean;
  movedByAI: boolean;
}

export interface EvaluationResult {
  pod: IPod;
  trustScores: MemberEvaluation[];
}

/**
 * Scores every member of a pod using the AI Trust Agent, saves the results to
 * the TrustScore collection, then reorders the payout queue so that any member
 * with a riskFlag (score < 50) is moved to the end while all other members
 * retain their original relative order.
 *
 * Returns the updated pod and the full array of trust score results so the
 * frontend can animate the reorder and surface AI reasoning inline.
 */
/**
 * Returns the due date for a given cycle number based on the pod's creation
 * date and contribution frequency. Contributions made after this date are
 * considered "late" by the trust scoring agent.
 */
function cycleDueDate(
  frequency: "daily" | "weekly" | "monthly",
  createdAt: Date,
  cycleNumber: number,
): Date {
  const d = new Date(createdAt);
  const offset = cycleNumber - 1; // cycle 1 is due on creation day
  if (frequency === "daily") {
    d.setDate(d.getDate() + offset);
  } else if (frequency === "weekly") {
    d.setDate(d.getDate() + offset * 7);
  } else {
    d.setMonth(d.getMonth() + offset);
  }
  // Due by end of that day
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function evaluateAndReorderQueue(
  podId: string,
): Promise<EvaluationResult> {
  const pod = await Pod.findById(podId);
  if (!pod) throw new Error("Pod not found");
  if (pod.payoutQueue.length === 0)
    throw new Error("Payout queue is empty — nothing to reorder");

  // Snapshot original queue order so we can detect which members were moved
  const originalOrder = pod.payoutQueue.map((id) => id.toString());

  // Score every pod member (including those already paid out — builds full trust history)
  const scored: Array<{
    userId: Types.ObjectId;
    name: string;
    score: number;
    reasoning: string;
    riskFlag: boolean;
  }> = [];

  // Build a position map for the current queue (1-indexed). Members not in the
  // queue (already paid out this cycle) get position 0.
  const queuePositionMap = new Map<string, number>();
  pod.payoutQueue.forEach((id, index) => {
    queuePositionMap.set(id.toString(), index + 1);
  });

  for (const memberId of pod.members) {
    try {
      const user = await User.findById(memberId);
      if (!user) continue;

      // Derive payment stats from the Transaction collection for this pod
      const contributions = await Transaction.find({
        pod: pod._id,
        user: memberId,
        type: "contribution",
      });

      const successful = contributions.filter(
        (t) => t.status === "success" || t.status === "manual",
      );
      const failedCardCharges = contributions.filter(
        (t) => t.status === "failed",
      ).length;

      // Classify successful contributions as on-time or late by comparing
      // the transaction timestamp to the cycle's due date.
      let onTimePayments = 0;
      let latePayments = 0;
      for (const tx of successful) {
        if (tx.cycleNumber == null) {
          onTimePayments++;
          continue;
        }
        const due = cycleDueDate(pod.frequency, pod.createdAt, tx.cycleNumber);
        const paidAt = tx.timestamp ?? (tx as { createdAt?: Date }).createdAt;
        if (paidAt && paidAt > due) {
          latePayments++;
        } else {
          onTimePayments++;
        }
      }

      // Count pods where this user has already received a payout (completed pod history)
      const completedPods = await Pod.countDocuments({
        paidOutMembers: memberId,
      });

      const queuePosition = queuePositionMap.get(memberId.toString()) ?? 0;

      // Cross-pod platform history: aggregate payment stats from ALL pods
      // this user has participated in (excluding the current pod to avoid
      // double-counting the per-pod stats above).
      const allPodContributions = await Transaction.find({
        user: memberId,
        pod: { $ne: pod._id },
        type: "contribution",
      });

      let platformHistory: Parameters<typeof scoreTrust>[0]["platformHistory"];

      if (allPodContributions.length > 0) {
        const totalPodsJoined = await Pod.countDocuments({ members: memberId });
        const crossPodSuccessful = allPodContributions.filter(
          (t) => t.status === "success" || t.status === "manual",
        );
        const crossPodFailed = allPodContributions.filter(
          (t) => t.status === "failed",
        ).length;

        // Classify cross-pod contributions as on-time or late.
        // We need each transaction's pod frequency + createdAt to compute due dates.
        const crossPodIds = [...new Set(allPodContributions.map((t) => t.pod.toString()))];
        const crossPods = await Pod.find({ _id: { $in: crossPodIds } }).select("frequency createdAt").lean();
        const crossPodMap = new Map(crossPods.map((p) => [p._id.toString(), p]));

        let crossOnTime = 0;
        let crossLate = 0;
        for (const tx of crossPodSuccessful) {
          const txPod = crossPodMap.get(tx.pod.toString());
          if (!txPod || tx.cycleNumber == null) {
            crossOnTime++;
            continue;
          }
          const due = cycleDueDate(txPod.frequency, txPod.createdAt, tx.cycleNumber);
          const paidAt = tx.timestamp ?? (tx as { createdAt?: Date }).createdAt;
          if (paidAt && paidAt > due) {
            crossLate++;
          } else {
            crossOnTime++;
          }
        }

        // Average trust score across other pods
        const latestScores = await TrustScore.find({
          user: memberId,
          pod: { $ne: pod._id },
        }).sort({ evaluatedAt: -1 }).lean();

        // De-duplicate to one score per pod (latest)
        const seenPods = new Set<string>();
        const uniqueScores: number[] = [];
        for (const ts of latestScores) {
          const key = ts.pod.toString();
          if (!seenPods.has(key)) {
            seenPods.add(key);
            uniqueScores.push(ts.score);
          }
        }
        const avgTrustScore = uniqueScores.length > 0
          ? uniqueScores.reduce((a, b) => a + b, 0) / uniqueScores.length
          : null;

        platformHistory = {
          totalPodsJoined,
          onTimeAcrossAllPods: crossOnTime,
          lateAcrossAllPods: crossLate,
          missedAcrossAllPods: crossPodFailed,
          avgTrustScore,
        };
      }

      const result = await scoreTrust({
        userId: memberId.toString(),
        onTimePayments,
        latePayments,
        missedPayments: failedCardCharges,
        completedPods,
        failedCardCharges,
        queuePosition,
        totalMembers: pod.members.length,
        platformHistory,
      });

      // Upsert so re-running evaluation updates the existing record rather than stacking duplicates
      await TrustScore.findOneAndUpdate(
        { user: memberId, pod: pod._id },
        {
          score: result.score,
          reasoning: result.reasoning,
          riskFlag: result.riskFlag,
          evaluatedAt: new Date(),
        },
        { upsert: true, new: true },
      );

      scored.push({
        userId: memberId,
        name: user.name,
        score: result.score,
        reasoning: result.reasoning,
        riskFlag: result.riskFlag,
      });
    } catch (err) {
      console.error(
        `[queueService] Failed to score member ${memberId} — skipping:`,
        err,
      );
    }
  }

  // Step 1 — Pin the next recipient (position 0). Once it's your turn, it's
  // your turn — demoting someone right before their payout based on a retroactive
  // AI score undermines trust. The admin/creator is NOT pinned; they play by the
  // same rules as everyone else to demonstrate fairness.
  const [pinnedNextRecipient, ...reorderCandidates] = pod.payoutQueue;

  const riskMap = new Map(
    scored.map((s) => [s.userId.toString(), s.riskFlag]),
  );

  // AI sort on remaining members only: safe keep relative order, risky go to end.
  const safe = reorderCandidates.filter((id) => !riskMap.get(id.toString()));
  const risky = reorderCandidates.filter((id) => riskMap.get(id.toString()));

  // Step 2 — Deterministic secondary sort within each bucket: members who have paid
  // the current cycle rank above those who haven't, regardless of AI trust score.
  const remainingQueue = [...safe, ...risky];
  const nextRecipient = pinnedNextRecipient;

  const paidThisCycle = new Set(
    (
      await Transaction.distinct("user", {
        pod: pod._id,
        cycleNumber: pod.currentCycle,
        type: "contribution",
        status: { $in: ["success", "manual"] },
      })
    ).map(String),
  );

  const sortByPayment = (arr: Types.ObjectId[]) => [
    ...arr.filter((id) => paidThisCycle.has(id.toString())),
    ...arr.filter((id) => !paidThisCycle.has(id.toString())),
  ];

  // Re-partition remaining members (excluding next recipient) and sort within buckets.
  const remainingSafe = remainingQueue.filter((id) => !riskMap.get(id.toString()));
  const remainingRisky = remainingQueue.filter((id) => riskMap.get(id.toString()));

  // Final order: next recipient → safe+paid → safe+unpaid → risky+paid → risky+unpaid
  pod.payoutQueue = nextRecipient
    ? [nextRecipient, ...sortByPayment(remainingSafe), ...sortByPayment(remainingRisky)]
    : [];
  await pod.save();
  await pod.populate("members", "name email");
  await pod.populate("payoutQueue", "name email");
  await pod.populate("paidOutMembers", "name email");

  const newOrder = pod.payoutQueue.map((id) => id.toString());

  // Build the response, flagging members who were visibly moved by the AI
  const trustScores: MemberEvaluation[] = scored.map((s) => {
    const id = s.userId.toString();
    const originalPos = originalOrder.indexOf(id);
    const newPos = newOrder.indexOf(id);
    // movedByAI is true only if the member was in the queue and shifted to a later position
    const movedByAI =
      originalPos !== -1 && s.riskFlag && newPos > originalPos;

    return {
      userId: id,
      name: s.name,
      score: s.score,
      reasoning: s.reasoning,
      riskFlag: s.riskFlag,
      movedByAI,
    };
  });

  return { pod, trustScores };
}
