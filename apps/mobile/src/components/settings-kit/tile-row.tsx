import type { ReactNode } from "react";
import { View } from "react-native";
import { Hairline } from "@/components/settings-kit/parts";
import {
	CHEVRON_GLYPH,
	LABEL,
	ROW,
	rowLabel,
	S,
	type Tile,
	tileBg,
} from "@/components/settings-kit/settings-layout";
import { TintPress } from "@/components/settings-kit/tint-press";
import { AppText } from "@/components/shared/app-text";
import { Icon, type IconName } from "@/components/shared/icon";
import { useScheme } from "@/design/scheme";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";

type Trail = "chevron" | "out" | "none";

const CHEVRON: IconName = { android: "chevron_right", ios: "chevron.right" };
const OUT: IconName = { android: "arrow_outward", ios: "arrow.up.right" };
const OUT_GLYPH = 9.5;
const TILE_GLYPH = 16;

type Props = {
	label: string;
	sub?: string;
	value?: string;
	icon?: IconName;
	mark?: ReactNode;
	tile?: Tile;
	trail?: Trail;
	danger?: boolean;
	last?: boolean;
	shrinkValue?: boolean;
	onPress?: () => void;
	a11y?: string;
};

export function TileRow({
	label,
	sub,
	value,
	icon,
	mark,
	tile = "accent",
	trail,
	danger = false,
	last = false,
	shrinkValue = false,
	onPress,
	a11y,
}: Props) {
	const accent = useTokenColor("accent");
	const dangerColor = useTokenColor("danger");
	const foreground = useTokenColor("foreground");
	const subtle = useTokenColor("subtle");
	const dark = useScheme() === "dark";
	let glyph = danger ? dangerColor : accent;
	if (tile === "neutral") {
		glyph = foreground;
	}
	const hasTile = Boolean(icon || mark);
	const end = trail ?? (onPress ? "chevron" : "none");
	const body = (
		<>
			{hasTile ? (
				<View
					className={cn(
						"size-7.5 items-center justify-center rounded-[9px] border-continuous",
						tileBg(danger ? "danger" : tile, dark)
					)}
				>
					{mark ??
						(icon ? (
							<Icon color={glyph} name={icon} size={TILE_GLYPH} />
						) : null)}
				</View>
			) : null}
			<View className={shrinkValue ? "shrink-0" : "flex-1"}>
				<AppText className={cn(LABEL, danger && "text-danger")} variant="body">
					{label}
				</AppText>
				{sub ? (
					<AppText
						className="text-[13px] text-foreground/52 leading-[18px]"
						variant="body"
					>
						{sub}
					</AppText>
				) : null}
			</View>
			{value ? (
				<AppText
					className={cn(
						"text-right text-foreground/50 leading-[22px]",
						shrinkValue ? "flex-1 text-[14px]" : "text-[16px]"
					)}
					numberOfLines={1}
					variant="body"
				>
					{value}
				</AppText>
			) : null}
			{end === "chevron" ? (
				<Icon
					color={subtle}
					name={CHEVRON}
					size={CHEVRON_GLYPH}
					weight="semibold"
				/>
			) : null}
			{end === "out" ? (
				<Icon color={subtle} name={OUT} size={OUT_GLYPH} weight="semibold" />
			) : null}
			{last ? null : <Hairline from={hasTile ? S.lineFromTile : S.lineFrom} />}
		</>
	);
	const spoken = a11y ?? rowLabel(label, sub, value);
	if (!onPress) {
		return (
			<View accessibilityLabel={spoken} accessible className={ROW}>
				{body}
			</View>
		);
	}
	return (
		<TintPress accessibilityLabel={spoken} className={ROW} onPress={onPress}>
			{body}
		</TintPress>
	);
}
