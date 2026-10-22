import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";

type Props = {
  tags: string[];
  staggerDelay?: number;
};

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

export function EmotionChips({ tags, staggerDelay = 180 }: Props) {
  if (tags.length === 0) return null;

  const visible = tags.slice(0, 3);

  return (
    <EaseView
      initialAnimate={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 280, easing: EASE, delay: staggerDelay }}
    >
      <View className="mt-8 px-5">
        <AppText className="text-[11px] text-muted mb-3.5 tracking-widest uppercase">
          what keeps showing up
        </AppText>
        <View className="flex-row flex-wrap gap-2.5">
          {visible.map((tag) => (
            <View
              key={tag}
              className="px-4 py-2 rounded-full bg-resonance border border-resonance-foreground/20"
            >
              <AppText className="text-[15px] text-resonance-foreground lowercase">
                {tag}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </EaseView>
  );
}
