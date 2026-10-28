/**
 * The reader's Aa sheet (#408, Variant C from #401): three reading modes, each
 * drawn as a small page in its own look, plus text size. No separate font or
 * colour controls. Writes straight to the persisted store.
 *
 * A native formSheet route (`reader-appearance`) sized to its contents, with
 * the reader left undimmed behind it so each change shows on the page live.
 */
import { Switch } from "heroui-native";
import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { AppText } from "@/components/shared/app-text";
import { ReaderPageScope } from "@/features/library/reader/reader-page";
import {
	READING_MODE_KEYS,
	READING_MODES,
	type ReadingModeKey,
	stepTextSize,
	TEXT_SIZES,
} from "@/features/library/reader/reading-mode";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/store";

export function AaSheet() {
	return (
		// Sizes to its content; at accessibility text sizes the sheet caps out and this scrolls.
		<ScrollView
			bounces={false}
			contentContainerClassName="gap-6 px-6 pb-12 pt-8"
		>
			<Label>Reading mode</Label>
			<ModePicker />
			<Label>Text size</Label>
			<SizeStepper />
			<FireToggle />
		</ScrollView>
	);
}

function Label({ children }: { children: ReactNode }) {
	return (
		<AppText className="-mb-3 text-muted text-xs uppercase tracking-widest">
			{children}
		</AppText>
	);
}

function ModePicker() {
	const active = useAppStore((s) => s.readingMode);
	const setMode = useAppStore((s) => s.setReadingMode);
	return (
		<View className="flex-row gap-3">
			{READING_MODE_KEYS.map((key) => (
				<ModeCard
					key={key}
					mode={key}
					onPress={() => setMode(key)}
					selected={key === active}
				/>
			))}
		</View>
	);
}

function ModeCard({
	mode,
	selected,
	onPress,
}: {
	mode: ReadingModeKey;
	selected: boolean;
	onPress: () => void;
}) {
	const { label, blurb, face, lineHeight, page } = READING_MODES[mode];
	return (
		<Pressable
			accessibilityHint={blurb}
			accessibilityLabel={label}
			accessibilityRole="radio"
			accessibilityState={{ checked: selected }}
			className="flex-1 active:opacity-70"
			onPress={onPress}
		>
			<ReaderPageScope page={page}>
				<View
					className={cn(
						"aspect-[3/4] justify-between rounded-2xl bg-background p-3",
						selected ? "border-2 border-accent" : "border border-border"
					)}
					style={{ borderCurve: "continuous" }}
				>
					<AppText
						className="font-bold text-[26px]"
						style={{ fontFamily: face.bold }}
					>
						Aa
					</AppText>
					<View className={lineHeight > 1.6 ? "gap-1.5" : "gap-1"}>
						{[1, 0.85, 0.95, 0.6].map((w) => (
							<View
								className="h-0.5 rounded-full bg-foreground/60"
								key={w}
								style={{ width: `${w * 100}%` }}
							/>
						))}
					</View>
				</View>
			</ReaderPageScope>
			<AppText
				className={cn(
					"mt-2 text-center text-sm",
					selected ? "font-bold" : "font-semibold"
				)}
			>
				{label}
			</AppText>
			<AppText className="text-center text-[11px] text-muted">{blurb}</AppText>
		</Pressable>
	);
}

/** "Read by the fire" (#413): a dimming toggle, independent of the mode above. */
function FireToggle() {
	const on = useAppStore((s) => s.readByFire);
	const setOn = useAppStore((s) => s.setReadByFire);
	return (
		<View className="flex-row items-center gap-3">
			<View className="flex-1">
				<AppText className="font-semibold">Read by the fire</AppText>
				<AppText className="text-muted text-xs">
					Dims the page, like reading by firelight
				</AppText>
			</View>
			<Switch
				accessibilityLabel="Read by the fire"
				isSelected={on}
				onSelectedChange={setOn}
			/>
		</View>
	);
}

/** A− ●●●○○○ A+ — steps the base size; the phone's text size still multiplies it. */
function SizeStepper() {
	const size = useAppStore((s) => s.readerTextSize);
	const setSize = useAppStore((s) => s.setReaderTextSize);
	const at = TEXT_SIZES.indexOf(size as (typeof TEXT_SIZES)[number]);
	return (
		<View className="flex-row items-center gap-3 rounded-2xl bg-surface-secondary px-2 py-1">
			<Pressable
				accessibilityLabel="Smaller text"
				accessibilityRole="button"
				className="px-3 py-2 active:opacity-50 disabled:opacity-30"
				disabled={at === 0}
				hitSlop={8}
				onPress={() => setSize(stepTextSize(size, -1))}
			>
				<AppText className="text-sm">A</AppText>
			</Pressable>
			<View className="flex-1 flex-row justify-center gap-2">
				{TEXT_SIZES.map((s, i) => (
					<View
						className={cn(
							"h-1.5 w-1.5 rounded-full",
							i <= at ? "bg-foreground" : "bg-foreground/20"
						)}
						key={s}
					/>
				))}
			</View>
			<Pressable
				accessibilityLabel="Larger text"
				accessibilityRole="button"
				className="px-3 py-2 active:opacity-50 disabled:opacity-30"
				disabled={at === TEXT_SIZES.length - 1}
				hitSlop={8}
				onPress={() => setSize(stepTextSize(size, 1))}
			>
				<AppText className="text-xl">A</AppText>
			</Pressable>
		</View>
	);
}
