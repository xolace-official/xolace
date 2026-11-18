import type { Id } from "@xolace/backend/dataModel";
import { describe, expect, it } from "vitest";
import { NOW } from "../dev/fixtures";
import { PROFILE_KOJO, PROFILE_MAYA } from "../thread/dev/thread-fixtures";
import { monthYear, profileView, xolacerState } from "./xolacer-model";

const DAY = 86_400_000;
const convo = (
	status: "requested" | "open" | "resting" | "closed",
	extra: { retryAvailableAt?: number; closedReason?: "declined" } = {}
) => ({
	closedReason: extra.closedReason,
	id: "c_1" as Id<"xolacer_conversations">,
	retryAvailableAt: extra.retryAvailableAt,
	status,
});

describe("profileView", () => {
	it("leads with the rating and presence, then since when", () => {
		const v = profileView(PROFILE_MAYA, NOW, "en-US");
		expect(v.ratedLine).toBe("★ 4.9 · 32 conversations rated · here now");
		expect(v.sinceLine).toBe("Xolacer since March");
		expect(v.tags).toEqual(["Anxiety", "Sleep", "Studies"]);
		expect(v.nameA11y).toBe("Maya, here now");
	});

	it("calls someone under the rating threshold new", () => {
		expect(profileView(PROFILE_KOJO, NOW).ratedLine).toBe(
			"New Xolacer · replies within a day"
		);
	});

	it("asks to talk when they're free", () => {
		expect(profileView(PROFILE_MAYA, NOW).cta).toMatchObject({
			kind: "ask",
			label: "Ask to talk",
		});
	});

	it("opens the chat, or the request, once there is one", () => {
		const open = { ...PROFILE_MAYA, conversation: convo("resting") };
		expect(profileView(open, NOW).cta).toMatchObject({
			kind: "open",
			label: "Open chat",
		});
		expect(profileView(open, NOW).note?.title).toBe("You've talked before");
		const asked = { ...PROFILE_MAYA, conversation: convo("requested") };
		expect(profileView(asked, NOW).cta).toMatchObject({
			label: "See your request",
		});
	});

	it("names a cooldown after a decline, before availability", () => {
		const declined = {
			...PROFILE_MAYA,
			available: false,
			conversation: convo("closed", {
				closedReason: "declined",
				retryAvailableAt: NOW + 2 * DAY,
			}),
		};
		const v = profileView(declined, NOW);
		expect(v.cta.kind).toBe("cooldown");
		expect(v.cta.kind === "cooldown" && v.cta.note).toContain("in 2 days");
		// The CTA already says why; a second "not right now" note would read as a second no.
		expect(v.note).toBeNull();
	});

	it("ignores a cooldown that's already over", () => {
		const past = {
			...PROFILE_MAYA,
			conversation: convo("closed", { retryAvailableAt: NOW - DAY }),
		};
		expect(profileView(past, NOW).cta.kind).toBe("ask");
	});

	it("says when they're not taking conversations", () => {
		const full = { ...PROFILE_MAYA, available: false };
		const v = profileView(full, NOW);
		expect(v.cta.kind).toBe("unavailable");
		expect(v.note?.title).toBe("Not right now");
	});

	it("shows your own profile as others see it", () => {
		expect(profileView({ ...PROFILE_MAYA, isSelf: true }, NOW).cta.kind).toBe(
			"self"
		);
	});

	it("offers rating, then a quiet line once rated", () => {
		const rateable = { ...PROFILE_MAYA, canRate: true };
		expect(profileView(rateable, NOW).rate).toEqual({ kind: "prompt" });
		expect(profileView({ ...rateable, myRating: 5 }, NOW).rate).toEqual({
			kind: "rated",
			stars: 5,
		});
		expect(profileView(PROFILE_MAYA, NOW).rate.kind).toBe("hidden");
	});
});

describe("monthYear", () => {
	it("adds the year once it isn't this one", () => {
		expect(monthYear(new Date(2025, 8, 1).getTime(), NOW, "en-US")).toBe(
			"September 2025"
		);
		expect(monthYear(new Date(2025, 8, 1).getTime(), NOW, "fr-FR")).toBe(
			"septembre 2025"
		);
	});
});

describe("xolacerState", () => {
	const base = {
		blocking: { open: false, pending: false },
		locale: "en-US",
		now: NOW,
		primer: null,
		sending: false,
		specialty: undefined,
	};
	const withConvo = (conversation: ReturnType<typeof convo>) => ({
		...PROFILE_MAYA,
		conversation,
	});

	it("loads, then says the profile is gone", () => {
		expect(xolacerState({ ...base, profile: undefined })).toEqual({
			phase: "loading",
		});
		expect(xolacerState({ ...base, profile: null })).toEqual({ phase: "gone" });
	});

	// The dev state `xolacer-talked`: a resting conversation. The block dialog says messages
	// stay, as the app's does.
	it("says messages stay once the two of you have spoken", () => {
		const s = xolacerState({ ...base, profile: withConvo(convo("resting")) });
		expect(s.phase === "ready" && s.blocking.history).toBe(true);
		expect(s.phase === "ready" && s.menu?.canBlock).toBe(true);
	});

	it("has no history for a request, a decline or no conversation", () => {
		for (const profile of [
			withConvo(convo("requested")),
			withConvo(convo("closed", { closedReason: "declined" })),
			PROFILE_MAYA,
		]) {
			const s = xolacerState({ ...base, profile });
			expect(s.phase === "ready" && s.blocking.history).toBe(false);
		}
	});

	it("offers no menu on your own profile, and Block only with a conversation", () => {
		const self = xolacerState({
			...base,
			profile: { ...PROFILE_MAYA, isSelf: true },
		});
		expect(self.phase === "ready" && self.menu).toBeNull();
		const none = xolacerState({ ...base, profile: PROFILE_MAYA });
		expect(none.phase === "ready" && none.menu?.canBlock).toBe(false);
	});

	it("names who else listens only for a known specialty", () => {
		const anxiety = xolacerState({
			...base,
			profile: PROFILE_MAYA,
			specialty: "anxiety",
		});
		expect(anxiety.phase === "ready" && anxiety.others).toBe(
			"anxiety and overthinking"
		);
		const unknown = xolacerState({
			...base,
			profile: PROFILE_MAYA,
			specialty: "astrology",
		});
		expect(unknown.phase === "ready" && unknown.others).toBeNull();
	});

	it("writes the page in the given locale", () => {
		const s = xolacerState({ ...base, locale: "fr-FR", profile: PROFILE_MAYA });
		expect(s.phase === "ready" && s.view.sinceLine).toBe(
			`Xolacer since ${monthYear(PROFILE_MAYA.xolacerSince, NOW, "fr-FR")}`
		);
	});
});
