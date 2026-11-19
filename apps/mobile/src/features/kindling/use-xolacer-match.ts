import * as Sentry from "@sentry/react-native";
import { api } from "@xolace/backend/api";
import { useAction } from "convex/react";
import { type Href, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import type { ActiveKindling, ServerTwig } from "./kindling-model";
import { twigHref } from "./twig-links";

/** Where a xolacer twig goes (#570): the closest person by meaning (asked at tap, never
 * stored), else the roster filtered to the specialty. `pendingId` holds through the push so
 * the button never flips back mid-transition, and clears when the screen is in front again. */
export function useXolacerMatch() {
	const suggest = useAction(api.ai.xolacers.suggest.sessionSuggestion);
	const [pendingId, setPendingId] = useState<string | null>(null);
	// useFocusEffect needs a stable callback (code-style's listed exception to no useCallback).
	useFocusEffect(useCallback(() => setPendingId(null), []));
	const resolve = async (
		twig: ServerTwig,
		sessionId: ActiveKindling["sessionId"]
	): Promise<Href | null> => {
		const roster = twigHref(twig, sessionId);
		setPendingId(twig._id);
		const person = await suggest({ sessionId }).catch((e: unknown) => {
			// The roster is the fallback; the miss is worth knowing about.
			Sentry.captureException(e);
			return null;
		});
		if (!person) {
			if (!roster) {
				setPendingId(null);
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
