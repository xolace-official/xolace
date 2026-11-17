import { describe, expect, it } from "vitest";
import { formatOf } from "./formats";

describe("formatOf", () => {
	it("knows MP3 and WAV by the extension, and nothing else", () => {
		expect(formatOf("support/grounding/0b8f.mp3")).toBe("mp3");
		expect(formatOf("Rain at Night.WAV")).toBe("wav");
		expect(formatOf("support/grounding/0b8f.m4a")).toBeNull();
		expect(formatOf("support/grounding")).toBeNull();
	});
});
