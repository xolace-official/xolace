// PROTOTYPE (#684), throwaway: never merge. Three directions for the
// achievements screen, switchable via `?variant=A|B|C` and the floating bar,
// which also fires a fake unlock (1 or 3 badges).
import { Stack } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import {
	type Achievement,
	UNLOCK_MANY,
	UNLOCK_ONE,
} from "@/features/achievements/prototype/catalog.prototype";
import { ScreenA } from "@/features/achievements/prototype/screen-a.prototype";
import { ScreenB } from "@/features/achievements/prototype/screen-b.prototype";
import { ScreenC } from "@/features/achievements/prototype/screen-c.prototype";
import { ScreenD } from "@/features/achievements/prototype/screen-d.prototype";
import { UnlockSheet } from "@/features/achievements/prototype/unlock-sheet.prototype";
import {
	useVariant,
	VariantSwitcher,
} from "@/features/achievements/prototype/variant-switcher.prototype";

export default function AchievementsPrototypeRoute() {
	const variant = useVariant();
	const [unlocking, setUnlocking] = useState<Achievement[]>([]);
	const pick = (count: 1 | 3) =>
		(count === 1 ? UNLOCK_ONE : UNLOCK_MANY).filter(
			(a): a is Achievement => a !== undefined
		);

	return (
		<View className="flex-1 bg-background">
			<Stack.Screen
				options={{
					headerBackButtonDisplayMode: "minimal",
					headerShadowVisible: false,
					headerShown: true,
					headerTitle: "Achievements",
				}}
			/>
			{variant === "A" ? <ScreenA /> : null}
			{variant === "B" ? <ScreenB /> : null}
			{variant === "C" ? <ScreenC /> : null}
			{variant === "D" ? <ScreenD /> : null}
			<VariantSwitcher onUnlock={(n) => setUnlocking(pick(n))} />
			<UnlockSheet
				items={unlocking}
				onClose={() => setUnlocking([])}
				variant={variant}
			/>
		</View>
	);
}
