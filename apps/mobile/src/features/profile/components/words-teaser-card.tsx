import {
	Blur,
	Canvas,
	Group,
	matchFont,
	Paint,
	Text,
} from "@shopify/react-native-skia";
import { Surface } from "heroui-native";
import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/components/shared/app-text";
import { useTokenColor } from "../hooks/use-token-color";
import { CardInfo } from "./card-info";
import { FrostedCount } from "./frosted-count";

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
		<Canvas style={{ height: WORD_H, width: WORD_W }}>
			{/* eslint-disable-next-line react-perf/jsx-no-jsx-as-prop -- Skia <Group layer> requires a Paint JSX element; React Compiler stabilizes it */}
			<Group
				layer={
					<Paint>
						<Blur blur={6} />
					</Paint>
				}
			>
				<Text color={color} font={font} text={text} x={0} y={WORD_H / 2 + 5} />
			</Group>
		</Canvas>
	);
}

export function WordsTeaserCard({
	words,
	isPlus,
	onUnlock,
	onView,
	staggerDelay = 360,
}: Props) {
	const mutedHex = useTokenColor("muted");
	const accentHex = useTokenColor("accent");

	const viewed = useRef(false);
	useEffect(() => {
		if (viewed.current) {
			return;
		}
		viewed.current = true;
		onView();
	}, [onView]);

	// Three rows. Plus: all real words + real counts, all clear. Free: only the
	// hook word is real (the server never sends the 2nd/3rd word or their
	// counts to a free tier) — the remaining rows are local decoys with
	// placeholder counts, always blurred/frosted.
	const rows = isPlus
		? ROW_SLOTS.map((slot, i) => ({
				blurred: !words[i],
				count: words[i]?.count ?? PLACEHOLDER_COUNTS[i],
				slot,
				word: words[i]?.word ?? FALLBACK_WORDS[i],
			}))
		: ROW_SLOTS.map((slot, i) => ({
				blurred: i !== 0,
				count:
					i === 0
						? (words[0]?.count ?? PLACEHOLDER_COUNTS[0])
						: PLACEHOLDER_COUNTS[i],
				slot,
				word:
					i === 0 ? (words[0]?.word ?? FALLBACK_WORDS[0]) : FALLBACK_WORDS[i],
			}));

	return (
		<EaseView
			animate={{ opacity: 1, translateY: 0 }}
			className="mx-5"
			initialAnimate={{ opacity: 0, translateY: 8 }}
			transition={{
				delay: staggerDelay,
				duration: 280,
				easing: EASE,
				type: "timing",
			}}
		>
			<Pressable
				accessibilityLabel="See the words that keep finding you"
				accessibilityRole="button"
				onPress={onUnlock}
			>
				<Surface className="p-0">
					{/* Header — no padlock. The teaser sells what's true about them. */}
					<View className="flex-row items-center gap-1.5 px-5 pt-5 pb-3">
						<AppText className="font-medium text-[11px] text-muted uppercase tracking-widest">
							Words that keep finding you
						</AppText>
						<CardInfo
							description={WORDS_INFO}
							title="Words that keep finding you"
						/>
					</View>

					{/* Rows: unlocked rows show word + real count clear; locked rows
              stay blurred/frosted with decoy word + placeholder count. */}
					<View className="gap-2.5 px-5 pb-4">
						{rows.map(({ slot, word, count, blurred }) => (
							<View
								className="flex-row items-center justify-between"
								key={slot}
							>
								{blurred ? (
									<BlurredWord color={accentHex + "CC"} text={word} />
								) : (
									<AppText
										className="text-sm"
										style={{ color: accentHex + "CC" }}
									>
										{word}
									</AppText>
								)}
								<FrostedCount locked={blurred} value={count} />
							</View>
						))}
					</View>

					<View className="px-5 pb-5">
						<AppText
							className="text-[11px] tracking-wide"
							style={{ color: mutedHex + "AA" }}
						>
							See every word and how often it returns
						</AppText>
					</View>
				</Surface>
			</Pressable>
		</EaseView>
	);
}
