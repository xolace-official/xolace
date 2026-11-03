// PROTOTYPE (#684), throwaway: never merge.
// C "Ladders": each category is a vertical path of rows. Earned rungs past the
// last two fold into "+N earned"; the next rung is lit with its bar; two locked
// rungs show ahead, then "and more". A tap expands the row in place. Locked
// art is the real badge, faded ("dim"), not a tinted silhouette.
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Badge } from "./badge.prototype";
import {
	type Achievement,
	CATALOG,
	formatDate,
	SPARK_BALANCE,
	SPARKS_EARNED,
} from "./catalog.prototype";
import { DetailBody } from "./detail-body.prototype";

const SHOW_EARNED = 2;
const SHOW_AHEAD = 2;

export function ScreenC() {
	const [openId, setOpenId] = useState<string | null>(null);
	return (
		<ScrollView
			contentContainerClassName="pb-32 pt-4 px-5"
			contentInsetAdjustmentBehavior="automatic"
		>
			<AppText className="text-[14px] text-muted">
				<AppText className="font-bold text-ember">{SPARKS_EARNED}</AppText>{" "}
				sparks earned · {SPARK_BALANCE} to spend
			</AppText>
			{CATALOG.map((c) => {
				const earned = c.items.filter((i) => i.earnedAt);
				const ahead = c.items.filter((i) => !i.earnedAt);
				const folded = Math.max(0, earned.length - SHOW_EARNED);
				const rows = [
					...earned.slice(folded),
					...ahead.slice(0, SHOW_AHEAD + 1),
				];
				const more = ahead.length - (SHOW_AHEAD + 1);
				return (
					<View className="mt-8" key={c.id}>
						<AppText className="font-serif text-[22px] text-foreground">
							{c.title}
						</AppText>
						{folded > 0 ? (
							<AppText className="mt-2 ml-[68px] text-[12px] text-muted">
								+{folded} earned before
							</AppText>
						) : null}
						{rows.map((item) => (
							<Row
								item={item}
								key={item.id}
								onPress={() =>
									setOpenId((cur) => (cur === item.id ? null : item.id))
								}
								open={openId === item.id}
							/>
						))}
						{more > 0 ? (
							<AppText className="mt-1 ml-[68px] text-[12px] text-muted">
								and {more} more ahead
							</AppText>
						) : null}
					</View>
				);
			})}
		</ScrollView>
	);
}

type RowProps = { item: Achievement; open: boolean; onPress: () => void };

function Row({ item, open, onPress }: RowProps) {
	const next = Boolean(item.progress);
	return (
		<Pressable accessibilityRole="button" className="mt-3" onPress={onPress}>
			<View
				className={`flex-row items-center gap-3 rounded-2xl p-2 ${next ? "bg-surface" : ""}`}
			>
				<Badge item={item} locked="dim" size={56} />
				<View className="flex-1">
					<AppText
						className={`font-semibold text-[15px] ${item.earnedAt || next ? "text-foreground" : "text-muted"}`}
					>
						{item.title}
					</AppText>
					{item.earnedAt ? (
						<AppText className="text-[12px] text-muted">
							{formatDate(item.earnedAt)} · +{item.sparks}
						</AppText>
					) : item.progress ? (
						<View className="mt-1.5 flex-row items-center gap-2">
							<View className="h-1.5 flex-1 overflow-hidden rounded-full bg-separator">
								<View
									className="h-full bg-ember"
									style={{
										width: `${(item.progress.current / item.progress.target) * 100}%`,
									}}
								/>
							</View>
							<AppText className="text-[12px] text-muted">
								{item.progress.current}/{item.progress.target}
							</AppText>
						</View>
					) : (
						<AppText className="text-[12px] text-muted">
							{item.sparks} sparks
						</AppText>
					)}
				</View>
			</View>
			{open ? (
				<View className="py-4">
					<DetailBody item={item} locked="dim" size={160} />
				</View>
			) : null}
		</Pressable>
	);
}
