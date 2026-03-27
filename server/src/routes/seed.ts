import { Router, Request, Response } from "express";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import User from "../models/User";
import Pod from "../models/Pod";
import Transaction from "../models/Transaction";
import TrustScore from "../models/TrustScore";

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "password123";
const CONTRIBUTION_AMOUNT = 5000;
const MAX_MEMBERS = 4;
const CYCLE_GOAL = CONTRIBUTION_AMOUNT * MAX_MEMBERS; // ₦20,000 per payout
const router = Router();

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

function makeContribution(
  podId: Types.ObjectId,
  userId: Types.ObjectId,
  cycleNumber: number,
  daysBack: number,
  status: "success" | "failed",
) {
  return {
    pod: podId,
    user: userId,
    amount: CONTRIBUTION_AMOUNT,
    status,
    type: "contribution",
    cycleNumber,
    interswitchRef: faker.string.alphanumeric(12).toUpperCase(),
    timestamp: daysAgo(daysBack),
  };
}

function makeDisbursement(
  podId: Types.ObjectId,
  userId: Types.ObjectId,
  cycleNumber: number,
  daysBack: number,
) {
  return {
    pod: podId,
    user: userId,
    amount: CYCLE_GOAL,
    status: "success",
    type: "disbursement",
    cycleNumber,
    interswitchRef: `PAYOUT-${podId}-C${cycleNumber}`,
    timestamp: daysAgo(daysBack),
  };
}

router.post("/", async (_req: Request, res: Response): Promise<void> => {
  const secret = process.env.SEED_SECRET;
  if (!secret || _req.headers["x-seed-secret"] !== secret) {
    res.status(403).json({ error: "Invalid or missing seed secret" });
    return;
  }

  try {
    // Drop all collections
    await Promise.all([
      User.deleteMany({}),
      Pod.deleteMany({}),
      Transaction.deleteMany({}),
      TrustScore.deleteMany({}),
    ]);

    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

    // 4 users with clear trust personas for demo / AI scoring
    const SEED_USERS = [
      {
        name: "Amara Osei",
        email: "amara@demo.com",
        phone: "+2348100000001",
        passwordHash,
        bankAccountNumber: "0123456789",
        bankCode: "057",
      },
      {
        name: "Bola Adeyemi",
        email: "bola@demo.com",
        phone: "+2348100000002",
        passwordHash,
        bankAccountNumber: "9876543210",
        bankCode: "057",
      },
      {
        name: "Chidi Eze",
        email: "chidi@demo.com",
        phone: "+2348100000003",
        passwordHash,
        bankAccountNumber: "1122334455",
        bankCode: "011",
      },
      {
        name: "Dami Lawal",
        email: "dami@demo.com",
        phone: "+2348100000004",
        passwordHash,
        bankAccountNumber: "5544332211",
        bankCode: "011",
      },
    ];

    const [userA, userB, userC, userD] = await User.insertMany(SEED_USERS);

    /**
     * Lagos Gig Workers Pod — 4 members, ₦5,000/week, 4 cycles total.
     *
     * One cycle = one week. Each member contributes ₦5,000 per cycle.
     * The pot (₦20,000) is paid to one member per cycle in queue order.
     * After 4 cycles every member has received exactly one payout → pod completes.
     *
     * State: Cycle 1 & 2 complete (Amara & Bola paid out). Cycle 3 in progress.
     *
     * Personas:
     *   Amara  — perfect record: paid every cycle on time           → HIGH score
     *   Bola   — missed cycle 1 (failed charge), paid 2 & 3        → MEDIUM score
     *   Chidi  — paid cycle 1, missed cycle 2 (failed), paid 3     → MEDIUM score (next in queue)
     *   Dami   — paid cycle 1, paid cycle 2, hasn't paid cycle 3   → LOWER score (last in queue)
     */
    const pod = await Pod.create({
      name: "Lagos Gig Workers Pod",
      contributionAmount: CONTRIBUTION_AMOUNT,
      frequency: "weekly",
      maxMembers: MAX_MEMBERS,
      members: [userA._id, userB._id, userC._id, userD._id],
      payoutQueue: [userC._id, userD._id],
      paidOutMembers: [userA._id, userB._id],
      status: "active",
      currentCycle: 3,
      contributionTotal: 0,
      createdBy: userA._id,
      walletPin: 6293,
    });

    // ── Cycle 1 (3 weeks ago) ────────────────────────────────────────────────
    // Amara ✓  Bola ✗  Chidi ✓  Dami ✓  → Amara receives ₦20,000
    const cycle1 = [
      makeContribution(pod._id, userA._id, 1, 21, "success"),
      makeContribution(pod._id, userB._id, 1, 21, "failed"),   // Bola misses cycle 1
      makeContribution(pod._id, userC._id, 1, 21, "success"),
      makeContribution(pod._id, userD._id, 1, 21, "success"),
      makeDisbursement(pod._id, userA._id, 1, 20),
    ];

    // ── Cycle 2 (2 weeks ago) ────────────────────────────────────────────────
    // Amara ✓  Bola ✓  Chidi ✗  Dami ✓  → Bola receives ₦20,000
    const cycle2 = [
      makeContribution(pod._id, userA._id, 2, 14, "success"),
      makeContribution(pod._id, userB._id, 2, 14, "success"),
      makeContribution(pod._id, userC._id, 2, 14, "failed"),   // Chidi misses cycle 2
      makeContribution(pod._id, userD._id, 2, 14, "success"),
      makeDisbursement(pod._id, userB._id, 2, 13),
    ];

    // ── Cycle 3 (current, in progress) ──────────────────────────────────────
    // Amara ✓  Bola ✓  Chidi ✓  Dami — not yet paid
    // Chidi is next in payout queue. Dami is the last.
    const cycle3 = [
      makeContribution(pod._id, userA._id, 3, 5, "success"),
      makeContribution(pod._id, userB._id, 3, 5, "success"),
      makeContribution(pod._id, userC._id, 3, 5, "success"),
      // Dami has not yet contributed this cycle
    ];

    const allTransactions = [...cycle1, ...cycle2, ...cycle3];

    const successContributions = allTransactions.filter(
      (t) => t.type === "contribution" && t.status === "success",
    ).length;
    const totalContributed = successContributions * CONTRIBUTION_AMOUNT;

    await Transaction.insertMany(allTransactions);
    await Pod.findByIdAndUpdate(pod._id, {
      contributionTotal: totalContributed,
    });

    // ── Seed trust scores so the dashboard AI panel is populated immediately ─
    // These reflect each persona's payment behaviour. Judges see AI output the
    // moment they log in — no manual "Run AI Evaluation" step required.
    // Scores are intentionally realistic given the transaction history above.
    await TrustScore.insertMany([
      {
        user: userA._id,
        pod: pod._id,
        score: 92,
        reasoning: "Consistent on-time payments across all cycles with no failures — highly reliable member.",
        riskFlag: false,
        evaluatedAt: daysAgo(4),
      },
      {
        user: userB._id,
        pod: pod._id,
        score: 71,
        reasoning: "One missed payment in Cycle 1 but has been fully reliable since — moderate risk, improving trend.",
        riskFlag: false,
        evaluatedAt: daysAgo(4),
      },
      {
        user: userC._id,
        pod: pod._id,
        score: 64,
        reasoning: "Failed card charge in Cycle 2 raises concern, though Cycle 1 and 3 payments were on time.",
        riskFlag: false,
        evaluatedAt: daysAgo(4),
      },
      {
        user: userD._id,
        pod: pod._id,
        score: 43,
        reasoning: "Has not yet contributed in the current cycle despite two prior cycles — pattern of delays warrants demotion.",
        riskFlag: true,
        evaluatedAt: daysAgo(4),
      },
    ]);

    // ── Fresh pod: Amara is admin, open for others to join ──────────────────
    const freshPod = await Pod.create({
      name: "Abuja Tech Savers",
      contributionAmount: 10000,
      frequency: "monthly",
      maxMembers: 6,
      members: [userA._id],
      payoutQueue: [userA._id],
      paidOutMembers: [],
      status: "active",
      currentCycle: 1,
      contributionTotal: 0,
      createdBy: userA._id,
      walletPin: 8302,
    });

    res.json({
      message: "Database seeded successfully",
      summary: {
        users: SEED_USERS.length,
        pods: [pod.name, freshPod.name],
        transactions: allTransactions.length,
        contributionTotal: totalContributed,
        mechanics: {
          contributionAmount: `₦${CONTRIBUTION_AMOUNT.toLocaleString()}/cycle`,
          cycleGoal: `₦${CYCLE_GOAL.toLocaleString()} per payout (${MAX_MEMBERS} members * ₦${CONTRIBUTION_AMOUNT.toLocaleString()})`,
          totalCycles: MAX_MEMBERS,
          maxMemberContribution: `₦${CYCLE_GOAL.toLocaleString()} total across all cycles`,
        },
        cycles: {
          completed: 2,
          cycle1: "Amara received ₦20,000 — 3 weeks ago",
          cycle2: "Bola received ₦20,000 — 2 weeks ago",
          cycle3: "In progress — Amara ✓, Bola ✓, Chidi ✓, Dami pending",
          cycle4: "Pending — Dami in queue",
        },
        personas: {
          "amara@demo.com":
            "Perfect record — score 92, received payout in Cycle 1",
          "bola@demo.com":
            "Failed Cycle 1, reliable since — score 71, received payout in Cycle 2",
          "chidi@demo.com":
            "Failed Cycle 2, otherwise reliable — score 64, next in queue",
          "dami@demo.com":
            "Cycle 3 unpaid — score 43 (risk flag), last in queue",
        },
        credentials: `All users share password: ${SEED_PASSWORD}`,
      },
    });
  } catch (err) {
    console.error("[seed]", err);
    res.status(500).json({ error: "Seed failed", detail: String(err) });
  }
});

export default router;
