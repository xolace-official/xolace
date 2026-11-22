import { describe, expect, it } from "vitest";
import { mountHook } from "@/lib/test/mount-hook";
import {
	sameActivity,
	useCounterpartActivity,
} from "./use-counterpart-activity";

describe("useCounterpartActivity", () => {
	it("idles without a channel", () => {
		let read: unknown;
		mountHook(() => {
			read = useCounterpartActivity(null, "xolacer_1");
		});
		expect(read).toEqual({ presence: null, typing: false });
	});
});

describe("sameActivity", () => {
	const here = { presence: { online: true }, typing: false };

	it("holds through a repeated typing.start", () => {
		expect(
			sameActivity({ ...here, typing: true }, { ...here, typing: true })
		).toBe(true);
	});

	it("changes when typing starts or stops", () => {
		expect(sameActivity(here, { ...here, typing: true })).toBe(false);
	});

	it("changes when they leave, and with when they were last here", () => {
		const away = { presence: { lastActive: 1, online: false }, typing: false };
		expect(sameActivity(here, away)).toBe(false);
		expect(
			sameActivity(away, {
				presence: { lastActive: 2, online: false },
				typing: false,
			})
		).toBe(false);
		expect(sameActivity(away, { ...away })).toBe(true);
	});

	it("tells unknown presence from any presence", () => {
		const unknown = { presence: null, typing: false };
		expect(sameActivity(unknown, { ...unknown })).toBe(true);
		expect(sameActivity(unknown, here)).toBe(false);
	});
});
