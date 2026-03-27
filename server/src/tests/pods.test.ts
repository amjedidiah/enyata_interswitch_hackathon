import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
import { connectTestDB, disconnectTestDB, clearTestDB } from "./setup";
import Pod from "../models/Pod";
import User from "../models/User";
import Transaction from "../models/Transaction";

async function makeUser(name: string) {
  return User.create({
    name,
    email: `${name.toLowerCase().replaceAll(/\s+/g, "")}@test.com`,
    passwordHash: process.env.SEED_PASSWORD,
    bankAccountNumber: "0123456789",
    bankCode: "057",
  });
}

beforeAll(connectTestDB, 30_000);
afterAll(disconnectTestDB, 30_000);
beforeEach(clearTestDB, 10_000);

// ─── Pod reset ────────────────────────────────────────────────────────────────

describe("pod reset logic", () => {
  it("restores queue to all members, clears paidOut, resets cycle and status", async () => {
    const [a, b, c] = await Promise.all([
      makeUser("Amara"),
      makeUser("Bola"),
      makeUser("Chidi"),
    ]);
    const memberIds = [a._id, b._id, c._id];

    const pod = await Pod.create({
      name: "Reset Pod",
      contributionAmount: 5000,
      frequency: "weekly",
      maxMembers: 3,
      members: memberIds,
      payoutQueue: [], // empty — all paid out
      paidOutMembers: memberIds, // all received
      status: "completed",
      currentCycle: 3,
      resetCount: 0,
      contributionTotal: 45000,
      createdBy: a._id,
    });

    // Apply the same logic as the route handler
    pod.payoutQueue = [...pod.members];
    pod.paidOutMembers = [];
    pod.currentCycle = 1;
    pod.status = "active";
    pod.resetCount += 1;
    await pod.save();

    const reloaded = await Pod.findById(pod._id);
    expect(reloaded?.status).toBe("active");
    expect(reloaded?.currentCycle).toBe(1);
    expect(reloaded?.resetCount).toBe(1);
    expect(reloaded?.paidOutMembers).toHaveLength(0);
    expect(reloaded?.payoutQueue.map(String)).toEqual(memberIds.map(String));
  });

  it("increments resetCount on each reset", async () => {
    const a = await makeUser("Amara");
    const pod = await Pod.create({
      name: "Reset Count Pod",
      contributionAmount: 5000,
      frequency: "weekly",
      maxMembers: 1,
      members: [a._id],
      payoutQueue: [],
      paidOutMembers: [a._id],
      status: "completed",
      currentCycle: 1,
      resetCount: 2,
      contributionTotal: 5000,
      createdBy: a._id,
    });

    pod.payoutQueue = [...pod.members];
    pod.paidOutMembers = [];
    pod.currentCycle = 1;
    pod.status = "active";
    pod.resetCount += 1;
    await pod.save();

    expect((await Pod.findById(pod._id))?.resetCount).toBe(3);
  });
});

// ─── Multi-cycle payment cap ──────────────────────────────────────────────────

describe("multi-cycle payment cap", () => {
  it("allows exactly remainingAllowed cycles when member has prior payments", async () => {
    const a = await makeUser("Amara");
    const pod = await Pod.create({
      name: "Cap Pod",
      contributionAmount: 5000,
      frequency: "weekly",
      maxMembers: 4,
      members: [a._id],
      payoutQueue: [a._id],
      paidOutMembers: [],
      status: "active",
      currentCycle: 1,
      contributionTotal: 0,
      createdBy: a._id,
    });

    // Amara has already paid cycles 1 and 2
    await Transaction.insertMany([
      {
        pod: pod._id,
        user: a._id,
        amount: 5000,
        status: "success",
        type: "contribution",
        cycleNumber: 1,
        interswitchRef: "REF1",
      },
      {
        pod: pod._id,
        user: a._id,
        amount: 5000,
        status: "success",
        type: "contribution",
        cycleNumber: 2,
        interswitchRef: "REF2",
      },
    ]);

    const paidCyclesCount = await Transaction.countDocuments({
      pod: pod._id,
      user: a._id,
      type: "contribution",
      status: { $in: ["success", "manual"] },
    });

    const remainingAllowed = pod.maxMembers - paidCyclesCount;

    expect(paidCyclesCount).toBe(2);
    expect(remainingAllowed).toBe(2); // can still pay cycles 3 and 4
  });

  it("remainingAllowed is 0 when all cycles are paid", async () => {
    const a = await makeUser("Amara");
    const pod = await Pod.create({
      name: "Full Pod",
      contributionAmount: 5000,
      frequency: "weekly",
      maxMembers: 2,
      members: [a._id],
      payoutQueue: [a._id],
      paidOutMembers: [],
      status: "active",
      currentCycle: 1,
      contributionTotal: 0,
      createdBy: a._id,
    });

    await Transaction.insertMany([
      {
        pod: pod._id,
        user: a._id,
        amount: 5000,
        status: "success",
        type: "contribution",
        cycleNumber: 1,
        interswitchRef: "REF1",
      },
      {
        pod: pod._id,
        user: a._id,
        amount: 5000,
        status: "success",
        type: "contribution",
        cycleNumber: 2,
        interswitchRef: "REF2",
      },
    ]);

    const paidCyclesCount = await Transaction.countDocuments({
      pod: pod._id,
      user: a._id,
      type: "contribution",
      status: { $in: ["success", "manual"] },
    });

    const remainingAllowed = pod.maxMembers - paidCyclesCount;

    expect(remainingAllowed).toBe(0);
    // Any cycles > remainingAllowed (i.e. > 0) should be rejected by the route
    expect(1 > remainingAllowed).toBe(true);
  });
});
