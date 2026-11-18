import type { ReactNode } from "react";
import { Pressable, ScrollView, Switch, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { COPY } from "@/features/lantern/copy";
import {
	READING_MODE_KEYS,
	TEXT_SIZES,
} from "@/features/lantern/reader/reading-modes";
import { ModeCard } from "@/features/lantern/reader/sheets/mode-card";
import { useAppearance } from "@/features/lantern/reader/sheets/sheets-data";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";

const EDGE = { large: 21, small: 14 } as const;

/**
 * Production's Aa sheet (handoff §6), on the app's theme with the reader bright and touchable
 * behind it: three reading modes, a text size stepper and Read by the fire. Every change shows on
 * the page at once, and the reader keeps its place.
 */
export function AaSheet() {
	return (
		// At accessibility text sizes the sheet caps out and this scrolls.
		<ScrollView
			bounces={false}
			contentContainerClassName="gap-6 px-6 pt-7 pb-7.5"
		>
			<Label>{COPY.reader.aa.mode}</Label>
			<View accessibilityRole="radiogroup" className="flex-row gap-3">
				{READING_MODE_KEYS.map((m) => (
					<ModeCard key={m} mode={m} />
				))}
			</View>
			<Label>{COPY.reader.aa.size}</Label>
			<SizeStepper />
			<FireToggle />
		</ScrollView>
	);
}

function Label({ children }: { children: ReactNode }) {
	return (
		<AppText
			className="-mb-3 text-[12px] uppercase leading-[15px] tracking-[1.44px]"
			color="muted"
			variant="caption"
		>
			{children}
		</AppText>
	);
}

/** A ●●●○○○ A: steps the base size; the phone's text size still multiplies it. */
function SizeStepper() {
	const { state, actions } = useAppearance();
	const at = TEXT_SIZES.indexOf(state.size as (typeof TEXT_SIZES)[number]);
	const edge = (
		disabled: boolean,
		glyph: number,
		label: string,
		by: 1 | -1
	) => (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="button"
			accessibilityState={{ disabled }}
			className={cn("px-3 py-2", disabled ? "opacity-30" : "active:opacity-50")}
			disabled={disabled}
			hitSlop={8}
			onPress={() => actions.stepSize(by)}
		>
			<AppText
				style={{ fontSize: glyph, lineHeight: glyph + 4 }}
				variant="body"
			>
				A
			</AppText>
		</Pressable>
	);
	return (
		<View
			className="flex-row items-center gap-3 rounded-[16px] bg-surface-secondary px-2 py-1"
			style={{ borderCurve: "continuous" }}
		>
			{edge(at === 0, EDGE.small, COPY.reader.aa.smaller, -1)}
			<View className="flex-1 flex-row justify-center gap-2">
				{TEXT_SIZES.map((s, i) => (
					<View
						className={cn(
							"size-1.5 rounded-full bg-foreground",
							i > at && "opacity-20"
						)}
						key={s}
					/>
				))}
			</View>
			{edge(at === TEXT_SIZES.length - 1, EDGE.large, COPY.reader.aa.larger, 1)}
		</View>
	);
}

/** Read by the fire: a dim over the page, apart from the mode above. */
function FireToggle() {
	const { state, actions } = useAppearance();
	const accent = useTokenColor("accent");
	return (
		<View className="flex-row items-center gap-3">
			<View className="flex-1">
				<AppText
					className="text-[16px] leading-[21px]"
					variant="subhead"
					weight="semibold"
				>
					{COPY.reader.aa.fire}
				</AppText>
				<AppText
					className="text-[12px] leading-[16px]"
					color="muted"
					variant="caption"
				>
					{COPY.reader.aa.fireLine}
				</AppText>
			</View>
			<Switch
				accessibilityLabel={COPY.reader.aa.fire}
				onValueChange={actions.setFire}
				trackColor={{ true: accent }}
				value={state.fire}
			/>
		</View>
	);
}
