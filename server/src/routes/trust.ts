import { Router, Response } from "express";
import { scoreTrust } from "../services/trustAgent";
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
      failedCardCharges,
      queuePosition,
      totalMembers,
    } = req.body;

    const missing = [
      "userId",
      "onTimePayments",
      "latePayments",
      "missedPayments",
      "completedPods",
      "failedCardCharges",
    ].filter((key) => req.body[key] === undefined);

    if (missing.length > 0) {
      res
        .status(400)
        .json({ error: `Missing required fields: ${missing.join(", ")}` });
      return;
    }

    try {
      const result = await scoreTrust({
        userId,
        onTimePayments: Number(onTimePayments),
        latePayments: Number(latePayments),
        missedPayments: Number(missedPayments),
        completedPods: Number(completedPods),
        failedCardCharges: Number(failedCardCharges),
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
