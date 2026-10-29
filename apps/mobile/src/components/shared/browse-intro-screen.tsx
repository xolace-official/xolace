import { Image, type ImageSource } from "expo-image";
import { useThemeColor } from "heroui-native";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { AppText } from "@/components/shared/app-text";
import { HoldToContinueButton } from "@/components/shared/hold-to-continue-button";

type Props = {
	heroImage: ImageSource;
	title: string;
	subtitle: string;
	ctaLabel: string;
	onContinue: () => void;
};

const enter = (i: number) => FadeInDown.delay(250 + i * 90).duration(500);

/** One-time welcome shared by every Browse surface: hero art, title, subtitle, hold-to-continue
 * CTA. */
export function BrowseIntroScreen({
	heroImage,
	title,
	subtitle,
	ctaLabel,
	onContinue,
}: Props) {
	const insets = useSafeAreaInsets();
	const background = useThemeColor("background") as string;
	return (
		<View className="flex-1 bg-background">
			<View className="absolute inset-x-0 top-0 h-[64%]">
				<Image
					contentFit="cover"
					contentPosition="top"
					source={heroImage}
					style={StyleSheet.absoluteFill}
				/>
				{/* The surface rises at the edges, so the art dips into it at the centre. */}
				<View className="absolute inset-x-0 bottom-0 h-[12%]">
					<Svg
						height="100%"
						preserveAspectRatio="none"
						viewBox="0 0 100 100"
						width="100%"
					>
						<Path d="M0 0 Q50 200 100 0 L100 101 L0 101 Z" fill={background} />
					</Svg>
				</View>
			</View>

			<View
				className="flex-1 items-center justify-end gap-3 px-8"
				style={{ paddingBottom: insets.bottom + 16 }}
			>
				<Animated.View entering={enter(0)}>
					<AppText className="text-center font-bold text-3xl text-foreground leading-9">
						{title}
					</AppText>
				</Animated.View>
				<Animated.View entering={enter(1)}>
					<AppText className="text-center text-[15px] text-muted leading-6">
						{subtitle}
					</AppText>
				</Animated.View>
				<Animated.View className="self-stretch pt-8" entering={enter(2)}>
					<HoldToContinueButton
						className="self-stretch"
						label={ctaLabel}
						onComplete={onContinue}
					/>
				</Animated.View>
			</View>
		</View>
	);
}
