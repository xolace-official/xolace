// The Hearth talk screen (#584, #593): the talk as a transcript under the
// native header, with an aurora rising behind the composer that brightens when
// either side speaks. Consent comes before the first word. "Say more" opens it
// again on its thread (#604), straight into the talk: consent was given.
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConversationProvider } from "@elevenlabs/react-native";
import { AppText } from "@/src/components/shared/app-text";
import { ConsentCard } from "./consent-card";
import { TalkAurora } from "./talk-aurora";
import { TalkComposer } from "./talk-composer";
import { TalkHeader } from "./talk-header";
import { TalkHelp } from "./talk-help";
import { TalkThread } from "./talk-thread";
import { useTalk } from "./use-talk";
import type { ThreadLine } from "./use-thread";

function Talk({ reopen }: { reopen?: { sessionId: Id<"sessions">; thread: ThreadLine[] } }) {
  const talk = useTalk(reopen);
  const insets = useSafeAreaInsets();
  // Once, on open.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void (reopen && talk.start()), []);
  const footer = !talk.connected && !talk.wasLive && !reopen ? (
    <ConsentCard talk={talk} />
  ) : talk.error ? (
    <AppText className="text-center text-xs text-danger">{talk.error}</AppText>
  ) : null;
  return (
    <View className="flex-1 bg-background">
      <TalkAurora level={talk.level} flip={1} coverage={0.55} />
      {/* The thread and the composer lift together, so the latest line stays in view. */}
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={8 - insets.bottom} className="flex-1">
        <TalkHeader talk={talk} />
        <TalkThread turns={talk.turns} footer={footer} />
        <TalkHelp sessionId={talk.sessionId} />
        {talk.connected && <TalkComposer talk={talk} />}
      </KeyboardAvoidingView>
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
    if (sessionId) void convex.query(api.talk.turns.thread, { sessionId }).then(setThread, setThread);
  }, [convex, sessionId]);
  if (thread instanceof Error) throw thread;
  if (sessionId && thread === undefined) return <View className="flex-1 bg-background" />;
  return (
    <ConversationProvider>
      <Talk reopen={sessionId && thread ? { sessionId, thread } : undefined} />
    </ConversationProvider>
  );
}
