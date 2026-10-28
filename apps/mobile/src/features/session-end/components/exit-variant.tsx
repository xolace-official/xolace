import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Button, LinkButton } from "heroui-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/components/shared/app-text";
import { SessionEndUpsell } from "@/features/insights/compounding-upsell";
import { NIGHT_SESSION_END_EXIT } from "@/features/reflect/night-copy";
import { CloseOffer } from "@/features/session-end/components/close-offer";
import { KindlingCloseSlot } from "@/features/session-end/components/kindling-close-slot";

type Phase = "acknowledge" | "close";

type Props = {
	onHaveMore: () => void;
	isNight?: boolean;
	sessionId?: Id<"sessions">;
};

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_SLOW = { duration: 600, easing: EASING, type: "timing" as const };
const EASE_IN = {
	delay: 300,
	duration: 400,
	easing: EASING,
	type: "timing" as const,
};
const FADE_OUT = { opacity: 0 };
const FADE_IN = { opacity: 1 };
const SLIDE_OUT = { opacity: 0, translateY: 20 };
const SLIDE_IN = { opacity: 1, translateY: 0 };

const styles = StyleSheet.create({
	mascot: {
		flex: 1,
		width: "100%",
	},
});

export const ExitVariant = ({
	onHaveMore,
	isNight = false,
	sessionId,
}: Props) => {
	const [phase, setPhase] = useState<Phase>("acknowledge");
	const router = useRouter();

	useEffect(() => {
		if (phase !== "acknowledge") {
			return;
		}
		const timer = setTimeout(() => setPhase("close"), 3500);
		return () => clearTimeout(timer);
	}, [phase]);

	const handleTimelinePress = () => {
		router.push("/(protected)/timeline");
	};

	return (
		<View className="flex-1">
			{phase === "acknowledge" && (
				<Pressable
					className="flex-1 px-8 pb-8"
					onPress={() => setPhase("close")}
				>
					{/* TODO(mascot-video): Replace Image with VideoView once expo-video is installed in a store release. See TODOS.md — "Looping Mascot Video on Acknowledge Phase". */}
					<Image
						contentFit="contain"
						source={require("@/assets/images/flux/jump-love-bgremove.png")}
						style={styles.mascot}
					/>
					<EaseView
						animate={FADE_IN}
						initialAnimate={FADE_OUT}
						transition={EASE_SLOW}
					>
						<AppText className="mb-3 font-serif text-3xl text-foreground">
							{isNight ? NIGHT_SESSION_END_EXIT : "Heard."}
						</AppText>
						<View className="flex-row flex-wrap">
							<AppText className="font-light text-base text-foreground/40 leading-7">
								It&apos;s saved to{" "}
							</AppText>
							<LinkButton onPress={handleTimelinePress} size="sm">
								<LinkButton.Label className="font-light text-accent/65 text-base">
									your timeline
								</LinkButton.Label>
							</LinkButton>
							<AppText className="font-light text-base text-foreground/40 leading-7">
								{" "}
								whenever you want to come back.
							</AppText>
						</View>
					</EaseView>
				</Pressable>
			)}

			{phase === "close" && (
				<View className="flex-1 items-center justify-center px-8">
					<EaseView
						animate={SLIDE_IN}
						className="w-full items-center gap-4"
						initialAnimate={SLIDE_OUT}
						transition={EASE_IN}
					>
						<CloseOffer sessionId={sessionId} variant="exit" />
						<SessionEndUpsell sessionId={sessionId} />
						<KindlingCloseSlot sessionId={sessionId} />

						<Button
							accessibilityLabel="Start another session"
							className="w-full rounded-2xl"
							onPress={onHaveMore}
							size="lg"
							variant="primary"
						>
							<Button.Label>Start another session</Button.Label>
						</Button>
					</EaseView>
				</View>
			)}
		</View>
	);
};
