import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import Pod from "../models/Pod";
import User from "../models/User";
import Transaction from "../models/Transaction";
import TrustScore from "../models/TrustScore";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createWallet, getWalletBalance } from "../services/interswitch";
import { triggerPayout } from "../services/payoutService";
import { evaluateAndReorderQueue } from "../services/queueService";

const router = Router();

// GET /api/pods — public pod discovery, or ?member=true for authenticated member's pods
router.get("/", async (req: Request, res: Response): Promise<void> => {
  if (req.query.member === "true") {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    if (!token) {
      res
        .status(401)
        .json({ error: "Authentication required for member filter" });
      return;
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
      };
      const pods = await Pod.find({ members: payload.id }).lean();
      res.json(pods);
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
    }
    return;
  }
  try {
    const pods = await Pod.find({ status: "active" }).lean();
    res.json(pods);
  } catch (err) {
    console.error("[pods/list]", err);
    res.status(500).json({ error: "Failed to fetch pods" });
  }
});

// GET /api/pods/:id — public (pod detail)
router.get("/:id", async (req, res: Response): Promise<void> => {
  try {
    const pod = await Pod.findById(req.params.id)
      .populate("members", "name email")
      .populate("payoutQueue", "name email")
      .populate("paidOutMembers", "name email")
      .lean();

    if (!pod) {
      res.status(404).json({ error: "Pod not found" });
      return;
    }

    // Compute current cycle contributions: sum of successful contributions
    // since the most recent disbursement (or from the beginning if none).
    const lastPayout = await Transaction.findOne({
      pod: pod._id,
      type: "disbursement",
      status: "success",
    })
      .sort({ timestamp: -1 })
      .lean();

    const cycleStartDate = lastPayout?.timestamp ?? new Date(0);

    const cycleAgg = await Transaction.aggregate([
      {
        $match: {
          pod: pod._id,
          type: "contribution",
          status: { $in: ["success", "manual"] },
          timestamp: { $gt: cycleStartDate },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const currentCycleTotal: number = cycleAgg[0]?.total ?? 0;

    res.json({ ...pod, currentCycleTotal });
  } catch (err) {
    console.error(`[pods/get] id=${req.params.id}`, err);
    res.status(500).json({ error: "Failed to fetch pod" });
  }
});

/**
 * GET /api/pods/:id/wallet-balance
 * Any pod member. Returns the live Interswitch wallet balance as the primary
 * balance, with the DB contribution ledger alongside for verification.
 */
router.get(
  "/:id/wallet-balance",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const pod = await Pod.findById(req.params.id);
      if (!pod) {
        res.status(404).json({ error: "Pod not found" });
        return;
      }

      const isMember = pod.members.some((m) => m.toString() === req.user!.id);
      if (!isMember) {
        res.status(403).json({ error: "Pod members only" });
        return;
      }

      if (!pod.walletId) {
        res.json({ balance: null, walletId: null, virtualAccount: null });
        return;
      }

      // Interswitch balance is the primary (real fund balance).
      // DB ledger (contributionTotal) is shown alongside for verification.
      let balance: number;
      try {
        balance = await getWalletBalance(pod.walletId);
      } catch (err) {
        console.warn(`[pods/wallet-balance] Interswitch fetch failed, falling back to ledger`, err);
        balance = pod.contributionTotal;
      }

      res.json({
        balance,
        ledgerBalance: pod.contributionTotal,
        walletId: pod.walletId,
        virtualAccount: pod.virtualAccount ?? null,
      });
    } catch (err) {
      console.error(`[pods/wallet-balance] id=${req.params.id}`, err);
      res.status(500).json({ error: "Failed to fetch wallet balance" });
    }
  },
);

/**
 * GET /api/pods/:id/my-contributions
 * Any pod member. Returns the authenticated user's transaction history for this pod,
 * sorted newest-first.
 */
router.get(
  "/:id/my-contributions",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const pod = await Pod.findById(req.params.id);
      if (!pod) {
        res.status(404).json({ error: "Pod not found" });
        return;
      }

      const isMember = pod.members.some((m) => m.toString() === req.user!.id);
      if (!isMember) {
        res.status(403).json({ error: "Pod members only" });
        return;
      }

      const contributions = await Transaction.find({
        pod: pod._id,
        user: req.user!.id,
      })
        .sort({ timestamp: -1 })
        .lean();

      res.json(contributions);
    } catch (err) {
      console.error(`[pods/my-contributions] id=${req.params.id}`, err);
      res.status(500).json({ error: "Failed to fetch contributions" });
    }
  },
);

/**
 * GET /api/pods/:id/activity
 * Authenticated members only. Returns a merged, chronological feed of
 * contribution, disbursement, and AI trust evaluation events for the pod.
 * Member financial behaviour is not public data.
 */
router.get(
  "/:id/activity",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const pod = await Pod.findById(req.params.id);
      if (!pod) {
        res.status(404).json({ error: "Pod not found" });
        return;
      }
      const isMember = pod.members.some((m) => m.toString() === req.user!.id);
      if (!isMember) {
        res.status(403).json({ error: "Pod members only" });
        return;
      }

      const fmt = (n: number) =>
        new Intl.NumberFormat("en-NG", {
          style: "currency",
          currency: "NGN",
        }).format(n);

      const [transactions, trustScores] = await Promise.all([
        Transaction.find({ pod: req.params.id })
          .populate<{ user: { name: string } }>("user", "name")
          .sort({ timestamp: -1 })
          .lean(),
        TrustScore.find({ pod: req.params.id })
          .populate<{ user: { name: string } }>("user", "name")
          .sort({ evaluatedAt: -1 })
          .lean(),
      ]);

      const txEvents = transactions.map((tx) => {
        const name = (tx.user as { name: string })?.name ?? "Unknown";
        const amount = fmt(tx.amount);
        const forCycle =
          tx.cycleNumber == null ? "" : ` for Cycle ${tx.cycleNumber}`;
        let text: string;
        if (tx.type === "disbursement") {
          const cycleText =
            tx.cycleNumber == null ? "" : ` (Cycle ${tx.cycleNumber})`;
          text = `${name} received a payout of ${amount}${cycleText}`;
        } else if (tx.status === "success" || tx.status === "manual") {
          text = `${name} contributed ${amount}${forCycle}`;
        } else if (tx.status === "failed") {
          text = `${name}'s payment of ${amount}${forCycle} failed`;
        } else {
          text = `${name}'s payment of ${amount}${forCycle} is pending`;
        }
        return {
          id: tx._id.toString(),
          type: tx.type,
          status: tx.status,
          text,
          timestamp: tx.timestamp.toISOString(),
        };
      });

      const trustEvents = trustScores.map((ts) => {
        const name = (ts.user as { name: string })?.name ?? "Unknown";
        const text = ts.riskFlag
          ? `${name} moved to end of queue by AI Trust Agent — ${ts.reasoning}`
          : `${name}'s trust score updated to ${ts.score} — ${ts.reasoning}`;
        return {
          id: ts._id.toString(),
          type: "trust_evaluation",
          status: ts.riskFlag ? "flagged" : "ok",
          text,
          timestamp: ts.evaluatedAt.toISOString(),
        };
      });

      const events = [...txEvents, ...trustEvents].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      res.json(events);
    } catch (err) {
      console.error(`[pods/activity] id=${req.params.id}`, err);
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  },
);

/**
 * GET /api/pods/:id/payout-history
 * Public. Returns all completed disbursements for the pod in chronological order,
 * with cycle number derived from position. Used by PayoutCycles UI component.
 */
router.get(
  "/:id/payout-history",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const pod = await Pod.findById(req.params.id).lean();
      if (!pod) {
        res.status(404).json({ error: "Pod not found" });
        return;
      }

      const disbursements = await Transaction.find({
        pod: req.params.id,
        type: "disbursement",
        status: "success",
      })
        .populate<{ user: { _id: string; name: string } }>("user", "name")
        .sort({ timestamp: 1 })
        .lean();

      const history = disbursements.map((tx, i) => ({
        cycle: i + 1,
        recipientId: (tx.user as { _id: string; name: string })?._id ?? null,
        recipientName:
          (tx.user as { _id: string; name: string })?.name ?? "Unknown",
        amount: tx.amount,
        timestamp: tx.timestamp.toISOString(),
      }));

      res.json(history);
    } catch (err) {
      console.error(`[pods/payout-history] id=${req.params.id}`, err);
      res.status(500).json({ error: "Failed to fetch payout history" });
    }
  },
);

/**
 * GET /api/pods/:id/trust-scores
 * Authenticated members only. Returns the latest trust score per pod member keyed by userId.
 * Used by the payout queue UI to display AI reasoning inline.
 */
router.get(
  "/:id/trust-scores",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const pod = await Pod.findById(req.params.id);
      if (!pod) {
        res.status(404).json({ error: "Pod not found" });
        return;
      }
      const isMember = pod.members.some((m) => m.toString() === req.user!.id);
      if (!isMember) {
        res.status(403).json({ error: "Pod members only" });
        return;
      }

      const scores = await TrustScore.find({ pod: req.params.id })
        .sort({ evaluatedAt: -1 })
        .lean();

      // Keep only the most recent score per user
      const latest: Record<string, (typeof scores)[0]> = {};
      for (const s of scores) {
        const uid = s.user.toString();
        if (!latest[uid]) latest[uid] = s;
      }

      res.json(latest);
    } catch (err) {
      console.error(`[pods/trust-scores] id=${req.params.id}`, err);
      res.status(500).json({ error: "Failed to fetch trust scores" });
    }
  },
);

/**
 * POST /api/pods
 * Authenticated user creates a new pod.
 * Attempts to provision an Interswitch wallet immediately.
 * If wallet creation fails (e.g. sandbox limits), the pod is still created
 * with walletId=null and can be retried later.
 */
router.post(
  "/",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { name, contributionAmount, frequency, maxMembers, walletPin } =
      req.body;

    if (
      !name ||
      !contributionAmount ||
      !frequency ||
      !maxMembers ||
      !walletPin
    ) {
      res.status(400).json({
        error:
          "name, contributionAmount, frequency, maxMembers, and walletPin are required",
      });
      return;
    }

    if (!["daily", "weekly", "monthly"].includes(frequency)) {
      res
        .status(400)
        .json({ error: "frequency must be daily, weekly, or monthly" });
      return;
    }

    if (!/^\d{4}$/.test(walletPin)) {
      res.status(400).json({ error: "walletPin must be a 4-digit number" });
      return;
    }

    try {
      // Creator is pre-added to members and payoutQueue so they have full
      // member + admin access immediately, without needing to pay first.
      const pod = await Pod.create({
        name,
        contributionAmount,
        frequency,
        maxMembers,
        members: [req.user!.id],
        payoutQueue: [req.user!.id],
        createdBy: req.user!.id,
        walletPin,
      });

      // Attempt to provision a Merchant Wallet (QTB) for the pod.
      // Non-fatal — pod is usable even if this fails in sandbox.
      try {
        const creator = await User.findById(req.user!.id).select(
          "name email phone",
        );
        if (!creator?.phone)
          throw new Error("Creator has no phone number on file");

        const { walletId, virtualAccount } = await createWallet({
          podName: name,
          creatorPhone: creator.phone,
          creatorFirstName: creator.name.split(" ")[0],
          creatorEmail: creator.email,
          pin: walletPin,
        });
        pod.walletId = walletId;
        if (virtualAccount) pod.virtualAccount = virtualAccount;
        await pod.save();
        console.info(
          `[pods] Merchant wallet created for pod ${pod.id}: ${walletId}`,
        );
      } catch (err) {
        console.warn(
          `[pods] Wallet creation failed for pod ${pod.id} — continuing without wallet:`,
          (err as Error).message,
        );
      }

      res.status(201).json(pod);
    } catch (err) {
      console.error("[pods/create]", err);
      res.status(500).json({ error: "Failed to create pod" });
    }
  },
);

/**
 * POST /api/pods/:id/provision-wallet
 * Retries wallet creation for pods where it failed on initial creation.
 * Admin only. Accepts an optional `walletPin` in the request body — required
 * only for legacy pods that were created before the PIN was mandatory.
 */
router.post(
  "/:id/provision-wallet",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const pod = await Pod.findById(req.params.id);
      if (!pod) {
        res.status(404).json({ error: "Pod not found" });
        return;
      }

      if (pod.createdBy.toString() !== req.user!.id) {
        res
          .status(403)
          .json({ error: "Only the pod admin can provision the wallet" });
        return;
      }

      if (pod.walletId) {
        res.status(400).json({
          error: "Pod already has a wallet",
          walletId: pod.walletId,
        });
        return;
      }

      const creator = await User.findById(pod.createdBy).select(
        "name email phone",
      );
      if (!creator?.phone) {
        res
          .status(400)
          .json({ error: "Pod creator has no phone number on file" });
        return;
      }

      const { walletId, virtualAccount } = await createWallet({
        podName: pod.name,
        creatorPhone: creator.phone,
        creatorFirstName: creator.name.split(" ")[0],
        creatorEmail: creator.email,
        pin: pod.walletPin,
      });

      pod.walletId = walletId;
      if (virtualAccount) pod.virtualAccount = virtualAccount;
      await pod.save();

      res.json({ message: "Wallet provisioned", walletId, virtualAccount });
    } catch (err) {
      console.error(`[pods/provision-wallet] id=${req.params.id}`, err);
      res.status(500).json({ error: "Failed to provision wallet" });
    }
  },
);

/**
 * POST /api/pods/:id/evaluate
 * Pod admin triggers the AI Trust Agent to score all members and reorder the
 * payout queue. Returns the updated pod and the full trust score results so
 * the frontend can animate the reorder and surface AI reasoning inline.
 */
router.post(
  "/:id/evaluate",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const pod = await Pod.findById(req.params.id);
      if (!pod) {
        res.status(404).json({ error: "Pod not found" });
        return;
      }

      if (pod.createdBy.toString() !== req.user!.id) {
        res
          .status(403)
          .json({ error: "Only the pod admin can run AI evaluation" });
        return;
      }

      // Rate-limit: enforce a 60-second cooldown between evaluations to protect
      // the DeepSeek API quota and prevent accidental double-runs.
      const COOLDOWN_SECS = 60;
      const recent = await TrustScore.findOne({ pod: req.params.id })
        .sort({ evaluatedAt: -1 })
        .lean();
      if (recent) {
        const elapsed = Math.floor(
          (Date.now() - new Date(recent.evaluatedAt).getTime()) / 1000,
        );
        if (elapsed < COOLDOWN_SECS) {
          const retryAfter = COOLDOWN_SECS - elapsed;
          res.status(429).json({
            error: `AI evaluation was run recently — please wait ${retryAfter} more second${retryAfter === 1 ? "" : "s"}.`,
            retryAfter,
          });
          return;
        }
      }

      const podId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const result = await evaluateAndReorderQueue(podId);
      res.json(result);
    } catch (err) {
      console.error(`[pods/evaluate] id=${req.params.id}`, err);
      res.status(500).json({ error: "AI evaluation failed" });
    }
  },
);

/**
 * POST /api/pods/:id/payout
 * Pod admin manually triggers a payout to the next recipient in the queue.
 * Used by judges during demo to see a live disbursement.
 */
router.post(
  "/:id/payout",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const pod = await Pod.findById(req.params.id);
      if (!pod) {
        res.status(404).json({ error: "Pod not found" });
        return;
      }

      if (pod.createdBy.toString() !== req.user!.id) {
        res
          .status(403)
          .json({ error: "Only the pod admin can trigger payouts" });
        return;
      }

      const updatedPod = await triggerPayout(String(req.params.id));
      res.json({ message: "Payout triggered successfully", pod: updatedPod });
    } catch (err: unknown) {
      // VersionError means a concurrent payout already modified the pod —
      // safe to reject the duplicate rather than proceeding.
      if (err instanceof Error && err.name === "VersionError") {
        console.warn(
          `[POST /api/pods/${req.params.id}/payout] Concurrent payout blocked (VersionError)`,
        );
        res.status(409).json({
          error: "Payout already in progress — please refresh and try again",
        });
        return;
      }
      // Business-logic failures (no wallet, empty queue, insufficient balance)
      // should surface as 400, not 500.
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }
  },
);

/**
 * POST /api/pods/:id/reset
 * Pod admin resets a completed pod for a new rotation round.
 * Clears paidOutMembers, restores payoutQueue to the original member order,
 * resets currentCycle to 1, and sets status back to "active".
 * Increments resetCount to track how many rounds this pod has run.
 */
router.post(
  "/:id/reset",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const pod = await Pod.findById(req.params.id);
      if (!pod) {
        res.status(404).json({ error: "Pod not found" });
        return;
      }

      if (pod.createdBy.toString() !== req.user!.id) {
        res
          .status(403)
          .json({ error: "Only the pod admin can reset this pod" });
        return;
      }

      if (pod.status !== "completed") {
        res.status(400).json({ error: "Only completed pods can be reset" });
        return;
      }

      // Restore all members to the payout queue in their original member order
      pod.payoutQueue = [...pod.members];
      pod.paidOutMembers = [];
      pod.currentCycle = 1;
      pod.status = "active";
      pod.resetCount += 1;

      await pod.save();

      res.json({
        message: "Pod reset successfully — new rotation started",
        pod,
      });
    } catch (err) {
      console.error(`[pods/reset] id=${req.params.id}`, err);
      res.status(500).json({ error: "Failed to reset pod" });
    }
  },
);

/**
 * GET /api/pods/:id/contribution-matrix
 * Pod admin only. Returns a member × cycle payment status matrix so the
 * admin (and judges) can see at a glance who paid, missed, or is pending
 * for every cycle. This is the dataset that drives AI trust scoring.
 */
router.get(
  "/:id/contribution-matrix",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const pod = await Pod.findById(req.params.id)
        .populate<{
          members: { _id: unknown; name: string }[];
        }>("members", "name")
        .lean();
      if (!pod) {
        res.status(404).json({ error: "Pod not found" });
        return;
      }

      if (pod.createdBy.toString() !== req.user!.id) {
        res
          .status(403)
          .json({
            error: "Only the pod admin can view the contribution matrix",
          });
        return;
      }

      const transactions = await Transaction.find({
        pod: pod._id,
        type: "contribution",
      }).lean();

      // Build a lookup keyed by `userId:cycleNumber` → best status
      // (success/manual beats failed beats pending)
      const STATUS_RANK: Record<string, number> = {
        success: 4,
        manual: 4,
        failed: 3,
        pending: 2,
      };
      const lookup: Record<string, string> = {};
      for (const tx of transactions) {
        if (tx.cycleNumber == null) continue;
        const key = `${tx.user.toString()}:${tx.cycleNumber}`;
        const incoming = STATUS_RANK[tx.status] ?? 1;
        const existing = STATUS_RANK[lookup[key]] ?? 0;
        if (incoming > existing) lookup[key] = tx.status;
      }

      const totalCycles = pod.maxMembers;
      const members = pod.members.map((m) => {
        const userId = (m._id as { toString(): string }).toString();
        const cycles = Array.from({ length: totalCycles }, (_, i) => {
          const cycle = i + 1;
          const raw = lookup[`${userId}:${cycle}`];
          let status: "success" | "failed" | "pending" | "upcoming";
          if (raw === "success" || raw === "manual") {
            status = "success";
          } else if (raw === "failed") {
            status = "failed";
          } else if (raw === "pending") {
            status = "pending";
          } else {
            status = "upcoming";
          }
          return { cycle, status };
        });
        return { userId, name: m.name, cycles };
      });

      res.json({ totalCycles, currentCycle: pod.currentCycle, members });
    } catch (err) {
      console.error(`[pods/contribution-matrix] id=${req.params.id}`, err);
      res.status(500).json({ error: "Failed to fetch contribution matrix" });
    }
  },
);

export default router;
