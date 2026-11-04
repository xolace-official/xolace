// @vitest-environment edge-runtime
/**
 * The intake save path: `intake.complete` (v1, #262), and v2's
 * `completeV2`, `recordDeferredAnswer` and `missingDeferredAnswers` (#715).
 *
 * What matters here is the single transaction: the answers row, the Q1
 * display name, and the `onboardingComplete` gate all land together or not at
 * all, and the multi-select cap a validator can't express holds. For v2, that
 * a partial row is a valid row, and a deferred answer fills only its own
 * field, once.
 */
import type { FunctionArgs } from "convex/server";
import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { expectCode } from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import { aggregatesMock } from "./mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());

const ANSWERS: FunctionArgs<typeof api.intake.complete> = {
	acquisitionSource: "friend_family",
	ageBracket: "25_34",
	copingStyle: ["outside_things"],
	disclosureStyle: "bit_at_a_time",
	displayName: "Wren",
	emotionAwareness: "know_but_no_words",
	intent: "understand_feelings",
	supportFrequency: "occasionally",
	weighingOn: ["work", "a_loss"],
};

const readIntake = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db
			.query("intake_responses")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.unique()
	);

const readState = async (user: SeededUser) =>
	user.root.run(async (ctx) => {
		const profile = await ctx.db.get("emotional_profiles", user.profileId);
		const prefs = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.unique();
		return {
			displayName: prefs?.displayName,
			onboardingComplete: profile?.onboardingComplete,
		};
	});

describe("intake.complete", () => {
	it("writes the row, the display name, and the gate in one call", async () => {
		const user = await asNewUser();

		await user.t.mutation(api.intake.complete, ANSWERS);

		const row = await readIntake(user);
		expect(row).toMatchObject({
			acquisitionSource: "friend_family",
			copingStyle: ["outside_things"],
			emotionalProfileId: user.profileId,
			intakeVersion: 1,
			intent: "understand_feelings",
			weighingOn: ["work", "a_loss"],
		});
		expect(row?.completedAt).toBeGreaterThan(0);
		expect(await readState(user)).toEqual({
			displayName: "Wren",
			onboardingComplete: true,
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
			"missing_series_answer"
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
			"too_many_selections"
		);

		expect(await readIntake(user)).toBeNull();
		expect(await readState(user)).toMatchObject({ onboardingComplete: false });
	});

	it("rejects an empty display name, writing nothing", async () => {
		const user = await asNewUser();

		await expectCode(
			() =>
				user.t.mutation(api.intake.complete, { ...ANSWERS, displayName: "  " }),
			"invalid_display_name"
		);

		expect(await readIntake(user)).toBeNull();
		expect(await readState(user)).toMatchObject({ onboardingComplete: false });
	});

	it("refuses an unauthenticated caller", async () => {
		const user = await asNewUser();

		await expectCode(
			() => user.root.mutation(api.intake.complete, ANSWERS),
			"not_authenticated"
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
			displayName: "Cedar",
			onboardingComplete: true,
		});
	});
});

/** What a client reads back: the intake row, name and gate from the app-open query. */
const readContext = async (user: SeededUser) => {
	const context = await user.t.query(api.users.getFullContext, {});
	return {
		displayName: context?.preferences?.displayName,
		intake: context?.intake,
		onboardingComplete: context?.profile.onboardingComplete,
	};
};

describe("intake.completeV2", () => {
	it("completes with only the answers it has, stamped as v2", async () => {
		const user = await asNewUser();

		await user.t.mutation(api.intake.completeV2, {
			displayName: "Wren",
			intent: "feel_less_alone",
		});

		const { intake, ...state } = await readContext(user);
		expect(state).toEqual({ displayName: "Wren", onboardingComplete: true });
		expect(intake).toMatchObject({
			intakeVersion: 2,
			intent: "feel_less_alone",
		});
		expect(intake?.completedAt).toBeGreaterThan(0);
		expect(intake?.ageBracket).toBeUndefined();
		expect(intake?.weighingOn).toBeUndefined();
	});

	it("reads an all-tapped-off weighingOn as not told", async () => {
		const user = await asNewUser();

		await user.t.mutation(api.intake.completeV2, {
			displayName: "Wren",
			weighingOn: [],
		});

		expect((await readContext(user)).intake?.weighingOn).toBeUndefined();
	});

	it("on a retry, rewrites its own fields and keeps deferred answers", async () => {
		const user = await asNewUser();
		await user.t.mutation(api.intake.completeV2, {
			disclosureStyle: "keep_it_brief",
			displayName: "Wren",
			intent: "feel_less_alone",
		});
		await user.t.mutation(api.intake.recordDeferredAnswer, {
			answer: { ageBracket: "35_44", question: "ageBracket" },
		});

		await user.t.mutation(api.intake.completeV2, {
			displayName: "Cedar",
			intent: "just_looking",
		});

		const { intake, ...state } = await readContext(user);
		expect(state).toEqual({ displayName: "Cedar", onboardingComplete: true });
		expect(intake).toMatchObject({
			ageBracket: "35_44",
			intent: "just_looking",
		});
		expect(intake?.disclosureStyle).toBeUndefined();
	});

	it("rejects a weighingOn over three, writing nothing", async () => {
		const user = await asNewUser();

		await expectCode(
			() =>
				user.t.mutation(api.intake.completeV2, {
					displayName: "Wren",
					weighingOn: ["work", "family", "money", "health"],
				}),
			"too_many_selections"
		);

		expect(await readIntake(user)).toBeNull();
		expect(await readState(user)).toMatchObject({ onboardingComplete: false });
	});

	it("rejects an empty display name, writing nothing", async () => {
		const user = await asNewUser();

		await expectCode(
			() => user.t.mutation(api.intake.completeV2, { displayName: "  " }),
			"invalid_display_name"
		);

		expect(await readIntake(user)).toBeNull();
	});

	it("refuses an unauthenticated caller", async () => {
		const user = await asNewUser();

		await expectCode(
			() => user.root.mutation(api.intake.completeV2, { displayName: "Wren" }),
			"not_authenticated"
		);
	});
});

const asV2User = async () => {
	const user = await asNewUser();
	await user.t.mutation(api.intake.completeV2, {
		displayName: "Wren",
		intent: "feel_less_alone",
	});
	return user;
};

describe("intake.recordDeferredAnswer", () => {
	it("fills only its own field", async () => {
		const user = await asV2User();
		const before = (await readContext(user)).intake;

		await user.t.mutation(api.intake.recordDeferredAnswer, {
			answer: { ageBracket: "18_24", question: "ageBracket" },
		});

		const { _creationTime, _id, ...rest } = before ?? {};
		expect((await readContext(user)).intake).toEqual({
			...rest,
			_creationTime,
			_id,
			ageBracket: "18_24",
		});
	});

	it("keeps the first answer: a repeat is a no-op", async () => {
		const user = await asV2User();

		const first = await user.t.mutation(api.intake.recordDeferredAnswer, {
			answer: { question: "supportFrequency", supportFrequency: "every_day" },
		});
		const repeat = await user.t.mutation(api.intake.recordDeferredAnswer, {
			answer: { question: "supportFrequency", supportFrequency: "not_sure" },
		});

		expect(first).toEqual({ recorded: true });
		expect(repeat).toEqual({ recorded: false });
		expect((await readContext(user)).intake?.supportFrequency).toBe(
			"every_day"
		);
	});

	it("never overwrites what a v1 user answered at intake", async () => {
		const user = await asNewUser();
		await user.t.mutation(api.intake.complete, ANSWERS);

		const result = await user.t.mutation(api.intake.recordDeferredAnswer, {
			answer: { ageBracket: "under_18", question: "ageBracket" },
		});

		expect(result).toEqual({ recorded: false });
		expect((await readContext(user)).intake?.ageBracket).toBe("25_34");
	});

	it("carries the series pair with a short-form-video arrival", async () => {
		const user = await asV2User();

		await user.t.mutation(api.intake.recordDeferredAnswer, {
			answer: {
				acquisitionSource: "short_form_video",
				question: "acquisitionSource",
				seriesSeen: "it_was_okay",
				seriesWantInApp: false,
			},
		});

		expect((await readContext(user)).intake).toMatchObject({
			acquisitionSource: "short_form_video",
			seriesSeen: "it_was_okay",
			seriesWantInApp: false,
		});
	});

	it("drops the series pair for any other arrival", async () => {
		const user = await asV2User();

		await user.t.mutation(api.intake.recordDeferredAnswer, {
			answer: {
				acquisitionSource: "store_search",
				question: "acquisitionSource",
				seriesSeen: "loved_it",
				seriesWantInApp: true,
			},
		});

		const { intake } = await readContext(user);
		expect(intake?.acquisitionSource).toBe("store_search");
		expect(intake?.seriesSeen).toBeUndefined();
		expect(intake?.seriesWantInApp).toBeUndefined();
	});

	it("rejects a half-filled series pair, writing nothing", async () => {
		const user = await asV2User();

		await expectCode(
			() =>
				user.t.mutation(api.intake.recordDeferredAnswer, {
					answer: {
						acquisitionSource: "short_form_video",
						question: "acquisitionSource",
						seriesSeen: "loved_it",
					},
				}),
			"missing_series_answer"
		);

		expect((await readContext(user)).intake?.acquisitionSource).toBeUndefined();
	});

	it("rejects an empty or over-long coping answer", async () => {
		const user = await asV2User();

		await expectCode(
			() =>
				user.t.mutation(api.intake.recordDeferredAnswer, {
					answer: { copingStyle: [], question: "copingStyle" },
				}),
			"empty_selection"
		);
		await expectCode(
			() =>
				user.t.mutation(api.intake.recordDeferredAnswer, {
					answer: {
						copingStyle: [
							"distract",
							"let_it_out",
							"lean_on_people",
							"outside_things",
						],
						question: "copingStyle",
					},
				}),
			"too_many_selections"
		);

		expect((await readContext(user)).intake?.copingStyle).toBeUndefined();
	});

	it("needs a completed intake to attach to", async () => {
		const user = await asNewUser();

		await expectCode(
			() =>
				user.t.mutation(api.intake.recordDeferredAnswer, {
					answer: { ageBracket: "18_24", question: "ageBracket" },
				}),
			"intake_not_completed"
		);
	});

	it("refuses an unauthenticated caller", async () => {
		const user = await asV2User();

		await expectCode(
			() =>
				user.root.mutation(api.intake.recordDeferredAnswer, {
					answer: { ageBracket: "18_24", question: "ageBracket" },
				}),
			"not_authenticated"
		);
	});
});

describe("intake.missingDeferredAnswers", () => {
	it("lists every deferred question after a v2 intake, minus those answered", async () => {
		const user = await asV2User();
		expect(await user.t.query(api.intake.missingDeferredAnswers, {})).toEqual([
			"ageBracket",
			"acquisitionSource",
			"copingStyle",
			"supportFrequency",
		]);

		await user.t.mutation(api.intake.recordDeferredAnswer, {
			answer: { copingStyle: ["distract"], question: "copingStyle" },
		});

		expect(await user.t.query(api.intake.missingDeferredAnswers, {})).toEqual([
			"ageBracket",
			"acquisitionSource",
			"supportFrequency",
		]);
	});

	it("is empty for a v1 user, who answered everything at intake", async () => {
		const user = await asNewUser();
		await user.t.mutation(api.intake.complete, ANSWERS);

		expect(await user.t.query(api.intake.missingDeferredAnswers, {})).toEqual(
			[]
		);
	});

	it("is empty before intake, when there is no row to answer onto", async () => {
		const user = await asNewUser();

		expect(await user.t.query(api.intake.missingDeferredAnswers, {})).toEqual(
			[]
		);
	});

	it("refuses an unauthenticated caller", async () => {
		const user = await asV2User();

		await expectCode(
			() => user.root.query(api.intake.missingDeferredAnswers, {}),
			"not_authenticated"
		);
	});
});
