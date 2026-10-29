import { RadioGroup } from "heroui-native";
import { useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { SettingsRow } from "@/components/shared/settings-row";
import { SettingsSection } from "@/components/shared/settings-section";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { ProfileCardsSection } from "@/features/settings/components/profile-cards-section";
import { RadioIconIndicator } from "@/features/settings/components/radio-icon-indicator";
import { ThemeCarousel } from "@/features/settings/components/theme-carousel";
import {
	type ThemeMode,
	useAppearanceSettings,
} from "@/features/settings/hooks/use-appearance-settings";
import type { CrossPlatformSymbol } from "@/lib/cross-platform-symbol";
import type { MotionPreference } from "@/lib/motion/use-effective-reduced-motion";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/store";

const MODE_OPTIONS: {
	value: ThemeMode;
	label: string;
	description: string;
	symbol: CrossPlatformSymbol;
}[] = [
	{
		description: "Follows your device's appearance setting",
		label: "System",
		symbol: { android: "settings", ios: "gearshape", web: "settings" },
		value: "system",
	},
	{
		description: "Always use the light theme",
		label: "Light",
		symbol: { android: "light_mode", ios: "sun.max", web: "light_mode" },
		value: "light",
	},
	{
		description: "Always use the dark theme",
		label: "Dark",
		symbol: { android: "dark_mode", ios: "moon", web: "dark_mode" },
		value: "dark",
	},
];

const MOTION_OPTIONS: {
	value: MotionPreference;
	label: string;
	description: string;
	symbol: CrossPlatformSymbol;
}[] = [
	{
		description: "Follows your device's Reduce Motion setting",
		label: "Match my phone",
		symbol: { android: "smartphone", ios: "iphone", web: "smartphone" },
		value: "system",
	},
	{
		description:
			"Stills breathing and other fluid motion, even if your phone doesn't ask for it",
		label: "Reduced motion",
		symbol: {
			android: "slow_motion_video",
			ios: "tortoise",
			web: "slow_motion_video",
		},
		value: "reduced",
	},
	{
		description:
			"Keeps everything animated, even if your phone asks apps to calm down",
		label: "Full motion",
		symbol: { android: "animation", ios: "sparkles", web: "animation" },
		value: "full",
	},
];

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

/** Android below API 36 has no haptic sharpness channel, so Sonar's quiet pings
 * fall under the LRA floor and read as nothing; Strike survives amplitude-only. */
const playThemeSelect =
	Platform.OS === "android" ? Presets.strike : Presets.sonar;

const styles = StyleSheet.create({
	contentContainer: { paddingBottom: 48, paddingTop: 16 },
});

export const AppearanceScreen = () => {
	const {
		storedTheme,
		setThemeMode,
		colorThemeId,
		setColorTheme,
		motionPreference,
		setMotionPreference,
		osReduceMotion,
		effectiveReducedMotion,
		nightModeEnabled,
		setNightModeEnabled,
	} = useAppearanceSettings();

	// Warns when fluid motion (the breathing at "sit with this") stops following.
	const motionHint = effectiveReducedMotion
		? "Fluid motion is calmed — the breathing exercise won't expand and contract; it guides you with words and a steady haptic instead."
		: motionPreference === "full" && osReduceMotion
			? "Your phone asks apps to reduce motion, but Xolace will stay fully animated."
			: "Everything stays gently in motion, including the breathing exercise.";

	const setIntroSeen = useAppStore((s) => s.setIntroSeen);
	const [replayIntroOpen, setReplayIntroOpen] = useState(false);
	const { isPlus } = usePlusEntitlement();
	const openPaywall = usePaywall((s) => s.open);

	const handleFreeThemePress = (themeId: string) => {
		playThemeSelect();
		setColorTheme(themeId);
	};

	const handlePremiumThemePress = (themeId: string, available: boolean) => {
		if (!isPlus) {
			openPaywall("premium_theme");
			return;
		}
		if (!available) {
			return;
		}
		playThemeSelect();
		setColorTheme(themeId);
	};

	// No haptic here: SettingsRow's toggle variant already plays one.
	const handleNightModeToggle = (v: boolean) => {
		setNightModeEnabled(v);
	};

	return (
		<>
			<ScrollView
				className="flex-1 bg-background"
				contentContainerStyle={styles.contentContainer}
				contentInsetAdjustmentBehavior="automatic"
				showsVerticalScrollIndicator={false}
			>
				<EaseView
					animate={{ opacity: 1, translateY: 0 }}
					className="mb-8"
					initialAnimate={{ opacity: 0, translateY: 16 }}
					transition={{ duration: 280, easing: EASE, type: "timing" }}
				>
					<SettingsSection title="Mode">
						<View className="gap-2 px-5">
							<RadioGroup
								className="gap-2"
								onValueChange={(v) => setThemeMode(v as ThemeMode)}
								value={storedTheme ?? "system"}
							>
								{MODE_OPTIONS.map((opt) => (
									<RadioGroup.Item key={opt.value} value={opt.value}>
										{({ isSelected }) => (
											<View
												className={cn(
													"flex-row items-center gap-4 rounded-2xl px-4 py-4",
													isSelected ? "bg-surface" : "bg-surface/30"
												)}
											>
												<RadioIconIndicator
													isSelected={isSelected}
													symbol={opt.symbol}
												/>
												<View className="flex-1 gap-0.5">
													<AppText className="font-medium text-base text-foreground">
														{opt.label}
													</AppText>
													<AppText className="text-foreground/55 text-sm">
														{opt.description}
													</AppText>
												</View>
											</View>
										)}
									</RadioGroup.Item>
								))}
							</RadioGroup>
						</View>
					</SettingsSection>
				</EaseView>

				<EaseView
					animate={{ opacity: 1, translateY: 0 }}
					className="mb-8"
					initialAnimate={{ opacity: 0, translateY: 16 }}
					transition={{
						delay: 60,
						duration: 300,
						easing: EASE,
						type: "timing",
					}}
				>
					<AppText className="px-5 pb-3 font-semibold text-accent text-xs uppercase tracking-widest">
						App Themes
					</AppText>
					<ThemeCarousel
						activeThemeId={colorThemeId}
						isPlus={isPlus}
						onFreeThemePress={handleFreeThemePress}
						onPremiumThemePress={handlePremiumThemePress}
						reducedMotion={effectiveReducedMotion}
					/>
				</EaseView>

				<EaseView
					animate={{ opacity: 1, translateY: 0 }}
					className="mb-8"
					initialAnimate={{ opacity: 0, translateY: 16 }}
					transition={{
						delay: 120,
						duration: 280,
						easing: EASE,
						type: "timing",
					}}
				>
					<SettingsSection title="Motion">
						<View className="gap-2 px-5">
							<RadioGroup
								className="gap-2"
								onValueChange={(v) =>
									setMotionPreference(v as MotionPreference)
								}
								value={motionPreference}
							>
								{MOTION_OPTIONS.map((opt) => (
									<RadioGroup.Item key={opt.value} value={opt.value}>
										{({ isSelected }) => (
											<View
												className={cn(
													"flex-row items-center gap-4 rounded-2xl px-4 py-4",
													isSelected ? "bg-surface" : "bg-surface/30"
												)}
											>
												<RadioIconIndicator
													isSelected={isSelected}
													symbol={opt.symbol}
												/>
												<View className="flex-1 gap-0.5">
													<AppText className="font-medium text-base text-foreground">
														{opt.label}
													</AppText>
													<AppText className="text-foreground/55 text-sm">
														{opt.description}
													</AppText>
												</View>
											</View>
										)}
									</RadioGroup.Item>
								))}
							</RadioGroup>
							<View className="mt-1 flex-row items-start gap-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
								<AppText className="flex-1 text-foreground/60 text-sm leading-5">
									{motionHint}
								</AppText>
							</View>
						</View>
					</SettingsSection>
				</EaseView>

				<EaseView
					animate={{ opacity: 1, translateY: 0 }}
					className="mx-5 mb-8 overflow-hidden rounded-2xl bg-surface"
					initialAnimate={{ opacity: 0, translateY: 16 }}
					transition={{
						delay: 160,
						duration: 280,
						easing: EASE,
						type: "timing",
					}}
				>
					<SettingsRow
						isSelected={nightModeEnabled}
						label="Night mode (10pm–4am)"
						onToggle={handleNightModeToggle}
						variant="toggle"
					/>
					<View className="px-5 pb-4">
						<AppText className="text-foreground/30 text-xs leading-5">
							Shifts the theme and words to match the rawer emotional register
							of late-night sessions.
						</AppText>
					</View>
				</EaseView>

				<ProfileCardsSection />

				<EaseView
					animate={{ opacity: 1, translateY: 0 }}
					initialAnimate={{ opacity: 0, translateY: 16 }}
					transition={{
						delay: 200,
						duration: 280,
						easing: EASE,
						type: "timing",
					}}
				>
					<SettingsSection title="General">
						<SettingsRow
							isLast
							label="Replay intro"
							onPress={() => setReplayIntroOpen(true)}
							variant="chevron"
						/>
					</SettingsSection>
				</EaseView>
			</ScrollView>

			<ConfirmationDialog
				confirmLabel="Replay"
				description="You'll be taken back to the opening screens."
				isOpen={replayIntroOpen}
				onConfirm={() => {
					setReplayIntroOpen(false);
					setIntroSeen(false);
				}}
				onOpenChange={setReplayIntroOpen}
				title="Replay intro?"
			/>
		</>
	);
};
