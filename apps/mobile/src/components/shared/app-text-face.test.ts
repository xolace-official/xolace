import { describe, expect, it } from "vitest";
import { FONTS } from "@/design/type";
import { bodyRole, resolveFace } from "./app-text-face";

describe("AppText faces", () => {
	it("draws the variant's own face when nothing asks for another", () => {
		expect(resolveFace("body", undefined, false, undefined)).toEqual({
			roleClass: undefined,
			style: undefined,
		});
		expect(resolveFace("title", undefined, false, undefined)).toEqual({
			capped: true,
			roleClass: undefined,
			style: undefined,
		});
	});

	it("turns weight and italic into role classes", () => {
		expect(resolveFace("body", "semibold", false, undefined).roleClass).toBe(
			"font-semibold"
		);
		expect(resolveFace("body", undefined, true, undefined).roleClass).toBe(
			"font-italic"
		);
		expect(resolveFace("body", "medium", true, undefined).roleClass).toBe(
			"font-italic-medium"
		);
		expect(resolveFace("tab", "semibold", false, undefined).roleClass).toBe(
			undefined
		);
	});

	it("never passes a numeric fontWeight or fontStyle on: they become roles", () => {
		const face = resolveFace("callout", undefined, false, {
			color: "red",
			fontStyle: "italic",
			fontWeight: "600",
		});
		expect(face.roleClass).toBe("font-italic-medium");
		expect(face.style).toEqual({ color: "red" });
		expect(
			resolveFace("body", undefined, false, { fontWeight: "bold" }).roleClass
		).toBe("font-bold");
		expect(
			resolveFace("body", undefined, false, { fontWeight: "300" }).roleClass
		).toBe(undefined);
	});

	it("maps Default's heading faces in style to the theme's role, capped like headings", () => {
		const face = resolveFace("body", undefined, false, {
			fontFamily: FONTS.displayBold,
			fontSize: 22,
		});
		expect(face).toEqual({
			capped: true,
			roleClass: "font-display-bold",
			style: { fontSize: 22 },
		});
	});

	it("keeps a fixed face in style, without weight or style", () => {
		const face = resolveFace("body", "bold", true, {
			fontFamily: FONTS.mirror,
			fontWeight: "700",
		});
		expect(face).toEqual({ style: { fontFamily: FONTS.mirror } });
		expect(
			resolveFace("callout", undefined, false, { fontFamily: "Poppins-Medium" })
				.style
		).toEqual({ fontFamily: "Poppins-Medium" });
	});

	it("leaves a fixed-face variant's own face alone", () => {
		expect(resolveFace("reader", "bold", false, undefined)).toEqual({
			style: undefined,
		});
		expect(resolveFace("poster", undefined, false, undefined)).toEqual({
			style: undefined,
		});
	});

	it("picks body roles for the variant-less AppText", () => {
		expect(bodyRole(undefined, false)).toBe("normal");
		expect(bodyRole("bold", false)).toBe("bold");
		expect(bodyRole("regular", true)).toBe("italic");
		expect(bodyRole("semibold", true)).toBe("italic-medium");
	});
});
