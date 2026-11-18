import { GlassGroup } from "@/components/shared/glass-group";
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

const GLYPH = 17;

/** The floating glass button at the top left (the kit's BackButton, with its own press). */
export function RoundButton({
	icon,
	label,
	onPress,
}: {
	icon: IconName;
	label: string;
	onPress: () => void;
}) {
	const foreground = useTokenColor("foreground");
	return (
		<GlassGroup className="self-start p-0">
			<PressScale
				accessibilityLabel={label}
				className="size-11 items-center justify-center"
				haptic={playSoftPress}
				onPress={onPress}
			>
				<Icon color={foreground} name={icon} size={GLYPH} weight="semibold" />
			</PressScale>
		</GlassGroup>
	);
}
