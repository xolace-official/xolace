import { api } from "@xolace/backend/api";
import { router, useLocalSearchParams } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useState } from "react";
import type { Family } from "@/features/explore/copy";
import { familyOf } from "@/features/explore/explore-model";
import type { FamilyList } from "@/features/explore/list/family-list-data";
import { useListen } from "@/features/explore/use-listen";
import { useStablePaginatedQuery } from "@/lib/convex/use-stable-query";
import { useAppStore } from "@/store/store";

const PAGE_SIZE = 30;

/**
 * A list's data: production's pages, its open event, and the kind's welcome (`/browse-intro`)
 * the first time someone opens that kind, here or from the Family menu. The stable query keeps
 * the old kind on screen while the new one loads.
 */
export function useFamilyList(): FamilyList {
	const params = useLocalSearchParams<{ family?: string }>();
	const [family, setFamily] = useState<Family>(familyOf(params.family));
	const posthog = usePostHog();
	const listen = useListen("family-list");
	const musicIntroSeen = useAppStore((s) => s.musicIntroSeen);
	const supportAudioIntroSeen = useAppStore((s) => s.supportAudioIntroSeen);

	useEffect(() => {
		posthog.capture("browse_family_opened", { family });
	}, [family, posthog]);

	// Keyed on the live kind, so a menu swap to an unseen kind opens its welcome. The
	// welcome sets its own flag.
	useEffect(() => {
		const seen = family === "music" ? musicIntroSeen : supportAudioIntroSeen;
		if (!seen) {
			router.push({ params: { family }, pathname: "/browse-intro" });
		}
	}, [family, musicIntroSeen, supportAudioIntroSeen]);

	const { results, status, isLoading, loadMore } = useStablePaginatedQuery(
		api.browse.family.listByFamily,
		{ family },
		{ initialNumItems: PAGE_SIZE }
	);

	return {
		actions: {
			loadMore:
				status === "CanLoadMore" ? () => loadMore(PAGE_SIZE) : undefined,
			pick: setFamily,
		},
		state: {
			family,
			listen,
			loadingMore: isLoading && results.length > 0,
			tracks: status === "LoadingFirstPage" ? undefined : results,
		},
	};
}
