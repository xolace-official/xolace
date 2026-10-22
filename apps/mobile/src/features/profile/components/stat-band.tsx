import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { FADE_IN, FADE_OUT, GlassSurface } from "@/src/components/shared/glass-surface";

type Stat = { value: string; label: string; sub?: string; amber?: boolean };

type Props = {
  sessionCount: number;
  currentStreak: number;
  longestStreak: number;
  usualDay: string | null;
  staggerDelay?: number;
};

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

export function StatBand({
  sessionCount,
  currentStreak,
  longestStreak,
  usualDay,
  staggerDelay = 120,
}: Props) {
  const stats: Stat[] = [
    { value: String(sessionCount), label: sessionCount === 1 ? "Moment" : "Moments" },
    {
      value: currentStreak > 0 ? String(currentStreak) : "—",
      label: "Day streak",
      // Show the personal best only when it beats the current run — when the
      // current streak is the record, the big number already says it.
      sub: longestStreak > currentStreak ? `Best ${longestStreak}` : undefined,
      amber: currentStreak > 0,
    },
  ];
  if (usualDay) stats.push({ value: usualDay, label: "Usual day" });

  return (
    // Glass stops rendering under an animated opacity, so the fade only runs where there is no glass.
    <EaseView
      initialAnimate={{ translateY: 8, ...FADE_IN }}
      animate={{ translateY: 0, ...FADE_OUT }}
      transition={{ type: "timing", duration: 300, easing: EASE, delay: staggerDelay }}
      className="px-5 mt-7"
    >
      <GlassSurface radius={24} className="flex-row py-5 px-3">
        {stats.map((s, i) => (
          <View
            key={s.label}
            className={`flex-1 items-center px-1.5 ${i > 0 ? "border-l border-separator/50" : ""}`}
          >
            <AppText
              className={`text-[21px] font-bold tracking-tight ${s.amber ? "text-ember" : "text-foreground"}`}
            >
              {s.value}
            </AppText>
            <AppText className="text-[10.5px] text-muted/80 tracking-wide uppercase mt-1">
              {s.label}
            </AppText>
            {s.sub ? (
              <AppText className="text-[9.5px] text-ember/70 tracking-wide mt-0.5">
                {s.sub}
              </AppText>
            ) : null}
          </View>
        ))}
      </GlassSurface>
    </EaseView>
  );
}
