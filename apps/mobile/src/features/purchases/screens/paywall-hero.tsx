import { useThemeColor } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import { GradientText } from "./gradient-text";

const DEFAULT_LINE =
	"Plus opens up so much more and it goes a long way toward the change you're here to make.";

export function PaywallHero({ line = DEFAULT_LINE }: { line?: string }) {
	const accentColor = useThemeColor("accent") as string;

	return (
		<View className="items-center gap-3">
			<GradientText
				className="text-center font-bold text-3xl"
				gradientProps={{
					colors: [`${accentColor}80`, accentColor, `${accentColor}80`],
				}}
				text="Xolace+"
			/>
			<AppText className="px-4 text-center font-light text-muted text-sm leading-6">
				{line}
			</AppText>
		</View>
	);
}
