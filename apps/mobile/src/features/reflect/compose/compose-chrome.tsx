import { View } from "react-native";
import { SymbolView } from "expo-symbols";
import { useRouter } from "expo-router";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { useCSSVariable } from "uniwind";
import { useQuery } from "convex/react";
import { useFullContext } from "@/src/lib/convex/use-full-context";
import { api } from "@/convex/_generated/api";
import { AppText } from "@/src/components/shared/app-text";
import { StreakCalendar } from "@/src/features/reflect/components/streak-calendar";
import type { UserVariant } from "@/src/features/reflect/types";
import { playSoftPress } from "@/src/lib/haptics";

const QUOTE_ICON_NAME = { ios: "sparkles", android: "auto_awesome" } as const;
const EVENT_ICON_NAME = {
  ios: "heart.fill",
  android: "favorite",
  web: "favorite",
} as const;

type Props = {
  variant: UserVariant;
  eventPrompt: string | null;
  eventLabel: string | null;
  spaceName?: string;
};

/**
 * The Perch strip: one thin row above the card (#257).
 *
 * Who the user is here — streak, space name, the event they're inside — and the
 * one other way in, collected onto a single line so the chrome informs without
 * competing with the card. There is no encouragement line any more: Flux and
 * the prompt carry that, and a second reassuring sentence only said it twice.
 *
 * The strip is identity, so it no longer defers to whatever the card is
 * saying. The event pill tracks the event period rather than the card: the
 * card shows one prompt and night or a quiet return may outrank the event's,
 * but the user is still inside the event either way. The streak card is always
 * present, reading 0 when there is no live streak: it anchors the left of the
 * strip, and a counter that vanishes the moment it lapses hides exactly the
 * fact it exists to report.
 *
 * Beside the calendar the strip is two lines: space name and "A word for
 * today" on top, the event pill alone underneath. In one row they split the
 * width and a long event label ("Breast Cancer Awareness Month") truncated;
 * on its own line the event gets the full width, and the two lines fit in the
 * calendar's height, so the strip is no taller.
 */
export const ComposeChrome = ({
  variant,
  eventPrompt,
  eventLabel,
  spaceName,
}: Props) => {
  const router = useRouter();
  const accentColor = useThemeColor("accent") as string;
  const [eventColor] = useCSSVariable(["--color-event"]);
  const todayQuotes = useQuery(api.dailyQuotes.getToday);
  const hasQuote = !!(todayQuotes?.session ?? todayQuotes?.curated);
  const context = useFullContext();

  return (
    <View className="flex-row items-center gap-2 pb-3">
      <StreakCalendar
        currentStreak={
          variant.kind === "returning" ? 0 : (variant.dayCount ?? 0)
        }
        reviveStreak={context?.reviveStreak}
      />

      <View className="flex-1 gap-1.5">
        <View className="flex-row items-center gap-2">
          {!!spaceName && (
            <View className="shrink rounded-full bg-accent/15 px-3 py-1">
              <AppText
                className="text-xs font-semibold text-accent"
                numberOfLines={1}
              >
                {spaceName}
              </AppText>
            </View>
          )}

          <View className="flex-1" />

          {hasQuote && (
            <PressableFeedback
              onPress={() => {
                playSoftPress();
                router.push("/(protected)/quotes");
              }}
              accessibilityLabel="Open today's reflection"
              hitSlop={8}
            >
              <View className="flex-row items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5">
                <SymbolView
                  name={QUOTE_ICON_NAME}
                  size={11}
                  tintColor={accentColor}
                />
                <AppText className="text-xs font-medium text-accent/80">
                  A word for today
                </AppText>
              </View>
            </PressableFeedback>
          )}
        </View>

        {!!eventPrompt && (
          <View className="max-w-full flex-row items-center gap-1.5 self-start rounded-full bg-event/15 px-3 py-1">
            <SymbolView
              name={EVENT_ICON_NAME}
              size={11}
              tintColor={String(eventColor)}
            />
            <AppText
              className="shrink text-xs font-semibold text-event"
              numberOfLines={1}
            >
              {eventLabel ?? "This month"}
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
};
