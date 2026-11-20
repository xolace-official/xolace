import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScrollTarget } from "@/features/you/home/you-ui";
import { renderHook } from "@/lib/test/mount-hook";
import { SCROLL_AFTER_MS, useScrollCommand } from "./use-scroll-command";

vi.mock("react", async (original) => {
	const { withEffectEventShim } = await import("@/lib/test/effect-event-shim");
	return withEffectEventShim(await original<typeof import("react")>());
});

type Props = {
	command: { target: ScrollTarget; key: number } | null;
	scroll: (target: ScrollTarget) => void;
};

function wait(ms: number) {
	act(() => {
		vi.advanceTimersByTime(ms);
	});
}

describe("useScrollCommand", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("scrolls once a command is given", () => {
		const scroll = vi.fn();
		const hook = renderHook(
			(p: Props) => useScrollCommand(p.command, p.scroll),
			{
				command: { key: 1, target: "days" },
				scroll,
			}
		);
		wait(SCROLL_AFTER_MS);
		expect(scroll).toHaveBeenCalledExactlyOnceWith("days");
		hook.unmount();
	});

	it("does not replay a command when the scroll inputs change", () => {
		const first = vi.fn();
		const command = { key: 1, target: "days" as const };
		const hook = renderHook(
			(p: Props) => useScrollCommand(p.command, p.scroll),
			{
				command,
				scroll: first,
			}
		);
		wait(SCROLL_AFTER_MS);
		const later = vi.fn();
		hook.rerender({ command, scroll: later });
		wait(SCROLL_AFTER_MS);
		expect(first).toHaveBeenCalledTimes(1);
		expect(later).not.toHaveBeenCalled();
		hook.unmount();
	});

	it("uses the latest inputs when the timer fires", () => {
		const first = vi.fn();
		const later = vi.fn();
		const command = { key: 1, target: "week" as const };
		const hook = renderHook(
			(p: Props) => useScrollCommand(p.command, p.scroll),
			{
				command,
				scroll: first,
			}
		);
		hook.rerender({ command, scroll: later });
		wait(SCROLL_AFTER_MS);
		expect(first).not.toHaveBeenCalled();
		expect(later).toHaveBeenCalledExactlyOnceWith("week");
		hook.unmount();
	});

	it("scrolls again for a new command", () => {
		const scroll = vi.fn();
		const hook = renderHook(
			(p: Props) => useScrollCommand(p.command, p.scroll),
			{
				command: { key: 1, target: "days" },
				scroll,
			}
		);
		wait(SCROLL_AFTER_MS);
		hook.rerender({ command: { key: 2, target: "days" }, scroll });
		wait(SCROLL_AFTER_MS);
		expect(scroll).toHaveBeenCalledTimes(2);
		hook.unmount();
	});
});
