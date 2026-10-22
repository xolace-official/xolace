// @vitest-environment edge-runtime
/**
 * `generateDb.write` consumes the daily `pathsGenerate` slot in the same
 * transaction as the rows. The real rate-limiter component is registered so a
 * write that throws after the limit is taken provably rolls the slot back:
 * the retry lands, and the *third* attempt is the one refused.
 */
import { describe, expect, it, vi } from "vitest";
import rateLimiterSchema from "../../../node_modules/@convex-dev/rate-limiter/src/component/schema";
import { internal } from "../../_generated/api";
import { seedSession } from "../../test/fixtures.helpers";
import { asNewUser } from "../../test/harness.helpers";
import { aggregatesMock } from "../../test/mocks.helpers";

const stub = vi.hoisted(() => ({ throwOnCapture: false }));
vi.mock("../../lib/aggregates", () => aggregatesMock());
vi.mock("../../posthog", () => ({
  posthog: {
    capture: async () => {
      if (stub.throwOnCapture) throw new Error("posthog down");
    },
  },
}));

const rateLimiterModules = import.meta.glob(
  "../../../node_modules/@convex-dev/rate-limiter/src/component/**/*.ts",
);

describe("generateDb.write", () => {
  it("rolls the daily slot back when the write fails, so the retry is allowed", async () => {
    const { root, profileId } = await asNewUser();
    root.registerComponent("rateLimiter", rateLimiterSchema, rateLimiterModules);
    const sessionId = await seedSession(root, profileId);
    const args = {
      sessionId,
      emotionalProfileId: profileId,
      model: "m",
      modelVersion: "v",
      twigs: [{ actionType: "breathe", order: 1, why: "w", params: {} }],
    };

    stub.throwOnCapture = true;
    await expect(root.mutation(internal.ai.paths.generateDb.write, args)).rejects.toThrow(
      "posthog down",
    );
    stub.throwOnCapture = false;

    // Retry lands — the failed attempt did not burn the slot.
    await expect(root.mutation(internal.ai.paths.generateDb.write, args)).resolves.not.toBeNull();
    // And only now is the day spent.
    await expect(root.mutation(internal.ai.paths.generateDb.write, args)).resolves.toBeNull();
    expect(await root.run((ctx) => ctx.db.query("paths").take(10))).toHaveLength(1);
  });
});
