// The card shell for the intake offer deck: tag, title, then the mock, tinted by a
// `--tone-*` hue. Text sits on `--offer-ink`, not `--foreground`: the panel is light
// in both schemes, so the foreground token would invert to white on dark.

import { Image, type ImageProps } from "expo-image";
import type { ReactNode } from "react";
import { View } from "react-native";

import { AppText } from "@/components/shared/app-text";
import { cn } from "@/lib/utils";

/** One Flux pose per card, bleeding off the top-right corner. */
export const OFFER_MASCOT = {
	insights: require("@/assets/images/flux/plus-mascot.png"),
	limits: require("@/assets/images/flux/flux-campfire.png"),
	voices: require("@/assets/images/flux/flux-whisper.png"),
	xolacers: require("@/assets/images/flux/flux-pair-listening.png"),
} as const;

export type OfferTint = "poetic" | "gentle" | "direct" | "witnessed" | "topics";

const TINT: Record<OfferTint, string> = {
	direct: "bg-tone-direct",
	gentle: "bg-tone-gentle",
	poetic: "bg-tone-poetic",
	// Browse hub's fixed green hue (#338), so Kindling & Browse stands apart from the mirror tones.
	topics: "bg-browse-topics-foreground",
	witnessed: "bg-tone-witnessed",
};

interface OfferCardProps {
	/** The mock: what the feature looks like, not a decoration. */
	children: ReactNode;
	mascot: ImageProps["source"];
	tag: string;
	tint: OfferTint;
	title: string;
	width: number;
}

/** The tag chip is a different hue from its card: amber everywhere except the amber card, which
 * takes rose. */
const CHIP: Record<OfferTint, string> = {
	direct: TINT.witnessed,
	gentle: TINT.witnessed,
	poetic: TINT.witnessed,
	topics: TINT.witnessed,
	witnessed: TINT.gentle,
};

export function OfferCard({
	tag,
	title,
	tint,
	width,
	mascot,
	children,
}: OfferCardProps) {
	// Sized off the card, not the screen; the deck is the only thing that changes width.
	const mascotSize = width * 0.5;

	return (
		<View
			className={cn("gap-3.5 overflow-hidden rounded-[28px] p-5", TINT[tint])}
			style={{ width }}
		>
			<Image
				contentFit="contain"
				source={mascot}
				style={{
					height: mascotSize,
					position: "absolute",
					right: -14,
					// Positive: a negative top clips the flame tip against the card's overflow.
					top: 6,
					width: mascotSize,
				}}
				transition={0}
			/>
			<OfferPill className={CHIP[tint]}>{tag}</OfferPill>
			<AppText
				className="font-[Poppins-SemiBold] text-[22px] text-offer-ink leading-7"
				// Clearance to the mascot's visible left edge (`width - mascotSize + 14`),
				// less the card's own p-5 padding; a long title otherwise wraps under it.
				style={{ paddingRight: mascotSize - 34 }}
			>
				{title}
			</AppText>
			{/* Bottom-anchored: the deck stretches every card to the tallest, and the slack
			    pools under the title. */}
			{/* `overflow-hidden`: a mock stack that outgrows the deck clips here instead of
			    painting over the title (Android measures text taller than iOS). */}
			<View className="flex-1 justify-end gap-2.5 overflow-hidden">
				{children}
			</View>
		</View>
	);
}

/** The small label above the title, and the same chip used inside the mocks. */
export function OfferPill({
	children,
	className,
}: {
	children: string;
	className?: string;
}) {
	return (
		<View
			className={cn(
				"self-start rounded-full bg-offer-ink/[0.12] px-3 py-1.5",
				className
			)}
		>
			<AppText className="font-[Poppins-Medium] text-[12px] text-offer-ink">
				{children}
			</AppText>
		</View>
	);
}

/** A panel inside a card: the mock's own surface, one step lighter. */
export function OfferMock({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<View
			className={cn("gap-2.5 rounded-2xl bg-offer-ink/10 p-3.5", className)}
		>
			{children}
		</View>
	);
}
