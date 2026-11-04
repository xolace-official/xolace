import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import * as Notifications from "expo-notifications";
import { PressableFeedback } from "heroui-native";
import { useEffect, useRef, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { Presets } from "react-native-pulsar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { useRecordDeferredAnswer } from "@/features/intake/use-record-deferred-answer";
import {
	offersCheckIn,
	type SupportFrequency,
} from "@/features/session-end/check-in-offer";
import {
	SUPPORT_FREQUENCY_COPY,
	SupportFrequencyChoices,
} from "@/features/session-end/components/support-frequency-choices";
import { requestPushToken } from "@/lib/push-token";
import { useAppStore } from "@/store/store";

const NUDGE_EASING: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const NUDGE_TRANSITION = {
	duration: 440,
	easing: NUDGE_EASING,
	type: "timing" as const,
};
const FLUX_IMAGE_STYLE = { height: 220, width: 220 } as const;
/** Lets the session-end screen land before the nudge slides over it. */
const SHOW_DELAY_MS = 900;

const OFFER_COPY = {
	body: "A quiet reminder to come back\nwhen you need it.",
	title: "Want Flux to\ncheck in?",
};

/** After a session, asks once whether Flux may send reminders. A v2 user who hasn't said
 * how often they need support is asked that first (#712), and someone it happens to only
 * now and then is never asked for notifications. */
export function SessionEndNotifNudge() {
	const [show, setShow] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [stage, setStage] = useState<"frequency" | "offer">("offer");
	// The stage is picked once: answering drops supportFrequency from `missing`.
	const stagePicked = useRef(false);
	const { height } = useWindowDimensions();
	const insets = useSafeAreaInsets();

	const notifNudgeDismissed = useAppStore((s) => s.notifNudgeDismissed);
	const setNotifNudgeDismissed = useAppStore((s) => s.setNotifNudgeDismissed);
	const registerToken = useMutation(api.notifications.registerToken);
	const missing = useQuery(api.intake.deferred.missing);
	const missingLoaded = missing !== undefined;
	const asksFrequency = missing?.includes("supportFrequency") ?? false;
	const recordAnswer = useRecordDeferredAnswer();

	useEffect(() => {
		// Waits for `missing` so the first beat never swaps under the user.
		if (notifNudgeDismissed || !missingLoaded || stagePicked.current) {
			return;
		}

		let cancelled = false;

		Notifications.getPermissionsAsync().then(({ status }) => {
			if (cancelled || status !== "undetermined") {
				return;
			}
			stagePicked.current = true;
			setStage(asksFrequency ? "frequency" : "offer");
			setMounted(true);
		});

		return () => {
			cancelled = true;
		};
	}, [notifNudgeDismissed, missingLoaded, asksFrequency]);

	// Apart from picking the stage, so a later `missing` update can't cancel the slide-in.
	useEffect(() => {
		if (!mounted) {
			return;
		}
		const t = setTimeout(() => setShow(true), SHOW_DELAY_MS);
		return () => clearTimeout(t);
	}, [mounted]);

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
			// Permission UX is best-effort
		}
		dismiss();
	};

	const handleFrequency = async (answer: SupportFrequency) => {
		if (offersCheckIn(answer)) {
			setStage("offer");
		} else {
			dismiss();
		}
		await recordAnswer({
			question: "supportFrequency",
			supportFrequency: answer,
		});
	};

	const handleLater = () => {
		Presets.flick();
		dismiss();
	};

	const copy = stage === "frequency" ? SUPPORT_FREQUENCY_COPY : OFFER_COPY;
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
				<View />

				<View className="items-center gap-8">
					<Image
						contentFit="contain"
						source={require("@/assets/images/flux/flux-look-mini-bg.png")}
						style={FLUX_IMAGE_STYLE}
					/>
					<View className="items-center gap-3">
						<AppText className="text-center font-semibold text-3xl text-foreground leading-10">
							{copy.title}
						</AppText>
						<AppText className="text-center text-base text-foreground/50 leading-6">
							{copy.body}
						</AppText>
					</View>
				</View>

				{stage === "frequency" ? (
					<SupportFrequencyChoices
						onAnswer={handleFrequency}
						// Skipped, nothing is known: the reminder ask stands, as before #712.
						onSkip={() => setStage("offer")}
					/>
				) : (
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
				)}
			</View>
		</EaseView>
	);
}
