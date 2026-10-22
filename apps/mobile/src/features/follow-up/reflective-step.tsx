import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { PressableFeedback, Switch, TextArea, useToast } from "heroui-native";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppText } from "@/src/components/shared/app-text";
import { Icon, OptionCard } from "@/src/features/follow-up/stack-cards";
import { playAffirmativePress, playErrorNotice } from "@/src/lib/haptics";
import {
  REFLECTIVE_COPY,
  REFLECTIVE_DONE,
  REFLECTIVE_SAVED,
  REFLECTIVE_SAVED_SHARED,
  REFLECTIVE_SAVING,
  REFLECTIVE_SHARE_LABEL,
  REFLECTIVE_SKIP,
  streakNod,
  type ReflectiveAnswer,
} from "@/src/features/reflect/follow-up-copy";

// Mirrors REFLECTION_MAX_LENGTH in convex/followUpResponses.ts (not imported:
// that module is server code).
const MAX_LENGTH = 2000;

const TINT: Record<ReflectiveAnswer, string> = {
  lighter: "bg-success/20",
  processed: "bg-ember/25",
};

type Props = {
  answer: ReflectiveAnswer;
  cardId: Id<"follow_up_cards">;
  streak: number;
  /** False on acute / escalation cards (presence-first); the server also refuses acute and crisis. */
  canShare: boolean;
  onClose: () => void;
};

/**
 * The reflective next step for `lighter` (#449) and `processed` (#450): an
 * optional note on what helped, an optional anonymous share, and a nod to the
 * streak — `processed` adds a milestone line. Done persists the note (private
 * unless shared); Skip and X just leave — the chip answer already stands.
 */
export function ReflectiveStep({ answer, cardId, streak, canShare, onClose }: Props) {
  const posthog = usePostHog();
  const record = useMutation(api.followUpResponses.record);
  const contributeByDefault =
    useQuery(api.preferences.getContributeByDefault) ?? false;
  const [text, setText] = useState("");
  const [shareChoice, setShareChoice] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const hasText = text.trim().length > 0;
  const share = canShare && hasText && (shareChoice ?? contributeByDefault);
  const copy = REFLECTIVE_COPY[answer];
  const nod = streakNod(streak);

  const done = async () => {
    if (saving) return;
    setSaving(true);
    const saved = await record({ cardId, reflectionText: text, shareRequested: share }).catch(() => false);
    if (!saved) {
      // Keep the editor open with the note intact so the user can retry.
      setSaving(false);
      playErrorNotice();
      toast.show({ label: "Couldn't save that. Try again?" });
      return;
    }
    posthog.capture(`follow_up_${answer}_done`, {
      has_text: hasText,
      shared: share,
    });
    // An empty Done closes quietly — nothing was saved to acknowledge. The
    // toast provider sits above the route, so the toast outlives the close.
    if (hasText) {
      playAffirmativePress();
      toast.show({ label: share ? REFLECTIVE_SAVED_SHARED : REFLECTIVE_SAVED });
    }
    onClose();
  };

  return (
    <>
      <View className="-mb-8 overflow-hidden rounded-t-[36px] bg-surface">
        <View className={`${TINT[answer]} px-5 pb-12 pt-5`}>
          {copy.milestone && (
            <View className="mb-3 flex-row items-center gap-2.5">
              <Icon name="seal" size={24} />
              <AppText className="flex-1 font-medium text-base text-foreground">
                {copy.milestone}
              </AppText>
            </View>
          )}
          {nod && (
            <View
              className="mb-4 flex-row items-center gap-2"
              accessibilityLabel={`${streak}-day streak. ${nod}`}
            >
              <Icon name="flame" size={16} />
              <AppText className="flex-1 text-sm text-foreground/70">
                {nod}
              </AppText>
            </View>
          )}
          <TextArea
            value={text}
            onChangeText={setText}
            placeholder={copy.placeholder}
            maxLength={MAX_LENGTH}
            accessibilityLabel={copy.inputA11y}
            className="min-h-28"
          />
          {canShare && (
            <View className="mt-4 flex-row items-center gap-3">
              <AppText
                className={
                  hasText
                    ? "flex-1 text-foreground"
                    : "flex-1 text-foreground/40"
                }
              >
                {REFLECTIVE_SHARE_LABEL}
              </AppText>
              <Switch
                isSelected={share}
                isDisabled={!hasText}
                onSelectedChange={setShareChoice}
                accessibilityLabel={REFLECTIVE_SHARE_LABEL}
              >
                <Switch.Thumb />
              </Switch>
            </View>
          )}
        </View>
      </View>
      <OptionCard
        icon="check"
        tint="bg-surface"
        title={saving ? REFLECTIVE_SAVING : REFLECTIVE_DONE}
        onPress={done}
      />
      <View className="items-center bg-surface pt-4">
        <PressableFeedback
          onPress={onClose}
          accessibilityRole="button"
          hitSlop={12}
          className="min-h-11 items-center justify-center"
        >
          <AppText className="text-sm text-foreground/55">
            {REFLECTIVE_SKIP}
          </AppText>
        </PressableFeedback>
      </View>
    </>
  );
}
