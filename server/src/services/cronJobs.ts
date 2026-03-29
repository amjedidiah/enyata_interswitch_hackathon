import cron from "node-cron";
import Pod from "../models/Pod";
import { evaluateAndReorderQueue, cycleDueDate } from "./queueService";

/**
 * Scheduled job: runs every hour and checks all active pods to see if the
 * current cycle's contribution deadline has passed. If it has, and the pod
 * hasn't been evaluated since the deadline, trigger an AI evaluation to
 * reorder the queue. This mirrors the real-life ajo cadence where members
 * learn their updated positions after each contribution deadline.
 *
 * Schedule: every hour at minute 0 (e.g. 08:00, 09:00, ...).
 * Pods are checked hourly rather than once daily so that daily-frequency pods
 * are processed promptly.
 */
export function startCronJobs() {
  cron.schedule("0 * * * *", async () => {
    console.info("[cron] Running cycle-deadline evaluation check…");
    await runCycleDeadlineEvaluations();
  });

  console.info("[cron] Scheduled: cycle-deadline evaluations (every hour)");
}

/**
 * Core logic extracted so the HTTP trigger route can call it directly
 * (for demos and testing) without waiting for the cron schedule.
 */
export async function runCycleDeadlineEvaluations(): Promise<{
  evaluated: string[];
  skipped: string[];
  errors: string[];
}> {
  const now = new Date();
  const evaluated: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  const activePods = await Pod.find({ status: "active" });

  for (const pod of activePods) {
    try {
      // Compute the deadline for the current cycle
      const deadline = cycleDueDate(
        pod.frequency,
        pod.createdAt,
        pod.currentCycle,
      );

      // Only evaluate if the deadline has passed
      if (now <= deadline) {
        skipped.push(`${pod.name} — deadline not yet passed`);
        continue;
      }

      // Skip if already evaluated after this deadline
      if (pod.lastEvaluatedAt && pod.lastEvaluatedAt > deadline) {
        skipped.push(`${pod.name} — already evaluated this cycle`);
        continue;
      }

      // Skip if queue is empty (all paid out)
      if (pod.payoutQueue.length === 0) {
        skipped.push(`${pod.name} — queue empty`);
        continue;
      }

      console.info(
        `[cron] Evaluating pod "${pod.name}" (${pod._id}) — cycle ${pod.currentCycle} deadline passed`,
      );

      await evaluateAndReorderQueue(pod._id.toString());

      // Mark the pod as evaluated
      pod.lastEvaluatedAt = now;
      await pod.save();

      evaluated.push(pod.name);
    } catch (err) {
      const msg = `${pod.name}: ${(err as Error).message}`;
      console.error(`[cron] Evaluation failed for pod "${pod.name}":`, err);
      errors.push(msg);
    }
  }

  console.info(
    `[cron] Cycle-deadline evaluation complete — evaluated: ${evaluated.length}, skipped: ${skipped.length}, errors: ${errors.length}`,
  );

  return { evaluated, skipped, errors };
}
