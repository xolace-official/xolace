import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { CardInfo } from "./card-info";

const WORDS_INFO =
  "These are the recurring words from your own writing; your language, not ours. They surface here once a few have started to return.";

type Props = {
  staggerDelay?: number;
};

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

// Honest placeholder for users without enough distinct language yet.
// No fabricated words, no blur — just the promise of what will surface.
export function WordsTeaserEmpty({ staggerDelay = 360 }: Props) {
  return (
    <EaseView
      initialAnimate={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 280, easing: EASE, delay: staggerDelay }}
      className="mx-5"
    >
      <View className="rounded-3xl bg-surface border border-border/65 overflow-hidden">
        <View className="px-5 pt-5 pb-3 flex-row items-center gap-1.5">
          <AppText className="text-[11px] font-medium text-muted tracking-widest uppercase">
            Words that keep finding you
          </AppText>
          <CardInfo title="Words that keep finding you" description={WORDS_INFO} />
        </View>

        <View className="px-5 pb-6">
          <AppText className="text-sm text-foreground/70">
            Your words will surface here as you keep writing.
          </AppText>
          <AppText className="text-[11px] tracking-wide text-muted/70 mt-1.5">
            The ones that keep returning rise to the top.
          </AppText>
        </View>
      </View>
    </EaseView>
  );
}
