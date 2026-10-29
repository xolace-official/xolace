import { api } from "@xolace/backend/convex/_generated/api";
import { useAction } from "convex/react";
import { type Href, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
	type Kindling,
	type Twig,
	twigHref,
} from "@/features/kindling/twig-presentation";

/** Where a xolacer twig goes (#570): the closest person by meaning (asked at
 * tap, never stored), else the roster filtered to the specialty. `pendingId`
 * holds through the push so the button never flips back mid-transition. */
export function useXolacerTwigHref() {
	const suggest = useAction(api.ai.xolacers.suggest.sessionSuggestion);
	const [pendingId, setPendingId] = useState<Twig["_id"]>();
	// Stable on purpose: useFocusEffect re-runs whenever the callback changes.
	useFocusEffect(useCallback(() => setPendingId(undefined), []));
	const resolve = async (
		twig: Twig,
		sessionId: Kindling["sessionId"]
	): Promise<Href | null> => {
		const roster = twigHref(twig, sessionId);
		setPendingId(twig._id);
		const person = await suggest({ sessionId }).catch((e) => {
			console.error("Xolacer suggestion failed, falling back to roster:", e);
			return null;
		});
		if (!person) {
			if (!roster) {
				setPendingId(undefined);
			}
			return roster;
		}
		return {
			params: {
				profileId: person.xolacerProfileId,
				specialty: person.specialty,
				stepId: twig._id,
			},
			pathname: "/xolacer/[profileId]",
		};
	};
	return { pendingId, resolve };
}
