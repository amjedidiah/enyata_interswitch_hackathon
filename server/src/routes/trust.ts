import { Router, Response } from "express";
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

    // Build a synthetic cycle history from flat counts for testing.
    const cycleHistory: CycleDetail[] = [];
    let cycle = 1;
    for (let i = 0; i < Number(onTimePayments); i++)
      cycleHistory.push({ cycle: cycle++, outcome: "on_time" });
    for (let i = 0; i < Number(latePayments); i++)
      cycleHistory.push({ cycle: cycle++, outcome: "late" });
    for (let i = 0; i < Number(missedPayments); i++)
      cycleHistory.push({ cycle: cycle++, outcome: "missed" });

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
      console.error("[trust/score] AI call failed:", err);
      res
        .status(502)
        .json({ error: "AI scoring service unavailable", detail: String(err) });
    }
  },
);

export default router;
