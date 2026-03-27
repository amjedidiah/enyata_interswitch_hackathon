/**
 * Shared auth-related constants used across proxy.ts, server-auth.ts,
 * and AuthContext.tsx. Centralised here so a rename never silently breaks
 * the proxy ↔ server-component ↔ client handshake.
 */

/** HttpOnly cookie set by the Express auth routes — read by proxy.ts */
export const REFRESH_COOKIE_NAME = "refresh_token";

/**
 * Non-HttpOnly cookie set by proxy.ts when a valid refresh token is present.
 * Read by AuthContext to decide whether to attempt a silent refresh on mount.
 */
export const SESSION_HINT_COOKIE = "has_session";

/** Request headers forwarded by proxy.ts for Server Components to read */
export const USER_ID_HEADER = "x-user-id";
export const USER_EMAIL_HEADER = "x-user-email";
