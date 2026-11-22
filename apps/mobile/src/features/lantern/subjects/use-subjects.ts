import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import type { Subjects } from "@/features/lantern/subjects/subjects-data";
import { trackLibrary } from "@/lib/library-analytics";

export function useSubjects(letter?: string): Subjects {
	const subjects = useQuery(api.library.home.getSubjects, {});
	const posthog = usePostHog();
	useEffect(() => {
		trackLibrary(posthog, "library_subjects_opened", {
			letter: letter ?? null,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	return { state: { letter, subjects } };
}
