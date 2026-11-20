import * as Sentry from "@sentry/react-native";
import { api } from "@xolace/backend/api";
import { useAction } from "convex/react";
import { type Href, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import type { ActiveKindling, ServerTwig } from "./kindling-model";
import { twigHref } from "./twig-links";

export function useXolacerMatch() {
	const suggest = useAction(api.ai.xolacers.suggest.sessionSuggestion);
	const [pendingId, setPendingId] = useState<string | null>(null);
	useFocusEffect(useCallback(() => setPendingId(null), []));
	const resolve = async (
		twig: ServerTwig,
		sessionId: ActiveKindling["sessionId"]
	): Promise<Href | null> => {
		const roster = twigHref(twig, sessionId);
		setPendingId(twig._id);
		const person = await suggest({ sessionId }).catch((e: unknown) => {
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
