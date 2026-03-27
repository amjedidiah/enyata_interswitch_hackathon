import { describe, it, expect, beforeAll, afterAll, beforeEach, mock } from "bun:test";
import { connectTestDB, disconnectTestDB, clearTestDB } from "./setup";
import { Types } from "mongoose";

// Mock interswitch before importing payoutService
mock.module("../services/interswitch", () => ({
  getWalletBalance: async (_walletId: string) => 20000,
  disburseFunds: async () => ({ reference: "MOCK-REF" }),
}));

// Imports after mocking
import { triggerPayout } from "../services/payoutService";
import Pod from "../models/Pod";
import User from "../models/User";
import Transaction from "../models/Transaction";

// Helper: create a minimal user with bank details
async function makeUser(name: string) {
  return User.create({
    name,
    email: `${name.toLowerCase().replaceAll(/\s+/g, "")}@test.com`,
    passwordHash: process.env.SEED_PASSWORD,
    bankAccountNumber: "0123456789",
    bankCode: "057",
  });
}

// Helper: build a 4-member pod
async function makePod(
  members: Types.ObjectId[],
  queue: Types.ObjectId[],
  overrides: Partial<{
    walletId: string;
    currentCycle: number;
    status: "active" | "completed";
  }> = {},
) {
  return Pod.create({
    name: "Test Pod",
    contributionAmount: 5000,
    frequency: "weekly",
    maxMembers: 4,
    members,
    payoutQueue: queue,
    paidOutMembers: [],
    status: "active",
    currentCycle: 1,
    contributionTotal: 0,
    createdBy: members[0],
    walletId: "WALLET-001",
    ...overrides,
  });
}

beforeAll(connectTestDB, 30_000);
afterAll(disconnectTestDB, 30_000);
beforeEach(clearTestDB, 10_000);

describe("triggerPayout", () => {
  it("advances currentCycle and removes recipient from queue when members remain", async () => {
    const [a, b, c, d] = await Promise.all([
      makeUser("Amara"),
      makeUser("Bola"),
      makeUser("Chidi"),
      makeUser("Dami"),
    ]);
    const pod = await makePod(
      [a._id, b._id, c._id, d._id],
      [a._id, b._id, c._id, d._id],
      { currentCycle: 1 },
    );

    const updated = await triggerPayout(pod._id.toString());

    expect(updated.payoutQueue).toHaveLength(3);
    expect(updated.paidOutMembers).toHaveLength(1);
    expect(updated.currentCycle).toBe(2);
    expect(updated.status).toBe("active");
  });

  it("marks pod completed without overshooting currentCycle on final payout", async () => {
    const [a, b, c, d] = await Promise.all([
      makeUser("Amara"),
      makeUser("Bola"),
      makeUser("Chidi"),
      makeUser("Dami"),
    ]);
    // Only Dami remains in queue — this is the 4th and final payout
    const pod = await makePod([a._id, b._id, c._id, d._id], [d._id], {
      currentCycle: 4,
      walletId: "WALLET-001",
    });

    const updated = await triggerPayout(pod._id.toString());

    expect(updated.payoutQueue).toHaveLength(0);
    expect(updated.paidOutMembers).toHaveLength(1);
    expect(updated.status).toBe("completed");
    // Must stay at 4, not increment to 5
    expect(updated.currentCycle).toBe(4);
  });

  it("records a disbursement transaction after payout", async () => {
    const [a, b] = await Promise.all([makeUser("Amara"), makeUser("Bola")]);
    const pod = await makePod([a._id, b._id], [a._id, b._id], {
      walletId: "WALLET-001",
    });

    await triggerPayout(pod._id.toString());

    const disbursement = await Transaction.findOne({
      pod: pod._id,
      type: "disbursement",
      status: "success",
    });
    expect(disbursement).not.toBeNull();
    expect(disbursement?.amount).toBe(10000); // 2 members × ₦5,000
  });

  it("throws when payout queue is empty", async () => {
    const a = await makeUser("Amara");
    const pod = await makePod([a._id], [], {
      walletId: "WALLET-001",
      status: "completed",
    });

    await expect(triggerPayout(pod._id.toString())).rejects.toThrow(
      "Payout queue is empty",
    );
  });

  it("throws when pod has no wallet", async () => {
    const [a, b] = await Promise.all([makeUser("Amara"), makeUser("Bola")]);
    const pod = await Pod.create({
      name: "No Wallet Pod",
      contributionAmount: 5000,
      frequency: "weekly",
      maxMembers: 2,
      members: [a._id, b._id],
      payoutQueue: [a._id, b._id],
      paidOutMembers: [],
      status: "active",
      currentCycle: 1,
      contributionTotal: 0,
      createdBy: a._id,
      // walletId intentionally omitted
    });

    await expect(triggerPayout(pod._id.toString())).rejects.toThrow(
      "no wallet",
    );
  });
});
