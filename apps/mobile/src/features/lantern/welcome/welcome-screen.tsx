import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { BackHandler, useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Image, LinearGradient } from "@/components/shared/styled";
import { clearOf } from "@/design/clear-of";
import { COPY } from "@/features/lantern/copy";
import { HoldToBegin } from "@/features/lantern/welcome/hold-to-begin";
import { useTokenColors } from "@/lib/use-token-color";

const HERO_IMAGE = __DEV__
	? "https://groovy-mandrill-892.eu-west-1.convex.cloud/api/storage/5cac4b6b-7e73-4018-8c2d-0c4aa3c0539b"
	: "https://energetic-guineapig-283.convex.cloud/api/storage/9c662010-379d-411a-90fe-6f429fcfac47";

const HERO = { fade: 0.22, share: 0.64 } as const;
const ART_FADE_MS = 200;

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
				<Image
					accessibilityElementsHidden
					className="absolute inset-0"
					contentFit="cover"
					contentPosition="top"
					source={HERO_IMAGE}
					transition={ART_FADE_MS}
				/>
				<LinearGradient
					className="absolute inset-x-0 bottom-0"
					colors={[clearOf(page), page]}
					style={{ height: heroH * HERO.fade }}
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
