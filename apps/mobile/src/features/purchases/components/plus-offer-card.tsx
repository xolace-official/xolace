import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PLUS_OFFER_DECLINE_LABEL } from "@/features/purchases/plus-offer-copy";
import type {
	PlusOfferMoment,
	PlusOfferVariant,
} from "@/features/purchases/plus-offer-policy";
import { usePlusOfferPresence } from "@/features/purchases/use-plus-offer-presence";

const BG = require("@/assets/images/flux/plus-postcard-bg.png");
const ABS_FILL = {
	bottom: 0,
	left: 0,
	position: "absolute" as const,
	right: 0,
	top: 0,
};
/** The scene's own night, not a theme color: the art is dark in every theme. */
const NIGHT = "#0b0716";

type Props = {
	moment: PlusOfferMoment;
	variant?: PlusOfferVariant;
	/** A true line from this user's own data. Never fabricated; omit when there is none. */
	observation?: string;
	/** Recorded on mount so the one-per-session cap is spent by an appearance, not a decision. */
	sessionId?: string | null;
	onOpen: () => void;
	onDismiss?: () => void;
};

/** Value line with "Xolace+" in accent. `text-white` because the art is always dark; a bare
 * nested <AppText> would re-inherit `text-foreground`. */
export const PlusValue = ({
	text,
	accent,
}: {
	text: string;
	accent: string;
}) => {
	const [before, after] = text.split("Xolace+");
	return (
		<AppText className="font-light text-[13px] text-white leading-5">
			{before}
			<AppText className="font-semibold" style={{ color: accent }}>
				Xolace+
			</AppText>
			{after ?? ""}
		</AppText>
	);
};

/** The one card every proactive Plus moment renders. Shared so the decline is always present
 * and always spends the 7-day cooldown. */
export const PlusOfferCard = ({
	moment,
	variant = "default",
	observation,
	sessionId = null,
	onOpen,
	onDismiss,
}: Props) => {
	const accentColor = useThemeColor("accent") as string;
	const { copy, declined, open, dismiss } = usePlusOfferPresence({
		moment,
		onDismiss,
		onOpen,
		sessionId,
		variant,
	});

	if (declined) {
		return null;
	}

	return (
		<View
			className="w-full overflow-hidden rounded-3xl"
			style={{
				aspectRatio: 16 / 10,
				shadowColor: "#000",
				shadowOffset: { height: 8, width: 0 },
				shadowOpacity: 0.25,
				shadowRadius: 18,
			}}
		>
			<Image
				contentFit="cover"
				contentPosition="left"
				source={BG}
				style={ABS_FILL}
			/>
			{/* Positioned in `style`: uniwind's `bottom-0` on a LinearGradient leaves it at the
			    top. */}
			<LinearGradient
				colors={[`${NIGHT}00`, `${NIGHT}e0`, NIGHT]}
				end={{ x: 0, y: 1 }}
				locations={[0, 0.4, 1]}
				start={{ x: 0, y: 0 }}
				style={{
					bottom: 0,
					left: 0,
					paddingBottom: 16,
					paddingHorizontal: 18,
					paddingTop: 30,
					position: "absolute",
					right: 0,
				}}
			>
				{observation ? (
					// Capped: the scrim grows upward and would climb over the mascot's head.
					<AppText
						className="mb-1.5 font-serif text-[15px] text-white/70 italic leading-5"
						numberOfLines={2}
					>
						{observation}
					</AppText>
				) : null}

				{copy.lead ? (
					<AppText className="mb-1.5 font-serif text-[17px] text-white leading-6">
						{copy.lead}
					</AppText>
				) : null}

				<PlusValue accent={accentColor} text={copy.value} />

				<View className="mt-4 flex-row items-center gap-4">
					<PressableFeedback
						accessibilityLabel={copy.cta}
						accessibilityRole="button"
						className="rounded-full px-4 py-2.5"
						onPress={open}
						style={{ backgroundColor: accentColor }}
					>
						<AppText className="font-semibold text-[13px] text-background">
							{copy.cta}
						</AppText>
					</PressableFeedback>
					<PressableFeedback
						accessibilityLabel={PLUS_OFFER_DECLINE_LABEL}
						accessibilityRole="button"
						hitSlop={8}
						onPress={dismiss}
					>
						<AppText className="text-[13px] text-white/55">
							{PLUS_OFFER_DECLINE_LABEL}
						</AppText>
					</PressableFeedback>
				</View>
			</LinearGradient>
		</View>
	);
};
