import cron from "node-cron";
import pLimit from "p-limit";
import consola from "consola";
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
let isRunning = false;

export function startCronJobs() {
  cron.schedule("0 * * * *", async () => {
    if (isRunning) {
      consola.warn("[cron] Previous evaluation still running, skipping this tick");
      return;
    }

    isRunning = true;
    consola.info("[cron] Running cycle-deadline evaluation check…");
    
    try {
      await runCycleDeadlineEvaluations();
    } catch (err) {
      consola.error("[cron] Unhandled error in cycle-deadline evaluations:", err);
    } finally {
      isRunning = false;
    }
  });

  consola.info("[cron] Scheduled: cycle-deadline evaluations (every hour)");
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

  // Allow controlled parallelism across pods to improve scalability.
  const concurrency = Math.min(
    8,
    Math.max(1, Number(process.env.POD_EVAL_CONCURRENCY ?? 4)),
  );
  const limit = pLimit(concurrency);

  type Result =
    | { kind: "evaluated"; name: string }
    | { kind: "skipped"; reason: string }
    | { kind: "error"; reason: string };

  const results = await Promise.all(
    activePods.map((pod) =>
      limit(async () => {
        try {
          // Compute the deadline for the current cycle
          const deadline = cycleDueDate(
            pod.frequency,
            pod.createdAt,
            pod.currentCycle,
          );

          // Only evaluate if the deadline has passed
          if (now <= deadline) {
            return {
              kind: "skipped",
              reason: `${pod.name} — deadline not yet passed`,
            } as const;
          }

          // Skip if already evaluated after this deadline
          if (pod.lastEvaluatedAt && pod.lastEvaluatedAt > deadline) {
            return {
              kind: "skipped",
              reason: `${pod.name} — already evaluated this cycle`,
            } as const;
          }

          // Skip if queue is empty (all paid out)
          if (pod.payoutQueue.length === 0) {
            return {
              kind: "skipped",
              reason: `${pod.name} — queue empty`,
            } as const;
          }

          consola.info(
            `[cron] Evaluating pod "${pod.name}" (${pod._id}) — cycle ${pod.currentCycle} deadline passed`,
          );

          await evaluateAndReorderQueue(pod._id.toString());

          // Mark the pod as evaluated
          pod.lastEvaluatedAt = now;
          await Pod.findByIdAndUpdate(pod._id, { lastEvaluatedAt: now });

          return { kind: "evaluated", name: pod.name } as const;
        } catch (err) {
          const msg = `${pod.name}: ${(err as Error).message}`;
          consola.error(
            `[cron] Evaluation failed for pod "${pod.name}":`,
            err,
          );
          return { kind: "error", reason: msg } as const;
        }
      }),
    ),
  );

  for (const r of results) {
    if (r.kind === "evaluated") evaluated.push(r.name);
    if (r.kind === "skipped") skipped.push(r.reason);
    if (r.kind === "error") errors.push(r.reason);
  }

  consola.info(
    `[cron] Cycle-deadline evaluation complete — evaluated: ${evaluated.length}, skipped: ${skipped.length}, errors: ${errors.length}`,
  );

  return { evaluated, skipped, errors };
}
