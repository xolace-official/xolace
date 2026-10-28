// "Reading as…" (#393, #409): a one-time inline card, then a header menu for the
// same answer. Dismissing is a valid answer; For you then reads the Understanding alone.
import AccountCircle from "@expo/material-symbols/account_circle.xml";
import { Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Surface, useThemeColor } from "heroui-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/shared/app-text";
import { facetLabel } from "@/features/library/home/library-copy";
import { cn } from "@/lib/utils";

const toggle = (list: string[], slug: string) =>
	list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];

export function ReadingAsCard({
	options,
	onAnswer,
}: {
	options: string[];
	onAnswer: (audiences: string[]) => void;
}) {
	const [picked, setPicked] = useState<string[]>([]);
	const muted = useThemeColor("muted");

	return (
		<Surface className="mx-4 mt-4 gap-3 p-4">
			<View className="flex-row items-start justify-between">
				<View className="flex-1 gap-0.5">
					<AppText className="font-semibold text-[17px]">Reading as…</AppText>
					<AppText className="text-[14px] text-muted">
						Pick any that fit. It only shapes what’s picked for you.
					</AppText>
				</View>
				<Pressable
					accessibilityLabel="Skip"
					accessibilityRole="button"
					hitSlop={10}
					onPress={() => onAnswer([])}
				>
					<SymbolView
						name={{ android: "close", ios: "xmark", web: "close" }}
						size={14}
						tintColor={muted}
					/>
				</Pressable>
			</View>
			<View className="flex-row flex-wrap gap-2">
				{options.map((slug) => {
					const on = picked.includes(slug);
					return (
						<Pressable
							accessibilityRole="checkbox"
							accessibilityState={{ checked: on }}
							className={cn(
								"rounded-full px-3.5 py-2",
								on ? "bg-accent" : "bg-surface-secondary"
							)}
							key={slug}
							onPress={() => setPicked((cur) => toggle(cur, slug))}
						>
							<AppText
								className={cn(
									"font-medium text-[14px]",
									on && "text-accent-foreground"
								)}
							>
								{facetLabel(slug)}
							</AppText>
						</Pressable>
					);
				})}
			</View>
			{picked.length > 0 && (
				<Pressable
					accessibilityRole="button"
					className="items-center rounded-full bg-foreground py-2.5"
					onPress={() => onAnswer(picked)}
				>
					<AppText className="font-semibold text-[15px] text-background">
						Done
					</AppText>
				</Pressable>
			)}
		</Surface>
	);
}

/** Header control once the card is answered: same choice, multi-select. */
export function ReadingAsMenu({
	options,
	value,
	onChange,
}: {
	options: string[];
	value: string[];
	onChange: (a: string[]) => void;
}) {
	return (
		<Stack.Toolbar placement="right">
			<Stack.Toolbar.Menu
				accessibilityLabel="Reading as"
				icon={
					process.env.EXPO_OS === "ios" ? "person.crop.circle" : AccountCircle
				}
				title="Reading as…"
			>
				{options.map((slug) => (
					<Stack.Toolbar.MenuAction
						isOn={value.includes(slug)}
						key={slug}
						onPress={() => onChange(toggle(value, slug))}
					>
						{facetLabel(slug)}
					</Stack.Toolbar.MenuAction>
				))}
			</Stack.Toolbar.Menu>
		</Stack.Toolbar>
	);
}
