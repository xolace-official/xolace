import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@/lib/test/mount-hook";
import { useTickPose } from "./use-tick-pose";

vi.mock("react", async (original) => {
	const { withEffectEventShim } = await import("@/lib/test/effect-event-shim");
	return withEffectEventShim(await original<typeof import("react")>());
});

const GLAD_MS = 1000;

type Props = { tickKey: number; glad: () => void; rest: () => void };

function face(start: Props) {
	return renderHook(
		(p: Props) => useTickPose({ ...p, gladMs: GLAD_MS }),
		start
	);
}

const wait = (ms: number) =>
	act(() => {
		vi.advanceTimersByTime(ms);
	});

describe("useTickPose", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("stays at rest on mount", () => {
		const glad = vi.fn();
		const rest = vi.fn();
		const hook = face({ glad, rest, tickKey: 0 });
		wait(GLAD_MS);
		expect(glad).not.toHaveBeenCalled();
		expect(rest).not.toHaveBeenCalled();
		hook.unmount();
	});

	it("goes glad on a tick, then back to rest", () => {
		const glad = vi.fn();
		const rest = vi.fn();
		const hook = face({ glad, rest, tickKey: 0 });
		hook.rerender({ glad, rest, tickKey: 1 });
		expect(glad).toHaveBeenCalledTimes(1);
		wait(GLAD_MS);
		expect(rest).toHaveBeenCalledTimes(1);
		hook.unmount();
	});

	it("still returns to rest when the face's callbacks change mid-glad", () => {
		const glad = vi.fn();
		const rest = vi.fn();
		const hook = face({ glad, rest, tickKey: 0 });
		hook.rerender({ glad, rest, tickKey: 1 });
		wait(GLAD_MS / 2);
		const restAfterReduceMotion = vi.fn();
		hook.rerender({ glad: vi.fn(), rest: restAfterReduceMotion, tickKey: 1 });
		wait(GLAD_MS);
		expect(rest).not.toHaveBeenCalled();
		expect(restAfterReduceMotion).toHaveBeenCalledTimes(1);
		hook.unmount();
	});
});
