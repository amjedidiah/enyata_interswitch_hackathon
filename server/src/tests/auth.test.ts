/**
 * Auth route integration tests.
 *
 * Tests register validation, login, refresh token rotation, logout,
 * and profile update (bank details). Uses real Express + in-memory MongoDB.
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
import { connectTestDB, disconnectTestDB, clearTestDB } from "./setup";
import { createApp } from "../app";

const JWT_SECRET = "test-auth-secret";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  await connectTestDB();
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as { port: number };
  baseUrl = `http://localhost:${addr.port}`;
}, 30_000);

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectTestDB();
}, 30_000);

beforeEach(clearTestDB, 10_000);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function post(path: string, body?: object, headers?: Record<string, string>) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function get(path: string, token?: string) {
  return fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function patch(path: string, body: object, token?: string) {
  return fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

const validUser = {
  name: "Amara Test",
  email: "amara@auth-test.com",
  password: "StrongP@ss1",
  phone: "+2348100000000",
};

async function registerAndGetToken(): Promise<{
  token: string;
  cookie: string;
}> {
  const res = await post("/auth/register", validUser);
  const data = (await res.json()) as { token: string };
  const cookie = res.headers.get("set-cookie") ?? "";
  return { token: data.token, cookie };
}

// ─── Registration ────────────────────────────────────────────────────────────

describe("POST /auth/register", () => {
  it("creates a user and returns token + refresh cookie", async () => {
    const res = await post("/auth/register", validUser);
    expect(res.status).toBe(201);

    const data = (await res.json()) as {
      token: string;
      user: { name: string; email: string };
    };
    expect(data.token).toBeDefined();
    expect(data.user.email).toBe(validUser.email);

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("refresh_token=");
  });

  it("rejects missing fields", async () => {
    const res = await post("/auth/register", { email: "a@b.com" });
    expect(res.status).toBe(400);
  });

  it("rejects short names", async () => {
    const res = await post("/auth/register", { ...validUser, name: "AB" });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain("Name too short");
  });

  it("rejects weak passwords", async () => {
    const res = await post("/auth/register", {
      ...validUser,
      password: "weak",
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain("Weak password");
  });

  it("rejects password without uppercase", async () => {
    const res = await post("/auth/register", {
      ...validUser,
      password: "strong@pass1",
    });
    expect(res.status).toBe(400);
  });

  it("rejects password without special char", async () => {
    const res = await post("/auth/register", {
      ...validUser,
      password: "StrongPass1",
    });
    expect(res.status).toBe(400);
  });

  it("rejects invalid phone numbers", async () => {
    const res = await post("/auth/register", { ...validUser, phone: "123" });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain("Invalid phone");
  });

  it("rejects duplicate email", async () => {
    await post("/auth/register", validUser);
    const res = await post("/auth/register", validUser);
    expect(res.status).toBe(409);
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe("POST /auth/login", () => {
  it("returns token for valid credentials", async () => {
    await post("/auth/register", validUser);
    const res = await post("/auth/login", {
      email: validUser.email,
      password: validUser.password,
    });
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      token: string;
      user: { email: string };
    };
    expect(data.token).toBeDefined();
    expect(data.user.email).toBe(validUser.email);
  });

  it("rejects wrong password", async () => {
    await post("/auth/register", validUser);
    const res = await post("/auth/login", {
      email: validUser.email,
      password: "WrongP@ss1",
    });
    expect(res.status).toBe(401);
  });

  it("rejects non-existent user", async () => {
    const res = await post("/auth/login", {
      email: "nobody@test.com",
      password: "Whatever@1",
    });
    expect(res.status).toBe(401);
  });

  it("rejects missing fields", async () => {
    const res = await post("/auth/login", { email: validUser.email });
    expect(res.status).toBe(400);
  });
});

// ─── Refresh ─────────────────────────────────────────────────────────────────

describe("POST /auth/refresh", () => {
  it("rotates tokens when a valid refresh cookie is sent", async () => {
    const { cookie } = await registerAndGetToken();

    // Extract just the refresh_token cookie value
    const refreshCookie = cookie.split(";")[0]; // "refresh_token=..."
    const res = await post("/auth/refresh", undefined, {
      Cookie: refreshCookie,
    });
    expect(res.status).toBe(200);

    const data = (await res.json()) as { token: string };
    expect(data.token).toBeDefined();

    // Should set a new refresh cookie (rotation)
    const newCookie = res.headers.get("set-cookie") ?? "";
    expect(newCookie).toContain("refresh_token=");
  });

  it("rejects when no refresh cookie is present", async () => {
    const res = await post("/auth/refresh");
    expect(res.status).toBe(401);
  });

  it("rejects an invalid refresh token", async () => {
    const res = await post("/auth/refresh", undefined, {
      Cookie: "refresh_token=invalid-jwt-value",
    });
    expect(res.status).toBe(401);
  });
});

// ─── Logout ──────────────────────────────────────────────────────────────────

describe("POST /auth/logout", () => {
  it("clears the refresh cookie", async () => {
    const res = await post("/auth/logout");
    expect(res.status).toBe(200);

    const cookie = res.headers.get("set-cookie") ?? "";
    // Cookie should be cleared (max-age=0 or expires in past)
    expect(cookie).toContain("refresh_token=");
    // Verify cookie is actually cleared
    expect(
      cookie.toLowerCase().includes("max-age=0") ||
        cookie.toLowerCase().includes("expires=thu, 01 jan 1970"),
    ).toBe(true);
  });
});

// ─── GET /auth/me ────────────────────────────────────────────────────────────

describe("GET /auth/me", () => {
  it("returns profile for authenticated user", async () => {
    const { token } = await registerAndGetToken();
    const res = await get("/auth/me", token);
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      user: { email: string; name: string };
    };
    expect(data.user.email).toBe(validUser.email);
    expect(data.user.name).toBe(validUser.name);
  });

  it("returns 401 without token", async () => {
    const res = await get("/auth/me");
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /auth/me ──────────────────────────────────────────────────────────

describe("PATCH /auth/me", () => {
  it("updates bank details with valid NUBAN", async () => {
    const { token } = await registerAndGetToken();
    const res = await patch(
      "/auth/me",
      {
        bankAccountNumber: "0123456789",
        bankCode: "057",
      },
      token,
    );
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      user: { bankAccountNumber: string; bankCode: string };
    };
    expect(data.user.bankAccountNumber).toBe("0123456789");
    expect(data.user.bankCode).toBe("057");
  });

  it("rejects unauthenticated requests", async () => {
    const res = await patch("/auth/me", {
      bankAccountNumber: "0123456789",
      bankCode: "057",
    });
    expect(res.status).toBe(401);
  });

  it("rejects non-10-digit account number", async () => {
    const { token } = await registerAndGetToken();
    const res = await patch(
      "/auth/me",
      {
        bankAccountNumber: "12345",
        bankCode: "057",
      },
      token,
    );
    expect(res.status).toBe(400);
  });

  it("rejects invalid bank code", async () => {
    const { token } = await registerAndGetToken();
    const res = await patch(
      "/auth/me",
      {
        bankAccountNumber: "0123456789",
        bankCode: "1",
      },
      token,
    );
    expect(res.status).toBe(400);
  });

  it("rejects missing fields", async () => {
    const { token } = await registerAndGetToken();
    const res = await patch(
      "/auth/me",
      { bankAccountNumber: "0123456789" },
      token,
    );
    expect(res.status).toBe(400);
  });
});
