import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Card } from "@/components/shared/card";

export function FixtureFinding() {
	return (
		<Card className="gap-3 px-5 py-5">
			<View className="flex-row items-start justify-between gap-3">
				<AppText
					accessibilityRole="header"
					className="flex-1"
					variant="body"
					weight="medium"
				>
					How did you find Xolace?
				</AppText>
				<AppText color="muted" variant="footnote">
					Not now
				</AppText>
			</View>
			<View className="flex-row flex-wrap gap-2">
				{["A friend", "TikTok", "Instagram", "App Store", "Something else"].map(
					(label) => (
						<View
							className="rounded-full border border-separator px-3.5 py-2"
							key={label}
						>
							<AppText variant="footnote">{label}</AppText>
						</View>
					)
				)}
			</View>
		</Card>
	);
}
