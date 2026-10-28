import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import {
	type MirrorTone,
	MirrorTonePickerDialog,
} from "@/features/settings/components/mirror-tone-picker-dialog";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { useAppStore } from "@/store/store";

const CLOSE_ICON = { android: "close", ios: "xmark", web: "close" } as const;

export const ToneTipBanner = () => {
	const { toneTipSeen, setToneTipSeen } = useAppStore();
	const { mirrorTone, setMirrorTone } = useSettings();
	const posthog = usePostHog();
	const [pickerOpen, setPickerOpen] = useState(false);
	const [confirmedLabel, setConfirmedLabel] = useState<string | null>(null);
	const foregroundColor = useThemeColor("foreground");

	useEffect(() => {
		if (!toneTipSeen) {
			posthog.capture("tone_tip_shown");
		}
	}, [toneTipSeen, posthog]);

	useEffect(() => {
		if (!confirmedLabel) {
			return;
		}
		const t = setTimeout(() => setToneTipSeen(true), 3000);
		return () => clearTimeout(t);
	}, [confirmedLabel, setToneTipSeen]);

	if (toneTipSeen) {
		return null;
	}

	const handleDismiss = () => {
		posthog.capture("tone_tip_dismissed");
		setToneTipSeen(true);
	};

	const handleToneSelect = (tone: MirrorTone) => {
		posthog.capture("tone_tip_tone_selected", { tone });
		setMirrorTone(tone);
		setPickerOpen(false);
		setConfirmedLabel(tone.charAt(0).toUpperCase() + tone.slice(1));
	};

	return (
		<>
			<View className="mt-2 mb-4 flex-row items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
				{confirmedLabel ? (
					<AppText className="flex-1 text-foreground/60 text-sm leading-5">
						Your next reflection will use {confirmedLabel} tone.
					</AppText>
				) : (
					<>
						<AppText className="flex-1 text-foreground/60 text-sm leading-5">
							You can change how the mirror reflects. Explore different tones.
						</AppText>
						<View className="flex-row items-center gap-3 pt-0.5">
							<PressableFeedback
								accessibilityLabel="Adjust tone"
								accessibilityRole="button"
								hitSlop={8}
								onPress={() => setPickerOpen(true)}
							>
								<AppText className="font-medium text-accent text-sm">
									Adjust tone
								</AppText>
							</PressableFeedback>
							<PressableFeedback
								accessibilityLabel="Dismiss tip"
								accessibilityRole="button"
								hitSlop={8}
								onPress={handleDismiss}
							>
								<SymbolView
									name={CLOSE_ICON}
									size={14}
									style={styles.closeIcon}
									tintColor={foregroundColor}
								/>
							</PressableFeedback>
						</View>
					</>
				)}
			</View>
			<MirrorTonePickerDialog
				currentTone={mirrorTone}
				isOpen={pickerOpen}
				onOpenChange={setPickerOpen}
				onSelect={handleToneSelect}
			/>
		</>
	);
};

const styles = StyleSheet.create({
	closeIcon: { opacity: 0.4 },
});
