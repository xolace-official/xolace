/**
 * The home's data hook: `getHome` and `getSubjects`, Reading as… (`setReadingAs`), the welcome
 * on a first visit, and the open counted once. The one home file that calls Convex, PostHog or
 * the toast.
 */
import { api } from "@xolace/backend/api";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { Presets } from "react-native-pulsar";
import { toast } from "@/components/shared/toast";
import { COPY } from "@/features/lantern/copy";
import type { Home } from "@/features/lantern/home/home-data";
import { WELCOME_HREF } from "@/features/lantern/lantern-links";
import { facetLabel, toggleIn } from "@/features/lantern/lantern-model";
import { useEntryActions } from "@/features/lantern/use-entry-actions";
import { playAffirmativePress, playSoftPress } from "@/lib/haptics";
import { trackLibrary } from "@/lib/library-analytics";
import { useAppStore } from "@/store/store";

export function useHome(): Home {
	const home = useQuery(api.library.home.getHome, {});
	const subjects = useQuery(api.library.home.getSubjects, {});
	// The answer shows at once: the card goes and the bar's menu ticks before the round trip.
	const setReadingAs = useMutation(
		api.library.home.setReadingAs
	).withOptimisticUpdate((store, { audiences }) => {
		const cur = store.getQuery(api.library.home.getHome, {});
		if (cur) {
			store.setQuery(
				api.library.home.getHome,
				{},
				{ ...cur, readingAs: audiences }
			);
		}
	});
	const { share } = useEntryActions();
	const posthog = usePostHog();
	const arrival = useArrival();

	useEffect(() => {
		trackLibrary(posthog, "library_home_opened");
		// Once per open.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const save = (audiences: readonly string[]) =>
		void setReadingAs({ audiences: [...audiences] });

	return {
		actions: {
			answerReadingAs: (audiences) => {
				save(audiences);
				if (audiences.length === 0) {
					playSoftPress();
					return;
				}
				playAffirmativePress();
				toast(COPY.readingAs.leansOn(audiences.map(facetLabel)));
			},
			flipAudience: (slug) => {
				Presets.System.selection();
				save(toggleIn(home?.readingAs ?? [], slug));
			},
			share,
		},
		state: { arrival, home, subjects },
	};
}

/**
 * A first visit opens the welcome, once, before the home. When it closes, the arrival moves on
 * and the home's sections rise in.
 */
function useArrival() {
	const introSeen = useAppStore((s) => s.libraryIntroSeen);
	const [arrival, setArrival] = useState(0);
	const was = useRef(introSeen);
	useEffect(() => {
		if (!introSeen) {
			router.push(WELCOME_HREF);
		}
		// On mount: the welcome's own close sets the flag.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	useEffect(() => {
		if (!was.current && introSeen) {
			setArrival((n) => n + 1);
		}
		was.current = introSeen;
	}, [introSeen]);
	return arrival;
}
