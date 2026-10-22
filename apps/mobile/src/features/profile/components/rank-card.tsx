import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { EmberField } from "./ember-field";
import { CardInfo } from "./card-info";

// Answers the two questions the number actually raises — who am I counted
// against, and when does it show up. The tie-breaking rule and the population
// floor are true but not the user's problem; they live in the code, not here.
const RANK_INFO =
  "Counted against everyone who has reflected at least once — not everyone who signed up. Appears after 5 moments.";

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

export type RankState =
  | { status: "ranked"; percentile: number; sessionCount: number }
  | { status: "pending"; sessionCount: number; threshold: number; remaining: number }
  | { status: "warming"; sessionCount: number };

type Props = {
  rank: RankState;
  staggerDelay?: number;
};

/**
 * Percentile card. Renders from the first launch — before the rank exists it
 * shows the unlit field and names what it's waiting for, so a new user sees a
 * promise rather than an absent card.
 */
export function RankCard({ rank, staggerDelay = 300 }: Props) {
  return (
    <EaseView
      initialAnimate={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 300, easing: EASE, delay: staggerDelay }}
      className="px-5"
    >
      <View className="rounded-3xl bg-surface border border-border/65 p-5">
        <View className="flex-row items-center gap-2">
          <AppText className="text-[10px] text-muted tracking-widest uppercase">
            among the fires
          </AppText>
          <CardInfo title="Among the fires" description={RANK_INFO} />
        </View>

        {rank.status === "ranked" ? (
          <View className="mt-3">
            {/* The figure gets its own line rather than sitting inline: a 46px
                glyph nested inside a 15px line box is clipped at the ascender
                by RN's text layout, and the number is the point of the card. */}
            <AppText className="text-[46px] leading-13 text-ember font-bold tracking-tight">
              {rank.percentile}%
            </AppText>
            <AppText className="text-[15px] text-foreground/85 leading-6 mt-1">
              of campers here reflect less than you.
            </AppText>
          </View>
        ) : (
          <AppText className="text-[15px] text-foreground/70 leading-6 mt-3">
            Where you sit among everyone who reflects here.
          </AppText>
        )}

        <View className="mt-5 mb-4">
          <EmberField
            percentile={rank.status === "ranked" ? rank.percentile : null}
          />
        </View>

        <AppText className="text-[12px] text-muted/85">
          {rank.status === "ranked"
            ? `${rank.sessionCount} ${rank.sessionCount === 1 ? "moment" : "moments"} you didn't look away from.`
            : rank.status === "warming"
              ? "You're ready. Waiting on a few more people around the fire."
              : rank.sessionCount === 0
                ? "Lights up after 5 moments. Your first one starts it."
                : `Lights up after ${rank.threshold} moments — ${rank.remaining} to go.`}
        </AppText>
      </View>
    </EaseView>
  );
}
