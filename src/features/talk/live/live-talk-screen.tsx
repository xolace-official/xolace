// Bare live talk (#591): proves the voice loop end to end on a dev build.
// No design; the Hearth screen (#584) replaces this. A talk is a session
// (#592): ending it hands off to the reflect screens' processing → mirror.
import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { ConversationProvider, useConversation } from "@elevenlabs/react-native";
import { useAction, useMutation } from "convex/react";
import { Button } from "heroui-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppText } from "@/src/components/shared/app-text";

type Line = { id: number; who: "you" | "companion"; text: string };

function LiveTalk() {
  const startTalk = useAction(api.talk.live.start);
  const attachConversation = useMutation(api.talk.session.attachConversation);
  const endTalk = useMutation(api.talk.session.end);
  // The open talk's session; cleared once ended so a second disconnect is a no-op.
  const talk = useRef<Id<"sessions"> | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);

  // However the talk ended (the person, end_call, a dropped line).
  const finish = async () => {
    const sessionId = talk.current;
    talk.current = null;
    if (!sessionId) return;
    try {
      // The reflect screen picks the session up via getActive and takes it
      // through processing → mirror.
      if (await endTalk({ sessionId })) router.replace("/");
      else setError("Nothing was said, so there's no mirror.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const { startSession, endSession, status, isSpeaking } = useConversation({
    onConnect: ({ conversationId }) => {
      if (talk.current) attachConversation({ sessionId: talk.current, conversationId }).catch(console.warn);
    },
    onDisconnect: () => void finish(),
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
      const { token, sessionId, talkKey } = await startTalk();
      talk.current = sessionId;
      startSession({
        conversationToken: token,
        // Relayed to our endpoint on every turn (#591), binding it to this
        // talk's session. Needs the agent's `custom_llm_extra_body` override on.
        customLlmExtraBody: { sessionId, talkKey },
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
