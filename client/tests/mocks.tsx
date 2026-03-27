/**
 * Shared test mocks for Next.js hooks and AuthContext.
 *
 * Import this file in component tests that need router/searchParams/auth.
 */
// ─── AuthContext test wrapper ────────────────────────────────────────────────
import { type AuthUser } from "@/contexts/AuthContext";

// ─── Next.js navigation mocks ───────────────────────────────────────────────

export const mockPush = () => {};
export const mockSearchParams = new URLSearchParams();

// These are set up via mock.module in individual test files.
// Exported here as defaults for reference.

type MockAuthValue = {
  user: AuthUser | null;
  hasToken: boolean;
  isInitialized: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
};

const defaultAuth: MockAuthValue = {
  user: null,
  hasToken: false,
  isInitialized: true,
  setAuth: () => {},
  clearAuth: () => {},
};

/**
 * Creates a mock AuthContext value for testing.
 * Pass partial overrides to customize (e.g. `{ hasToken: true }`).
 */
export function mockAuth(overrides: Partial<MockAuthValue> = {}): MockAuthValue {
  return { ...defaultAuth, ...overrides };
}
