import { SymbolView } from "expo-symbols";
import { RadioGroup, Separator, useThemeColor } from "heroui-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/components/shared/app-text";
import { SettingsSection } from "@/components/shared/settings-section";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import {
	type MirrorTone,
	useMirrorSettings,
} from "@/features/reflect/hooks/use-mirror-settings";
import { RadioIconIndicator } from "@/features/settings/components/radio-icon-indicator";
import { VoiceSection } from "@/features/settings/components/voice-section";
import { TalkStyleSection } from "@/features/talk/talk-style-section";
import type { CrossPlatformSymbol } from "@/lib/cross-platform-symbol";
import { cn } from "@/lib/utils";

type ToneOption = {
	value: MirrorTone;
	label: string;
	description: string;
	symbol: CrossPlatformSymbol;
	premium?: boolean;
};

const TONE_OPTIONS: ToneOption[] = [
	{
		description: "Reads your writing style and mirrors it back",
		label: "Adaptive",
		symbol: { android: "graphic_eq", ios: "waveform", web: "graphic_eq" },
		value: "adaptive",
	},
	{
		description: "Evocative, metaphor-rich language",
		label: "Poetic",
		symbol: { android: "auto_awesome", ios: "moon.stars", web: "auto_awesome" },
		value: "poetic",
	},
	{
		description: "Warm, simple language",
		label: "Gentle",
		symbol: { android: "favorite", ios: "heart", web: "favorite" },
		value: "gentle",
	},
	{
		description: "Clear and minimal, no metaphors",
		label: "Direct",
		symbol: {
			android: "arrow_forward",
			ios: "arrow.right",
			web: "arrow_forward",
		},
		value: "direct",
	},
	{
		description: "Begins with a moment of recognition, then mirrors",
		label: "Witnessed",
		premium: true,
		symbol: { android: "visibility", ios: "eye", web: "visibility" },
		value: "witnessed",
	},
];

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

const styles = StyleSheet.create({
	contentContainer: { paddingBottom: 48, paddingTop: 20 },
});

export const MirrorScreen = () => {
	const { mirrorTone, setMirrorTone, flagRegisterComplaint } =
		useMirrorSettings();
	const { isPlus, isLoading: isPlusLoading } = usePlusEntitlement();
	const openPaywall = usePaywall((s) => s.open);
	const muted = useThemeColor("muted");

	const handleValueChange = (value: string) => {
		const opt = TONE_OPTIONS.find((o) => o.value === value);
		if (opt?.premium && !isPlus && !isPlusLoading) {
			flagRegisterComplaint();
			openPaywall("mirror_tone");
			return;
		}
		if (opt?.premium && isPlusLoading) {
			return;
		}
		setMirrorTone(value as MirrorTone);
	};

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerStyle={styles.contentContainer}
			contentInsetAdjustmentBehavior="automatic"
			showsVerticalScrollIndicator={false}
		>
			<EaseView
				animate={{ opacity: 1, translateY: 0 }}
				initialAnimate={{ opacity: 0, translateY: 16 }}
				transition={{ duration: 300, easing: EASE, type: "timing" }}
			>
				<SettingsSection title="Tone">
					<RadioGroup onValueChange={handleValueChange} value={mirrorTone}>
						{TONE_OPTIONS.map((opt, index) => {
							const locked = opt.premium && !isPlus && !isPlusLoading;
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
									{index < TONE_OPTIONS.length - 1 && (
										<Separator className="mx-5" />
									)}
								</View>
							);
						})}
					</RadioGroup>
				</SettingsSection>
			</EaseView>

			<VoiceSection />
			<TalkStyleSection />
		</ScrollView>
	);
};
