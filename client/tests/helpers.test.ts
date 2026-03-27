import { describe, it, expect } from "bun:test";
import { ngn } from "@/lib/helpers";

function expectNgn(result: string, expectedNumberSubstring: string) {
  expect(result).toContain(expectedNumberSubstring);
  // Should contain the Naira sign (₦ or NGN depending on locale)
  expect(result).toMatch(/₦|NGN/);
}

describe("ngn", () => {
  it("formats a whole number as Nigerian Naira", () => {
    const result = ngn(5000);
    expectNgn(result, "5,000");
  });

  it("formats zero", () => {
    const result = ngn(0);
    expectNgn(result, "0");
  });

  it("formats decimal amounts", () => {
    const result = ngn(1234.56);
    expectNgn(result, "1,234.56");
  });

  it("formats large amounts", () => {
    const result = ngn(1000000);
    expectNgn(result, "1,000,000");
  });
});
