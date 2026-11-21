import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Card } from "@/components/shared/card";
import { Image } from "@/components/shared/styled";
import { DISPLAY_MAX_SCALE } from "@/design/type";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { useToday } from "../today-data";
import { useTodayFrame } from "../today-frame";
import { MODULE_GAP } from "../today-motion";
import { TodaySection } from "../today-section";
import { InkReveal } from "./ink-reveal";

const ART = require("@/assets/images/illustrations/discovery-image-bg.png");
const ART_SCALE = 0.4;
const ART_CROP_X = 230;
const ART_CROP_Y = 500;
const CARD_RADIUS = 24;
/** The quote shows at most this many lines; Quotes shows the rest. */
const WORD_LINES = 3;
/** The headline's line height, as in its `leading-[25.8px]` class. */
const WORD_LEADING = 25.8;
/** The fallback's 17/22 copy fits these lines in the same slot. */
const FALLBACK_LINES = 3;
const ART_FRAME = {
	height: 1000 * ART_SCALE,
	left: -ART_CROP_X * ART_SCALE,
	top: -ART_CROP_Y * ART_SCALE,
	width: 1200 * ART_SCALE,
} as const;
const ART_WINDOW = {
	borderBottomRightRadius: CARD_RADIUS,
	borderTopRightRadius: CARD_RADIUS,
} as const;

export function WordCard() {
	const surface = useTokenColor("surface");
	const { state, actions } = useToday();
	const { intro, reduced, waiting } = useTodayFrame();
	const [line, setLine] = useState<{ w: number; h: number } | null>(null);
	const word = state.word;
	const [ink, setInk] = useState<"wait" | "play" | "done">("wait");
	if (ink === "wait" && word !== undefined) {
		setInk(word && intro && !reduced ? "play" : "done");
	}
	const inking = ink === "play";
	const [covered, setCovered] = useState(false);
	const text = word ?? COPY.word.fallback;
	const { fontScale } = useWindowDimensions();
	// One slot height for every quote, the fallback and loading, so the card
	// and its art window never change size from day to day.
	const slotH =
		WORD_LINES * WORD_LEADING * Math.min(fontScale, DISPLAY_MAX_SCALE);

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
						<View style={{ height: slotH }}>
							{word === undefined ? null : (
								<>
									<AppText
										className={cn(
											word
												? "text-[23px] leading-[25.8px] tracking-[-0.46px]"
												: "text-[17px] leading-[22px]",
											inking && !covered && "opacity-0"
										)}
										ellipsizeMode="tail"
										maxFontSizeMultiplier={DISPLAY_MAX_SCALE}
										numberOfLines={word ? WORD_LINES : FALLBACK_LINES}
										onLayout={(e) =>
											setLine({
												h: e.nativeEvent.layout.height,
												w: e.nativeEvent.layout.width,
											})
										}
										variant={word ? "headlineL" : "subhead"}
									>
										{text}
									</AppText>
									{inking && line && !waiting ? (
										<InkReveal
											cover={surface}
											h={line.h}
											onCovered={() => setCovered(true)}
											onDone={() => setInk("done")}
											w={line.w}
										/>
									) : null}
								</>
							)}
						</View>
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
