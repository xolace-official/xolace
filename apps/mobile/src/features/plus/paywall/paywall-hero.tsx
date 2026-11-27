import { useThemeColor } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PAYWALL } from "./copy";
import { GradientText } from "./gradient-text";

export function PaywallHero({ line = PAYWALL.hero.line }: { line?: string }) {
	const accentColor = useThemeColor("accent") as string;

	return (
		<View className="items-center gap-3">
			<GradientText
				className="text-center font-bold text-3xl"
				gradientProps={{
					colors: [`${accentColor}80`, accentColor, `${accentColor}80`],
				}}
				text={PAYWALL.hero.title}
			/>
			<AppText className="px-4 text-center font-light text-muted text-sm leading-6">
				{line}
			</AppText>
		</View>
	);
}
