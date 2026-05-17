import { describe, it, expect } from "vitest";
import { createRunId } from "./create-run-id.js";

describe("createRunId", () => {
  it("should return a string matching the expected pattern", () => {
    const id = createRunId();
    // Pattern: YYYYMMDD-XXXXXX (date + 6 hex chars)
    expect(id).toMatch(/^\d{8}-[0-9a-f]{6}$/);
  });

  it("should produce different IDs on consecutive calls", () => {
    const id1 = createRunId();
    const id2 = createRunId();
    // Note: there's a tiny chance they match, but astronomically unlikely
    expect(id1).not.toBe(id2);
  });

  it("should have the current date as prefix", () => {
    const id = createRunId();
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const expectedPrefix = `${y}${m}${d}`;
    expect(id.startsWith(expectedPrefix)).toBe(true);
  });
});
