import type { VoiceSlug } from "@/convex/lib/voices";
import type { CrossPlatformSymbol } from "@/src/features/settings/components/settings-icons";

/**
 * Client mirror of the custom-voice catalog. Server-authoritative catalog and
 * naming rationale live in convex/lib/voices.ts + docs/voice-naming.md.
 * "auto" is the free default (tone-mapped mirror / Witnessed vent); every
 * named voice is Plus-only.
 */
export type VoiceValue = VoiceSlug | "auto";

export type VoiceOption = {
  value: VoiceValue;
  label: string;
  description: string;
  symbol: CrossPlatformSymbol;
  premium?: boolean;
};

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    value: "auto",
    label: "Auto",
    description: "Matches your mirror tone",
    symbol: { ios: "wand.and.stars", android: "auto_awesome", web: "auto_awesome" },
  },
  {
    value: "sage",
    label: "Sage",
    description: "Older and unhurried. Like someone who's heard a lot and isn't in a rush.",
    symbol: { ios: "leaf.fill", android: "eco", web: "eco" },
    premium: true,
  },
  {
    value: "wren",
    label: "Wren",
    description: "Soft-spoken, with a gentle lilt. Easy to sit with.",
    symbol: { ios: "bird.fill", android: "flutter_dash", web: "flutter_dash" },
    premium: true,
  },
  {
    value: "vesper",
    label: "Vesper",
    description: "Calm and steady. Holds the ground when your thoughts won't.",
    symbol: { ios: "moon.stars.fill", android: "nights_stay", web: "nights_stay" },
    premium: true,
  },
  {
    value: "ash",
    label: "Ash",
    description: "Low and gravelly. Close, like someone leaning in across the fire.",
    symbol: { ios: "flame.fill", android: "local_fire_department", web: "local_fire_department" },
    premium: true,
  },
];

/**
 * Static require map for bundled preview clips — dynamic require paths don't
 * bundle in Metro. Keyed by slug (not "auto"; the default has no preview).
 * Regenerate with scratchpad/generate-voice-previews.mjs.
 */
export const VOICE_PREVIEWS: Record<VoiceSlug, number> = {
  sage: require("@/assets/sounds/voice-previews/sage.mp3"),
  wren: require("@/assets/sounds/voice-previews/wren.mp3"),
  vesper: require("@/assets/sounds/voice-previews/vesper.mp3"),
  ash: require("@/assets/sounds/voice-previews/ash.mp3"),
};
