import type { ProfileCard } from "@/features/you/home/you-model";

/** What the one-time upload of device-hidden cards needs, so a test can stand in for it. */
export type HiddenCardsUpload = {
	/** Cards on their way up: a re-run before one lands mustn't send it twice. */
	sending: Set<ProfileCard>;
	upload: (card: ProfileCard) => Promise<unknown>;
	/** Read when the upload lands, not when it starts. */
	onDevice: (card: ProfileCard) => boolean;
	/** Removes the card from the device's list; never adds it. */
	forget: (card: ProfileCard) => void;
};

/**
 * Sends each card still hidden only on the device to the account, and clears the device copy
 * as each one lands. A card the person showed again meanwhile (Settings › Profile drops it
 * from the device) stays shown: the landing upload doesn't put it back.
 */
export function uploadDeviceCards(
	cards: readonly ProfileCard[],
	{ sending, upload, onDevice, forget }: HiddenCardsUpload
): Promise<void>[] {
	const landing: Promise<void>[] = [];
	for (const card of cards) {
		if (sending.has(card)) {
			continue;
		}
		sending.add(card);
		landing.push(
			upload(card)
				.then(() => {
					if (onDevice(card)) {
						forget(card);
					}
				})
				.catch(() => undefined)
				.finally(() => {
					sending.delete(card);
				})
		);
	}
	return landing;
}

/** The account's list plus any card hidden only on this device. */
export function mergeHidden(
	server: readonly ProfileCard[],
	device: readonly ProfileCard[]
): ProfileCard[] {
	return [...server, ...device.filter((c) => !server.includes(c))];
}
