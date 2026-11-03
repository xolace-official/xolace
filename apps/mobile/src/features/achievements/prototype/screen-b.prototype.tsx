// PROTOTYPE (#684), throwaway: never merge.
// B "Trophy case": a sparks hero with the latest badge on top, category chips,
// then a 3-column grid of one category. A tap opens the detail in a sheet.
import { BottomSheet } from "heroui-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { Badge } from "./badge.prototype";
import {
	type Achievement,
	CATALOG,
	EARNED,
	SPARK_BALANCE,
	SPARKS_EARNED,
} from "./catalog.prototype";
import { DetailBody } from "./detail-body.prototype";

export function ScreenB() {
	const insets = useSafeAreaInsets();
	const [catId, setCatId] = useState(CATALOG[0].id);
	const [open, setOpen] = useState<Achievement | null>(null);
	const cat = CATALOG.find((c) => c.id === catId) ?? CATALOG[0];
	const latest = EARNED[0];

	return (
		<>
			<ScrollView
				contentContainerClassName="pb-32 pt-4"
				contentInsetAdjustmentBehavior="automatic"
			>
				<View className="mx-5 flex-row items-center gap-4 rounded-3xl bg-surface p-5">
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

				<ScrollView
					contentContainerClassName="gap-2 px-5 pt-6"
					horizontal
					showsHorizontalScrollIndicator={false}
				>
					{CATALOG.map((c) => {
						const on = c.id === catId;
						return (
							<Pressable
								accessibilityRole="button"
								accessibilityState={{ selected: on }}
								className={`rounded-full px-4 py-2 ${on ? "bg-foreground" : "bg-surface"}`}
								key={c.id}
								onPress={() => setCatId(c.id)}
							>
								<AppText
									className={`font-semibold text-[13px] ${on ? "text-background" : "text-foreground"}`}
								>
									{c.title} {c.items.filter((i) => i.earnedAt).length}/
									{c.items.length}
								</AppText>
							</Pressable>
						);
					})}
				</ScrollView>

				<View className="flex-row flex-wrap px-3 pt-4">
					{cat.items.map((item) => (
						<Pressable
							accessibilityRole="button"
							className="w-1/3 items-center px-2 py-3"
							key={item.id}
							onPress={() => setOpen(item)}
						>
							<View>
								<Badge item={item} size={96} />
								{item.progress ? (
									<View className="absolute -bottom-1 self-center rounded-full bg-ember px-2 py-0.5">
										<AppText className="font-bold text-[10.5px] text-background">
											{item.progress.current}/{item.progress.target}
										</AppText>
									</View>
								) : null}
							</View>
							<AppText
								className="mt-2 text-center text-[12px] text-foreground leading-4"
								numberOfLines={2}
							>
								{item.title}
							</AppText>
						</Pressable>
					))}
				</View>
			</ScrollView>

			<BottomSheet
				isOpen={open !== null}
				onOpenChange={(o) => {
					if (!o) {
						setOpen(null);
					}
				}}
			>
				<BottomSheet.Portal>
					<BottomSheet.Overlay />
					<BottomSheet.Content backgroundClassName="bg-overlay">
						<View style={{ paddingBottom: insets.bottom + 24 }}>
							{open ? <DetailBody item={open} size={180} /> : null}
						</View>
					</BottomSheet.Content>
				</BottomSheet.Portal>
			</BottomSheet>
		</>
	);
}
