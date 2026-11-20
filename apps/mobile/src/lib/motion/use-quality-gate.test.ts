import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@/lib/test/mount-hook";
import { useQualityGate } from "./use-quality-gate";

type Frame = { timestamp: number; timeSincePreviousFrame: number | null };

const gate = vi.hoisted(() => ({
	active: false,
	callback: null as ((frame: Frame) => void) | null,
}));

vi.mock("react-native-reanimated", async () => {
	const react = await import("react");
	return {
		useFrameCallback: (callback: (frame: Frame) => void) => {
			gate.callback = callback;
			const [handle] = react.useState(() => ({
				setActive: (on: boolean) => {
					gate.active = on;
				},
			}));
			return handle;
		},
		useSharedValue: <T>(initial: T) => {
			const [value] = react.useState(() => {
				let current = initial;
				return {
					get: () => current,
					set: (next: T) => {
						current = next;
					},
				};
			});
			return value;
		},
	};
});

vi.mock("react-native-worklets", async () => {
	const react = await import("react");
	return {
		scheduleOnRN: <A extends unknown[]>(fn: (...args: A) => void, ...args: A) =>
			react.act(() => fn(...args)),
	};
});

const SMOOTH_MS = 16;
const SLOW_MS = 50;

let now = 0;
function frames(count: number, dt: number) {
	for (let i = 0; i < count; i += 1) {
		now += dt;
		if (gate.active) {
			gate.callback?.({ timeSincePreviousFrame: dt, timestamp: now });
		}
	}
}

describe("useQualityGate", () => {
	beforeEach(() => {
		gate.active = false;
		gate.callback = null;
		now = 0;
	});

	it("calls a slow device low", () => {
		const hook = renderHook<boolean, boolean>(
			(run) => useQualityGate(run),
			true
		);
		frames(6, SMOOTH_MS);
		frames(60, SLOW_MS);
		expect(hook.result()).toBe(true);
		hook.unmount();
	});

	it("keeps measuring when run goes false part-way", () => {
		const hook = renderHook<boolean, boolean>(
			(run) => useQualityGate(run),
			true
		);
		frames(6, SMOOTH_MS);
		frames(10, SLOW_MS);
		hook.rerender(false);
		frames(60, SLOW_MS);
		expect(hook.result()).toBe(true);
		hook.unmount();
	});

	it("never starts while run stays false", () => {
		const hook = renderHook<boolean, boolean>(
			(run) => useQualityGate(run),
			false
		);
		expect(gate.active).toBe(false);
		hook.unmount();
	});

	it("stops on unmount", () => {
		const hook = renderHook<boolean, boolean>(
			(run) => useQualityGate(run),
			true
		);
		expect(gate.active).toBe(true);
		hook.unmount();
		expect(gate.active).toBe(false);
	});
});
