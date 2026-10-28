import { StatusBar } from "expo-status-bar";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/shared/app-text";
import { DuskDriftBackdrop } from "@/features/onboarding/components/dusk-drift-backdrop";
import { MoodMarquee } from "@/features/onboarding/components/mood-marquee";
import { MOODS } from "@/features/onboarding/moods";
import { playGentlePresence, playOnboardingEntrance } from "@/lib/haptics";
import { useAppStore } from "@/store/store";

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_INITIAL_SLIDE = { opacity: 0, translateY: 20 };
const EASE_ANIMATE_SLIDE = { opacity: 1, translateY: 0 };
const EASE_CONTENT_TRANSITION = {
	opacity: {
		delay: 300,
		duration: 400,
		easing: EASING,
		type: "timing" as const,
	},
	transform: {
		damping: 20,
		delay: 300,
		mass: 1,
		stiffness: 120,
		type: "spring" as const,
	},
};
const EASE_CTA_TRANSITION = {
	opacity: {
		delay: 600,
		duration: 400,
		easing: EASING,
		type: "timing" as const,
	},
	transform: {
		damping: 20,
		delay: 600,
		mass: 1,
		stiffness: 120,
		type: "spring" as const,
	},
};

const getCtaStyle = ({ pressed }: { pressed: boolean }) => ({
	alignSelf: "flex-start" as const,
	opacity: pressed ? 0.7 : 1,
	paddingHorizontal: 32,
	paddingVertical: 14,
});

export const PromiseScreen = () => {
	const hasPlayedEntrance = useRef(false);
	const setIntroSeen = useAppStore((s) => s.setIntroSeen);
	const posthog = usePostHog();
	const insets = useSafeAreaInsets();
	const scrollOffsetX = useSharedValue(0);

	useEffect(() => {
		if (!hasPlayedEntrance.current) {
			hasPlayedEntrance.current = true;
			playOnboardingEntrance();
		}
	}, []);

	const handlePress = () => {
		playGentlePresence();
		// Flips the root `(onboarding)` / `(auth)` guard — Stack.Protected swaps
		// the active group on its own, so no explicit navigation call is needed
		// (and none would be reliable: `(auth)` isn't mounted until this flips).
		posthog?.capture("onboarding_completed");
		setIntroSeen(true);
	};

	const rootStyle = { paddingBottom: insets.bottom };
	const marqueeStyle = { flex: 5, paddingTop: insets.top + 40 };

	return (
		<>
			<StatusBar hidden />
			<View className="flex-1 bg-background" style={rootStyle}>
				<DuskDriftBackdrop />

				{/* Marquee — top portion */}
				<View style={marqueeStyle}>
					<MoodMarquee moods={MOODS} scrollOffsetX={scrollOffsetX} />
				</View>

				{/* Promise content — bottom portion */}
				<View style={styles.contentArea}>
					<EaseView
						animate={EASE_ANIMATE_SLIDE}
						initialAnimate={EASE_INITIAL_SLIDE}
						style={styles.contentBlock}
						transition={EASE_CONTENT_TRANSITION}
					>
						<AppText
							className="text-[22px] text-foreground/90 leading-9"
							style={styles.fontMedium}
						>
							This is a space{"\n"}to be honest.
						</AppText>
						<AppText
							className="mb-2 text-[15px] text-foreground/55 leading-7"
							style={styles.fontLight}
						>
							What you share here is private.{"\n"}
							No one sees it. No one judges it.{"\n"}
							It&apos;s yours.
						</AppText>
					</EaseView>

					<EaseView
						animate={EASE_ANIMATE_SLIDE}
						initialAnimate={EASE_INITIAL_SLIDE}
						style={styles.ctaBlock}
						transition={EASE_CTA_TRANSITION}
					>
						<Pressable
							className="rounded-full border border-accent/30"
							onPress={handlePress}
							style={getCtaStyle}
						>
							<AppText
								className="text-[15px] text-accent/80"
								style={styles.letterSpacing}
							>
								I&apos;d like that
							</AppText>
						</Pressable>
					</EaseView>
				</View>
			</View>
		</>
	);
};

const styles = StyleSheet.create({
	contentArea: {
		flex: 4,
		justifyContent: "space-between",
		paddingHorizontal: 32,
	},
	contentBlock: { gap: 20, paddingTop: 32 },
	ctaBlock: { paddingBottom: 24 },
	fontLight: { fontWeight: "300" as const },
	fontMedium: { fontFamily: "Poppins-Medium" },
	letterSpacing: { letterSpacing: 0.5 },
});
