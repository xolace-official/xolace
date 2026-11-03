// PROTOTYPE (#684), throwaway: never merge. The detail content every variant
// shows; A puts it on a pushed page, B in a sheet, C inline under the row.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Badge } from "./badge.prototype";
import { type Achievement, formatDate } from "./catalog.prototype";

type Props = {
	item: Achievement;
	size?: number;
	locked?: "tint" | "dim" | "emboss";
};

export function DetailBody({ item, size = 220, locked }: Props) {
	const [pinned, setPinned] = useState(false);
	return (
		<View className="items-center px-6">
			<Badge item={item} locked={locked} size={size} />
			<AppText className="mt-4 text-center font-serif text-[24px] text-foreground">
				{item.title}
			</AppText>
			<AppText className="mt-2 text-center text-[15px] text-foreground/70 leading-6">
				{item.copy}
			</AppText>
			{item.earnedAt ? (
				<AppText className="mt-3 text-[13px] text-muted">
					Earned {formatDate(item.earnedAt)} · +{item.sparks} sparks
				</AppText>
			) : item.progress ? (
				<View className="mt-4 w-full items-center">
					<View className="h-1.5 w-48 overflow-hidden rounded-full bg-separator">
						<View
							className="h-full bg-ember"
							style={{
								width: `${(item.progress.current / item.progress.target) * 100}%`,
							}}
						/>
					</View>
					<AppText className="mt-2 text-[13px] text-muted">
						{item.progress.current} of {item.progress.target}{" "}
						{item.progress.unit} · {item.sparks} sparks
					</AppText>
				</View>
			) : (
				<AppText className="mt-3 text-[13px] text-muted">
					{item.sparks} sparks when you get here
				</AppText>
			)}
			{item.earnedAt ? (
				<Pressable
					accessibilityRole="button"
					className="mt-6 rounded-full border border-separator px-5 py-2.5"
					onPress={() => setPinned((p) => !p)}
				>
					<AppText className="font-semibold text-[14px] text-foreground">
						{pinned ? "Pinned to profile" : "Pin to profile"}
					</AppText>
				</Pressable>
			) : null}
		</View>
	);
}
