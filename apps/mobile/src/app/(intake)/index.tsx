import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Button, useThemeColor } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { trackIntakeStarted } from "@/features/intake/analytics";
import { FounderMarquee } from "@/features/intake/founder-message/founder-marquee";
import { LetterBody } from "@/features/intake/founder-message/letter-body";
import { FOUNDER_MESSAGE } from "@/features/intake/founder-message/letter-copy";
import { IntakeBlank } from "@/features/intake/questionnaire/intake-screen";
import { GateFade } from "@/features/profile/components/gate-fade";
import { useFullContext } from "@/lib/convex/use-full-context";

/**
 * The founder message — first screen of intake, and where a cold kill mid-intake
 * relaunches (no step cursor is kept). "Campfire Stack" (#236): a horizontal
 * marquee band of feeling-cards, the letter scrolling beneath it behind gradient
 * fades, a pinned solid CTA into the questionnaire. Commit-only — no skip.
 *
 * One message for everyone. Returning users get the same letter plus a callout,
 * keyed off sessionCount.
 *
 * Decision (#264 open question): the message is NOT re-readable later. It is a
 * once-per-account hand-off into the questions, not a document; a settings entry
 * would make it a keepsake it isn't written to be. Revisit if people ask for it.
 */
const BAND_HEIGHT = 220;
const FADE_HEIGHT = 44;

export default function IntakeIndex() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const background = useThemeColor("background") as string;

	// The root gate query (#263), not a narrow one: the root is already
	// subscribed to it and Convex dedupes, so reading `sessionCount` off it costs
	// nothing — whereas a second query is a second thing to be undefined.
	const context = useFullContext();

	// Funnel entry (T7, #267). Held until the count resolves — `session_count`
	// and `is_returning_user` are the funnel's two breakdowns, so firing early
	// with a guessed zero would mislabel every returning user. The latch is what
	// keeps a re-render from re-entering the funnel and restarting the clock.
	const posthog = usePostHog();
	const started = useRef(false);
	useEffect(() => {
		if (started.current || context === undefined) {
			return;
		}
		started.current = true;
		trackIntakeStarted(posthog, context.profile.sessionCount);
	}, [context, posthog]);

	// Never guess the audience: an unresolved count would silently render a
	// returning user the new-user letter. The root gate already blocks on this
	// query, so this is a belt-and-braces frame, not a visible flash.
	if (context === undefined) {
		return <IntakeBlank />;
	}

	const audience = context.profile.sessionCount > 0 ? "existing" : "new";

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
				<Button
					onPress={() => router.push("/(intake)/questionnaire")}
					variant="primary"
				>
					{FOUNDER_MESSAGE.cta}
				</Button>
			</View>
		</View>
	);
}
