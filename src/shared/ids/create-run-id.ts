/**
 * Creates a unique, human-readable run ID.
 * Format: YYYYMMDD-XXXXX where XXXXX is a random alphanumeric string.
 */

import { randomBytes } from "node:crypto";

export function createRunId(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const datePart = `${y}${m}${d}`;
  const randomPart = randomBytes(4).toString("hex").slice(0, 6);
  return `${datePart}-${randomPart}`;
}
