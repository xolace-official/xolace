import { describe, expect, it } from "vitest";
import { COPY } from "../copy";
import { STATE, UNLOCK, UPSELL, XOLACER } from "../dev/fixtures";
import { nextLabel, nextText } from "./next-text";

const NAMES = { family: "Family", work: "Work & Studies" } as const;
const partName = (d: string) => NAMES[d as keyof typeof NAMES] ?? d;

describe("nextText", () => {
	it("gives both letter cards their own title and sub", () => {
		expect(nextText("letterRead", STATE.cards, partName)).toEqual(
			COPY.next.letterRead
		);
		expect(nextText("letterWrite", STATE.cards, partName)).toEqual(
			COPY.next.letterWrite
		);
		expect(COPY.next.letterRead.title).not.toBe(COPY.next.letterWrite.title);
	});

	it("names the listener and reads their standing to VoiceOver", () => {
		const text = nextText("listener", XOLACER.cards, partName);
		expect(text?.title).toBe("Maya listens to anxiety");
		expect(nextLabel("listener", XOLACER.cards, text)).toBe(
			"Maya listens to anxiety. Rated 4.9, Here now. A trained peer, not a therapist. Nothing is sent: this only opens their profile."
		);
	});

	it("names the part of life in focus, or the heavier one", () => {
		expect(nextText("unlock", UNLOCK.cards, partName)?.title).toBe(
			"Family is coming into focus"
		);
		expect(
			nextText(
				"unlock",
				{ ...UNLOCK.cards, unlock: ["work", "family"] },
				partName
			)?.title
		).toBe("Work & Studies and Family are coming into focus");
		expect(nextText("upsell", UPSELL.cards, partName)).toEqual({
			sub: "See the pattern, with Xolace+",
			title: "Work & Studies has been heavier lately than your usual",
		});
	});

	it("has no words for an insights card without its part", () => {
		expect(nextText("unlock", STATE.cards, partName)).toBeNull();
		expect(nextText("upsell", STATE.cards, partName)).toBeNull();
	});
});
