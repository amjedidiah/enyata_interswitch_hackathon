// Module-level access token store.
// api.ts reads from here in its request interceptor.
// React components should use AuthContext (via useAuth) instead —
// it calls setAccessToken here whenever the token changes.

let _accessToken: string | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}
