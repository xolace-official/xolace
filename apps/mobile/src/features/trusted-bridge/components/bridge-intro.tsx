import { SymbolView } from "expo-symbols";
import { Button, useThemeColor } from "heroui-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/components/shared/app-text";
import { BridgeIntroMascot } from "@/features/trusted-bridge/components/bridge-intro-mascot";

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const FADE_OUT = { opacity: 0 };
const FADE_IN = { opacity: 1 };
const SLIDE_OUT = { opacity: 0, translateY: 14 };
const SLIDE_IN = { opacity: 1, translateY: 0 };

const PRIVACY_ITEMS = [
	{
		sub: "Who you're writing to is never saved.",
		symbol: { android: "security", ios: "lock.shield.fill", web: "security" },
		title: "Never stored",
	},
	{
		sub: "Their name shapes the draft, then it's discarded.",
		symbol: { android: "auto_awesome", ios: "sparkles", web: "auto_awesome" },
		title: "Used only to write this",
	},
	{
		sub: "Only you decide if it goes.",
		symbol: { android: "back_hand", ios: "hand.raised.fill", web: "back_hand" },
		title: "Nothing sends itself",
	},
] as const;

const styles = StyleSheet.create({
	scrollContainer: {
		gap: 28,
		paddingBottom: 16,
		paddingHorizontal: 32,
		paddingTop: 24,
	},
});

type Props = { onBegin: () => void };

export function BridgeIntro({ onBegin }: Props) {
	const accentColor = useThemeColor("accent") as string;
	const iconBg = (useThemeColor("foreground") as string) + "12";

	return (
		<View className="flex-1">
			<ScrollView
				className="flex-1"
				contentContainerStyle={styles.scrollContainer}
				showsVerticalScrollIndicator={false}
			>
				{/* Mascot — crossfades from holding the boat to sending it off */}
				<EaseView
					animate={FADE_IN}
					initialAnimate={FADE_OUT}
					transition={{ duration: 700, easing: EASING, type: "timing" }}
				>
					<BridgeIntroMascot />
				</EaseView>

				{/* Headline + problem statement */}
				<EaseView
					animate={SLIDE_IN}
					className="gap-3"
					initialAnimate={SLIDE_OUT}
					transition={{
						delay: 200,
						duration: 500,
						easing: EASING,
						type: "timing",
					}}
				>
					<AppText className="text-3xl text-foreground leading-10">
						Felt it.{"\n"}Now find the words.
					</AppText>
					<AppText className="font-light text-foreground/55 text-sm leading-6">
						Processing is one thing. Telling someone who matters is another.
						Trusted Bridge turns what you felt into something you can actually
						say.
					</AppText>
				</EaseView>

				{/* Privacy rows */}
				<View className="gap-4">
					{PRIVACY_ITEMS.map(({ symbol, title, sub }, i) => (
						<EaseView
							animate={SLIDE_IN}
							className="flex-row items-center gap-4"
							initialAnimate={SLIDE_OUT}
							key={title}
							transition={{
								delay: 400 + i * 100,
								duration: 500,
								easing: EASING,
								type: "timing",
							}}
						>
							<View
								className="size-10 shrink-0 items-center justify-center rounded-2xl"
								style={{ backgroundColor: iconBg }}
							>
								<SymbolView name={symbol} size={18} tintColor={accentColor} />
							</View>
							<View className="flex-1 gap-0.5">
								<AppText className="font-medium text-foreground text-sm">
									{title}
								</AppText>
								<AppText className="font-light text-foreground/40 text-xs leading-4">
									{sub}
								</AppText>
							</View>
						</EaseView>
					))}
				</View>
			</ScrollView>

			{/* Fixed CTA */}
			<EaseView
				animate={FADE_IN}
				className="px-8 pt-4 pb-10"
				initialAnimate={FADE_OUT}
				transition={{
					delay: 750,
					duration: 400,
					easing: EASING,
					type: "timing",
				}}
			>
				<Button
					className="w-full"
					onPress={onBegin}
					size="lg"
					variant="primary"
				>
					Begin
				</Button>
			</EaseView>
		</View>
	);
}
