import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Chip, useThemeColor } from "heroui-native";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { cn } from "@/lib/utils";
import type { PaywallFeatureId } from "./paywall-surface-map";

type Props = {
	id: PaywallFeatureId;
	icon: SymbolViewProps["name"];
	title: string;
	description?: string;
	isHighlighted: boolean;
};

export function PaywallFeatureItem({
	icon,
	title,
	description,
	isHighlighted,
}: Props) {
	const accentColor = useThemeColor("accent") as string;

	return (
		<View
			className={cn(
				"-m-2 flex-row gap-3 rounded-2xl p-2",
				isHighlighted && "border border-accent/40 bg-accent/10"
			)}
			style={styles.borderCurve}
		>
			<View
				className="mt-0.5 self-start rounded-[10px] bg-accent/12 p-2"
				style={styles.borderCurve}
			>
				<SymbolView name={icon} size={16} tintColor={accentColor} />
			</View>
			<View className="flex-1 gap-1">
				<View className="flex-row items-center gap-2">
					<AppText
						className="shrink font-medium text-[15px] text-foreground"
						ellipsizeMode="tail"
						numberOfLines={1}
					>
						{title}
					</AppText>
					{isHighlighted && (
						<Chip className="shrink-0" color="accent" size="sm">
							<Chip.Label>This unlocks it</Chip.Label>
						</Chip>
					)}
				</View>
				{description && (
					<AppText className="text-[13px] text-muted leading-5">
						{description}
					</AppText>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	borderCurve: { borderCurve: "continuous" },
});
