import { Button } from "heroui-native";
import { useEffect } from "react";
import {
	AccessibilityInfo,
	ActivityIndicator,
	Platform,
	View,
} from "react-native";
import { AppText } from "@/components/shared/app-text";
import { LINK_DISCLOSURE } from "@/features/reach-me-on/link-consent";
import {
	LINK_LIFETIME_MINUTES,
	type LinkStep,
} from "@/features/reach-me-on/link-flow";
import { playSoftPress } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const STEP_NUMBER: Record<Exclude<LinkStep, "idle">, number> = {
	disclose: 1,
	expired: 2,
	linked: 3,
	waiting: 2,
};
const STEPS = [1, 2, 3] as const;
/**
 * Steps reached without a tap, read out politely: a live region on Android,
 * an announcement on iOS (VoiceOver has no live regions).
 */
const ANNOUNCE: Partial<Record<LinkStep, string>> = {
	expired: "That link expired",
	linked: "Linked. Check-ins come to Telegram first now.",
};

type Props = {
	step: Exclude<LinkStep, "idle">;
	minting: boolean;
	disabled: boolean;
	onOpenTelegram: () => void;
	onCopyLink: () => void;
	onCancel: () => void;
	onDismiss: () => void;
};

export const LinkSteps = ({
	step,
	minting,
	disabled,
	onOpenTelegram,
	onCopyLink,
	onCancel,
	onDismiss,
}: Props) => {
	const current = STEP_NUMBER[step];
	useEffect(() => {
		const message = ANNOUNCE[step];
		if (message && Platform.OS === "ios") {
			AccessibilityInfo.announceForAccessibilityWithOptions(message, {
				queue: true,
			});
		}
	}, [step]);
	const press = (fn: () => void) => () => {
		playSoftPress();
		fn();
	};
	return (
		<View className="gap-4">
			<View
				accessibilityLabel={`Step ${current} of 3`}
				accessible
				className="flex-row gap-2"
			>
				{STEPS.map((n) => (
					<View
						className={cn(
							"h-1 flex-1 rounded-full",
							n <= current ? "bg-accent" : "bg-foreground/10"
						)}
						key={n}
					/>
				))}
			</View>
			{step === "disclose" && (
				<>
					<AppText
						accessibilityRole="header"
						className="font-semibold text-foreground text-lg"
					>
						Before you link
					</AppText>
					{LINK_DISCLOSURE.map((line) => (
						<AppText className="text-foreground/75 text-sm" key={line}>
							• {line}
						</AppText>
					))}
				</>
			)}
			{step === "expired" && (
				<>
					<AppText
						accessibilityLiveRegion="polite"
						accessibilityRole="header"
						className="font-semibold text-foreground text-lg"
					>
						That link expired
					</AppText>
					<AppText className="text-foreground/70 text-sm">
						Links work for {LINK_LIFETIME_MINUTES} minutes. Open Telegram again
						for a fresh one.
					</AppText>
				</>
			)}
			{(step === "disclose" || step === "expired") && (
				<>
					<Button
						accessibilityLabel="Open Telegram"
						accessibilityState={{
							busy: minting,
							disabled: disabled || minting,
						}}
						isDisabled={disabled || minting}
						onPress={press(onOpenTelegram)}
					>
						{minting ? (
							<ActivityIndicator />
						) : (
							<Button.Label>Open Telegram</Button.Label>
						)}
					</Button>
					<Button
						isDisabled={disabled || minting}
						onPress={press(onCopyLink)}
						variant="ghost"
					>
						<Button.Label>Copy link for another device</Button.Label>
					</Button>
					<Button onPress={press(onCancel)} variant="ghost">
						<Button.Label>Cancel</Button.Label>
					</Button>
				</>
			)}
			{step === "waiting" && (
				<>
					<AppText
						accessibilityRole="header"
						className="font-semibold text-foreground text-lg"
					>
						Tap Start in Telegram
					</AppText>
					<View className="flex-row items-center gap-3">
						<ActivityIndicator />
						<AppText className="flex-1 text-foreground/70 text-sm">
							This updates on its own once the bot says hello. The link works
							for {LINK_LIFETIME_MINUTES} minutes.
						</AppText>
					</View>
					<Button
						isDisabled={disabled || minting}
						onPress={press(onOpenTelegram)}
						variant="secondary"
					>
						<Button.Label>Open Telegram again</Button.Label>
					</Button>
					<Button onPress={press(onCancel)} variant="ghost">
						<Button.Label>Cancel</Button.Label>
					</Button>
				</>
			)}
			{step === "linked" && (
				<>
					<View accessibilityLiveRegion="polite" className="gap-4">
						<AppText
							accessibilityRole="header"
							className="font-semibold text-foreground text-lg"
						>
							Linked
						</AppText>
						<AppText className="text-foreground/70 text-sm">
							Check-ins come to Telegram first now.
						</AppText>
					</View>
					<Button onPress={press(onDismiss)} variant="secondary">
						<Button.Label>Done</Button.Label>
					</Button>
				</>
			)}
		</View>
	);
};
