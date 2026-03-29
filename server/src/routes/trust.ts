import { Router, Response } from "express";
import consola from "consola";
import { scoreTrust, CycleDetail } from "../services/trustAgent";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

router.post(
  "/score",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const {
      userId,
      onTimePayments,
      latePayments,
      missedPayments,
      completedPods,
      queuePosition,
      totalMembers,
    } = req.body;

    const missing = [
      "userId",
      "onTimePayments",
      "latePayments",
      "missedPayments",
      "completedPods",
    ].filter((key) => req.body[key] === undefined);

    if (missing.length > 0) {
      res
        .status(400)
        .json({ error: `Missing required fields: ${missing.join(", ")}` });
      return;
    }

    // Build a synthetic cycle history by interleaving outcomes chronologically.
    // Shuffled so the AI sees a realistic mix rather than grouped blocks
    // (e.g. all on_time first) which would bias trend detection.
    const outcomes: CycleDetail["outcome"][] = [
      ...new Array(Number(onTimePayments)).fill("on_time"),
      ...new Array(Number(latePayments)).fill("late"),
      ...new Array(Number(missedPayments)).fill("missed"),
    ];
    for (let i = outcomes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [outcomes[i], outcomes[j]] = [outcomes[j], outcomes[i]];
    }
    const cycleHistory: CycleDetail[] = outcomes.map((outcome, i) => ({
      cycle: i + 1,
      outcome,
    }));

    try {
      const result = await scoreTrust({
        userId,
        cycleHistory,
        completedPods: Number(completedPods),
        queuePosition: queuePosition === undefined ? 0 : Number(queuePosition),
        totalMembers: totalMembers === undefined ? 0 : Number(totalMembers),
      });
      res.json(result);
    } catch (err) {
      consola.error("[trust/score] AI call failed:", err);
      res
        .status(502)
        .json({ error: "AI scoring service unavailable", detail: String(err) });
    }
  },
);

export default router;
