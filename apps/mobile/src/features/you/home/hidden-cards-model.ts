import type { ProfileCard } from "@/features/you/home/you-model";

export type HiddenCardsUpload = {
	sending: Set<ProfileCard>;
	upload: (card: ProfileCard) => Promise<unknown>;
	onDevice: (card: ProfileCard) => boolean;
	forget: (card: ProfileCard) => void;
};

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

export function mergeHidden(
	server: readonly ProfileCard[],
	device: readonly ProfileCard[]
): ProfileCard[] {
	return [...server, ...device.filter((c) => !server.includes(c))];
}
