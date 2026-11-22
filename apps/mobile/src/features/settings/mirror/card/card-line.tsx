import { useEffect, useRef } from "react";
import { AccessibilityInfo, Platform, View } from "react-native";
import Animated, {
	Easing,
	LayoutAnimationConfig,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { useFixedFaces } from "@/design/fonts";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import {
	type MirrorTone,
	toneById,
} from "@/features/settings/mirror/mirror-model";
import { cn } from "@/lib/cn";

const RISE = {
	duration: 340,
	easing: Easing.bezier(0.2, 0.7, 0.2, 1),
	...PLAY_AS_CHOSEN,
};
const RISE_FROM = 8;

const rise = () => {
	"worklet";
	return {
		animations: {
			opacity: withTiming(1, RISE),
			transform: [{ translateY: withTiming(0, RISE) }],
		},
		initialValues: { opacity: 0, transform: [{ translateY: RISE_FROM }] },
	};
};

const SIZE: Record<MirrorTone, string> = {
	adaptive: "text-[21px] leading-[27.7px] tracking-[-0.1px]",
	direct: "text-[20.5px] leading-[26.7px] tracking-[-0.2px]",
	gentle: "text-[21px] leading-[29px]",
	poetic: "text-[26px] leading-[30.7px]",
	witnessed: "text-[25px] leading-[30px]",
};

const FACE: Partial<Record<MirrorTone, string>> = {
	direct: "font-poster-medium",
	poetic: "font-mirror",
	witnessed: "font-reader",
};

export function CardLine({
	shown,
	ink,
	reduced,
}: {
	shown: MirrorTone;
	ink: string;
	reduced: boolean;
}) {
	const ready = useFixedFaces("mirror", "reader", "poster-medium");
	const t = toneById(shown);
	// A new tone's line is read out: a live region on Android, an announcement on iOS
	// (VoiceOver has no live regions). Not on first draw, only when the tone changes.
	const drawn = useRef(false);
	useEffect(() => {
		if (!drawn.current) {
			drawn.current = true;
			return;
		}
		if (Platform.OS === "ios") {
			const { lead, line } = toneById(shown);
			AccessibilityInfo.announceForAccessibility(
				lead ? `${lead} ${line}` : line
			);
		}
	}, [shown]);
	return (
		<View accessibilityLiveRegion="polite">
			<LayoutAnimationConfig skipEntering>
				<Animated.View
					className="gap-2"
					entering={reduced ? undefined : rise}
					key={shown}
				>
					{t.lead ? (
						<AppText
							className={cn(
								"text-[19px] leading-[22.8px] opacity-80",
								ready && "font-mirror"
							)}
							style={{ color: ink }}
							variant="body"
						>
							{t.lead}
						</AppText>
					) : null}
					<AppText
						className={cn(SIZE[shown], ready && FACE[shown])}
						style={{ color: ink }}
						variant="body"
					>
						{t.line}
					</AppText>
				</Animated.View>
			</LayoutAnimationConfig>
		</View>
	);
}
