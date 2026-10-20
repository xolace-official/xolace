// The Hearth talk screen (#584, #593): the talk as a transcript under the
// native header, with an aurora rising behind the composer that brightens when
// either side speaks. Consent comes before the first word.
import { View } from "react-native";
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

function Talk() {
  const talk = useTalk();
  const insets = useSafeAreaInsets();
  const footer = !talk.connected ? (
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
  return (
    <ConversationProvider>
      <Talk />
    </ConversationProvider>
  );
}
