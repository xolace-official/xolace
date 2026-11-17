/**
 * The You cards someone hid (Settings › Profile), now on the server (B7,
 * `preferences.profileCards`). Before B7 the list lived on the device; it's uploaded once,
 * a card at a time, and the device copy cleared as each one lands. Until then both count,
 * so nothing someone hid flashes back.
 */
import { api } from "@xolace/backend/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import {
	mergeHidden,
	uploadDeviceCards,
} from "@/features/you/home/hidden-cards-model";
import type { ProfileCard } from "@/features/you/home/you-model";
import { useAppStore } from "@/store/store";

/** Undefined while the server's list loads. */
export function useHiddenCards(): readonly ProfileCard[] | undefined {
	const server = useQuery(api.preferences.profileCards.getHidden);
	const device = useAppStore((s) => s.hiddenProfileCards);
	const forget = useAppStore((s) => s.toggleProfileCard);
	const setHidden = useMutation(api.preferences.profileCards.setHidden);
	const sending = useRef(new Set<ProfileCard>());

	useEffect(() => {
		if (server === undefined) {
			return;
		}
		uploadDeviceCards(device, {
			// The toggle only ever removes here: `onDevice` is read as each one lands.
			forget,
			onDevice: (card) =>
				useAppStore.getState().hiddenProfileCards.includes(card),
			sending: sending.current,
			upload: (card) => setHidden({ card, hidden: true }),
		});
	}, [server, device, setHidden, forget]);

	if (server === undefined) {
		return;
	}
	return mergeHidden(server, device);
}
