// @vitest-environment edge-runtime
/**
 * #438: contribution-graph history. What can go wrong: breadth counts repeats
 * or zero-weight actions, a quotes-only day inflates "days showed up", frozen
 * days go missing, or the grid starts after history that predates the profile.
 */
import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";
import type { ActivityActionType } from "./activityLog";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(false));

const DAY = 24 * 60 * 60 * 1000;
const BASE = Date.UTC(2026, 0, 5, 12); // noon UTC; test users have no timezone → UTC

const record = (user: SeededUser, day: number, actionType: ActivityActionType) =>
  user.t.mutation(internal.streaks.manual.recordActivityManual, {
    emotionalProfileId: user.profileId,
    actionType,
    timestamp: BASE + day * DAY,
  });

describe("streak history (#438)", () => {
  it("a new user gets an empty history", async () => {
    const user = await asNewUser();
    const history = await user.t.query(api.streaks.history.get, {});
    expect(history.days).toEqual([]);
    expect(history.frozenDays).toEqual([]);
    expect(history.daysShowedUp).toBe(0);
    expect(history.timezone).toBe("UTC");
  });

  it("shapes days by distinct full-credit kinds, keeps repeats and quotes in the breakdown", async () => {
    const user = await asNewUser();
    await record(user, 0, "vent");
    await record(user, 0, "vent");
    await record(user, 0, "reflect");
    await record(user, 0, "quotes");
    await record(user, 1, "quotes");
    await record(user, 3, "library");

    const history = await user.t.query(api.streaks.history.get, {});
    expect(history.days).toEqual([
      {
        dayKey: "2026-01-05",
        breadth: 2,
        actions: expect.arrayContaining([
          { type: "vent", count: 2 },
          { type: "reflect", count: 1 },
          { type: "quotes", count: 1 },
        ]),
      },
      { dayKey: "2026-01-06", breadth: 0, actions: [{ type: "quotes", count: 1 }] },
      { dayKey: "2026-01-08", breadth: 1, actions: [{ type: "library", count: 1 }] },
    ]);
    expect(history.daysShowedUp).toBe(2);
    // History older than the profile row moves the grid's first day back.
    expect(history.joinDay).toBe("2026-01-05");
  });

  it("returns frozen days", async () => {
    const user = await asNewUser();
    await user.root.run((ctx) =>
      ctx.db.insert("frozen_days", { emotionalProfileId: user.profileId, dayKey: "2026-01-07", createdAt: BASE }),
    );
    const history = await user.t.query(api.streaks.history.get, {});
    expect(history.frozenDays).toEqual(["2026-01-07"]);
  });
});
