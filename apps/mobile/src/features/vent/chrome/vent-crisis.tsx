import { type ComponentRef, useEffect, useRef } from "react";
import {
	AccessibilityInfo,
	findNodeHandle,
	Pressable,
	View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { VENT_COPY } from "@/features/vent/copy";
import { useVentScreen } from "@/features/vent/vent-data";
import { useTokenColor } from "@/lib/use-token-color";

const DELAY_MS = 1200;
const IN_MS = 700;
const IN = FadeIn.duration(IN_MS)
	.delay(DELAY_MS)
	.reduceMotion(PLAY_AS_CHOSEN.reduceMotion);
const HEART = { android: "favorite", ios: "heart" } as const;

/**
 * Crisis (v2): the line stays on screen with no burn and no "Gone.", and production's actions
 * fade in 112 pt from the bottom after 1.2 s. The support pill takes VoiceOver focus.
 */
export function VentCrisis() {
	const { state, actions } = useVentScreen();
	if (!(state.crisis && state.phase === "heard")) {
		return null;
	}
	return <CrisisActions onClose={actions.close} onSupport={actions.support} />;
}

function CrisisActions({
	onSupport,
	onClose,
}: {
	onSupport: () => void;
	onClose: () => void;
}) {
	const pill = useRef<ComponentRef<typeof Pressable>>(null);
	const cream = useTokenColor("vent-cream");
	useEffect(() => {
		const id = setTimeout(() => {
			const node = findNodeHandle(pill.current);
			if (node) {
				AccessibilityInfo.setAccessibilityFocus(node);
			}
		}, DELAY_MS + IN_MS);
		return () => clearTimeout(id);
	}, []);

	return (
		<Animated.View
			className="absolute inset-x-0 bottom-28 z-5 items-center gap-4"
			entering={IN}
		>
			<Pressable
				accessibilityLabel={VENT_COPY.supportLabel}
				accessibilityRole="button"
				onPress={onSupport}
				ref={pill}
			>
				<View className="h-10 flex-row items-center gap-2 rounded-full border border-vent-cream/30 bg-vent-cream/10 px-6">
					<Icon color={cream} name={HEART} size={16} weight="regular" />
					<AppText
						className="text-[14px] text-vent-cream leading-[19px]"
						variant="body"
					>
						{VENT_COPY.support}
					</AppText>
				</View>
			</Pressable>
			<Pressable accessibilityRole="button" hitSlop={8} onPress={onClose}>
				<View className="h-7.5 justify-center px-3">
					<AppText
						className="text-[14px] text-vent-cream/40 leading-[19px]"
						variant="body"
					>
						{VENT_COPY.close}
					</AppText>
				</View>
			</Pressable>
		</Animated.View>
	);
}
