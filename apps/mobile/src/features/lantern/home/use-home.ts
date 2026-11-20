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

function useArrival() {
	const introSeen = useAppStore((s) => s.libraryIntroSeen);
	const [arrival, setArrival] = useState(0);
	const was = useRef(introSeen);
	useEffect(() => {
		if (!introSeen) {
			router.push(WELCOME_HREF);
		}
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
