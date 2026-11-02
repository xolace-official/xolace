import {
	FREEZE_CAP,
	FREEZE_EARN_EVERY,
} from "@xolace/backend/convex/lib/streakFreezes";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/shared/app-text";

const CRYSTAL = require("@/assets/images/illustrations/freeze-crystal.webp");

const styles = StyleSheet.create({
	crystal: { height: 36, width: 36 },
	// An empty stock keeps the crystal, faded, so the row reads as a slot to fill.
	empty: { opacity: 0.35 },
});

type Props = { freezes: number; currentStreak: number };

/** Streak freezes on hand (#434), shown like an inventory slot under the stats. */
export function FreezeRow({ freezes: stock, currentStreak }: Props) {
	// A dev deployment that predates the field leaves it undefined ("×undefined").
	const freezes = stock ?? 0;
	const noun = freezes === 1 ? "freeze" : "freezes";
	// A freeze only bridges a live streak, so with none running they're held,
	// not about to save anything: a gap longer than the stock breaks the streak
	// and keeps the freezes.
	const lit = currentStreak > 0;
	const label =
		freezes > 0
			? `${freezes} ${noun} ${lit ? "ready" : "on hand"}`
			: "No freezes on hand";
	const use = lit
		? "Each one covers a missed day."
		: "Saved for your next streak.";
	// earnFreeze stops at the cap, so say so rather than let a full week pass silently.
	const hint =
		freezes === 0
			? `Earn one every ${FREEZE_EARN_EVERY} days in a row.`
			: freezes >= FREEZE_CAP
				? `${use} Max ${FREEZE_CAP} on hand.`
				: use;

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
