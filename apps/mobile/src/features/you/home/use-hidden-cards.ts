import { api } from "@xolace/backend/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import {
	mergeHidden,
	uploadDeviceCards,
} from "@/features/you/home/hidden-cards-model";
import type { ProfileCard } from "@/features/you/home/you-model";
import { useAppStore } from "@/store/store";

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
