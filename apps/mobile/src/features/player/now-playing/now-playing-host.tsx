import type { Id } from "@xolace/backend/dataModel";
import { useEffect } from "react";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import {
	clearNowPlaying,
	useNowPlaying,
	useNowPlayingAttempt,
} from "@/lib/now-playing/now-playing-store";
import { useNowPlayingAudio } from "./use-now-playing-audio";

export function NowPlayingHost() {
	const np = useNowPlaying();
	const attempt = useNowPlayingAttempt();
	const lapsed = usePlusEntitlement().status === "free";
	useEffect(() => clearNowPlaying, []);
	useEffect(() => {
		if (lapsed) {
			clearNowPlaying();
		}
	}, [lapsed, np]);
	return np ? (
		<Runner
			key={`${np.slug}:${attempt}`}
			preview={np.preview === true}
			slug={np.slug}
			stepId={np.stepId}
		/>
	) : null;
}

function Runner({
	slug,
	stepId,
	preview,
}: {
	slug: string;
	stepId?: Id<"path_steps">;
	preview: boolean;
}) {
	useNowPlayingAudio(slug, stepId, preview);
	return null;
}
