import { router } from "expo-router";
import type { StyleProp, ViewStyle } from "react-native";
import { GlassGroup } from "@/components/shared/glass-group";
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { goHome } from "@/lib/landing";
import { useTokenColor } from "@/lib/use-token-color";

const CHEVRON: IconName = { android: "arrow_back", ios: "chevron.left" };
// Matches the native header back button (iOS bar button chevron), so a screen that draws its own
// chrome looks the same as one with a native header.
const GLYPH = 22;

export const goBack = () => (router.canGoBack() ? router.back() : goHome());

export function BackButton({
	tint,
	style,
	className,
	label = "Back",
	icon = CHEVRON,
	onPress = goBack,
	haptic,
}: {
	tint?: string;
	style?: StyleProp<ViewStyle>;
	className?: string;
	label?: string;
	icon?: IconName;
	onPress?: () => void;
	haptic?: () => void;
}) {
	const foreground = useTokenColor("foreground");
	return (
		<GlassGroup className={cn("self-start p-0", className)} style={style}>
			<PressScale
				accessibilityLabel={label}
				className="size-11 items-center justify-center"
				haptic={haptic}
				onPress={onPress}
			>
				<Icon
					color={tint ?? foreground}
					name={icon}
					size={GLYPH}
					weight="regular"
				/>
			</PressScale>
		</GlassGroup>
	);
}
