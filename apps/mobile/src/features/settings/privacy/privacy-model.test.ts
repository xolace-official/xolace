import { retentionShortens } from "@xolace/backend/shared";
import { describe, expect, it } from "vitest";
import { DELETE_COPY } from "@/features/settings/privacy/copy";
import {
	PAST_1_YEAR,
	PAST_6_MONTHS,
	PAST_CAPPED,
	PRIVACY_6_MONTHS_ALERT,
	PRIVACY_MEMORY_OFF_SHARE_ON,
	PRIVACY_TOP,
} from "@/features/settings/privacy/dev/fixtures";
import {
	askAfterCount,
	deleteSheet,
	deletionAlreadyRequested,
	keepCard,
	memoryOn,
	retentionAlert,
	retentionPick,
	sheetKind,
	shownRetention,
} from "@/features/settings/privacy/privacy-model";

describe("memoryOn", () => {
	it("is on unless turned off, as production reads it", () => {
		expect(memoryOn(undefined)).toBe(true);
		expect(memoryOn(true)).toBe(true);
		expect(memoryOn(false)).toBe(false);
	});
});

describe("retentionPick", () => {
	it("does nothing for the saved choice", () => {
		expect(retentionPick("1_year", "1_year")).toBe("none");
	});

	it("counts first when the period gets shorter", () => {
		expect(retentionShortens("indefinite", "1_year")).toBe(true);
		expect(retentionPick("indefinite", "6_months")).toBe("count");
		expect(retentionPick("1_year", "6_months")).toBe("count");
	});

	it("just saves when the period gets longer: nothing would go", () => {
		expect(retentionPick("6_months", "1_year")).toBe("save");
		expect(retentionPick("1_year", "indefinite")).toBe("save");
	});
});

describe("askAfterCount", () => {
	it("asks only when something would go", () => {
		expect(askAfterCount({ capped: false, count: 0 })).toBe(false);
		expect(askAfterCount(PAST_6_MONTHS)).toBe(true);
		expect(askAfterCount(PAST_CAPPED)).toBe(true);
	});
});

describe("retentionAlert", () => {
	it("says the board's words with the count", () => {
		expect(retentionAlert("6_months", PAST_6_MONTHS)).toEqual({
			body: "17 of your sessions are older than that. They’ll be deleted within a day and can’t be brought back.",
			title: "Delete sessions older than 6 months?",
		});
		expect(retentionAlert("1_year", PAST_1_YEAR).title).toBe(
			"Delete sessions older than a year?"
		);
	});

	it("says more than the cap when the backend stopped counting", () => {
		expect(retentionAlert("6_months", PAST_CAPPED).body).toMatch(
			/^More than 100 of your sessions/
		);
	});
});

describe("keepCard", () => {
	it("follows the choice being asked about while the alert is up", () => {
		const shown = shownRetention(
			PRIVACY_6_MONTHS_ALERT.retention,
			PRIVACY_6_MONTHS_ALERT.pending
		);
		expect(shown).toBe("6_months");
		expect(keepCard({ ...PRIVACY_TOP, retention: shown }).sessions).toBe(
			"Your sessions, for 6 months"
		);
		expect(shownRetention("1_year", null)).toBe("1_year");
	});

	it("follows the switches, in the lines and the spoken label", () => {
		const top = keepCard(PRIVACY_TOP);
		expect(top.memory).toBe("What you write, so Xolace knows you");
		expect(top.share).toBe("Shared with no one unless you say yes");
		const flipped = keepCard(PRIVACY_MEMORY_OFF_SHARE_ON);
		expect(flipped.memory).toBe("From now on, sessions without their words");
		expect(flipped.share).toBe(
			"After a session, “Yes” to sharing is picked for you"
		);
		expect(flipped.a11y).toBe(
			"What Xolace keeps. Your sessions, until you delete them. New sessions kept without their words. Sharing is picked for you after a session. Your voice, and who you write to, are never kept."
		);
	});
});

describe("deletionAlreadyRequested", () => {
	it("an account_inactive refusal means an earlier attempt deleted it", () => {
		expect(deletionAlreadyRequested("account_inactive")).toBe(true);
		expect(deletionAlreadyRequested("unauthenticated")).toBe(false);
		expect(deletionAlreadyRequested(undefined)).toBe(false);
	});
});

describe("deleteSheet", () => {
	it("reads the kind param, falling back to the data sheet", () => {
		expect(sheetKind("account")).toBe("account");
		expect(sheetKind("data")).toBe("data");
		expect(sheetKind(undefined)).toBe("data");
		expect(sheetKind(["account"])).toBe("data");
	});

	it("keeps production's Telegram line on the account sheet", () => {
		expect(deleteSheet("account", "free", "ios").stays).toContain(
			"If you linked Telegram, Xolace deletes the messages it still can, but Telegram keeps the rest of that chat’s history."
		);
	});

	it("adds the billing line on Xolace+ only, in the store's words", () => {
		expect(deleteSheet("account", "plus", "ios").stays.at(-1)).toBe(
			DELETE_COPY.plusBilling.ios
		);
		expect(deleteSheet("account", "plus", "android").stays.at(-1)).toBe(
			DELETE_COPY.plusBilling.android
		);
		expect(deleteSheet("account", "free", "ios").stays).toHaveLength(2);
		expect(deleteSheet("data", "plus", "ios")).toBe(DELETE_COPY.sheets.data);
	});

	it("keeps the billing line while Xolace+ loads, so a Plus user is never told less", () => {
		expect(deleteSheet("account", "loading", "ios").stays.at(-1)).toBe(
			DELETE_COPY.plusBilling.ios
		);
		expect(deleteSheet("data", "loading", "ios")).toBe(DELETE_COPY.sheets.data);
	});
});
