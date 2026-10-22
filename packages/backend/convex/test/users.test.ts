// @vitest-environment edge-runtime
/**
 * `users.getOrCreate` — the Xolace-channel-membership side effect (#374).
 * Asserted at the enqueue boundary (house style, see `scheduledCalls`): the
 * action itself is one try/catch around `addStreamChannelMembers`.
 */
import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { allScheduledCalls, scheduled } from "./fixtures.helpers";
import { asNewUser, asUserWithStatus } from "./harness.helpers";
import { aggregatesMock, noopJob } from "./mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());

vi.mock("../streamSetup", async (orig) => ({
  ...(await orig<typeof import("../streamSetup")>()),
  addToXolaceChannel: noopJob(),
}));

describe("users.getOrCreate", () => {
  it("schedules a Xolace channel membership add for a new signup", async () => {
    const user = await asNewUser();

    const call = scheduled(await allScheduledCalls(user.root), "streamSetup:addToXolaceChannel");
    expect(call?.args).toEqual({ profileId: user.profileId });
  });

  it("an already-active user hitting getOrCreate again does not re-schedule or error", async () => {
    const user = await asNewUser();

    await expect(
      user.t.mutation(api.users.getOrCreate, { authProvider: "google" }),
    ).resolves.toBe(user.userId);

    // Only the original signup scheduled the add — an already-active user is
    // a pure lookup, no reason to hit Stream again on every app open.
    const calls = (await allScheduledCalls(user.root)).filter((c) =>
      c.name.endsWith("streamSetup:addToXolaceChannel"),
    );
    expect(calls).toHaveLength(1);
  });

  it("the grace-period reactivation path also schedules the add, without erroring", async () => {
    // asUserWithStatus onboards through getOrCreate (1 schedule), then forces
    // the account into "deleted" the way the account-deletion sweep would.
    const user = await asUserWithStatus("deleted");

    const reactivated = await user.t.mutation(api.users.getOrCreate, {
      authProvider: "google",
    });
    expect(reactivated).toBe(user.userId);

    // One from the original signup, one from reactivation — both carry the
    // same profileId. Scheduling twice is fine: `addToXolaceChannel` calls
    // Stream's `add_members`, which no-ops for an id already a member, so
    // this never produces duplicate membership.
    const calls = (await allScheduledCalls(user.root)).filter((c) =>
      c.name.endsWith("streamSetup:addToXolaceChannel"),
    );
    expect(calls).toHaveLength(2);
    expect(calls.every((c) => c.args.profileId === user.profileId)).toBe(true);
  });
});
