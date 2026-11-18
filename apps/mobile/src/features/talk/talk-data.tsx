import { ConversationProvider } from "@elevenlabs/react-native";
import type { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import type { Resource } from "@xolace/backend/convex/lib/crisisResources";
import type {
	TalkLook,
	TalkPace,
	TalkView,
	VoiceSlug,
} from "@xolace/backend/convex/lib/voices";
import type { FunctionReturnType } from "convex/server";
import { createContext, type ReactNode, use } from "react";
import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import type { Directness } from "@/lib/talk/use-talk-style";
import type { Phase, WeekLeft } from "./talk-model";
import type { Presence } from "./use-talk";
import { useReopenedThread, useTalkScreenData } from "./use-talk-screen";
import type { ThreadLine, Turn } from "./use-thread";

/** Help the server raised for this talk (#599): a button at elevated, people at crisis. */
export type TalkHelp = FunctionReturnType<typeof api.talk.safety.help>;

/**
 * Everything the talk screen reads and does: the start screen and the talk, one tree.
 * Two adapters fill it: production's voice pipeline in the app (`TalkData`) and a scripted
 * talk on fixtures in its dev states (`dev/`). No part calls a data hook itself, so a dev
 * state is the whole screen and a tap in one never reaches the backend or a voice service.
 */
export type TalkScreen = {
	state: {
		phase: Phase;
		/** Opened from a talk's mirror ("Say more"): straight into the talk, on its thread. */
		reopened: boolean;
		/** The companion, by the space name. */
		name: string;
		presence: Presence;
		turns: readonly Turn[];
		muted: boolean;
		/** Live and not ending: leaving asks first. */
		live: boolean;
		error: string | null;
		look: TalkLook;
		voice: VoiceSlug;
		pace: TalkPace;
		directness: Directness;
		view: TalkView;
		week: WeekLeft;
		/** The first talk: the microphone hasn't been asked for yet. */
		micAsk: boolean;
		/** Start was tapped and that attempt is still under way (the mic ask, the server). */
		starting: boolean;
		/** The voice whose sample is playing. */
		sample: VoiceSlug | null;
		/** When the open talk's time runs out, on this device's clock. */
		endsAt: number | null;
		/** Seconds left from which the pill shows the clock (the wrap-up cue). */
		clockFromS: number;
		help: TalkHelp;
		/** Your voice, 0–1: the composer's bars, and the face leaning in. */
		micLevel: SharedValue<number>;
	};
	actions: {
		/** Start talking: asks for the microphone the first time, then connects. Once per
		 * attempt: taps while one is under way are ignored. Plays the Start haptic. */
		begin: () => void;
		send: (text: string) => void;
		toggleMic: () => void;
		/** Ends the talk; its mirror comes now. */
		end: () => void;
		/** Ends the talk; its mirror waits in Moments. */
		justEnd: () => void;
		setLook: (look: TalkLook) => void;
		/** Chooses a voice and plays its sample, or stops the one playing. */
		pickVoice: (voice: VoiceSlug) => void;
		stopSample: () => void;
		setView: (view: TalkView) => void;
		openStyle: () => void;
		openKept: () => void;
		openHelp: () => void;
		/** Calls, opens or mails a help resource. */
		openResource: (resource: Resource) => void;
	};
};

const TalkScreenContext = createContext<TalkScreen | null>(null);

export function TalkScreenProvider({
	value,
	children,
}: {
	value: TalkScreen;
	children: ReactNode;
}) {
	return <TalkScreenContext value={value}>{children}</TalkScreenContext>;
}

export function useTalkScreen(): TalkScreen {
	const talk = use(TalkScreenContext);
	if (!talk) {
		throw new Error("useTalkScreen needs a TalkScreenProvider above it");
	}
	return talk;
}

function Live({
	reopen,
	children,
}: {
	reopen?: { sessionId: Id<"sessions">; thread: ThreadLine[] };
	children: ReactNode;
}) {
	const value = useTalkScreenData(reopen);
	return <TalkScreenProvider value={value}>{children}</TalkScreenProvider>;
}

/**
 * The app's adapter: the talk on ElevenLabs and Convex. "Say more" (`?reopen=<session>`)
 * waits for the talk's thread first.
 */
export function TalkData({ children }: { children: ReactNode }) {
	const reopen = useReopenedThread();
	if (reopen === "loading") {
		return <View className="flex-1 bg-background" />;
	}
	return (
		<ConversationProvider>
			<Live reopen={reopen}>{children}</Live>
		</ConversationProvider>
	);
}
