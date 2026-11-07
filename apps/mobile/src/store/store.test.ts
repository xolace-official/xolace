import { describe, expect, it } from "vitest";
import {
	REFLECT_TOUR_VERSION,
	shouldShowReflectTour,
} from "@/features/reflect-tour/tour-copy";
import { hasAccountFlag } from "./account-flags-slice";
import { useAppStore } from "./store";

type State = ReturnType<typeof useAppStore.getState>;
const persistedKeys = () =>
	Object.keys(
		(
			useAppStore as unknown as {
				persist: { getOptions: () => { partialize: (s: State) => object } };
			}
		).persist
			.getOptions()
			.partialize(useAppStore.getState())
	);

describe("store partialize", () => {
	it("bridgeIntroSeen is persisted", () => {
		const persisted = persistedKeys();
		expect(persisted).toContain("bridgeIntroSeen");
	});

	it("the intake arm is persisted, the in-flight answers aren't", () => {
		const persisted = persistedKeys();
		expect(persisted).toContain("intakeArms");
		expect(persisted).not.toContain("intakeAnswers");
	});

	it("dictationUpsellSeen is persisted", () => {
		expect(persistedKeys()).toContain("dictationUpsellSeen");
	});

	it("ventIntroSeen is persisted", () => {
		const persisted = persistedKeys();
		expect(persisted).toContain("ventIntroSeen");
	});

	it("xolacerPrimerSeen is persisted", () => {
		const persisted = persistedKeys();
		expect(persisted).toContain("xolacerPrimerSeen");
	});

	it("musicIntroSeen is persisted", () => {
		const persisted = persistedKeys();
		expect(persisted).toContain("musicIntroSeen");
	});

	it("supportAudioIntroSeen is persisted", () => {
		const persisted = persistedKeys();
		expect(persisted).toContain("supportAudioIntroSeen");
	});

	it("libraryIntroSeen is persisted", () => {
		const persisted = persistedKeys();
		expect(persisted).toContain("libraryIntroSeen");
	});

	// Resolved-once must survive a relaunch, or the bubble reappears (#460).
	it("starterSuggestionsSeen is persisted", () => {
		const persisted = persistedKeys();
		expect(persisted).toContain("starterSuggestionsSeen");
	});

	// The whole point of the cooldown is that a "no" survives a relaunch.
	it("plus offer cadence state is persisted", () => {
		const persisted = persistedKeys();
		expect(persisted).toContain("plusOfferLastDismissedAt");
		expect(persisted).toContain("plusOfferDismissalCount");
		expect(persisted).toContain("plusOfferFullStopAt");
		// "Never two sessions in a row" is only enforceable if the id survives a
		// relaunch — the app is routinely closed between one session and the next.
		expect(persisted).toContain("plusOfferShownSessionId");
	});

	// A cold kill mid-intake must restart at the founder message with nothing
	// half-answered (T6, issue #263).
	it("intake answers are NOT persisted", () => {
		const persisted = persistedKeys();
		expect(persisted).not.toContain("intakeAnswers");
	});
});

describe("account flags", () => {
	const noFlags = {
		accountFlags: {},
		copingAskSeen: false,
		findingCardDismissed: false,
		notifNudgeDismissed: false,
		starterSuggestionsSeen: false,
	};
	const has = (owner: string, flag: Parameters<typeof hasAccountFlag>[2]) =>
		hasAccountFlag(useAppStore.getState(), owner, flag);

	it("one account's flag doesn't silence a second account on the device", () => {
		useAppStore.setState(noFlags);
		useAppStore.getState().markAccountFlag("user_a", "copingAskSeen");
		useAppStore.getState().markAccountFlag("user_a", "starterSuggestionsSeen");

		expect(has("user_a", "copingAskSeen")).toBe(true);
		expect(has("user_a", "starterSuggestionsSeen")).toBe(true);
		expect(has("user_b", "copingAskSeen")).toBe(false);
		expect(has("user_b", "starterSuggestionsSeen")).toBe(false);
	});

	it("a device-wide mark from before the update stands in until it's claimed", () => {
		useAppStore.setState({ ...noFlags, notifNudgeDismissed: true });
		expect(has("user_a", "notifNudgeDismissed")).toBe(true);
	});

	it("the first account signed in claims the old marks, freeing later accounts", () => {
		useAppStore.setState({
			...noFlags,
			findingCardDismissed: true,
			starterSuggestionsSeen: true,
		});
		const { claimLegacyAccountFlags } = useAppStore.getState();
		claimLegacyAccountFlags("user_a");
		claimLegacyAccountFlags("user_b");

		expect(has("user_a", "findingCardDismissed")).toBe(true);
		expect(has("user_a", "starterSuggestionsSeen")).toBe(true);
		expect(has("user_a", "copingAskSeen")).toBe(false);
		expect(has("user_b", "findingCardDismissed")).toBe(false);
		expect(has("user_b", "starterSuggestionsSeen")).toBe(false);
	});

	it("claiming keeps what the account already had", () => {
		useAppStore.setState({
			...noFlags,
			accountFlags: { user_a: ["copingAskSeen"] },
			notifNudgeDismissed: true,
		});
		useAppStore.getState().claimLegacyAccountFlags("user_a");
		expect(useAppStore.getState().accountFlags.user_a).toEqual([
			"copingAskSeen",
			"notifNudgeDismissed",
		]);
	});

	it("clearing is scoped to one account, and to the named flags", () => {
		useAppStore.setState({
			...noFlags,
			accountFlags: {
				user_a: ["copingAskSeen", "notifNudgeDismissed"],
				user_b: ["copingAskSeen"],
			},
		});
		const { clearAccountFlags } = useAppStore.getState();

		clearAccountFlags("user_a", ["copingAskSeen"]);
		expect(has("user_a", "copingAskSeen")).toBe(false);
		expect(has("user_a", "notifNudgeDismissed")).toBe(true);

		clearAccountFlags("user_a");
		expect(has("user_a", "notifNudgeDismissed")).toBe(false);
		expect(has("user_b", "copingAskSeen")).toBe(true);
	});

	// Unclaimed old marks have to survive too: the update can land while signed out.
	it("flags and unclaimed old marks are persisted", () => {
		expect(persistedKeys()).toEqual(
			expect.arrayContaining([
				"accountFlags",
				"copingAskSeen",
				"findingCardDismissed",
				"notifNudgeDismissed",
				"starterSuggestionsSeen",
			])
		);
	});
});

describe("reflect tour version", () => {
	it("defaults to 0, so a device that never finished a tour sees the current one", () => {
		expect(useAppStore.getState().reflectTourVersion).toBe(0);
		expect(shouldShowReflectTour(0)).toBe(true);
	});

	it("does not re-show the tour to a device already at the current version", () => {
		expect(shouldShowReflectTour(REFLECT_TOUR_VERSION)).toBe(false);
	});

	it("is persisted, so a finished tour stays finished across relaunches", () => {
		const persisted = persistedKeys();
		expect(persisted).toContain("reflectTourVersion");
	});
});

describe("recordPlusOfferDismissal", () => {
	it("stamps the surface and opens the full stop on the third dismissal", () => {
		useAppStore.setState({
			plusOfferDismissalCount: 0,
			plusOfferFullStopAt: null,
			plusOfferLastDismissedAt: {},
		});
		const { recordPlusOfferDismissal } = useAppStore.getState();

		recordPlusOfferDismissal("session_close");
		expect(
			useAppStore.getState().plusOfferLastDismissedAt.session_close
		).toBeTypeOf("number");
		expect(useAppStore.getState().plusOfferFullStopAt).toBeNull();

		recordPlusOfferDismissal("mirror_landed");
		recordPlusOfferDismissal("profile_insight");
		expect(useAppStore.getState().plusOfferDismissalCount).toBe(3);
		expect(useAppStore.getState().plusOfferFullStopAt).toBeTypeOf("number");
	});

	it("starts the count over once a full stop has run its course", () => {
		useAppStore.setState({
			plusOfferDismissalCount: 3,
			plusOfferFullStopAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
			plusOfferLastDismissedAt: {},
		});
		useAppStore.getState().recordPlusOfferDismissal("session_close");
		expect(useAppStore.getState().plusOfferDismissalCount).toBe(1);
		expect(useAppStore.getState().plusOfferFullStopAt).toBeNull();
	});
});
