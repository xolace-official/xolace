// PROTOTYPE (#684), throwaway: never merge. Mounted under the profile's stat
// band when the route has `?variant=`. Buying a freeze is a local stub.
//   A: a strip of the latest badges + "See all", spend line under it.
//   B: a Sparks card: balance first, a Buy-a-freeze button, badge count.
//   C: one tile: the next rung coming up, with its bar; spend lives in the
//      achievements screen only.
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Badge } from "./badge.prototype";
import {
	ALL,
	EARNED,
	FREEZE_PRICE,
	SPARK_BALANCE,
	SPARKS_EARNED,
} from "./catalog.prototype";
import type { VariantKey } from "./variant-switcher.prototype";

const NEXT = ALL.find((a) => a.id === "streak-14");

export function ProfileShelf({ variant }: { variant: VariantKey }) {
	const router = useRouter();
	const [balance, setBalance] = useState(SPARK_BALANCE);
	const buy = () => setBalance((b) => b - FREEZE_PRICE);
	const canBuy = balance >= FREEZE_PRICE;
	const seeAll = () =>
		router.push({ params: { variant }, pathname: "/achievements-prototype" });

	if (variant === "A") {
		return (
			<View className="mx-5 mt-5">
				<View className="flex-row items-baseline justify-between">
					<AppText className="font-semibold text-[15px] text-foreground">
						Badges · {EARNED.length}
					</AppText>
					<Pressable accessibilityRole="link" onPress={seeAll}>
						<AppText className="text-[13px] text-accent">See all ›</AppText>
					</Pressable>
				</View>
				<View className="mt-3 flex-row justify-between">
					{EARNED.slice(0, 5).map((item) => (
						<Badge item={item} key={item.id} size={58} />
					))}
				</View>
				<View className="mt-3 flex-row items-center justify-between">
					<AppText className="text-[12.5px] text-muted">
						<AppText className="font-bold text-ember">{SPARKS_EARNED}</AppText>{" "}
						sparks earned · {balance} to spend
					</AppText>
					<Pressable
						accessibilityRole="button"
						disabled={!canBuy}
						onPress={buy}
					>
						<AppText
							className={`text-[12.5px] ${canBuy ? "text-frost-text" : "text-muted/50"}`}
						>
							Freeze for {FREEZE_PRICE}
						</AppText>
					</Pressable>
				</View>
			</View>
		);
	}

	if (variant === "B" || variant === "D") {
		return (
			<View className="mx-5 mt-5 rounded-3xl bg-surface p-5">
				<View className="flex-row items-center justify-between">
					<View>
						<AppText className="text-[11px] text-muted uppercase tracking-wide">
							Spark balance
						</AppText>
						<AppText className="font-bold text-[30px] text-ember leading-9">
							{balance}
						</AppText>
						<AppText className="text-[12px] text-muted">
							{SPARKS_EARNED} earned all time
						</AppText>
					</View>
					<Pressable
						accessibilityRole="button"
						className={`rounded-full px-4 py-2.5 ${canBuy ? "bg-frost/20" : "bg-separator/40"}`}
						disabled={!canBuy}
						onPress={buy}
					>
						<AppText className="font-semibold text-[13px] text-frost-text">
							Buy a freeze · {FREEZE_PRICE}
						</AppText>
					</Pressable>
				</View>
				<Pressable
					accessibilityRole="link"
					className="mt-4 flex-row items-center gap-2 border-separator/50 border-t pt-4"
					onPress={seeAll}
				>
					{EARNED.slice(0, 3).map((item) => (
						<Badge item={item} key={item.id} size={32} />
					))}
					<AppText className="flex-1 text-[13px] text-foreground">
						{EARNED.length} badges
					</AppText>
					<AppText className="text-[13px] text-accent">›</AppText>
				</Pressable>
			</View>
		);
	}

	if (!NEXT?.progress) {
		return null;
	}
	return (
		<Pressable
			accessibilityRole="link"
			className="mx-5 mt-5 flex-row items-center gap-4 rounded-3xl bg-surface p-4"
			onPress={seeAll}
		>
			<Badge item={NEXT} size={64} />
			<View className="flex-1">
				<AppText className="text-[11px] text-muted uppercase tracking-wide">
					Coming up
				</AppText>
				<AppText className="font-semibold text-[15px] text-foreground">
					{NEXT.title}
				</AppText>
				<View className="mt-2 h-1.5 overflow-hidden rounded-full bg-separator">
					<View
						className="h-full bg-ember"
						style={{
							width: `${(NEXT.progress.current / NEXT.progress.target) * 100}%`,
						}}
					/>
				</View>
				<AppText className="mt-1.5 text-[12px] text-muted">
					{EARNED.length} badges · {SPARKS_EARNED} sparks
				</AppText>
			</View>
		</Pressable>
	);
}
