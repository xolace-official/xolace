import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "zustand";
import { renderHook } from "@/lib/test/mount-hook";
import type { QuotesScreenValue } from "../quotes-screen-data";
import { type QuoteView, useOpenQuoteUi } from "./quote-ui";
import { useQuoteHandlers } from "./use-quote-handlers";

vi.mock("react-native-pulsar", () => ({
	Presets: { System: { selection: () => undefined } },
}));
vi.mock("@/lib/haptics", () => ({
	playAffirmativePress: () => undefined,
	playResonanceToggle: () => undefined,
	playSoftPress: () => undefined,
	tap: () => undefined,
}));

/** Opens Quotes and records the view each render reads, from the very first one. */
function open() {
	const seen: QuoteView[] = [];
	const hook = renderHook(() => {
		const store = useOpenQuoteUi();
		seen.push(useStore(store, (s) => s.view));
		return store;
	}, undefined);
	return { hook, seen, store: hook.result() };
}

const screen = (patch: Partial<QuotesScreenValue["state"]>) =>
	({
		actions: {
			offerShown: () => undefined,
			setResonated: () => undefined,
			setSaved: () => Promise.resolve(true),
		},
		state: {
			offerDailyQuote: true,
			resonated: false,
			saved: false,
			saveLocked: false,
			...patch,
		},
	}) as unknown as QuotesScreenValue;

describe("a Quotes visit's UI state", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("starts the next visit on today, not where the last one left off", () => {
		const first = open();
		act(() => first.store.getState().set({ clear: true, view: "kept" }));
		first.hook.unmount();

		const next = open();
		expect(next.seen[0]).toBe("today");
		expect(next.store.getState().clear).toBe(false);
		next.hook.unmount();
	});

	it("keeps a late daily-quote offer from a closed visit out of the next one", () => {
		const first = open();
		const h = renderHook(
			() => useQuoteHandlers(screen({}), first.store),
			undefined
		);
		act(() => h.result().heart());
		h.unmount();
		first.hook.unmount();
		act(() => {
			vi.runAllTimers();
		});

		const next = open();
		expect(next.seen[0]).toBe("today");
		next.hook.unmount();
	});

	it("pops the star when the person keeps the quote, and only then", async () => {
		const visit = open();
		const handlers = (patch: Partial<QuotesScreenValue["state"]>) =>
			renderHook(() => useQuoteHandlers(screen(patch), visit.store), undefined);
		const unkept = handlers({ saved: false });
		await act(async () => {
			unkept.result().star();
			await Promise.resolve();
		});
		expect(visit.store.getState().starKey).toBe(1);
		unkept.unmount();
		const kept = handlers({ saved: true });
		await act(async () => {
			kept.result().star();
			await Promise.resolve();
		});
		expect(visit.store.getState().starKey).toBe(1);
		kept.unmount();
		visit.hook.unmount();
	});
});
