// @vitest-environment edge-runtime
import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { expectCode } from "../test/fixtures.helpers";
import { asNewUser } from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";
import { asV2User, readContext, V1_ANSWERS } from "./fixtures.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());

/**
 * Deferred answers (#715): each fills only its own field, once, and
 * `missing` tells a client which are still owed.
 */
describe("intake/deferred.record", () => {
	it("fills only its own field", async () => {
		const user = await asV2User();
		const before = (await readContext(user)).intake;

		await user.t.mutation(api.intake.deferred.record, {
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

		const first = await user.t.mutation(api.intake.deferred.record, {
			answer: { question: "supportFrequency", supportFrequency: "every_day" },
		});
		const repeat = await user.t.mutation(api.intake.deferred.record, {
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
		await user.t.mutation(api.intake.complete, V1_ANSWERS);

		const result = await user.t.mutation(api.intake.deferred.record, {
			answer: { ageBracket: "under_18", question: "ageBracket" },
		});

		expect(result).toEqual({ recorded: false });
		expect((await readContext(user)).intake?.ageBracket).toBe("25_34");
	});

	it("carries the series pair with a short-form-video arrival", async () => {
		const user = await asV2User();

		await user.t.mutation(api.intake.deferred.record, {
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

		await user.t.mutation(api.intake.deferred.record, {
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
				user.t.mutation(api.intake.deferred.record, {
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
				user.t.mutation(api.intake.deferred.record, {
					answer: { copingStyle: [], question: "copingStyle" },
				}),
			"empty_selection"
		);
		await expectCode(
			() =>
				user.t.mutation(api.intake.deferred.record, {
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
				user.t.mutation(api.intake.deferred.record, {
					answer: { ageBracket: "18_24", question: "ageBracket" },
				}),
			"intake_not_completed"
		);
	});

	it("refuses an unauthenticated caller", async () => {
		const user = await asV2User();

		await expectCode(
			() =>
				user.root.mutation(api.intake.deferred.record, {
					answer: { ageBracket: "18_24", question: "ageBracket" },
				}),
			"not_authenticated"
		);
	});
});

describe("intake/deferred.missing", () => {
	it("lists every deferred question after a v2 intake, minus those answered", async () => {
		const user = await asV2User();
		expect(await user.t.query(api.intake.deferred.missing, {})).toEqual([
			"ageBracket",
			"acquisitionSource",
			"copingStyle",
			"supportFrequency",
		]);

		await user.t.mutation(api.intake.deferred.record, {
			answer: { copingStyle: ["distract"], question: "copingStyle" },
		});

		expect(await user.t.query(api.intake.deferred.missing, {})).toEqual([
			"ageBracket",
			"acquisitionSource",
			"supportFrequency",
		]);
	});

	it("is empty for a v1 user, who answered everything at intake", async () => {
		const user = await asNewUser();
		await user.t.mutation(api.intake.complete, V1_ANSWERS);

		expect(await user.t.query(api.intake.deferred.missing, {})).toEqual([]);
	});

	it("is empty before intake, when there is no row to answer onto", async () => {
		const user = await asNewUser();

		expect(await user.t.query(api.intake.deferred.missing, {})).toEqual([]);
	});

	it("refuses an unauthenticated caller", async () => {
		const user = await asV2User();

		await expectCode(
			() => user.root.query(api.intake.deferred.missing, {}),
			"not_authenticated"
		);
	});
});
