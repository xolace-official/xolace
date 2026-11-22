import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { Button, useThemeColor } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useCallback, useEffect, useRef } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { GateFade } from "@/components/shared/gate-fade";
import { trackIntakeStarted } from "@/features/intake/analytics";
import { FounderMarquee } from "@/features/intake/founder-message/founder-marquee";
import { LetterBody } from "@/features/intake/founder-message/letter-body";
import { FOUNDER_MESSAGE } from "@/features/intake/founder-message/letter-copy";
import { IntakeBlank } from "@/features/intake/v2/intake-screen";
import { useFullContext } from "@/lib/convex/use-full-context";

const BAND_HEIGHT = 220;
const FADE_HEIGHT = 44;

export default function IntakeIndex() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const background = useThemeColor("background") as string;

	const context = useFullContext();

	const posthog = usePostHog();
	const started = useRef(false);
	const leaving = useRef(false);
	useFocusEffect(
		useCallback(() => {
			leaving.current = false;
		}, [])
	);
	useEffect(() => {
		if (started.current || context === undefined) {
			return;
		}
		started.current = true;
		trackIntakeStarted(posthog, context.profile.sessionCount);
	}, [context, posthog]);

	if (context === undefined) {
		return <IntakeBlank />;
	}

	const audience = context.profile.sessionCount > 0 ? "existing" : "new";

	const beginIntake = () => {
		if (leaving.current) {
			return;
		}
		leaving.current = true;
		router.push("/(intake)/flux");
	};

	return (
		<View
			className="flex-1 bg-background"
			style={{ paddingBottom: insets.bottom, paddingTop: insets.top }}
		>
			<View style={{ height: BAND_HEIGHT }}>
				<FounderMarquee viewport={width} />
			</View>

			<View className="flex-1">
				<ScrollView
					contentContainerClassName="px-6 pt-7 pb-12 gap-5"
					showsVerticalScrollIndicator={false}
				>
					<AppText className="font-[Poppins-Regular] text-foreground text-lg">
						{FOUNDER_MESSAGE.greeting}
					</AppText>
					<LetterBody audience={audience} />
					<View className="mt-6 flex-row items-center gap-3">
						<Image
							contentFit="cover"
							contentPosition="top"
							source={require("@/assets/images/founder-images/Nathan-mini.jpeg")}
							style={{ borderRadius: 20, height: 40, width: 40 }}
						/>
						<AppText className="font-[Poppins-Regular] text-[15px] text-foreground/70">
							Nathaniel, your new friend
						</AppText>
					</View>
				</ScrollView>

				<View className="absolute top-0 right-0 left-0" pointerEvents="none">
					<GateFade
						color={background}
						endAlpha="F2"
						flip
						height={FADE_HEIGHT}
						width={width}
					/>
				</View>
				<View className="absolute right-0 bottom-0 left-0" pointerEvents="none">
					<GateFade
						color={background}
						endAlpha="F2"
						height={FADE_HEIGHT}
						width={width}
					/>
				</View>
			</View>

			<View className="px-6 pt-2">
				<Button onPress={beginIntake} variant="primary">
					{FOUNDER_MESSAGE.cta}
				</Button>
			</View>
		</View>
	);
}
