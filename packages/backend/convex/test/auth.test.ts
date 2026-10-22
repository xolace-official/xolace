// @vitest-environment edge-runtime
/**
 * The guards every other Convex function inherits (`requireAuth` /
 * `requireSessionOwnership`), exercised through real functions rather than by
 * importing the guards directly — `users.getCurrent` for the auth branches,
 * `sessions.getById` for the ownership ones. The other 27 files calling
 * `requireAuth` inherit this coverage and need no guard tests of their own.
 *
 * Assertions read `ConvexError.data.code`, never a message: a bare `Error`
 * reaches production clients redacted to "Server Error", so the code is the
 * only thing a client can branch on (see `src/providers/bootstrap-error.ts`).
 */
import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { expectCode, seedSession } from "./fixtures.helpers";
import { asNewUser, asUnauthed, asUserWithStatus, makeIdentity } from "./harness.helpers";
import { aggregatesMock } from "./mocks.helpers";

// `users.getOrCreate` calls `rankInsert`; the @convex-dev/aggregate component
// is not registered in the test backend.
vi.mock("../lib/aggregates", () => aggregatesMock());

describe("requireAuth", () => {
  it("throws not_authenticated with no identity", async () => {
    const t = asUnauthed();
    await expectCode(() => t.query(api.users.getCurrent, {}), "not_authenticated");
  });

  it("throws user_not_found for an identity with no users row", async () => {
    const t = asUnauthed().withIdentity(makeIdentity(99));
    await expectCode(() => t.query(api.users.getCurrent, {}), "user_not_found");
  });

  it("throws account_inactive for a non-active account", async () => {
    const { t } = await asUserWithStatus("suspended");
    await expectCode(() => t.query(api.users.getCurrent, {}), "account_inactive");
  });

  it("throws profile_not_found when the profile row is gone", async () => {
    const { t, root, profileId } = await asNewUser();
    // Orphaning the emotionalProfileId is a state no mutation produces.
    await root.run((ctx) => ctx.db.delete("emotional_profiles", profileId));
    await expectCode(() => t.query(api.users.getCurrent, {}), "profile_not_found");
  });

  it("returns the user on the success path", async () => {
    const { t, userId } = await asNewUser();
    const user = await t.query(api.users.getCurrent, {});
    expect(user?._id).toBe(userId);
    expect(user?.accountStatus).toBe("active");
  });
});

describe("requireSessionOwnership", () => {
  it("throws session_not_found for a deleted session id", async () => {
    const seeded = await asNewUser();
    const sessionId = await seedSession(seeded.root, seeded.profileId, {
      state: "initiated",
    });
    await seeded.root.run((ctx) => ctx.db.delete("sessions", sessionId));

    await expectCode(
      () => seeded.t.query(api.sessions.getById, { sessionId }),
      "session_not_found",
    );
  });

  it("throws session_forbidden when the session belongs to another user", async () => {
    const userA = await asNewUser();
    const userB = await asNewUser(2, userA.root);
    const sessionId = await seedSession(userA.root, userA.profileId, {
      state: "initiated",
    });

    await expectCode(
      () => userB.t.query(api.sessions.getById, { sessionId }),
      "session_forbidden",
    );
    // ...and the owner still reads it, so the negative isn't a false alarm.
    expect((await userA.t.query(api.sessions.getById, { sessionId }))._id).toBe(sessionId);
  });
});

describe("users.getOrCreate", () => {
  it("stores identity.subject as authProviderAccountId, ignoring the client arg", async () => {
    const { root, userId } = await asNewUser(7);
    const t = root.withIdentity(makeIdentity(7));
    await t.mutation(api.users.getOrCreate, {
      authProvider: "google",
      authProviderAccountId: "spoofed_by_client",
    });

    const user = await root.run((ctx) => ctx.db.get("users", userId));
    expect(user?.authProviderAccountId).toBe(makeIdentity(7).subject);
    // withIdentity derives "{issuer}|{subject}" — the real Clerk shape.
    expect(user?.tokenIdentifier).toBe(
      `${makeIdentity(7).issuer}|${makeIdentity(7).subject}`,
    );
  });

  it("reactivates an account caught mid-deletion", async () => {
    for (const status of ["deleted", "purging"] as const) {
      const { t, root, userId } = await asUserWithStatus(status);
      await root.run((ctx) =>
        ctx.db.patch("users", userId, { deletionRequestedAt: Date.now() }),
      );

      const again = await t.mutation(api.users.getOrCreate, { authProvider: "google" });

      expect(again).toBe(userId);
      const user = await root.run((ctx) => ctx.db.get("users", userId));
      expect(user?.accountStatus).toBe("active");
      expect(user?.deletionRequestedAt).toBeUndefined();
    }
  });
});
