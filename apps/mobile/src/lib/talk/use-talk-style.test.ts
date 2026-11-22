import { describe, expect, it } from "vitest";
import { lookOf, TALK_LOOKS } from "@/lib/talk/talk-looks";
import { talkVoiceOf } from "@/lib/talk/use-talk-style";

describe("lookOf", () => {
	it("keeps a look this build knows", () => {
		expect(lookOf("moss")).toBe("moss");
	});

	it("shows an unknown or unset look as the default", () => {
		expect(TALK_LOOKS).toContain(lookOf("aurora"));
		expect(lookOf("aurora")).toBe("xolace");
		expect(lookOf("toString")).toBe("xolace");
		expect(lookOf(undefined)).toBe("xolace");
	});
});

describe("talkVoiceOf", () => {
	it("prefers the talk voice, then the mirror voice", () => {
		expect(talkVoiceOf("wren", "ash")).toBe("wren");
		expect(talkVoiceOf(undefined, "ash")).toBe("ash");
		expect(talkVoiceOf(undefined, undefined)).toBe("vesper");
	});

	it("skips a voice this build doesn't know", () => {
		expect(talkVoiceOf("juniper", "ash")).toBe("ash");
		expect(talkVoiceOf("juniper", "juniper")).toBe("vesper");
	});
});
