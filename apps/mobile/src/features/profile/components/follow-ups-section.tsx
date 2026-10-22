import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { PressableFeedback } from "heroui-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { AppText } from "@/src/components/shared/app-text";

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

// The user's response, as a readable label for resolved rows.
const RESPONSE_LABEL: Record<string, string> = {
  lighter: "Feeling lighter",
  still_here: "Still sitting with it",
  heavier: "Got heavier",
  processed: "I worked through it",
  vent: "Let it out",
  dismissed: "Closed",
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

type RowProps = {
  card: Doc<"follow_up_cards">;
  onDismiss: (cardId: Doc<"follow_up_cards">["_id"]) => void;
};

function FollowUpRow({ card, onDismiss }: RowProps) {
  // Status chip + accessibility framing, per follow-up state.
  let chip: string;
  let chipClass: string;
  let muted = false;
  let tappable = false;

  switch (card.status) {
    case "resolved":
      chip = RESPONSE_LABEL[card.userResponse ?? "dismissed"] ?? "Answered";
      chipClass = "text-accent";
      break;
    case "expired":
      chip = formatDate(card.createdAt);
      chipClass = "text-foreground/40";
      muted = true;
      break;
    case "superseded":
      chip = "unresolved · no check-in coming";
      chipClass = "text-foreground/45";
      tappable = true;
      break;
    default: // pending | ready | shown
      chip = "check-in coming";
      chipClass = "text-foreground/45";
      muted = true;
  }

  const body = (
    <View
      className={`rounded-2xl bg-surface border border-overlay/20 px-4 py-3.5 ${
        muted ? "opacity-80" : ""
      }`}
    >
      <AppText
        numberOfLines={2}
        className="text-[13px] leading-5 text-foreground/75"
      >
        {card.cardText}
      </AppText>
      <View className="mt-2 flex-row items-center justify-between">
        <AppText className={`text-xs ${chipClass}`}>{chip}</AppText>
        {tappable && (
          <AppText className="text-xs text-foreground/35">tap to close</AppText>
        )}
      </View>
    </View>
  );

  if (!tappable) return body;

  return (
    <PressableFeedback
      onPress={() => onDismiss(card._id)}
      accessibilityRole="button"
      accessibilityLabel={`Dismiss unresolved follow-up: ${card.cardText}`}
    >
      {body}
    </PressableFeedback>
  );
}

/**
 * Profile Follow-Ups section. Built from the profile card vocabulary
 * (rounded-2xl bg-surface rows). Only renders when the user has follow-up
 * history. Superseded rows stay visible/tappable until an explicit dismiss.
 */
export function FollowUpsSection({ staggerDelay = 420 }: { staggerDelay?: number }) {
  const cards = useQuery(api.followUps.listForProfile, {});
  const resolveCard = useMutation(api.followUps.resolveCard);

  if (!cards || cards.length === 0) return null;

  const handleDismiss = (cardId: Doc<"follow_up_cards">["_id"]) => {
    void resolveCard({ cardId, response: "dismissed" });
  };

  return (
    <EaseView
      initialAnimate={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: "timing", duration: 280, easing: EASE, delay: staggerDelay }}
    >
      <View className="px-5 mt-8">
        <AppText className="text-lg text-foreground mb-3">
          Follow-Ups
        </AppText>
        <View className="gap-2.5">
          {cards.map((card) => (
            <FollowUpRow key={card._id} card={card} onDismiss={handleDismiss} />
          ))}
        </View>
      </View>
    </EaseView>
  );
}
