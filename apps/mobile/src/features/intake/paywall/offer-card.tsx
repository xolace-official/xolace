/**
 * The card shell for the intake offer deck — one saturated panel per offer.
 *
 * Every card is the same three-part stack (tag → title → the thing itself), so
 * the deck reads as one set rather than four posters. Colour is the only
 * variable, and it comes from the four `--tone-*` hues the app already owns.
 *
 * Text sits on `--offer-ink`, not `--foreground`: the panel is a light surface
 * in both schemes, so the foreground token would invert to white on dark and
 * disappear.
 */

import { Image, type ImageProps } from "expo-image";
import type { ReactNode } from "react";
import { View } from "react-native";

import { AppText } from "@/src/components/shared/app-text";
import { cn } from "@/src/lib/utils";

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
	// Reuses browse hub's fixed green hue (#338) — not a mirror `--tone-*`, so
	// Kindling & Browse can stand apart from the deck's other four tones.
	topics: "bg-browse-topics-foreground",
	witnessed: "bg-tone-witnessed",
};

interface OfferCardProps {
	/** The mock — what the feature actually looks like, not a decoration. */
	children: ReactNode;
	mascot: ImageProps["source"];
	tag: string;
	tint: OfferTint;
	title: string;
	width: number;
}

/**
 * The tag chip is a different hue from the card it sits on — that jump is what
 * makes it read as a label rather than as more card. Amber everywhere except
 * the amber card, which takes rose.
 */
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
	// Flux sits in the top-right and the title wraps beside him, so the corner
	// never reads as an empty margin. Sized off the card, not the screen — the
	// deck is the only thing that changes width.
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
					// Positive top on purpose: Flux's flame tip is the top of every pose,
					// and a negative offset clips it against the card's own overflow.
					top: 6,
					width: mascotSize,
				}}
				transition={0}
			/>
			<OfferPill className={CHIP[tint]}>{tag}</OfferPill>
			<AppText
				className="font-[Poppins-SemiBold] text-[22px] text-offer-ink leading-7"
				// The mascot's visible left edge sits at `width - mascotSize + 14` (its
				// own -14 bleed pulls it back toward the card). Reserving only half its
				// width left the title free to wrap under it — Xolacers' longer title
				// was the one that actually reached that far. Subtracting the card's
				// own 20px edge padding (p-5) gives the real clearance the text needs.
				style={{ paddingRight: mascotSize - 34 }}
			>
				{title}
			</AppText>
			{/* Bottom-anchored. The deck stretches every card to the tallest one, so
          the slack has to go somewhere; pooled under the title it reads as air
          around the headline, split above and below it reads as a hole. */}
			{/* `overflow-hidden`: if a mock stack still outgrows the deck's fixed
          height on some device, it clips at the title instead of painting up
          over it — Android measures every text block taller than iOS unless
          `includeFontPadding` is off, which is what caused the overlap. */}
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

/** A panel inside a card — the mock's own surface, one step lighter. */
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
