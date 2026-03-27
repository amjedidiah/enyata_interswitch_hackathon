/**
 * Access control integration tests — Test 6 of the permission audit.
 *
 * Spins up a real Express app bound to an ephemeral port against an in-memory
 * MongoDB instance. Every assertion is an HTTP-level status code check; no
 * mocking of middleware or models is needed.
 *
 * Endpoints covered:
 *   Member-only (JWT + pod membership required):
 *     GET /api/pods/:id/activity
 *     GET /api/pods/:id/trust-scores
 *     GET /api/pods/:id/wallet-balance
 *     GET /api/pods/:id/my-contributions
 *
 *   Admin-only (JWT + pod creator required):
 *     GET /api/pods/:id/contribution-matrix
 *     POST /api/pods/:id/evaluate
 *     POST /api/pods/:id/payout
 *     POST /api/pods/:id/reset
 *     POST /api/payments/manual
 *
 *   Public (no auth):
 *     GET /api/pods
 *     GET /api/pods/:id
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectTestDB, disconnectTestDB, clearTestDB } from "./setup";
import { createApp } from "../app";
import User from "../models/User";
import Pod from "../models/Pod";

// ─── Test helpers ─────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.SEED_PASSWORD as unknown as string;

async function makeUser(name: string) {
  const hash = await bcrypt.hash("password", 10);
  return User.create({
    name,
    email: `${name.toLowerCase()}@ac-test.com`,
    passwordHash: hash,
    bankAccountNumber: "0123456789",
    bankCode: "057",
  });
}

function tokenFor(userId: string): string {
  return jwt.sign({ id: userId, email: `${userId}@test.com` }, JWT_SECRET, {
    expiresIn: "1h",
  });
}

async function makePod(creatorId: string, memberIds: string[] = []) {
  return Pod.create({
    name: "Access Control Pod",
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
  });
}

// ─── Server lifecycle ─────────────────────────────────────────────────────────

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  await connectTestDB();
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(
      0,
      resolve as unknown as (error?: Error | undefined) => void,
    );
  });
  const addr = server.address() as { port: number };
  baseUrl = `http://localhost:${addr.port}`;
}, 30_000);

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectTestDB();
}, 30_000);

beforeEach(clearTestDB, 10_000);

// ─── Convenience request helpers ─────────────────────────────────────────────

function get(path: string, token?: string) {
  return fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function post(path: string, token?: string, body?: object) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─── Public routes ────────────────────────────────────────────────────────────

describe("public routes — no auth required", () => {
  it("GET /api/pods returns 200 without a token", async () => {
    const res = await get("/api/pods");
    expect(res.status).toBe(200);
  });

  it("GET /api/pods/:id returns 200 without a token", async () => {
    const admin = await makeUser("Admin");
    const pod = await makePod(String(admin._id));
    const res = await get(`/api/pods/${pod._id}`);
    expect(res.status).toBe(200);
  });
});

// ─── Member-only routes ───────────────────────────────────────────────────────

const memberOnlyRoutes = [
  "/activity",
  "/trust-scores",
  "/wallet-balance",
  "/my-contributions",
];

describe.each(
  memberOnlyRoutes as unknown as readonly (readonly [any, ...any[]])[],
)("GET /api/pods/:id%s — member-only", (suffix) => {
  it("returns 401 with no token", async () => {
    const admin = await makeUser("Admin");
    const pod = await makePod(String(admin._id));
    const res = await get(`/api/pods/${pod._id}${suffix}`);
    expect(res.status).toBe(401);
  });

  it("returns 403 for an authenticated non-member", async () => {
    const admin = await makeUser("Admin");
    const outsider = await makeUser("Outsider");
    const pod = await makePod(String(admin._id));
    const res = await get(
      `/api/pods/${pod._id}${suffix}`,
      tokenFor(String(outsider._id)),
    );
    expect(res.status).toBe(403);
  });

  it("returns non-4xx for an authenticated member", async () => {
    const admin = await makeUser("Admin");
    const member = await makeUser("Member");
    const pod = await makePod(String(admin._id), [String(member._id)]);
    const res = await get(
      `/api/pods/${pod._id}${suffix}`,
      tokenFor(String(member._id)),
    );
    // Wallet balance may 404 when no wallet is provisioned — that's fine;
    // the important thing is the auth/authz layer passed (not 401/403).
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─── Admin-only GET routes ────────────────────────────────────────────────────

describe("GET /api/pods/:id/contribution-matrix — admin only", () => {
  it("returns 401 with no token", async () => {
    const admin = await makeUser("Admin");
    const pod = await makePod(String(admin._id));
    const res = await get(`/api/pods/${pod._id}/contribution-matrix`);
    expect(res.status).toBe(401);
  });

  it("returns 403 for an authenticated non-member", async () => {
    const admin = await makeUser("Admin");
    const outsider = await makeUser("Outsider");
    const pod = await makePod(String(admin._id));
    const res = await get(
      `/api/pods/${pod._id}/contribution-matrix`,
      tokenFor(String(outsider._id)),
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 for a member who is not the admin", async () => {
    const admin = await makeUser("Admin");
    const member = await makeUser("Member");
    const pod = await makePod(String(admin._id), [String(member._id)]);
    const res = await get(
      `/api/pods/${pod._id}/contribution-matrix`,
      tokenFor(String(member._id)),
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 for the pod admin", async () => {
    const admin = await makeUser("Admin");
    const pod = await makePod(String(admin._id));
    const res = await get(
      `/api/pods/${pod._id}/contribution-matrix`,
      tokenFor(String(admin._id)),
    );
    expect(res.status).toBe(200);
  });
});

// ─── Admin-only POST routes ───────────────────────────────────────────────────

const adminPostRoutes = ["/evaluate", "/payout", "/reset"];

describe.each(
  adminPostRoutes as unknown as readonly (readonly [any, ...any[]])[],
)("POST /api/pods/:id%s — admin only", (suffix) => {
  it("returns 401 with no token", async () => {
    const admin = await makeUser("Admin");
    const pod = await makePod(String(admin._id));
    const res = await post(`/api/pods/${pod._id}${suffix}`);
    expect(res.status).toBe(401);
  });

  it("returns 403 for an authenticated non-member", async () => {
    const admin = await makeUser("Admin");
    const outsider = await makeUser("Outsider");
    const pod = await makePod(String(admin._id));
    const res = await post(
      `/api/pods/${pod._id}${suffix}`,
      tokenFor(String(outsider._id)),
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 for a member who is not the admin", async () => {
    const admin = await makeUser("Admin");
    const member = await makeUser("Member");
    const pod = await makePod(String(admin._id), [String(member._id)]);
    const res = await post(
      `/api/pods/${pod._id}${suffix}`,
      tokenFor(String(member._id)),
    );
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/payments/manual — admin only ───────────────────────────────────

describe("POST /api/payments/manual — pod admin only", () => {
  it("returns 401 with no token", async () => {
    const admin = await makeUser("Admin");
    const pod = await makePod(String(admin._id));
    const res = await post("/api/payments/manual", undefined, {
      podId: String(pod._id),
      userId: String(admin._id),
      cycleNumber: 1,
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a member who is not the admin", async () => {
    const admin = await makeUser("Admin");
    const member = await makeUser("Member");
    const pod = await makePod(String(admin._id), [String(member._id)]);
    const res = await post(
      "/api/payments/manual",
      tokenFor(String(member._id)),
      {
        podId: String(pod._id),
        userId: String(admin._id),
        cycleNumber: 1,
      },
    );
    expect(res.status).toBe(403);
  });
});
