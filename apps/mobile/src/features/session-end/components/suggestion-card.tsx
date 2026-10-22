import { View } from "react-native";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { SymbolView } from "expo-symbols";
import { specialtyListensTo } from "@/convex/lib/specialties";
import { AppText } from "@/src/components/shared/app-text";
import { XolacerAvatar } from "@/src/features/xolacer-chat/components/xolacer-avatar";
import {
  NewXolacerChip,
  RatingStars,
} from "@/src/features/xolacer-chat/components/rating-stars";

type Props = {
  displayName: string;
  photoUrl?: string;
  specialty: string;
  rating?: number;
  ratingCount: number;
  onPress: () => void;
};

/**
 * The close-phase offer when a session is suggestion-eligible: one named
 * xolacer, in the slot the Bridge card holds otherwise.
 *
 * Copy is deliberately a fact about what this person declared, never a claim
 * that they fit *this* user — at the current roster size a named suggestion is
 * close to "whoever declared this specialty", and the card must not overclaim.
 * It also avoids the Bridge card's "Suggested for you" sparkle chip: this must
 * not read as an algorithmic assignment of a human being.
 */
export const SuggestionCard = ({
  displayName,
  photoUrl,
  specialty,
  rating,
  ratingCount,
  onPress,
}: Props) => {
  const accentColor = useThemeColor("accent") as string;

  return (
    <PressableFeedback
      onPress={onPress}
      // Carries the disclosure, not just the name: PressableFeedback groups its
      // children into one node, so the "trained peer, not a therapist" line
      // below is never read otherwise — and that line is the whole basis for
      // what someone is agreeing to walk into.
      accessibilityLabel={`${displayName} listens to ${specialtyListensTo(specialty)}. A trained peer, not a therapist. Opens their profile — nothing is sent.`}
      accessibilityRole="button"
      className="w-full overflow-hidden rounded-3xl border border-accent/30 bg-accent/[0.07] p-5"
    >
      <PressableFeedback.Highlight
        animation={{
          backgroundColor: { value: accentColor },
          opacity: { value: [0, 0.08] },
        }}
      />

      {/* Face first — the card offers a person, not a category. */}
      <View className="flex-row items-center justify-between mb-4">
        <XolacerAvatar name={displayName} photoUrl={photoUrl} />
        {rating === undefined ? (
          <NewXolacerChip />
        ) : (
          <RatingStars rating={rating} ratingCount={ratingCount} />
        )}
      </View>

      <AppText className="font-serif text-xl text-foreground leading-7 mb-1.5">
        {displayName} listens to {specialtyListensTo(specialty)}.
      </AppText>
      <AppText className="text-sm font-light text-foreground/55 leading-5">
        A trained peer, not a therapist. Nothing is sent — this only opens their
        profile.
      </AppText>

      <View className="h-px bg-accent/15 mt-4 mb-3" />
      <View className="flex-row items-center justify-between">
        <AppText className="text-sm font-medium text-accent">
          Read their profile
        </AppText>
        <SymbolView
          name={{
            ios: "arrow.right",
            android: "arrow_forward",
            web: "arrow_forward",
          }}
          size={14}
          tintColor={accentColor}
        />
      </View>
    </PressableFeedback>
  );
};
