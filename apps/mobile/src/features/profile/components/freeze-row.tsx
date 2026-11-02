import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/shared/app-text";

const CRYSTAL = require("@/assets/images/illustrations/freeze-crystal.webp");

const styles = StyleSheet.create({
	crystal: { height: 36, width: 36 },
	// An empty stock keeps the crystal, faded, so the row reads as a slot to fill.
	empty: { opacity: 0.35 },
});

type Props = { freezes: number };

/** Streak freezes on hand (#434), shown like an inventory slot under the stats. */
export function FreezeRow({ freezes }: Props) {
	const label =
		freezes > 0
			? `${freezes} ${freezes === 1 ? "freeze" : "freezes"} ready`
			: "No freezes yet";
	const hint =
		freezes > 0
			? "Each one covers a missed day."
			: "Earn one every 7 days in a row.";

	return (
		<View
			accessibilityLabel={`${label}. ${hint}`}
			accessible
			className="mt-4 flex-row items-center gap-3 border-separator/50 border-t px-2 pt-4"
		>
			<Image
				accessibilityIgnoresInvertColors
				contentFit="contain"
				source={CRYSTAL}
				style={[styles.crystal, freezes === 0 && styles.empty]}
			/>
			<AppText
				className={`font-bold text-[19px] tracking-tight ${freezes > 0 ? "text-frost" : "text-muted/60"}`}
			>
				×{freezes}
			</AppText>
			<View className="flex-1">
				<AppText className="font-semibold text-[13px] text-foreground">
					{label}
				</AppText>
				<AppText className="mt-0.5 text-[11.5px] text-muted/80 leading-4">
					{hint}
				</AppText>
			</View>
		</View>
	);
}
