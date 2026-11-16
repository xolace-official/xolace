import { AccessibilityInfo } from "react-native";
import { describe, expect, it, vi } from "vitest";
import {
	liveOSReducedMotion,
	subscribeOSReducedMotion,
} from "./os-reduced-motion";

const emit: { change?: (value: boolean) => void } = {};

vi.mock("react-native", () => ({
	AccessibilityInfo: {
		addEventListener: vi.fn((_: string, handler: (value: boolean) => void) => {
			emit.change = handler;
			return { remove: vi.fn() };
		}),
		isReduceMotionEnabled: vi.fn(() => Promise.resolve(true)),
	},
	Platform: { OS: "ios" },
}));
vi.mock("react-native-reanimated", () => ({ useReducedMotion: () => false }));

describe("the OS reduce-motion store", () => {
	it("reports null (the launch value) until a read lands, then the live value", async () => {
		expect(liveOSReducedMotion()).toBeNull();
		const listener = vi.fn();
		const stop = subscribeOSReducedMotion(listener);
		await Promise.resolve();
		expect(liveOSReducedMotion()).toBe(true);
		expect(listener).toHaveBeenCalledTimes(1);
		stop();
	});

	it("keeps one AccessibilityInfo listener for any number of readers", () => {
		const a = vi.fn();
		const b = vi.fn();
		const stopA = subscribeOSReducedMotion(a);
		const stopB = subscribeOSReducedMotion(b);
		expect(AccessibilityInfo.addEventListener).toHaveBeenCalledTimes(1);
		emit.change?.(false);
		expect(liveOSReducedMotion()).toBe(false);
		expect(a).toHaveBeenCalledTimes(1);
		expect(b).toHaveBeenCalledTimes(1);
		stopA();
		emit.change?.(true);
		expect(a).toHaveBeenCalledTimes(1);
		expect(b).toHaveBeenCalledTimes(2);
		stopB();
	});

	it("notifies nobody when the value doesn't change", () => {
		const listener = vi.fn();
		const stop = subscribeOSReducedMotion(listener);
		emit.change?.(true);
		expect(listener).not.toHaveBeenCalled();
		stop();
	});
});
