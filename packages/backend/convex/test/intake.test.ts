// @vitest-environment edge-runtime
/**
 * `intake.complete` — the terminal mutation of the intake flow (#262).
 *
 * What matters here is the single transaction: the answers row, the Q1
 * display name, and the `onboardingComplete` gate all land together or not at
 * all, and the multi-select cap a validator can't express holds.
 */
import type { FunctionArgs } from "convex/server";
import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { expectCode } from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import { aggregatesMock } from "./mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());

const ANSWERS: FunctionArgs<typeof api.intake.complete> = {
  displayName: "Wren",
  intent: "understand_feelings",
  weighingOn: ["work", "a_loss"],
  emotionAwareness: "know_but_no_words",
  disclosureStyle: "bit_at_a_time",
  copingStyle: ["outside_things"],
  supportFrequency: "occasionally",
  ageBracket: "25_34",
  acquisitionSource: "friend_family",
};

const readIntake = (user: SeededUser) =>
  user.root.run((ctx) =>
    ctx.db
      .query("intake_responses")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", user.profileId))
      .unique(),
  );

const readState = async (user: SeededUser) =>
  user.root.run(async (ctx) => {
    const profile = await ctx.db.get("emotional_profiles", user.profileId);
    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", user.profileId))
      .unique();
    return {
      onboardingComplete: profile?.onboardingComplete,
      displayName: prefs?.displayName,
    };
  });

describe("intake.complete", () => {
  it("writes the row, the display name, and the gate in one call", async () => {
    const user = await asNewUser();

    await user.t.mutation(api.intake.complete, ANSWERS);

    const row = await readIntake(user);
    expect(row).toMatchObject({
      emotionalProfileId: user.profileId,
      intakeVersion: 1,
      intent: "understand_feelings",
      weighingOn: ["work", "a_loss"],
      copingStyle: ["outside_things"],
      acquisitionSource: "friend_family",
    });
    expect(row?.completedAt).toBeGreaterThan(0);
    expect(await readState(user)).toEqual({
      onboardingComplete: true,
      displayName: "Wren",
    });
  });

  it("drops series answers when the short-form-video branch never fired", async () => {
    const user = await asNewUser();

    await user.t.mutation(api.intake.complete, {
      ...ANSWERS,
      acquisitionSource: "social",
      seriesSeen: "loved_it",
      seriesWantInApp: true,
    });

    const row = await readIntake(user);
    expect(row?.seriesSeen).toBeUndefined();
    expect(row?.seriesWantInApp).toBeUndefined();
  });

  it("keeps series answers when it did", async () => {
    const user = await asNewUser();

    await user.t.mutation(api.intake.complete, {
      ...ANSWERS,
      acquisitionSource: "short_form_video",
      seriesSeen: "loved_it",
      seriesWantInApp: true,
    });

    expect(await readIntake(user)).toMatchObject({
      seriesSeen: "loved_it",
      seriesWantInApp: true,
    });
  });

  it("rejects a half-filled series pair, writing nothing", async () => {
    const user = await asNewUser();

    await expectCode(
      () =>
        user.t.mutation(api.intake.complete, {
          ...ANSWERS,
          acquisitionSource: "short_form_video",
          seriesSeen: "loved_it",
        }),
      "missing_series_answer",
    );

    expect(await readIntake(user)).toBeNull();
    expect(await readState(user)).toMatchObject({ onboardingComplete: false });
  });

  it("rejects a multi-select over three, writing nothing", async () => {
    const user = await asNewUser();

    await expectCode(
      () =>
        user.t.mutation(api.intake.complete, {
          ...ANSWERS,
          weighingOn: ["work", "family", "money", "health"],
        }),
      "too_many_selections",
    );

    expect(await readIntake(user)).toBeNull();
    expect(await readState(user)).toMatchObject({ onboardingComplete: false });
  });

  it("rejects an empty display name, writing nothing", async () => {
    const user = await asNewUser();

    await expectCode(
      () => user.t.mutation(api.intake.complete, { ...ANSWERS, displayName: "  " }),
      "invalid_display_name",
    );

    expect(await readIntake(user)).toBeNull();
    expect(await readState(user)).toMatchObject({ onboardingComplete: false });
  });

  it("refuses an unauthenticated caller", async () => {
    const user = await asNewUser();

    await expectCode(
      () => user.root.mutation(api.intake.complete, ANSWERS),
      "not_authenticated",
    );
  });

  it("overwrites on a retry instead of duplicating", async () => {
    const user = await asNewUser();

    await user.t.mutation(api.intake.complete, ANSWERS);
    await user.t.mutation(api.intake.complete, {
      ...ANSWERS,
      displayName: "Cedar",
      intent: "just_looking",
    });

    // `.unique()` throws if a second row exists.
    expect(await readIntake(user)).toMatchObject({ intent: "just_looking" });
    expect(await readState(user)).toEqual({
      onboardingComplete: true,
      displayName: "Cedar",
    });
  });
});
