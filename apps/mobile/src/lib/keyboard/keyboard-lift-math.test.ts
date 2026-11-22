import { describe, expect, it } from "vitest";
import {
	KEYBOARD_GAP,
	keyboardHeight,
	liftBottom,
	MIN_REST,
	restFor,
} from "./keyboard-lift-math";

describe("restFor", () => {
	it("rests on the home indicator's inset, never under 16 pt", () => {
		expect(restFor(34)).toBe(34);
		expect(restFor(0)).toBe(MIN_REST);
	});
});

describe("keyboardHeight", () => {
	it("reads keyboard-controller's negative height as a positive one, 0 when down", () => {
		expect(keyboardHeight(-336)).toBe(336);
		expect(keyboardHeight(0)).toBe(0);
		expect(keyboardHeight(4)).toBe(0);
	});
});

describe("liftBottom", () => {
	const rest = 34;

	it("sits on the safe area with the keyboard down", () => {
		expect(liftBottom(rest, 0)).toBe(rest);
	});

	it("sits exactly 12 pt over the keyboard once it is up", () => {
		expect(liftBottom(rest, 336)).toBe(336 + KEYBOARD_GAP);
	});

	it("never jumps: it leaves the rest only when the keyboard passes it", () => {
		const handoff = rest - KEYBOARD_GAP;
		expect(liftBottom(rest, handoff)).toBe(rest);
		expect(liftBottom(rest, handoff + 1)).toBe(rest + 1);
		let previous = liftBottom(rest, 0);
		for (let kb = 1; kb <= 400; kb += 1) {
			const next = liftBottom(rest, kb);
			expect(next - previous).toBeLessThanOrEqual(1);
			previous = next;
		}
	});
});
