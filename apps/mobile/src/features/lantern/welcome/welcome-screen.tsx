import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { BackHandler, useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Image, LinearGradient } from "@/components/shared/styled";
import { clearOf } from "@/design/clear-of";
import { COPY } from "@/features/lantern/copy";
import { HoldToBegin } from "@/features/lantern/welcome/hold-to-begin";
import { useTokenColors } from "@/lib/use-token-color";

const WRITER = require("@/assets/images/flux/writer-flux.png");

/** The hero: 64% of the screen, its bottom 22% fading into the page; the art sits at 48%. */
const HERO = {
	art: { at: 0.48, h: 258, w: 170 },
	fade: 0.22,
	share: 0.64,
} as const;

/**
 * Production's Lantern welcome (handoff §7), once, before the home on a first visit: the hero,
 * "Welcome to the Lantern", the line (rewritten: Lantern never calls itself a library) and Hold to
 * begin. No swipe away, and Android's back does nothing: the hold is the only way on.
 */
export function WelcomeScreen({ onBegin }: { onBegin: () => void }) {
	const { height } = useWindowDimensions();
	const heroH = Math.round(height * HERO.share);
	const [page, c1, c2, c3, glow] = useTokenColors([
		"background",
		"lantern-welcome-1",
		"lantern-welcome-2",
		"lantern-welcome-3",
		"lantern-welcome-glow",
	]);
	useEffect(() => {
		const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
		return () => sub.remove();
	}, []);
	return (
		<View className="flex-1 bg-background">
			<StatusBar style="light" />
			<View
				className="absolute inset-x-0 top-0"
				style={{
					experimental_backgroundImage: `radial-gradient(circle at 50% 58%, ${glow}, ${clearOf(glow)} 38%), linear-gradient(180deg, ${c1} 0%, ${c2} 52%, ${c3} 100%)`,
					height: heroH,
				}}
			>
				<LinearGradient
					className="absolute inset-x-0 bottom-0"
					colors={[clearOf(page), page]}
					style={{ height: heroH * HERO.fade }}
				/>
				<Image
					accessibilityElementsHidden
					className="absolute left-1/2"
					contentFit="contain"
					source={WRITER}
					style={{
						height: HERO.art.h,
						marginLeft: -HERO.art.w / 2,
						top: heroH * HERO.art.at - HERO.art.h / 2,
						width: HERO.art.w,
					}}
				/>
			</View>
			<View className="flex-1 items-center justify-end gap-3 px-8 pb-11.5">
				<AppText
					accessibilityRole="header"
					center
					className="text-[30px] leading-[34.5px] tracking-[-0.9px]"
					variant="display"
				>
					{COPY.welcome.title}
				</AppText>
				<AppText
					center
					className="text-[15px] leading-[24px]"
					color="muted"
					variant="callout"
				>
					{COPY.welcome.line}
				</AppText>
				<HoldToBegin onDone={onBegin} />
			</View>
		</View>
	);
}
