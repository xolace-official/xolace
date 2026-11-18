import { AccessibilityInfo } from "react-native";
import { describe, expect, it, vi } from "vitest";
import {
	liveOSReduceTransparency,
	subscribeOSReduceTransparency,
} from "./os-reduce-transparency";

const emit = vi.hoisted((): { change?: (value: boolean) => void } => ({}));

vi.mock("react-native", () => ({
	AccessibilityInfo: {
		addEventListener: vi.fn((_: string, handler: (value: boolean) => void) => {
			emit.change = handler;
			return { remove: vi.fn() };
		}),
		isReduceTransparencyEnabled: vi.fn(() => Promise.resolve(true)),
	},
	Platform: { OS: "ios" },
}));

describe("the OS reduce-transparency store", () => {
	it("reads once when the module loads, before anyone subscribes", async () => {
		expect(AccessibilityInfo.isReduceTransparencyEnabled).toHaveBeenCalledTimes(
			1
		);
		await Promise.resolve();
		expect(liveOSReduceTransparency()).toBe(true);
	});

	it("keeps one AccessibilityInfo listener for any number of readers", () => {
		const a = vi.fn();
		const b = vi.fn();
		const stopA = subscribeOSReduceTransparency(a);
		const stopB = subscribeOSReduceTransparency(b);
		expect(AccessibilityInfo.addEventListener).toHaveBeenCalledTimes(1);
		emit.change?.(false);
		expect(liveOSReduceTransparency()).toBe(false);
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
		const stop = subscribeOSReduceTransparency(listener);
		emit.change?.(true);
		expect(listener).not.toHaveBeenCalled();
		stop();
	});
});
