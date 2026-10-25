// The Hearth talk screen (#584, #593): the talk as a transcript under the
// native header, with an aurora rising behind the composer that brightens when
// either side speaks. Consent comes before the first word. "Say more" opens it
// again on its thread (#604), straight into the talk: consent was given.

import { ConversationProvider } from "@elevenlabs/react-native";
import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useConvex } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/src/components/shared/app-text";
import { ConsentCard } from "@/src/features/talk/consent-card";
import { TalkAurora } from "@/src/features/talk/talk-aurora";
import { TalkComposer } from "@/src/features/talk/talk-composer";
import { TalkHeader } from "@/src/features/talk/talk-header";
import { TalkHelp } from "@/src/features/talk/talk-help";
import { TalkLeaveDialog } from "@/src/features/talk/talk-leave-dialog";
import { TalkThread } from "@/src/features/talk/talk-thread";
import { useTalk } from "@/src/features/talk/use-talk";
import type { ThreadLine } from "@/src/features/talk/use-thread";

function Talk({
	reopen,
}: {
	reopen?: { sessionId: Id<"sessions">; thread: ThreadLine[] };
}) {
	const talk = useTalk(reopen);
	const insets = useSafeAreaInsets();
	// Once, on open.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => void (reopen && talk.start()), []);
	const footer =
		talk.connected || talk.wasLive || reopen ? (
			talk.error ? (
				<AppText className="text-center text-danger text-xs">
					{talk.error}
				</AppText>
			) : null
		) : (
			<ConsentCard talk={talk} />
		);
	return (
		<View className="flex-1 bg-background">
			<TalkAurora coverage={0.55} flip={1} level={talk.level} />
			{/* The thread and the composer lift together, so the latest line stays in view. */}
			<KeyboardAvoidingView
				behavior="padding"
				className="flex-1"
				keyboardVerticalOffset={8 - insets.bottom}
			>
				<TalkHeader talk={talk} />
				<TalkThread footer={footer} turns={talk.turns} />
				<TalkHelp sessionId={talk.sessionId} />
				{talk.connected && <TalkComposer talk={talk} />}
			</KeyboardAvoidingView>
			<TalkLeaveDialog talk={talk} />
		</View>
	);
}

export function TalkScreen() {
	const { reopen } = useLocalSearchParams<{ reopen?: string }>();
	const sessionId = reopen as Id<"sessions"> | undefined;
	const convex = useConvex();
	// Read once, not subscribed: every synced turn would re-send the whole thread
	// mid-call, and the talk keeps its own thread from here.
	const [thread, setThread] = useState<ThreadLine[] | Error>();
	useEffect(() => {
		if (sessionId) {
			void convex
				.query(api.talk.turns.thread, { sessionId })
				.then(setThread, setThread);
		}
	}, [convex, sessionId]);
	if (thread instanceof Error) {
		throw thread;
	}
	if (sessionId && thread === undefined) {
		return <View className="flex-1 bg-background" />;
	}
	return (
		<ConversationProvider>
			<Talk reopen={sessionId && thread ? { sessionId, thread } : undefined} />
		</ConversationProvider>
	);
}
