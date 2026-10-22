import { describe, expect, it } from "vitest";
import { validateDisplayName, DISPLAY_NAME_MAX_LENGTH } from "./displayName";

describe("validateDisplayName", () => {
  it("rejects empty and whitespace-only names", () => {
    expect(validateDisplayName("").ok).toBe(false);
    expect(validateDisplayName("   ").ok).toBe(false);
  });

  it("trims and accepts a normal name", () => {
    expect(validateDisplayName("  Wren  ")).toEqual({ ok: true, trimmed: "Wren" });
  });

  it("counts code points, not UTF-16 units", () => {
    // 30 emoji = 60 UTF-16 units, still within the limit.
    expect(validateDisplayName("🌙".repeat(DISPLAY_NAME_MAX_LENGTH)).ok).toBe(true);
    expect(validateDisplayName("🌙".repeat(DISPLAY_NAME_MAX_LENGTH + 1)).ok).toBe(false);
  });
});
