import type { ComponentRef, Ref } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Image, LinearGradient } from "@/components/shared/styled";
import { cn } from "@/lib/cn";
import { BackgroundLayer } from "../background/background-layer";
import { textShadow, useQuoteInk } from "../chrome/quote-ink";
import { QUOTE_COPY } from "../copy";
import type { ShareFmt } from "../motion/quote-ui";
import type { QuoteBackground } from "../quotes-model";
import { scrimOf } from "../quotes-palette";
import { POSTER_MEDIUM } from "../stage/quote-type";
import { CARD_W, fitScale, QUOTE, WORDS } from "./share-fit";

const STORY_RATIO = 16 / 9;
const LOCKUP = require("@/assets/images/brand/logo-lockup.webp");
const LOCKUP_RATIO = 536 / 200;
const MARK = { bottom: 9, height: 7.5, opacity: 0.86 } as const;

type Props = {
	background: QuoteBackground;
	text: string;
	scale: number;
	fmt: ShareFmt;
	fill?: boolean;
	/** The video's overlay: no background, just the scrim, the words and the wordmark. */
	transparent?: boolean;
	/** The preview of a video plays its loop (the screen's own loop rests while Share is open). */
	playing?: boolean;
	ref?: Ref<ComponentRef<typeof View>>;
};

export function ShareCard({
	background,
	text,
	scale: f,
	fmt,
	fill,
	transparent,
	playing,
	ref,
}: Props) {
	const q = useQuoteInk();
	const ink = q.inks[background.ink];
	const gradient = scrimOf(background);
	const width = CARD_W * f;
	const height = fmt === "story" ? width * STORY_RATIO : width;
	const size = QUOTE.size * fitScale(text, fmt) * f;
	return (
		<View
			className={cn(
				"overflow-hidden",
				fill && "absolute inset-0",
				transparent ? "bg-transparent" : "bg-black"
			)}
			collapsable={false}
			ref={ref}
			style={fill ? undefined : { height, width }}
		>
			{!transparent && (
				<BackgroundLayer background={background} play={playing === true} />
			)}
			{gradient && (
				<LinearGradient
					className="absolute inset-0"
					colors={gradient.colors}
					locations={gradient.locations}
				/>
			)}
			<View
				className="absolute justify-center"
				style={{
					bottom: WORDS.bottom * f,
					left: WORDS.side * f,
					right: WORDS.side * f,
					top: WORDS.top * f,
				}}
			>
				<AppText
					allowFontScaling={false}
					center
					style={{
						color: ink.text,
						fontFamily: POSTER_MEDIUM,
						fontSize: size,
						lineHeight: size * QUOTE.lineHeight,
						...(ink.shadow ? textShadow(q.shadowColor, f) : null),
					}}
					variant="poster"
				>
					{text}
				</AppText>
			</View>
			<Image
				accessibilityLabel={QUOTE_COPY.wordmark}
				className="absolute self-center"
				contentFit="contain"
				source={LOCKUP}
				style={{
					bottom: MARK.bottom * f,
					height: MARK.height * f,
					opacity: MARK.opacity,
					width: MARK.height * LOCKUP_RATIO * f,
				}}
				tintColor={ink.text}
			/>
		</View>
	);
}
