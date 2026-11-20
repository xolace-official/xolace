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

export type TalkStyle = {
	voice: VoiceSlug;
	pace: TalkPace;
	directness: Directness;
};

export type MirrorSettings = {
	state: {
		plus: Entitlement;
		tone: MirrorTone;
		voice: VoiceValue;
		saved: { tone: MirrorTone; voice: VoiceValue };
		playing: VoiceSlug | null;
		talk: TalkStyle | null;
		companion: string;
	};
	actions: {
		setTone: (tone: MirrorTone) => void;
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
