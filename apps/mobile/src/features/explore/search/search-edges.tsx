import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";

import { AppText } from "@/components/shared/app-text";
import { SEARCH } from "@/features/explore/copy";
import type { WayOut } from "@/features/explore/search/search-data";

export function NeedSomeoneRow({ onPress }: { onPress: () => void }) {
	const tint = useCSSVariable("--color-accent");
	return (
		<Pressable
			accessibilityLabel={SEARCH.needSomeone.label}
			accessibilityRole="link"
			className="mx-4 mt-3 flex-row items-center gap-3 rounded-2xl bg-surface-secondary px-4 py-3 active:opacity-70"
			onPress={onPress}
		>
			<SymbolView
				name={{
					android: "favorite",
					ios: "heart.text.square",
					web: "favorite",
				}}
				size={22}
				tintColor={String(tint)}
			/>
			<View className="flex-1">
				<AppText className="font-semibold text-[15px]">
					{SEARCH.needSomeone.title}
				</AppText>
				<AppText className="text-[13px] text-muted">
					{SEARCH.needSomeone.body}
				</AppText>
			</View>
			<SymbolView
				name={{
					android: "chevron_right",
					ios: "chevron.right",
					web: "chevron_right",
				}}
				size={13}
				tintColor={String(tint)}
			/>
		</Pressable>
	);
}

export function NoResults({
	query,
	onWayOut,
}: {
	query: string;
	onWayOut: (href: WayOut) => void;
}) {
	return (
		<View className="items-center gap-4 px-8 pt-16">
			<AppText
				className="text-center font-semibold text-[17px]"
				numberOfLines={3}
			>
				{SEARCH.noResults(query)}
			</AppText>
			<View className="flex-row gap-3">
				{SEARCH.wayOuts.map((w) => (
					<Pressable
						accessibilityRole="link"
						className="rounded-full bg-surface-secondary px-4 py-2 active:opacity-70"
						key={w.href}
						onPress={() => onWayOut(w.href)}
					>
						<AppText className="font-medium text-[15px] text-accent">
							{w.label}
						</AppText>
					</Pressable>
				))}
			</View>
		</View>
	);
}
