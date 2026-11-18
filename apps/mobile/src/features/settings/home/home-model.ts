/** Settings' main screen: what each row and the Plus card say. Pure. */
import { HOME_COPY as C } from "@/features/settings/home/copy";
import { WEEKLY_TALK_S } from "@/lib/talk/talk-time";

export type ThemeMode = "system" | "light" | "dark";

export const modeLabel = (mode: ThemeMode) =>
	({ dark: "Dark", light: "Light", system: "System" })[mode];

/** The mirror tone as its name ("Gentle"); nothing while preferences load. */
export const toneLabel = (tone: string | undefined) =>
	tone ? tone.charAt(0).toUpperCase() + tone.slice(1) : undefined;

/** On while either family (reminders, chat) wants delivery: production's master flag. */
export const notificationsLabel = (enabled: boolean | undefined) => {
	if (enabled === undefined) {
		return;
	}
	return enabled ? C.on : C.off;
};

export type SignIn = "apple" | "google" | "email";

/** The first linked provider decides it; no provider means email. */
export function signInOf(providers: readonly string[]): SignIn {
	const provider = (providers[0] ?? "").toLowerCase();
	if (provider.includes("apple")) {
		return "apple";
	}
	if (provider.includes("google")) {
		return "google";
	}
	return "email";
}

/** `talk.time.left`: null off Plus, undefined while it loads. */
export type TalkTime = { secondsLeft: number } | null | undefined;

/**
 * Free: the card opens the paywall. Plus: it only shows talk time, as production's Plus row
 * did, so a subscriber's tap can't count as a paywall open that can never convert.
 */
export type PlusCard =
	| { kind: "free"; a11y: string; opensPaywall: true }
	| {
			kind: "plus";
			opensPaywall: false;
			/** "12 min of talk left this week"; null until talk time loads. */
			line: string | null;
			/** The bar, 0–1; null until talk time loads. */
			fill: number | null;
			a11y: string;
	  };

export function plusCard(isPlus: boolean, time: TalkTime): PlusCard {
	if (!isPlus) {
		return { a11y: C.plus.a11yFree, kind: "free", opensPaywall: true };
	}
	if (!time) {
		return {
			a11y: C.plus.a11yPlus(null),
			fill: null,
			kind: "plus",
			line: null,
			opensPaywall: false,
		};
	}
	const seconds = Math.max(0, Math.min(time.secondsLeft, WEEKLY_TALK_S));
	const minutes = Math.floor(seconds / 60);
	return {
		a11y: C.plus.a11yPlus(C.plus.leftSpoken(minutes)),
		fill: seconds / WEEKLY_TALK_S,
		kind: "plus",
		line: C.plus.left(minutes),
		opensPaywall: false,
	};
}

/** Where the manual update check stands (expo-updates, plus this screen's last result). */
export type UpdateStatus = {
	/** False in dev clients, which load JS from Metro. */
	enabled: boolean;
	checking: boolean;
	downloading: boolean;
	available: boolean;
	pending: boolean;
	result: "up-to-date" | "failed" | null;
};

export function updateRow(s: UpdateStatus): { label: string; value: string } {
	const label = s.pending ? C.rows.updateReady : C.rows.updates;
	if (!s.enabled) {
		return { label, value: C.offInDev };
	}
	if (s.checking) {
		return { label, value: C.checking };
	}
	if (s.downloading) {
		return { label, value: C.downloading };
	}
	if (s.pending) {
		return { label, value: C.reopen };
	}
	if (s.available) {
		return { label, value: C.updateAvailable };
	}
	if (s.result === "up-to-date") {
		return { label, value: C.upToDate };
	}
	return { label, value: s.result === "failed" ? C.couldNotCheck : "" };
}

/** "Version 1.16.0 · Update Nov 8, 2026 · preview"; the channel is left out on production. */
export const versionLabel = (v: {
	version: string | undefined;
	updateDate: string | null;
	channel: string | null;
}) =>
	[
		v.version && C.version(v.version),
		v.updateDate && C.versionUpdate(v.updateDate),
		v.channel !== "production" && v.channel,
	]
		.filter(Boolean)
		.join(" · ");
