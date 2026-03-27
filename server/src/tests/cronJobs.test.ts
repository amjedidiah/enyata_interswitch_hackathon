/**
 * cronJobs tests — runCycleDeadlineEvaluations logic.
 *
 * Mocks evaluateAndReorderQueue (it calls the AI trust agent) so we can
 * test the deadline/skip logic in isolation.
 */

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
import { cycleDueDate } from "../services/queueService";

// Track calls to evaluateAndReorderQueue
const evaluateCalls: string[] = [];

mock.module("../services/queueService", () => ({
  cycleDueDate,
  evaluateAndReorderQueue: async (podId: string) => {
    evaluateCalls.push(podId);
    return { pod: {}, trustScores: [] };
  },
}));

import { runCycleDeadlineEvaluations } from "../services/cronJobs";
import Pod from "../models/Pod";
import User from "../models/User";

async function makeUser(name: string) {
  return User.create({
    name,
    email: `${name.toLowerCase()}@cron-test.com`,
    phone: "+2348100000000",
    passwordHash: "hashed",
  });
}

beforeAll(connectTestDB, 30_000);
afterAll(disconnectTestDB, 30_000);
beforeEach(async () => {
  await clearTestDB();
  evaluateCalls.length = 0;
}, 10_000);

describe("runCycleDeadlineEvaluations", () => {
  it("evaluates a pod whose deadline has passed", async () => {
    const user = await makeUser("Amara");
    // Create a daily pod created 2 days ago — cycle 1 deadline has passed
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await Pod.create({
      name: "Past Deadline Pod",
      contributionAmount: 5000,
      frequency: "daily",
      maxMembers: 4,
      members: [user._id],
      payoutQueue: [user._id],
      paidOutMembers: [],
      status: "active",
      currentCycle: 1,
      contributionTotal: 0,
      createdBy: user._id,
      walletPin: "1234",
      createdAt: twoDaysAgo,
    });

    const result = await runCycleDeadlineEvaluations();
    expect(result.evaluated).toHaveLength(1);
    expect(evaluateCalls).toHaveLength(1);
  });

  it("skips a pod whose deadline has not passed yet", async () => {
    const user = await makeUser("Bola");
    // Monthly pod created now — cycle 1 deadline is end of month
    await Pod.create({
      name: "Future Deadline Pod",
      contributionAmount: 5000,
      frequency: "monthly",
      maxMembers: 4,
      members: [user._id],
      payoutQueue: [user._id],
      paidOutMembers: [],
      status: "active",
      currentCycle: 1,
      contributionTotal: 0,
      createdBy: user._id,
      walletPin: "1234",
    });

    const result = await runCycleDeadlineEvaluations();
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]).toContain("deadline not yet passed");
    expect(evaluateCalls).toHaveLength(0);
  });

  it("skips a pod already evaluated after the deadline", async () => {
    const user = await makeUser("Chidi");
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await Pod.create({
      name: "Already Evaluated Pod",
      contributionAmount: 5000,
      frequency: "daily",
      maxMembers: 4,
      members: [user._id],
      payoutQueue: [user._id],
      paidOutMembers: [],
      status: "active",
      currentCycle: 1,
      contributionTotal: 0,
      createdBy: user._id,
      walletPin: "1234",
      createdAt: twoDaysAgo,
      lastEvaluatedAt: new Date(), // evaluated recently
    });

    const result = await runCycleDeadlineEvaluations();
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]).toContain("already evaluated");
    expect(evaluateCalls).toHaveLength(0);
  });

  it("skips a pod with an empty queue", async () => {
    const user = await makeUser("Dami");
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await Pod.create({
      name: "Empty Queue Pod",
      contributionAmount: 5000,
      frequency: "daily",
      maxMembers: 4,
      members: [user._id],
      payoutQueue: [],
      paidOutMembers: [user._id],
      status: "active",
      currentCycle: 1,
      contributionTotal: 0,
      createdBy: user._id,
      walletPin: "1234",
      createdAt: twoDaysAgo,
    });

    const result = await runCycleDeadlineEvaluations();
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]).toContain("queue empty");
    expect(evaluateCalls).toHaveLength(0);
  });

  it("skips completed pods (only finds active ones)", async () => {
    const user = await makeUser("Eze");
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await Pod.create({
      name: "Completed Pod",
      contributionAmount: 5000,
      frequency: "daily",
      maxMembers: 2,
      members: [user._id],
      payoutQueue: [],
      paidOutMembers: [user._id],
      status: "completed",
      currentCycle: 2,
      contributionTotal: 0,
      createdBy: user._id,
      walletPin: "1234",
      createdAt: twoDaysAgo,
    });

    const result = await runCycleDeadlineEvaluations();
    // Completed pods are not returned by find({ status: "active" })
    expect(result.evaluated).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });
});
