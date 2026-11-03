// PROTOTYPE (#684), throwaway: never merge. Variant D's detail page, laid out
// like Reddit's: title and copy up top, the badge large in the open middle,
// the date (or progress) under it, Pin in the header. No Share yet.
import { Stack } from "expo-router";
import { useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { Badge } from "./badge.prototype";
import { type Achievement, formatDate } from "./catalog.prototype";

const SIDE_GUTTER = 48;
const MAX_BADGE = 340;

export function DetailD({ item }: { item: Achievement }) {
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const [pinned, setPinned] = useState(false);
	const size = Math.min(width - SIDE_GUTTER * 2, MAX_BADGE);

	return (
		<View
			className="flex-1 bg-background px-8"
			style={{ paddingBottom: insets.bottom + 32, paddingTop: insets.top + 72 }}
		>
			<Stack.Screen
				options={{
					headerBackButtonDisplayMode: "minimal",
					headerRight: item.earnedAt
						? () => (
								<Pressable
									accessibilityRole="button"
									accessibilityState={{ selected: pinned }}
									className={`rounded-full px-4 py-2 ${pinned ? "bg-foreground" : "bg-surface"}`}
									onPress={() => setPinned((p) => !p)}
								>
									<AppText
										className={`font-semibold text-[14px] ${pinned ? "text-background" : "text-foreground"}`}
									>
										{pinned ? "Pinned" : "Pin"}
									</AppText>
								</Pressable>
							)
						: undefined,
					headerShadowVisible: false,
					headerShown: true,
					headerTitle: "",
					headerTransparent: true,
				}}
			/>

			<View className="items-center">
				<AppText className="text-center font-serif text-[30px] text-foreground leading-9">
					{item.title}
				</AppText>
				<AppText className="mt-3 text-center text-[16px] text-foreground/65 leading-6">
					{item.copy}
				</AppText>
			</View>

			<View className="flex-1 items-center justify-center">
				<Badge item={item} locked="emboss" size={size} />
				<View className="mt-10 items-center">
					{item.earnedAt ? (
						<AppText className="text-[15px] text-muted">
							Unlocked on {formatDate(item.earnedAt)}
						</AppText>
					) : item.progress ? (
						<>
							<View className="h-1.5 w-56 overflow-hidden rounded-full bg-separator">
								<View
									className="h-full bg-ember"
									style={{
										width: `${(item.progress.current / item.progress.target) * 100}%`,
									}}
								/>
							</View>
							<AppText className="mt-3 text-[15px] text-muted">
								{item.progress.current} of {item.progress.target}{" "}
								{item.progress.unit}
							</AppText>
						</>
					) : (
						<AppText className="text-[15px] text-muted">Not yet</AppText>
					)}
					<AppText className="mt-2 font-semibold text-[14px] text-ember">
						{item.earnedAt ? `+${item.sparks} sparks` : `${item.sparks} sparks`}
					</AppText>
				</View>
			</View>
			{/* Where Share will go; kept empty so the badge sits above centre. */}
			<View className="h-16" />
		</View>
	);
}
