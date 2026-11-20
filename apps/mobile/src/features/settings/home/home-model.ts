import type { PlusStatus } from "@/features/purchases/plus-status";
import { HOME_COPY as C } from "@/features/settings/home/copy";
import { WEEKLY_TALK_S } from "@/lib/talk/talk-time";

export type ThemeMode = "system" | "light" | "dark";

export const modeLabel = (mode: ThemeMode) =>
	({ dark: "Dark", light: "Light", system: "System" })[mode];

export const toneLabel = (tone: string | undefined) =>
	tone ? tone.charAt(0).toUpperCase() + tone.slice(1) : undefined;

export const notificationsLabel = (enabled: boolean | undefined) => {
	if (enabled === undefined) {
		return;
	}
	return enabled ? C.on : C.off;
};

export type SignIn = "apple" | "google" | "email";

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

export type TalkTime = { secondsLeft: number } | null | undefined;

export type PlusCard =
	| { kind: "loading"; a11y: string; opensPaywall: false }
	| { kind: "free"; a11y: string; opensPaywall: true }
	| {
			kind: "plus";
			opensPaywall: false;
			line: string | null;
			fill: number | null;
			a11y: string;
	  };

export function plusCard(plus: PlusStatus, time: TalkTime): PlusCard {
	if (plus === "loading") {
		return { a11y: C.plus.name, kind: "loading", opensPaywall: false };
	}
	if (plus === "free") {
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

export type UpdateStatus = {
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
