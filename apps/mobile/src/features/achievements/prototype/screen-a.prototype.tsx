// PROTOTYPE (#684), throwaway: never merge.
// A "Shelf rows": one row per category, "N of M unlocked", medallions scroll
// sideways (earned, then the next rung with its bar, then silhouettes). A tap
// pushes a full detail page.
import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Badge } from "./badge.prototype";
import {
	type Achievement,
	CATALOG,
	SPARK_BALANCE,
	SPARKS_EARNED,
} from "./catalog.prototype";

export function ScreenA() {
	return (
		<ScrollView
			contentContainerClassName="pb-32 pt-4"
			contentInsetAdjustmentBehavior="automatic"
		>
			<View className="flex-row items-baseline gap-2 px-5">
				<AppText className="font-bold text-[28px] text-ember">
					{SPARKS_EARNED}
				</AppText>
				<AppText className="text-[14px] text-muted">
					sparks earned · {SPARK_BALANCE} to spend
				</AppText>
			</View>
			{CATALOG.map((c) => (
				<View className="mt-7" key={c.id}>
					<View className="flex-row items-baseline justify-between px-5">
						<AppText className="font-semibold text-[17px] text-foreground">
							{c.title}
						</AppText>
						<AppText className="text-[13px] text-muted">
							{c.items.filter((i) => i.earnedAt).length} of {c.items.length}{" "}
							unlocked
						</AppText>
					</View>
					<ScrollView
						contentContainerClassName="gap-3 px-5 pt-3"
						horizontal
						showsHorizontalScrollIndicator={false}
					>
						{order(c.items).map((item) => (
							<Medallion item={item} key={item.id} />
						))}
					</ScrollView>
				</View>
			))}
		</ScrollView>
	);
}

/** Earned (newest rung last, so the row reads left to right), then the rest. */
const order = (items: Achievement[]) => [
	...items.filter((i) => i.earnedAt),
	...items.filter((i) => !i.earnedAt),
];

function Medallion({ item }: { item: Achievement }) {
	const router = useRouter();
	return (
		<Pressable
			accessibilityRole="button"
			className="w-[92px] items-center"
			onPress={() =>
				router.push({
					params: { id: item.id, variant: "A" },
					pathname: "/achievements-prototype/[id]",
				})
			}
		>
			<Badge item={item} size={84} />
			<AppText
				className="mt-1.5 text-center text-[11.5px] text-foreground leading-4"
				numberOfLines={2}
			>
				{item.title}
			</AppText>
			{item.progress ? (
				<View className="mt-1.5 h-1 w-16 overflow-hidden rounded-full bg-separator">
					<View
						className="h-full rounded-full bg-ember"
						style={{
							width: `${(item.progress.current / item.progress.target) * 100}%`,
						}}
					/>
				</View>
			) : null}
		</Pressable>
	);
}
