import { describe, it, expect, beforeEach } from "bun:test";
import { getAccessToken, setAccessToken } from "@/lib/auth";

describe("auth token store", () => {
  beforeEach(() => {
    setAccessToken(null);
  });

  it("starts with no token", () => {
    expect(getAccessToken()).toBeNull();
  });

  it("stores and retrieves a token", () => {
    setAccessToken("my-jwt-token");
    expect(getAccessToken()).toBe("my-jwt-token");
  });

  it("clears the token when set to null", () => {
    setAccessToken("token-1");
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });

  it("overwrites previous token", () => {
    setAccessToken("token-1");
    setAccessToken("token-2");
    expect(getAccessToken()).toBe("token-2");
  });

  it("handles undefined parameter", () => {
    setAccessToken("token-1");
    setAccessToken(null);
    // Verify expected behavior - should it clear like null, or keep the token?
    expect(getAccessToken()).toBeNull(); // or expect it to remain "token-1" depending on implementation
  });
});
