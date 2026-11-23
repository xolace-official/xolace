import { describe, expect, it } from "vitest";
import { splitSurfaceStyle } from "./glass-button-style";

describe("splitSurfaceStyle", () => {
	it("keeps size, placement and opacity on the pressable", () => {
		const { outer, surface } = splitSurfaceStyle({
			alignSelf: "center",
			flex: 1,
			height: 56,
			marginTop: 12,
			opacity: 0.4,
		});
		expect(outer).toEqual({
			alignSelf: "center",
			flex: 1,
			height: 56,
			marginTop: 12,
			opacity: 0.4,
		});
		expect(surface).toEqual({});
	});

	it("moves padding, alignment, gap, corners and clipping onto the glass", () => {
		const { outer, surface } = splitSurfaceStyle({
			alignItems: "center",
			borderCurve: "continuous",
			borderRadius: 28,
			borderTopLeftRadius: 28,
			flexDirection: "row",
			gap: 6,
			justifyContent: "center",
			overflow: "hidden",
			paddingHorizontal: 16,
			paddingLeft: 10,
		});
		expect(outer).toEqual({});
		expect(Object.keys(surface)).toHaveLength(10);
	});

	it("takes no style", () => {
		expect(splitSurfaceStyle(undefined)).toEqual({ outer: {}, surface: {} });
	});
});
