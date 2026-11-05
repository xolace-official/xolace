/**
 * Intake fixtures shared by the v1 and v2 intake tests. The `.helpers.ts`
 * suffix keeps it out of a deploy (see `test/harness.helpers.ts`).
 */
import type { FunctionArgs } from "convex/server";
import { api } from "../_generated/api";
import type { SeededUser } from "../test/harness.helpers";
import { asNewUser } from "../test/harness.helpers";

/** A full v1 answer set, as shipped builds send it to `intake.complete`. */
export const V1_ANSWERS: FunctionArgs<typeof api.intake.complete> = {
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

/** What a client reads back: the intake row, name and gate from the app-open query. */
export const readContext = async (user: SeededUser) => {
	const context = await user.t.query(api.users.getFullContext, {});
	return {
		displayName: context?.preferences?.displayName,
		intake: context?.intake,
		onboardingComplete: context?.profile.onboardingComplete,
	};
};

/** A user who finished a v2 intake with only an intent. */
export const asV2User = async () => {
	const user = await asNewUser();
	await user.t.mutation(api.intake.v2.complete, {
		displayName: "Wren",
		intent: "feel_less_alone",
	});
	return user;
};
