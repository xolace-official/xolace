import { useState } from "react";
import { View } from "react-native";
import { Button, TextArea, PressableFeedback, useToast } from "heroui-native";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppText } from "@/src/components/shared/app-text";
import { cn } from "@/src/lib/utils";
import { useStableQuery } from "@/src/lib/convex/use-stable-query";
import { useTray } from "../engine/tray-provider";
import { useFeedbackContext } from "../use-feedback-context";

const MAX_LENGTH = 1000;
type Kind = "bug" | "idea" | "concern";

const COPY: Record<
  Kind,
  { title: string; placeholder: string; rateLimited: string; sent: string }
> = {
  bug: {
    title: "Report a bug",
    placeholder: "What happened? What did you expect instead?",
    rateLimited: "You've sent a lot of feedback today. Come back tomorrow.",
    sent: "We read every piece of feedback.",
  },
  idea: {
    title: "Suggest an idea",
    placeholder: "What would you love to see?",
    rateLimited: "You've sent a lot of feedback today. Come back tomorrow.",
    sent: "We read every piece of feedback.",
  },
  concern: {
    title: "Report a concern",
    placeholder:
      "What happened? Anything you can tell us helps us look into it.",
    // Mirrors the server's message. A rate-limited reporter may have a real
    // safety problem and no route left in the app, so the copy names one.
    rateLimited:
      "You've reached today's report limit. If this is urgent, email support@xolaceinc.com and a human will pick it up.",
    sent: "A person on our team reads every report.",
  },
};

function extractErrorMessage(e: unknown): string {
  if (!(e instanceof Error)) return "Something went wrong";
  const match = e.message.match(/Uncaught Error: (.+?)(?:\n|$)/);
  return match ? match[1] : e.message;
}

export type ReportSubject = {
  /** Stable identity of the person being reported. */
  profileId: Id<"emotional_profiles">;
  /** Form copy only — never sent to the backend. Names repeat and change. */
  name: string;
  /** Present when the concern was raised inside a thread. */
  conversationId?: Id<"xolacer_conversations">;
};

/**
 * Bug | idea report form, plus a concern mode for reporting a person.
 */
export const ReportForm = ({
  kind: initialKind,
  subject,
}: {
  kind: Kind;
  subject?: ReportSubject;
}) => {
  const [kind, setKind] = useState<Kind>(initialKind);
  const isConcern = initialKind === "concern";
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { dismiss } = useTray();
  const { toast } = useToast();
  const posthog = usePostHog();
  const context = useFeedbackContext();

  const submit = useMutation(api.productFeedback.submit);
  // Stable: `kind` changes on a Bug/Idea tap, and a plain `useQuery` returns
  // `undefined` while the new budget loads — long enough for `isRateLimited` to
  // fall back to false, dropping the notice and re-enabling submit mid-tap.
  const canSubmit = useStableQuery(api.productFeedback.canSubmit, { kind });

  const isRateLimited = canSubmit === false;
  const isDisabled = isSaving || !text.trim() || isRateLimited;

  const handleSubmit = async () => {
    if (isDisabled) return;
    setIsSaving(true);
    setError(null);
    try {
      await submit({
        kind,
        text: text.trim(),
        context,
        subjectProfileId: subject?.profileId,
        conversationId: subject?.conversationId,
      });
      posthog.capture("product_feedback_submitted", { kind });
      toast.show({
        label: "Thank you.",
        description: COPY[kind].sent,
      });
      dismiss();
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="gap-3">
      <AppText className="text-lg font-semibold text-foreground">
        {COPY[kind].title}
      </AppText>

      {/* Names the person so the reporter can confirm the subject before
          sending. The name is display-only — the id is what gets submitted. */}
      {isConcern && subject && (
        <AppText className="text-sm text-foreground/65">
          About {subject.name}
        </AppText>
      )}

      {!isConcern && (
        <View className="flex-row gap-2">
          {(["bug", "idea"] as const).map((k) => {
            const active = k === kind;
            return (
              <PressableFeedback
                key={k}
                onPress={() => setKind(k)}
                accessibilityLabel={k === "bug" ? "Report a bug" : "Suggest an idea"}
                className={cn(
                  "flex-1 items-center rounded-full py-2.5",
                  active ? "bg-accent" : "bg-foreground/5",
                )}
              >
                <AppText
                  className={cn(
                    "text-sm",
                    active ? "text-accent-foreground" : "text-foreground/65",
                  )}
                >
                  {k === "bug" ? "Bug" : "Idea"}
                </AppText>
              </PressableFeedback>
            );
          })}
        </View>
      )}

      <TextArea
        value={text}
        onChangeText={(t: string) => {
          setText(t);
          setError(null);
        }}
        placeholder={COPY[kind].placeholder}
        maxLength={MAX_LENGTH}
        isDisabled={isSaving}
        className="min-h-30"
        accessibilityHint="Up to 1000 characters"
        autoFocus
      />

      <AppText className="text-xs text-foreground/30 text-right">
        {text.length} / {MAX_LENGTH}
      </AppText>

      {isRateLimited && (
        <AppText className="text-xs text-foreground/55">
          {COPY[kind].rateLimited}
        </AppText>
      )}

      {error && <AppText className="text-xs text-danger/80">{error}</AppText>}

      <Button
        variant="primary"
        onPress={handleSubmit}
        isDisabled={isDisabled}
        accessibilityLabel={isConcern ? "Send report" : "Send feedback"}
      >
        {isSaving ? "Sending..." : "Send"}
      </Button>
    </View>
  );
};
