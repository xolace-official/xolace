import { BRIDGE_NAME_MAX_CHARS } from "@xolace/backend/shared";
import { describe, expect, it } from "vitest";
import {
	ADDRESS_TERMS,
	canWrite,
	charactersLeft,
	failedStatus,
	noticeOf,
	quotaHintOf,
	recipientOf,
} from "@/features/care/bridge/bridge-model";
import { COPY } from "@/features/care/bridge/copy";
import {
	FREE_ONE_LEFT,
	FREE_OUT,
	LONG_NAME,
	PLUS_OUT,
	PLUS_SPARE,
} from "@/features/care/bridge/dev/fixtures";

describe("who it's for", () => {
	it("needs a name that isn't blank", () => {
		expect(canWrite("")).toBe(false);
		expect(canWrite("   ")).toBe(false);
		expect(canWrite("Mum")).toBe(true);
	});

	it("calls a blank name them", () => {
		expect(recipientOf("  ")).toBe(COPY.loading.them);
		expect(recipientOf(" Mum ")).toBe("Mum");
	});

	it("shows the characters left only near the cap", () => {
		expect(charactersLeft("Mum", BRIDGE_NAME_MAX_CHARS)).toBeNull();
		expect(charactersLeft(LONG_NAME, BRIDGE_NAME_MAX_CHARS)).toBe(
			BRIDGE_NAME_MAX_CHARS - LONG_NAME.length
		);
		expect(
			charactersLeft("x".repeat(BRIDGE_NAME_MAX_CHARS), BRIDGE_NAME_MAX_CHARS)
		).toBe(0);
	});

	it("suggests no address terms for a friend", () => {
		expect(ADDRESS_TERMS.friend).toEqual([]);
		expect(ADDRESS_TERMS.parent).toContain("Mum");
	});
});

describe("a failed draft", () => {
	it("is out of drafts on the rate-limit code, else an error", () => {
		expect(failedStatus("bridge_rate_limited")).toBe("rate_limited");
		expect(failedStatus(undefined)).toBe("error");
		expect(failedStatus("other")).toBe("error");
	});

	it("says why the template stands in", () => {
		expect(noticeOf("rate_limited")?.text).toBe(COPY.draft.rateLimited);
		expect(noticeOf("error")?.text).toBe(COPY.draft.error);
		expect(noticeOf("success")).toBeNull();
		expect(noticeOf("loading")).toBeNull();
	});
});

describe("quotaHintOf", () => {
	it("is silent while loading and for Plus with drafts left", () => {
		expect(quotaHintOf(undefined)).toBeNull();
		expect(quotaHintOf(PLUS_SPARE)).toBeNull();
	});

	it("tells Plus when every draft is used, with no offer", () => {
		expect(quotaHintOf(PLUS_OUT)).toEqual({
			plus: null,
			text: COPY.quota.plusOut,
		});
	});

	it("counts a free user's drafts and offers Xolace+", () => {
		expect(quotaHintOf(FREE_ONE_LEFT)).toEqual({
			plus: { label: COPY.quota.plusLabel(10), text: COPY.quota.plus(10) },
			text: COPY.quota.freeLeft(1),
		});
		expect(quotaHintOf(FREE_OUT)?.text).toBe(COPY.quota.freeOut);
	});
});

describe("the draft's title", () => {
	it("ends with one full stop, even after a name that has one", () => {
		expect(COPY.draft.title("Mum")).toBe("A message for Mum.");
		expect(COPY.draft.title("Mr. Ade.")).toBe("A message for Mr. Ade.");
	});
});
