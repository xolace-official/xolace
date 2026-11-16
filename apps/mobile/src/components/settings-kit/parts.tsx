import { Stack } from "expo-router";
import { Children, isValidElement, type ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { LABEL, S } from "@/components/settings-kit/settings-layout";
import { AppText } from "@/components/shared/app-text";
import { cn } from "@/lib/cn";
import { useHeaderOptions } from "@/lib/header-options";
import { a11yHidden } from "@/lib/utils";

/**
 * Native large title in the theme's heading face, the minimal back button and the see-through bar.
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export function SettingsHeader({ title }: { title: string }) {
	const header = useHeaderOptions();
	return <Stack.Screen options={{ ...header, headerShown: true, title }} />;
}

const TITLE_GAP = 10;

/**
 * 12 pt semibold, tracked .1em, uppercase, in the accent.
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export function SectionTitle({
	children,
	inset = S.titleInset,
	aside,
	pb = TITLE_GAP,
}: {
	children: string;
	inset?: number;
	aside?: string;
	/** Space under the title, above its card (the prototype's name). */
	pb?: number;
}) {
	return (
		<View
			accessibilityRole="header"
			className="flex-row items-baseline justify-between pr-8"
			style={{ paddingBottom: pb, paddingLeft: inset }}
		>
			<AppText
				className="text-[12px] text-accent leading-4 tracking-[1.2px]"
				variant="body"
				weight="semibold"
			>
				{children.toUpperCase()}
			</AppText>
			{aside ? (
				<AppText
					className="text-[12.5px] text-foreground/50 leading-4"
					variant="body"
				>
					{aside}
				</AppText>
			) : null}
		</View>
	);
}

/**
 * 13 / 1.45 at ink 50%, inset 32.
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export function Footnote({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<AppText
			className={cn(
				"px-8 pt-2 text-[13px] text-foreground/50 leading-[19px]",
				className
			)}
			variant="body"
		>
			{children}
		</AppText>
	);
}

/**
 * A grouped card: 16 pt from the edges, 22 pt corners, no shadow. Rows draw their own hairlines.
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export function SettingsCard({
	children,
	className,
	style,
}: {
	children: ReactNode;
	className?: string;
	style?: ViewStyle;
}) {
	return (
		<View
			className={cn(
				"mx-4 overflow-hidden rounded-[22px] border-continuous bg-surface",
				className
			)}
			style={style}
		>
			{children}
		</View>
	);
}

/** A hairline from `from` to the card's right edge. */
export function Hairline({ from = S.lineFrom }: { from?: number }) {
	return (
		<View
			className="absolute right-0 bottom-0 h-px bg-separator"
			style={{ left: from }}
		/>
	);
}

/**
 * Puts a hairline under every row but the last.
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export function Rows({
	children,
	from,
}: {
	children: ReactNode;
	from?: number;
}) {
	// Rows are elements; toArray keys each one uniquely (its own key, or its place).
	const rows = Children.toArray(children).filter(isValidElement);
	return rows.map((row, i) => (
		<View key={row.key}>
			{row}
			{i < rows.length - 1 ? <Hairline from={from} /> : null}
		</View>
	));
}

/**
 * A card row's label at 16 / 22.
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export function Label({
	children,
	className,
}: {
	children: string;
	className?: string;
}) {
	return (
		<AppText className={cn("flex-1", LABEL, className)} variant="body">
			{children}
		</AppText>
	);
}
