import { Image } from "expo-image";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/components/shared/app-text";
import { PlusValue } from "@/features/purchases/components/plus-offer-card";
import { PLUS_OFFER_DECLINE_LABEL } from "@/features/purchases/plus-offer-copy";
import type {
	PlusOfferMoment,
	PlusOfferVariant,
} from "@/features/purchases/plus-offer-policy";
import { usePlusOfferPresence } from "@/features/purchases/use-plus-offer-presence";
import {
	riseFrom,
	riseTransition,
} from "@/features/reflect/components/states/path-choice-card";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const MASCOT = require("@/assets/images/flux/plus-mascot.png");
const MASCOT_STYLE = {
	height: 96,
	position: "absolute" as const,
	right: 16,
	top: -44,
	width: 96,
};
const SETTLED = { opacity: 1, translateY: 0 };

type Props = {
	moment: PlusOfferMoment;
	variant?: PlusOfferVariant;
	sessionId?: string | null;
	onOpen: () => void;
	onDismiss: () => void;
};

/**
 * Moment 2 as a path-stack layer. Only the CTA opens the paywall, so no stray tap lands on a sell.
 */
export function PathOfferLayer({
	moment,
	variant,
	sessionId,
	onOpen,
	onDismiss,
}: Props) {
	const accentColor = useThemeColor("accent") as string;
	const reduced = useEffectiveReducedMotion();
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
		<EaseView
			animate={SETTLED}
			className="-mb-8"
			initialAnimate={riseFrom(reduced)}
			transition={riseTransition(0, reduced)}
		>
			<View className="overflow-hidden rounded-t-[40px] bg-plus-night px-6 pt-6 pb-14">
				{copy.lead ? (
					<AppText className="w-3/4 font-serif text-2xl text-white leading-8">
						{copy.lead}
					</AppText>
				) : null}
				<View className="mt-1 w-4/5">
					<PlusValue accent={accentColor} text={copy.value} />
				</View>
				<View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-2">
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
			</View>
			<Image
				contentFit="contain"
				pointerEvents="none"
				source={MASCOT}
				style={MASCOT_STYLE}
			/>
		</EaseView>
	);
}
