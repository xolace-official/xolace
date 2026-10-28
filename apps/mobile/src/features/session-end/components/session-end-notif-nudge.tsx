import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import * as Notifications from "expo-notifications";
import { PressableFeedback } from "heroui-native";
import { useEffect, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { Presets } from "react-native-pulsar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { requestPushToken } from "@/lib/push-token";
import { useAppStore } from "@/store/store";

const NUDGE_EASING: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const NUDGE_TRANSITION = {
	duration: 440,
	easing: NUDGE_EASING,
	type: "timing" as const,
};
const FLUX_IMAGE_STYLE = { height: 220, width: 220 } as const;

export function SessionEndNotifNudge() {
	const [show, setShow] = useState(false);
	const [mounted, setMounted] = useState(false);
	const { height } = useWindowDimensions();
	const insets = useSafeAreaInsets();

	const notifNudgeDismissed = useAppStore((s) => s.notifNudgeDismissed);
	const setNotifNudgeDismissed = useAppStore((s) => s.setNotifNudgeDismissed);
	const registerToken = useMutation(api.notifications.registerToken);

	useEffect(() => {
		if (notifNudgeDismissed) {
			return;
		}

		let cancelled = false;
		let t: ReturnType<typeof setTimeout> | undefined;

		Notifications.getPermissionsAsync().then(({ status }) => {
			if (cancelled) {
				return;
			}
			if (status === "undetermined") {
				setMounted(true);
				t = setTimeout(() => setShow(true), 900);
			}
		});

		return () => {
			cancelled = true;
			clearTimeout(t);
		};
	}, [notifNudgeDismissed]);

	const dismiss = () => {
		setNotifNudgeDismissed(true);
		setShow(false);
	};

	const handleRemindMe = async () => {
		Presets.bloom();
		try {
			const { status } = await Notifications.requestPermissionsAsync();
			if (status === "granted") {
				const token = await requestPushToken();
				if (token) {
					await registerToken({ pushToken: token });
				}
			}
		} catch {
			// Non-blocking — permission UX is best-effort
		}
		dismiss();
	};

	const handleLater = () => {
		Presets.flick();
		dismiss();
	};

	const nudgeAnimate = { opacity: show ? 1 : 0, translateY: show ? 0 : height };
	const containerInsetStyle = {
		paddingBottom: insets.bottom + 8,
		paddingTop: insets.top,
	};

	if (!mounted) {
		return null;
	}

	return (
		<EaseView
			animate={nudgeAnimate}
			className="absolute inset-0 bg-background"
			onTransitionEnd={({ finished }) => {
				if (finished && !show) {
					setMounted(false);
				}
			}}
			style={containerInsetStyle}
			transition={NUDGE_TRANSITION}
		>
			<View className="flex-1 justify-between px-6">
				{/* Top spacer */}
				<View />

				{/* Mascot + copy */}
				<View className="items-center gap-8">
					<Image
						contentFit="contain"
						source={require("@/assets/images/flux/flux-look-mini-bg.png")}
						style={FLUX_IMAGE_STYLE}
					/>
					<View className="items-center gap-3">
						<AppText className="text-center font-semibold text-3xl text-foreground leading-10">
							Want Flux to{"\n"}check in?
						</AppText>
						<AppText className="text-center text-base text-foreground/50 leading-6">
							A quiet reminder to come back{"\n"}when you need it.
						</AppText>
					</View>
				</View>

				{/* Buttons */}
				<View className="gap-3">
					<PressableFeedback
						accessibilityLabel="Enable reminders"
						className="items-center rounded-full border border-accent/30 bg-accent/10 py-4"
						onPress={handleRemindMe}
					>
						<AppText className="font-semibold text-accent text-base">
							Remind me
						</AppText>
					</PressableFeedback>
					<PressableFeedback
						accessibilityLabel="Dismiss reminder prompt"
						className="items-center rounded-full border border-border py-4"
						onPress={handleLater}
					>
						<AppText className="font-light text-base text-foreground/30">
							Maybe later
						</AppText>
					</PressableFeedback>
				</View>
			</View>
		</EaseView>
	);
}
