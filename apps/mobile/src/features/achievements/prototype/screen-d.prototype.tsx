// PROTOTYPE (#684), throwaway: never merge.
// D "Case + rows": B's sparks card on top (latest earned badge, plus what's
// next), then A's shelf rows. Locked badges are the real art drawn greyscale
// and flattened ("emboss"), like Reddit's locked medallions. A tap pushes A's
// detail page.
import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Badge } from "./badge.prototype";
import {
	type Achievement,
	ALL,
	CATALOG,
	EARNED,
	SPARK_BALANCE,
	SPARKS_EARNED,
} from "./catalog.prototype";

/** The locked rung closest to done, by share of its target. */
const NEXT = ALL.filter((a) => a.progress).sort(
	(a, b) =>
		(b.progress?.current ?? 0) / (b.progress?.target ?? 1) -
		(a.progress?.current ?? 0) / (a.progress?.target ?? 1)
)[0];

export function ScreenD() {
	const latest = EARNED[0];
	return (
		<ScrollView
			contentContainerClassName="pb-32 pt-4"
			contentInsetAdjustmentBehavior="automatic"
		>
			<View className="mx-5 rounded-3xl bg-surface p-5">
				<View className="flex-row items-center gap-4">
					<Badge item={latest} size={96} />
					<View className="flex-1">
						<AppText className="text-[11px] text-muted uppercase tracking-wide">
							Sparks earned
						</AppText>
						<AppText className="font-bold text-[34px] text-ember leading-10">
							{SPARKS_EARNED}
						</AppText>
						<AppText className="text-[13px] text-muted">
							{SPARK_BALANCE} to spend · {EARNED.length} badges
						</AppText>
						<AppText className="mt-1 text-[12px] text-foreground/70">
							Latest: {latest.title}
						</AppText>
					</View>
				</View>
				{NEXT?.progress ? (
					<View className="mt-4 border-separator/50 border-t pt-3">
						<View className="flex-row justify-between">
							<AppText className="text-[12px] text-foreground/70">
								Next up: {NEXT.title}
							</AppText>
							<AppText className="text-[12px] text-muted">
								{NEXT.progress.current}/{NEXT.progress.target}
							</AppText>
						</View>
						<View className="mt-2 h-1.5 overflow-hidden rounded-full bg-separator">
							<View
								className="h-full bg-ember"
								style={{
									width: `${(NEXT.progress.current / NEXT.progress.target) * 100}%`,
								}}
							/>
						</View>
					</View>
				) : null}
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
						{[
							...c.items.filter((i) => i.earnedAt),
							...c.items.filter((i) => !i.earnedAt),
						].map((item) => (
							<Medallion item={item} key={item.id} />
						))}
					</ScrollView>
				</View>
			))}
		</ScrollView>
	);
}

function Medallion({ item }: { item: Achievement }) {
	const router = useRouter();
	return (
		<Pressable
			accessibilityRole="button"
			className="w-[92px] items-center"
			onPress={() =>
				router.push({
					params: { id: item.id, variant: "D" },
					pathname: "/achievements-prototype/[id]",
				})
			}
		>
			<Badge item={item} locked="emboss" size={84} />
			<AppText
				className={`mt-1.5 text-center text-[11.5px] leading-4 ${item.earnedAt ? "text-foreground" : "text-muted"}`}
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
