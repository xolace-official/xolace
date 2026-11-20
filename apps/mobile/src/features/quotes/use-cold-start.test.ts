import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@/lib/test/mount-hook";
import { useColdStart } from "./use-cold-start";

vi.mock("react", async (original) => {
	const { withEffectEventShim } = await import("@/lib/test/effect-event-shim");
	return withEffectEventShim(await original<typeof import("react")>());
});

async function settle() {
	await act(async () => {
		await Promise.resolve();
	});
}

function quotes(waiting: boolean) {
	const coldStart = vi.fn(() => Promise.resolve<unknown>(null));
	const hook = renderHook(
		(p: { waiting: boolean }) =>
			useColdStart({ start: coldStart, waiting: p.waiting }),
		{ waiting }
	);
	return { coldStart, hook };
}

describe("useColdStart", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.spyOn(console, "error").mockImplementation(() => undefined);
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("sends the cold start once when the quote is missing", async () => {
		const { coldStart, hook } = quotes(false);
		expect(coldStart).not.toHaveBeenCalled();
		hook.rerender({ waiting: true });
		await settle();
		hook.rerender({ waiting: true });
		expect(coldStart).toHaveBeenCalledTimes(1);
		hook.unmount();
	});

	it("shows the error when the cold start fails", async () => {
		const { coldStart, hook } = quotes(false);
		coldStart.mockRejectedValueOnce(new Error("offline"));
		hook.rerender({ waiting: true });
		await settle();
		await settle();
		expect(hook.result().coldError).toBe(true);
		hook.unmount();
	});

	it("sends the cold start again on Try again", async () => {
		const { coldStart, hook } = quotes(false);
		coldStart.mockRejectedValueOnce(new Error("offline"));
		hook.rerender({ waiting: true });
		await settle();
		await settle();
		act(() => hook.result().retry());
		await settle();
		expect(coldStart).toHaveBeenCalledTimes(2);
		expect(hook.result().coldError).toBe(false);
		hook.unmount();
	});

	it("gives up waiting after the timeout and retries from there", async () => {
		const { coldStart, hook } = quotes(false);
		coldStart.mockReturnValueOnce(new Promise(() => undefined));
		hook.rerender({ waiting: true });
		act(() => {
			vi.advanceTimersByTime(45_000);
		});
		expect(hook.result().coldError).toBe(true);
		act(() => hook.result().retry());
		await settle();
		expect(coldStart).toHaveBeenCalledTimes(2);
		hook.unmount();
	});
});
