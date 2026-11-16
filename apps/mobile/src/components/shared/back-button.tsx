import { router } from "expo-router";
import type { StyleProp, ViewStyle } from "react-native";
import { GlassGroup } from "@/components/shared/glass-group";
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";

const CHEVRON: IconName = { android: "arrow_back", ios: "chevron.left" };
const GLYPH = 17;

/**
 * Back, or home when a deep link left nothing behind.
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export const goBack = () =>
	router.canGoBack() ? router.back() : router.replace("/");

/**
 * A floating glass back button for pushed screens that draw their own top.
 * Callers place it with `style` (position, top from insets) or `className`.
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export function BackButton({
	tint,
	style,
	className,
	label = "Back",
}: {
	/** A colour string for the chevron (`useTokenColor`); the theme's ink by default. */
	tint?: string;
	style?: StyleProp<ViewStyle>;
	className?: string;
	label?: string;
}) {
	const foreground = useTokenColor("foreground");
	return (
		<GlassGroup className={cn("self-start p-0", className)} style={style}>
			<PressScale
				accessibilityLabel={label}
				className="size-11 items-center justify-center"
				onPress={goBack}
			>
				<Icon
					color={tint ?? foreground}
					name={CHEVRON}
					size={GLYPH}
					weight="semibold"
				/>
			</PressScale>
		</GlassGroup>
	);
}
