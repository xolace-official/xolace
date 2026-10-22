import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { Blur, Canvas, Group, Paint, Text, matchFont } from "@shopify/react-native-skia";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { useTokenColor } from "../hooks/use-token-color";
import { FrostedCount } from "./frosted-count";
import { CardInfo } from "./card-info";

const WORDS_INFO =
  "These are the recurring words from your own writing; your language, not ours. The count is how often each one has returned. Seeing every word and its frequency is part of the deeper insights coming soon.";

type WordEntry = { word: string; count: number };

type Props = {
  words: WordEntry[];
  isPlus: boolean;
  onUnlock: () => void;
  onView: () => void;
  staggerDelay?: number;
};

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

// Representative counts for locked rows — never real values. Unlocked rows
// use the real count that shipped alongside their word.
const PLACEHOLDER_COUNTS = [12, 7, 4];
const FALLBACK_WORDS = ["still", "here", "quiet"];
// Stable positional keys — rows are fixed slots (clear → fogged), never reordered.
const ROW_SLOTS = ["primary", "secondary", "tertiary"] as const;

const WORD_W = 190;
const WORD_H = 22;

// A real recurring word rendered behind a static Skia blur — clearly a word,
// just out of reach. Only the top word reads clear; the rest are fogged.
function BlurredWord({ text, color }: { text: string; color: string }) {
  const font = matchFont({
    fontFamily: "Poppins",
    fontSize: 14,
    fontStyle: "normal",
    fontWeight: "400",
  });

  return (
    <Canvas style={{ width: WORD_W, height: WORD_H }}>
      {/* eslint-disable-next-line react-perf/jsx-no-jsx-as-prop -- Skia <Group layer> requires a Paint JSX element; React Compiler stabilizes it */}
      <Group layer={<Paint><Blur blur={6} /></Paint>}>
        <Text x={0} y={WORD_H / 2 + 5} text={text} font={font} color={color} />
      </Group>
    </Canvas>
  );
}

export function WordsTeaserCard({ words, isPlus, onUnlock, onView, staggerDelay = 360 }: Props) {
  const mutedHex = useTokenColor("muted");
  const accentHex = useTokenColor("accent");

  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    onView();
  }, [onView]);

  // Three rows. Plus: all real words + real counts, all clear. Free: only the
  // hook word is real (the server never sends the 2nd/3rd word or their
  // counts to a free tier) — the remaining rows are local decoys with
  // placeholder counts, always blurred/frosted.
  const rows = isPlus
    ? ROW_SLOTS.map((slot, i) => ({
        slot,
        word: words[i]?.word ?? FALLBACK_WORDS[i],
        count: words[i]?.count ?? PLACEHOLDER_COUNTS[i],
        blurred: !words[i],
      }))
    : ROW_SLOTS.map((slot, i) => ({
        slot,
        word: i === 0 ? (words[0]?.word ?? FALLBACK_WORDS[0]) : FALLBACK_WORDS[i],
        count: i === 0 ? (words[0]?.count ?? PLACEHOLDER_COUNTS[0]) : PLACEHOLDER_COUNTS[i],
        blurred: i !== 0,
      }));

  return (
    <EaseView
      initialAnimate={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 280, easing: EASE, delay: staggerDelay }}
      className="mx-5"
    >
      <Pressable
        onPress={onUnlock}
        accessibilityRole="button"
        accessibilityLabel="See the words that keep finding you"
      >
        <View className="rounded-3xl bg-surface border border-border/65 overflow-hidden">
          {/* Header — no padlock. The teaser sells what's true about them. */}
          <View className="px-5 pt-5 pb-3 flex-row items-center gap-1.5">
            <AppText className="text-[11px] font-medium text-muted tracking-widest uppercase">
              Words that keep finding you
            </AppText>
            <CardInfo title="Words that keep finding you" description={WORDS_INFO} />
          </View>

          {/* Rows: unlocked rows show word + real count clear; locked rows
              stay blurred/frosted with decoy word + placeholder count. */}
          <View className="px-5 pb-4 gap-2.5">
            {rows.map(({ slot, word, count, blurred }) => (
              <View key={slot} className="flex-row items-center justify-between">
                {blurred ? (
                  <BlurredWord text={word} color={accentHex + "CC"} />
                ) : (
                  <AppText className="text-sm" style={{ color: accentHex + "CC" }}>
                    {word}
                  </AppText>
                )}
                <FrostedCount value={count} locked={blurred} />
              </View>
            ))}
          </View>

          <View className="px-5 pb-5">
            <AppText className="text-[11px] tracking-wide" style={{ color: mutedHex + "AA" }}>
              See every word and how often it returns
            </AppText>
          </View>
        </View>
      </Pressable>
    </EaseView>
  );
}
