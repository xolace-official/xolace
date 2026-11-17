/**
 * The You cards someone hid (Settings › Profile), now on the server (B7,
 * `preferences.profileCards`). Before B7 the list lived on the device; it's uploaded once,
 * a card at a time, and the device copy cleared as each one lands. Until then both count,
 * so nothing someone hid flashes back.
 */
import { api } from "@xolace/backend/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import type { ProfileCard } from "@/features/you/home/you-model";
import { useAppStore } from "@/store/store";

/** Undefined while the server's list loads. */
export function useHiddenCards(): readonly ProfileCard[] | undefined {
	const server = useQuery(api.preferences.profileCards.getHidden);
	const device = useAppStore((s) => s.hiddenProfileCards);
	const forget = useAppStore((s) => s.toggleProfileCard);
	const setHidden = useMutation(api.preferences.profileCards.setHidden);
	// Cards on their way up: a re-run before one lands mustn't send it twice, and the
	// device's toggle mustn't flip it back.
	const sending = useRef(new Set<ProfileCard>());

	useEffect(() => {
		if (server === undefined) {
			return;
		}
		for (const card of device) {
			if (sending.current.has(card)) {
				continue;
			}
			sending.current.add(card);
			setHidden({ card, hidden: true })
				.then(() => forget(card))
				.catch(() => undefined)
				.finally(() => sending.current.delete(card));
		}
	}, [server, device, setHidden, forget]);

	if (server === undefined) {
		return;
	}
	return [...server, ...device.filter((c) => !server.includes(c))];
}
