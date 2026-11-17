import { describe, expect, it } from "vitest";
import {
	type HiddenCardsUpload,
	mergeHidden,
	uploadDeviceCards,
} from "@/features/you/home/hidden-cards-model";
import type { ProfileCard } from "@/features/you/home/you-model";

/** A device list and an upload that lands when the test says so. */
function harness(initial: ProfileCard[]) {
	let device = [...initial];
	const sent: ProfileCard[] = [];
	const pending: (() => void)[] = [];
	const deps: HiddenCardsUpload = {
		forget: (card) => {
			device = device.filter((c) => c !== card);
		},
		onDevice: (card) => device.includes(card),
		sending: new Set(),
		upload: (card) => {
			sent.push(card);
			return new Promise<void>((resolve) => pending.push(resolve));
		},
	};
	return {
		deps,
		device: () => device,
		land: () => {
			for (const resolve of pending.splice(0)) {
				resolve();
			}
		},
		sent,
		show: (card: ProfileCard) => {
			device = device.filter((c) => c !== card);
		},
	};
}

describe("uploadDeviceCards", () => {
	it("clears each card from the device once it lands", async () => {
		const h = harness(["calendar", "rank"]);
		const landing = uploadDeviceCards(h.device(), h.deps);
		h.land();
		await Promise.all(landing);
		expect(h.sent).toEqual(["calendar", "rank"]);
		expect(h.device()).toEqual([]);
	});

	it("doesn't send a card twice while it's on its way", async () => {
		const h = harness(["calendar"]);
		const first = uploadDeviceCards(h.device(), h.deps);
		const again = uploadDeviceCards(h.device(), h.deps);
		expect(again).toEqual([]);
		h.land();
		await Promise.all(first);
		expect(h.sent).toEqual(["calendar"]);
	});

	it("leaves a card shown when the person showed it before the upload landed", async () => {
		const h = harness(["calendar"]);
		const landing = uploadDeviceCards(h.device(), h.deps);
		h.show("calendar");
		h.land();
		await Promise.all(landing);
		expect(h.device()).toEqual([]);
		// Nothing put it back, so a re-run has nothing to send.
		expect(uploadDeviceCards(h.device(), h.deps)).toEqual([]);
		expect(h.sent).toEqual(["calendar"]);
	});

	it("keeps the device copy when the upload fails, to try again", async () => {
		const h = harness(["rank"]);
		h.deps.upload = () => Promise.reject(new Error("offline"));
		await Promise.all(uploadDeviceCards(h.device(), h.deps));
		expect(h.device()).toEqual(["rank"]);
		expect(h.deps.sending.size).toBe(0);
	});
});

describe("mergeHidden", () => {
	it("adds device-only cards after the account's, once each", () => {
		expect(mergeHidden(["rank"], ["rank", "calendar"])).toEqual([
			"rank",
			"calendar",
		]);
	});
});
