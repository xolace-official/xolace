import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
	LINK_DISCLOSURE,
	TELEGRAM_OUTREACH_CONSENT_VERSION,
} from "./link-consent";

vi.mock("expo-localization", () => ({ getLocales: () => [] }));

const pin = (copy: unknown) =>
	createHash("sha256").update(JSON.stringify(copy)).digest("hex").slice(0, 16);

const PINNED: Record<string, string> = {
	"1.0": "0b0406ccd8abf899",
};

describe("TELEGRAM_OUTREACH_CONSENT_VERSION", () => {
	it("names the exact disclosure recorded as the telegram_outreach consent", () => {
		expect(
			pin(LINK_DISCLOSURE),
			"LINK_DISCLOSURE changed: bump TELEGRAM_OUTREACH_CONSENT_VERSION and pin the new text under the new version."
		).toBe(PINNED[TELEGRAM_OUTREACH_CONSENT_VERSION]);
	});
});
