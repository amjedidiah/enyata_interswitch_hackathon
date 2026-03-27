import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import Pod from "../models/Pod";
import Transaction from "../models/Transaction";
import { creditWallet } from "../services/wallet";
import { recordContribution } from "../services/contributionService";

const router = Router();

/**
 * POST /api/payments/join
 * Authenticated user joins a pod and optionally pre-pays contribution cycles.
 * Admits the member immediately, then delegates contribution recording to the
 * shared contributionService.
 *
 * Body:
 *   podId   — required
 *   cycles  — optional (default 1). Number of consecutive cycles to pre-pay.
 */
router.post(
  "/join",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { podId, cycles: rawCycles } = req.body;
    const cycles = typeof rawCycles === "number" ? rawCycles : 1;

    if (!podId) {
      res.status(400).json({ error: "podId is required" });
      return;
    }

    if (!Number.isInteger(cycles) || cycles < 1) {
      res.status(400).json({ error: "cycles must be a positive integer" });
      return;
    }

    try {
      const pod = await Pod.findById(podId);
      if (!pod) {
        res.status(404).json({ error: "Pod not found" });
        return;
      }

      if (pod.status === "completed") {
        res
          .status(400)
          .json({ error: "This pod has completed all its cycles" });
        return;
      }

      const userId = req.user!.id;
      const alreadyMember = pod.members.some(
        (m) => m.toString() === userId,
      );

      if (!alreadyMember && pod.members.length >= pod.maxMembers) {
        res.status(400).json({ error: "Pod is full" });
        return;
      }

      // Admit member to pod (no-op if already a member)
      await Pod.findByIdAndUpdate(podId, {
        $addToSet: { members: userId, payoutQueue: userId },
      });

      // Record contribution(s) using the shared helper
      const result = await recordContribution({
        podId,
        userId,
        cycles,
        currentCycle: pod.currentCycle,
        maxMembers: pod.maxMembers,
        contributionAmount: pod.contributionAmount,
      });

      console.info(
        `[payments/join] user=${userId} pod=${podId} cycles=${result.cycles} total=₦${result.totalAmount}`,
      );

      res.status(201).json({
        message: "Successfully joined pod and recorded contribution",
        cycles: result.cycles,
        totalAmount: result.totalAmount,
      });
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode) {
        res.status(statusCode).json({ error: (err as Error).message });
        return;
      }
      console.error("[payments/join]", err);
      res.status(500).json({ error: "Failed to join pod" });
    }
  },
);

/**
 * POST /api/payments/contribute
 * Existing pod member self-serves a contribution for the current cycle
 * (or pre-pays future cycles). Delegates to the shared contributionService.
 *
 * Body:
 *   podId   — required
 *   cycles  — optional (default 1)
 */
router.post(
  "/contribute",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { podId, cycles: rawCycles } = req.body;
    const cycles = typeof rawCycles === "number" ? rawCycles : 1;

    if (!podId) {
      res.status(400).json({ error: "podId is required" });
      return;
    }

    if (!Number.isInteger(cycles) || cycles < 1) {
      res.status(400).json({ error: "cycles must be a positive integer" });
      return;
    }

    try {
      const pod = await Pod.findById(podId);
      if (!pod) {
        res.status(404).json({ error: "Pod not found" });
        return;
      }

      const userId = req.user!.id;
      const isMember = pod.members.some((m) => m.toString() === userId);
      if (!isMember) {
        res.status(403).json({ error: "You are not a member of this pod" });
        return;
      }

      if (pod.status === "completed") {
        res
          .status(400)
          .json({ error: "This pod has completed all its cycles" });
        return;
      }

      const result = await recordContribution({
        podId,
        userId,
        cycles,
        currentCycle: pod.currentCycle,
        maxMembers: pod.maxMembers,
        contributionAmount: pod.contributionAmount,
      });

      console.info(
        `[payments/contribute] user=${userId} pod=${podId} cycles=${result.cycles} total=₦${result.totalAmount}`,
      );

      res.status(201).json({
        message: "Contribution recorded",
        cycles: result.cycles,
        totalAmount: result.totalAmount,
        cycleNumbers: result.cycleNumbers,
      });
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode) {
        res.status(statusCode).json({ error: (err as Error).message });
        return;
      }
      console.error("[payments/contribute]", err);
      res.status(500).json({ error: "Failed to record contribution" });
    }
  },
);

/**
 * POST /api/payments/manual
 * Pod admin records a cash or bank-transfer contribution for a member.
 */
router.post(
  "/manual",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { podId, userId, cycleNumber } = req.body;

    if (!podId || !userId) {
      res.status(400).json({ error: "podId and userId are required" });
      return;
    }

    try {
      const pod = await Pod.findById(podId);
      if (!pod) {
        res.status(404).json({ error: "Pod not found" });
        return;
      }

      if (pod.createdBy.toString() !== req.user!.id) {
        res
          .status(403)
          .json({ error: "Only the pod admin can record manual payments" });
        return;
      }

      const isMember = pod.members.some((m) => m.toString() === userId);
      if (!isMember) {
        res.status(400).json({ error: "User is not a member of this pod" });
        return;
      }

      const targetCycle =
        typeof cycleNumber === "number" ? cycleNumber : pod.currentCycle;

      // Duplicate guard
      const existing = await Transaction.findOne({
        pod: podId,
        user: userId,
        cycleNumber: targetCycle,
        status: { $in: ["success", "manual"] },
      });
      if (existing) {
        res.status(409).json({
          error: `Cycle ${targetCycle} has already been paid for this member`,
        });
        return;
      }

      const amount = pod.contributionAmount;

      const transaction = await Transaction.create({
        pod: podId,
        user: userId,
        amount,
        status: "manual",
        type: "contribution",
        cycleNumber: targetCycle,
      });

      await creditWallet(podId, amount);

      console.info(
        `[payments/manual] admin=${req.user!.id} user=${userId} pod=${podId} cycle=${targetCycle} amount=₦${amount}`,
      );

      res.status(201).json({
        message: "Manual payment recorded",
        transaction,
      });
    } catch (err) {
      console.error("[payments/manual]", err);
      res.status(500).json({ error: "Failed to record manual payment" });
    }
  },
);

export default router;
