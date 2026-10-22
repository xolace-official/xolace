import { ScrollView, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { EaseView } from "react-native-ease/uniwind";
import { Button, useThemeColor } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { BridgeIntroMascot } from "@/src/features/trusted-bridge/components/bridge-intro-mascot";

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const FADE_OUT = { opacity: 0 };
const FADE_IN = { opacity: 1 };
const SLIDE_OUT = { opacity: 0, translateY: 14 };
const SLIDE_IN = { opacity: 1, translateY: 0 };

const PRIVACY_ITEMS = [
  {
    symbol: { ios: "lock.shield.fill", android: "security", web: "security" },
    title: "Never stored",
    sub: "Who you're writing to is never saved.",
  },
  {
    symbol: { ios: "sparkles", android: "auto_awesome", web: "auto_awesome" },
    title: "Used only to write this",
    sub: "Their name shapes the draft, then it's discarded.",
  },
  {
    symbol: { ios: "hand.raised.fill", android: "back_hand", web: "back_hand" },
    title: "Nothing sends itself",
    sub: "Only you decide if it goes.",
  },
] as const;

const styles = StyleSheet.create({
  scrollContainer: { paddingHorizontal: 32, paddingTop: 24, paddingBottom: 16, gap: 28 }
});

type Props = { onBegin: () => void };

export function BridgeIntro({ onBegin }: Props) {
  const accentColor = useThemeColor("accent") as string;
  const iconBg = (useThemeColor("foreground") as string) + "12";

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >

        {/* Mascot — crossfades from holding the boat to sending it off */}
        <EaseView
          initialAnimate={FADE_OUT}
          animate={FADE_IN}
          transition={{ type: "timing", duration: 700, easing: EASING }}
        >
          <BridgeIntroMascot />
        </EaseView>

        {/* Headline + problem statement */}
        <EaseView
          initialAnimate={SLIDE_OUT}
          animate={SLIDE_IN}
          transition={{ type: "timing", duration: 500, delay: 200, easing: EASING }}
          className="gap-3"
        >
          <AppText className="text-3xl leading-10 text-foreground">
            Felt it.{"\n"}Now find the words.
          </AppText>
          <AppText className="text-sm font-light leading-6 text-foreground/55">
            Processing is one thing. Telling someone who matters is another.
            Trusted Bridge turns what you felt into something you can actually say.
          </AppText>
        </EaseView>

        {/* Privacy rows */}
        <View className="gap-4">
          {PRIVACY_ITEMS.map(({ symbol, title, sub }, i) => (
            <EaseView
              key={title}
              initialAnimate={SLIDE_OUT}
              animate={SLIDE_IN}
              transition={{ type: "timing", duration: 500, delay: 400 + i * 100, easing: EASING }}
              className="flex-row items-center gap-4"
            >
              <View
                className="size-10 rounded-2xl items-center justify-center shrink-0"
                style={{ backgroundColor: iconBg }}
              >
                <SymbolView name={symbol} size={18} tintColor={accentColor} />
              </View>
              <View className="flex-1 gap-0.5">
                <AppText className="text-sm font-medium text-foreground">{title}</AppText>
                <AppText className="text-xs font-light text-foreground/40 leading-4">{sub}</AppText>
              </View>
            </EaseView>
          ))}
        </View>

      </ScrollView>

      {/* Fixed CTA */}
      <EaseView
        initialAnimate={FADE_OUT}
        animate={FADE_IN}
        transition={{ type: "timing", duration: 400, delay: 750, easing: EASING }}
        className="px-8 pb-10 pt-4"
      >
        <Button variant="primary" size="lg" onPress={onBegin} className="w-full">
          Begin
        </Button>
      </EaseView>
    </View>
  );
}
