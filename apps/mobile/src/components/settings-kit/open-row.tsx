import { useWindowDimensions, View } from "react-native";
import {
	accentTile,
	CHEVRON_GLYPH,
	rowLabel,
} from "@/components/settings-kit/settings-layout";
import { TintPress } from "@/components/settings-kit/tint-press";
import { AppText } from "@/components/shared/app-text";
import { Icon, type IconName } from "@/components/shared/icon";
import { useScheme } from "@/design/scheme";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";

const R = {
	glyph: 17,
	lineFrom: 62,
	lineTo: 20,
	min: 56,
	padH: 20,
	padV: 13,
	tile: 30,
	tileRadius: 9,
} as const;
const WRAP_AT = 1.35;
const CHEVRON: IconName = { android: "chevron_right", ios: "chevron.right" };

type Props = {
	label: string;
	icon: IconName;
	value?: string;
	chevron?: boolean;
	last?: boolean;
	onPress: () => void;
};

export function OpenRow({
	label,
	icon,
	value,
	chevron = true,
	last = false,
	onPress,
}: Props) {
	const wrap = useWindowDimensions().fontScale >= WRAP_AT;
	const accent = useTokenColor("accent");
	const subtle = useTokenColor("subtle");
	const dark = useScheme() === "dark";
	return (
		<TintPress
			accessibilityLabel={rowLabel(label, value)}
			className={cn(
				"flex-row items-center gap-3",
				wrap ? "flex-wrap" : "flex-nowrap"
			)}
			onPress={onPress}
			style={{
				minHeight: R.min,
				paddingHorizontal: R.padH,
				paddingVertical: R.padV,
			}}
		>
			<View
				className={cn(
					"items-center justify-center border-continuous",
					accentTile(dark)
				)}
				style={{ borderRadius: R.tileRadius, height: R.tile, width: R.tile }}
			>
				<Icon color={accent} name={icon} size={R.glyph} />
			</View>
			<AppText
				className={cn(
					"flex-1 text-[16px] leading-[22px]",
					wrap && "min-w-[70%]"
				)}
				variant="body"
			>
				{label}
			</AppText>
			{value ? (
				<AppText
					className="text-[16px] text-foreground/50 leading-[22px]"
					style={{ paddingLeft: wrap ? R.lineFrom - R.padH : 0 }}
					variant="body"
				>
					{value}
				</AppText>
			) : null}
			{chevron ? (
				<Icon
					color={subtle}
					name={CHEVRON}
					size={CHEVRON_GLYPH}
					weight="semibold"
				/>
			) : null}
			{last ? null : (
				<View
					className="absolute bottom-0 h-px bg-separator"
					style={{ left: R.lineFrom, right: R.lineTo }}
				/>
			)}
		</TintPress>
	);
}
