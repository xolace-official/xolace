import type { TextInputInstance } from 'react-native';
import { useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { PressableFeedback } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { Presets } from "react-native-pulsar";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/src/components/shared/app-text";

/** Mirrors `REPLY_MAX_LENGTH` in convex/dailyQuotes.ts, which is the fence. */
const REPLY_MAX_LENGTH = 500;

/** The counter is noise until the cap is actually in reach. */
const COUNTER_FROM = REPLY_MAX_LENGTH - 80;

/**
 * The composer on the deck card: write back to today's thought (#313).
 *
 * Three states — collapsed (nothing typed, nothing sent), composing (the box
 * has grown, the pill is live), and sent ("Kept safe", or the crisis view when
 * moderation flagged it). Sent is editable: one reply per quote, overwritten.
 *
 * Everything here is on `--poster-*`: the deck is the poster's second sheet,
 * not themed chrome (#305). `reachSubline` is premium AND session-in-window —
 * only then does a reply actually reach tomorrow.
 */
export function ComposePanel({
  reply,
  flagged,
  reachSubline,
  remembered,
  isSending,
  onSend,
}: {
  reply?: string;
  flagged: boolean;
  reachSubline: boolean;
  remembered: boolean;
  isSending: boolean;
  onSend: (text: string) => Promise<void>;
}) {
  const router = useRouter();
  const posthog = usePostHog();
  const inputRef = useRef<TextInputInstance>(null);
  const [draft, setDraft] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [focused, setFocused] = useState(false);
  // Once per mount: refocusing after a blur is the same attempt, and without
  // this `quote_replied` has no denominator to measure abandonment against.
  const startedRef = useRef(false);

  const [faint, ink] = useCSSVariable([
    "--color-poster-ink-faint",
    "--color-poster-ink",
  ]) as string[];

  const trimmed = draft.trim();
  const composing = focused || trimmed.length > 0;
  const canSend = trimmed.length > 0 && !isSending;

  const handleSend = async () => {
    if (!canSend) return;
    Presets.flick();
    inputRef.current?.blur();
    try {
      await onSend(trimmed);
      setDraft("");
      setIsEditing(false);
    } catch {
      // The panel stays in composing with the text intact — the screen logs it.
    }
  };

  if (reply !== undefined && !isEditing) {
    return (
      <SentPanel
        reply={reply}
        flagged={flagged}
        reachSubline={reachSubline}
        remembered={remembered}
        onEdit={() => {
          Presets.flick();
          setDraft(reply);
          setIsEditing(true);
        }}
        onOpenResources={() =>
          router.push("/crisis-resources?from=quote_reply")
        }
      />
    );
  }

  return (
    <View className="gap-2">
    {/* items-start, not items-end: the box grows downward as it fills, and a
        bottom-aligned pill grows straight down under the keyboard's prediction
        bar with it. Pinned to the first line, it stays reachable at any length. */}
    <View className="flex-row items-start gap-2.5 rounded-[20px] bg-poster-field p-2.5">
      <TextInput
        ref={inputRef}
        value={draft}
        onChangeText={setDraft}
        onFocus={() => {
          setFocused(true);
          if (!startedRef.current) {
            startedRef.current = true;
            posthog.capture("quote_reply_started", { is_edit: reply !== undefined });
          }
        }}
        onBlur={() => setFocused(false)}
        multiline
        maxLength={REPLY_MAX_LENGTH}
        placeholder="What does this bring for you?"
        placeholderTextColor={faint}
        accessibilityLabel="Reply to today's thought"
        style={[
          styles.input,
          { color: ink, minHeight: composing ? 76 : 26 },
        ]}
      />

      <View className="items-end gap-1">
        <PressableFeedback
          onPress={handleSend}
          isDisabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send reply"
        >
          <View
            className="h-9 items-center justify-center rounded-full bg-poster-send px-5"
            style={canSend ? undefined : styles.pillDim}
          >
            <AppText className="text-[14px] font-semibold text-poster-ink">
              {isSending ? "Sending" : "Share"}
            </AppText>
          </View>
        </PressableFeedback>
        {composing && trimmed.length >= COUNTER_FROM && (
          <AppText className="text-[11px] text-poster-ink-faint">
            {REPLY_MAX_LENGTH - draft.length}
          </AppText>
        )}
      </View>
    </View>

    {/* Editing an already-sent reply: a way back to it without sending. */}
    {isEditing && (
      <View className="flex-row justify-end px-1">
        <PressableFeedback
          onPress={() => {
            setDraft("");
            setIsEditing(false);
          }}
          accessibilityRole="button"
          accessibilityLabel="Cancel editing"
        >
          <AppText className="text-[13px] text-poster-ink-soft underline">
            Cancel
          </AppText>
        </PressableFeedback>
      </View>
    )}
    </View>
  );
}

function SentPanel({
  reply,
  flagged,
  reachSubline,
  remembered,
  onEdit,
  onOpenResources,
}: {
  reply: string;
  flagged: boolean;
  reachSubline: boolean;
  remembered: boolean;
  onEdit: () => void;
  onOpenResources: () => void;
}) {
  return (
    <View className="gap-3">
      <View className="rounded-[20px] bg-poster-field px-4 py-3.5">
        <AppText className="text-[15px] leading-[22px] text-poster-ink">
          {reply}
        </AppText>
      </View>

      {flagged ? (
        // Nothing was mirrored, so there is no verdict to hand back — what
        // replaces the confirmation is the offer, not a diagnosis (#313).
        <View className="rounded-[20px] border border-poster-hairline px-4 py-3.5">
          <AppText className="text-[14px] leading-[21px] text-poster-ink">
            That sounds heavy to be carrying alone.
          </AppText>
          <PressableFeedback
            onPress={onOpenResources}
            accessibilityRole="button"
            accessibilityLabel="See support resources"
          >
            <AppText className="mt-2 text-[14px] font-semibold text-poster-ink underline">
              Support is here if you want it →
            </AppText>
          </PressableFeedback>
        </View>
      ) : (
        <View className="px-1">
          <AppText className="font-poster-display text-[15px] text-poster-ink">
            KEPT SAFE
          </AppText>
          <AppText className="mt-0.5 text-[13px] leading-[19px] text-poster-ink-soft">
            {/* "This stays yours" was true when a reply was inert. It no
                longer is: with personal memory on, it also goes into what
                Xolace understands of you (#315). The two destinations are
                independent, so a reply can reach both — only a reply that
                reaches neither is still nothing but kept. */}
            {reachSubline && remembered
              ? "Tomorrow's thought will listen. It stays in what Xolace knows of you."
              : reachSubline
                ? "Tomorrow's thought will listen to what you just said."
                : remembered
                  ? "Yours only — and it stays in what Xolace knows of you."
                  : "This stays yours."}
          </AppText>
        </View>
      )}

      <View className="flex-row justify-end px-1">
        <PressableFeedback
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel="Edit your reply"
        >
          <AppText className="text-[13px] text-poster-ink-soft underline">
            Edit
          </AppText>
        </PressableFeedback>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 4,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: "top",
  },
  pillDim: { opacity: 0.45 },
});
