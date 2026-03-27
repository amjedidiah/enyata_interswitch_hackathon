import { Router, Request, Response } from "express";
import { runCycleDeadlineEvaluations } from "../services/cronJobs";

const router = Router();

/**
 * POST /api/cron/run-evaluations
 * Manually trigger the cycle-deadline evaluation job.
 * Gated by the x-cron-secret header (same pattern as the seed route).
 */
router.post(
  "/run-evaluations",
  async (req: Request, res: Response): Promise<void> => {
    const secret = req.headers["x-cron-secret"];
    const secretValue = Array.isArray(secret) ? secret[0] : secret;
    if (!secretValue || secretValue !== process.env.CRON_SECRET) {
      res.status(401).json({ error: "Invalid or missing x-cron-secret" });
      return;
    }

    try {
      const result = await runCycleDeadlineEvaluations();
      res.json({
        message: "Cycle-deadline evaluations complete",
        ...result,
      });
    } catch (err) {
      console.error("[cron/run-evaluations]", err);
      res.status(500).json({ error: "Evaluation run failed" });
    }
  },
);

export default router;
