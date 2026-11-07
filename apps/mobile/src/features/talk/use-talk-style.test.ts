import { describe, expect, it } from "vitest";
import { LOOKS, lookOf } from "@/features/talk/companion/companion-look";
import { talkVoiceOf } from "@/features/talk/use-talk-style";

// The backend ships before store review clears, so an old build can read a look or voice
// added after it shipped.
describe("lookOf", () => {
	it("keeps a look this build knows", () => {
		expect(lookOf("moss")).toBe("moss");
	});

	it("shows an unknown or unset look as the default", () => {
		expect(LOOKS[lookOf("aurora")]).toBeDefined();
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
