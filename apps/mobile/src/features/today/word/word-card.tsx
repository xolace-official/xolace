import { useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Card } from "@/components/shared/card";
import { Image } from "@/components/shared/styled";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { useToday } from "../today-data";
import { useTodayFrame } from "../today-frame";
import { MODULE_GAP } from "../today-motion";
import { TodaySection } from "../today-section";
import { InkReveal } from "./ink-reveal";

// From production `daily-quotes-card.tsx`: the source is a 1200×1000 2×2 grid; the
// bottom-left figure is zoomed and offset into a 132 pt window. Crop starts at y 500 so
// the blob above never shows.
const ART = require("@/assets/images/illustrations/discovery-image-bg.png");
const ART_SCALE = 0.4;
const ART_CROP_X = 230;
const ART_CROP_Y = 500;
const CARD_RADIUS = 24;
/** Two lines of the quote (25.8 pt each): its room while today's word loads. */
const LOADING_H = 52;
/** The grid, scaled and offset so the crop lands in the window (with `absolute`). */
const ART_FRAME = {
	height: 1000 * ART_SCALE,
	left: -ART_CROP_X * ART_SCALE,
	top: -ART_CROP_Y * ART_SCALE,
	width: 1200 * ART_SCALE,
} as const;
/** Right corners only, so the window meets the card's right edge exactly. */
const ART_WINDOW = {
	borderBottomRightRadius: CARD_RADIUS,
	borderTopRightRadius: CARD_RADIUS,
} as const;

/**
 * A word for today: today's quote, its line inking in once a day (ink-bleed-reveal),
 * beside production's art. A tap opens Quotes, as production's quotes card did.
 */
export function WordCard() {
	const surface = useTokenColor("surface");
	const { state, actions } = useToday();
	const { intro, reduced } = useTodayFrame();
	const [line, setLine] = useState<{ w: number; h: number } | null>(null);
	const word = state.word;
	// Decided when the word first arrives: it inks in only while the first open is still
	// playing. Loading, nothing is decided (and nothing shows).
	const [ink, setInk] = useState<"wait" | "play" | "done">("wait");
	if (ink === "wait" && word !== undefined) {
		setInk(word && intro && !reduced ? "play" : "done");
	}
	const inking = ink === "play";
	// Until the cover has drawn, an inking line stays hidden (no flash of the whole line).
	const [covered, setCovered] = useState(false);
	const text = word ?? COPY.word.fallback;

	return (
		<View className="mx-4" style={{ marginTop: MODULE_GAP }}>
			<TodaySection title={COPY.word.title} />
			<Card
				className="mt-3.5"
				label={
					word
						? `${COPY.word.eyebrow}. ${word} ${COPY.word.sub}`
						: COPY.word.label
				}
				onPress={actions.openQuotes}
			>
				<View className="flex-row items-stretch">
					<View className="flex-1 gap-2 py-5 pr-3 pl-5">
						<AppText
							className="text-[11.5px] leading-[14px] tracking-[1.15px]"
							color="emberInk"
							variant="caption"
							weight="bold"
						>
							{COPY.word.eyebrow}
						</AppText>
						{word === undefined ? (
							<View style={{ height: LOADING_H }} />
						) : (
							<View
								onLayout={(e) =>
									setLine({
										h: e.nativeEvent.layout.height,
										w: e.nativeEvent.layout.width,
									})
								}
							>
								<AppText
									className={cn(
										word
											? "text-[23px] leading-[25.8px] tracking-[-0.46px]"
											: "text-[17px] leading-[22px]",
										inking && !covered && "opacity-0"
									)}
									variant={word ? "headlineL" : "subhead"}
								>
									{text}
								</AppText>
								{inking && line ? (
									<InkReveal
										cover={surface}
										h={line.h}
										onCovered={() => setCovered(true)}
										onDone={() => setInk("done")}
										w={line.w}
									/>
								) : null}
							</View>
						)}
						<AppText color="muted" variant="footnote">
							{COPY.word.sub}
						</AppText>
					</View>
					<View
						className="w-33 overflow-hidden border-continuous"
						style={ART_WINDOW}
					>
						<Image
							accessibilityElementsHidden
							className="absolute"
							contentFit="cover"
							importantForAccessibility="no-hide-descendants"
							source={ART}
							style={ART_FRAME}
						/>
					</View>
				</View>
			</Card>
		</View>
	);
}
