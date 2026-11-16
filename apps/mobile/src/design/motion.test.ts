import { describe, expect, it, vi } from "vitest";
import { breathPeriod, loopScale } from "./motion";

vi.mock("react-native-reanimated", () => import("./testing/reanimated-stub"));
vi.mock("@/context/session-mode-context", () => ({ useSessionMode: vi.fn() }));

describe("loop timing for the hour", () => {
	it("night slows every loop by 1.4×", () => {
		expect(loopScale(false)).toBe(1);
		expect(loopScale(true)).toBe(1.4);
	});

	it("a breath is 4.8 s by day and 6.7 s at night", () => {
		expect(breathPeriod(false)).toBe(4800);
		expect(breathPeriod(true)).toBe(6700);
	});
});
