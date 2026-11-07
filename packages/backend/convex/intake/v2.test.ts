// @vitest-environment edge-runtime
import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { expectCode } from "../test/fixtures.helpers";
import { asNewUser } from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";
import { readContext } from "./fixtures.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());

/**
 * v2 completion (#715): a partial row is a valid row, and the name and
 * onboarding gate land with it in one transaction, as in v1.
 */
describe("intake/v2.complete", () => {
	it("completes with only the answers it has, stamped as v2", async () => {
		const user = await asNewUser();

		await user.t.mutation(api.intake.v2.complete, {
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

		await user.t.mutation(api.intake.v2.complete, {
			displayName: "Wren",
			weighingOn: [],
		});

		expect((await readContext(user)).intake?.weighingOn).toBeUndefined();
	});

	it("on a retry, rewrites its own fields and keeps deferred answers", async () => {
		const user = await asNewUser();
		await user.t.mutation(api.intake.v2.complete, {
			disclosureStyle: "keep_it_brief",
			displayName: "Wren",
			intent: "feel_less_alone",
		});
		await user.t.mutation(api.intake.deferred.record, {
			answer: { ageBracket: "35_44", question: "ageBracket" },
		});

		await user.t.mutation(api.intake.v2.complete, {
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
				user.t.mutation(api.intake.v2.complete, {
					displayName: "Wren",
					weighingOn: ["work", "family", "money", "health"],
				}),
			"too_many_selections"
		);

		expect(await readContext(user)).toMatchObject({
			intake: null,
			onboardingComplete: false,
		});
	});

	it("rejects an empty display name, writing nothing", async () => {
		const user = await asNewUser();

		await expectCode(
			() => user.t.mutation(api.intake.v2.complete, { displayName: "  " }),
			"invalid_display_name"
		);

		expect(await readContext(user)).toMatchObject({
			intake: null,
			onboardingComplete: false,
		});
	});

	it("refuses an unauthenticated caller", async () => {
		const user = await asNewUser();

		await expectCode(
			() => user.root.mutation(api.intake.v2.complete, { displayName: "Wren" }),
			"not_authenticated"
		);
	});
});
