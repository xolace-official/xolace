import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Pressable } from "react-native";
import { Icon, type IconName } from "@/components/shared/icon";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";

const GLASS = isLiquidGlassAvailable();
const SIZE = 40;
const ROUND = { borderRadius: SIZE / 2, height: SIZE, width: SIZE } as const;

/**
 * Production's `CoverGlass`: a 40 pt dark clear glass button on the cover photo, white icon. With
 * no Liquid Glass, a black 30% disc that dims on press. Fixed palette over the photo.
 */
export function CoverButton({
	icon,
	label,
	selected,
	onPress,
}: {
	icon: IconName;
	label: string;
	selected?: boolean;
	onPress: () => void;
}) {
	const ink = useTokenColor("cover-ink");
	const glyph = <Icon color={ink} name={icon} size={17} weight="semibold" />;
	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="button"
			accessibilityState={selected === undefined ? undefined : { selected }}
			className={cn(
				"items-center justify-center",
				!GLASS && "bg-cover-scrim/30 active:opacity-60"
			)}
			hitSlop={8}
			onPress={onPress}
			style={ROUND}
		>
			{GLASS ? (
				<GlassView
					colorScheme="dark"
					glassEffectStyle="clear"
					isInteractive
					style={{ ...ROUND, alignItems: "center", justifyContent: "center" }}
				>
					{glyph}
				</GlassView>
			) : (
				glyph
			)}
		</Pressable>
	);
}
