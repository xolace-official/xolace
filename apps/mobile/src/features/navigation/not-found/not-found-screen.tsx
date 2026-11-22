import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { CtaButton } from "@/components/shared/cta-button";
import { playSoftPress } from "@/lib/haptics";
import { goHome } from "@/lib/landing";

const COPY = {
	body: "The link may be old, or the page has moved.",
	home: "Back to Today",
	title: "This page isn't here",
} as const;

const PAD = 24;

export function NotFoundScreen() {
	const insets = useSafeAreaInsets();
	return (
		<View
			className="flex-1 bg-background"
			style={{
				paddingBottom: insets.bottom + PAD,
				paddingHorizontal: PAD,
				paddingTop: insets.top + PAD,
			}}
		>
			<View className="flex-1 items-center justify-center gap-2">
				<AppText accessibilityRole="header" center variant="title">
					{COPY.title}
				</AppText>
				<AppText center color="muted" variant="callout">
					{COPY.body}
				</AppText>
			</View>
			<CtaButton haptic={playSoftPress} label={COPY.home} onPress={goHome} />
		</View>
	);
}
