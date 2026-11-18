import type { TalkPace } from "@xolace/backend/convex/lib/voices";
import { createContext, type ReactNode, use } from "react";
import type {
	Entitlement,
	MirrorTone,
	VoiceSlug,
} from "@/features/settings/mirror/mirror-model";
import { useMirrorSettings } from "@/features/settings/mirror/use-mirror-settings";
import type { Directness } from "@/lib/talk/use-talk-style";
import type { VoiceValue } from "@/lib/talk/voice-options";

/** How the companion talks (Plus only). */
export type TalkStyle = {
	voice: VoiceSlug;
	pace: TalkPace;
	directness: Directness;
};

/**
 * Everything Mirror reads and does. Two adapters fill it: Convex in the app
 * (`MirrorData`) and fixtures in its dev states (`dev/`).
 */
export type MirrorSettings = {
	state: {
		plus: Entitlement;
		/** The tone the mirror answers in (a saved Witnessed shows as Adaptive off Plus). */
		tone: MirrorTone;
		/** The mirror's voice ("auto" off Plus, whatever is saved). */
		voice: VoiceValue;
		/** The preview clip playing now, from either section. */
		playing: VoiceSlug | null;
		/** Null off Plus: Talk is hidden. */
		talk: TalkStyle | null;
		/** The companion's name (the space name, else Ember). */
		companion: string;
	};
	actions: {
		setTone: (tone: MirrorTone) => void;
		/** A free account reached for Witnessed: the register-complaint signal. */
		reachForTone: () => void;
		setVoice: (voice: VoiceValue) => void;
		play: (voice: VoiceSlug) => void;
		stop: () => void;
		setTalkVoice: (voice: VoiceSlug) => void;
		setPace: (pace: TalkPace) => void;
		setDirectness: (directness: Directness) => void;
		openPlus: (surface: "mirror_tone" | "mirror_voice") => void;
	};
};

const MirrorContext = createContext<MirrorSettings | null>(null);

export function MirrorProvider({
	value,
	children,
}: {
	value: MirrorSettings;
	children: ReactNode;
}) {
	return <MirrorContext value={value}>{children}</MirrorContext>;
}

/** The app's adapter. */
export function MirrorData({ children }: { children: ReactNode }) {
	return (
		<MirrorProvider value={useMirrorSettings()}>{children}</MirrorProvider>
	);
}

export function useMirror(): MirrorSettings {
	const mirror = use(MirrorContext);
	if (!mirror) {
		throw new Error("useMirror needs a MirrorProvider above it");
	}
	return mirror;
}
