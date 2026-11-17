/** A hub's data hook: `getHub`, its rows' save and share, and the open counted once. */
import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import { useIsPreview } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import type { Hub, HubListen } from "@/features/lantern/hub/hub-data";
import { useEntryActions } from "@/features/lantern/use-entry-actions";
import { tap } from "@/lib/haptics";
import { trackLibrary } from "@/lib/library-analytics";

export function useHub(slug: string, listen: HubListen): Hub {
	const hub = useQuery(api.library.hubs.getHub, { slug });
	const entryActions = useEntryActions();
	const posthog = usePostHog();
	const isPreview = useIsPreview();
	const trackedFor = useRef<string | null>(null);
	useEffect(() => {
		if (isPreview || trackedFor.current === slug) {
			return;
		}
		trackedFor.current = slug;
		trackLibrary(posthog, "library_hub_opened", { hub: slug });
	}, [slug, isPreview, posthog]);

	const { play, toggle, open, ...listenState } = listen;
	return {
		actions: {
			...entryActions,
			open,
			// Play and pause: a light impact (handoff §12). Locked, the paywall's own tap alone.
			play: (track) => {
				if (!listen.locked) {
					tap();
				}
				play(track);
			},
			toggle: () => {
				tap();
				toggle();
			},
		},
		state: { hub, listen: listenState },
	};
}
