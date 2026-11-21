import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@/lib/test/mount-hook";
import { ROLL_AFTER_MS, SETTLE_MS, useStreakIgnite } from "./use-streak-ignite";

vi.mock("react", async (original) => {
	const { withEffectEventShim } = await import("@/lib/test/effect-event-shim");
	return withEffectEventShim(await original<typeof import("react")>());
});

type Props = { igniteKey: number; count: number; focused: boolean };

const PLAYED_MS = SETTLE_MS + ROLL_AFTER_MS;

function wait(ms: number) {
	act(() => {
		vi.advanceTimersByTime(ms);
	});
}

function chip(start: Props) {
	const play = vi.fn();
	const hook = renderHook((p: Props) => useStreakIgnite({ ...p, play }), start);
	return { hook, play };
}

describe("useStreakIgnite", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("plays a new ignite once, then rolls the count", () => {
		const { hook, play } = chip({ count: 4, focused: true, igniteKey: 0 });
		hook.rerender({ count: 5, focused: true, igniteKey: 1 });
		expect(hook.result()).toBe(4);
		wait(PLAYED_MS);
		expect(play).toHaveBeenCalledTimes(1);
		expect(hook.result()).toBe(5);
		hook.unmount();
	});

	it("still plays after leaving the screen before it settled", () => {
		const { hook, play } = chip({ count: 4, focused: true, igniteKey: 0 });
		hook.rerender({ count: 5, focused: true, igniteKey: 1 });
		wait(SETTLE_MS - 1);
		hook.rerender({ count: 5, focused: false, igniteKey: 1 });
		wait(PLAYED_MS);
		expect(play).not.toHaveBeenCalled();
		hook.rerender({ count: 5, focused: true, igniteKey: 1 });
		wait(PLAYED_MS);
		expect(play).toHaveBeenCalledTimes(1);
		expect(hook.result()).toBe(5);
		hook.unmount();
	});

	it("does not replay once played, but keeps the count current", () => {
		const { hook, play } = chip({ count: 4, focused: true, igniteKey: 0 });
		hook.rerender({ count: 5, focused: true, igniteKey: 1 });
		wait(SETTLE_MS);
		hook.rerender({ count: 5, focused: false, igniteKey: 1 });
		hook.rerender({ count: 5, focused: true, igniteKey: 1 });
		wait(PLAYED_MS);
		expect(play).toHaveBeenCalledTimes(1);
		expect(hook.result()).toBe(5);
		hook.unmount();
	});

	it("waits for focus before it plays", () => {
		const { hook, play } = chip({ count: 4, focused: false, igniteKey: 0 });
		hook.rerender({ count: 5, focused: false, igniteKey: 1 });
		wait(PLAYED_MS);
		expect(play).not.toHaveBeenCalled();
		hook.rerender({ count: 5, focused: true, igniteKey: 1 });
		wait(PLAYED_MS);
		expect(play).toHaveBeenCalledTimes(1);
		hook.unmount();
	});
});
