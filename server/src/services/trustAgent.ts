import { ChatDeepSeek } from "@langchain/deepseek";
import { z } from "zod";

const TrustScoreSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .describe("Trust score from 0 (worst) to 100 (best)"),
  reasoning: z
    .string()
    .describe(
      'One sentence explaining the score, e.g. "Moved to back of queue due to 2 consecutive missed payments in March."',
    ),
  riskFlag: z
    .boolean()
    .describe(
      "True if the score is below 50 and the user should be moved to the end of the payout queue",
    ),
});

export type TrustScoreResult = z.infer<typeof TrustScoreSchema>;

export type CycleOutcome =
  | "on_time" // paid before due date
  | "late" // paid after due date
  | "missed" // no successful payment recorded
  | "resolved_late" // initially failed, then resolved by manual/retry (counts as late)
  | "pending"; // current cycle, not yet due

export interface CycleDetail {
  cycle: number;
  outcome: CycleOutcome;
}

export interface UserPaymentData {
  userId: string;
  /** Per-cycle payment timeline for this pod. */
  cycleHistory: CycleDetail[];
  completedPods: number;
  /** 1-indexed position in the current payout queue. 0 = already paid out. */
  queuePosition: number;
  /** Total number of members in the pod. */
  totalMembers: number;
  /** Cross-pod platform history (optional — absent for first-ever pod). */
  platformHistory?: {
    totalPodsJoined: number;
    onTimeAcrossAllPods: number;
    lateAcrossAllPods: number;
    missedAcrossAllPods: number;
    avgTrustScore: number | null;
  };
}

export async function scoreTrust(
  userData: UserPaymentData,
): Promise<TrustScoreResult> {
  const model = new ChatDeepSeek({
    model: "deepseek-chat",
    apiKey: process.env.DEEPSEEK_API_KEY,
    temperature: 0,
  }).withStructuredOutput(TrustScoreSchema);

  const waitContext =
    userData.queuePosition === 0
      ? "This member has already received their payout this cycle."
      : `This member is at position ${userData.queuePosition} of ${userData.totalMembers} in the payout queue — they have been contributing for ${userData.queuePosition - 1} cycle(s) without receiving a payout yet.`;

  const platformSection = userData.platformHistory
    ? `
Platform-wide history (across all pods this user has joined):
- Total pods joined: ${userData.platformHistory.totalPodsJoined}
- On-time payments (all pods): ${userData.platformHistory.onTimeAcrossAllPods}
- Late payments (all pods): ${userData.platformHistory.lateAcrossAllPods}
- Missed payments (all pods): ${userData.platformHistory.missedAcrossAllPods}${userData.platformHistory.avgTrustScore === null ? "" : `\n- Average trust score across pods: ${userData.platformHistory.avgTrustScore.toFixed(0)}`}

Use the platform-wide history as context: a member with a strong track record across multiple pods is more trustworthy than their current pod stats alone might suggest. For new members with no history in this pod, lean on the platform-wide data as a baseline.`
    : "";

  // Build per-cycle timeline for the prompt
  const cycleLines = userData.cycleHistory.map((c) => {
    const labels: Record<CycleOutcome, string> = {
      on_time: "Paid on time",
      late: "Paid late",
      missed: "MISSED — no payment recorded",
      resolved_late:
        "Failed card charge → resolved by manual/retry payment (late)",
      pending: "Current cycle — payment pending",
    };
    return `  Cycle ${c.cycle}: ${labels[c.outcome]}`;
  });

  // Derive summary counts from cycle history for the prompt
  const onTime = userData.cycleHistory.filter(
    (c) => c.outcome === "on_time",
  ).length;
  const late = userData.cycleHistory.filter(
    (c) => c.outcome === "late" || c.outcome === "resolved_late",
  ).length;
  const missed = userData.cycleHistory.filter(
    (c) => c.outcome === "missed",
  ).length;

  const prompt = `You are an AI Trust Agent for AjoFlow, a digital savings circle (ROSCA) platform.
Evaluate the payment reliability of a user based on their per-cycle contribution history and queue context, then return a structured trust score.

Per-cycle payment history (this pod):
${cycleLines.join("\n")}

Summary: ${onTime} on-time, ${late} late/resolved, ${missed} missed. Completed pods: ${userData.completedPods}.
${platformSection}
Queue context:
- ${waitContext}

Key concepts:
- "resolved_late" means the member initially failed to pay (card declined, etc.) but later made good via a manual or retry payment. This is better than a full miss but worse than paying on time — treat it similarly to a late payment.
- "missed" means no successful payment was ever recorded for that cycle. This is the most serious negative signal.

Scoring guidelines:
- 80-100: Excellent — consistent on-time payments, no failures
- 60-79: Good — mostly reliable with minor issues (e.g. one late or resolved payment)
- 40-59: Fair — some missed or late payments, moderate risk
- 0-39: Poor — repeated failures, high risk

Additional guidance:
- A member who has been waiting longer without a payout and has a borderline payment record (score near 50) should receive a small patience bonus (up to +5 points) — they have demonstrated commitment by continuing to contribute.
- A member who has already been paid out and then misses payments is penalised more harshly, as they have already benefited from the group's trust.
- Do not let wait time override serious reliability issues (multiple missed payments).
- For members who are new to this pod but have platform-wide history, use the cross-pod data to inform the baseline score rather than defaulting to zero.

Set riskFlag to true if the final score is below 50. The reasoning must be one concrete sentence referencing the actual numbers and, where relevant, the queue position.`;

  return model.invoke(prompt) as Promise<TrustScoreResult>;
}
