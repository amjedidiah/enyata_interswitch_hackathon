import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  mock,
} from "bun:test";
import { connectTestDB, disconnectTestDB, clearTestDB } from "./setup";
import { Types } from "mongoose";

// Mock wallet credit — we don't want real Interswitch calls
mock.module("../services/wallet", () => ({
  creditWallet: async () => "MOCK-REF",
}));

import { recordContribution } from "../services/contributionService";
import Pod from "../models/Pod";
import User from "../models/User";
import Transaction from "../models/Transaction";

async function makeUser(name: string) {
  let userCounter = 0;
  const suffix = String(userCounter++).padStart(4, "0");

  return User.create({
    name,
    email: `${name.toLowerCase().replaceAll(/\s+/g, "")}@test.com`,
    phone: `+23481000${suffix}`,
    passwordHash: "hashed",
    bankAccountNumber: "0123456789",
    bankCode: "057",
  });
}

async function makePod(
  creatorId: Types.ObjectId,
  memberIds: Types.ObjectId[] = [],
) {
  return Pod.create({
    name: "Contribution Pod",
    contributionAmount: 5000,
    frequency: "weekly",
    maxMembers: 4,
    members: [creatorId, ...memberIds],
    payoutQueue: [creatorId, ...memberIds],
    paidOutMembers: [],
    status: "active",
    currentCycle: 1,
    contributionTotal: 0,
    createdBy: creatorId,
    walletPin: "1234",
  });
}

beforeAll(connectTestDB, 30_000);
afterAll(disconnectTestDB, 30_000);
beforeEach(clearTestDB, 10_000);

describe("recordContribution", () => {
  it("records a single contribution for the current cycle", async () => {
    const user = await makeUser("Amara");
    const pod = await makePod(user._id);

    const result = await recordContribution({
      podId: pod._id.toString(),
      userId: user._id.toString(),
      cycles: 1,
      currentCycle: 1,
      maxMembers: 4,
      contributionAmount: 5000,
    });

    expect(result.cycles).toBe(1);
    expect(result.totalAmount).toBe(5000);
    expect(result.cycleNumbers).toEqual([1]);

    const tx = await Transaction.findOne({ pod: pod._id, user: user._id });
    expect(tx?.status).toBe("success");
    expect(tx?.cycleNumber).toBe(1);
  });

  it("records multiple pre-pay cycles", async () => {
    const user = await makeUser("Bola");
    const pod = await makePod(user._id);

    const result = await recordContribution({
      podId: pod._id.toString(),
      userId: user._id.toString(),
      cycles: 3,
      currentCycle: 1,
      maxMembers: 4,
      contributionAmount: 5000,
    });

    // maxContributions = maxMembers - 1 = 3
    expect(result.cycles).toBe(3);
    expect(result.totalAmount).toBe(15000);
    expect(result.cycleNumbers).toEqual([1, 2, 3]);
  });

  it("skips already-paid cycles during assignment", async () => {
    const user = await makeUser("Chidi");
    const pod = await makePod(user._id);

    // Pre-seed cycle 1 as paid
    await Transaction.create({
      pod: pod._id,
      user: user._id,
      amount: 5000,
      status: "success",
      type: "contribution",
      cycleNumber: 1,
    });

    // Request 2 cycles starting from cycle 1 — should skip cycle 1 (paid)
    // and assign cycles 2 and 3 instead
    const result = await recordContribution({
      podId: pod._id.toString(),
      userId: user._id.toString(),
      cycles: 2,
      currentCycle: 1,
      maxMembers: 4,
      contributionAmount: 5000,
    });

    // Should skip cycle 1 and assign cycles 2 and 3
    expect(result.cycleNumbers).toEqual([2, 3]);
    expect(result.cycles).toBe(2);
  });

  it("throws when contribution cap is reached", async () => {
    const user = await makeUser("Dami");
    const pod = await makePod(user._id);

    // Fill all 3 allowed cycles (maxMembers - 1 = 3)
    await Transaction.insertMany([
      {
        pod: pod._id,
        user: user._id,
        amount: 5000,
        status: "success",
        type: "contribution",
        cycleNumber: 1,
      },
      {
        pod: pod._id,
        user: user._id,
        amount: 5000,
        status: "success",
        type: "contribution",
        cycleNumber: 2,
      },
      {
        pod: pod._id,
        user: user._id,
        amount: 5000,
        status: "success",
        type: "contribution",
        cycleNumber: 3,
      },
    ]);

    await expect(
      recordContribution({
        podId: pod._id.toString(),
        userId: user._id.toString(),
        cycles: 1,
        currentCycle: 4,
        maxMembers: 4,
        contributionAmount: 5000,
      }),
    ).rejects.toThrow("already contributed for all your cycles");
  });

  it("throws when requesting more cycles than remaining", async () => {
    const user = await makeUser("Eze");
    const pod = await makePod(user._id);

    // Pay 2 out of 3 allowed
    await Transaction.insertMany([
      {
        pod: pod._id,
        user: user._id,
        amount: 5000,
        status: "success",
        type: "contribution",
        cycleNumber: 1,
      },
      {
        pod: pod._id,
        user: user._id,
        amount: 5000,
        status: "success",
        type: "contribution",
        cycleNumber: 2,
      },
    ]);

    await expect(
      recordContribution({
        podId: pod._id.toString(),
        userId: user._id.toString(),
        cycles: 2,
        currentCycle: 3,
        maxMembers: 4,
        contributionAmount: 5000,
      }),
    ).rejects.toThrow("only pay 1 more cycle(s)");
  });

  it("throws duplicate guard for single-cycle re-payment", async () => {
    const user = await makeUser("Femi");
    const pod = await makePod(user._id);

    await Transaction.create({
      pod: pod._id,
      user: user._id,
      amount: 5000,
      status: "success",
      type: "contribution",
      cycleNumber: 1,
    });

    await expect(
      recordContribution({
        podId: pod._id.toString(),
        userId: user._id.toString(),
        cycles: 1,
        currentCycle: 1,
        maxMembers: 4,
        contributionAmount: 5000,
      }),
    ).rejects.toThrow("already contributed for cycle 1");
  });

  it("ignores failed transactions when counting paid cycles", async () => {
    const user = await makeUser("Grace");
    const pod = await makePod(user._id);

    // A failed transaction should not count toward the cap
    await Transaction.create({
      pod: pod._id,
      user: user._id,
      amount: 5000,
      status: "failed",
      type: "contribution",
      cycleNumber: 1,
    });

    const result = await recordContribution({
      podId: pod._id.toString(),
      userId: user._id.toString(),
      cycles: 1,
      currentCycle: 1,
      maxMembers: 4,
      contributionAmount: 5000,
    });

    expect(result.cycles).toBe(1);
    expect(result.cycleNumbers).toEqual([1]);
  });
});
