import type { Href } from "expo-router";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { twigHref, type Kindling, type Twig } from "./twig-presentation";

/**
 * Where a xolacer twig goes (#570): straight to the person closest in meaning,
 * asked at tap time and never stored, else the roster filtered to the
 * specialty. `stepId` rides along either way so a sent request tends the twig.
 */
export function useXolacerTwigHref() {
  const suggest = useAction(api.ai.xolacers.suggest.sessionSuggestion);
  return async (twig: Twig, sessionId: Kindling["sessionId"]): Promise<Href | null> => {
    const roster = twigHref(twig, sessionId);
    const person = await suggest({ sessionId }).catch(() => null);
    if (!person) return roster;
    return {
      pathname: "/xolacer/[profileId]",
      params: { profileId: person.xolacerProfileId, specialty: person.specialty, stepId: twig._id },
    };
  };
}
