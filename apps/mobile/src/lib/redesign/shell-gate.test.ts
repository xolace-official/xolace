import { describe, expect, it, vi } from "vitest";
import {
	createShellGate,
	resolveShell,
	type ShellSources,
	shellFromEnv,
} from "@/lib/redesign/shell-gate";

const sources = (over: Partial<ShellSources> = {}): ShellSources => ({
	dev: false,
	env: undefined,
	flag: () => undefined,
	stored: () => null,
	...over,
});

describe("resolveShell in a release build", () => {
	it.each([
		[true, "v2"],
		[false, "v1"],
		[undefined, "v1"],
		["test", "v1"],
		["true", "v1"],
	] as const)("reads flag %s as %s", (flag, shell) => {
		expect(resolveShell(sources({ flag: () => flag }))).toBe(shell);
	});

	it("ignores both dev overrides", () => {
		const stored = vi.fn(() => "v2" as const);
		const shell = resolveShell(
			sources({ env: "on", flag: () => false, stored })
		);
		expect(shell).toBe("v1");
		expect(stored).not.toHaveBeenCalled();
	});
});

describe("resolveShell in a dev build", () => {
	it("puts the Dev tools row first, then the env var, then the flag", () => {
		const flag = vi.fn(() => true);
		expect(
			resolveShell(sources({ dev: true, env: "on", flag, stored: () => "v1" }))
		).toBe("v1");
		expect(resolveShell(sources({ dev: true, env: "off", flag }))).toBe("v1");
		expect(flag).not.toHaveBeenCalled();
		expect(resolveShell(sources({ dev: true, flag }))).toBe("v2");
	});

	it("falls through an env var that forces nothing", () => {
		expect(
			resolveShell(sources({ dev: true, env: "maybe", flag: () => true }))
		).toBe("v2");
	});
});

describe("shellFromEnv", () => {
	it.each([
		["on", "v2"],
		["ON", "v2"],
		[" 1 ", "v2"],
		["true", "v2"],
		["v2", "v2"],
		["off", "v1"],
		["0", "v1"],
		["false", "v1"],
		["v1", "v1"],
		["", null],
		["yes", null],
		[undefined, null],
	] as const)("reads %j as %s", (value, shell) => {
		expect(shellFromEnv(value)).toBe(shell);
	});
});

describe("createShellGate", () => {
	it("reads the flag once and keeps that shell for the launch", () => {
		const flag = vi
			.fn<() => boolean | undefined>()
			.mockReturnValueOnce(undefined)
			.mockReturnValue(true);
		const shell = createShellGate(sources({ flag }));
		expect(shell()).toBe("v1");
		// Flags land after the first read: the launch keeps the old shell.
		expect(shell()).toBe("v1");
		expect(flag).toHaveBeenCalledTimes(1);
	});

	it("keeps a dev override for the launch even when it changes on the device", () => {
		const stored = vi
			.fn<() => "v1" | "v2" | null>()
			.mockReturnValueOnce("v2")
			.mockReturnValue(null);
		const shell = createShellGate(sources({ dev: true, stored }));
		expect(shell()).toBe("v2");
		expect(shell()).toBe("v2");
		expect(stored).toHaveBeenCalledTimes(1);
	});

	it("reads nothing until it is first asked", () => {
		const flag = vi.fn(() => true);
		createShellGate(sources({ flag }));
		expect(flag).not.toHaveBeenCalled();
	});
});
