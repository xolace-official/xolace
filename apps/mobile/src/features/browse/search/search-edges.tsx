/**
 * Browse search's edges (#552, CONTEXT.md "Browse search"): the Need someone
 * now? row a crisis-term query gets above its results, and the no-results
 * way-outs. Neither asks what the person was looking for.
 */
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";

import { AppText } from "@/src/components/shared/app-text";
import { playSoftPress } from "@/src/lib/haptics";

export function NeedSomeoneRow() {
	const tint = useCSSVariable("--color-accent");
	return (
		<Pressable
			accessibilityLabel="Need someone now? See people you can reach"
			accessibilityRole="link"
			className="mx-4 mt-3 flex-row items-center gap-3 rounded-2xl bg-surface-secondary px-4 py-3 active:opacity-70"
			onPress={() => {
				playSoftPress();
				router.push("/(protected)/crisis-resources");
			}}
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
					Need someone now?
				</AppText>
				<AppText className="text-[13px] text-muted">
					People you can reach, any time.
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

const WAY_OUTS = [
	{ href: "/browse/topics", label: "Browse topics" },
	{ href: "/browse/library/subjects", label: "Lantern subjects" },
] as const;

export function NoResults({ query }: { query: string }) {
	return (
		<View className="items-center gap-4 px-8 pt-16">
			<AppText
				className="text-center font-semibold text-[17px]"
				numberOfLines={3}
			>
				Nothing matches “{query}”
			</AppText>
			<View className="flex-row gap-3">
				{WAY_OUTS.map((w) => (
					<Pressable
						accessibilityRole="link"
						className="rounded-full bg-surface-secondary px-4 py-2 active:opacity-70"
						key={w.href}
						onPress={() => {
							playSoftPress();
							router.push(w.href);
						}}
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
