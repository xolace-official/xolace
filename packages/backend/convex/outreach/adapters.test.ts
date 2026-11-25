import { describe, expect, test, vi } from "vitest";

/**
 * Every Convex module is a bundle entry, so a channel adapter can be loaded
 * before the registry. While an adapter imported the registry back (for
 * `ChannelError`), the registry then spread a not-yet-defined adapter, and
 * prod's email entry had no `configured`: every welcome threw
 * "configured is not a function" before reaching Resend.
 */
describe("the adapter registry", () => {
	test.each([
		["email", "./email/adapter"],
		["telegram", "./telegram/adapter"],
		["push", "./push"],
	] as const)(
		"is whole when %s's adapter loads first",
		async (_channel, path) => {
			vi.resetModules();
			await import(path);
			const { ADAPTERS } = await import("./adapters");
			for (const adapter of Object.values(ADAPTERS)) {
				expect(adapter?.configured).toBeTypeOf("function");
				expect(adapter?.send).toBeTypeOf("function");
			}
		}
	);
});
