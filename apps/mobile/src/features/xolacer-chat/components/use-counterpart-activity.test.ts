import { describe, expect, it, vi } from "vitest";
import { mountHook } from "@/lib/test/mount-hook";
import { useCounterpartActivity } from "./use-counterpart-activity";

// The real provider drags in stream-chat-expo, which needs a window. Only the
// status read matters here, and the cold-start case is "not ready yet".
vi.mock("../providers/stream-chat-provider", () => ({
	useStreamStatus: () => ({ client: null, status: "connecting" }),
}));

describe("useCounterpartActivity", () => {
	// Cold-start deep link: the header mounts before `connectUser`, the provider
	// hands out `client: null`, and the hook has to idle on it.
	it("idles until the provider hands out a connected client", () => {
		expect(() =>
			mountHook(() => useCounterpartActivity("conv_1", "xolacer_1"))
		).not.toThrow();
	});
});
