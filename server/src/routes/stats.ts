import { Router, Response } from "express";
import mongoose from "mongoose";
import Pod from "../models/Pod";
import Transaction from "../models/Transaction";
import TrustScore from "../models/TrustScore";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

/**
 * GET /api/stats
 * Public. Platform-wide aggregate stats for the dashboard QuickStats panel.
 */
router.get("/", async (_req, res: Response): Promise<void> => {
  try {
    const [activePods, pooledResult, totalPayouts, memberResult] =
      await Promise.all([
        Pod.countDocuments({ status: "active" }),
        Pod.aggregate([
          { $group: { _id: null, total: { $sum: "$contributionTotal" } } },
        ]),
        Transaction.countDocuments({ type: "disbursement", status: "success" }),
        Pod.aggregate([
          { $unwind: "$members" },
          { $group: { _id: "$members" } },
          { $count: "total" },
        ]),
      ]);

    res.json({
      activePods,
      totalMembers: memberResult[0]?.total ?? 0,
      totalPooled: pooledResult[0]?.total ?? 0,
      totalPayouts,
    });
  } catch (err) {
    console.error("[stats/platform]", err);
    res.status(500).json({ error: "Failed to fetch platform stats" });
  }
});

/**
 * GET /api/stats/me
 * Authenticated. Per-user stats for the dashboard User QuickStats panel.
 * Returns pod count, latest trust score, and next payout position.
 */
router.get(
  "/me",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;

    try {
    const userObjId = new mongoose.Types.ObjectId(userId);

    const [podsCount, latestScore, myPods, podTrustScores, activePods] =
      await Promise.all([
        Pod.countDocuments({ members: userId, status: "active" }),
        TrustScore.findOne({ user: userId }).sort({ evaluatedAt: -1 }).lean(),
        Pod.find(
          { payoutQueue: userId, status: "active" },
          { name: 1, payoutQueue: 1 },
        ).lean(),
        // Latest trust score per pod for this user
        TrustScore.aggregate([
          { $match: { user: userObjId } },
          { $sort: { evaluatedAt: -1 } },
          { $group: { _id: "$pod", score: { $first: "$score" } } },
          {
            $lookup: {
              from: "pods",
              localField: "_id",
              foreignField: "_id",
              as: "podInfo",
            },
          },
          { $unwind: { path: "$podInfo", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              podId: { $toString: "$_id" },
              podName: "$podInfo.name",
              score: 1,
            },
          },
        ]),
        // Active pods this user is a member of (for upcoming payments)
        Pod.find(
          { members: userId, status: "active" },
          { name: 1, contributionAmount: 1, frequency: 1 },
        ).lean(),
      ]);

    // Next payout position
    let nextPayout: {
      podId: string;
      podName: string;
      position: number;
    } | null = null;

    for (const pod of myPods) {
      const position =
        pod.payoutQueue.findIndex((id) => id.toString() === userId) + 1;
      if (position > 0 && (!nextPayout || position < nextPayout.position)) {
        nextPayout = {
          podId: pod._id.toString(),
          podName: pod.name,
          position,
        };
      }
    }

    // Trust stats across pods
    let avgTrustScore: number | null = null;
    let bestPodTrust: { podId: string; podName: string; score: number } | null =
      null;
    let worstPodTrust: {
      podId: string;
      podName: string;
      score: number;
    } | null = null;

    if (podTrustScores.length > 0) {
      const total = podTrustScores.reduce(
        (sum: number, t: { score: number }) => sum + t.score,
        0,
      );
      avgTrustScore = Math.round(total / podTrustScores.length);
      const sorted = [...podTrustScores].sort(
        (a: { score: number }, b: { score: number }) => b.score - a.score,
      );
      bestPodTrust = sorted[0];
      worstPodTrust = sorted.at(-1);
    }

    // Upcoming payments — one entry per active pod the user belongs to
    const upcomingPayments = activePods.map((p) => ({
      podId: p._id.toString(),
      podName: p.name,
      amount: p.contributionAmount,
      frequency: p.frequency,
    }));

    res.json({
      podsCount,
      trustScore: latestScore?.score ?? null,
      trustReasoning: latestScore?.reasoning ?? null,
      riskFlag: latestScore?.riskFlag ?? false,
      nextPayout,
      avgTrustScore,
      bestPodTrust,
      worstPodTrust,
      upcomingPayments,
    });
    } catch (err) {
      console.error(`[stats/me] user=${userId}`, err);
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  },
);

export default router;
