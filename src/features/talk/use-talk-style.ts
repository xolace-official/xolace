// How the companion sounds in a talk (#603): voice, pace, directness. Saved
// per person; a talk reads them once, at its start.
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TALK_FALLBACK_VOICE, type TalkDirectness, type TalkPace, type VoiceSlug } from "@/convex/lib/voices";
import { usePreferenceMutation } from "@/src/features/settings/hooks/use-preference-mutation";

export type Directness = TalkDirectness | "balanced";

export function useTalkStyle() {
  const prefs = useQuery(api.preferences.get);
  const update = usePreferenceMutation();
  return {
    // Unpicked, it speaks in their mirror voice, else Vesper (the server's order).
    voice: prefs?.talkVoice ?? prefs?.voice ?? TALK_FALLBACK_VOICE,
    pace: prefs?.talkPace ?? "normal",
    directness: prefs?.talkDirectness ?? ("balanced" as const),
    setVoice: (talkVoice: VoiceSlug) => update({ talkVoice }),
    setPace: (talkPace: TalkPace) => update({ talkPace }),
    setDirectness: (d: Directness) => update({ talkDirectness: d === "balanced" ? null : d }),
  };
}
