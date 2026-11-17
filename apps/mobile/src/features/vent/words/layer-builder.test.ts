import { describe, expect, it, vi } from "vitest";
import { layerBuilder } from "./layer-builder";

const LAYOUT = { lines: 2 };

describe("layerBuilder", () => {
	it("draws with the body face when it loaded before the layout", () => {
		const build = vi.fn();
		const b = layerBuilder(build);
		b.faceLoaded("Figtree");
		b.laidOut(LAYOUT);
		expect(build.mock.calls).toEqual([[LAYOUT, "Figtree"]]);
	});

	it("waits for the layout, and doesn't draw again for the same face", () => {
		const build = vi.fn();
		const b = layerBuilder(build);
		b.faceLoaded("Figtree");
		expect(build).not.toHaveBeenCalled();
		b.laidOut(LAYOUT);
		b.faceLoaded("Figtree");
		expect(build).toHaveBeenCalledOnce();
	});

	it("draws again with the body face when it arrives after the layout", () => {
		const build = vi.fn();
		const b = layerBuilder(build);
		b.laidOut(LAYOUT);
		b.faceLoaded("Figtree");
		expect(build.mock.calls).toEqual([
			[LAYOUT, null],
			[LAYOUT, "Figtree"],
		]);
	});

	it("leaves the image alone once the words have started to burn", () => {
		const build = vi.fn();
		const b = layerBuilder(build);
		b.laidOut(LAYOUT);
		b.burning();
		b.faceLoaded("Figtree");
		expect(build).toHaveBeenCalledOnce();
	});
});
