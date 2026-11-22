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

export type TalkHelp = FunctionReturnType<typeof api.talk.safety.help>;

export type TalkScreen = {
	state: {
		phase: Phase;
		reopened: boolean;
		name: string;
		presence: Presence;
		turns: readonly Turn[];
		muted: boolean;
		live: boolean;
		error: string | null;
		look: TalkLook;
		voice: VoiceSlug;
		pace: TalkPace;
		directness: Directness;
		view: TalkView;
		week: WeekLeft;
		micAsk: boolean;
		starting: boolean;
		/** A free person: the start screen shows, no talk can begin. */
		locked: boolean;
		sample: VoiceSlug | null;
		endsAt: number | null;
		clockFromS: number;
		help: TalkHelp;
		micLevel: SharedValue<number>;
	};
	actions: {
		begin: () => void;
		unlock: () => void;
		send: (text: string) => void;
		toggleMic: () => void;
		end: () => void;
		justEnd: () => void;
		setLook: (look: TalkLook) => void;
		pickVoice: (voice: VoiceSlug) => void;
		stopSample: () => void;
		setView: (view: TalkView) => void;
		openStyle: () => void;
		openKept: () => void;
		openHelp: () => void;
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
