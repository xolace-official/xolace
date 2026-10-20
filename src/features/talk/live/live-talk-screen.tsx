// Bare live talk (#591): proves the voice loop end to end on a dev build.
// No design; the Hearth screen (#584) replaces this.
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { ConversationProvider, useConversation } from "@elevenlabs/react-native";
import { useAction } from "convex/react";
import { Button } from "heroui-native";
import { api } from "@/convex/_generated/api";
import { AppText } from "@/src/components/shared/app-text";

type Line = { id: number; who: "you" | "companion"; text: string };

function LiveTalk() {
  const getToken = useAction(api.talk.live.conversationToken);
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { startSession, endSession, status, isSpeaking } = useConversation({
    onMessage: ({ message, role, event_id }) =>
      setLines((prev) => [...prev, { id: event_id, who: role === "user" ? "you" : "companion", text: message }]),
    onError: (message) => setError(message),
    // #591 measurement: line these up against the server's `[talk] turn` logs.
    onInterruption: () => console.log("[talk] interrupted", Date.now()),
  });

  const start = async () => {
    setError(null);
    setLines([]);
    try {
      startSession({
        conversationToken: await getToken(),
        // #591 measurement: does this reach our endpoint on every turn? Needs
        // the agent's `custom_llm_extra_body` override on.
        customLlmExtraBody: { probe: "talk-live" },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const live = status === "connected" || status === "connecting";

  return (
    <View className="flex-1 gap-4 bg-background px-5 pb-10 pt-20">
      <AppText className="text-sm text-muted">
        {status}
        {status === "connected" ? (isSpeaking ? " · speaking" : " · listening") : ""}
      </AppText>
      <ScrollView className="flex-1" contentContainerClassName="gap-3">
        {lines.map((l) => (
          <AppText key={`${l.who}-${l.id}`} className={l.who === "you" ? "text-foreground" : "text-accent"}>
            {l.text}
          </AppText>
        ))}
      </ScrollView>
      {error && <AppText className="text-danger">{error}</AppText>}
      <Button onPress={live ? endSession : start}>
        <Button.Label>{live ? "End talk" : "Start talk"}</Button.Label>
      </Button>
    </View>
  );
}

export function LiveTalkScreen() {
  return (
    <ConversationProvider>
      <LiveTalk />
    </ConversationProvider>
  );
}
