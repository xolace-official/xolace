import { describe, expect, it } from "vitest";
import {
	modeLabel,
	notificationsLabel,
	plusCard,
	signInOf,
	toneLabel,
	type UpdateStatus,
	updateRow,
	versionLabel,
} from "@/features/settings/home/home-model";

const IDLE: UpdateStatus = {
	available: false,
	checking: false,
	downloading: false,
	enabled: true,
	pending: false,
	result: null,
};

describe("row values", () => {
	it("names the mode, the tone and the notifications", () => {
		expect(modeLabel("system")).toBe("System");
		expect(modeLabel("dark")).toBe("Dark");
		expect(toneLabel("gentle")).toBe("Gentle");
		expect(toneLabel(undefined)).toBeUndefined();
		expect(notificationsLabel(true)).toBe("On");
		expect(notificationsLabel(false)).toBe("Off");
		expect(notificationsLabel(undefined)).toBeUndefined();
	});

	it("reads the sign-in from the first provider, else email", () => {
		expect(signInOf(["oauth_apple"])).toBe("apple");
		expect(signInOf(["oauth_google", "oauth_apple"])).toBe("google");
		expect(signInOf([])).toBe("email");
	});
});

describe("plusCard", () => {
	it("free: one line and the button, and a tap opens the paywall", () => {
		expect(plusCard(false, null)).toMatchObject({
			kind: "free",
			opensPaywall: true,
		});
	});

	it("Plus never opens the paywall, loaded or not", () => {
		expect(plusCard(true, { secondsLeft: 60 }).opensPaywall).toBe(false);
		expect(plusCard(true, undefined).opensPaywall).toBe(false);
	});

	it("Plus: minutes left and the bar", () => {
		const card = plusCard(true, { secondsLeft: 12 * 60 + 30 });
		expect(card).toMatchObject({
			fill: (12 * 60 + 30) / (15 * 60),
			kind: "plus",
			line: "12 min of talk left this week",
		});
		expect(card.a11y).toBe(
			"Xolace+, active. 12 minutes of talk left this week. Refills Monday."
		);
	});

	it("Plus while talk time loads: no line, no bar", () => {
		expect(plusCard(true, undefined)).toMatchObject({ fill: null, line: null });
		expect(plusCard(true, undefined).a11y).toBe(
			"Xolace+, active. Refills Monday."
		);
	});

	it("clamps a top-up past the week and a negative balance", () => {
		expect(plusCard(true, { secondsLeft: 20 * 60 })).toMatchObject({ fill: 1 });
		expect(plusCard(true, { secondsLeft: -5 })).toMatchObject({
			fill: 0,
			line: "0 min of talk left this week",
		});
	});
});

describe("updateRow", () => {
	it("is off in dev clients", () => {
		expect(updateRow({ ...IDLE, enabled: false }).value).toBe("Off in dev");
	});

	it("walks checking, available, pending, and the result", () => {
		expect(updateRow(IDLE)).toEqual({ label: "Check for updates", value: "" });
		expect(updateRow({ ...IDLE, checking: true }).value).toBe("Checking…");
		expect(updateRow({ ...IDLE, downloading: true }).value).toBe(
			"Downloading…"
		);
		expect(updateRow({ ...IDLE, available: true }).value).toBe("Available");
		expect(updateRow({ ...IDLE, pending: true })).toEqual({
			label: "Update ready",
			value: "Reopen to apply",
		});
		expect(updateRow({ ...IDLE, result: "up-to-date" }).value).toBe(
			"Up to date"
		);
		expect(updateRow({ ...IDLE, result: "failed" }).value).toBe(
			"Couldn't check"
		);
	});
});

describe("versionLabel", () => {
	it("joins version, update date and a non-production channel", () => {
		expect(
			versionLabel({
				channel: "preview",
				updateDate: "Nov 8, 2026",
				version: "1.16.0",
			})
		).toBe("Version 1.16.0 · Update Nov 8, 2026 · preview");
		expect(
			versionLabel({
				channel: "production",
				updateDate: null,
				version: "1.16.0",
			})
		).toBe("Version 1.16.0");
	});
});
