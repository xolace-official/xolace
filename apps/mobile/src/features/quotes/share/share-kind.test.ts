import { describe, expect, it } from "vitest";
import { canShareVideo, loopFileName, shareKindOf } from "./share-kind";

const loop = {
	kind: "loop",
	videoUrl: "https://cdn.test/loops/hearth.mp4",
} as const;
const still = { kind: "still", videoUrl: undefined } as const;

describe("shareKindOf", () => {
	it("makes a video of a loop when asked and the module is built in", () => {
		expect(shareKindOf(loop, "video", true)).toBe("video");
	});
	it("keeps the still when Still is chosen", () => {
		expect(shareKindOf(loop, "still", true)).toBe("still");
	});
	it("keeps the still without the module (Android, an older build)", () => {
		expect(shareKindOf(loop, "video", false)).toBe("still");
		expect(canShareVideo(loop, false)).toBe(false);
	});
	it("keeps the still on a still background", () => {
		expect(shareKindOf(still, "video", true)).toBe("still");
		expect(canShareVideo(still, true)).toBe(false);
	});
	it("keeps the still on a loop with no video", () => {
		expect(
			shareKindOf({ kind: "loop", videoUrl: undefined }, "video", true)
		).toBe("still");
	});
});

describe("loopFileName", () => {
	it("names the file by key and the URL's last segment, without the query", () => {
		expect(loopFileName("hearth", `${loop.videoUrl}?v=2`)).toBe(
			"hearth-hearth.mp4"
		);
	});
	it("ends a bare storage id in .mp4", () => {
		expect(
			loopFileName(
				"rain-window",
				"https://x.convex.cloud/api/storage/e5ff-ad9b"
			)
		).toBe("rain-window-e5ff-ad9b.mp4");
	});
	it("keeps the name to safe characters", () => {
		expect(loopFileName("first light", "https://x/a b%20c.mp4")).toBe(
			"first_light-a_b_20c.mp4"
		);
	});
});
