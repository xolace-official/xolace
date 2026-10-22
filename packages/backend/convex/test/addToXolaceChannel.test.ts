// @vitest-environment edge-runtime
/**
 * `streamSetup.addToXolaceChannel` — bounded self-retry. Convex's scheduler
 * does not retry actions, so a Stream failure must re-schedule itself, and
 * stop at `XOLACE_ADD_MAX_ATTEMPTS` (the backfill covers the rest).
 */
import { expect, test, vi } from "vitest";
import { internal } from "../_generated/api";
import { XOLACE_ADD_MAX_ATTEMPTS } from "../streamSetup";
import { allScheduledCalls } from "./fixtures.helpers";
import { asNewUser } from "./harness.helpers";
import { aggregatesMock } from "./mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../integrations/stream", async (orig) => ({
  ...(await orig<typeof import("../integrations/stream")>()),
  ensureStreamUsers: vi.fn(async () => {
    throw new Error("stream down");
  }),
}));

test("a failed attempt re-schedules itself with attempt+1; the last one gives up", async () => {
  const user = await asNewUser();
  const before = (await allScheduledCalls(user.root)).length;

  await user.root.action(internal.streamSetup.addToXolaceChannel, { profileId: user.profileId });
  const retries = (await allScheduledCalls(user.root)).filter(
    (c) => c.name.endsWith("streamSetup:addToXolaceChannel") && c.args.attempt === 2,
  );
  expect(retries).toHaveLength(1);
  expect(retries[0].args.profileId).toBe(user.profileId);

  await user.root.action(internal.streamSetup.addToXolaceChannel, {
    profileId: user.profileId,
    attempt: XOLACE_ADD_MAX_ATTEMPTS,
  });
  expect((await allScheduledCalls(user.root)).length).toBe(before + 1);
});
