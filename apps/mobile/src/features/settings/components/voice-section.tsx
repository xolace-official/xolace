import { SymbolView } from "expo-symbols";
import {
	PressableFeedback,
	RadioGroup,
	Separator,
	useThemeColor,
} from "heroui-native";
import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/components/shared/app-text";
import { SettingsSection } from "@/components/shared/settings-section";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { RadioIconIndicator } from "@/features/settings/components/radio-icon-indicator";
import { useVoiceSettings } from "@/features/settings/hooks/use-voice-settings";
import { useVoicePreview } from "@/features/talk/use-voice-preview";
import { VOICE_OPTIONS, type VoiceValue } from "@/features/talk/voice-options";
import { playSoftPress } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

/**
 * Plus-gated custom-voice picker. Mirrors the Tone section's RadioGroup, with
 * two additions: named voices are locked for free users (tap → paywall), and
 * each carries a play/stop preview that works even when locked.
 */
export const VoiceSection = () => {
	const { voice, setVoice } = useVoiceSettings();
	const { isPlus, isLoading: isPlusLoading } = usePlusEntitlement();
	const openPaywall = usePaywall((s) => s.open);
	const preview = useVoicePreview();
	const accent = useThemeColor("accent");
	const muted = useThemeColor("muted");

	const handleValueChange = (value: string) => {
		const opt = VOICE_OPTIONS.find((o) => o.value === value);
		if (opt?.premium && !isPlus && !isPlusLoading) {
			openPaywall("mirror_voice");
			return;
		}
		if (opt?.premium && isPlusLoading) {
			return;
		}
		setVoice(value as VoiceValue);
	};

	return (
		<EaseView
			animate={{ opacity: 1, translateY: 0 }}
			initialAnimate={{ opacity: 0, translateY: 16 }}
			transition={{ delay: 80, duration: 300, easing: EASE, type: "timing" }}
		>
			<SettingsSection title="Voice">
				<RadioGroup onValueChange={handleValueChange} value={voice}>
					{VOICE_OPTIONS.map((opt, index) => {
						const locked = opt.premium && !isPlus && !isPlusLoading;
						// null for "auto" (no preview); a VoiceSlug otherwise. A const so
						// the narrowing survives into the preview callback below.
						const slug = opt.value === "auto" ? null : opt.value;
						return (
							<View key={opt.value}>
								<RadioGroup.Item className="px-5 py-4" value={opt.value}>
									{({ isSelected }) => (
										<>
											<View
												className={cn(
													"flex-1 gap-0.5 pr-3",
													locked && "opacity-40"
												)}
											>
												<AppText className="font-medium text-base text-foreground">
													{opt.label}
												</AppText>
												<AppText className="text-foreground/55 text-sm">
													{opt.description}
												</AppText>
											</View>
											{slug && (
												<PressableFeedback
													accessibilityLabel={
														preview.playingSlug === slug
															? `Stop ${opt.label} voice preview`
															: `Play ${opt.label} voice preview`
													}
													accessibilityRole="button"
													className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-accent/10"
													onPress={() => {
														playSoftPress();
														preview.toggle(slug);
													}}
												>
													<SymbolView
														name={
															preview.playingSlug === slug
																? {
																		android: "stop",
																		ios: "stop.fill",
																		web: "stop",
																	}
																: {
																		android: "play_arrow",
																		ios: "play.fill",
																		web: "play_arrow",
																	}
														}
														size={15}
														tintColor={accent}
													/>
												</PressableFeedback>
											)}
											{locked ? (
												<SymbolView
													name={{
														android: "lock",
														ios: "lock.fill",
														web: "lock",
													}}
													size={16}
													tintColor={muted}
												/>
											) : (
												<RadioIconIndicator
													isSelected={isSelected}
													symbol={opt.symbol}
												/>
											)}
										</>
									)}
								</RadioGroup.Item>
								{index < VOICE_OPTIONS.length - 1 && (
									<Separator className="mx-5" />
								)}
							</View>
						);
					})}
				</RadioGroup>
			</SettingsSection>
		</EaseView>
	);
};
