import { describe, expect, it, vi } from "vitest";
import {
	createToastChannel,
	TOAST_MS,
	toastAnnouncement,
	toastDuration,
	toastHaptic,
} from "./toast-model";

describe("toastDuration", () => {
	it("stays longest with an action, longer with a second line", () => {
		const action = { label: "Undo", onPress: () => undefined };
		expect(toastDuration({})).toBe(TOAST_MS.short);
		expect(toastDuration({ description: "More" })).toBe(TOAST_MS.long);
		expect(toastDuration({ action, description: "More" })).toBe(
			TOAST_MS.action
		);
	});
});

describe("toastAnnouncement", () => {
	it("reads the message, then the second line", () => {
		expect(toastAnnouncement("Saved", {})).toBe("Saved");
		expect(toastAnnouncement("Saved", { description: "On this phone" })).toBe(
			"Saved. On this phone"
		);
	});
});

describe("toastHaptic", () => {
	const problem = () => undefined;

	it("buzzes only for a warning or a problem", () => {
		expect(toastHaptic({}, problem)).toBeNull();
		expect(toastHaptic({ variant: "success" }, problem)).toBeNull();
		expect(toastHaptic({ variant: "warning" }, problem)).toBe(problem);
		expect(toastHaptic({ variant: "danger" }, problem)).toBe(problem);
	});

	it("lets the caller choose, or silence it", () => {
		const own = () => undefined;
		expect(toastHaptic({ haptic: own }, problem)).toBe(own);
		expect(
			toastHaptic({ haptic: false, variant: "danger" }, problem)
		).toBeNull();
	});
});

describe("createToastChannel", () => {
	it("shows at once while a presenter is attached", () => {
		const channel = createToastChannel<string>();
		const run = vi.fn();
		channel.attach("live");
		channel.send(run);
		expect(run).toHaveBeenCalledWith("live");
	});

	it("keeps only the latest toast sent before the bridge mounts, and shows it once", () => {
		const channel = createToastChannel<string>();
		const stale = vi.fn();
		const latest = vi.fn();
		channel.send(stale);
		channel.send(latest);
		channel.attach("live");
		channel.attach("live again");
		expect(stale).not.toHaveBeenCalled();
		expect(latest).toHaveBeenCalledTimes(1);
		expect(latest).toHaveBeenCalledWith("live");
	});

	it("waits again after the bridge unmounts", () => {
		const channel = createToastChannel<string>();
		const run = vi.fn();
		channel.attach("first");
		channel.detach();
		channel.send(run);
		expect(run).not.toHaveBeenCalled();
		channel.attach("second");
		expect(run).toHaveBeenCalledWith("second");
	});
});
